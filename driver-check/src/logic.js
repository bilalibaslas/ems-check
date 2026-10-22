// ฟังก์ชันคำนวณล้วน (ไม่แตะ Firebase) — ประเมินผล, สร้างข้อความไลน์, สรุปรายเดือน

export const MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
export const SHIFTS = ["เช้า", "บ่าย", "ดึก"];

// ค่าตั้งต้น (ตัวอย่าง) — แก้ได้ในแท็บสรุป › ตั้งค่าเกณฑ์ (ใช้ PIN เดียวกับ ems-check)
export const TH_DEF = {
  alcMax: 0, atLimit: 2,
  sbpLow: 90, sbpHigh: 160, sbpCrisis: 180,
  dbpHigh: 100, dbpCrisis: 120,
  prLow: 50, prHigh: 110, prCrisis: 130,
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
};

export const FATIGUE = [
  ["sleep", "นอนน้อยกว่า 6 ชม. ใน 24 ชม."],
  ["sleepy", "ง่วง อ่อนล้า สมาธิไม่ดี"],
  ["sick", "เจ็บป่วย / กินยาที่ทำให้ง่วง"],
  ["long", "ทำงานต่อเนื่องเกิน 12 ชม."],
];

export const REASONS = ["รอข้อมูล/พิกัดจากศูนย์", "รอทีมครบ", "ติดงานใน ER", "รถ/อุปกรณ์ไม่พร้อม", "อื่นๆ"];

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

// เวรเช้า 08:15–16:14, บ่าย 16:15–00:14, ดึก 00:15–08:14 (นับเป็นของวันก่อนหน้า เหมือน ems-check)
export function currentShift(now = new Date()) {
  const m = now.getHours() * 60 + now.getMinutes();
  const prev = new Date(now);
  prev.setDate(prev.getDate() - 1);
  if (m < 15) return { date: ds(prev), shift: "บ่าย" };
  if (m < 8 * 60 + 15) return { date: ds(prev), shift: "ดึก" };
  if (m < 16 * 60 + 15) return { date: ds(now), shift: "เช้า" };
  return { date: ds(now), shift: "บ่าย" };
}

/* ── ต้นเวร ── */
export function evalStart(s, th) {
  s = s || {};
  const fat = s.fatigue || {};
  const alc = num(s.alc), sbp = num(s.sbp), dbp = num(s.dbp), pr = num(s.pr);
  if (alc == null && sbp == null && dbp == null && pr == null) return { level: "none", items: [] };
  const fail = [], er = [];
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
  FATIGUE.forEach(([k, t]) => { if (fat[k] === "yes") fail.push("ความล้า: " + t); });
  if (s.fit === "unfit") fail.push("ผู้ตรวจประเมินว่าไม่เหมาะสมต่อการขับ");
  if (er.length) return { level: "er", items: [...er, ...fail] };
  if (fail.length) return { level: "fail", items: fail };
  const missing = [];
  if (alc == null) missing.push("แอลกอฮอล์");
  if (sbp == null || dbp == null) missing.push("BP");
  if (pr == null) missing.push("PR");
  if (!s.fit) missing.push("ความเห็นผู้ตรวจ");
  return { level: missing.length ? "pending" : "ok", items: missing };
}

// ค่าผิดปกติรายช่อง สำหรับทำสีช่องกรอก
export function vitalFlags(s, th) {
  s = s || {};
  const alc = num(s.alc), sbp = num(s.sbp), dbp = num(s.dbp), pr = num(s.pr);
  return {
    alc: alc != null && alc > th.alcMax,
    bp: (sbp != null && (sbp < th.sbpLow || sbp >= th.sbpHigh)) || (dbp != null && dbp >= th.dbpHigh),
    pr: pr != null && (pr < th.prLow || pr > th.prHigh),
  };
}

export function msgStart(date, shift, s, r, names) {
  s = s || {};
  const fat = s.fatigue || {};
  const L = ["รายงานการตรวจความพร้อมพนักงานขับรถ ต้นเวร", `เวร ${shift} วันที่ ${thaiDate(date)}`];
  if (names.driver) L.push(`พขร. ${names.driver}`);
  L.push(`1. ปริมาณแอลกอฮอล์ ${s.alc ?? "-"} mg/dl`);
  L.push(`2. BP ${s.sbp ?? "-"}/${s.dbp ?? "-"} mmHg  PR ${s.pr ?? "-"} /min${s.spo2 != null && s.spo2 !== "" ? `  SpO2 ${s.spo2}%` : ""}`);
  const answered = FATIGUE.filter(([k]) => fat[k]).length;
  const yes = FATIGUE.filter(([k]) => fat[k] === "yes").length;
  L.push(`3. ประเมินความล้า: ${answered === 0 ? "-" : yes ? `พบ ${yes} ข้อ` : "ไม่พบความเสี่ยง"}`);
  const res = { ok: "พร้อมปฏิบัติงาน", fail: "ไม่ผ่าน เปลี่ยน พขร.", er: "ไม่ผ่าน เปลี่ยน พขร. และส่งตรวจ ER", pending: "รอข้อมูล", none: "รอข้อมูล" }[r.level];
  L.push(`ผลประเมิน: ${res}`);
  const a = s.actions || {};
  const done = [a.po && "รายงาน พอป.", a.admin && "แจ้งฝ่ายบริหาร", a.er && "ส่งตรวจ ER"].filter(Boolean);
  if (done.length) L.push(`ดำเนินการแล้ว: ${done.join(", ")}`);
  if (s.substitute) L.push(`พขร. ที่มาแทน: ${s.substitute}`);
  if (s.note) L.push(`หมายเหตุ: ${s.note}`);
  if (names.assessor) L.push(`ผู้ตรวจ: ${names.assessor}`);
  return L.join("\n");
}

/* ── ก่อนออก / หลังออก ── */
export function sortedRuns(runs) {
  return Object.entries(runs || {})
    .map(([id, r]) => ({ id, ...r }))
    .sort((a, b) => (a.n || 0) - (b.n || 0));
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
export function reasonText(r) {
  if (!r.reason) return "";
  if (r.reason === "อื่นๆ") return (r.reasonNote || "").trim();
  return r.reason + (r.reasonNote && r.reasonNote.trim() ? ` (${r.reasonNote.trim()})` : "");
}

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
  const L = [`เวร${shift}`, thaiDate(date)];
  let any = false;
  runs.forEach((r) => {
    const at = num(r.at);
    if (at == null) return;
    any = true;
    const why = at > th.atLimit ? (reasonText(r) ? ` เนื่องจาก${reasonText(r)}` : " (ยังไม่ระบุเหตุผล)") : "";
    L.push(`ครั้งที่ ${r.n} = AT ${fmt(at)} min${why}`);
  });
  if (!any) L.push("(ยังไม่ได้กรอก AT)");
  return L.join("\n");
}

/* ── สรุปเดือน ── */
// ผลตรวจต้นเวรทั้งหมดของเวร: รอบที่ไม่ผ่านแล้วเปลี่ยนคน (startPrev) + รอบปัจจุบัน
export function startsOf(d) {
  const prev = Object.entries(d.startPrev || {}).sort(([a], [b]) => (a < b ? -1 : 1)).map(([, s]) => s);
  return d.start ? [...prev, d.start] : prev;
}
export function summarize(list, th) {
  const st = {
    shifts: list.length, starts: 0, startFail: 0, startEr: 0, startAlc: 0,
    runs: 0, departed: 0, alcPos: 0, atN: 0, within: 0, noReason: 0, pendingAt: 0,
    ats: [], reasons: {}, lateList: [],
    byShift: Object.fromEntries(SHIFTS.map((s) => [s, { runs: 0, atN: 0, sum: 0, late: 0 }])),
  };
  list.forEach((d) => {
    startsOf(d).forEach((s) => {
      const r = evalStart(s, th);
      if (r.level !== "none") {
        st.starts++;
        if (r.level === "fail") st.startFail++;
        if (r.level === "er") { st.startFail++; st.startEr++; }
      }
      if (num(s.alc) != null && num(s.alc) > th.alcMax) st.startAlc++;
    });
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
      const rt = reasonText(x);
      if (!rt) st.noReason++;
      const k = x.reason || "ไม่ระบุ";
      st.reasons[k] = (st.reasons[k] || 0) + 1;
      st.lateList.push({ date: d.date, shift: d.shift, n: x.n, at, reason: rt });
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

export function msgMonth(st, ym, th) {
  const [y, m] = ym.split("-").map(Number);
  const pct = st.atN ? Math.round((st.within / st.atN) * 100) : 0;
  const L = [
    "สรุปการตรวจความพร้อม พขร. และ Activation time",
    `ประจำเดือน ${MONTHS[m - 1]} ${y + 543}`,
    `1. ตรวจต้นเวร ${st.starts} เวร: ไม่ผ่าน ${st.startFail} เวร (ส่งตรวจ ER ${st.startEr})`,
    `2. เป่าแอลกอฮอล์ก่อนออก ${st.runs} ครั้ง: พบมากกว่า ${th.alcMax} mg/dl ${st.alcPos} ครั้ง`,
    `3. AT ≤ ${th.atLimit} นาที ${st.within}/${st.atN} ครั้ง (${pct}%) · เฉลี่ย ${fmt(st.mean)} นาที · มัธยฐาน ${fmt(st.median)} นาที`,
  ];
  const rs = Object.entries(st.reasons).sort((a, b) => b[1] - a[1]);
  if (rs.length) L.push(`4. เหตุผลที่ AT เกิน ${th.atLimit} นาที: ` + rs.map(([k, n]) => `${k} ${n}`).join(", "));
  return L.join("\n");
}

export function toCSV(list, th) {
  const esc = (v) => { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  const rows = [["ประเภท", "วันที่", "เวร", "ครั้งที่", "เวลา", "พขร.", "แอลกอฮอล์ mg/dl", "SBP", "DBP", "PR", "SpO2", "ผล", "AT (นาที)", "เหตุผล AT", "ผู้ตรวจ", "หมายเหตุ"]];
  list.forEach((d) => {
    startsOf(d).forEach((s) => {
      const r = evalStart(s, th);
      if (r.level === "none") return;
      rows.push(["ต้นเวร", d.date, d.shift, "", s.time, s.driver || s.rosterDriver, s.alc, s.sbp, s.dbp, s.pr, s.spo2,
        { ok: "ผ่าน", fail: "ไม่ผ่าน", er: "ไม่ผ่าน-ส่ง ER", pending: "ไม่ครบ" }[r.level], "", "",
        s.assessor || s.rosterAemt, [s.note, s.substitute && `คนแทน: ${s.substitute}`].filter(Boolean).join(" · ")]);
    });
    sortedRuns(d.runs).forEach((x) => {
      blowsOf(x).forEach((b, i, arr) => {
        const isLast = i === arr.length - 1;
        rows.push(["ก่อนออก EMS", d.date, d.shift, x.n, b.time, b.driver, b.alc, "", "", "", "",
          num(b.alc) != null && num(b.alc) > th.alcMax ? "ไม่ผ่าน" : "ผ่าน",
          isLast ? x.at : "", isLast ? reasonText(x) : "", "", ""]);
      });
    });
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
  if (!q) return list.sort((x, y) => bareName(x).localeCompare(bareName(y), "th")).slice(0, limit);
  return list
    .map((n) => {
      const b = bareName(n), f = normName(n);
      const words = String(n).trim().replace(TITLE_RE, "").split(/\s+/).map(normName);
      const score = b.startsWith(q) ? 0 : words.some((w) => w.startsWith(q)) ? 1 : q.length > 1 && (b.includes(q) || f.includes(q)) ? 2 : 9;
      return { n, score };
    })
    .filter((x) => x.score < 9)
    .sort((x, y) => x.score - y.score || bareName(x.n).localeCompare(bareName(y.n), "th"))
    .slice(0, limit)
    .map((x) => x.n);
}
