-**
 * EMS Equipment Check — Firebase + PIN Protection
 * รพ.มหาราช นครศรีธรรมราช
 *
 * ติดตั้ง: npm install firebase
 * แก้ไข firebaseConfig ด้านล่าง
 *-

import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase-app";
import { getDatabase, ref, set, onValue } from "firebase-database";

-* ─── Firebase Config ─── *-
const firebaseConfig = {
  apiKey:            "AIzaSyCW_xpZq3nVeL86NUX5S8W1hbMSzdS4kpk",
  authDomain:        "ems-equipment-mnst.firebaseapp.com",
  databaseURL:       "https://ems-equipment-mnst-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "ems-equipment-mnst",
  storageBucket:     "ems-equipment-mnst.appspot.com",
  messagingSenderId: "917321944070",
  appId:             "1:917321944070:web:e5b06fe6554d35aba68787",
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

-* ─── Constants ─── *-
const ROLES = [
  { id:"para", label:"Paramedic - ENP - RN", short:"Para-RN", icon:"🩺", color:"#ef4444" },
  { id:"aemt", label:"AEMT",                  short:"AEMT",    icon:"🚑", color:"#3b82f6" },
  { id:"driv", label:"พขร.",                  short:"พขร.",    icon:"🚗", color:"#10b981" },
];
const ROLE_MAP = Object.fromEntries(ROLES.map(r => [r.id, r]));

const SHIFTS = ["เช้า","บ่าย","ดึก"];
const SHIFT_META = {
  "เช้า": { accent:"#F59E0B", icon:"🌅" },
  "บ่าย": { accent:"#3B82F6", icon:"🌤" },
  "ดึก":  { accent:"#7C3AED", icon:"🌙" },
};

const DEFAULT_EQUIPMENT = {
  para: ["Defibrillator - AED","Oxygen Tank & Mask","BVM Bag-Valve-Mask","Suction Unit","Medications Box","BP Monitor - SpO2"],
  aemt: ["Stretcher - Spine Board","Cervical Collar","Trauma Kit - Bandage","IV Set & Cannula"],
  driv: ["รถ EMS พร้อมใช้งาน","น้ำมันเพียงพอ","ไฟฉุกเฉิน - Siren","วิทยุสื่อสาร","อุปกรณ์นำทาง GPS"],
};

const DEFAULT_PIN = "1234"; -- PIN เริ่มต้น — หัวหน้าเปลี่ยนได้ในแอป
const PIN_SESSION_KEY = "ems_pin_unlocked"; -- เก็บสถานะ unlock ใน session

const MONTH_NAMES = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const KEY_ROLE = "ems_my_role";

-* ─── Helpers ─── *-
function ls(key, fb) { try { const v=localStorage.getItem(key); return v?JSON.parse(v):fb; } catch { return fb; } }
function ss(key, v)  { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }
function getDays(y,m){ return new Date(y,m+1,0).getDate(); }
function recKey(y,m,d,shift,roleId){
  return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}_${shift}_${roleId}`;
}
function todayParts(){ const t=new Date(); return {year:t.getFullYear(),month:t.getMonth(),day:t.getDate()}; }

-* ─── Shared styles ─── *-
const BASE_INP = {
  background:"rgba(255,255,255,0.07)", border:"1.5px solid rgba(255,255,255,0.13)",
  borderRadius:9, padding:"10px 14px", color:"#f1f5f9", fontSize:14,
  fontFamily:"inherit", outline:"none", boxSizing:"border-box", width:"100%",
};
const BASE_SEL = {
  background:"rgba(255,255,255,0.1)", border:"1.5px solid rgba(255,255,255,0.15)",
  borderRadius:8, padding:"8px 12px", color:"#f1f5f9", fontSize:14,
  fontFamily:"inherit", cursor:"pointer",
};
const iconBtn = {
  background:"rgba(255,255,255,0.07)", border:"none", borderRadius:6,
  color:"#94a3b8", cursor:"pointer", padding:"3px 7px", fontSize:11, lineHeight:1,
};
function Card({ children, style={} }) {
  return <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:14, padding:"18px 20px", marginBottom:14, ...style }}>{children}<-div>;
}

-* ══════════════════════════════════════════
   PIN LOCK SCREEN
══════════════════════════════════════════ *-
function PinLockScreen({ onUnlock }) {
  const [pin, setPin]       = useState("");
  const [error, setError]   = useState(false);
  const [shake, setShake]   = useState(false);
  const [correctPin, setCorrectPin] = useState(DEFAULT_PIN);
  const inputRef = useRef(null);

  -- Load PIN from Firebase
  useEffect(() => {
    const unsub = onValue(ref(db, "config-summaryPin"), (snap) => {
      if (snap.val()) setCorrectPin(snap.val());
    });
    return () => unsub();
  }, []);

  -- Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleDigit(d) {
    if (pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === correctPin.length) {
      setTimeout(() => checkPin(next), 100);
    }
  }

  function checkPin(p) {
    if (p === correctPin) {
      ss(PIN_SESSION_KEY, Date.now());
      onUnlock();
    } else {
      setShake(true);
      setError(true);
      setPin("");
      setTimeout(() => setShake(false), 500);
    }
  }

  function handleDelete() { setPin(p => p.slice(0,-1)); setError(false); }

  const digits = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(135deg,#0f172a,#1e293b)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      fontFamily:"'Sarabun','Noto Sans Thai',sans-serif",
      padding:24,
    }}>
      <div style={{ fontSize:44, marginBottom:12 }}>🔒<-div>
      <div style={{ fontSize:20, fontWeight:800, color:"#f1f5f9", marginBottom:6 }}>หน้าสรุปรายเดือน<-div>
      <div style={{ fontSize:14, color:"#64748b", marginBottom:40 }}>ใส่ PIN เพื่อเข้าถึงข้อมูล<-div>

      {-* PIN dots *-}
      <div style={{
        display:"flex", gap:16, marginBottom:36,
        animation: shake ? "shake 0.4s ease" : "none",
      }}>
        {Array.from({length: correctPin.length}).map((_, i) => (
          <div key={i} style={{
            width:18, height:18, borderRadius:"50%",
            background: i < pin.length
              ? (error ? "#ef4444" : "#f1f5f9")
              : "rgba(255,255,255,0.15)",
            transition:"background 0.15s",
            boxShadow: i < pin.length && !error ? "0 0 8px rgba(255,255,255,0.4)" : "none",
          }}->
        ))}
      <-div>

      {error && (
        <div style={{ fontSize:13, color:"#ef4444", marginBottom:20, fontWeight:600 }}>
          PIN ไม่ถูกต้อง กรุณาลองใหม่
        <-div>
      )}

      {-* Numpad *-}
      <div style={{
        display:"grid", gridTemplateColumns:"repeat(3, 72px)",
        gap:12,
      }}>
        {digits.map((d, i) => (
          <button key={i} onClick={() => d === "⌫" ? handleDelete() : d ? handleDigit(d) : null}
            disabled={!d}
            style={{
              width:72, height:72, borderRadius:16, border:"none",
              cursor: d ? "pointer" : "default",
              fontFamily:"inherit", fontSize: d === "⌫" ? 22 : 26,
              fontWeight:700,
              background: d
                ? "rgba(255,255,255,0.08)"
                : "transparent",
              color: d ? "#f1f5f9" : "transparent",
              transition:"all 0.15s",
              boxShadow: d ? "inset 0 1px 0 rgba(255,255,255,0.1)" : "none",
            }}
          >{d}<-button>
        ))}
      <-div>

      <style>{`
        @keyframes shake {
          0%,100%{ transform:translateX(0) }
          20%{ transform:translateX(-8px) }
          40%{ transform:translateX(8px) }
          60%{ transform:translateX(-6px) }
          80%{ transform:translateX(6px) }
        }
      `}<-style>
    <-div>
  );
}

-* ══════════════════════════════════════════
   ROLE SELECT SCREEN
══════════════════════════════════════════ *-
function RoleSelectScreen({ onSelect }) {
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f172a,#1e293b)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'Sarabun','Noto Sans Thai',sans-serif" }}>
      <div style={{ fontSize:52, marginBottom:16 }}>🚑<-div>
      <div style={{ fontSize:22, fontWeight:900, color:"#f1f5f9", marginBottom:6 }}>EMS Equipment Check<-div>
      <div style={{ fontSize:14, color:"#64748b", marginBottom:40 }}>รพ.มหาราช · เลือกตำแหน่งของคุณ<-div>
      {ROLES.map(r => (
        <button key={r.id} onClick={()=>onSelect(r.id)} style={{
          width:"100%", maxWidth:360, marginBottom:14, padding:"20px 24px",
          borderRadius:16, border:`2px solid ${r.color}44`, cursor:"pointer",
          background:`linear-gradient(135deg,${r.color}22,${r.color}11)`,
          display:"flex", alignItems:"center", gap:16, fontFamily:"inherit",
        }}>
          <div style={{ fontSize:32 }}>{r.icon}<-div>
          <div style={{ textAlign:"left" }}>
            <div style={{ fontSize:17, fontWeight:800, color:"#f1f5f9" }}>{r.label}<-div>
            <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>แตะเพื่อเข้าระบบ<-div>
          <-div>
          <div style={{ marginLeft:"auto", color:r.color, fontSize:22 }}>›<-div>
        <-button>
      ))}
    <-div>
  );
}

-* ══════════════════════════════════════════
   SETTINGS PAGE
══════════════════════════════════════════ *-
function SettingsPage({ myRole, equipment, onSaveEquip }) {
  const role  = ROLE_MAP[myRole];
  const [draft,    setDraft]    = useState([...(equipment[myRole]||[])]);
  const [saved,    setSaved]    = useState(false);
  const [saving,   setSaving]   = useState(false);

  -- PIN change (หัวหน้าเท่านั้น — แสดงเฉพาะ Para-RN)
  const [currentPin, setCurrentPin] = useState("");
  const [newPin,     setNewPin]     = useState("");
  const [pinSaved,   setPinSaved]   = useState(false);
  const [pinError,   setPinError]   = useState("");
  const [realPin,    setRealPin]    = useState(DEFAULT_PIN);

  useEffect(() => {
    const unsub = onValue(ref(db,"config-summaryPin"), snap => {
      if(snap.val()) setRealPin(snap.val());
    });
    return () => unsub();
  }, []);

  function update(i,val){ const d=[...draft]; d[i]=val; setDraft(d); setSaved(false); }
  function add()        { setDraft([...draft,""]); setSaved(false); }
  function remove(i)    { const d=[...draft]; d.splice(i,1); setDraft(d); setSaved(false); }
  function move(i,dir)  { const d=[...draft],j=i+dir; if(j<0||j>=d.length)return; [d[i],d[j]]=[d[j],d[i]]; setDraft(d); setSaved(false); }

  async function handleSaveEquip() {
    setSaving(true);
    const clean = draft.filter(x=>x.trim());
    const newEq = { ...equipment, [myRole]: clean };
    await set(ref(db,"equipment"), newEq);
    onSaveEquip(newEq);
    setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),2000);
  }

  async function handleChangePin() {
    setPinError("");
    if (currentPin !== realPin) { setPinError("PIN ปัจจุบันไม่ถูกต้อง"); return; }
    if (newPin.length < 4)      { setPinError("PIN ใหม่ต้องมีอย่างน้อย 4 ตัว"); return; }
    if (!-^\d+$-.test(newPin))  { setPinError("PIN ต้องเป็นตัวเลขเท่านั้น"); return; }
    await set(ref(db,"config-summaryPin"), newPin);
    setPinSaved(true); setCurrentPin(""); setNewPin("");
    setTimeout(()=>setPinSaved(false),2000);
  }

  return (
    <div>
      {-* Equipment settings *-}
      <Card>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
          <span style={{ fontSize:28 }}>{role.icon}<-span>
          <div>
            <div style={{ fontSize:16, fontWeight:800 }}>ตั้งค่ารายการอุปกรณ์<-div>
            <div style={{ fontSize:13, color:"#94a3b8" }}>สำหรับ {role.label}<-div>
          <-div>
        <-div>
      <-Card>
      <Card>
        {draft.map((item,i) => (
          <div key={i} style={{ display:"flex", gap:6, marginBottom:8, alignItems:"center" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
              <button onClick={()=>move(i,-1)} style={iconBtn}>▲<-button>
              <button onClick={()=>move(i, 1)} style={iconBtn}>▼<-button>
            <-div>
            <input value={item} onChange={e=>update(i,e.target.value)}
              placeholder={`รายการที่ ${i+1}`} style={BASE_INP} ->
            <button onClick={()=>remove(i)} style={{ ...iconBtn, background:"rgba(239,68,68,0.15)", color:"#f87171", padding:"6px 10px", fontSize:14 }}>✕<-button>
          <-div>
        ))}
        <button onClick={add} style={{ marginTop:6, padding:"9px 18px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:700, background:role.color+"22", color:role.color }}>
          + เพิ่มรายการ
        <-button>
      <-Card>
      <div style={{ display:"flex", gap:10, marginBottom:24 }}>
        <button onClick={()=>{ if(window.confirm("รีเซ็ตรายการกลับค่าเริ่มต้น?")) setDraft([...DEFAULT_EQUIPMENT[myRole]]); }} style={{ flex:1, padding:"13px 0", borderRadius:10, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:14, fontWeight:700, background:"rgba(255,255,255,0.07)", color:"#94a3b8" }}>🔄 รีเซ็ต<-button>
        <button onClick={handleSaveEquip} disabled={saving} style={{ flex:3, padding:"13px 0", borderRadius:10, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:15, fontWeight:800, background:saved?"#16a34a":saving?"#475569":`linear-gradient(90deg,${role.color},${role.color}cc)`, color:"#fff", transition:"all 0.3s" }}>
          {saving?"⏳ กำลังบันทึก...":saved?"✅ บันทึกแล้ว!":"💾 บันทึกการตั้งค่า"}
        <-button>
      <-div>

      {-* PIN change — แสดงทุกตำแหน่ง (ใครรู้ PIN เก่าก็เปลี่ยนได้) *-}
      <Card style={{ border:"1.5px solid rgba(251,191,36,0.3)" }}>
        <div style={{ fontSize:14, fontWeight:800, color:"#fbbf24", marginBottom:14 }}>🔑 เปลี่ยน PIN หน้าสรุปเดือน<-div>
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:12, color:"#94a3b8", marginBottom:6 }}>PIN ปัจจุบัน<-div>
          <input type="password" inputMode="numeric" value={currentPin}
            onChange={e=>{ setCurrentPin(e.target.value); setPinError(""); setPinSaved(false); }}
            placeholder="ใส่ PIN ปัจจุบัน" maxLength={6}
            style={{ ...BASE_INP, letterSpacing:6, fontSize:20 }} ->
        <-div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12, color:"#94a3b8", marginBottom:6 }}>PIN ใหม่ (4-6 หลัก)<-div>
          <input type="password" inputMode="numeric" value={newPin}
            onChange={e=>{ setNewPin(e.target.value.replace(-\D-g,"")); setPinError(""); setPinSaved(false); }}
            placeholder="ใส่ PIN ใหม่" maxLength={6}
            style={{ ...BASE_INP, letterSpacing:6, fontSize:20 }} ->
        <-div>
        {pinError && <div style={{ fontSize:13, color:"#f87171", marginBottom:10 }}>⚠️ {pinError}<-div>}
        <button onClick={handleChangePin} style={{
          width:"100%", padding:"12px 0", borderRadius:10, border:"none",
          cursor:"pointer", fontFamily:"inherit", fontSize:14, fontWeight:800,
          background: pinSaved ? "#16a34a" : "linear-gradient(90deg,#d97706,#b45309)",
          color:"#fff", transition:"all 0.3s",
        }}>
          {pinSaved ? "✅ เปลี่ยน PIN เรียบร้อย!" : "🔑 เปลี่ยน PIN"}
        <-button>
        <div style={{ fontSize:12, color:"#475569", marginTop:10, textAlign:"center" }}>
          PIN เริ่มต้น: 1234 — เปลี่ยนก่อนใช้งานจริงด้วยนะคะ
        <-div>
      <-Card>
    <-div>
  );
}

-* ══════════════════════════════════════════
   CHECK PAGE
══════════════════════════════════════════ *-
function CheckPage({ myRole, selYear, selMonth, selDay, selShift, equipment }) {
  const role  = ROLE_MAP[myRole];
  const items = equipment[myRole] || [];
  const key   = recKey(selYear, selMonth, selDay, selShift, myRole);
  const dbRef = ref(db, `records-${key}`);
  const shiftMeta = SHIFT_META[selShift];

  const [myName,  setMyName]  = useState("");
  const [checked, setChecked] = useState({});
  const [note,    setNote]    = useState("");
  const [saved,   setSaved]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = onValue(dbRef, (snap) => {
      const data = snap.val();
      if (data) { setMyName(data.name||""); setChecked(data.checked||{}); setNote(data.note||""); }
      else       { setMyName(""); setChecked({}); setNote(""); }
      setLoading(false); setSaved(false);
    });
    return () => unsub();
  }, [key]);

  function toggle(item) { const k=item.replace(-[.#$-[\]]-g,"_"); setChecked(p=>({...p,[k]:!p[k]})); setSaved(false); }

  async function handleSave() {
    setSaving(true);
    await set(dbRef, { name:myName, checked, note, roleId:myRole, savedAt:new Date().toISOString() });
    setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),2500);
  }

  const done  = items.filter(i=>checked[i]).length;
  const total = items.length;

  if (loading) return <div style={{ textAlign:"center", padding:60, color:"#64748b" }}><div style={{ fontSize:32, marginBottom:12 }}>⏳<-div>กำลังโหลด...<-div>;

  return (
    <div>
      <div style={{ background:shiftMeta.accent+"20", border:`1.5px solid ${shiftMeta.accent}44`, borderRadius:10, padding:"10px 16px", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:13, color:shiftMeta.accent }}>{shiftMeta.icon} {selDay} {MONTH_NAMES[selMonth]} {selYear+543} · เวร{selShift}<-span>
        {saved && <span style={{ marginLeft:"auto", fontSize:12, color:"#4ade80" }}>✓ Sync ☁️<-span>}
      <-div>

      <Card>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <span style={{ fontSize:26 }}>{role.icon}<-span>
          <div>
            <div style={{ fontWeight:800, fontSize:15, color:role.color }}>{role.label}<-div>
            <div style={{ fontSize:12, color:"#64748b" }}>ผู้รับผิดชอบตรวจเช็ค<-div>
          <-div>
        <-div>
        <input value={myName} onChange={e=>{setMyName(e.target.value);setSaved(false);}} placeholder="ชื่อ-นามสกุลของคุณ" style={BASE_INP} ->
      <-Card>

      <Card style={{ paddingBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#94a3b8" }}>ความคืบหน้า<-span>
          <span style={{ fontSize:13, color:done===total&&total>0?"#4ade80":"#f59e0b" }}>{done}-{total}<-span>
        <-div>
        <div style={{ height:8, background:"#1e293b", borderRadius:99, overflow:"hidden" }}>
          <div style={{ height:"100%", borderRadius:99, transition:"width 0.3s", background:`linear-gradient(90deg,${role.color},#4ade80)`, width:`${total?(done-total)*100:0}%` }}->
        <-div>
      <-Card>

      <Card>
        <div style={{ fontSize:13, fontWeight:700, color:"#94a3b8", marginBottom:12 }}>🔧 รายการตรวจเช็ค<-div>
        {items.length===0 ? (
          <div style={{ fontSize:13, color:"#475569", fontStyle:"italic" }}>ยังไม่มีรายการ · ไปตั้งค่าที่ ⚙️ ก่อนค่ะ<-div>
        ) : items.map(item => {
          const ck=!!checked[item];
          return (
            <label key={item} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:8, cursor:"pointer", marginBottom:4, background:ck?"rgba(74,222,128,0.08)":"transparent", transition:"background 0.15s" }}>
              <input type="checkbox" checked={ck} onChange={()=>toggle(item)} style={{ width:18, height:18, accentColor:role.color, cursor:"pointer", flexShrink:0 }} ->
              <span style={{ fontSize:14, color:ck?"#4ade80":"#cbd5e1", flex:1 }}>{item}<-span>
              {ck && <span style={{ color:"#4ade80", fontSize:13 }}>✓<-span>}
            <-label>
          );
        })}
      <-Card>

      <Card>
        <div style={{ fontSize:13, fontWeight:700, color:"#94a3b8", marginBottom:10 }}>📝 หมายเหตุ<-div>
        <textarea value={note} onChange={e=>{setNote(e.target.value);setSaved(false);}} placeholder="เช่น อุปกรณ์ชำรุด, ของขาด..." rows={3} style={{ ...BASE_INP, resize:"vertical", lineHeight:1.7 }} ->
      <-Card>

      <button onClick={handleSave} disabled={saving} style={{ width:"100%", padding:"16px 0", borderRadius:12, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:16, fontWeight:800, background:saved?"#16a34a":saving?"#475569":`linear-gradient(90deg,${role.color},${shiftMeta.accent})`, color:"#fff", boxShadow:`0 4px 20px ${role.color}44`, transition:"all 0.3s" }}>
        {saving?"⏳ กำลัง Sync...":saved?"✅ บันทึก & Sync แล้ว!":"💾 บันทึกการเช็ค"}
      <-button>
    <-div>
  );
}

-* ══════════════════════════════════════════
   SUMMARY PAGE (PIN protected)
══════════════════════════════════════════ *-
function SummaryPage({ selYear, selMonth, equipment, onLock }) {
  const [allData,  setAllData]  = useState({});
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);
    const monthPrefix = `${selYear}-${String(selMonth+1).padStart(2,"00")}`;
    const unsub = onValue(ref(db,"records"), (snap) => {
      const raw = snap.val()||{};
      const filtered = Object.fromEntries(
        Object.entries(raw).filter(([k]) => k.startsWith(`${selYear}-${String(selMonth+1).padStart(2,"0")}`))
      );
      setAllData(filtered);
      setLoading(false);
    });
    return () => unsub();
  }, [selYear, selMonth]);

  const days = getDays(selYear, selMonth);
  const rows = [];
  for(let d=1;d<=days;d++){
    for(const shift of SHIFTS){
      const roleResults = ROLES.map(r => {
        const k=recKey(selYear,selMonth,d,shift,r.id);
        const e=allData[k];
        const its=equipment[r.id]||[];
        const done=e?Object.values(e.checked||{}).filter(Boolean).length:0;
        return { role:r, entry:e, done, total:its.length };
      });
      const allOK = roleResults.every(r=>r.entry&&r.entry.name&&r.done===r.total&&r.total>0);
      if(!allOK) rows.push({day:d,shift,roleResults});
    }
  }

  const copyText =
    `สรุปเวรที่ไม่ได้เช็คอุปกรณ์ EMS\nเดือน${MONTH_NAMES[selMonth]} ${selYear+543}\n`+
    "─".repeat(36)+"\n"+
    rows.map(({day,shift,roleResults})=>{
      const missing=roleResults.filter(r=>!r.entry||!r.entry.name||r.done<r.total);
      return `• ${day} ${MONTH_NAMES[selMonth]} เวร${shift}\n`+
        missing.map(r=>`  - ${r.role.short}: ${r.entry?.name||"ไม่มีชื่อ"} [${r.done}-${r.total}]`).join("\n");
    }).join("\n")+
    `\n${"─".repeat(36)}\nรวม ${rows.length} เวร`;

  if(loading) return <div style={{ textAlign:"center", padding:60, color:"#64748b" }}><div style={{ fontSize:32, marginBottom:12 }}>⏳<-div>กำลังโหลด...<-div>;

  return (
    <div>
      <Card>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>📊 สรุปเดือน{MONTH_NAMES[selMonth]} {selYear+543}<-div>
            <div style={{ fontSize:13, color:"#94a3b8" }}>ข้อมูล Real-time ☁️<-div>
          <-div>
          {-* Lock button *-}
          <button onClick={onLock} style={{
            padding:"8px 14px", borderRadius:8, border:"none", cursor:"pointer",
            fontFamily:"inherit", fontSize:13, fontWeight:700,
            background:"rgba(251,191,36,0.15)", color:"#fbbf24",
          }}>🔒 ล็อค<-button>
        <-div>
      <-Card>

      {rows.length===0 ? (
        <div style={{ background:"rgba(74,222,128,0.1)", border:"1.5px solid #4ade8055", borderRadius:14, padding:36, textAlign:"center" }}>
          <div style={{ fontSize:44, marginBottom:10 }}>✅<-div>
          <div style={{ fontSize:16, fontWeight:700, color:"#4ade80" }}>ครบทุกเวรแล้วค่ะ!<-div>
        <-div>
      ) : (
        <>
          <div style={{ background:"rgba(239,68,68,0.1)", border:"1.5px solid #ef444455", borderRadius:10, padding:"12px 16px", marginBottom:14, fontSize:14 }}>
            ⚠️ พบ <strong>{rows.length}<-strong> เวร ที่ยังไม่สมบูรณ์
          <-div>
          {rows.map(({day,shift,roleResults},idx)=>{
            const sm=SHIFT_META[shift];
            return (
              <Card key={idx} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <div style={{ padding:"4px 12px", borderRadius:8, fontSize:13, fontWeight:800, background:sm.accent+"22", color:sm.accent }}>
                    {sm.icon} {day} {MONTH_NAMES[selMonth].slice(0,3)} · เวร{shift}
                  <-div>
                <-div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {roleResults.map(r=>{
                    const ok=r.entry&&r.entry.name&&r.done===r.total&&r.total>0;
                    return (
                      <div key={r.role.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, background:ok?"rgba(74,222,128,0.06)":"rgba(239,68,68,0.06)", border:`1px solid ${ok?"#4ade8033":"#ef444433"}` }}>
                        <span style={{ fontSize:18 }}>{r.role.icon}<-span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:r.role.color }}>{r.role.short}<-div>
                          <div style={{ fontSize:12, color:"#94a3b8" }}>{r.entry?.name||"ยังไม่ได้บันทึก"}<-div>
                        <-div>
                        <div style={{ fontSize:12, color:ok?"#4ade80":"#f87171", fontWeight:700 }}>
                          {ok?"✓ ครบ":`${r.done}-${r.total}`}
                        <-div>
                      <-div>
                    );
                  })}
                <-div>
              <-Card>
            );
          })}
          <Card>
            <div style={{ fontSize:13, fontWeight:700, color:"#94a3b8", marginBottom:10 }}>📋 คัดลอกส่งหัวหน้า<-div>
            <div style={{ background:"#0f172a", borderRadius:8, padding:14, fontSize:12, lineHeight:1.9, color:"#e2e8f0", fontFamily:"monospace", whiteSpace:"pre-wrap", marginBottom:12 }}>{copyText}<-div>
            <button onClick={()=>navigator.clipboard.writeText(copyText)} style={{ padding:"10px 22px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:700, background:"#3b82f6", color:"#fff" }}>
              📋 คัดลอกข้อความ
            <-button>
          <-Card>
        <->
      )}
    <-div>
  );
}

-* ══════════════════════════════════════════
   ROOT APP
══════════════════════════════════════════ *-
export default function App() {
  const {year:ty,month:tm,day:td} = todayParts();
  const [myRole,    setMyRole]    = useState(()=>ls(KEY_ROLE,null));
  const [view,      setView]      = useState("check");
  const [selYear,   setSelYear]   = useState(ty);
  const [selMonth,  setSelMonth]  = useState(tm);
  const [selDay,    setSelDay]    = useState(td);
  const [selShift,  setSelShift]  = useState("เช้า");
  const [equipment, setEquipment] = useState(DEFAULT_EQUIPMENT);

  -- PIN state — ตรวจว่า session นี้ unlock แล้วหรือยัง
  const [pinUnlocked, setPinUnlocked] = useState(() => {
    const t = ls(PIN_SESSION_KEY, 0);
    -- ถ้า unlock ภายใน 8 ชม. ถือว่ายัง valid
    return t && (Date.now() - t) < 8 * 60 * 60 * 1000;
  });

  useEffect(() => {
    const unsub = onValue(ref(db,"equipment"), (snap) => {
      const data = snap.val();
      if (data) setEquipment(data);
    });
    return () => unsub();
  }, []);

  function selectRole(id) { setMyRole(id); ss(KEY_ROLE,id); }
  function switchRole()   { setMyRole(null); ss(KEY_ROLE,null); setView("check"); }
  function handleUnlock() { setPinUnlocked(true); }
  function handleLock()   {
    setPinUnlocked(false);
    ss(PIN_SESSION_KEY, 0);
    setView("check");
  }

  if (!myRole) return <RoleSelectScreen onSelect={selectRole} ->;

  -- ถ้าพยายามเข้า summary แต่ยังไม่ unlock
  if (view === "summary" && !pinUnlocked) {
    return <PinLockScreen onUnlock={handleUnlock} ->;
  }

  const role = ROLE_MAP[myRole];
  const TABS = [
    {id:"check",    label:"📋 บันทึก"},
    {id:"summary",  label:"📊 สรุปเดือน 🔒"},
    {id:"settings", label:"⚙️ ตั้งค่า"},
  ];

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f172a,#1e293b)", fontFamily:"'Sarabun','Noto Sans Thai',sans-serif", color:"#f1f5f9" }}>
      <div style={{ background:"linear-gradient(90deg,#dc2626,#b91c1c)", padding:"14px 18px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 4px 24px rgba(220,38,38,0.4)", flexWrap:"wrap" }}>
        <div style={{ fontSize:26 }}>🚑<-div>
        <div>
          <div style={{ fontSize:17, fontWeight:800, letterSpacing:1 }}>EMS Equipment Check<-div>
          <div style={{ fontSize:11, opacity:.85 }}>รพ.มหาราช · ☁️ Firebase<-div>
        <-div>
        <button onClick={switchRole} style={{ display:"flex", alignItems:"center", gap:6, background:role.color+"33", border:`1.5px solid ${role.color}66`, borderRadius:20, padding:"5px 14px", cursor:"pointer", fontFamily:"inherit", color:"#f1f5f9", fontSize:13, fontWeight:700 }}>
          {role.icon} {role.short} <span style={{ fontSize:11, opacity:.7 }}>เปลี่ยน<-span>
        <-button>
        <div style={{ marginLeft:"auto", display:"flex", gap:6, flexWrap:"wrap" }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setView(t.id)} style={{ padding:"7px 13px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:12, fontWeight:700, background:view===t.id?"#fff":"rgba(255,255,255,0.15)", color:view===t.id?"#dc2626":"#fff", transition:"all 0.2s" }}>
              {t.label}
            <-button>
          ))}
        <-div>
      <-div>

      <div style={{ maxWidth:720, margin:"0 auto", padding:"18px 14px" }}>
        {view!=="settings" && (
          <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:14, padding:"13px 16px", marginBottom:14, display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:13, opacity:.65 }}>เดือน-ปี:<-span>
            <select value={selMonth} onChange={e=>setSelMonth(+e.target.value)} style={BASE_SEL}>
              {MONTH_NAMES.map((m,i)=><option key={i} value={i}>{m}<-option>)}
            <-select>
            <select value={selYear} onChange={e=>setSelYear(+e.target.value)} style={BASE_SEL}>
              {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y+543}<-option>)}
            <-select>
            {view==="check" && (
              <>
                <span style={{ fontSize:13, opacity:.65 }}>วันที่:<-span>
                <select value={selDay} onChange={e=>setSelDay(+e.target.value)} style={BASE_SEL}>
                  {Array.from({length:getDays(selYear,selMonth)},(_,i)=>i+1).map(d=>
                    <option key={d} value={d}>{d}<-option>)}
                <-select>
                <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
                  {SHIFTS.map(s=>(
                    <button key={s} onClick={()=>setSelShift(s)} style={{ padding:"6px 13px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:700, background:selShift===s?SHIFT_META[s].accent:"rgba(255,255,255,0.07)", color:selShift===s?"#fff":"#94a3b8", transition:"all 0.2s" }}>
                      {SHIFT_META[s].icon} {s}
                    <-button>
                  ))}
                <-div>
              <->
            )}
          <-div>
        )}

        {view==="check"    && <CheckPage    myRole={myRole} selYear={selYear} selMonth={selMonth} selDay={selDay} selShift={selShift} equipment={equipment}->}
        {view==="summary"  && <SummaryPage  selYear={selYear} selMonth={selMonth} equipment={equipment} onLock={handleLock}->}
        {view==="settings" && <SettingsPage myRole={myRole} equipment={equipment} onSaveEquip={setEquipment}->}
      <-div>
    <-div>
  );
}
