import { collection, deleteField, doc, runTransaction, serverTimestamp, type Firestore } from "firebase/firestore";
import { ref, uploadBytes, type FirebaseStorage } from "firebase/storage";
import { validateTenderPdf } from "./tenderFiles";
import { tenderFormFields, type TenderForm } from "./tenderForm";
import { normalizeDate, type Tender } from "./types";

/** Kept by the editor until success/reset, including an ambiguous network failure. */
export type PendingTenderSave = {
  id?: string;
  operationId?: string;
  attachment?: { file: File; path: string; uploaded: boolean };
};

function version(value: unknown): string | null {
  if (value && typeof value === "object" && "seconds" in value && "nanoseconds" in value) {
    return `${value.seconds}:${value.nanoseconds}`;
  }
  return normalizeDate(value as Tender["updated_at"])?.toISOString() ?? null;
}

export async function persistAdminTender({ firestore, storage, form, file, editingId, previous, userId, pending }: {
  firestore: Firestore; storage: FirebaseStorage | null; form: TenderForm; file: File | null;
  editingId: string | null; previous?: Tender; userId: string; pending: PendingTenderSave;
}): Promise<string> {
  const fields = tenderFormFields(form, previous);
  if (file) {
    await validateTenderPdf(file);
    if (!storage) throw new Error("خدمة الملفات غير متصلة. لم يتم حفظ المناقصة.");
  }
  const id = editingId || pending.id || doc(collection(firestore, "tenders")).id;
  if (pending.id && pending.id !== id) throw new Error("تغير السجل أثناء الحفظ. أعد فتح النموذج.");
  pending.id = id;
  pending.operationId ||= crypto.randomUUID();

  if (file && storage) {
    if (!pending.attachment || pending.attachment.file !== file) {
      pending.attachment = { file, path: `tenders/${id}/${crypto.randomUUID()}.pdf`, uploaded: false };
    }
    if (!pending.attachment.uploaded) {
      // Upload before creating/publishing a record. Reuse the same path on retry.
      await uploadBytes(ref(storage, pending.attachment.path), file, { contentType: "application/pdf" });
      pending.attachment.uploaded = true;
    }
    fields.pdf_storage_path = pending.attachment.path;
    fields.pdf_url = null;
  }

  const document = doc(firestore, "tenders", id);
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(document);
    if (editingId && !snapshot.exists()) throw new Error("حُذفت المناقصة. أعد تحميل القائمة قبل الحفظ.");
    if (!editingId && snapshot.exists() && snapshot.data().save_operation_id !== pending.operationId) {
      throw new Error("تغير السجل بعد محاولة الحفظ السابقة. افتحه من القائمة قبل المتابعة.");
    }
    if (snapshot.exists() && editingId) {
      const current = snapshot.data();
      const originalVersion = version(previous?.updated_at);
      const currentVersion = version(current.updated_at);
      if (originalVersion !== currentVersion && current.save_operation_id !== pending.operationId) {
        throw new Error("عُدلت المناقصة منذ فتحها. أعد فتحها من القائمة لتجنب استبدال التحديث الأحدث.");
      }
    }
    const data = {
      ...Object.fromEntries(Object.entries(fields)
        .filter(([, value]) => snapshot.exists() || value !== null)
        .map(([key, value]) => [key, value === null ? deleteField() : value])),
      updated_at: serverTimestamp(),
      updated_by_uid: userId,
      save_operation_id: pending.operationId,
    };
    if (snapshot.exists()) transaction.update(document, data);
    else transaction.set(document, { ...data, created_at: serverTimestamp(), created_by_uid: userId });
  });
  return id;
}
