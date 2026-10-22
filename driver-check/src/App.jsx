import { useEffect, useMemo, useRef, useState } from "react";
import { ref, onValue, update, push, set, query, orderByKey, startAt, endAt } from "firebase/database";
import { db } from "./firebase";
import * as L from "./logic";

const { SHIFTS, TH_DEF, TH_LABEL, KSS, OBS, REASONS, MONTHS, num, fmt, hhmm } = L;

function useSession(key) {
  const [v, setV] = useState(() => { try { return sessionStorage.getItem(key) === "1"; } catch { return false; } });
  const on = () => { setV(true); try { sessionStorage.setItem(key, "1"); } catch { /* ignore */ } };
  const off = () => { setV(false); try { sessionStorage.removeItem(key); } catch { /* ignore */ } };
  return [v, on, off];
}

function KssPicker({ value, onPick, th, compact }) {
  return (
    <div className={compact ? "kss compact" : "kss"} role="group" aria-label="Karolinska Sleepiness Scale">
      {KSS.map(([n, t]) => {
        const tone = n >= th.kssStop ? "bad" : n >= th.kssWarn ? "warn" : "";
        return (
          <button key={n} type="button" className={tone} aria-pressed={value === n} onClick={() => onPick(value === n ? null : n)} title={t}>
            <b>{n}</b>{!compact && <span>{t}</span>}
          </button>
        );
      })}
    </div>
  );
}

function ReasonChips({ reasons, value, onChange }) {
  const toggle = (o) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div className="chips" role="group" aria-label="เหตุผล (เลือกได้หลายข้อ)">
      {reasons.map((o) => (
        <button key={o} type="button" aria-pressed={value.includes(o)} onClick={() => toggle(o)}>{o}</button>
      ))}
    </div>
  );
}

/* ── hooks / helpers ── */
function useValue(path, fallback) {
  const [v, setV] = useState(undefined);
  useEffect(() => {
    setV(undefined);
    return onValue(ref(db, path), (s) => setV(s.val()), () => setV(null));
  }, [path]);
  return v === undefined ? undefined : v ?? fallback;
}

async function copyText(text, toast) {
  try {
    await navigator.clipboard.writeText(text);
    toast("คัดลอกแล้ว วางในไลน์ได้เลย");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    ta.remove();
    toast(ok ? "คัดลอกแล้ว วางในไลน์ได้เลย" : "คัดลอกไม่ได้ กดค้างที่ข้อความเพื่อคัดลอกเอง");
  }
}

// ช่องกรอกที่บันทึกเองหลังหยุดพิมพ์ และไม่โดนค่าจากเครื่องอื่นทับตอนกำลังพิมพ์
function Field({ value, onCommit, onFinal, numeric, className = "inp", ...rest }) {
  const [v, setV] = useState(value ?? "");
  const focused = useRef(false);
  const timer = useRef();
  const last = useRef(value);
  useEffect(() => {
    if (!focused.current) setV(value ?? "");
    last.current = value;
  }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const commit = (x) => {
    clearTimeout(timer.current);
    const out = numeric ? num(x) : String(x);
    if (String(out ?? "") !== String(last.current ?? "")) {
      last.current = out;
      onCommit(out);
    }
  };
  return (
    <input
      {...rest}
      className={className}
      value={v}
      inputMode={numeric ? "decimal" : rest.inputMode}
      autoComplete="off"
      onFocus={() => { focused.current = true; }}
      onBlur={(e) => { focused.current = false; commit(e.target.value); onFinal && onFinal(e.target.value); }}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      onChange={(e) => {
        const x = e.target.value;
        setV(x);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => commit(x), 600);
      }}
    />
  );
}

function NameInput({ id, value, onChange, options, placeholder, autoFocus }) {
  const [open, setOpen] = useState(false);
  const matches = L.matchNames(options, value).filter((n) => n !== value);
  return (
    <div className="fld" style={{ color: "inherit" }}>
      <input id={id} className="inp" value={value} placeholder={placeholder} autoComplete="off" autoFocus={autoFocus}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && matches.length > 0 && (
        <div className="ac">
          {matches.map((n) => (
            <button type="button" key={n} onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(n); setOpen(false); }}>{n}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function NameEdit({ id, initial, options, onSave, onCancel, saveLabel = "บันทึก" }) {
  const [v, setV] = useState(initial || "");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <NameInput id={id} value={v} onChange={setV} options={options} placeholder="พิมพ์หรือเลือกชื่อ" autoFocus />
      <div className="row" style={{ justifyContent: "flex-end" }}>
        {onCancel && <button type="button" className="btn soft sm" onClick={onCancel}>ยกเลิก</button>}
        <button type="button" className="btn pri sm" disabled={!v.trim()} onClick={() => onSave(v.trim())}>{saveLabel}</button>
      </div>
    </div>
  );
}

function Msg({ title, text, toast }) {
  return (
    <section className="card msg">
      <div className="row">
        <span className="eyebrow">{title}</span>
        <button type="button" className="btn pri sm" onClick={() => copyText(text, toast)}>คัดลอก</button>
      </div>
      <pre>{text}</pre>
    </section>
  );
}

const WarnIcon = ({ color = "#fff" }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4" /><path d="M12 17.5v.01" />
  </svg>
);
const ClockIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#a2500f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2" /><path d="M9 2h6" />
  </svg>
);

/* ── App ── */
export default function App() {
  const init = useMemo(() => L.currentShift(), []);
  const [date, setDate] = useState(init.date);
  const [shift, setShift] = useState(init.shift);
  const [tab, setTab] = useState(() => { try { return sessionStorage.getItem("dc_tab") || "start"; } catch { return "start"; } });
  useEffect(() => { try { sessionStorage.setItem("dc_tab", tab); } catch { /* ignore */ } }, [tab]);

  const key = `${date}_${shift}`;
  const doc = useValue(`driverCheck/${key}`, {});
  const roster = useValue(`roster/${key}`, {});
  const thRaw = useValue("driverCheckConfig/thresholds", {});
  const th = useMemo(() => ({ ...TH_DEF, ...(thRaw || {}) }), [thRaw]);
  const staffRaw = useValue("staff", {});
  const staff = useMemo(() => {
    const pick = (g) => Object.values((staffRaw || {})[g] || {}).filter((x) => typeof x === "string");
    return { driv: pick("driv"), aemt: pick("aemt") };
  }, [staffRaw]);
  const conn = useValue(".info/connected", false);
  const reasonsCfg = useValue("driverCheckConfig/reasons", null);
  const reasons = useMemo(() => {
    const list = Array.isArray(reasonsCfg) ? reasonsCfg.filter((x) => typeof x === "string" && x.trim()) : [];
    const base = list.length ? list : REASONS;
    return [...base.filter((x) => x !== "อื่นๆ"), "อื่นๆ"];
  }, [reasonsCfg]);

  const [toastMsg, setToastMsg] = useState("");
  const tt = useRef();
  const toast = (m) => { setToastMsg(m); clearTimeout(tt.current); tt.current = setTimeout(() => setToastMsg(""), 2200); };

  const save = (patch) =>
    update(ref(db, `driverCheck/${key}`), { ...patch, date, shift, updatedAt: Date.now() })
      .catch(() => toast("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง"));

  const start = (doc && doc.start) || {};
  const r = roster || {};
  const names = {
    rosterDriver: r.driv || "",
    rosterAemt: r.aemt || "",
    vehicle: r.vehicle || "",
  };
  names.driver = start.driver || names.rosterDriver;
  names.assessor = start.assessor || names.rosterAemt;
  names.current = start.substitute || names.driver;

  const saveStart = (o) => {
    const p = {};
    Object.entries(o).forEach(([k, v]) => { p[`start/${k}`] = v === undefined || v === "" ? null : v; });
    if (!start.time && !("time" in o)) p["start/time"] = hhmm();
    p["start/rosterDriver"] = names.rosterDriver || null;
    p["start/rosterAemt"] = names.rosterAemt || null;
    return save(p);
  };

  const runs = L.sortedRuns(doc && doc.runs);
  const lastRun = runs[runs.length - 1];
  const beforeDot = lastRun && !L.runCleared(lastRun, th) ? "!" : "";
  const startRes = L.evalStart(start, th, shift);
  const startDot = startRes.level === "pending" ? "!" : "";
  const [leaveWarn, setLeaveWarn] = useState(null);
  const goTab = (id) => {
    if (tab === "start" && id !== "start" && startRes.level === "pending") setLeaveWarn(id);
    else setTab(id);
  };
  const afterCount = runs.filter((x) => L.runCleared(x, th) && (num(x.at) == null || (num(x.at) > th.atLimit && !L.reasonReady(x)))).length;

  const loading = doc === undefined;
  const common = { date, shift, th, save, toast, names, staff, runs, reasons };

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <div>
            <b>EMS Driver Check</b>
            <small>เป่าแอลกอฮอล์ · ความพร้อม พขร. · AT</small>
          </div>
          <span className={"conn " + (conn ? "on" : "off")}>{conn ? "ออนไลน์" : "ออฟไลน์ · จะส่งเมื่อมีเน็ต"}</span>
        </div>
        <div className="shiftbar">
          <label className="sr" htmlFor="date">วันที่เวร</label>
          <input id="date" type="date" className="inp" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <div className="seg" role="group" aria-label="เวร">
            {SHIFTS.map((s) => (
              <button key={s} type="button" aria-pressed={s === shift} onClick={() => setShift(s)}>{s}</button>
            ))}
          </div>
        </div>
        {shift === "ดึก" && <div className="sub">เวรดึก 00:15–08:14 นับเป็นของวันก่อนหน้า (เหมือน ems-check)</div>}
        <nav className="tabs" role="tablist">
          {[["start", "ต้นเวร", startDot], ["before", "ก่อนออก", beforeDot], ["after", "หลังออก", afterCount || ""], ["summary", "สรุป", ""]].map(([id, label, dot]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => goTab(id)}>
              {label}{dot !== "" && <span className="dot" aria-label="มีรายการรอดำเนินการ">{dot}</span>}
            </button>
          ))}
        </nav>
      </header>

      <main className="main">
        {tab !== "summary" && loading && <div className="empty">กำลังโหลด…</div>}
        {tab === "start" && !loading && <StartTab {...common} start={start} saveStart={saveStart} />}
        {tab === "before" && !loading && <BeforeTab {...common} dbKey={key} />}
        {tab === "after" && !loading && <AfterTab {...common} />}
        {tab === "summary" && <SummaryTab th={th} toast={toast} date={date} reasons={reasons} />}
      </main>

      {leaveWarn && (
        <MissingDialog items={startRes.items} onBack={() => setLeaveWarn(null)}
          skipLabel="ไปต่อก่อน" onSkip={() => { setTab(leaveWarn); setLeaveWarn(null); }} />
      )}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </div>
  );
}

/* ── ต้นเวร ── */
function StartTab({ date, shift, th, toast, names, staff, start, saveStart, save }) {
  const res = L.evalStart(start, th, shift);
  const fat = res.fat;
  const f = L.vitalFlags(start, th);
  const obs = start.obs || {};
  const act = start.actions || {};
  const [edit, setEdit] = useState(null);
  const failed = res.level === "fail" || res.level === "er";

  const toggle = (k, v) => saveStart({ [k]: start[k] === v ? null : v });
  const [missing, setMissing] = useState(false);
  function confirm() {
    if (res.level === "pending" || res.level === "none") { setMissing(true); return; }
    saveStart({ confirmed: true, confirmedAt: hhmm() });
    toast("ยืนยันผลต้นเวรแล้ว");
  }

  function recheckForSubstitute() {
    if (!start.substitute) return;
    const prevKey = `startPrev/${Date.now()}`;
    save({ [prevKey]: { ...start, driver: names.driver }, start: { driver: start.substitute, time: hhmm(), rosterDriver: names.rosterDriver || null, rosterAemt: names.rosterAemt || null } });
    toast(`เริ่มตรวจต้นเวรของ ${start.substitute}`);
  }

  return (
    <>
      <section className="card roster">
        <div className="row">
          <h2 className="h" style={{ color: "var(--roster)" }}>ผู้ปฏิบัติงานเวรนี้</h2>
          <span className="tag">ดึงจาก ems-check</span>
        </div>
        <div className="kv">
          <span>พขร.</span>
          <b>{names.driver || <span className="missing">ยังไม่ลงชื่อใน ems-check</span>}</b>
          <span>ผู้ตรวจ</span>
          <b>{names.assessor || <span className="missing">ยังไม่ลงชื่อใน ems-check</span>}</b>
          <span>รถ</span>
          <b>{names.vehicle || "-"}</b>
        </div>
        {edit === "driver" && (
          <NameEdit id="ed-driver" initial={names.driver} options={staff.driv} onCancel={() => setEdit(null)}
            onSave={(v) => { saveStart({ driver: v === names.rosterDriver ? null : v }); setEdit(null); }} />
        )}
        {edit === "assessor" && (
          <NameEdit id="ed-assessor" initial={names.assessor} options={staff.aemt} onCancel={() => setEdit(null)}
            onSave={(v) => { saveStart({ assessor: v === names.rosterAemt ? null : v }); setEdit(null); }} />
        )}
        {!edit && (
          <div className="row" style={{ justifyContent: "flex-start", gap: 18 }}>
            <button type="button" className="link" onClick={() => setEdit("driver")}>แก้ชื่อ พขร.</button>
            <button type="button" className="link" onClick={() => setEdit("assessor")}>แก้ชื่อผู้ตรวจ</button>
          </div>
        )}
        <span className="sub">แก้ที่นี่มีผลเฉพาะรายงานนี้ ไม่เปลี่ยนตารางเวรใน ems-check</span>
      </section>

      <section className="card">
        <div className="row">
          <h2 className="h">ผลตรวจต้นเวร</h2>
          <span className="sub">{start.time ? `เวลา ${start.time} น.` : "ลงเวลาให้เมื่อเริ่มกรอก"}</span>
        </div>
        <div className="grid2">
          <label className={"fld" + (f.alc ? " bad" : "")}>แอลกอฮอล์ (mg/dl)
            <Field numeric className="inp big" placeholder="0" value={start.alc} onCommit={(v) => saveStart({ alc: v })} />
          </label>
          <div className={"fld" + (f.bp ? " bad" : "")}>
            <span>BP (mmHg)</span>
            <div className="bp">
              <Field numeric className="inp big" placeholder="SBP" aria-label="SBP" value={start.sbp} onCommit={(v) => saveStart({ sbp: v })} />
              <span>/</span>
              <Field numeric className="inp big" placeholder="DBP" aria-label="DBP" value={start.dbp} onCommit={(v) => saveStart({ dbp: v })} />
            </div>
          </div>
          <label className={"fld" + (f.pr ? " bad" : "")}>PR (/min)
            <Field numeric className="inp big" placeholder="80" value={start.pr} onCommit={(v) => saveStart({ pr: v })} />
          </label>
          <label className="fld">SpO₂ (%) · ไม่บังคับ
            <Field numeric className="inp big" placeholder="-" value={start.spo2} onCommit={(v) => saveStart({ spo2: v })} />
          </label>
        </div>
      </section>

      <section className="card">
        <div className="row">
          <h2 className="h">ประเมินความล้า · 1. การนอน</h2>
          <span className="sub">ถาม พขร.</span>
        </div>
        <div className="grid3">
          <label className={"fld" + (fat.rules[0].fail ? " bad" : "")}>นอน 24 ชม. ที่ผ่านมา (ชม.)
            <Field numeric className="inp big" placeholder="เช่น 6" value={start.sleep24} onCommit={(v) => saveStart({ sleep24: v })} />
          </label>
          <label className={"fld" + (fat.rules[1].fail ? " bad" : "")}>นอน 48 ชม. ที่ผ่านมา (ชม.)
            <Field numeric className="inp big" placeholder="เช่น 13" value={start.sleep48} onCommit={(v) => saveStart({ sleep48: v })} />
          </label>
          <label className={"fld wide" + (fat.rules[2].fail ? " bad" : "")}>ตื่นนอนล่าสุด (เวลา)
            <Field className="inp big" type="time" value={start.wake} onCommit={(v) => saveStart({ wake: v })} />
          </label>
        </div>
        <div className="rules">
          {fat.rules.map((r) => (
            <div key={r.id}>
              <span>{r.label}</span>
              <b className={r.fail == null ? "" : r.fail ? "t-bad" : "t-ok"}>
                {r.fail == null ? "-" : `${r.fail ? "ไม่ผ่าน" : "ผ่าน"} (${fmt(r.value)}${r.id === "awake" ? ` / ${fmt(num(start.sleep48))}` : ""})`}
              </b>
            </div>
          ))}
        </div>
        <span className="sub">ชั่วโมงที่ตื่นคำนวณถึงเวลาจบเวร{shift} ({{ "เช้า": "16:15", "บ่าย": "00:15", "ดึก": "08:15" }[shift]})</span>
      </section>

      <section className="card">
        <div className="row">
          <h2 className="h">2. ตอนนี้ง่วงแค่ไหน (KSS)</h2>
          <span className="sub">ให้ พขร. เลือกเอง</span>
        </div>
        <KssPicker value={num(start.kss)} th={th} onPick={(v) => saveStart({ kss: v })} />
      </section>

      <section className="card">
        <div className="row">
          <h2 className="h">3. ผู้ตรวจสังเกต / ถาม</h2>
          <span className="sub">ติ๊กถ้าพบ</span>
        </div>
        <div className="checks">
          {OBS.map(([k, t]) => (
            <label key={k}><input type="checkbox" checked={!!obs[k]} onChange={(e) => saveStart({ [`obs/${k}`]: e.target.checked || null })} />{t}</label>
          ))}
        </div>
        <FatigueBadge fat={fat} />
        <div className="row" style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
          <b style={{ fontSize: 14 }}>ความเห็นผู้ตรวจ</b>
          <div className="seg fit" role="group" aria-label="ความเห็นผู้ตรวจ">
            <button type="button" data-v="fit" aria-pressed={start.fit === "fit"} onClick={() => toggle("fit", "fit")}>เหมาะสม</button>
            <button type="button" data-v="unfit" aria-pressed={start.fit === "unfit"} onClick={() => toggle("fit", "unfit")}>ไม่เหมาะสม</button>
          </div>
        </div>
      </section>

      <section className="card">
        <label className="fld">หมายเหตุ
          <Field placeholder="ถ้ามี" value={start.note} onCommit={(v) => saveStart({ note: v })} />
        </label>
      </section>

      <Verdict res={res} />

      {failed && (
        <section className="card bad">
          <h2 className="h" style={{ color: "var(--bad)" }}>สิ่งที่ต้องทำ</h2>
          <div className="checks">
            <label><input type="checkbox" checked={!!act.po} onChange={(e) => saveStart({ "actions/po": e.target.checked || null })} />รายงาน พอป. ประจำเวรแล้ว</label>
            <label><input type="checkbox" checked={!!act.admin} onChange={(e) => saveStart({ "actions/admin": e.target.checked || null })} />แจ้งกลุ่มงานบริหารทั่วไป ให้เปลี่ยน พขร. แล้ว</label>
            {res.level === "er" && (
              <label><input type="checkbox" checked={!!act.er} onChange={(e) => saveStart({ "actions/er": e.target.checked || null })} />เปิดบัตรและนำเข้าตรวจที่ ER แล้ว</label>
            )}
          </div>
          <div className="fld" style={{ color: "var(--ink)" }}>
            <b style={{ fontSize: 14 }}>พขร. ที่มาแทน</b>
            {start.substitute && edit !== "sub" ? (
              <div className="row">
                <b>{start.substitute}</b>
                <button type="button" className="link" onClick={() => setEdit("sub")}>เปลี่ยน</button>
              </div>
            ) : (
              <NameEdit id="ed-sub" initial={start.substitute} options={staff.driv} onCancel={start.substitute ? () => setEdit(null) : null}
                onSave={(v) => { saveStart({ substitute: v }); setEdit(null); }} />
            )}
          </div>
          {start.substitute && (
            <button type="button" className="btn pri" onClick={recheckForSubstitute}>ตรวจต้นเวรของ {start.substitute}</button>
          )}
          <span className="sub">ผลรอบนี้เก็บไว้และนับในสรุปเดือน แม้จะเริ่มตรวจคนที่มาแทน</span>
        </section>
      )}

      {failed ? (
        <Msg title="ข้อความไลน์ · รายงานต้นเวรไม่ผ่าน" text={L.msgStart(date, shift, start, res, { driver: names.driver, assessor: names.assessor })} toast={toast} />
      ) : (res.level === "ok" || res.level === "caution") && start.confirmed ? (
        <div className="empty" style={{ borderStyle: "solid", color: "var(--ok)" }}>ยืนยันผลแล้ว{start.confirmedAt ? ` ${start.confirmedAt} น.` : ""} · ผ่านเกณฑ์ ไม่ต้องรายงานในไลน์</div>
      ) : (
        <button type="button" className="btn pri" onClick={confirm}>ยืนยันผลตรวจต้นเวร</button>
      )}
      {missing && <MissingDialog items={res.items} onBack={() => setMissing(false)} />}
    </>
  );
}

const FAT_TEXT = {
  green: ["v-ok", "ความล้า: เขียว", "ขับได้"],
  yellow: ["v-fail", "ความล้า: เหลือง", "ขับได้ แต่ต้องมีมาตรการ"],
  red: ["v-er", "ความล้า: แดง", "ไม่ควรขับ · เปลี่ยน พขร."],
};
function FatigueBadge({ fat }) {
  const t = FAT_TEXT[fat.level];
  if (!t) return null;
  return (
    <div className={"verdict " + t[0]} style={{ padding: "10px 14px" }}>
      <strong style={{ fontSize: 16 }}>{t[1]} · {t[2]}</strong>
      {fat.reasons.length > 0 && <span style={{ fontSize: 13 }}>{fat.reasons.join(" · ")}</span>}
    </div>
  );
}

const CAUTION_STEPS = ["แจ้งทีมที่ออกด้วยกันให้ช่วยสังเกต", "ถามคะแนน KSS ซ้ำก่อนออก EMS ทุกครั้ง", "ช่วงว่างให้พักหรืองีบสั้นได้"];

function MissingDialog({ items, onBack, onSkip, skipLabel }) {
  const list = items && items.length ? items : ["แอลกอฮอล์", "BP", "PR", "ชั่วโมงนอน", "KSS", "ความเห็นผู้ตรวจ"];
  return (
    <div className="overlay" onKeyDown={(e) => { if (e.key === "Escape") onBack(); }}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="miss-h">
        <div className="head" style={{ background: "var(--warn-solid)" }}>
          <div className="row" style={{ justifyContent: "flex-start", gap: 10 }}>
            <WarnIcon /><b id="miss-h">ต้นเวรยังกรอกไม่ครบ</b>
          </div>
          <span>กรอกให้ครบก่อน ระบบจึงจะประเมินได้ว่า พขร. พร้อมขับหรือไม่</span>
        </div>
        <div className="body">
          <b style={{ fontSize: 15 }}>ยังขาด</b>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 15, lineHeight: 1.8 }}>{list.map((i) => <li key={i}>{i}</li>)}</ul>
        </div>
        <div className="foot">
          {onSkip && <button type="button" className="btn soft" onClick={onSkip}>{skipLabel}</button>}
          <button type="button" className="btn pri" autoFocus onClick={onBack}>กลับไปกรอก</button>
        </div>
      </div>
    </div>
  );
}

function Verdict({ res }) {
  const list = res.items.length ? <ul>{res.items.map((i) => <li key={i}>{i}</li>)}</ul> : null;
  if (res.level === "none") return <div className="verdict v-none"><strong>ยังไม่ได้กรอกผล</strong><span>กรอกแอลกอฮอล์ สัญญาณชีพ และแบบประเมินความล้า แล้วผลจะขึ้นที่นี่</span></div>;
  if (res.level === "pending") return <div className="verdict v-fail"><strong>ยังกรอกไม่ครบ</strong><span>ยังขาด: {res.items.join(", ")}</span></div>;
  if (res.level === "caution") return (
    <div className="verdict v-fail" role="status">
      <strong>ปฏิบัติงานได้ · ต้องมีมาตรการลดความล้า</strong>
      <span>{res.items.join(", ")}</span>
      <ul style={{ color: "var(--ink)" }}>{CAUTION_STEPS.map((s) => <li key={s}>{s}</li>)}</ul>
    </div>
  );
  if (res.level === "ok") return <div className="verdict v-ok" role="status"><strong>พร้อมปฏิบัติงาน</strong><span>แอลกอฮอล์และสัญญาณชีพอยู่ในเกณฑ์ ผู้ตรวจเห็นว่าเหมาะสม</span></div>;
  if (res.level === "fail") return <div className="verdict v-fail" role="alert"><strong>ไม่ผ่าน · ให้เปลี่ยน พขร.</strong><span>รายงาน พอป. ประจำเวร และแจ้งกลุ่มงานบริหารทั่วไป</span>{list}</div>;
  return <div className="verdict v-er" role="alert"><strong>ไม่ผ่าน · พิจารณาเปิดบัตรตรวจ ER</strong><span>เปลี่ยน พขร. รายงาน พอป. แจ้งฝ่ายบริหาร และนำเข้าตรวจที่ ER</span>{list}</div>;
}

/* ── ก่อนออก: เป่าแอลกอฮอล์ ── */
function BeforeTab({ date, shift, th, save, toast, names, staff, runs, dbKey }) {
  const last = runs[runs.length - 1];
  const pending = !!(last && L.lastBlow(last) && !L.runCleared(last, th));
  const nextN = pending ? last.n : runs.length ? Math.max(...runs.map((x) => x.n || 0)) + 1 : 1;
  const [alc, setAlc] = useState("");
  const [kss, setKss] = useState(null);
  const [kssWarn, setKssWarn] = useState(null);
  const [who, setWho] = useState(null);
  const [editWho, setEditWho] = useState(false);
  const [alertId, setAlertId] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const driver = who ?? names.current;
  const alertRun = runs.find((x) => x.id === alertId);

  function record() {
    const v = num(alc);
    if (v == null) { toast("กรอกค่าแอลกอฮอล์ก่อน"); return; }
    const blow = { time: hhmm(), alc: v, driver: driver || "", ...(kss != null ? { kss } : {}) };
    let id;
    if (pending) {
      id = last.id;
      save({ [`runs/${id}/blows`]: [...L.blowsOf(last), blow] });
    } else {
      id = push(ref(db, `driverCheck/${dbKey}/runs`)).key;
      save({ [`runs/${id}`]: { n: nextN, time: blow.time, blows: [blow] } });
    }
    setAlc("");
    setWho(null);
    setKss(null);
    setKssWarn(kss != null && kss >= th.kssWarn ? { n: nextN, kss, stop: kss >= th.kssStop, driver } : null);
    if (v > th.alcMax) setAlertId(id);
    else toast(`บันทึกครั้งที่ ${nextN} แล้ว · ผ่าน`);
  }

  function del(run) {
    const p = { [`runs/${run.id}`]: null };
    runs.filter((x) => (x.n || 0) > (run.n || 0)).forEach((x) => { p[`runs/${x.id}/n`] = (x.n || 0) - 1; });
    save(p);
    setConfirmDel(null);
    toast(`ลบครั้งที่ ${run.n} แล้ว`);
  }

  const lb = pending ? L.lastBlow(last) : null;

  return (
    <>
      <section className={"card " + (pending ? "bad" : "focus")}>
        <h2 className="h">{pending ? `เป่าซ้ำ ครั้งที่ ${nextN}` : `เป่าก่อนออก ครั้งที่ ${nextN}`}</h2>
        {pending && <span className="sub" style={{ color: "var(--bad)" }}>รอบก่อนพบ {lb.alc} mg/dl ({lb.driver || "-"}) · ยังไม่ผ่าน ห้ามออก</span>}
        <div className="row" style={{ justifyContent: "flex-start" }}>
          <span className="sub">พขร. <b style={{ color: "var(--ink)" }}>{driver || "ยังไม่มีชื่อ"}</b></span>
          {!editWho && <button type="button" className="link" onClick={() => setEditWho(true)}>เปลี่ยน</button>}
        </div>
        {editWho && (
          <NameEdit id="ed-who" initial={driver} options={staff.driv} saveLabel="ใช้ชื่อนี้" onCancel={() => setEditWho(false)}
            onSave={(v) => { setWho(v); setEditWho(false); }} />
        )}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <label className="fld" style={{ flex: "1 1 auto" }}>แอลกอฮอล์ (mg/dl)
            <input className="inp big" inputMode="decimal" placeholder="0" value={alc} autoComplete="off"
              onChange={(e) => setAlc(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") record(); }} />
          </label>
          <button type="button" className="btn pri" style={{ height: 50 }} onClick={record}>บันทึก</button>
        </div>
        <div className="fld">
          <span>KSS ตอนนี้ (ไม่บังคับ แนะนำเวรดึก หรือคนที่ต้นเวรได้สีเหลือง)</span>
          <KssPicker compact value={kss} th={th} onPick={setKss} />
        </div>
        <span className="sub">ลงเวลาให้อัตโนมัติ · ถ้าแอลกอฮอล์มากกว่า {th.alcMax} mg/dl ระบบจะเตือนทันที</span>
      </section>

      {kssWarn && (
        <div className={"verdict " + (kssWarn.stop ? "v-er" : "v-fail")} role="alert">
          <strong>ครั้งที่ {kssWarn.n}: KSS {kssWarn.kss} · {kssWarn.stop ? "ง่วงมาก ควรเปลี่ยน พขร." : "เริ่มง่วง ให้ทีมช่วยสังเกต"}</strong>
          <span>{kssWarn.driver || ""}{kssWarn.stop ? " · แจ้ง พอป. ประจำเวร" : ""}</span>
          <button type="button" className="link" style={{ alignSelf: "flex-start" }} onClick={() => setKssWarn(null)}>รับทราบ</button>
        </div>
      )}

      <div className="row">
        <h2 className="h">เป่าแล้วในเวรนี้</h2>
        <span className="pill p-mute">{runs.length} ครั้ง</span>
      </div>
      {runs.length ? (
        <section className="card list">
          {runs.map((x) => {
            const b = L.blowsOf(x);
            const l = L.lastBlow(x) || {};
            const ok = L.runCleared(x, th);
            return (
              <div className="runrow" key={x.id}>
                <b>ครั้งที่ {x.n}</b>
                <span className="sub num">{l.time || x.time}</span>
                <b className="num">{l.alc ?? "-"} mg/dl</b>
                <span className={"pill " + (ok ? "p-ok" : "p-bad")}>{ok ? (b.length > 1 ? "ผ่าน (เป่าซ้ำ)" : "ผ่าน") : "ไม่ผ่าน"}</span>
                <span className="who">
                  {l.driver || "-"}
                  {l.kss != null ? ` · KSS ${l.kss}` : ""}
                  {b.length > 1 ? ` · รอบก่อน ${b.slice(0, -1).map((y) => `${y.alc}`).join(", ")} mg/dl` : ""}
                  {" · "}
                  {confirmDel === x.id ? (
                    <>
                      ลบครั้งที่ {x.n}?{" "}
                      <button type="button" className="link" onClick={() => setConfirmDel(null)}>ยกเลิก</button>{" "}
                      <button type="button" className="link" style={{ color: "var(--bad)" }} onClick={() => del(x)}>ลบ</button>
                    </>
                  ) : (
                    <button type="button" className="link" style={{ color: "var(--muted)" }} onClick={() => setConfirmDel(x.id)}>ลบ</button>
                  )}
                </span>
              </div>
            );
          })}
        </section>
      ) : (
        <div className="empty">ยังไม่มีการเป่าก่อนออกในเวร{shift}นี้</div>
      )}

      <Msg title="ข้อความไลน์ · ส่งก่อนออก" text={L.msgAlc(date, shift, runs, th)} toast={toast} />
      <span className="sub" style={{ textAlign: "center" }}>กลับจากออก EMS แล้ว กรอก AT ได้ที่แท็บ “หลังออก”</span>

      {alertRun && (
        <AlcAlert run={alertRun} save={save} staff={staff} onClose={() => setAlertId(null)}
          onReplace={(name) => { save({ "start/substitute": name }); setAlertId(null); toast(`เปลี่ยนเป็น ${name} แล้ว ให้เป่าซ้ำได้เลย`); }} />
      )}
    </>
  );
}

function AlcAlert({ run, save, staff, onClose, onReplace }) {
  const lb = L.lastBlow(run) || {};
  const a = run.actions || {};
  const [sub, setSub] = useState("");
  return (
    <div className="overlay" onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="alc-h">
        <div className="head">
          <div className="row" style={{ justifyContent: "flex-start", gap: 10 }}>
            <WarnIcon /><b id="alc-h">ตรวจพบแอลกอฮอล์</b>
          </div>
          <span>ครั้งที่ {run.n} · {lb.time} น. · <b style={{ fontSize: 18 }}>{lb.alc} mg/dl</b></span>
        </div>
        <div className="body">
          <b style={{ color: "var(--bad)", fontSize: 16 }}>ห้าม {lb.driver || "พขร. คนนี้"} ออกปฏิบัติการ</b>
          <div className="checks">
            <label><input type="checkbox" checked={!!a.po} onChange={(e) => save({ [`runs/${run.id}/actions/po`]: e.target.checked || null })} />รายงาน พอป. ประจำเวรแล้ว</label>
            <label><input type="checkbox" checked={!!a.admin} onChange={(e) => save({ [`runs/${run.id}/actions/admin`]: e.target.checked || null })} />แจ้งกลุ่มงานบริหารทั่วไป ให้เปลี่ยน พขร. แล้ว</label>
          </div>
          <div className="fld">พขร. ที่มาแทน
            <NameInput id="alc-sub" value={sub} onChange={setSub} options={staff.driv} placeholder="เลือกจากรายชื่อ พขร." />
          </div>
          <span className="sub">ค่านี้บันทึกไว้แล้ว และจะนับในสรุปเดือน</span>
        </div>
        <div className="foot">
          <button type="button" className="btn soft" onClick={onClose}>เป่าซ้ำคนเดิม</button>
          <button type="button" className="btn danger" disabled={!sub.trim()} onClick={() => onReplace(sub.trim())}>ให้คนใหม่เป่า</button>
        </div>
      </div>
    </div>
  );
}

/* ── หลังออก: AT ── */
function AfterTab({ date, shift, th, save, toast, runs, reasons }) {
  const [sheetId, setSheetId] = useState(null);
  const departed = runs.filter((x) => L.runCleared(x, th));
  const blocked = runs.filter((x) => !L.runCleared(x, th));
  const sheetRun = runs.find((x) => x.id === sheetId);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <h2 className="h">Activation time (สั่งการ → ออกจากฐาน)</h2>
        <span className="sub">รายการมาจากการเป่าก่อนออกให้อัตโนมัติ · ดู AT จากสถิติแล้วกรอก</span>
      </div>

      {!runs.length && <div className="empty">ยังไม่มีการออก EMS ในเวรนี้<br />เป่าก่อนออกที่แท็บ “ก่อนออก” แล้วรายการจะขึ้นที่นี่</div>}

      {departed.map((x) => {
        const at = num(x.at);
        const late = at != null && at > th.atLimit;
        const lb = L.lastBlow(x) || {};
        const cls = at == null ? "dash" : late ? (L.reasonReady(x) ? "warn" : "bad") : "";
        const picked = L.reasonsOf(x);
        return (
          <section className={"card " + cls} key={x.id}>
            <div className="row">
              <h2 className="h">ครั้งที่ {x.n} · ออก {lb.time || x.time}</h2>
              {at == null ? <span className="pill p-mute">รอกรอก AT</span>
                : late ? <span className="pill p-warn">เกิน {th.atLimit} นาที</span>
                : <span className="pill p-ok">ไม่เกิน {th.atLimit} นาที</span>}
            </div>
            <label className={"fld" + (late ? " warn" : "")}>AT (นาที)
              <Field numeric className="inp big" placeholder="ดูจากสถิติแล้วกรอก" value={x.at}
                onCommit={(v) => save({ [`runs/${x.id}/at`]: v })}
                onFinal={(v) => { const n = num(v); if (n != null && n > th.atLimit && !L.reasonReady(x)) setSheetId(x.id); }} />
            </label>
            {late && (
              <>
                <div className="fld warn">
                  <span>เหตุผล (ต้องระบุ · เลือกได้หลายข้อ)</span>
                  <ReasonChips reasons={reasons} value={picked}
                    onChange={(list) => save({ [`runs/${x.id}/reasons`]: list.length ? list : null, [`runs/${x.id}/reason`]: null })} />
                </div>
                <label className="fld">{picked.includes("อื่นๆ") ? "ระบุเหตุผลอื่นๆ" : "รายละเอียดเพิ่ม (ไม่บังคับ)"}
                  <Field placeholder="เช่น ศูนย์ยืนยันพิกัดนาน" value={x.reasonNote} onCommit={(v) => save({ [`runs/${x.id}/reasonNote`]: v || null })} />
                </label>
              </>
            )}
          </section>
        );
      })}

      {blocked.length > 0 && (
        <div className="empty">ครั้งที่ {blocked.map((x) => x.n).join(", ")} ยังไม่ผ่านแอลกอฮอล์ จึงยังไม่มี AT</div>
      )}

      <Msg title="ข้อความไลน์ · ส่งหลังออก" text={L.msgAt(date, shift, runs, th)} toast={toast} />

      {sheetRun && <ATSheet run={sheetRun} th={th} save={save} toast={toast} reasons={reasons} onClose={() => setSheetId(null)} />}
    </>
  );
}

function ATSheet({ run, th, save, toast, onClose, reasons }) {
  const [picked, setPicked] = useState(L.reasonsOf(run));
  const [note, setNote] = useState(run.reasonNote || "");
  const lb = L.lastBlow(run) || {};
  const ready = L.reasonReady({ reasons: picked, reasonNote: note });
  return (
    <div className="overlay bottom" onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <div className="sheet" role="alertdialog" aria-modal="true" aria-labelledby="at-h">
        <div className="grab" />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="ic"><ClockIcon /></div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <b id="at-h" style={{ fontSize: 19 }}>AT {fmt(num(run.at))} นาที เกินเกณฑ์ {th.atLimit} นาที</b>
            <span className="sub">ครั้งที่ {run.n} · ออก {lb.time || run.time} น. · ต้องระบุเหตุผล</span>
          </div>
        </div>
        <b style={{ fontSize: 14 }}>เหตุผล (เลือกได้หลายข้อ)</b>
        <ReasonChips reasons={reasons} value={picked} onChange={setPicked} />
        <label className="fld">{picked.includes("อื่นๆ") ? "ระบุเหตุผลอื่นๆ" : "รายละเอียดเพิ่ม (ไม่บังคับ)"}
          <input className="inp" value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ศูนย์ยืนยันพิกัดนาน" autoComplete="off" />
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn soft" style={{ flex: 1 }} onClick={onClose}>แก้ตัวเลข AT</button>
          <button type="button" className="btn pri" style={{ flex: 1.4 }} disabled={!ready}
            onClick={() => { save({ [`runs/${run.id}/reasons`]: picked, [`runs/${run.id}/reason`]: null, [`runs/${run.id}/reasonNote`]: note.trim() || null }); toast("บันทึกเหตุผลแล้ว"); onClose(); }}>
            บันทึกเหตุผล
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── สรุปเดือน ── */
function SummaryTab(props) {
  const [unlocked, unlock, lock] = useSession("dc_unlock");
  if (!unlocked) return <PinGate onUnlock={unlock} toast={props.toast} />;
  return <SummaryBody {...props} lock={lock} />;
}

function SummaryBody({ th, toast, date, reasons, lock }) {
  const [ym, setYm] = useState(date.slice(0, 7));
  const [data, setData] = useState(null);
  useEffect(() => {
    setData(null);
    const q = query(ref(db, "driverCheck"), orderByKey(), startAt(ym), endAt(ym + ""));
    return onValue(q, (s) => {
      const v = s.val() || {};
      const list = Object.entries(v).map(([k, d]) => ({ ...d, date: d.date || k.slice(0, 10), shift: d.shift || k.slice(11) }));
      list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : SHIFTS.indexOf(a.shift) - SHIFTS.indexOf(b.shift)));
      setData(list);
    }, () => setData([]));
  }, [ym]);

  const st = useMemo(() => (data ? L.summarize(data, th) : null), [data, th]);
  const [y, m] = ym.split("-").map(Number);

  function downloadCSV() {
    const blob = new Blob([L.toCSV(data, th)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DriverCheck_${MONTHS[m - 1]}_${y + 543}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const maxB = st ? Math.max(1, ...st.buckets.map((b) => b.n)) : 1;
  const reasonRows = st ? Object.entries(st.reasons).sort((a, b) => b[1] - a[1]) : [];

  return (
    <>
      <div className="row">
        <h2 className="h" style={{ fontSize: 18 }}>{MONTHS[m - 1]} {y + 543}</h2>
        <label className="sr" htmlFor="month">เดือน</label>
        <input id="month" type="month" className="inp" style={{ width: "auto" }} value={ym} onChange={(e) => e.target.value && setYm(e.target.value)} />
      </div>

      {!st && <div className="empty">กำลังโหลด…</div>}
      {st && !data.length && <div className="empty">ยังไม่มีข้อมูลเดือนนี้</div>}
      {st && data.length > 0 && (
        <>
          <div className="stats">
            <div className="stat"><span className="k">ตรวจต้นเวร</span><span className="v">{st.starts}</span><span className="s">ไม่ผ่าน {st.startFail} · ส่ง ER {st.startEr} · ล้าเหลือง {st.fatYellow} แดง {st.fatRed}</span></div>
            <div className="stat"><span className="k">เป่าก่อนออก</span><span className="v">{st.runs}</span><span className="s">พบแอลกอฮอล์ {st.alcPos} ครั้ง</span></div>
            <div className="stat"><span className="k">AT ≤ {th.atLimit} นาที</span><span className="v" style={{ color: "var(--ok)" }}>{st.atN ? Math.round((st.within / st.atN) * 100) + "%" : "-"}</span><span className="s">{st.within}/{st.atN} ครั้งที่กรอก AT</span></div>
            <div className="stat"><span className="k">AT เฉลี่ย / มัธยฐาน</span><span className="v">{fmt(st.mean)} / {fmt(st.median)}</span><span className="s">นาที · สูงสุด {fmt(st.max)}</span></div>
            <div className="stat"><span className="k">ยังไม่กรอก AT</span><span className="v" style={{ color: st.pendingAt ? "var(--warn)" : "inherit" }}>{st.pendingAt}</span><span className="s">ครั้งที่ออกแล้ว</span></div>
            <div className="stat"><span className="k">AT เกินไม่มีเหตุผล</span><span className="v" style={{ color: st.noReason ? "var(--bad)" : "inherit" }}>{st.noReason}</span><span className="s">ต้องตามเติม</span></div>
          </div>

          <section className="card">
            <h2 className="h">การกระจายของ AT</h2>
            <div className="bars">
              {st.buckets.map((b) => (
                <div key={b.label} style={{ display: "contents" }}>
                  <span>{b.label}</span>
                  <div className="track"><div className={"fill " + b.tone} style={{ width: `${(b.n / maxB) * 100}%` }} /></div>
                  <span className="num" style={{ textAlign: "right" }}>{b.n}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h2 className="h">แยกตามเวร</h2>
            <div className="tbl">
              <table>
                <thead><tr><th>เวร</th><th className="r">ออก</th><th className="r">AT เฉลี่ย</th><th className="r">เกิน {th.atLimit}</th></tr></thead>
                <tbody>
                  {SHIFTS.map((s) => { const x = st.byShift[s]; return (
                    <tr key={s}><td>{s}</td><td className="r">{x.runs}</td><td className="r">{x.atN ? fmt(x.sum / x.atN) : "-"}</td><td className="r">{x.late}</td></tr>
                  ); })}
                </tbody>
              </table>
            </div>
          </section>

          {reasonRows.length > 0 && (
            <section className="card">
              <h2 className="h">เหตุผลที่ AT เกิน {th.atLimit} นาที</h2>
              <div className="tbl"><table><tbody>
                {reasonRows.map(([k, n]) => <tr key={k}><td className="wrap">{k}</td><td className="r">{n}</td></tr>)}
              </tbody></table></div>
              {st.lateList.length > 0 && (
                <details>
                  <summary>รายการทั้งหมด ({st.lateList.length})</summary>
                  <div className="tbl"><table>
                    <thead><tr><th>วันที่</th><th>เวร</th><th className="r">ครั้งที่</th><th className="r">AT</th><th>เหตุผล</th></tr></thead>
                    <tbody>{st.lateList.map((x, i) => (
                      <tr key={i}><td>{L.thaiDate(x.date)}</td><td>{x.shift}</td><td className="r">{x.n}</td><td className="r">{fmt(x.at)}</td>
                        <td className="wrap">{x.reason || <span className="missing">ยังไม่ระบุ</span>}</td></tr>
                    ))}</tbody>
                  </table></div>
                </details>
              )}
            </section>
          )}

          <Msg title="ข้อความสรุปสำหรับไลน์ / ผู้บริหาร" text={L.msgMonth(st, ym, th)} toast={toast} />
          <button type="button" className="btn soft" onClick={downloadCSV}>ดาวน์โหลดไฟล์ Excel (CSV)</button>
        </>
      )}

      <Settings th={th} toast={toast} reasons={reasons} />
      <button type="button" className="btn soft" onClick={lock}>ล็อกหน้าสรุป</button>
    </>
  );
}

function PinGate({ onUnlock, toast }) {
  const pinHash = useValue("driverCheckConfig/pinHash", null);
  const adminPin = useValue("config/summaryPin", null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  async function tryPin() {
    if (!pin) return;
    setBusy(true);
    const ok = (pinHash && (await L.hashPin(pin)) === pinHash) || pin === String(adminPin || "1234");
    setBusy(false);
    setPin("");
    if (ok) onUnlock();
    else toast("PIN ไม่ถูกต้อง");
  }
  return (
    <section className="card" style={{ alignItems: "center", textAlign: "center", padding: "28px 18px" }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4a86e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      <h2 className="h">หน้าสรุปต้องใช้ PIN</h2>
      <span className="sub">
        {pinHash === undefined ? "กำลังโหลด…" : pinHash ? "ใส่ PIN ของแอปนี้ หรือ PIN แอดมิน ems-check" : "ยังไม่ได้ตั้ง PIN ของแอปนี้ · เข้าครั้งแรกด้วย PIN แอดมิน ems-check แล้วตั้ง PIN ใหม่ในหน้าตั้งค่า"}
      </span>
      <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 320 }}>
        <label className="sr" htmlFor="pin">PIN</label>
        <input id="pin" className="inp big" type="password" inputMode="numeric" autoComplete="off" value={pin} style={{ textAlign: "center", letterSpacing: "0.3em" }}
          onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") tryPin(); }} />
        <button type="button" className="btn pri" disabled={busy || !pin} onClick={tryPin}>เข้า</button>
      </div>
    </section>
  );
}

function Settings({ th, toast, reasons }) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [rText, setRText] = useState(reasons.filter((x) => x !== "อื่นๆ").join("\n"));
  async function savePin() {
    if (!/^\d{4,8}$/.test(p1)) { toast("PIN ต้องเป็นตัวเลข 4–8 หลัก"); return; }
    if (p1 !== p2) { toast("PIN สองช่องไม่ตรงกัน"); return; }
    await set(ref(db, "driverCheckConfig/pinHash"), await L.hashPin(p1));
    setP1(""); setP2("");
    toast("ตั้ง PIN ใหม่แล้ว");
  }
  function saveReasons() {
    const list = [...new Set(rText.split("\n").map((x) => x.trim()).filter((x) => x && x !== "อื่นๆ"))];
    if (!list.length) { toast("ต้องมีเหตุผลอย่างน้อย 1 ข้อ"); return; }
    set(ref(db, "driverCheckConfig/reasons"), [...list, "อื่นๆ"]).then(() => toast("บันทึกรายการเหตุผลแล้ว"));
  }
  return (
    <details className="card">
      <summary>ตั้งค่า (PIN · เหตุผล AT · เกณฑ์)</summary>
      <div className="stack">

      <h3 className="h" style={{ fontSize: 15 }}>เปลี่ยน PIN ของหน้าสรุป</h3>
      <div className="grid2">
        <label className="fld">PIN ใหม่ (ตัวเลข 4–8 หลัก)
          <input className="inp" type="password" inputMode="numeric" autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} />
        </label>
        <label className="fld">ใส่ซ้ำอีกครั้ง
          <input className="inp" type="password" inputMode="numeric" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} />
        </label>
      </div>
      <button type="button" className="btn pri" onClick={savePin} disabled={!p1 || !p2}>บันทึก PIN</button>
      <span className="sub">PIN แอดมิน ems-check ยังเข้าได้เสมอ เผื่อลืม PIN นี้</span>

      <h3 className="h" style={{ fontSize: 15, marginTop: 8 }}>รายการเหตุผลที่ AT ช้า</h3>
      <label className="fld">หนึ่งบรรทัดต่อหนึ่งเหตุผล (“อื่นๆ” จะต่อท้ายให้เอง)
        <textarea className="inp" rows={8} value={rText} onChange={(e) => setRText(e.target.value)} style={{ fontSize: 15, resize: "vertical" }} />
      </label>
      <button type="button" className="btn pri" onClick={saveReasons}>บันทึกรายการเหตุผล</button>

      <h3 className="h" style={{ fontSize: 15, marginTop: 8 }}>เกณฑ์</h3>
      <span className="sub">ค่าตั้งต้นเป็นค่าตัวอย่าง ปรับให้ตรงแนวปฏิบัติของหน่วยงาน การแก้มีผลกับทุกเครื่อง</span>
      <div className="grid2">
        {Object.keys(TH_DEF).map((k) => (
          <label className="fld" key={k}>{TH_LABEL[k]}
            <Field numeric value={th[k]} onCommit={(v) => set(ref(db, `driverCheckConfig/thresholds/${k}`), v ?? TH_DEF[k]).then(() => toast("บันทึกเกณฑ์แล้ว"))} />
          </label>
        ))}
      </div>
      </div>
    </details>
  );
}
