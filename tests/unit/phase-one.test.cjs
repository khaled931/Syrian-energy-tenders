const { test } = require("node:test");
const assert = require("node:assert/strict");
const { File } = require("node:buffer");
const { loadTs } = require("./load-ts.cjs");

const types = loadTs("lib/types.ts");
const { importedTenderStatus } = loadTs("lib/tenderImport.ts");
const { tenderFormFields } = loadTs("lib/tenderForm.ts");
const { validateTenderPdf, MAX_TENDER_PDF_BYTES } = loadTs("lib/tenderFiles.ts");
const { serializeJsonLd } = loadTs("lib/jsonLd.ts");

function tender(overrides = {}) {
  return { title_ar: "سجل اختبار", organization_ar: "جهة اختبار", energy_type: "طاقة شمسية", tender_type: "tender", governorate: "غير محدد", status: "open", ...overrides };
}
function form(overrides = {}) {
  return {
    title_ar: "سجل اختبار", title_en: "", organization_ar: "جهة اختبار", organization_en: "",
    energy_type: "طاقة شمسية", tender_type: "tender", governorate: "غير محدد", location: "",
    latitude: "", longitude: "", capacity: "", announcement_date: "2026-11-01", deadline: "2026-11-18",
    status: "open", document_fee: "", currency: "SYP", submission_method: "", summary_ar: "", summary_en: "",
    description_ar: "", description_en: "", requirements: "", source_url: "", pdf_url: "", pdf_storage_path: "", data_quality: "Unverified", notes: "", ...overrides,
  };
}
function state(input, time) { return types.getTenderDeadlineState(tender(input), 3, new Date(time)); }

test("calendar deadlines remain open through their Damascus date and expire at the boundary", () => {
  for (const deadline of ["2026-11-18", "2026-11-18T00:00:00.000Z"]) {
    assert.equal(state({ deadline }, "2026-11-18T20:59:59.999Z").displayStatus, "open");
    assert.equal(state({ deadline }, "2026-11-18T20:59:59.999Z").daysRemaining, 0);
    assert.equal(state({ deadline }, "2026-11-18T21:00:00.000Z").displayStatus, "closed");
  }
});

test("explicit timestamp deadlines retain the exact time, including explicit midnight", () => {
  assert.equal(state({ deadline: "2026-11-18T12:30:00Z", deadline_precision: "datetime" }, "2026-11-18T12:29:59Z").displayStatus, "open");
  assert.equal(state({ deadline: "2026-11-18T12:30:00Z", deadline_precision: "datetime" }, "2026-11-18T12:30:00Z").displayStatus, "closed");
  assert.equal(state({ deadline: "2026-11-18T00:00:00Z", deadline_precision: "datetime" }, "2026-11-18T01:00:00Z").displayStatus, "closed");
});

test("final statuses survive expiration; invalid dates do not crash rendering", () => {
  for (const status of ["awarded", "cancelled", "closed"]) {
    const result = state({ status, deadline: "2020-01-01" }, "2026-11-18T10:00:00Z");
    assert.equal(result.displayStatus, status);
    assert.equal(result.isClosingSoon, false);
  }
  assert.equal(types.normalizeDate(new Date("invalid")), null);
  assert.equal(state({ deadline: "invalid" }, "2026-11-18T10:00:00Z").daysRemaining, null);
  assert.equal(types.isValidDateOnly("2026-02-30"), false);
  const unsafe = state({ status: '\"><img src=x onerror=alert(1)>', deadline: "2026-11-19" }, "2026-11-18T10:00:00Z");
  assert.equal(unsafe.displayStatus, "unknown");
  assert.equal(unsafe.isClosingSoon, false);
});

test("feed refresh preserves awarded, cancelled and manually selected statuses", () => {
  for (const status of ["awarded", "cancelled"]) {
    assert.equal(importedTenderStatus({ status }, { deadline: "2099-01-01" }), status);
  }
  assert.equal(importedTenderStatus({ status: "closed", status_origin: "manual" }, { deadline: "2099-01-01" }), "closed");
  assert.equal(importedTenderStatus({ status: "closed", status_origin: "import" }, { deadline: "2099-01-01" }), "open");
  assert.equal(importedTenderStatus({ deadline: "2020-01-01" }, {}, new Date("2026-11-18")), "closed");
});

test("form validates dates, order, coordinates and source protocols before writing", () => {
  for (const invalid of [
    { title_ar: " " }, { deadline: "2026-02-30" }, { announcement_date: "2026-11-19" },
    { latitude: "35" }, { latitude: "91", longitude: "36" },
    { latitude: "NaN", longitude: "36" }, { source_url: "javascript:alert(1)" },
    { pdf_url: "https://user:password@example.org/document.pdf" },
  ]) assert.throws(() => tenderFormFields(form(invalid)));
});

test("unchanged exact timestamps and private references survive unrelated edits", () => {
  const previous = tender({ deadline: "2026-11-18T13:45:00Z", deadline_precision: "datetime", pdf_storage_path: "tenders/example/document.pdf" });
  const result = tenderFormFields(form({ pdf_storage_path: previous.pdf_storage_path }), previous);
  assert.equal(result.deadline, previous.deadline);
  assert.equal(result.deadline_precision, "datetime");
  assert.equal(result.pdf_storage_path, previous.pdf_storage_path);
  assert.equal(tenderFormFields(form({ deadline: "2026-11-20" }), previous).deadline_precision, "date");
  const late = tender({ deadline: "2026-11-18T23:30:00Z", deadline_precision: "datetime" });
  assert.equal(types.dateToInput(late.deadline, late.deadline_precision), "2026-11-19");
  assert.equal(tenderFormFields(form({ deadline: "2026-11-19" }), late).deadline, late.deadline);
});

test("PDF validation enforces inclusive 15 MiB boundary, nonempty files and actual signature", async () => {
  await validateTenderPdf({ size: MAX_TENDER_PDF_BYTES, type: "application/pdf", slice: () => new Blob(["%PDF-"]) });
  for (const file of [
    { size: MAX_TENDER_PDF_BYTES + 1, type: "application/pdf" },
    new File([], "empty.pdf", { type: "application/pdf" }),
    new File(["not a pdf"], "fake.pdf", { type: "application/pdf" }),
    new File(["%PDF-1.7"], "fake.html", { type: "text/html" }),
  ]) await assert.rejects(validateTenderPdf(file));
});

function saveFixture() {
  const records = new Map();
  const removed = Symbol("deleteField");
  const calls = { ids: 0, uploads: [], writes: 0, failUpload: false, failWrite: false, loseAck: false };
  const firestore = {
    collection: () => ({}), doc: (...args) => ({ id: args.length === 1 ? `draft-${++calls.ids}` : args[2] }),
    deleteField: () => removed, serverTimestamp: () => new Date("2026-11-18T10:00:00Z"),
    runTransaction: async (_db, callback) => {
      let write;
      const value = await callback({
        get: async (ref) => ({ exists: () => records.has(ref.id), data: () => records.get(ref.id) }),
        set: (ref, data) => { write = { ref, data, replace: true }; },
        update: (ref, data) => { write = { ref, data, replace: false }; },
      });
      if (calls.failWrite) throw new Error("simulated network failure");
      if (write) {
        calls.writes++;
        const result = write.replace ? {} : { ...records.get(write.ref.id) };
        for (const [key, value] of Object.entries(write.data)) {
          if (value === removed) delete result[key]; else result[key] = value;
        }
        records.set(write.ref.id, result);
      }
      if (calls.loseAck) { calls.loseAck = false; throw new Error("ack lost after commit"); }
      return value;
    },
  };
  const storage = {
    ref: (_storage, path) => ({ fullPath: path }),
    uploadBytes: async (ref) => { calls.uploads.push(ref.fullPath); if (calls.failUpload) throw new Error("upload failed"); return { ref }; },
  };
  const { persistAdminTender } = loadTs("lib/adminTenderSave.ts", { "firebase/firestore": firestore, "firebase/storage": storage });
  const input = { firestore: {}, storage: {}, form: form(), file: new File(["%PDF-1.7\nfixture"], "test.pdf", { type: "application/pdf" }), editingId: null, userId: "test-admin", pending: {} };
  return { save: () => persistAdminTender(input), input, records, calls };
}

test("failed upload publishes no record; retry reuses the reserved ID and object path", async () => {
  const f = saveFixture(); f.calls.failUpload = true;
  await assert.rejects(f.save());
  assert.equal(f.records.size, 0); assert.equal(f.calls.writes, 0);
  f.calls.failUpload = false;
  const id = await f.save();
  assert.equal(f.calls.ids, 1); assert.equal(f.records.size, 1);
  assert.equal(f.calls.uploads[0], f.calls.uploads[1]);
  assert.equal(f.records.get(id).pdf_storage_path, f.calls.uploads[0]);
  assert.equal(f.records.get(id).pdf_url, undefined);
});

test("failed database commit retains the completed upload and retries without duplicates", async () => {
  const f = saveFixture(); f.calls.failWrite = true;
  await assert.rejects(f.save()); assert.equal(f.records.size, 0);
  f.calls.failWrite = false; await f.save();
  assert.equal(f.records.size, 1); assert.equal(f.calls.ids, 1); assert.equal(f.calls.uploads.length, 1);
});

test("lost acknowledgment after a commit does not create a second record or replace created_at", async () => {
  const f = saveFixture(); f.calls.loseAck = true;
  await assert.rejects(f.save());
  const first = f.records.get(f.input.pending.id).created_at;
  await f.save();
  assert.equal(f.records.size, 1); assert.equal(f.calls.ids, 1); assert.equal(f.calls.uploads.length, 1);
  assert.equal(f.records.get(f.input.pending.id).created_at, first);
});

test("cleared optional fields are removed on edit, and clearing requirements persists", async () => {
  const f = saveFixture(); f.input.file = null; f.input.editingId = "existing";
  const previous = tender({ source_url: "https://example.org/old", summary_ar: "old", latitude: 35, longitude: 36, lat: 35, lng: 36, requirements: ["old"], updated_at: new Date("2026-11-17") });
  f.input.previous = previous; f.records.set("existing", { ...previous });
  await f.save(); const result = f.records.get("existing");
  for (const key of ["source_url", "summary_ar", "latitude", "longitude", "lat", "lng"]) assert.equal(Object.hasOwn(result, key), false);
  assert.deepEqual(result.requirements, []);
});

test("editing a record changed by another operation is rejected without a write", async () => {
  const f = saveFixture(); f.input.file = null; f.input.editingId = "existing";
  f.input.previous = tender({ updated_at: new Date("2026-11-17") });
  f.records.set("existing", tender({ updated_at: new Date("2026-11-18") }));
  await assert.rejects(f.save(), /عُدلت المناقصة/); assert.equal(f.calls.writes, 0);
});

test("missing storage and invalid form data cannot create a record", async () => {
  const f = saveFixture(); f.input.storage = null;
  await assert.rejects(f.save(), /خدمة الملفات/);
  assert.equal(f.records.size, 0); assert.equal(f.calls.writes, 0); assert.equal(f.calls.uploads.length, 0);
  f.input.file = null; f.input.form.title_ar = " ";
  await assert.rejects(f.save(), /مطلوبان/); assert.equal(f.records.size, 0);
});

test("unavailable Storage does not block tender saves without an upload", async () => {
  const f = saveFixture(); f.input.storage = null; f.input.file = null;
  f.input.form.pdf_url = "https://example.org/specifications.pdf";
  await f.save();
  assert.equal(f.records.size, 1);
  assert.equal(f.records.get(f.input.pending.id).pdf_url, f.input.form.pdf_url);
  assert.equal(f.calls.uploads.length, 0);
});

test("another operation after a lost creation acknowledgment is not overwritten on retry", async () => {
  const f = saveFixture(); f.calls.loseAck = true;
  await assert.rejects(f.save());
  const record = f.records.get(f.input.pending.id);
  record.save_operation_id = "another-operation"; record.status = "awarded";
  await assert.rejects(f.save(), /تغير السجل/);
  assert.equal(f.records.get(f.input.pending.id).status, "awarded");
});

test("stale edits within the same millisecond still detect different Firestore versions", async () => {
  const f = saveFixture(); f.input.file = null; f.input.editingId = "existing";
  f.input.previous = tender({ updated_at: { seconds: 1, nanoseconds: 100 } });
  f.records.set("existing", tender({ updated_at: { seconds: 1, nanoseconds: 200 } }));
  await assert.rejects(f.save(), /عُدلت المناقصة/); assert.equal(f.calls.writes, 0);
});

test("JSON-LD cannot close its script tag and still round-trips Arabic and malicious text", () => {
  const payload = { name: "سجل اختبار", description: "</script><script>alert(1)</script>" };
  const encoded = serializeJsonLd(payload);
  assert.equal(encoded.includes("<"), false); assert.deepEqual(JSON.parse(encoded), payload);
});

function importFixture() {
  const records = new Map(); let debug = null; let reads = 0; let writes = 0;
  const db = {
    collection: (name) => ({ doc: (id) => ({ name, id,
      get: async () => { reads++; return { exists: Boolean(debug), data: () => debug }; },
      set: async (data) => { writes++; debug = data; },
    }) }),
    runTransaction: async (callback) => callback({
      get: async (ref) => ({ exists: records.has(ref.id), data: () => records.get(ref.id) }),
      set: (ref, data) => { writes++; records.set(ref.id, { ...records.get(ref.id), ...data }); },
    }),
  };
  const route = loadTs("app/api/admin/tenders/notion-import/route.ts", {
    "@/lib/firebaseAdmin": { getAdminDb: () => db, isFirebaseAdminConfigured: () => true },
    "firebase-admin/firestore": { FieldValue: { serverTimestamp: () => new Date() }, Timestamp: { fromDate: (date) => date } },
  });
  return { ...route, records, counts: () => ({ reads, writes }), debug: () => debug };
}
function request(body, authenticated = true) {
  return new Request("https://example.test/api/admin/tenders/notion-import", {
    method: "POST", headers: { "Content-Type": "application/json", ...(authenticated ? { "x-syrian-renewables-sync-secret": "test-only-secret" } : {}) }, body: JSON.stringify(body),
  });
}

test("diagnostics reject missing/wrong credentials before database access", async () => {
  process.env.NOTION_TENDER_WEBHOOK_SECRET = "test-only-secret";
  const f = importFixture();
  for (const credential of [null, "wrong"]) {
    const response = await f.GET(new Request("https://example.test/debug", { headers: credential ? { "x-syrian-renewables-sync-secret": credential } : {} }));
    assert.equal(response.status, 401); assert.deepEqual(await response.json(), { ok: false, error: "unauthorized" });
  }
  assert.deepEqual(f.counts(), { reads: 0, writes: 0 });
  const deniedPost = await f.POST(request({}, false));
  assert.equal(deniedPost.status, 401); assert.equal(f.counts().writes, 0);
  delete process.env.NOTION_TENDER_WEBHOOK_SECRET;
  assert.equal((await f.GET(new Request("https://example.test/debug"))).status, 401);
});

test("authenticated feed rejects oversized and invalid-date payloads without creating records", async () => {
  process.env.NOTION_TENDER_WEBHOOK_SECRET = "test-only-secret";
  const f = importFixture();
  assert.equal((await f.POST(request({ text: "a".repeat(1024 * 1024) }))).status, 413);
  assert.equal((await f.POST(request({ review_status: "approved", telegram_message_id: "unit-only", title_ar: "اختبار", deadline: "2026-02-30" }))).status, 422);
  assert.equal(f.records.size, 0);
});

test("chunked JSON is bounded even without a Content-Length header", async () => {
  const { readBoundedJson, BodyTooLargeError } = loadTs("lib/requestBody.ts");
  const body = new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode('{"text":"'));
    controller.enqueue(new Uint8Array(40));
    controller.close();
  } });
  const input = new Request("https://example.test/import", { method: "POST", body, duplex: "half" });
  assert.equal(input.headers.has("content-length"), false);
  await assert.rejects(readBoundedJson(input, 16), BodyTooLargeError);
});

test("feed transaction preserves final statuses and diagnostics contain only the latest attempt", async () => {
  process.env.NOTION_TENDER_WEBHOOK_SECRET = "test-only-secret";
  const f = importFixture(); f.records.set("telegram-unit-only", { status: "cancelled", created_at: "original" });
  const body = { review_status: "approved", telegram_message_id: "unit-only", title_ar: "اختبار", organization_ar: "جهة اختبار", deadline: "2099-01-01" };
  assert.equal((await f.POST(request(body))).status, 200);
  assert.equal(f.records.get("telegram-unit-only").status, "cancelled");
  assert.equal(f.records.get("telegram-unit-only").created_at, "original");
  assert.equal(f.debug().result, "success");
  await f.POST(request({ review_status: "draft" }));
  assert.equal(f.debug().result, "tender_not_approved");
  assert.equal(Object.hasOwn(f.debug(), "tenderId"), false);
  const response = await f.GET(new Request("https://example.test/debug", { headers: { "x-syrian-renewables-sync-secret": "test-only-secret" } }));
  assert.equal(response.status, 200); assert.equal((await response.json()).lastWebhookDebug.result, "tender_not_approved");
});

test("public serialization exposes the effective status but never new or legacy private fields", () => {
  const { serializeTender } = loadTs("lib/tendersServer.ts", { "server-only": {}, "@/lib/firebaseAdmin": {} });
  const result = serializeTender("test", tender({ deadline: "2020-01-01", source_url: "private", pdf_url: "private", pdf_storage_path: "private", notes: "private", save_operation_id: "private", updated_by_uid: "private", status_origin: "manual" }));
  assert.equal(result.status, "closed");
  for (const key of ["source_url", "pdf_url", "pdf_storage_path", "notes", "save_operation_id", "updated_by_uid", "status_origin"]) assert.equal(Object.hasOwn(result, key), false);
});

test("detail and card render the same closed state for the same expired record", () => {
  const React = require("react"); const { renderToString } = require("react-dom/server");
  const mocks = { "@/components/PlatformShell": { usePlatform: () => ({ locale: "ar" }) } };
  const Detail = loadTs("components/TenderDetailContent.tsx", mocks).default;
  const Card = loadTs("components/TenderCard.tsx", mocks).default;
  const record = tender({ id: "unit-only", deadline: "2020-01-01" });
  const detail = renderToString(React.createElement(Detail, { tender: record, firebaseConfigured: true }));
  const card = renderToString(React.createElement(Card, { tender: record, locale: "ar" }));
  assert.match(detail, /sr-status--closed/); assert.match(card, /sr-status--closed/);
});
