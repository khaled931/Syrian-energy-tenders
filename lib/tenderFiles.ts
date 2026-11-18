// Keep this limit aligned with firebase/storage.rules (inclusive boundary).
export const MAX_TENDER_PDF_BYTES = 15 * 1024 * 1024;

export async function validateTenderPdf(file: Pick<File, "size" | "type" | "slice">) {
  if (file.size === 0 || file.size > MAX_TENDER_PDF_BYTES) {
    throw new Error("يجب أن يكون ملف PDF غير فارغ وحجمه 15 MiB أو أقل.");
  }
  if (file.type && file.type !== "application/pdf") {
    throw new Error("الملف المرفوع يجب أن يكون بصيغة PDF.");
  }
  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...signature) !== "%PDF-") {
    throw new Error("محتوى الملف لا يطابق صيغة PDF.");
  }
}
