// ฟังก์ชันคำนวณล้วน (ไม่แตะ Firebase) — ประเมินผล, สร้างข้อความไลน์, สรุปรายเดือน

export const MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
export const SHIFTS = ["เช้า", "บ่าย", "ดึก"];
// เวลาจบเวรของ พขร. (นาทีของวัน): เช้า 08:15–16:15, บ่าย/ดึก 16:15–08:15 ของอีกวัน
const SHIFT_END = { "เช้า": 16 * 60 + 15, "บ่าย": 8 * 60 + 15, "ดึก": 8 * 60 + 15 };
// พขร. มี 2 เวร: เช้า และ บ่าย/ดึก (บ่ายกับดึกพ่วงกัน 16:15–08:15)
export const shiftLabel = (s) => (s === "เช้า" ? "เช้า" : "บ่าย/ดึก");
export const SHIFT_END_TEXT = { "เช้า": "16:15", "บ่าย": "08:15 ของอีกวัน", "ดึก": "08:15" };

// ประเมินการปฏิบัติงานตอนจบเวร (รายงานเฉพาะเมื่อมีเรื่องควรปรับปรุง)
export const REVIEW_ITEMS = [
  ["service", "ด้านการบริการ"],
  ["punctual", "การตรงต่อเวลา"],
  ["manners", "มารยาทในการขับรถ"],
  ["decision", "การตัดสินใจแก้ปัญหาในงาน"],
  ["traffic", "ปฏิบัติตามกฎจราจร (ความเร็วไม่เกิน 90 กม./ชม.)"],
  ["kind", "มีน้ำใจ ช่วยเหลืองาน สุภาพ"],
];
export function reviewIssues(rv) {
  if (!rv || rv.status !== "issue") return [];
  return REVIEW_ITEMS.filter(([k]) => (rv.items || {})[k]).map(([, t]) => t);
}

// ค่าตั้งต้น — แก้ได้ในแท็บสรุป › ตั้งค่า
export const TH_DEF = {
  alcMax: 0, atLimit: 2,
  sbpLow: 90, sbpHigh: 160, sbpCrisis: 180,
  dbpHigh: 100, dbpCrisis: 120,
  prLow: 50, prHigh: 110, prCrisis: 130, spo2Low: 94,
  sleep24Min: 5, sleep48Min: 12, kssWarn: 7, kssStop: 8,
  deleteWindow: 15,
};
export const TH_LABEL = {
  alcMax: "แอลกอฮอล์สูงสุดที่ผ่าน (mg/dl)",
  atLimit: "AT เกินกี่นาที ต้องระบุเหตุผล",
  sbpLow: "SBP ต่ำกว่า → ส่ง ER",
  sbpHigh: "SBP ตั้งแต่ → ไม่ผ่าน",
  sbpCrisis: "SBP ตั้งแต่ → ส่ง ER",
  dbpHigh: "DBP ตั้งแต่ → ไม่ผ่าน",
  dbpCrisis: "DBP ตั้งแต่ → ส่ง ER",
  prLow: "PR ต่ำกว่า → ส่ง ER",
  prHigh: "PR มากกว่า → ไม่ผ่าน",
  prCrisis: "PR ตั้งแต่ → ส่ง ER",
  spo2Low: "SpO₂ ต่ำกว่า → ไม่ผ่าน",
  sleep24Min: "นอนใน 24 ชม. ขั้นต่ำ (ชม.)",
  sleep48Min: "นอนใน 48 ชม. ขั้นต่ำ (ชม.)",
  kssWarn: "KSS ตั้งแต่ → เหลือง",
  kssStop: "KSS ตั้งแต่ → แดง",
  deleteWindow: "ลบรายการได้ภายใน (นาที) · 0 = ห้ามลบ",
};

// Karolinska Sleepiness Scale (แปลไทยโดยผู้พัฒนา ยังไม่ใช่ฉบับแปลที่ผ่านการตรวจสอบ)
export const KSS = [
  [1, "ตื่นตัวมากที่สุด"],
  [2, "ตื่นตัวมาก"],
  [3, "ตื่นตัว"],
  [4, "ค่อนข้างตื่นตัว"],
  [5, "ไม่ตื่นตัวและไม่ง่วง"],
  [6, "เริ่มมีอาการง่วงบ้าง"],
  [7, "ง่วง แต่ยังไม่ต้องฝืน"],
  [8, "ง่วง ต้องฝืนบ้าง"],
  [9, "ง่วงมาก ต้องฝืนเต็มที่ สู้กับความง่วง"],
];
export const OBS = [
  ["yawn", "หาวบ่อย ตาปรือ ขยี้ตา"],
  ["slow", "ตอบสนอง/พูดช้า สมาธิไม่ดี"],
  ["sick", "เจ็บป่วย หรือกินยาที่ทำให้ง่วง"],
];

export const REASONS = [
  "รอพยาบาล", "รอ paramedic", "รอ AEMT", "รอพนักงานขับรถ", "รอข้อมูล/พิกัดจากศูนย์",
  "ทีมเข้าห้องน้ำ", "ติดงานใน ER", "ติดเคสห้องเบอร์ 2", "อุปกรณ์ไม่พร้อม", "อื่นๆ",
];

export const pad = (n) => String(n).padStart(2, "0");
export const ds = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hhmm = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export function thaiDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y + 543}`;
}
export const num = (v) => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v));
export const fmt = (v) => (v == null ? "-" : String(Math.round(v * 10) / 10));
const toMin = (t) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || "").trim()); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };

// เลือกเวรตามเวลาปัจจุบัน: เช้า 08:15–16:14, บ่าย 16:15–00:14, ดึก 00:15–08:14 (นับเป็นของวันก่อนหน้า เหมือน ems-check)
export function currentShift(now = new Date()) {
  const m = now.getHours() * 60 + now.getMinutes();
  const prev = new Date(now);
  prev.setDate(prev.getDate() - 1);
  if (m < 15) return { date: ds(prev), shift: "บ่าย" };
  if (m < 8 * 60 + 15) return { date: ds(prev), shift: "ดึก" };
  if (m < 16 * 60 + 15) return { date: ds(now), shift: "เช้า" };
  return { date: ds(now), shift: "บ่าย" };
}

/* ── ความล้า: ประวัติการนอน (Dawson & McCulloch) + KSS + สิ่งที่ผู้ตรวจสังเกต ── */
// ชั่วโมงที่ตื่นจนถึงจบเวร = (เวลาตรวจ − เวลาตื่น) + (เวลาจบเวร − เวลาตรวจ) คิดแบบวนรอบ 24 ชม.
export function awakeAtShiftEnd(wake, checkTime, shift) {
  const w = toMin(wake), c = toMin(checkTime), e = SHIFT_END[shift];
  if (w == null || c == null || e == null) return null;
  const sofar = (c - w + 1440) % 1440;
  const left = (e - c + 1440) % 1440;
  return (sofar + left) / 60;
}

// ชั่วโมงนอนใน 24 ชม. จาก เวลาเข้านอน–ตื่น + งีบ (ไม่ได้งีบ = 0)
// เกณฑ์ 48 ชม. และชั่วโมงที่ตื่นถึงจบเวร ใช้เฉพาะข้อมูลเก่าที่มีชั่วโมงนอนคืนก่อนหน้า (ตัดช่องนี้ออกจากฟอร์มแล้ว)
// ข้อมูลรุ่นแรกที่กรอก sleep24/sleep48 ตรงๆ ยังอ่านได้
export function sleepFrom(s) {
  s = s || {};
  const b = toMin(s.bed), w = toMin(s.wake);
  const main = b != null && w != null ? ((w - b + 1440) % 1440) / 60 : null;
  const nap = num(s.nap) || 0;
  const prev = num(s.prevNight);
  const s24 = main != null ? main + nap : num(s.sleep24);
  const s48 = main != null ? (prev != null ? s24 + prev : null) : num(s.sleep48);
  return { main, nap, prev, s24, s48 };
}

export function fatigueEval(s, shift, th, nowTime) {
  s = s || {};
  const sl = sleepFrom(s);
  const s24 = sl.s24, s48 = sl.s48, kss = num(s.kss);
  const obs = s.obs || {};
  const awake = awakeAtShiftEnd(s.wake, s.time || nowTime, shift);
  const rules = [
    { id: "s24", label: `นอน 24 ชม. อย่างน้อย ${th.sleep24Min} ชม.`, value: s24, fail: s24 != null ? s24 < th.sleep24Min : null },
    { id: "s48", label: `นอน 48 ชม. อย่างน้อย ${th.sleep48Min} ชม.`, value: s48, fail: s48 != null ? s48 < th.sleep48Min : null },
    { id: "awake", label: "ตื่นถึงจบเวร ไม่เกินชั่วโมงที่นอนใน 48 ชม.", value: awake, fail: awake != null && s48 != null ? awake > s48 : null },
  ];
  const sleepFails = rules.filter((r) => r.fail).length;
  const obsList = OBS.filter(([k]) => obs[k]).map(([, t]) => t);
  const kssWarn = kss != null && kss >= th.kssWarn && kss < th.kssStop;
  const kssStop = kss != null && kss >= th.kssStop;
  const count = sleepFails + (kssWarn ? 1 : 0) + obsList.length;
  const reasons = [
    ...rules.filter((r) => r.fail).map((r) => `ไม่ผ่าน: ${r.label}`),
    ...(kss != null && (kssWarn || kssStop) ? [`KSS ${kss}`] : []),
    ...obsList,
  ];
  let level;
  if (kssStop || count >= 2) level = "red";
  else if (count === 1) level = "yellow";
  else if (s24 == null || kss == null) level = "pending";
  else level = "green";
  if (s24 == null && s48 == null && kss == null && !obsList.length) level = "none";
  return { level, rules, awake, kss, reasons, sleepFails, sleep: sl };
}

/* ── ต้นเวร ── */
export function evalStart(s, th, shift) {
  s = s || {};
  const alc = num(s.alc), sbp = num(s.sbp), dbp = num(s.dbp), pr = num(s.pr), spo2 = num(s.spo2);
  const fat = fatigueEval(s, shift, th);
  if (alc == null && sbp == null && dbp == null && pr == null && fat.level === "none") return { level: "none", items: [], fat };
  const fail = [], er = [], caution = [];
  if (alc != null && alc > th.alcMax) fail.push(`แอลกอฮอล์ ${alc} mg/dl`);
  if (sbp != null) {
    if (sbp < th.sbpLow) er.push(`SBP ${sbp} ต่ำ (สงสัยภาวะ shock)`);
    else if (sbp >= th.sbpCrisis) er.push(`SBP ${sbp} สูงมาก (สงสัย hypertensive emergency)`);
    else if (sbp >= th.sbpHigh) fail.push(`SBP ${sbp} สูง`);
  }
  if (dbp != null) {
    if (dbp >= th.dbpCrisis) er.push(`DBP ${dbp} สูงมาก`);
    else if (dbp >= th.dbpHigh) fail.push(`DBP ${dbp} สูง`);
  }
  if (pr != null) {
    if (pr < th.prLow) er.push(`PR ${pr} ช้า (bradycardia)`);
    else if (pr >= th.prCrisis) er.push(`PR ${pr} เร็วมาก`);
    else if (pr > th.prHigh) fail.push(`PR ${pr} เร็ว`);
  }
  if (spo2 != null && spo2 < th.spo2Low) fail.push(`SpO2 ${spo2}% ต่ำ`);
  if (fat.level === "red") fail.push(`ความล้าระดับแดง (${fat.reasons.join(", ")})`);
  if (fat.level === "yellow") caution.push(`ความล้าระดับเหลือง (${fat.reasons.join(", ")})`);
  if (s.fit === "unfit") fail.push("ผู้ตรวจประเมินว่าไม่เหมาะสมต่อการขับ");
  if (er.length) return { level: "er", items: [...er, ...fail], fat };
  if (fail.length) return { level: "fail", items: fail, fat };
  const missing = [];
  if (alc == null) missing.push("แอลกอฮอล์");
  if (sbp == null || dbp == null) missing.push("BP");
  if (pr == null) missing.push("PR");
  if (spo2 == null) missing.push("SpO₂");
  if (!s.bed) missing.push("เวลาเข้านอน");
  if (!s.wake) missing.push("เวลาตื่นนอน");
  if (num(s.nap) == null) missing.push("ชั่วโมงงีบ (ไม่ได้งีบใส่ 0)");
  if (num(s.kss) == null) missing.push("KSS");
  if (!s.dress) missing.push("การแต่งกาย");
  if (!s.fit) missing.push("ความเห็นผู้ตรวจ");
  if (missing.length) return { level: "pending", items: missing, fat, caution };
  if (caution.length) return { level: "caution", items: caution, fat };
  return { level: "ok", items: [], fat };
}

// รายการที่ไม่ผ่านทีละข้อ ใช้ขึ้น alarm เมื่อมีข้อใหม่ (sev: er = ส่ง ER, fail = เปลี่ยน พขร., warn = เฝ้าระวัง)
export function startIssues(s, th, shift) {
  s = s || {};
  const out = [];
  const add = (key, text, sev) => out.push({ key, text, sev });
  const alc = num(s.alc), sbp = num(s.sbp), dbp = num(s.dbp), pr = num(s.pr), spo2 = num(s.spo2), kss = num(s.kss);
  if (alc != null && alc > th.alcMax) add("alc", `แอลกอฮอล์ ${alc} mg/dl`, "fail");
  if (sbp != null) {
    if (sbp < th.sbpLow) add("sbpLow", `SBP ${sbp} ต่ำ (สงสัยภาวะ shock)`, "er");
    else if (sbp >= th.sbpCrisis) add("sbpCrisis", `SBP ${sbp} สูงมาก (สงสัย hypertensive emergency)`, "er");
    else if (sbp >= th.sbpHigh) add("sbpHigh", `SBP ${sbp} สูง`, "fail");
  }
  if (dbp != null) {
    if (dbp >= th.dbpCrisis) add("dbpCrisis", `DBP ${dbp} สูงมาก`, "er");
    else if (dbp >= th.dbpHigh) add("dbpHigh", `DBP ${dbp} สูง`, "fail");
  }
  if (pr != null) {
    if (pr < th.prLow) add("prLow", `PR ${pr} ช้า (bradycardia)`, "er");
    else if (pr >= th.prCrisis) add("prCrisis", `PR ${pr} เร็วมาก`, "er");
    else if (pr > th.prHigh) add("prHigh", `PR ${pr} เร็ว`, "fail");
  }
  if (spo2 != null && spo2 < th.spo2Low) add("spo2", `SpO2 ${spo2}% ต่ำ`, "fail");
  const fat = fatigueEval(s, shift, th);
  fat.rules.forEach((r) => { if (r.fail) add("sleep_" + r.id, `${r.label} ไม่ผ่าน (${fmt(r.value)})`, "warn"); });
  if (kss != null && kss >= th.kssStop) add("kssStop", `KSS ${kss} ง่วงมาก`, "fail");
  else if (kss != null && kss >= th.kssWarn) add("kssWarn", `KSS ${kss} เริ่มง่วง`, "warn");
  OBS.forEach(([k, t]) => { if ((s.obs || {})[k]) add("obs_" + k, t, "warn"); });
  if (fat.level === "red" && !out.some((x) => x.key === "kssStop")) add("fatRed", "ความล้ารวมระดับแดง ไม่ควรขับ", "fail");
  if (s.fit === "unfit") add("unfit", "ผู้ตรวจประเมินว่าไม่เหมาะสมต่อการขับ", "fail");
  if (s.dress === "bad") add("dress", "การแต่งกายไม่สะอาด/ไม่เรียบร้อย", "warn");
  return out;
}

// ค่าผิดปกติรายช่อง สำหรับทำสีช่องกรอก
export function vitalFlags(s, th) {
  s = s || {};
  const alc = num(s.alc), sbp = num(s.sbp), dbp = num(s.dbp), pr = num(s.pr), spo2 = num(s.spo2);
  return {
    spo2: spo2 != null && spo2 < th.spo2Low,
    alc: alc != null && alc > th.alcMax,
    bp: (sbp != null && (sbp < th.sbpLow || sbp >= th.sbpHigh)) || (dbp != null && dbp >= th.dbpHigh),
    pr: pr != null && (pr < th.prLow || pr > th.prHigh),
  };
}

const FAT_TH = { green: "เขียว", yellow: "เหลือง", red: "แดง", pending: "ยังไม่ครบ", none: "-" };
export const fatigueLabel = (l) => FAT_TH[l] || "-";

export function msgStart(date, shift, s, r, names) {
  s = s || {};
  const fat = r.fat || { level: "none" };
  const L = ["รายงานการตรวจความพร้อมพนักงานขับรถ ต้นเวร", `เวร ${shiftLabel(shift)} วันที่ ${thaiDate(date)}`];
  if (names.driver) L.push(`พขร. ${names.driver}`);
  L.push(`1. ปริมาณแอลกอฮอล์ ${s.alc ?? "-"} mg/dl`);
  L.push(`2. BP ${s.sbp ?? "-"}/${s.dbp ?? "-"} mmHg  PR ${s.pr ?? "-"} /min${s.spo2 != null && s.spo2 !== "" ? `  SpO2 ${s.spo2}%` : ""}`);
  const sl = sleepFrom(s);
  const sleepTxt = s.bed && s.wake
    ? `นอน ${s.bed}–${s.wake}${sl.nap ? ` + งีบ ${fmt(sl.nap)} ชม.` : ""} = ${fmt(sl.s24)} ชม.${sl.prev != null ? ` (คืนก่อน ${fmt(sl.prev)} ชม.)` : ""}`
    : `นอน 24 ชม. ${fmt(sl.s24)} ชม.`;
  L.push(`3. ความล้า: ${sleepTxt} · KSS ${s.kss ?? "-"} · ระดับ${fatigueLabel(fat.level)}`);
  const res = {
    ok: "พร้อมปฏิบัติงาน",
    caution: "ปฏิบัติงานได้ แต่ต้องมีมาตรการลดความล้า",
    fail: "ไม่ผ่าน เปลี่ยน พขร.",
    er: "ไม่ผ่าน เปลี่ยน พขร. และส่งตรวจ ER",
    pending: "รอข้อมูล", none: "รอข้อมูล",
  }[r.level];
  L.push(`ผลประเมิน: ${res}`);
  const a = s.actions || {};
  const done = [a.po && "รายงาน พอป.", a.admin && "แจ้งฝ่ายบริหาร", a.er && "ส่งตรวจ ER"].filter(Boolean);
  if (done.length) L.push(`ดำเนินการแล้ว: ${done.join(", ")}`);
  if (s.dress === "bad") L.push("การแต่งกาย: ไม่สะอาด/ไม่เรียบร้อย");
  if (s.substitute) L.push(`พขร. ที่มาแทน: ${s.substitute}`);
  if (s.note) L.push(`หมายเหตุ: ${s.note}`);
  if (names.assessor) L.push(`ผู้ตรวจ: ${names.assessor}`);
  return L.join("\n");
}

/* ── ก่อนออก / หลังออก ── */
// รายการที่ถูกลบไม่หายจากฐานข้อมูล แค่ติดป้าย deleted (เก็บประวัติไว้ตรวจสอบย้อนหลัง)
export function sortedRuns(runs) {
  return Object.entries(runs || {})
    .map(([id, r]) => ({ id, ...r }))
    .filter((r) => !r.deleted)
    .sort((a, b) => (a.n || 0) - (b.n || 0));
}
export function deletedRuns(runs) {
  return Object.entries(runs || {}).map(([id, r]) => ({ id, ...r })).filter((r) => r.deleted);
}
// ลบได้เฉพาะภายในเวลาที่กำหนดหลังบันทึก (กันการแก้ย้อนหลัง)
export function deleteLeft(savedAt, th, now = Date.now()) {
  const w = num(th.deleteWindow) || 0;
  if (!w || !savedAt) return 0;
  const left = savedAt + w * 60000 - now;
  return left > 0 ? Math.ceil(left / 60000) : 0;
}
export const blowsOf = (r) => (Array.isArray(r.blows) ? r.blows : Object.values(r.blows || {})).filter(Boolean);
export const lastBlow = (r) => { const b = blowsOf(r); return b[b.length - 1] || null; };
export function runCleared(r, th) {
  const l = lastBlow(r);
  return !!l && num(l.alc) != null && num(l.alc) <= th.alcMax;
}
export function runHadPositive(r, th) {
  return blowsOf(r).some((b) => num(b.alc) != null && num(b.alc) > th.alcMax);
}
// เหตุผลเลือกได้หลายข้อ (reasons[]); ข้อมูลเก่าที่มี reason เดียวยังอ่านได้
export function reasonsOf(r) {
  if (Array.isArray(r.reasons)) return r.reasons.filter(Boolean);
  if (r.reasons && typeof r.reasons === "object") return Object.values(r.reasons).filter(Boolean);
  return r.reason ? [r.reason] : [];
}
export function reasonText(r) {
  const list = reasonsOf(r).filter((x) => x !== "อื่นๆ");
  const note = (r.reasonNote || "").trim();
  const hasOther = reasonsOf(r).includes("อื่นๆ");
  if (!list.length && !hasOther) return "";
  if (!list.length) return note;
  return list.join(" และ ") + (note ? ` (${note})` : "");
}
export const reasonReady = (r) => {
  const rs = reasonsOf(r);
  if (!rs.length) return false;
  if (rs.length === 1 && rs[0] === "อื่นๆ") return !!(r.reasonNote || "").trim();
  return true;
};

export function msgAlc(date, shift, runs, th) {
  const L = ["รายงานการเป่าแอลกอฮอล์ (รายครั้ง) ของพนักงานขับรถ ก่อนออกปฏิบัติการ", `เวร ${shift} วันที่ ${thaiDate(date)}`];
  if (!runs.length) L.push("(ยังไม่มีการออก)");
  runs.forEach((r) => {
    const b = blowsOf(r), last = b[b.length - 1];
    let s = `${r.n}. ปริมาณแอลกอฮอล์ ${last ? last.alc : "-"} mg/dl`;
    if (b.length > 1) {
      const first = b.slice(0, -1).map((x) => x.alc).join(", ");
      const changed = last && b[0].driver && last.driver && last.driver !== b[0].driver;
      s += ` (เป่าครั้งแรก ${first} mg/dl${changed ? ` เปลี่ยน พขร. เป็น ${last.driver}` : " เป่าซ้ำ"})`;
    }
    if (!runCleared(r, th)) s += " — ไม่ผ่าน ยังไม่ออก";
    L.push(s);
  });
  return L.join("\n");
}

export function msgAt(date, shift, runs, th) {
  const L = ["รายงาน Activation time (รายครั้ง)", `วันที่: ${thaiDate(date)}`, `เวร: ${shift}`];
  let any = false;
  runs.forEach((r) => {
    const at = num(r.at);
    if (at == null) return;
    any = true;
    const why = at > th.atLimit ? ` (${reasonText(r) || "ยังไม่ระบุเหตุผล"})` : "";
    L.push(`ครั้งที่ ${r.n} = ${fmt(at)} นาที${why}`);
  });
  if (!any) L.push("(ยังไม่ได้กรอก AT)");
  return L.join("\n");
}

/* ── ไม่มาประเมิน ── */
// เวลาจบเวรจริง (วันเวลา) — ดึกและบ่ายจบในวันถัดไป
export function shiftEndDate(date, shift) {
  const [y, m, d] = date.split("-").map(Number);
  const end = SHIFT_END[shift];
  const nextDay = shift !== "เช้า";
  return new Date(y, m - 1, d + (nextDay ? 1 : 0), Math.floor(end / 60), end % 60);
}
export const shiftEnded = (date, shift, now = new Date()) => now >= shiftEndDate(date, shift);
// พขร. ประเมินต้นเวรตอนเวรเช้า และเวรบ่าย (บ่าย/ดึกเป็นคนเดียวกัน) จึงไม่นับเวรดึก
export const ASSESS_SHIFTS = ["เช้า", "บ่าย"];
export function noShows(rosterMap, list, th, now = new Date()) {
  const done = new Set(list.filter((d) => startsOf(d).some((s) => evalStart(s, th, d.shift).level !== "none")).map((d) => `${d.date}_${d.shift}`));
  return Object.entries(rosterMap || {})
    .map(([k, r]) => ({ key: k, date: k.slice(0, 10), shift: k.slice(11), driver: (r && r.driv) || "" }))
    .filter((x) => x.driver && ASSESS_SHIFTS.includes(x.shift) && /^\d{4}-\d{2}-\d{2}$/.test(x.date))
    .filter((x) => shiftEnded(x.date, x.shift, now) && !done.has(x.key))
    .sort((a, b) => (a.key < b.key ? -1 : 1));
}

/* ── สรุปเดือน ── */
// ผลตรวจต้นเวรทั้งหมดของเวร: รอบที่ไม่ผ่านแล้วเปลี่ยนคน (startPrev) + รอบปัจจุบัน
export function startsOf(d) {
  const prev = Object.entries(d.startPrev || {}).sort(([a], [b]) => (a < b ? -1 : 1)).map(([, s]) => s);
  return d.start ? [...prev, d.start] : prev;
}

export function summarize(list, th) {
  const st = {
    shifts: list.length, starts: 0, dressBad: 0, deletedBlows: 0, deletedAts: 0, reviewed: 0, reviewIssue: 0, reviewCount: {}, reviewList: [], startFail: 0, startEr: 0, startAlc: 0, fatYellow: 0, fatRed: 0,
    runs: 0, departed: 0, alcPos: 0, atN: 0, within: 0, noReason: 0, pendingAt: 0,
    ats: [], reasons: {}, lateList: [],
    byShift: Object.fromEntries(SHIFTS.map((s) => [s, { runs: 0, atN: 0, sum: 0, late: 0 }])),
  };
  list.forEach((d) => {
    startsOf(d).forEach((s) => {
      const r = evalStart(s, th, d.shift);
      if (r.level !== "none") {
        st.starts++;
        if (r.level === "fail") st.startFail++;
        if (r.level === "er") { st.startFail++; st.startEr++; }
      }
      if (s.dress === "bad") st.dressBad++;
      if (r.fat.level === "yellow") st.fatYellow++;
      if (r.fat.level === "red") st.fatRed++;
      if (num(s.alc) != null && num(s.alc) > th.alcMax) st.startAlc++;
    });
    if (d.endReview && d.endReview.status) {
      st.reviewed++;
      const items = reviewIssues(d.endReview);
      if (d.endReview.status === "issue") {
        st.reviewIssue++;
        items.forEach((t) => { st.reviewCount[t] = (st.reviewCount[t] || 0) + 1; });
        st.reviewList.push({ date: d.date, shift: d.shift, driver: d.endReview.driver || "", items, note: d.endReview.note || "" });
      }
    }
    st.deletedBlows += deletedRuns(d.runs).length;
    Object.values(d.runs || {}).forEach((x) => { st.deletedAts += Object.keys((x && x.atHistory) || {}).length; });
    sortedRuns(d.runs).forEach((x) => {
      st.runs++;
      const bs = st.byShift[d.shift] || st.byShift["เช้า"];
      bs.runs++;
      if (runHadPositive(x, th)) st.alcPos++;
      if (runCleared(x, th)) st.departed++;
      const at = num(x.at);
      if (at == null) { if (runCleared(x, th)) st.pendingAt++; return; }
      st.atN++; st.ats.push(at); bs.atN++; bs.sum += at;
      if (at <= th.atLimit) { st.within++; return; }
      bs.late++;
      if (!reasonReady(x)) st.noReason++;
      const rs = reasonsOf(x);
      (rs.length ? rs : ["ไม่ระบุ"]).forEach((k) => { st.reasons[k] = (st.reasons[k] || 0) + 1; });
      st.lateList.push({ date: d.date, shift: d.shift, n: x.n, at, reason: reasonText(x) });
    });
  });
  const a = [...st.ats].sort((x, y) => x - y);
  st.mean = a.length ? a.reduce((p, c) => p + c, 0) / a.length : null;
  st.median = a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null;
  st.max = a.length ? a[a.length - 1] : null;
  const L = th.atLimit;
  st.buckets = [
    { label: `≤ ${L} นาที`, n: a.filter((v) => v <= L).length, tone: "ok" },
    { label: `${L}–${L + 1}`, n: a.filter((v) => v > L && v <= L + 1).length, tone: "warn" },
    { label: `${L + 1}–${L + 3}`, n: a.filter((v) => v > L + 1 && v <= L + 3).length, tone: "warn" },
    { label: `> ${L + 3}`, n: a.filter((v) => v > L + 3).length, tone: "bad" },
  ];
  return st;
}

export function msgMonth(st, ym, th, noShowCount = 0) {
  const [y, m] = ym.split("-").map(Number);
  const pct = st.atN ? Math.round((st.within / st.atN) * 100) : 0;
  const L = [
    "สรุปการตรวจความพร้อม พขร. และ Activation time",
    `ประจำเดือน ${MONTHS[m - 1]} ${y + 543}`,
    `1. ตรวจต้นเวร ${st.starts} ครั้ง: ไม่ผ่าน ${st.startFail} (ส่งตรวจ ER ${st.startEr}) · ความล้าเหลือง ${st.fatYellow} แดง ${st.fatRed}`,
    `2. เป่าแอลกอฮอล์ก่อนออก ${st.runs} ครั้ง: พบมากกว่า ${th.alcMax} mg/dl ${st.alcPos} ครั้ง`,
    `3. AT ≤ ${th.atLimit} นาที ${st.within}/${st.atN} ครั้ง (${pct}%) · เฉลี่ย ${fmt(st.mean)} นาที · มัธยฐาน ${fmt(st.median)} นาที`,
  ];
  L.push(`4. ไม่มาประเมินต้นเวร ${noShowCount} เวร · การแต่งกายไม่เรียบร้อย ${st.dressBad} ครั้ง`);
  const rc = Object.entries(st.reviewCount).sort((a, b) => b[1] - a[1]);
  L.push(`5. ประเมินจบเวร ${st.reviewed} เวร: มีเรื่องควรปรับปรุง ${st.reviewIssue} เวร${rc.length ? ` (${rc.map(([k, n]) => `${k} ${n}`).join(", ")})` : ""}`);
  const rs = Object.entries(st.reasons).sort((a, b) => b[1] - a[1]);
  if (rs.length) L.push(`6. เหตุผลที่ AT เกิน ${th.atLimit} นาที: ` + rs.map(([k, n]) => `${k} ${n}`).join(", "));
  return L.join("\n");
}

export function toCSV(list, th, noShowList = []) {
  const esc = (v) => { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  const rows = [["ประเภท", "วันที่", "เวร", "ครั้งที่", "เวลา", "พขร.", "แอลกอฮอล์ mg/dl", "SBP", "DBP", "PR", "SpO2",
    "เข้านอน", "ตื่นนอน", "งีบ (ชม.)", "นอน 24 ชม.", "นอน 48 ชม.", "KSS", "ระดับความล้า", "แต่งกาย", "ผล", "AT (นาที)", "เหตุผล AT", "ผู้ตรวจ", "หมายเหตุ"]];
  list.forEach((d) => {
    startsOf(d).forEach((s) => {
      const r = evalStart(s, th, d.shift);
      if (r.level === "none") return;
      rows.push(["ต้นเวร", d.date, shiftLabel(d.shift), "", s.time, s.driver || s.rosterDriver, s.alc, s.sbp, s.dbp, s.pr, s.spo2,
        s.bed, s.wake, s.nap, fmt(r.fat.sleep.s24), r.fat.sleep.s48 == null ? "" : fmt(r.fat.sleep.s48), s.kss, fatigueLabel(r.fat.level), { ok: "เรียบร้อย", bad: "ไม่เรียบร้อย" }[s.dress] || "",
        { ok: "ผ่าน", caution: "ผ่านแบบมีมาตรการ", fail: "ไม่ผ่าน", er: "ไม่ผ่าน-ส่ง ER", pending: "ไม่ครบ" }[r.level], "", "",
        s.assessor || s.rosterAemt, [s.note, s.substitute && `คนแทน: ${s.substitute}`].filter(Boolean).join(" · ")]);
    });
    sortedRuns(d.runs).forEach((x) => {
      blowsOf(x).forEach((b, i, arr) => {
        const isLast = i === arr.length - 1;
        rows.push(["ก่อนออก EMS", d.date, d.shift, x.n, b.time, b.driver, b.alc, "", "", "", "", "", "", "", "", "", b.kss ?? "", "", "",
          num(b.alc) != null && num(b.alc) > th.alcMax ? "ไม่ผ่าน" : "ผ่าน",
          isLast ? x.at : "", isLast ? reasonText(x) : "", "", ""]);
      });
    });
  });
  list.forEach((d) => {
    const rv = d.endReview;
    if (!rv || !rv.status) return;
    rows.push(["ประเมินจบเวร", d.date, d.shift, "", rv.at || "", rv.driver || "", ...Array(13).fill(""),
      rv.status === "ok" ? "ไม่มีเรื่องต้องปรับปรุง" : "ควรปรับปรุง: " + reviewIssues(rv).join(", "), "", "", "", rv.note || ""]);
  });
  list.forEach((d) => {
    deletedRuns(d.runs).forEach((x) => {
      const b = lastBlow(x) || {};
      rows.push(["ลบแล้ว (เป่าก่อนออก)", d.date, d.shift, x.deleted.n ?? x.n ?? "", b.time || "", b.driver || "", b.alc ?? "", ...Array(16).fill(""), `ลบเมื่อ ${new Date(x.deleted.at).toLocaleString("th-TH")}`]);
    });
    sortedRuns(d.runs).forEach((x) => {
      Object.values(x.atHistory || {}).forEach((h) => {
        rows.push(["ลบแล้ว (AT)", d.date, d.shift, x.n, "", "", "", ...Array(13).fill(""), h.at ?? "", reasonText({ reasons: h.reasons, reasonNote: h.note }), "", `ลบเมื่อ ${new Date(h.deletedAt).toLocaleString("th-TH")}`]);
      });
    });
  });
  noShowList.forEach((x) => {
    rows.push(["ไม่มาประเมิน", x.date, shiftLabel(x.shift), "", "", x.driver, ...Array(13).fill(""), "ไม่มาประเมินต้นเวร", "", "", "", ""]);
  });
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\n");
}

/* ── ค้นชื่อ (แบบเดียวกับ ems-check) ── */
const TITLE_RE = /^(นางสาว|น\.ส\.|นส\.?|นาย|นาง|ว่าที่\s*ร\.?ต\.?|ด\.ต\.|จ\.ส\.ต\.|ส\.ต\.อ\.|ส\.ต\.ต\.|ร\.ต\.|ดร\.?)\s*/;
const normName = (t) => String(t || "").toLowerCase().replace(/\s+/g, "").replace(/\./g, "");
const bareName = (t) => normName(String(t || "").trim().replace(TITLE_RE, ""));
export function matchNames(options, query, limit = 8) {
  const q = normName(query);
  const list = [...new Set(options)];
  if (!q) return list.sort((x, y) => bareName(x).localeCompare(bareName(y), "th", { numeric: true })).slice(0, limit);
  return list
    .map((n) => {
      const b = bareName(n), f = normName(n);
      const words = String(n).trim().replace(TITLE_RE, "").split(/\s+/).map(normName);
      const score = b.startsWith(q) ? 0 : words.some((w) => w.startsWith(q)) ? 1 : q.length > 1 && (b.includes(q) || f.includes(q)) ? 2 : 9;
      return { n, score };
    })
    .filter((x) => x.score < 9)
    .sort((x, y) => x.score - y.score || bareName(x.n).localeCompare(bareName(y.n), "th", { numeric: true }))
    .slice(0, limit)
    .map((x) => x.n);
}

/* ── PIN (เก็บเป็น hash ไม่เก็บตัวเลขจริง) ── */
export async function hashPin(pin) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("driver-check:" + String(pin)));
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
