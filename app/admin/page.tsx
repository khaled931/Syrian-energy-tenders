"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { auth, db, isFirebaseConfigured, storage } from "@/lib/firebase";
import {
  asRequirements,
  DATA_QUALITY_OPTIONS,
  dateToInput,
  ENERGY_TYPES_AR,
  GOVERNORATES_AR,
  Tender,
  TenderStatus,
  TenderType,
} from "@/lib/types";

type TenderForm = {
  title_ar: string;
  title_en: string;
  organization_ar: string;
  organization_en: string;
  energy_type: string;
  tender_type: TenderType;
  governorate: string;
  location: string;
  capacity: string;
  announcement_date: string;
  deadline: string;
  status: TenderStatus;
  document_fee: string;
  currency: string;
  submission_method: string;
  summary_ar: string;
  summary_en: string;
  description_ar: string;
  description_en: string;
  requirements: string;
  source_url: string;
  pdf_url: string;
  data_quality: string;
  notes: string;
};

const emptyForm: TenderForm = {
  title_ar: "",
  title_en: "",
  organization_ar: "",
  organization_en: "",
  energy_type: "طاقة شمسية",
  tender_type: "tender",
  governorate: "غير محدد",
  location: "",
  capacity: "",
  announcement_date: "",
  deadline: "",
  status: "open",
  document_fee: "",
  currency: "SYP",
  submission_method: "",
  summary_ar: "",
  summary_en: "",
  description_ar: "",
  description_en: "",
  requirements: "",
  source_url: "",
  pdf_url: "",
  data_quality: "Medium Confidence",
  notes: "",
};

function removeEmptyValues(payload: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== ""));
}

function formToPayload(form: TenderForm) {
  return removeEmptyValues({
    ...form,
    announcement_date: form.announcement_date ? Timestamp.fromDate(new Date(form.announcement_date)) : null,
    deadline: form.deadline ? Timestamp.fromDate(new Date(form.deadline)) : null,
    requirements: form.requirements
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
  });
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [form, setForm] = useState<TenderForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      setAuthLoading(false);
      setError("لم يتم ضبط إعدادات Firebase بعد.");
      return;
    }

    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAdmin(false);
      if (currentUser) {
        try {
          const adminSnapshot = await getDoc(doc(db, "admins", currentUser.uid));
          setIsAdmin(adminSnapshot.exists());
        } catch {
          setIsAdmin(false);
        }
      }
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isAdmin || !db) return undefined;
    const q = query(collection(db, "tenders"), orderBy("created_at", "desc"));
    return onSnapshot(q, (snapshot) => {
      setTenders(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Tender));
    });
  }, [isAdmin]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!auth) return;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تسجيل الدخول.");
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setPdfFile(null);
    setMessage("");
    setError("");
  }

  function editTender(tender: Tender) {
    setEditingId(tender.id || null);
    setForm({
      title_ar: tender.title_ar || "",
      title_en: tender.title_en || "",
      organization_ar: tender.organization_ar || "",
      organization_en: tender.organization_en || "",
      energy_type: tender.energy_type || "طاقة شمسية",
      tender_type: (tender.tender_type as TenderType) || "tender",
      governorate: tender.governorate || "غير محدد",
      location: tender.location || "",
      capacity: tender.capacity || "",
      announcement_date: dateToInput(tender.announcement_date),
      deadline: dateToInput(tender.deadline),
      status: (tender.status as TenderStatus) || "open",
      document_fee: tender.document_fee || "",
      currency: tender.currency || "SYP",
      submission_method: tender.submission_method || "",
      summary_ar: tender.summary_ar || "",
      summary_en: tender.summary_en || "",
      description_ar: tender.description_ar || "",
      description_en: tender.description_en || "",
      requirements: asRequirements(tender.requirements).join("\n"),
      source_url: tender.source_url || "",
      pdf_url: tender.pdf_url || "",
      data_quality: tender.data_quality || "Medium Confidence",
      notes: tender.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadPdf(tenderId: string) {
    if (!pdfFile || !storage) return form.pdf_url;
    const storageRef = ref(storage, `tenders/${tenderId}/${Date.now()}-${pdfFile.name}`);
    const result = await uploadBytes(storageRef, pdfFile, { contentType: "application/pdf" });
    return getDownloadURL(result.ref);
  }

  async function saveTender(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    if (!db) {
      setError("Firestore غير متصل.");
      setSaving(false);
      return;
    }

    try {
      if (editingId) {
        const pdfUrl = await uploadPdf(editingId);
        await updateDoc(doc(db, "tenders", editingId), {
          ...formToPayload({ ...form, pdf_url: pdfUrl || form.pdf_url }),
          updated_at: serverTimestamp(),
        });
        setMessage("تم تحديث المناقصة بنجاح.");
      } else {
        const newDoc = await addDoc(collection(db, "tenders"), {
          ...formToPayload(form),
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
        const pdfUrl = await uploadPdf(newDoc.id);
        if (pdfUrl) {
          await updateDoc(doc(db, "tenders", newDoc.id), { pdf_url: pdfUrl, updated_at: serverTimestamp() });
        }
        setMessage("تمت إضافة المناقصة بنجاح.");
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ المناقصة.");
    } finally {
      setSaving(false);
    }
  }

  async function removeTender(id?: string) {
    if (!id || !db) return;
    const confirmed = window.confirm("هل تريد حذف هذه المناقصة نهائياً؟");
    if (!confirmed) return;
    await deleteDoc(doc(db, "tenders", id));
  }

  async function updateStatus(id: string | undefined, status: TenderStatus) {
    if (!id || !db) return;
    await updateDoc(doc(db, "tenders", id), { status, updated_at: serverTimestamp() });
  }

  if (authLoading) {
    return <main className="sr-page-shell"><p className="sr-state">جار التحقق من الحساب...</p></main>;
  }

  if (!user) {
    return (
      <main className="sr-page-shell sr-admin-page">
        <Link className="sr-back-link" href="/">
          العودة إلى الصفحة العامة
        </Link>
        <section className="sr-admin-login">
          <span className="sr-eyebrow">Admin</span>
          <h1>تسجيل دخول لوحة الإدارة</h1>
          <p>هذه اللوحة مخصصة لإضافة وتعديل مناقصات الطاقة المنشورة على المنصة.</p>
          <form onSubmit={login} className="sr-form sr-form--narrow">
            <label>
              البريد الإلكتروني
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label>
              كلمة المرور
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            {error ? <p className="sr-state sr-state--error">{error}</p> : null}
            <button className="sr-button sr-button--primary" type="submit">
              دخول
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="sr-page-shell sr-admin-page">
        <section className="sr-admin-login">
          <h1>لا توجد صلاحية إدارة لهذا الحساب</h1>
          <p>أضف مستنداً في Firestore داخل collection باسم admins يحمل UID هذا الحساب، ثم أعد تحميل الصفحة.</p>
          <button className="sr-button sr-button--ghost" type="button" onClick={() => auth && signOut(auth)}>
            تسجيل الخروج
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="sr-page-shell sr-admin-page">
      <header className="sr-admin-header">
        <div>
          <span className="sr-eyebrow">لوحة الإدارة</span>
          <h1>إدارة مناقصات الطاقة</h1>
        </div>
        <div className="sr-actions">
          <Link className="sr-button sr-button--ghost" href="/">
            الصفحة العامة
          </Link>
          <button className="sr-button sr-button--ghost" type="button" onClick={() => auth && signOut(auth)}>
            خروج
          </button>
        </div>
      </header>

      <form className="sr-form" onSubmit={saveTender}>
        <div className="sr-form-title">
          <h2>{editingId ? "تعديل مناقصة" : "إضافة مناقصة"}</h2>
          {editingId ? (
            <button className="sr-button sr-button--ghost" type="button" onClick={resetForm}>
              إلغاء التعديل
            </button>
          ) : null}
        </div>

        <fieldset>
          <legend>معلومات أساسية</legend>
          <label>
            عنوان المناقصة بالعربية *
            <input name="title_ar" value={form.title_ar} onChange={handleChange} required />
          </label>
          <label>
            Tender title in English
            <input name="title_en" value={form.title_en} onChange={handleChange} />
          </label>
          <label>
            الجهة المعلنة بالعربية *
            <input name="organization_ar" value={form.organization_ar} onChange={handleChange} required />
          </label>
          <label>
            Organization in English
            <input name="organization_en" value={form.organization_en} onChange={handleChange} />
          </label>
          <label>
            نوع الطاقة
            <select name="energy_type" value={form.energy_type} onChange={handleChange}>
              {ENERGY_TYPES_AR.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            نوع الفرصة
            <select name="tender_type" value={form.tender_type} onChange={handleChange}>
              <option value="tender">مناقصة</option>
              <option value="auction">مزاد</option>
              <option value="offer">عرض</option>
              <option value="rfp">طلب عروض</option>
            </select>
          </label>
          <label>
            المحافظة
            <select name="governorate" value={form.governorate} onChange={handleChange}>
              {GOVERNORATES_AR.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            الموقع الجغرافي
            <input name="location" value={form.location} onChange={handleChange} />
          </label>
          <label>
            القدرة المطلوبة
            <input name="capacity" value={form.capacity} onChange={handleChange} placeholder="مثال: 500 kW" />
          </label>
          <label>
            الحالة
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="open">مفتوحة</option>
              <option value="closed">مغلقة</option>
              <option value="awarded">مُرساة</option>
              <option value="cancelled">ملغاة</option>
            </select>
          </label>
        </fieldset>

        <fieldset>
          <legend>مواعيد وقيمة دفتر الشروط</legend>
          <label>
            تاريخ الإعلان
            <input type="date" name="announcement_date" value={form.announcement_date} onChange={handleChange} />
          </label>
          <label>
            آخر موعد للتقديم
            <input type="date" name="deadline" value={form.deadline} onChange={handleChange} />
          </label>
          <label>
            قيمة دفتر الشروط
            <input name="document_fee" value={form.document_fee} onChange={handleChange} />
          </label>
          <label>
            العملة
            <select name="currency" value={form.currency} onChange={handleChange}>
              <option value="SYP">SYP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <label className="sr-field-wide">
            طريقة التقديم
            <textarea name="submission_method" value={form.submission_method} onChange={handleChange} rows={3} />
          </label>
        </fieldset>

        <fieldset>
          <legend>الوصف والمتطلبات</legend>
          <label>
            ملخص عربي
            <textarea name="summary_ar" value={form.summary_ar} onChange={handleChange} rows={3} />
          </label>
          <label>
            English summary
            <textarea name="summary_en" value={form.summary_en} onChange={handleChange} rows={3} />
          </label>
          <label className="sr-field-wide">
            الوصف الكامل عربي
            <textarea name="description_ar" value={form.description_ar} onChange={handleChange} rows={6} />
          </label>
          <label className="sr-field-wide">
            Full English description
            <textarea name="description_en" value={form.description_en} onChange={handleChange} rows={6} />
          </label>
          <label className="sr-field-wide">
            المتطلبات — اكتب كل متطلب في سطر مستقل
            <textarea name="requirements" value={form.requirements} onChange={handleChange} rows={5} />
          </label>
        </fieldset>

        <fieldset>
          <legend>مرفقات ومصدر وملاحظات</legend>
          <label>
            رابط المصدر
            <input type="url" name="source_url" value={form.source_url} onChange={handleChange} />
          </label>
          <label>
            رابط PDF خارجي
            <input type="url" name="pdf_url" value={form.pdf_url} onChange={handleChange} />
          </label>
          <label>
            رفع PDF
            <input type="file" accept="application/pdf" onChange={(event) => setPdfFile(event.target.files?.[0] || null)} />
          </label>
          <label>
            جودة البيانات
            <select name="data_quality" value={form.data_quality} onChange={handleChange}>
              {DATA_QUALITY_OPTIONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="sr-field-wide">
            ملاحظات داخلية / عامة
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} />
          </label>
        </fieldset>

        {message ? <p className="sr-state sr-state--success">{message}</p> : null}
        {error ? <p className="sr-state sr-state--error">{error}</p> : null}

        <button className="sr-button sr-button--primary" type="submit" disabled={saving}>
          {saving ? "جار الحفظ..." : editingId ? "حفظ التعديل" : "إضافة المناقصة"}
        </button>
      </form>

      <section className="sr-admin-list">
        <h2>المناقصات المنشورة</h2>
        {tenders.map((tender) => (
          <article className="sr-admin-row" key={tender.id}>
            <div>
              <h3>{tender.title_ar || tender.title_en}</h3>
              <p>{tender.organization_ar || tender.organization_en}</p>
            </div>
            <div className="sr-admin-row__actions">
              <select value={tender.status || "open"} onChange={(event) => updateStatus(tender.id, event.target.value as TenderStatus)}>
                <option value="open">مفتوحة</option>
                <option value="closed">مغلقة</option>
                <option value="awarded">مُرساة</option>
                <option value="cancelled">ملغاة</option>
              </select>
              <Link className="sr-button sr-button--ghost" href={`/tenders/${tender.id}`}>
                عرض
              </Link>
              <button className="sr-button sr-button--ghost" type="button" onClick={() => editTender(tender)}>
                تعديل
              </button>
              <button className="sr-button sr-button--danger" type="button" onClick={() => removeTender(tender.id)}>
                حذف
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
