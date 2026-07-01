# Syrian Energy Tenders

تطبيق ويب خفيف لتتبع مناقصات ومزايدات وعروض الطاقة في سورية لصالح منصة **Syrian Renewables**.

## الهدف

النسخة الأولى هي منصة معلومات وتحليل فقط:

- الزائر يبحث ويفلتر ويقرأ تفاصيل المناقصة.
- الإدارة تضيف وتعدل وتحذف المناقصات.
- لا يوجد استقبال عروض من الشركات داخل التطبيق.
- مصادر المناقصات ودفاتر الشروط تعرض كروابط أو ملفات PDF عند توفرها.

## التقنية

- Next.js App Router
- TypeScript
- Firebase Firestore
- Firebase Auth
- Firebase Storage
- Vercel Deployment

## هيكل Firestore

Collection: `tenders`

| Field | Description |
|---|---|
| `title_ar` | العنوان بالعربية |
| `title_en` | العنوان بالإنجليزية |
| `organization_ar` | الجهة المعلنة بالعربية |
| `organization_en` | الجهة المعلنة بالإنجليزية |
| `energy_type` | نوع الطاقة |
| `tender_type` | `tender` / `auction` / `offer` / `rfp` |
| `governorate` | المحافظة |
| `location` | الموقع الجغرافي |
| `capacity` | القدرة المطلوبة |
| `announcement_date` | تاريخ الإعلان |
| `deadline` | آخر موعد للتقديم |
| `status` | `open` / `closed` / `awarded` / `cancelled` |
| `document_fee` | قيمة دفتر الشروط |
| `currency` | `SYP` / `USD` / `EUR` |
| `submission_method` | طريقة التقديم |
| `summary_ar` | ملخص عربي |
| `summary_en` | ملخص إنجليزي |
| `description_ar` | وصف كامل عربي |
| `description_en` | وصف كامل إنجليزي |
| `requirements` | قائمة المتطلبات |
| `source_url` | رابط المصدر |
| `pdf_url` | رابط دفتر الشروط |
| `data_quality` | جودة البيانات |
| `notes` | ملاحظات |
| `created_at` | تاريخ الإضافة |
| `updated_at` | تاريخ آخر تعديل |

Collection: `admins`

- أنشئ مستنداً باسم UID الأدمن داخل collection باسم `admins`.
- مثال: `/admins/USER_UID` مع أي حقل بسيط مثل `{ "role": "admin" }`.

## الإعداد المحلي

```bash
npm install
cp .env.example .env.local
npm run dev
```

## إعداد Firebase

1. أنشئ Firebase project.
2. فعّل Firestore Database.
3. فعّل Authentication ثم Email/Password.
4. فعّل Storage إذا أردت رفع دفاتر الشروط PDF.
5. انسخ Web App config إلى متغيرات `NEXT_PUBLIC_FIREBASE_*`.
6. أنشئ مستخدم أدمن من Authentication.
7. انسخ UID المستخدم وأنشئ مستنداً في Firestore: `admins/{UID}`.
8. انسخ قواعد الحماية من:
   - `firebase/firestore.rules`
   - `firebase/storage.rules`

## متغيرات البيئة على Vercel

أضف القيم التالية في Vercel Project Settings → Environment Variables:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

مهم: قيمة `FIREBASE_PRIVATE_KEY` يجب أن تبقى سرية. لا تضعها داخل GitHub. في Vercel يمكن وضعها بصيغة تحتوي على `\n` بدل الأسطر الفعلية.

## النشر على Vercel

1. افتح Vercel.
2. Import Project من GitHub.
3. اختر المستودع: `khaled931/Syrian-energy-tenders`.
4. Framework Preset: Next.js.
5. أضف Environment Variables.
6. Deploy.

## الصفحات

- `/` — واجهة المناقصات العامة.
- `/tenders/[id]` — صفحة تفاصيل مستقلة مناسبة للمشاركة وSEO.
- `/admin` — لوحة إدارة خفيفة لإضافة وتعديل المناقصات.

## ملاحظات قانونية وتشغيلية

- التطبيق لا يستقبل العروض ولا يدير عملية ترسية أو مزايدة إلكترونية.
- يجب عرض رابط المصدر الأصلي دائماً عند توفره.
- استخدم `data_quality` لتمييز مستوى الثقة في كل سجل.
- لا تنشر ملفات أو وثائق غير مخصصة للنشر العام.
