"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { getBlob, ref } from "firebase/storage";
import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { persistAdminTender, type PendingTenderSave } from "@/lib/adminTenderSave";
import type { TenderForm } from "@/lib/tenderForm";
import { useTenderClock } from "@/lib/useTenderClock";
import AdminTenderAnalytics from "@/components/AdminTenderAnalytics";
import AdminTenderMap from "@/components/AdminTenderMap";
import { auth, db, isFirebaseConfigured, storage } from "@/lib/firebase";
import {
  asRequirements,
  DATA_QUALITY_OPTIONS,
  dateToInput,
  ENERGY_TYPES_AR,
  GOVERNORATES_AR,
  getTenderDeadlineState,
  Tender,
  TenderStatus,
  TenderType,
} from "@/lib/types";

type PublicApiStatus = "checking" | "ok" | "error";
type AdminTab = "manage" | "analytics" | "map";
const PUBLIC_API_CHECKING_MESSAGE = "جار التحقق من اتصال واجهة العرض بالبيانات...";

const emptyForm: TenderForm = {
  title_ar: "",
  title_en: "",
  organization_ar: "",
  organization_en: "",
  energy_type: "طاقة شمسية",
  tender_type: "tender",
  governorate: "غير محدد",
  location: "",
  latitude: "",
  longitude: "",
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
  pdf_storage_path: "",
  data_quality: "Medium Confidence",
  notes: "",
};

export default function AdminPage() {
  const now = useTenderClock();
  const saveLock = useRef(false);
  const pendingSave = useRef<PendingTenderSave>({});
  const originalTender = useRef<Tender | undefined>(undefined);
  const [openingPdf, setOpeningPdf] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(Boolean(isFirebaseConfigured && auth && db));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [form, setForm] = useState<TenderForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(isFirebaseConfigured && auth && db ? "" : "لم يتم ضبط إعدادات Firebase بعد.");
  const [saving, setSaving] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("manage");
  const [publicApiStatus, setPublicApiStatus] = useState<PublicApiStatus>("checking");
  const [publicApiMessage, setPublicApiMessage] = useState(PUBLIC_API_CHECKING_MESSAGE);

  const checkPublicApi = useCallback(async () => {
    try {
      const response = await fetch("/api/tenders?locale=ar", {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        setPublicApiStatus("error");
        setPublicApiMessage(
          "لوحة الإدارة متصلة، لكن واجهة العرض العامة لا تستطيع قراءة Firestore حالياً. راجع إعداد Firebase Admin على بيئة النشر.",
        );
        return;
      }

      const payload = await response.json() as { dataAvailable?: boolean };
      if (payload.dataAvailable === false) {
        setPublicApiStatus("error");
        setPublicApiMessage(
          "تم الوصول إلى واجهة التطبيق، لكن مصدر البيانات السيرفري غير جاهز. يجب استكمال إعداد Firebase Admin.",
        );
        return;
      }

      setPublicApiStatus("ok");
      setPublicApiMessage("واجهة العرض متصلة بقاعدة المناقصات وتقرأ أحدث البيانات دون تخزين مؤقت.");
    } catch {
      setPublicApiStatus("error");
      setPublicApiMessage("تعذر التحقق من واجهة العرض العامة. أعد الفحص بعد لحظات.");
    }
  }, []);

  const recheckPublicApi = useCallback(() => {
    setPublicApiStatus("checking");
    setPublicApiMessage(PUBLIC_API_CHECKING_MESSAGE);
    void checkPublicApi();
  }, [checkPublicApi]);

  useEffect(() => {
    const firebaseAuth = auth;
    const firestore = db;

    if (!isFirebaseConfigured || !firebaseAuth || !firestore) return;

    return onAuthStateChanged(firebaseAuth, async (currentUser) => {
      setUser(currentUser);
      setIsAdmin(false);
      setPublicApiStatus("checking");
      setPublicApiMessage(PUBLIC_API_CHECKING_MESSAGE);
      if (currentUser) {
        try {
          const adminSnapshot = await getDoc(doc(firestore, "admins", currentUser.uid));
          setIsAdmin(adminSnapshot.exists());
          if (adminSnapshot.exists()) recheckPublicApi();
        } catch {
          setIsAdmin(false);
        }
      }
      setAuthLoading(false);
    });
  }, [recheckPublicApi]);

  useEffect(() => {
    const firestore = db;
    if (!isAdmin || !firestore) return undefined;
    const q = query(collection(firestore, "tenders"), orderBy("created_at", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        setTenders(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Tender));
      },
      (snapshotError) => {
        setError(snapshotError.message || "تعذر تحميل قائمة المناقصات من Firestore.");
      },
    );
  }, [isAdmin]);

  const visibleTenders = useMemo(() => {
    const term = listSearch.trim().toLowerCase();
    if (!term) return tenders;
    return tenders.filter((tender) =>
      [
        tender.title_ar,
        tender.title_en,
        tender.organization_ar,
        tender.organization_en,
        tender.governorate,
        tender.energy_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [listSearch, tenders]);

  const openCount = tenders.filter((tender) => getTenderDeadlineState(tender, undefined, now).displayStatus === "open").length;
  const inactiveCount = tenders.length - openCount;

  async function login(event: FormEvent) {
    event.preventDefault();
    setError("");
    const firebaseAuth = auth;
    if (!firebaseAuth) return;
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تسجيل الدخول.");
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function resetForm(clearFeedback = true) {
    if (saveLock.current) return;
    pendingSave.current = {};
    originalTender.current = undefined;
    setForm(emptyForm);
    setEditingId(null);
    setPdfFile(null);
    setFormVersion((current) => current + 1);
    if (clearFeedback) {
      setMessage("");
      setError("");
    }
  }

  function editTender(tender: Tender) {
    if (saveLock.current) return;
    pendingSave.current = {};
    originalTender.current = tender;
    setPdfFile(null);
    setFormVersion((current) => current + 1);
    setMessage("");
    setError("");
    setEditingId(tender.id || null);
    setActiveTab("manage");
    setForm({
      title_ar: tender.title_ar || "",
      title_en: tender.title_en || "",
      organization_ar: tender.organization_ar || "",
      organization_en: tender.organization_en || "",
      energy_type: tender.energy_type || "طاقة شمسية",
      tender_type: (tender.tender_type as TenderType) || "tender",
      governorate: tender.governorate || "غير محدد",
      location: tender.location || "",
      latitude: tender.latitude != null || tender.lat != null ? String(tender.latitude ?? tender.lat) : "",
      longitude: tender.longitude != null || tender.lng != null ? String(tender.longitude ?? tender.lng) : "",
      capacity: tender.capacity || "",
      announcement_date: dateToInput(tender.announcement_date),
      deadline: dateToInput(tender.deadline, tender.deadline_precision),
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
      pdf_storage_path: tender.pdf_storage_path || "",
      data_quality: tender.data_quality || "Medium Confidence",
      notes: tender.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function openStoredPdf() {
    if (!storage || !form.pdf_storage_path || openingPdf) return;
    setOpeningPdf(true);
    setError("");
    try {
      // Authenticated Storage read; never mint or publish a reusable download token.
      const blob = await getBlob(ref(storage, form.pdf_storage_path));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "tender-document.pdf";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setError("تعذر فتح المرفق المحمي. تحقق من صلاحية الحساب أو أعد المحاولة لاحقاً.");
    } finally { setOpeningPdf(false); }
  }

  async function saveTender(event: FormEvent) {
    event.preventDefault();
    if (saveLock.current || !isAdmin || !user || !db) return;
    saveLock.current = true;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const wasEditing = Boolean(editingId);
      await persistAdminTender({
        firestore: db, storage, form, file: pdfFile, editingId,
        previous: originalTender.current, userId: user.uid, pending: pendingSave.current,
      });
      saveLock.current = false;
      resetForm(false);
      setMessage(wasEditing ? "تم تحديث المناقصة بنجاح." : "تمت إضافة المناقصة بنجاح.");
      recheckPublicApi();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ المناقصة. أعد المحاولة من النموذج نفسه.");
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  async function removeTender(id?: string) {
    if (saveLock.current) return;
    const firestore = db;
    if (!id || !firestore) return;
    const confirmed = window.confirm("هل تريد حذف هذه المناقصة نهائياً؟");
    if (!confirmed) return;

    setMessage("");
    setError("");
    try {
      await deleteDoc(doc(firestore, "tenders", id));
      setMessage("تم حذف المناقصة.");
      recheckPublicApi();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حذف المناقصة.");
    }
  }

  async function updateStatus(id: string | undefined, status: TenderStatus) {
    if (saveLock.current) return;
    const firestore = db;
    if (!id || !firestore) return;

    setMessage("");
    setError("");
    try {
      await updateDoc(doc(firestore, "tenders", id), {
        status, status_origin: "manual", updated_at: serverTimestamp(),
        save_operation_id: crypto.randomUUID(), updated_by_uid: user?.uid || null,
      });
      setMessage("تم تحديث حالة المناقصة.");
      recheckPublicApi();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحديث حالة المناقصة.");
    }
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
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label>
              كلمة المرور
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error ? <p className="sr-state sr-state--error" role="alert">{error}</p> : null}
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
            عرض التطبيق
          </Link>
          <button className="sr-button sr-button--ghost" type="button" onClick={() => auth && signOut(auth)}>
            خروج
          </button>
        </div>
      </header>

      <section
        className={`sr-admin-health sr-admin-health--${publicApiStatus}`}
        role="status"
        aria-live="polite"
      >
        <span className="sr-admin-health__dot" aria-hidden="true" />
        <div className="sr-admin-health__copy">
          <strong>حالة نشر البيانات</strong>
          <p>{publicApiMessage}</p>
        </div>
        <button className="sr-button sr-button--ghost" type="button" onClick={recheckPublicApi}>
          إعادة الفحص
        </button>
      </section>

      <nav className="sr-admin-tabs" aria-label="أقسام لوحة إدارة المناقصات">
        <button type="button" className={activeTab === "manage" ? "is-active" : ""} onClick={() => setActiveTab("manage")}>
          <span>01</span>
          <div><strong>إدارة المناقصات</strong><small>إضافة، تعديل وإدارة السجلات</small></div>
        </button>
        <button type="button" className={activeTab === "analytics" ? "is-active" : ""} onClick={() => setActiveTab("analytics")}>
          <span>02</span>
          <div><strong>الإحصائيات والتحليل</strong><small>مؤشرات ورسوم وفلاتر مباشرة</small></div>
        </button>
        <button type="button" className={activeTab === "map" ? "is-active" : ""} onClick={() => setActiveTab("map")}>
          <span>03</span>
          <div><strong>الخريطة</strong><small>توزيع المناقصات على OpenStreetMap</small></div>
        </button>
      </nav>

      {activeTab === "analytics" ? <AdminTenderAnalytics tenders={tenders} /> : null}
      {activeTab === "map" ? <AdminTenderMap tenders={tenders} /> : null}

      {activeTab === "manage" ? (
        <>
      <section className="sr-admin-stats" aria-label="إحصاءات المناقصات">
        <div className="sr-admin-stat"><strong>{tenders.length}</strong><span>إجمالي السجلات</span></div>
        <div className="sr-admin-stat"><strong>{openCount}</strong><span>مناقصة مفتوحة</span></div>
        <div className="sr-admin-stat"><strong>{inactiveCount}</strong><span>غير مفتوحة</span></div>
      </section>

      <form className="sr-form sr-admin-editor" onSubmit={saveTender}>
        <div className="sr-form-title">
          <div className="sr-form-title__copy">
            <span className="sr-eyebrow">{editingId ? "تحرير سجل" : "سجل جديد"}</span>
            <h2>{editingId ? "تعديل مناقصة" : "إضافة مناقصة"}</h2>
            <p>أدخل المعلومات بدقة. الحقول الإضافية مثل الإحداثيات والمصدر تحسن جودة الخريطة والتحليل.</p>
          </div>
          {editingId ? (
            <button className="sr-button sr-button--ghost" type="button" onClick={() => resetForm()}>
              إلغاء التعديل
            </button>
          ) : null}
        </div>

        <nav className="sr-form-section-nav" aria-label="أقسام نموذج المناقصة">
          <a href="#admin-tender-basic">المعلومات الأساسية</a>
          <a href="#admin-tender-dates">المواعيد والتقديم</a>
          <a href="#admin-tender-description">الوصف والمتطلبات</a>
          <a href="#admin-tender-source">المصدر والمرفقات</a>
        </nav>

        <fieldset disabled={saving} id="admin-tender-basic">
          <legend>معلومات أساسية</legend>
          <label>
            عنوان المناقصة بالعربية *
            <input name="title_ar" value={form.title_ar} onChange={handleChange} required />
          </label>
          <label>
            Tender title in English
            <input name="title_en" value={form.title_en} onChange={handleChange} dir="ltr" />
          </label>
          <label>
            الجهة المعلنة بالعربية *
            <input name="organization_ar" value={form.organization_ar} onChange={handleChange} required />
          </label>
          <label>
            Organization in English
            <input name="organization_en" value={form.organization_en} onChange={handleChange} dir="ltr" />
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
            <input name="location" value={form.location} onChange={handleChange} placeholder="مثال: مركز البحوث العلمية الزراعية – حلب" />
          </label>
          <label>
            خط العرض Latitude
            <input type="number" inputMode="decimal" step="any" name="latitude" value={form.latitude} onChange={handleChange} dir="ltr" placeholder="36.2021" />
          </label>
          <label>
            خط الطول Longitude
            <input type="number" inputMode="decimal" step="any" name="longitude" value={form.longitude} onChange={handleChange} dir="ltr" placeholder="37.1343" />
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

        <fieldset disabled={saving} id="admin-tender-dates">
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

        <fieldset disabled={saving} id="admin-tender-description">
          <legend>الوصف والمتطلبات</legend>
          <label>
            ملخص عربي
            <textarea name="summary_ar" value={form.summary_ar} onChange={handleChange} rows={3} />
          </label>
          <label>
            English summary
            <textarea name="summary_en" value={form.summary_en} onChange={handleChange} rows={3} dir="ltr" />
          </label>
          <label className="sr-field-wide">
            الوصف الكامل عربي
            <textarea name="description_ar" value={form.description_ar} onChange={handleChange} rows={6} />
          </label>
          <label className="sr-field-wide">
            Full English description
            <textarea name="description_en" value={form.description_en} onChange={handleChange} rows={6} dir="ltr" />
          </label>
          <label className="sr-field-wide">
            المتطلبات — اكتب كل متطلب في سطر مستقل
            <textarea name="requirements" value={form.requirements} onChange={handleChange} rows={5} />
          </label>
        </fieldset>

        <fieldset disabled={saving} id="admin-tender-source">
          <legend>مرفقات ومصدر وملاحظات</legend>
          <label>
            رابط المصدر
            <input type="url" name="source_url" value={form.source_url} onChange={handleChange} dir="ltr" />
          </label>
          <label>
            رابط PDF خارجي
            <input type="url" name="pdf_url" value={form.pdf_url} onChange={handleChange} dir="ltr" />
          </label>
          <label>
            رفع PDF — حد أقصى 15 MiB
            <input key={formVersion} type="file" accept="application/pdf,.pdf" onChange={(event) => setPdfFile(event.target.files?.[0] || null)} />
          </label>
          {form.pdf_storage_path ? (
            <div className="sr-field-wide">
              <button type="button" className="sr-button sr-button--ghost" disabled={saving || openingPdf} onClick={() => void openStoredPdf()}>
                {openingPdf ? "جار فتح المرفق..." : "فتح المرفق المحمي"}
              </button>
              <button type="button" className="sr-button sr-button--ghost" disabled={saving} onClick={() => setForm((current) => ({ ...current, pdf_storage_path: "" }))}>
                إزالة المرفق من السجل
              </button>
            </div>
          ) : null}
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

        <div aria-live="polite">
          {message ? <p className="sr-state sr-state--success">{message}</p> : null}
          {error ? <p className="sr-state sr-state--error" role="alert">{error}</p> : null}
        </div>

        <button className="sr-button sr-button--primary" type="submit" disabled={saving}>
          {saving ? "جار الحفظ..." : editingId ? "حفظ التعديل" : "إضافة المناقصة"}
        </button>
      </form>

      <section className="sr-admin-list">
        <div className="sr-admin-list__toolbar">
          <div>
            <span className="sr-eyebrow">السجل التشغيلي</span>
            <h2>المناقصات المنشورة</h2>
            <p>إدارة الحالات والتعديل والوصول السريع إلى كل سجل.</p>
          </div>
          <input
            className="sr-admin-list__search"
            type="search"
            value={listSearch}
            onChange={(event) => setListSearch(event.target.value)}
            placeholder="بحث بالعنوان أو الجهة أو المحافظة..."
            aria-label="بحث في المناقصات المنشورة"
          />
        </div>

        {visibleTenders.length === 0 ? (
          <p className="sr-state">لا توجد سجلات مطابقة للبحث.</p>
        ) : (
          <div className="sr-admin-table-wrap">
            <table className="sr-admin-table">
              <thead>
                <tr>
                  <th>المناقصة</th>
                  <th>الجهة</th>
                  <th>المحافظة</th>
                  <th>النوع</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {visibleTenders.map((tender) => (
                  <tr key={tender.id}>
                    <td data-label="المناقصة">
                      <strong>{tender.title_ar || tender.title_en}</strong>
                      {tender.capacity ? <small>{tender.capacity}</small> : null}
                    </td>
                    <td data-label="الجهة">{tender.organization_ar || tender.organization_en}</td>
                    <td data-label="المحافظة">{tender.governorate || "غير محدد"}</td>
                    <td data-label="النوع">{tender.energy_type || "غير محدد"}</td>
                    <td data-label="الحالة">
                      <select
                        aria-label={`حالة ${tender.title_ar || tender.title_en || "المناقصة"}`}
                        value={getTenderDeadlineState(tender, undefined, now).displayStatus}
                        onChange={(event) => void updateStatus(tender.id, event.target.value as TenderStatus)}
                      >
                        <option value="open">مفتوحة</option>
                        <option value="closed">مغلقة</option>
                        <option value="awarded">مُرساة</option>
                        <option value="cancelled">ملغاة</option>
                      </select>
                    </td>
                    <td data-label="الإجراءات">
                      <div className="sr-admin-row__actions">
                        <Link className="sr-button sr-button--ghost" href={`/tenders/${tender.id}`}>عرض</Link>
                        <button className="sr-button sr-button--ghost" type="button" disabled={saving} onClick={() => editTender(tender)}>تعديل</button>
                        <button className="sr-button sr-button--danger" type="button" disabled={saving} onClick={() => void removeTender(tender.id)}>حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
        </>
      ) : null}
    </main>
  );
}
