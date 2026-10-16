import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, remove, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCW_xpZq3nVeL86NUX5S8W1hbMSzdS4kpk",
  authDomain: "ems-equipment-mnst.firebaseapp.com",
  databaseURL: "https://ems-equipment-mnst-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ems-equipment-mnst",
  storageBucket: "ems-equipment-mnst.firebasestorage.app",
  messagingSenderId: "917321944070",
  appId: "1:917321944070:web:e5b06fe6554d35aba68787",
};
const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

const ROLES = [
  { id:"para", label:"Paramedic / ENP / RN", short:"Para/ENP/RN", icon:"🩺", color:"#e25c86" },
  { id:"aemt", label:"AEMT",                  short:"AEMT",    icon:"🚑", color:"#6a8df5" },
  { id:"driv", label:"พนักงานขับรถ",                  short:"พนักงานขับรถ",    icon:"🚗", color:"#2bb594" },
];
const ROLE_MAP = Object.fromEntries(ROLES.map(r=>[r.id,r]));
const SHIFTS = ["เช้า","บ่าย","ดึก"];
const SHIFT_META = {
  "เช้า":{accent:"#e08a2e",icon:"🌅"},
  "บ่าย":{accent:"#4a86e8",icon:"☀️"},
  "ดึก": {accent:"#8a6cf0",icon:"🌙"},
  "บ่าย/ดึก":{accent:"#7c8cf0",icon:"🌇"},
};

/* ── Para/RN grouped items ── */
let PARA_GROUPS = [
  {
    id:"airway", label:"1. Airway and Breathing", icon:"💨", color:"#e25c86",
    items:[
      {id:"ett",          label:"ETT no 3-8 (ระบุอันที่หมดเร็วสุด)",                       hasExp:false},
      {id:"facemask",     label:"Face mask (ผู้ใหญ่, เด็ก 2 ขนาด)",                        hasExp:false},
      {id:"ambubag",      label:"Ambubag (3 ขนาด) (ระบุอันที่หมดเร็วสุด)",                  hasExp:false},
      {id:"reservoir",    label:"Reservoir bag (ผู้ใหญ่, เด็ก)",                            hasExp:false},
      {id:"lma",          label:"LMA no 3",                                                  hasExp:false},
      {id:"csuction",     label:"Closed suction (ใช้แล้วเบิกด้วย)",                          hasExp:false},
      {id:"laryngo",      label:"Laryngoscope box (เช็คไฟ, blade 4 ขนาด)",                  hasExp:false},
      {id:"stylet_a",     label:"Stylet (เหล็ก)",                                            hasExp:false},
      {id:"stylet_c",     label:"Stylet (เด็ก 2 อัน)",                                       hasExp:false},
      {id:"stapett",      label:"ชุด Stap ETT (KY jell, Syringe 10, เทปพัน ETT 2 ขนาด, เชือกผูก ETT)", hasExp:false},
      {id:"nebett",       label:"Set พ่นยาทาง ETT",                                          hasExp:false},
      {id:"corrugated",   label:"Corrugated",                                                hasExp:false},
      {id:"medicut16",    label:"Medicut no 16 (2 อัน)",                                     hasExp:false},
      {id:"hmefilter",    label:"HME Filter (ผู้ใหญ่, เด็ก)",                               hasExp:false},
    ]
  },
  {
    id:"ivdrug", label:"2. IV Set and Drug", icon:"💉", color:"#6a8df5",
    items:[
      {id:"ivset",        label:"Set IV (Set IV, 3-Ways, Extension) อย่างละ 2 ชุด",         hasExp:false},
      {id:"tourniquet",   label:"Tourniquet",                                                hasExp:false},
      {id:"alcoholpads",  label:"Alcohol pads",                                              hasExp:false},
      {id:"transpore",    label:"Transpore (2 ขนาด)",                                        hasExp:false},
      {id:"tegaderm",     label:"Tegaderm",                                                  hasExp:false},
      {id:"syringe",      label:"Syringe (Insulin, 3, 5, 10, 20, 50) อย่างน้อยอันละ 2",    hasExp:false},
      {id:"medicut_iv",   label:"Medicut (18, 20, 22, 24) อย่างน้อยอันละ 2",                hasExp:false},
      {id:"needles",      label:"Needles (18, 21, 24, 25) อย่างน้อยอันละ 2",               hasExp:false},
      {id:"nss1000",      label:"0.9%NSS 1,000 ml",                                         hasExp:false},
      {id:"nss100",       label:"0.9%NSS 100 ml",                                           hasExp:false},
      {id:"ari1000",      label:"ARI 1,000 ml",                                             hasExp:false},
      {id:"dns1000",      label:"10%DNS 1,000 ml",                                          hasExp:false},
      {id:"10dns",        label:"10DNS 1,000 ml",                                           hasExp:false},
      {id:"5dw100",       label:"5DW 100 ml",                                               hasExp:false},
      {id:"emdrug",       label:"กล่องยา Emergency (3 กล่อง)",                              hasExp:false},
      {id:"etomidate",    label:"Etomidate, Succinylcholine (ในตู้เย็น)",                    hasExp:false},
    ]
  },
  {
    id:"monitor", label:"3. Monitoring Equipment", icon:"📟", color:"#2bb594",
    items:[
      {id:"shilley",      label:"Shilley (Calibrate ด้วย) + แผ่น Pads",                    hasExp:false},
      {id:"stethoscope",  label:"Stethoscope",                                               hasExp:false},
      {id:"videolaryngo",  label:"Video laryngoscope (เช็ค Battery)",                                hasExp:false},
    ]
  },
];

const DEFAULT_EQUIPMENT = {
  para: [], // Para uses PARA_GROUPS, not this
  aemt: ["Stretcher Spine Board","Cervical Collar","Trauma Kit Bandage","IV Set Cannula"],
  driv: ["รถ EMS พร้อมใช้งาน","น้ำมันเพียงพอ","ไฟฉุกเฉิน Siren","วิทยุสื่อสาร","อุปกรณ์นำทาง GPS"],
};
const DEFAULT_PIN = "1234";
const PIN_SESSION_KEY = "ems_pin_unlocked";
const MONTH_NAMES = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const KEY_ROLE = "ems_my_role";

const DRIV_SHIFTS = ["เช้า","บ่าย/ดึก"];
function ls(key,fb){try{const v=localStorage.getItem(key);return v?JSON.parse(v):fb;}catch{return fb;}}
function ss(key,v){try{localStorage.setItem(key,JSON.stringify(v));}catch{}}
function getDays(y,m){return new Date(y,m+1,0).getDate();}
function recKey(y,m,d,shift,roleId){return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}_${shift}_${roleId}`;}

/* ── รายชื่อผู้ปฏิบัติงานรายเวร (roster) ── */
function dateStr(y,m,d){return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;}
function rosterKey(y,m,d,shift){return `${dateStr(y,m,d)}_${shift}`;}
// พขร. เวรบ่ายและดึกบันทึกรวมเป็น "บ่าย/ดึก" ซึ่ง Firebase เก็บซ้อนเป็น records/{วันที่}_บ่าย/ดึก_driv
function drivPath(y,m,d,shift){return shift==="เช้า"?`records/${recKey(y,m,d,"เช้า","driv")}`:`records/${dateStr(y,m,d)}_บ่าย/ดึก_driv`;}
function getEntry(allData,y,m,d,shift,roleId){
  if(roleId==="driv"&&shift!=="เช้า") return allData[`${dateStr(y,m,d)}_บ่าย`]?.["ดึก_driv"];
  return allData[recKey(y,m,d,shift,roleId)];
}
function roleTotal(roleId){
  if(roleId==="para") return PARA_GROUPS.reduce((s,g)=>s+g.items.length,0);
  if(roleId==="aemt") return AEMT_GROUPS.reduce((s,g)=>s+g.items.length,0);
  if(roleId==="driv") return DRIV_GROUPS.reduce((s,g)=>s+g.items.length,0);
  return 0;
}
function entryDone(e){return e?Object.values(e.checked||{}).filter(Boolean).length:0;}
// ใช้จำนวนรายการ ณ วันที่เช็ค (ถ้ามีบันทึกไว้) เพื่อไม่ให้เวรเก่าเพี้ยนเมื่อแก้รายการอุปกรณ์
function recTotal(e,roleId){return (e&&typeof e.total==="number")?e.total:roleTotal(roleId);}
function entryOK(e,roleId){const t=recTotal(e,roleId);return !!(e&&e.name&&t>0&&entryDone(e)===t);}
function checkMark(e,roleId){
  if(!e) return "ยังไม่เช็ค ❌";
  const t=recTotal(e,roleId),d=entryDone(e);
  return d===t&&t>0?"เช็คแล้ว ✅":`เช็คไม่ครบ ${d}/${t} ⚠️`;
}
// ช่องรายชื่อ: เวรเช้า/บ่าย = Para หรือ ไม้ 9 + ไม้ A, เวรดึก = ไม้ A1 + ไม้ A2
const ROSTER_ALL=[
  {id:"ep",     label:"EP"},
  {id:"p9",     label:"Para หรือ ไม้ 9", day:true},
  {id:"a",      label:"ไม้ A",           day:true},
  {id:"a1",     label:"ไม้ A1",          night:true},
  {id:"a2",     label:"ไม้ A2",          night:true},
  {id:"ph1",    label:"ไม้ Pre-hos (หลัก)", optional:true},
  {id:"ph2",    label:"ไม้ Pre-hos (เสริม)", optional:true},
  {id:"aemt",   label:"A-EMT"},
  {id:"driv",   label:"พขร."},
  {id:"vehicle",label:"ทะเบียนรถที่ใช้"},
];
// ช่อง optional (ไม้ Pre-hos) แสดงในรายงานเฉพาะเวรที่มีคนอยู่
function shownFields(shift,r){return rosterFieldsFor(shift).filter(f=>!f.optional||(r&&r[f.id]));}
function rosterFieldsFor(shift){
  const night=shift==="ดึก";
  return ROSTER_ALL.filter(f=>night?!f.day:!f.night);
}
// ชื่อผู้อยู่เวรที่รับผิดชอบเช็คของแต่ละตำแหน่งในแอป
function dutyName(r,roleId,shift){
  if(!r) return "";
  if(roleId==="para") return (shift==="ดึก"?[r.a1,r.a2]:[r.p9,r.a]).filter(Boolean).join(" / ");
  return r[roleId]||"";
}
function buildShiftReport(y,m,d,shift,r,checks,expLines=[]){
  r=r||{};
  return [
    "รายงานเวร EMS รพ.มหาราช นศ.",
    `เวร : ${shift}`,
    `วันที่ : ${d} ${MONTH_NAMES[m]} ${y+543}`,
    ...shownFields(shift,r).map(f=>`${f.label} : ${r[f.id]||"-"}`),
    "",
    "การเช็ครถ",
    `Para/ENP/RN : ${checkMark(checks.para,"para")}`,
    `A-EMT : ${checkMark(checks.aemt,"aemt")}`,
    `พขร. : ${checkMark(checks.driv,"driv")}`,
    ...expLines,
  ].join("\n");
}
function copyToClipboard(text){
  const fallback=()=>{const t=document.createElement("textarea");t.value=text;t.style.position="fixed";t.style.opacity="0";document.body.appendChild(t);t.select();try{document.execCommand("copy");}catch{}document.body.removeChild(t);};
  if(navigator.clipboard&&navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(fallback);
  fallback(); return Promise.resolve();
}
function lineShareUrl(text){return "https://line.me/R/share?text="+encodeURIComponent(text);}
function getThaiNow(){
  return new Date(new Date().toLocaleString("en-US",{timeZone:"Asia/Bangkok"}));
}
function getShiftAndDate(){
  const now=getThaiNow();
  const totalMin=now.getHours()*60+now.getMinutes();
  let shift,dateRef=new Date(now);
  if(totalMin>=8*60+15&&totalMin<16*60+15){
    shift="เช้า";
  } else if(totalMin>=16*60+15){
    shift="บ่าย";
  } else if(totalMin<15){
    // 00:00-00:14 ยังเป็นเวรบ่ายของเมื่อวาน
    shift="บ่าย";
    dateRef.setDate(dateRef.getDate()-1);
  } else {
    // 00:15-08:14 เวรดึกของเมื่อวาน
    shift="ดึก";
    dateRef.setDate(dateRef.getDate()-1);
  }
  return{shift,year:dateRef.getFullYear(),month:dateRef.getMonth(),day:dateRef.getDate()};
}
function todayParts(){const t=getThaiNow();return{year:t.getFullYear(),month:t.getMonth(),day:t.getDate()};}
function sanitizeKey(str){return str.replace(/[.#$/[\]/\s]/g,"_");}
function isFutureDate(y,m,d){const t=new Date();t.setHours(0,0,0,0);return new Date(y,m,d)>t;}

// ETT expiry helpers
function daysUntilExp(expStr){
  if(!expStr) return null;
  const exp = new Date(expStr); const today = new Date(); today.setHours(0,0,0,0);
  return Math.floor((exp-today)/(1000*60*60*24));
}
function ettExpColor(days){
  if(days===null) return null;
  if(days<0)  return "#e25c86";  // หมดแล้ว
  if(days<=30) return "#e8893a"; // ใกล้หมด
  return "#128a6a"; // OK
}
function ettExpText(days){
  if(days===null) return null;
  if(days<0)   return `หมดอายุแล้ว ${Math.abs(days)} วัน ⚠️`;
  if(days===0) return "หมดอายุวันนี้! ⚠️";
  if(days<=30) return `เหลือ ${days} วัน ⚠️`;
  return `เหลือ ${days} วัน ✓`;
}

/* ── ทะเบียนวันหมดอายุ: กรอกครั้งเดียวต่อล็อต แล้วระบบเตือนเอง ── */
const EXP_WARN_DAYS=10;
const ETT_SIZES=["3","3.5","4","4.5","5","5.5","6","6.5","7","7.5","8"];
let EXPIRY_GROUPS=[
  {id:"airway",label:"Airway",icon:"🫁",items:[
    ...ETT_SIZES.flatMap(z=>(z==="7.5"||z==="8")
      ?[{id:`ett_${z.replace(".","_")}_1`,label:`ETT เบอร์ ${z} (ชิ้นที่ 1)`},{id:`ett_${z.replace(".","_")}_2`,label:`ETT เบอร์ ${z} (ชิ้นที่ 2)`}]
      :[{id:`ett_${z.replace(".","_")}`,label:`ETT เบอร์ ${z}`}]),
    {id:"facemask_adult",label:"Face mask ผู้ใหญ่"},
    {id:"facemask_child",label:"Face mask เด็ก"},
    {id:"ambu_250",label:"Ambu bag 250 ml"},
    {id:"ambu_500",label:"Ambu bag 500 ml"},
    {id:"ambu_1000",label:"Ambu bag 1,000 ml"},
    {id:"reservoir_s",label:"Reservoir bag เล็ก"},
    {id:"reservoir_l",label:"Reservoir bag ใหญ่"},
    {id:"lma3",label:"LMA เบอร์ 3"},
    {id:"closed_suction",label:"Closed suction"},
    {id:"stylet_newborn",label:"Stylet แรกเกิด"},
    {id:"stylet_child",label:"Stylet เด็กโต"},
    {id:"stylet_adult",label:"Stylet ผู้ใหญ่"},
    {id:"neb_ett",label:"Set พ่นยาทาง ETT"},
    {id:"corrugate",label:"Corrugate"},
  ]},
  {id:"drug",label:"ยา",icon:"💊",items:[
    {id:"drugbox_1",label:"กล่องยา กล่องที่ 1"},
    {id:"drugbox_2",label:"กล่องยา กล่องที่ 2"},
    {id:"drugbox_3",label:"กล่องยา กล่องที่ 3"},
    {id:"etomidate",label:"Etomidate"},
    {id:"succinylcholine",label:"Succinylcholine"},
  ]},
  {id:"oxygen",label:"ออกซิเจน / พ่นยา",icon:"🫧",items:[
    {id:"nasal_small",label:"Nasal cannula เด็กเล็ก"},
    {id:"nasal_big",label:"Nasal cannula เด็กโต"},
    {id:"maskbag_child",label:"Mask c bag เด็ก"},
    {id:"neb_child",label:"Set พ่นยาเด็ก"},
    {id:"o2_humidifier",label:"Oxygen humidifier bottle"},
  ]},
  {id:"other",label:"อื่น ๆ",icon:"🩹",items:[
    {id:"nss_irrigation",label:"NSS irrigation 1,000 ml"},
    {id:"alcohol_wound",label:"Alcohol ล้างแผล"},
    {id:"delivery_set",label:"Set คลอด"},
  ]},
];
let EXPIRY_ITEMS=EXPIRY_GROUPS.flatMap(g=>g.items.map(i=>({...i,group:g.id})));
const DEFAULT_EXPIRY={all:JSON.parse(JSON.stringify(EXPIRY_GROUPS))};
// รายการที่ติดตามวันหมดอายุ แก้ได้ในแท็บตั้งค่า (expiryItems)
function applyExpiryItems(data){
  EXPIRY_GROUPS=normalizeChecklist(data)||JSON.parse(JSON.stringify(DEFAULT_EXPIRY.all));
  EXPIRY_ITEMS=EXPIRY_GROUPS.flatMap(g=>g.items.map(i=>({...i,group:g.id})));
}
function expDaysLeft(iso){
  if(!iso||!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y,m,d]=iso.split("-").map(Number);
  const t=getThaiNow(); const today=new Date(t.getFullYear(),t.getMonth(),t.getDate());
  return Math.round((new Date(y,m-1,d)-today)/86400000);
}
function expStatus(iso){
  const d=expDaysLeft(iso);
  if(d===null) return {key:"none",days:null,color:"#7f93ab",bg:"#f1f6fc",text:"ยังไม่ระบุ"};
  if(d<0)  return {key:"expired",days:d,color:"#d6456f",bg:"rgba(226,92,134,0.12)",text:`หมดอายุแล้ว ${-d} วัน`};
  if(d===0) return {key:"expired",days:d,color:"#d6456f",bg:"rgba(226,92,134,0.12)",text:"หมดอายุวันนี้"};
  if(d<=EXP_WARN_DAYS) return {key:"soon",days:d,color:"#c26a1e",bg:"rgba(232,137,58,0.14)",text:`อีก ${d} วัน`};
  return {key:"ok",days:d,color:"#128a6a",bg:"rgba(18,160,120,0.10)",text:`อีก ${d} วัน`};
}
function thaiShortDate(iso){
  if(!iso) return "-";
  const [y,m,d]=iso.split("-").map(Number);
  return `${d} ${MONTH_NAMES[m-1].slice(0,3)} ${String(y+543).slice(2)}`;
}
function useExpiry(){
  const [exp,setExp]=useState({});
  useEffect(()=>{const u=onValue(ref(db,"expiry"),s=>setExp(s.val()||{}));return()=>u();},[]);
  return exp;
}
// รายการที่ต้องแจ้งเตือน (หมดแล้ว / ใกล้หมด) เรียงจากใกล้สุด
function expiryAlerts(exp){
  return EXPIRY_ITEMS.map(i=>({...i,date:exp[i.id]?.date||"",st:expStatus(exp[i.id]?.date)}))
    .filter(x=>x.st.key==="expired"||x.st.key==="soon")
    .sort((a,b)=>a.st.days-b.st.days);
}
function expiryReportLines(exp){
  const al=expiryAlerts(exp);
  if(!al.length) return [];
  return ["","⏰ วันหมดอายุ",...al.map(a=>`${a.st.key==="expired"?"🔴":"🟠"} ${a.label} : ${a.st.text} (${thaiShortDate(a.date)})`)];
}

const BASE_INP={background:"#f1f6fc",border:"1.5px solid #d3e1f1",borderRadius:9,padding:"10px 14px",color:"#1f3047",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",width:"100%"};
const BASE_SEL={background:"#e9f1fb",border:"1.5px solid #dbe7f5",borderRadius:8,padding:"8px 12px",color:"#1f3047",fontSize:14,fontFamily:"inherit",cursor:"pointer"};
const iconBtn={background:"#f1f6fc",border:"none",borderRadius:6,color:"#5d7290",cursor:"pointer",padding:"3px 7px",fontSize:11,lineHeight:1};
function Card({children,style={}}){return <div style={{background:"#ffffff",border:"1px solid #e3edf8",boxShadow:"0 2px 12px rgba(30,64,120,0.06)",borderRadius:16,padding:"18px 20px",marginBottom:14,...style}}>{children}</div>;}

/* ── Excel Export ── */
function exportToExcel(allData,equipment,selYear,selMonth){
  const days=getDays(selYear,selMonth);
  const rows=[["วันที่","เวร","ตำแหน่ง","ชื่อ","เช็คแล้ว","ทั้งหมด","สถานะ","หมายเหตุ"]];
  for(let d=1;d<=days;d++){
    for(const shift of SHIFTS){
      for(const role of ROLES){
        const k=recKey(selYear,selMonth,d,shift,role.id);
        const e=allData[k];
        const total=recTotal(e,role.id);
        const done=e?Object.values(e.checked||{}).filter(Boolean).length:0;
        const status=!e?"ไม่มีข้อมูล":done===total?"ครบ":"ไม่ครบ";
        rows.push([`${d} ${MONTH_NAMES[selMonth]} ${selYear+543}`,shift,role.short,e?.name||"-",done,total,status,e?.note||"-"]);
      }
    }
  }
  const csv="\uFEFF"+rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=`EMS_Check_${MONTH_NAMES[selMonth]}_${selYear+543}.csv`;a.click();
  URL.revokeObjectURL(url);
}

/* ── PIN Lock ── */
function PinLockScreen({onUnlock}){
  const [pin,setPin]=useState("");const [error,setError]=useState(false);
  const [shake,setShake]=useState(false);const [correctPin,setCorrectPin]=useState(DEFAULT_PIN);
  useEffect(()=>{const u=onValue(ref(db,"config/summaryPin"),s=>{if(s.val())setCorrectPin(s.val())});return()=>u();},[]);
  function handleDigit(d){if(pin.length>=6)return;const n=pin+d;setPin(n);setError(false);if(n.length===correctPin.length)setTimeout(()=>checkPin(n),100);}
  function checkPin(p){if(p===correctPin){ss(PIN_SESSION_KEY,Date.now());onUnlock();}else{setShake(true);setError(true);setPin("");setTimeout(()=>setShake(false),500);}}
  function handleDelete(){setPin(p=>p.slice(0,-1));setError(false);}
  const digits=["1","2","3","4","5","6","7","8","9","","0","⌫"];
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#f3f8ff,#ecf7f6)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Sarabun','Noto Sans Thai',sans-serif",padding:24}}>
      <div style={{fontSize:44,marginBottom:12}}>🔒</div>
      <div style={{fontSize:20,fontWeight:800,color:"#1f3047",marginBottom:6}}>Dashboard & จัดการข้อมูล</div>
      <div style={{fontSize:14,color:"#7f93ab",marginBottom:40}}>ใส่ PIN เพื่อเข้าถึง</div>
      <div style={{display:"flex",gap:16,marginBottom:36,animation:shake?"shake 0.4s ease":"none"}}>
        {Array.from({length:correctPin.length}).map((_,i)=>(
          <div key={i} style={{width:18,height:18,borderRadius:"50%",background:i<pin.length?(error?"#e25c86":"#1f3047"):"#dbe7f5",transition:"background 0.15s"}}/>
        ))}
      </div>
      {error&&<div style={{fontSize:13,color:"#e25c86",marginBottom:20,fontWeight:600}}>PIN ไม่ถูกต้อง</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3, 72px)",gap:12}}>
        {digits.map((d,i)=>(
          <button key={i} onClick={()=>d==="⌫"?handleDelete():d?handleDigit(d):null} disabled={!d}
            style={{width:72,height:72,borderRadius:16,border:"none",cursor:d?"pointer":"default",fontFamily:"inherit",fontSize:d==="⌫"?22:26,fontWeight:700,background:d?"#e3edf8":"transparent",color:d?"#1f3047":"transparent"}}>
            {d}
          </button>
        ))}
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
    </div>
  );
}

/* ── Role Select ── */
function RoleSelectScreen({onSelect}){
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#f3f8ff,#ecf7f6)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Sarabun','Noto Sans Thai',sans-serif"}}>
      <div style={{fontSize:52,marginBottom:16}}>🚑</div>
      <div style={{fontSize:22,fontWeight:900,color:"#1f3047",marginBottom:6}}>EMS Equipment Check</div>
      <div style={{fontSize:14,color:"#7f93ab",marginBottom:40}}>รพ.มหาราช · เลือกตำแหน่งของคุณ</div>
      {ROLES.map(r=>(
        <button key={r.id} onClick={()=>onSelect(r.id)} style={{width:"100%",maxWidth:360,marginBottom:14,padding:"20px 24px",borderRadius:16,border:`2px solid ${r.color}44`,cursor:"pointer",background:`linear-gradient(135deg,${r.color}22,${r.color}11)`,display:"flex",alignItems:"center",gap:16,fontFamily:"inherit"}}>
          <div style={{fontSize:32}}>{r.icon}</div>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:17,fontWeight:800,color:"#1f3047"}}>{r.label}</div>
            <div style={{fontSize:12,color:"#7f93ab",marginTop:2}}>แตะเพื่อเข้าระบบ</div>
          </div>
          <div style={{marginLeft:"auto",color:r.color,fontSize:22}}>›</div>
        </button>
      ))}
    </div>
  );
}

/* ── Para Check Page ── */
/* ── รายชื่อเจ้าหน้าที่ (staff) ใช้เป็นตัวเลือกตอนพิมพ์ชื่อ ── */
const STAFF_GROUPS=[
  {id:"ep",     label:"EP (แพทย์)"},
  {id:"nurse",  label:"Para / ENP / RN (ไม้ 9, A, A1, A2, Pre-hos)"},
  {id:"aemt",   label:"A-EMT"},
  {id:"driv",   label:"พขร."},
  {id:"vehicle",label:"ทะเบียนรถ"},
];
const FIELD_GROUP={ep:"ep",p9:"nurse",a:"nurse",a1:"nurse",a2:"nurse",ph1:"nurse",ph2:"nurse",aemt:"aemt",driv:"driv",vehicle:"vehicle"};
function staffKey(name){return sanitizeKey(String(name).trim()).slice(0,200)||"_";}
function addStaff(group,name){
  const n=String(name||"").trim();
  if(!n||!group) return Promise.resolve();
  return set(ref(db,`staff/${group}/${staffKey(n)}`),n);
}
function useStaff(){
  const [staff,setStaff]=useState({});
  useEffect(()=>{
    const u=onValue(ref(db,"staff"),snap=>{
      const v=snap.val()||{};
      setStaff(Object.fromEntries(Object.entries(v).map(([g,o])=>[g,Object.values(o||{}).filter(x=>typeof x==="string")])));
    });
    return()=>u();
  },[]);
  return staff;
}
// ตัดคำนำหน้า (นาย, นส., พญ., จฉพ. ฯลฯ) เพื่อให้พิมพ์ตัวแรกของชื่อจริงแล้วเจอ
const TITLE_RE=/^(นางสาว|น\.ส\.|นส\.?|นาย|นาง|พญ\.?|นพ\.?|ทพ\.?|ทพญ\.?|ภก\.?|ภญ\.?|พว\.?|พย\.?|จฉพ\.?|จพ\.?|ว่าที่\s*ร\.?ต\.?|ด\.ต\.|จ\.ส\.ต\.|ส\.ต\.อ\.|ส\.ต\.ต\.|ร\.ต\.|ดร\.?)\s*/;
function normName(t){return String(t||"").toLowerCase().replace(/\s+/g,"").replace(/\./g,"");}
function bareName(t){return normName(String(t||"").trim().replace(TITLE_RE,""));}
function matchNames(options,query,limit=8){
  const q=normName(query);
  const list=[...new Set(options)];
  if(!q) return list.sort((x,y)=>bareName(x).localeCompare(bareName(y),"th")).slice(0,limit);
  return list
    .map(n=>{
      const b=bareName(n),f=normName(n);
      const words=String(n).trim().replace(TITLE_RE,"").split(/\s+/).map(normName);
      // ตัวอักษรเดียว: เอาเฉพาะชื่อหรือนามสกุลที่ขึ้นต้นด้วยตัวนั้น / ตั้งแต่ 2 ตัว: ค้นทั้งชื่อ
      const score=b.startsWith(q)?0:words.some(w=>w.startsWith(q))?1:(q.length>1&&f.startsWith(q))?2:(q.length>1&&(b.includes(q)||f.includes(q)))?3:9;
      return{n,score};
    })
    .filter(x=>x.score<9)
    .sort((x,y)=>x.score-y.score||bareName(x.n).localeCompare(bareName(y.n),"th"))
    .slice(0,limit).map(x=>x.n);
}

/* ── ช่องพิมพ์ชื่อที่มีรายชื่อเด้งขึ้นมาให้เลือก ── */
function NameInput({value,onChange,options,placeholder,onAdd}){
  const [open,setOpen]=useState(false); const [added,setAdded]=useState("");
  const matches=matchNames(options,value).filter(n=>n!==value);
  const typed=String(value||"").trim();
  const canAdd=!!onAdd&&typed.length>1&&!options.some(n=>normName(n)===normName(typed));
  const ROW={display:"block",width:"100%",minHeight:44,padding:"10px 14px",textAlign:"left",border:"none",borderBottom:"1px solid #d6e4f5",background:"transparent",color:"#1f3047",fontFamily:"inherit",fontSize:15,cursor:"pointer"};
  return(
    <div style={{position:"relative"}}>
      <input value={value} onChange={e=>{onChange(e.target.value);setOpen(true);setAdded("");}}
        onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)}
        autoComplete="off" placeholder={placeholder}
        style={{...BASE_INP,width:"100%",boxSizing:"border-box",fontSize:16,paddingRight:40}}/>
      {value&&(
        <button type="button" aria-label="ล้างชื่อ" onMouseDown={e=>e.preventDefault()} onClick={()=>{onChange("");setOpen(true);}}
          style={{position:"absolute",right:4,top:"50%",transform:"translateY(-50%)",width:36,height:36,border:"none",background:"transparent",color:"#7f93ab",fontSize:18,cursor:"pointer"}}>×</button>
      )}
      {added&&<div style={{fontSize:12,color:"#128a6a",marginTop:4}}>✓ เพิ่ม “{added}” เข้ารายชื่อแล้ว</div>}
      {open&&(matches.length>0||canAdd)&&(
        <div style={{position:"absolute",left:0,right:0,top:"calc(100% + 4px)",zIndex:20,background:"#e6eef8",border:"1.5px solid #8aa0b8",borderRadius:10,boxShadow:"0 10px 30px rgba(0,0,0,0.5)",maxHeight:300,overflowY:"auto"}}>
          {matches.map(n=>(
            <button key={n} type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>{onChange(n);setOpen(false);}} style={ROW}>{n}</button>
          ))}
          {canAdd&&(
            <button type="button" onMouseDown={e=>e.preventDefault()}
              onClick={()=>{onAdd(typed);onChange(typed);setAdded(typed);setOpen(false);}}
              style={{...ROW,color:"#c26a1e",fontWeight:700,borderBottom:"none"}}>＋ เพิ่ม “{typed}” เข้ารายชื่อ</button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── การ์ดลงชื่อผู้ปฏิบัติงานเวรนี้ (กรอกโดย Para/ENP/RN) ── */
function RosterCard({selYear,selMonth,selDay,selShift}){
  const key=rosterKey(selYear,selMonth,selDay,selShift);
  const [form,setForm]=useState({}); const [exists,setExists]=useState(false);
  const [all,setAll]=useState({}); const [checks,setChecks]=useState({});
  const [open,setOpen]=useState(true);
  const [saving,setSaving]=useState(false); const [saved,setSaved]=useState(false);
  const [err,setErr]=useState(""); const [copied,setCopied]=useState(false);

  // ประวัติรายชื่อเวร (ใช้เติมทะเบียนรถล่าสุดให้)
  useEffect(()=>{const u=onValue(ref(db,"roster"),s=>setAll(s.val()||{}));return()=>u();},[]);

  // ข้อมูลเวรที่เลือก
  useEffect(()=>{
    setForm({});setExists(false);setSaved(false);setErr("");setCopied(false);
    const u=onValue(ref(db,`roster/${key}`),s=>{
      const v=s.val();
      if(v){setExists(true);setForm(v);setOpen(false);} else {setExists(false);setOpen(true);}
    });
    return()=>u();
  },[key]);

  // ผลเช็คของเวรนี้ (สำหรับบรรทัด ✅/❌ ในรายงาน)
  useEffect(()=>{
    setChecks({});
    const paths={
      para:`records/${recKey(selYear,selMonth,selDay,selShift,"para")}`,
      aemt:`records/${recKey(selYear,selMonth,selDay,selShift,"aemt")}`,
      driv:drivPath(selYear,selMonth,selDay,selShift),
    };
    const us=Object.entries(paths).map(([id,p])=>onValue(ref(db,p),s=>setChecks(c=>({...c,[id]:s.val()}))));
    return()=>us.forEach(u=>u());
  },[key]);

  // ยังไม่เคยลงเวรนี้ → เติมทะเบียนรถล่าสุดให้
  const lastVehicle=Object.keys(all).sort().reverse().map(k=>all[k]?.vehicle).find(Boolean)||"";
  useEffect(()=>{
    if(exists) return;
    setForm(f=>({...f,vehicle:f.vehicle||lastVehicle}));
  },[exists,lastVehicle]);

  const fields=rosterFieldsFor(selShift);
  // รายชื่อให้เลือก = เฉพาะรายชื่อที่เพิ่มไว้ในแท็บตั้งค่าเท่านั้น
  const staff=useStaff();
  const suggestions=Object.fromEntries(ROSTER_ALL.map(f=>[f.id,staff[FIELD_GROUP[f.id]]||[]]));

  function setField(id,v){setForm(p=>({...p,[id]:v}));setSaved(false);setCopied(false);}

  async function handleSave(){
    setSaving(true);setErr("");
    try{
      const data={};
      fields.forEach(f=>data[f.id]=(form[f.id]||"").trim());
      data.savedAt=new Date().toISOString();
      await set(ref(db,`roster/${key}`),data);
      setSaved(true);
    }catch(e){setErr("บันทึกไม่สำเร็จ: "+(e.message||e));}
    setSaving(false);
  }

  const expiry=useExpiry();
  const report=buildShiftReport(selYear,selMonth,selDay,selShift,form,checks,[...pendingReportLines(),...expiryReportLines(expiry)]);

  return(
    <Card style={{border:"1.5px solid #9fd3e6"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",userSelect:"none"}}>
        <span style={{fontSize:24}}>🫶</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:15,color:"#1f7f9a"}}>ผู้ปฏิบัติงานเวรนี้</div>
          <div style={{fontSize:12,color:exists?"#128a6a":"#d6456f"}}>{exists?"✓ ลงชื่อแล้ว — แตะเพื่อดู/แก้ไข":"ยังไม่ได้ลงชื่อ กรุณากรอกทุกเวร"}</div>
        </div>
        <span style={{fontSize:12,color:"#7f93ab"}}>{open?"▲":"▼"}</span>
      </div>

      {open&&(
        <div style={{marginTop:14}}>
          {selShift==="ดึก"&&<div style={{fontSize:12,color:"#6d5bd0",marginBottom:10}}>🌙 เวรดึก (00:15–08:14) นับเป็นของวันก่อนหน้า · ใช้ไม้ A1 / ไม้ A2</div>}
          {fields.map(f=>(
            <div key={f.id} style={{marginBottom:10}}>
              <div style={{fontSize:12,color:"#5d7290",marginBottom:4}}>{f.label}{f.optional&&<span style={{color:"#7f93ab"}}> · ถ้าเวรนี้ไม่มี เว้นว่างไว้</span>}</div>
              <NameInput value={form[f.id]||""} onChange={v=>setField(f.id,v)} options={suggestions[f.id]}
                placeholder={f.id==="vehicle"?"เช่น กษ 1139 นครศรีธรรมราช":"พิมพ์ชื่อ แล้วเลือกจากรายการ"}/>
            </div>
          ))}
          {err&&<div style={{fontSize:12,color:"#d6456f",marginBottom:8}}>⚠️ {err}</div>}
          <button onClick={handleSave} disabled={saving} style={{width:"100%",padding:"12px 0",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:15,fontWeight:800,background:saved?"#22a37f":saving?"#8aa0b8":"#4a86e8",color:"#fff"}}>
            {saving?"⏳ กำลังบันทึก...":saved?"✅ บันทึกรายชื่อแล้ว":"✨ บันทึกรายชื่อผู้ปฏิบัติงาน"}
          </button>
        </div>
      )}

      {(exists||saved)&&(
        <div style={{marginTop:14}}>
          <div style={{fontSize:13,fontWeight:700,color:"#5d7290",marginBottom:8}}>💌 ข้อความรายงานเวร (สถานะเช็คอัปเดตอัตโนมัติ)</div>
          <div style={{background:"#f1f7ff",borderRadius:8,padding:14,fontSize:13,lineHeight:1.8,color:"#2b3d55",whiteSpace:"pre-wrap",marginBottom:10}}>{report}</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>copyToClipboard(report).then(()=>setCopied(true))} style={{flex:1,padding:"10px 0",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:"#6a8df5",color:"#fff"}}>
              {copied?"✓ คัดลอกแล้ว":"📋 คัดลอกข้อความ"}
            </button>
            <a href={lineShareUrl(report)} target="_blank" rel="noopener noreferrer" style={{flex:1,padding:"10px 0",borderRadius:8,textAlign:"center",textDecoration:"none",fontSize:13,fontWeight:700,background:"#06c755",color:"#fff"}}>
              ส่งไป LINE
            </a>
          </div>
        </div>
      )}
    </Card>
  );
}

function ParaCheckPage({selYear,selMonth,selDay,selShift}){
  const role=ROLE_MAP["para"]; const shiftMeta=SHIFT_META[selShift];
  const key=recKey(selYear,selMonth,selDay,selShift,"para");
  const dbRef=ref(db,`records/${key}`);
  const [myName,setMyName]=useState(""); const [checked,setChecked]=useState({});
  const [note,setNote]=useState(""); const [expDates,setExpDates]=useState({});
  const [saved,setSaved]=useState(false); const [saving,setSaving]=useState(false);
  const [loading,setLoading]=useState(true); const [warn,setWarn]=useState(null);
  const [noteError,setNoteError]=useState(false); const [showSuccess,setShowSuccess]=useState(false);

  const totalItems=PARA_GROUPS.reduce((s,g)=>s+g.items.length,0);
  const doneItems=PARA_GROUPS.reduce((s,g)=>s+g.items.filter(item=>checked[item.id]).length,0);

  useEffect(()=>{
    setLoading(true);
    if(isFutureDate(selYear,selMonth,selDay)) setWarn("future"); else setWarn(null);
    const u=onValue(dbRef,snap=>{
      const data=snap.val();
      setMyName("");setChecked({});setNote("");setExpDates({});
      if(data&&data.savedAt&&!isFutureDate(selYear,selMonth,selDay)) setWarn("duplicate");
      setLoading(false);setSaved(false);
    });
    return()=>u();
  },[key]);

  function toggle(id){setChecked(p=>({...p,[id]:!p[id]}));setSaved(false);}

  async function handleSave(){
    if(!note.trim()){setNoteError(true);return;}
    setNoteError(false);setSaving(true);
    const paraTotal=PARA_GROUPS.reduce((s,g)=>s+g.items.length,0);
    const paraDone=PARA_GROUPS.reduce((s,g)=>s+g.items.filter(item=>checked[item.id]).length,0);
    await set(dbRef,{name:myName,checked,note,expDates,roleId:"para",total:roleTotal("para"),savedAt:new Date().toISOString()});
    setSaving(false);setSaved(true);setWarn("duplicate");setTimeout(()=>setSaved(false),2500);
    if(paraDone===paraTotal&&note.trim()) setShowSuccess(true);
  }

  function getExpDays(id){ return daysUntilExp(expDates[id]||""); }
  function setExp(id,val){ setExpDates(p=>({...p,[id]:val})); setSaved(false); }

  if(loading) return <div style={{textAlign:"center",padding:60,color:"#7f93ab"}}><div style={{fontSize:32,marginBottom:12}}>⏳</div>กำลังโหลด...</div>;

  return(
    <div>
      {showSuccess&&<SuccessScreen myName={myName} role={role} selDay={selDay} selMonth={selMonth} selYear={selYear} selShift={selShift} totalItems={totalItems} note={note} savedAt={new Date().toISOString()} onClose={()=>setShowSuccess(false)}/>}
      {/* date badge */}
      <div style={{background:shiftMeta.accent+"20",border:`1.5px solid ${shiftMeta.accent}44`,borderRadius:10,padding:"10px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:13,color:shiftMeta.accent}}>{shiftMeta.icon} {selDay} {MONTH_NAMES[selMonth]} {selYear+543} · เวร{selShift}</span>
        {saved&&<span style={{marginLeft:"auto",fontSize:12,color:"#128a6a"}}>✓ Sync ☁️</span>}
      </div>

      {warn==="future"&&(
        <div style={{background:"rgba(226,92,134,0.12)",border:"1.5px solid #e25c8666",borderRadius:10,padding:"12px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div><div style={{fontSize:14,fontWeight:700,color:"#d6456f"}}>วันที่เป็นอนาคต!</div><div style={{fontSize:12,color:"#5d7290"}}>กรุณาตรวจสอบวันที่ก่อนบันทึกค่ะ</div></div>
        </div>
      )}
      {warn==="duplicate"&&!saved&&(
        <div style={{background:"rgba(232,137,58,0.12)",border:"1.5px solid #c26a1e66",borderRadius:10,padding:"12px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:20}}>📋</span>
          <div><div style={{fontSize:14,fontWeight:700,color:"#c26a1e"}}>เวรนี้มีข้อมูลอยู่แล้ว</div><div style={{fontSize:12,color:"#5d7290"}}>ถ้าบันทึกใหม่จะทับข้อมูลเดิมค่ะ</div></div>
        </div>
      )}

      {/* name */}
      <Card>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <span style={{fontSize:26}}>{role.icon}</span>
          <div><div style={{fontWeight:800,fontSize:15,color:role.color}}>{role.label}</div><div style={{fontSize:12,color:"#7f93ab"}}>ผู้รับผิดชอบตรวจเช็ค</div></div>
        </div>
        <input value={myName} onChange={e=>{setMyName(e.target.value);setSaved(false);}} placeholder="ชื่อ-นามสกุลของคุณ" style={BASE_INP}/>
      </Card>

      {/* ผู้ปฏิบัติงานเวรนี้ */}
      <RosterCard selYear={selYear} selMonth={selMonth} selDay={selDay} selShift={selShift}/>

      {/* overall progress */}
      <Card style={{paddingBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:700,color:"#5d7290"}}>ความคืบหน้าทั้งหมด</span>
          <span style={{fontSize:13,color:doneItems===totalItems&&totalItems>0?"#128a6a":"#e8893a"}}>{doneItems}/{totalItems}</span>
        </div>
        <div style={{height:8,background:"#e6eef8",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:99,transition:"width 0.3s",background:`linear-gradient(90deg,${role.color},#128a6a)`,width:`${totalItems?(doneItems/totalItems)*100:0}%`}}/>
        </div>
      </Card>

      {/* groups */}
      {PARA_GROUPS.map(group=>{
        const groupDone=group.items.filter(item=>checked[item.id]).length;
        return(
          <Card key={group.id} style={{border:`1.5px solid ${group.color}33`}}>
            {/* group header */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <span style={{fontSize:22}}>{group.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:800,color:group.color}}>{group.label}</div>
              </div>
              <span style={{fontSize:12,color:groupDone===group.items.length?"#128a6a":"#e8893a",fontWeight:700}}>{groupDone}/{group.items.length}</span>
            </div>

            {/* items */}
            {group.items.map(item=>{
              const ck=!!checked[item.id];
              return(
                <div key={item.id}>
                  <label style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:8,cursor:"pointer",marginBottom:4,background:ck?"rgba(18,160,120,0.08)":"transparent",transition:"background 0.15s"}}>
                    <input type="checkbox" checked={ck} onChange={()=>toggle(item.id)} style={{width:18,height:18,accentColor:group.color,cursor:"pointer",flexShrink:0}}/>
                    <span style={{fontSize:14,color:ck?"#128a6a":"#3b4f69",flex:1}}>{item.label}</span>
                    <PendingTag itemId={item.id} label={item.label}/>
                    {ck&&<span style={{color:"#128a6a",fontSize:13}}>✓</span>}
                  </label>

                  {/* Expiry date field */}
                  {item.hasExp&&ck&&(()=>{
                    const expVal=expDates[item.id]||"";
                    const days=daysUntilExp(expVal);
                    return(
                      <div style={{marginLeft:42,marginBottom:10,padding:"10px 14px",background:"#f6faff",borderRadius:8,border:"1px solid #e9f1fb"}}>
                        <div style={{fontSize:12,color:"#5d7290",marginBottom:6}}>🗓️ วันหมดอายุ (Exp. Date)</div>
                        <input type="date" value={expVal} onChange={e=>setExp(item.id,e.target.value)}
                          style={{...BASE_INP,width:"auto",padding:"8px 12px",fontSize:13,colorScheme:"dark"}}/>
                        {expVal&&(
                          <div style={{marginTop:6,fontSize:12,fontWeight:700,color:ettExpColor(days)}}>
                            {ettExpText(days)}
                          </div>
                        )}
                        {days!==null&&days<=30&&days>=0&&(
                          <div style={{marginTop:6,padding:"8px 12px",background:"rgba(232,137,58,0.15)",borderRadius:6,fontSize:12,color:"#c26a1e"}}>
                            ⚠️ กรุณาแจ้งหัวหน้าเพื่อเบิกของใหม่
                          </div>
                        )}
                        {days!==null&&days<0&&(
                          <div style={{marginTop:6,padding:"8px 12px",background:"rgba(226,92,134,0.15)",borderRadius:6,fontSize:12,color:"#d6456f"}}>
                            🚨 หมดอายุแล้ว! ห้ามใช้ กรุณาเบิกทันที
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </Card>
        );
      })}

      {/* mandatory note */}
      <Card style={{border:noteError?"1.5px solid #e25c86":"undefined"}}>
        <div style={{fontSize:13,fontWeight:700,color:noteError?"#d6456f":"#5d7290",marginBottom:6}}>
          📝 เขียนปัญหาหรือข้อเสนอแนะทุกครั้ง หากไม่มีเขียน "ไม่มี" ได้เลย
          <span style={{color:"#e25c86"}}> *</span>
        </div>
        {noteError&&<div style={{fontSize:12,color:"#d6456f",marginBottom:8}}>⚠️ กรุณากรอกข้อมูลก่อนบันทึกค่ะ</div>}
        <textarea value={note} onChange={e=>{setNote(e.target.value);setSaved(false);setNoteError(false);}}
          placeholder='เช่น "ไม่มี" หรือ "Defibrillator ใกล้หมดแบต"...'
          rows={3} style={{...BASE_INP,resize:"vertical",lineHeight:1.7,border:noteError?"1.5px solid #e25c86":BASE_INP.border}}/>
      </Card>

      <button onClick={handleSave} disabled={saving} style={{width:"100%",padding:"16px 0",borderRadius:12,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:16,fontWeight:800,background:saved?"#22a37f":saving?"#8aa0b8":`linear-gradient(90deg,${role.color},${shiftMeta.accent})`,color:"#fff",boxShadow:`0 4px 20px ${role.color}44`,transition:"all 0.3s"}}>
        {saving?"⏳ กำลัง Sync...":saved?"✅ บันทึก & Sync แล้ว!":"✨ บันทึกการเช็ค"}
      </button>
    </div>
  );
}


/* ── AEMT grouped items ── */
let AEMT_GROUPS = [
  {
    id:"airway", label:"1. Airway and Breathing", icon:"💨", color:"#6a8df5",
    items:[
      {id:"opa",        label:"Oropharyngeal airway (ผู้ใหญ่ 3 อัน, เด็ก 4 อัน)",    hasExp:false},
      {id:"nasal",      label:"Nasal cannula (ผู้ใหญ่, เด็ก 2 อัน)",                  hasExp:false},
      {id:"maskreservoir", label:"Mask c reservoir bag (ผู้ใหญ่, เด็ก)",              hasExp:false},
      {id:"collarmask", label:"Collar mask (ผู้ใหญ่, เด็ก)",                          hasExp:false},
      {id:"nebu",       label:"Set พ่นยา (ผู้ใหญ่, เด็ก)",                            hasExp:false},
      {id:"suction",    label:"Suction (เครื่อง, สาย, ความสะอาด)",                    hasExp:false},
      {id:"suctiontubes",label:"สาย Suction (ดำ, ขาว, เขียว, ส้ม, แดง)",             hasExp:false},
      {id:"o2bottle",   label:"Oxygen Humidifier Bottle",                              hasExp:false},
    ]
  },
  {
    id:"circulation", label:"2. Circulation", icon:"🩸", color:"#e25c86",
    items:[
      {id:"tubelab",    label:"Tube Lab (5 tube+H/C ผู้ใหญ่, เด็ก)",                  hasExp:false},
      {id:"tourniquet", label:"Tourniquet ห้ามเลือด",                                  hasExp:false},
      {id:"pelvicbinder",label:"Pelvic binder",                                       hasExp:false},
      {id:"nssirrig",   label:"NSS Irrigation 1,000 ml",                              hasExp:false},
      {id:"iodine",     label:"Iodine",                                               hasExp:false},
      {id:"alcohol",    label:"Alcohol ล้างแผล",                                       hasExp:false},
      {id:"dressingset",label:"สำลี, ไม้พันสำลี, Gauze, Top gauze (ชุดทำแผล)",        hasExp:false},
      {id:"elastic",    label:"Elastic bandage (2, 4, 6)",                            hasExp:false},
      {id:"hardcollar", label:"Hard collar (ผู้ใหญ่, เด็ก)",                          hasExp:false},
      {id:"vaccuum",    label:"Full body vacuum mattress",                            hasExp:false},
      {id:"ked",        label:"KED",                                                  hasExp:false},
    ]
  },
  {
    id:"equipment", label:"3. Equipment", icon:"🔧", color:"#e8893a",
    items:[
      {id:"delivery",   label:"Set คลอด",                                             hasExp:false},
      {id:"lucas",      label:"LUCAS (แบต)",                                           hasExp:false},
      {id:"glucometer", label:"Glucometer and Test strips",                           hasExp:false},
      {id:"thermo",     label:"Thermometer",                                          hasExp:false},
      {id:"penlight",   label:"Penlight",                                             hasExp:false},
      {id:"broselow",   label:"Broselow tap emergency pediatrics",                    hasExp:false},
      {id:"reddot",     label:"Reddot",                                               hasExp:false},
      {id:"scissors",   label:"กรรไกร",                                               hasExp:false},
      {id:"mci",        label:"ชุด MCI (กระเป๋า Tag, เทป, กรวย)",                    hasExp:false},
      {id:"redbag",      label:"ถุงแดง",                                                  hasExp:false},
    ]
  },
  {
    id:"ppe", label:"4. PPE", icon:"🦺", color:"#2bb594",
    items:[
      {id:"glove_disp", label:"ถุงมือ Disposed (S, M)",                               hasExp:false},
      {id:"glove_ster", label:"ถุงมือ Sterile (6, 6.5, 7, 7.5)",                     hasExp:false},
      {id:"faceshield", label:"Face shield",                                          hasExp:false},
      {id:"cap",        label:"หมวกคลุมเขียว",                                         hasExp:false},
      {id:"gown",       label:"Gown ฟ้า",                                              hasExp:false},
      {id:"mask",       label:"Mask (N95, Surgical)",                                 hasExp:false},
    ]
  },
];


/* ── พนักงานขับรถ grouped items ── */
let DRIV_GROUPS = [
  {
    id:"equipment", label:"1. อุปกรณ์ในรถ", icon:"🚑", color:"#2bb594",
    items:[
      {id:"infect_bin",   label:"ถังขยะติดเชื้อ",                hasExp:false, hasNote:false},
      {id:"needle_bin",   label:"ถังทิ้งเข็ม",                   hasExp:false, hasNote:false},
      {id:"o2_main1",     label:"ถังออกซิเจนใหญ่ ถัง 1",         hasExp:false, hasO2:true},
      {id:"o2_main2",     label:"ถังออกซิเจนใหญ่ ถัง 2",         hasExp:false, hasO2:true},
      {id:"o2_portable",  label:"ถังออกซิเจนเล็กพกพา",           hasExp:false, hasO2:true},
    ]
  },
  {
    id:"transfer", label:"2. อุปกรณ์ยกเคลื่อนย้าย", icon:"🛗", color:"#6a8df5",
    items:[
      {id:"stairchair",   label:"เก้าอี้ Stair chair",            hasExp:false, hasNote:false},
      {id:"longboard",    label:"กระดาน Long spinal board",        hasExp:false, hasNote:false},
      {id:"headimmo",     label:"หมอน Head immobilizer",           hasExp:false, hasNote:false},
      {id:"belt3",        label:"Belt 3 เส้น",                    hasExp:false, hasNote:false},
    ]
  },
  {
    id:"car", label:"3. ความพร้อมของรถ", icon:"🚗", color:"#e8893a",
    items:[
      {id:"engine_oil",   label:"น้ำมันเครื่อง",                  hasExp:false, hasNote:false},
      {id:"fuel",         label:"น้ำมันเชื้อเพลิง",               hasExp:false, hasNote:false},
      {id:"tire",         label:"ลมยาง",                          hasExp:false, hasNote:false},
      {id:"lights",       label:"ไฟรอบคัน",                       hasExp:false, hasNote:false},
      {id:"spotlight",    label:"ไฟ Spotlight",                   hasExp:false, hasNote:false},
      {id:"coolant",      label:"น้ำหล่อเย็น",                    hasExp:false, hasNote:false},
      {id:"wiper",        label:"น้ำปัดน้ำฝน",                    hasExp:false, hasNote:false},
      {id:"battery",      label:"แบตเตอรี่",                       hasExp:false, hasNote:false},
      {id:"clean",        label:"ความสะอาด",                       hasExp:false, hasNote:false},
      {id:"scratch",      label:"รอยเฉี่ยวรอบคัน",                hasExp:false, hasNote:true},
    ]
  },
];

/* ── พนักงานขับรถ Check Page ── */
/* ── รายการอุปกรณ์แก้ได้ในแอป: ถ้ามีใน Firebase (checklists/{role}) ใช้อันนั้น ไม่มีก็ใช้ค่าเริ่มต้นในโค้ด ── */
const clone=x=>JSON.parse(JSON.stringify(x));
const DEFAULT_CHECKLISTS={para:clone(PARA_GROUPS),aemt:clone(AEMT_GROUPS),driv:clone(DRIV_GROUPS)};
function normalizeChecklist(v){
  if(!Array.isArray(v)&&v&&typeof v==="object") v=Object.values(v);
  if(!Array.isArray(v)) return null;
  const groups=v.map(g=>{
    if(!g||typeof g!=="object") return null;
    let items=g.items; if(items&&!Array.isArray(items)) items=Object.values(items);
    items=(items||[]).filter(i=>i&&i.id&&String(i.label||"").trim()).map(i=>({...i,label:String(i.label).trim()}));
    return {id:String(g.id||"g_"+Math.random().toString(36).slice(2,8)),label:String(g.label||"หมวดใหม่"),icon:g.icon||"📦",color:g.color||"#4a86e8",items};
  }).filter(Boolean);
  return groups.length?groups:null;
}
function applyChecklists(data){
  const d=data||{};
  PARA_GROUPS=normalizeChecklist(d.para)||clone(DEFAULT_CHECKLISTS.para);
  AEMT_GROUPS=normalizeChecklist(d.aemt)||clone(DEFAULT_CHECKLISTS.aemt);
  DRIV_GROUPS=normalizeChecklist(d.driv)||clone(DEFAULT_CHECKLISTS.driv);
}
function currentGroups(roleId){return roleId==="para"?PARA_GROUPS:roleId==="aemt"?AEMT_GROUPS:DRIV_GROUPS;}

function DrivCheckPage({selYear,selMonth,selDay,selShift}){
  const role=ROLE_MAP["driv"]; const shiftMeta=SHIFT_META[selShift];
  const key=recKey(selYear,selMonth,selDay,selShift,"driv");
  const dbRef=ref(db,`records/${key}`);
  const [myName,setMyName]=useState(""); const [checked,setChecked]=useState({});
  const [note,setNote]=useState(""); const [o2Levels,setO2Levels]=useState({});
  const [scratchNote,setScratchNote]=useState("");
  const [saved,setSaved]=useState(false); const [saving,setSaving]=useState(false);
  const [loading,setLoading]=useState(true); const [warn,setWarn]=useState(null);
  const [noteError,setNoteError]=useState(false); const [showSuccess,setShowSuccess]=useState(false);

  const totalItems=DRIV_GROUPS.reduce((s,g)=>s+g.items.length,0);
  const doneItems=DRIV_GROUPS.reduce((s,g)=>s+g.items.filter(item=>checked[item.id]).length,0);

  useEffect(()=>{
    setLoading(true);
    if(isFutureDate(selYear,selMonth,selDay)) setWarn("future"); else setWarn(null);
    const u=onValue(dbRef,snap=>{
      const data=snap.val();
      setMyName("");setChecked({});setNote("");setO2Levels({});setScratchNote("");
      if(data&&data.savedAt&&!isFutureDate(selYear,selMonth,selDay)) setWarn("duplicate");
      setLoading(false);setSaved(false);
    });
    return()=>u();
  },[key]);

  function toggle(id){setChecked(p=>({...p,[id]:!p[id]}));setSaved(false);}
  function setO2(id,val){setO2Levels(p=>({...p,[id]:val}));setSaved(false);}

  async function handleSave(){
    if(!note.trim()){setNoteError(true);return;}
    setNoteError(false);setSaving(true);
    const drivTotal=DRIV_GROUPS.reduce((s,g)=>s+g.items.length,0);
    const drivDone=DRIV_GROUPS.reduce((s,g)=>s+g.items.filter(item=>checked[item.id]).length,0);
    await set(dbRef,{name:myName,checked,note,o2Levels,scratchNote,roleId:"driv",total:roleTotal("driv"),savedAt:new Date().toISOString()});
    setSaving(false);setSaved(true);setWarn("duplicate");setTimeout(()=>setSaved(false),2500);
    if(drivDone===drivTotal&&note.trim()) setShowSuccess(true);
  }

  if(loading) return <div style={{textAlign:"center",padding:60,color:"#7f93ab"}}><div style={{fontSize:32,marginBottom:12}}>⏳</div>กำลังโหลด...</div>;

  return(
    <div>
      {showSuccess&&<SuccessScreen myName={myName} role={role} selDay={selDay} selMonth={selMonth} selYear={selYear} selShift={selShift} totalItems={totalItems} note={note} savedAt={new Date().toISOString()} onClose={()=>setShowSuccess(false)}/>}
      <div style={{background:shiftMeta.accent+"20",border:`1.5px solid ${shiftMeta.accent}44`,borderRadius:10,padding:"10px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:13,color:shiftMeta.accent}}>{shiftMeta.icon} {selDay} {MONTH_NAMES[selMonth]} {selYear+543} · เวร{selShift}</span>
        {saved&&<span style={{marginLeft:"auto",fontSize:12,color:"#128a6a"}}>✓ Sync ☁️</span>}
      </div>
      {warn==="future"&&(
        <div style={{background:"rgba(226,92,134,0.12)",border:"1.5px solid #e25c8666",borderRadius:10,padding:"12px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div><div style={{fontSize:14,fontWeight:700,color:"#d6456f"}}>วันที่เป็นอนาคต!</div><div style={{fontSize:12,color:"#5d7290"}}>กรุณาตรวจสอบวันที่ก่อนบันทึกค่ะ</div></div>
        </div>
      )}
      {warn==="duplicate"&&!saved&&(
        <div style={{background:"rgba(232,137,58,0.12)",border:"1.5px solid #c26a1e66",borderRadius:10,padding:"12px 16px",marginBottom:14}}>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:myName?"8px":"0"}}>
            <span style={{fontSize:20}}>⚠️</span>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#c26a1e"}}>เวรนี้มีข้อมูลอยู่แล้ว!</div>
              <div style={{fontSize:12,color:"#5d7290"}}>ถ้ากรอกชื่อและบันทึกใหม่จะทับข้อมูลเดิมค่ะ</div>
            </div>
          </div>
        </div>
      )}
      <Card>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <span style={{fontSize:26}}>{role.icon}</span>
          <div><div style={{fontWeight:800,fontSize:15,color:role.color}}>{role.label}</div><div style={{fontSize:12,color:"#7f93ab"}}>ผู้รับผิดชอบตรวจเช็ค</div></div>
        </div>
        <input value={myName} onChange={e=>{setMyName(e.target.value);setSaved(false);}} placeholder="ชื่อ-นามสกุลของคุณ" style={BASE_INP}/>
      </Card>
      <Card style={{paddingBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:700,color:"#5d7290"}}>ความคืบหน้าทั้งหมด</span>
          <span style={{fontSize:13,color:doneItems===totalItems&&totalItems>0?"#128a6a":"#e8893a"}}>{doneItems}/{totalItems}</span>
        </div>
        <div style={{height:8,background:"#e6eef8",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:99,transition:"width 0.3s",background:`linear-gradient(90deg,${role.color},#128a6a)`,width:`${totalItems?(doneItems/totalItems)*100:0}%`}}/>
        </div>
      </Card>

      {DRIV_GROUPS.map(group=>{
        const groupDone=group.items.filter(item=>checked[item.id]).length;
        return(
          <Card key={group.id} style={{border:`1.5px solid ${group.color}33`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <span style={{fontSize:22}}>{group.icon}</span>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:800,color:group.color}}>{group.label}</div></div>
              <span style={{fontSize:12,color:groupDone===group.items.length?"#128a6a":"#e8893a",fontWeight:700}}>{groupDone}/{group.items.length}</span>
            </div>
            {group.items.map(item=>{
              const ck=!!checked[item.id];
              const o2Val=o2Levels[item.id]||"";
              const o2Num=parseInt(o2Val)||0;
              const o2Low=o2Val&&o2Num<500;
              return(
                <div key={item.id}>
                  <label style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:8,cursor:"pointer",marginBottom:4,background:ck?"rgba(18,160,120,0.08)":"transparent",transition:"background 0.15s"}}>
                    <input type="checkbox" checked={ck} onChange={()=>toggle(item.id)} style={{width:18,height:18,accentColor:group.color,cursor:"pointer",flexShrink:0}}/>
                    <span style={{fontSize:14,color:ck?"#128a6a":"#3b4f69",flex:1}}>{item.label}</span>
                    <PendingTag itemId={item.id} label={item.label}/>
                    {ck&&!item.hasO2&&<span style={{color:"#128a6a",fontSize:13}}>✓</span>}
                  </label>

                  {/* O2 level input */}
                  {item.hasO2&&ck&&(
                    <div style={{marginLeft:42,marginBottom:10,padding:"10px 14px",background:"#f6faff",borderRadius:8,border:`1px solid ${o2Low?"#e25c8666":"#e9f1fb"}`}}>
                      <div style={{fontSize:12,color:"#5d7290",marginBottom:6}}>💨 ปริมาณ O₂ ที่เหลือ (PSI หรือ Bar)</div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <input type="number" min="0" max="2000" value={o2Val}
                          onChange={e=>setO2(item.id,e.target.value)}
                          placeholder="เช่น 1500"
                          style={{...BASE_INP,width:140,padding:"8px 12px",fontSize:14}}/>
                        <span style={{fontSize:13,color:"#7f93ab"}}>PSI</span>
                      </div>
                      {o2Val&&(
                        <div style={{marginTop:6,fontSize:12,fontWeight:700,color:o2Low?"#e25c86":"#128a6a"}}>
                          {o2Low?"🚨 ออกซิเจนต่ำกว่า 500 PSI! กรุณาเติมก่อนออกปฏิบัติการ":"✓ ปริมาณออกซิเจนปกติ"}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Scratch note */}
                  {item.hasNote&&ck&&(
                    <div style={{marginLeft:42,marginBottom:10,padding:"10px 14px",background:"#f6faff",borderRadius:8,border:"1px solid #e9f1fb"}}>
                      <div style={{fontSize:12,color:"#5d7290",marginBottom:6}}>📝 ระบุตำแหน่งรอยเฉี่ยว (ถ้ามี)</div>
                      <input value={scratchNote} onChange={e=>{setScratchNote(e.target.value);setSaved(false);}}
                        placeholder='เช่น "ไม่มี" หรือ "ประตูหน้าซ้ายมีรอยขีด"'
                        style={{...BASE_INP,padding:"8px 12px",fontSize:13}}/>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        );
      })}

      <Card style={{border:noteError?"1.5px solid #e25c86":"undefined"}}>
        <div style={{fontSize:13,fontWeight:700,color:noteError?"#d6456f":"#5d7290",marginBottom:6}}>
          📝 เขียนปัญหาหรือข้อเสนอแนะทุกครั้ง หากไม่มีเขียน "ไม่มี" ได้เลย
          <span style={{color:"#e25c86"}}> *</span>
        </div>
        {noteError&&<div style={{fontSize:12,color:"#d6456f",marginBottom:8}}>⚠️ กรุณากรอกข้อมูลก่อนบันทึกค่ะ</div>}
        <textarea value={note} onChange={e=>{setNote(e.target.value);setSaved(false);setNoteError(false);}}
          placeholder='เช่น "ไม่มี" หรือ "น้ำมันเชื้อเพลิงเหลือน้อย"'
          rows={3} style={{...BASE_INP,resize:"vertical",lineHeight:1.7,border:noteError?"1.5px solid #e25c86":BASE_INP.border}}/>
      </Card>

      <button onClick={handleSave} disabled={saving} style={{width:"100%",padding:"16px 0",borderRadius:12,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:16,fontWeight:800,background:saved?"#22a37f":saving?"#8aa0b8":`linear-gradient(90deg,${role.color},${shiftMeta.accent})`,color:"#fff",boxShadow:`0 4px 20px ${role.color}44`,transition:"all 0.3s"}}>
        {saving?"⏳ กำลัง Sync...":saved?"✅ บันทึก & Sync แล้ว!":"✨ บันทึกการเช็ค"}
      </button>
    </div>
  );
}

/* ── AEMT Check Page ── */
function AemtCheckPage({selYear,selMonth,selDay,selShift}){
  const role=ROLE_MAP["aemt"]; const shiftMeta=SHIFT_META[selShift];
  const key=recKey(selYear,selMonth,selDay,selShift,"aemt");
  const dbRef=ref(db,`records/${key}`);
  const [myName,setMyName]=useState(""); const [checked,setChecked]=useState({});
  const [note,setNote]=useState(""); const [expDates,setExpDates]=useState({});
  const [saved,setSaved]=useState(false); const [saving,setSaving]=useState(false);
  const [loading,setLoading]=useState(true); const [warn,setWarn]=useState(null);
  const [noteError,setNoteError]=useState(false); const [showSuccess,setShowSuccess]=useState(false);

  const totalItems=AEMT_GROUPS.reduce((s,g)=>s+g.items.length,0);
  const doneItems=AEMT_GROUPS.reduce((s,g)=>s+g.items.filter(item=>checked[item.id]).length,0);

  useEffect(()=>{
    setLoading(true);
    if(isFutureDate(selYear,selMonth,selDay)) setWarn("future"); else setWarn(null);
    const u=onValue(dbRef,snap=>{
      const data=snap.val();
      setMyName("");setChecked({});setNote("");setExpDates({});
      if(data&&data.savedAt&&!isFutureDate(selYear,selMonth,selDay)) setWarn("duplicate");
      setLoading(false);setSaved(false);
    });
    return()=>u();
  },[key]);

  function toggle(id){setChecked(p=>({...p,[id]:!p[id]}));setSaved(false);}
  function setExp(id,val){setExpDates(p=>({...p,[id]:val}));setSaved(false);}

  async function handleSave(){
    if(!note.trim()){setNoteError(true);return;}
    setNoteError(false);setSaving(true);
    await set(dbRef,{name:myName,checked,note,expDates,roleId:"aemt",total:roleTotal("aemt"),savedAt:new Date().toISOString()});
    setSaving(false);setSaved(true);setWarn("duplicate");setTimeout(()=>setSaved(false),2500);
    if(doneItems===totalItems&&note.trim()) setShowSuccess(true);
  }

  if(loading) return <div style={{textAlign:"center",padding:60,color:"#7f93ab"}}><div style={{fontSize:32,marginBottom:12}}>⏳</div>กำลังโหลด...</div>;

  return(
    <div>
      {showSuccess&&<SuccessScreen myName={myName} role={role} selDay={selDay} selMonth={selMonth} selYear={selYear} selShift={selShift} totalItems={totalItems} note={note} savedAt={new Date().toISOString()} onClose={()=>setShowSuccess(false)}/>}
      <div style={{background:shiftMeta.accent+"20",border:`1.5px solid ${shiftMeta.accent}44`,borderRadius:10,padding:"10px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:13,color:shiftMeta.accent}}>{shiftMeta.icon} {selDay} {MONTH_NAMES[selMonth]} {selYear+543} · เวร{selShift}</span>
        {saved&&<span style={{marginLeft:"auto",fontSize:12,color:"#128a6a"}}>✓ Sync ☁️</span>}
      </div>
      {warn==="future"&&(
        <div style={{background:"rgba(226,92,134,0.12)",border:"1.5px solid #e25c8666",borderRadius:10,padding:"12px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div><div style={{fontSize:14,fontWeight:700,color:"#d6456f"}}>วันที่เป็นอนาคต!</div><div style={{fontSize:12,color:"#5d7290"}}>กรุณาตรวจสอบวันที่ก่อนบันทึกค่ะ</div></div>
        </div>
      )}
      {warn==="duplicate"&&!saved&&(
        <div style={{background:"rgba(232,137,58,0.12)",border:"1.5px solid #c26a1e66",borderRadius:10,padding:"12px 16px",marginBottom:14}}>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:myName?"8px":"0"}}>
            <span style={{fontSize:20}}>⚠️</span>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#c26a1e"}}>เวรนี้มีข้อมูลอยู่แล้ว!</div>
              <div style={{fontSize:12,color:"#5d7290"}}>ถ้ากรอกชื่อและบันทึกใหม่จะทับข้อมูลเดิมค่ะ</div>
            </div>
          </div>
        </div>
      )}
      <Card>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <span style={{fontSize:26}}>{role.icon}</span>
          <div><div style={{fontWeight:800,fontSize:15,color:role.color}}>{role.label}</div><div style={{fontSize:12,color:"#7f93ab"}}>ผู้รับผิดชอบตรวจเช็ค</div></div>
        </div>
        <input value={myName} onChange={e=>{setMyName(e.target.value);setSaved(false);}} placeholder="ชื่อ-นามสกุลของคุณ" style={BASE_INP}/>
      </Card>
      <Card style={{paddingBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:700,color:"#5d7290"}}>ความคืบหน้าทั้งหมด</span>
          <span style={{fontSize:13,color:doneItems===totalItems&&totalItems>0?"#128a6a":"#e8893a"}}>{doneItems}/{totalItems}</span>
        </div>
        <div style={{height:8,background:"#e6eef8",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:99,transition:"width 0.3s",background:`linear-gradient(90deg,${role.color},#128a6a)`,width:`${totalItems?(doneItems/totalItems)*100:0}%`}}/>
        </div>
      </Card>
      {AEMT_GROUPS.map(group=>{
        const groupDone=group.items.filter(item=>checked[item.id]).length;
        return(
          <Card key={group.id} style={{border:`1.5px solid ${group.color}33`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <span style={{fontSize:22}}>{group.icon}</span>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:800,color:group.color}}>{group.label}</div></div>
              <span style={{fontSize:12,color:groupDone===group.items.length?"#128a6a":"#e8893a",fontWeight:700}}>{groupDone}/{group.items.length}</span>
            </div>
            {group.items.map(item=>{
              const ck=!!checked[item.id];
              return(
                <div key={item.id}>
                  <label style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:8,cursor:"pointer",marginBottom:4,background:ck?"rgba(18,160,120,0.08)":"transparent",transition:"background 0.15s"}}>
                    <input type="checkbox" checked={ck} onChange={()=>toggle(item.id)} style={{width:18,height:18,accentColor:group.color,cursor:"pointer",flexShrink:0}}/>
                    <span style={{fontSize:14,color:ck?"#128a6a":"#3b4f69",flex:1}}>{item.label}</span>
                    <PendingTag itemId={item.id} label={item.label}/>
                    {ck&&<span style={{color:"#128a6a",fontSize:13}}>✓</span>}
                  </label>
                  {item.hasExp&&ck&&(()=>{
                    const expVal=expDates[item.id]||"";
                    const days=daysUntilExp(expVal);
                    return(
                      <div style={{marginLeft:42,marginBottom:10,padding:"10px 14px",background:"#f6faff",borderRadius:8,border:"1px solid #e9f1fb"}}>
                        <div style={{fontSize:12,color:"#5d7290",marginBottom:6}}>🗓️ วันหมดอายุ (Exp. Date)</div>
                        <input type="date" value={expVal} onChange={e=>setExp(item.id,e.target.value)}
                          style={{...BASE_INP,width:"auto",padding:"8px 12px",fontSize:13,colorScheme:"dark"}}/>
                        {expVal&&<div style={{marginTop:6,fontSize:12,fontWeight:700,color:ettExpColor(days)}}>{ettExpText(days)}</div>}
                        {days!==null&&days<=30&&days>=0&&(
                          <div style={{marginTop:6,padding:"8px 12px",background:"rgba(232,137,58,0.15)",borderRadius:6,fontSize:12,color:"#c26a1e"}}>
                            ⚠️ กรุณาแจ้งหัวหน้าเพื่อเบิกของใหม่
                          </div>
                        )}
                        {days!==null&&days<0&&(
                          <div style={{marginTop:6,padding:"8px 12px",background:"rgba(226,92,134,0.15)",borderRadius:6,fontSize:12,color:"#d6456f"}}>
                            🚨 หมดอายุแล้ว! ห้ามใช้ กรุณาเบิกทันที
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </Card>
        );
      })}
      <Card style={{border:noteError?"1.5px solid #e25c86":"undefined"}}>
        <div style={{fontSize:13,fontWeight:700,color:noteError?"#d6456f":"#5d7290",marginBottom:6}}>
          📝 เขียนปัญหาหรือข้อเสนอแนะทุกครั้ง หากไม่มีเขียน "ไม่มี" ได้เลย
          <span style={{color:"#e25c86"}}> *</span>
        </div>
        {noteError&&<div style={{fontSize:12,color:"#d6456f",marginBottom:8}}>⚠️ กรุณากรอกข้อมูลก่อนบันทึกค่ะ</div>}
        <textarea value={note} onChange={e=>{setNote(e.target.value);setSaved(false);setNoteError(false);}}
          placeholder='เช่น "ไม่มี" หรือ "อุปกรณ์ชำรุด..."'
          rows={3} style={{...BASE_INP,resize:"vertical",lineHeight:1.7,border:noteError?"1.5px solid #e25c86":BASE_INP.border}}/>
      </Card>
      <button onClick={handleSave} disabled={saving} style={{width:"100%",padding:"16px 0",borderRadius:12,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:16,fontWeight:800,background:saved?"#22a37f":saving?"#8aa0b8":`linear-gradient(90deg,${role.color},${shiftMeta.accent})`,color:"#fff",boxShadow:`0 4px 20px ${role.color}44`,transition:"all 0.3s"}}>
        {saving?"⏳ กำลัง Sync...":saved?"✅ บันทึก & Sync แล้ว!":"✨ บันทึกการเช็ค"}
      </button>
    </div>
  );
}

/* ── General Check Page (AEMT, พนักงานขับรถ) ── */
function CheckPage({myRole,selYear,selMonth,selDay,selShift,equipment}){
  const role=ROLE_MAP[myRole]; const items=equipment[myRole]||[];
  const key=recKey(selYear,selMonth,selDay,selShift,myRole);
  const dbRef=ref(db,`records/${key}`); const shiftMeta=SHIFT_META[selShift];
  const [myName,setMyName]=useState(""); const [checked,setChecked]=useState({});
  const [note,setNote]=useState(""); const [saved,setSaved]=useState(false);
  const [saving,setSaving]=useState(false); const [loading,setLoading]=useState(true);
  const [warn,setWarn]=useState(null);

  useEffect(()=>{
    setLoading(true);
    if(isFutureDate(selYear,selMonth,selDay)) setWarn("future"); else setWarn(null);
    const u=onValue(dbRef,snap=>{
      const data=snap.val();
      setMyName("");setChecked({});setNote("");
      if(data&&data.savedAt&&!isFutureDate(selYear,selMonth,selDay)) setWarn("duplicate");
      setLoading(false);setSaved(false);
    });
    return()=>u();
  },[key]);

  function toggle(item){const k=sanitizeKey(item);setChecked(p=>({...p,[k]:!p[k]}));setSaved(false);}

  async function handleSave(){
    setSaving(true);
    const cleanChecked=Object.fromEntries(Object.entries(checked).map(([k,v])=>[sanitizeKey(k),v]));
    await set(dbRef,{name:myName,checked:cleanChecked,note,roleId:myRole,savedAt:new Date().toISOString()});
    setSaving(false);setSaved(true);setWarn("duplicate");setTimeout(()=>setSaved(false),2500);
  }

  const done=items.filter(i=>checked[sanitizeKey(i)]).length; const total=items.length;
  if(loading) return <div style={{textAlign:"center",padding:60,color:"#7f93ab"}}><div style={{fontSize:32,marginBottom:12}}>⏳</div>กำลังโหลด...</div>;

  return(
    <div>
      {showSuccess&&<SuccessScreen myName={myName} role={role} selDay={selDay} selMonth={selMonth} selYear={selYear} selShift={selShift} totalItems={totalItems} note={note} savedAt={new Date().toISOString()} onClose={()=>setShowSuccess(false)}/>}
      <div style={{background:shiftMeta.accent+"20",border:`1.5px solid ${shiftMeta.accent}44`,borderRadius:10,padding:"10px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:13,color:shiftMeta.accent}}>{shiftMeta.icon} {selDay} {MONTH_NAMES[selMonth]} {selYear+543} · เวร{selShift}</span>
        {saved&&<span style={{marginLeft:"auto",fontSize:12,color:"#128a6a"}}>✓ Sync ☁️</span>}
      </div>
      {warn==="future"&&(
        <div style={{background:"rgba(226,92,134,0.12)",border:"1.5px solid #e25c8666",borderRadius:10,padding:"12px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div><div style={{fontSize:14,fontWeight:700,color:"#d6456f"}}>วันที่เป็นอนาคต!</div><div style={{fontSize:12,color:"#5d7290"}}>กรุณาตรวจสอบวันที่ก่อนบันทึกค่ะ</div></div>
        </div>
      )}
      {warn==="duplicate"&&!saved&&(
        <div style={{background:"rgba(232,137,58,0.12)",border:"1.5px solid #c26a1e66",borderRadius:10,padding:"12px 16px",marginBottom:14}}>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:myName?"8px":"0"}}>
            <span style={{fontSize:20}}>⚠️</span>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#c26a1e"}}>เวรนี้มีข้อมูลอยู่แล้ว!</div>
              <div style={{fontSize:12,color:"#5d7290"}}>ถ้ากรอกชื่อและบันทึกใหม่จะทับข้อมูลเดิมค่ะ</div>
            </div>
          </div>
        </div>
      )}
      <Card>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <span style={{fontSize:26}}>{role.icon}</span>
          <div><div style={{fontWeight:800,fontSize:15,color:role.color}}>{role.label}</div><div style={{fontSize:12,color:"#7f93ab"}}>ผู้รับผิดชอบตรวจเช็ค</div></div>
        </div>
        <input value={myName} onChange={e=>{setMyName(e.target.value);setSaved(false);}} placeholder="ชื่อ-นามสกุลของคุณ" style={BASE_INP}/>
      </Card>
      <Card style={{paddingBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:700,color:"#5d7290"}}>ความคืบหน้า</span>
          <span style={{fontSize:13,color:done===total&&total>0?"#128a6a":"#e8893a"}}>{done}/{total}</span>
        </div>
        <div style={{height:8,background:"#e6eef8",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:99,transition:"width 0.3s",background:`linear-gradient(90deg,${role.color},#128a6a)`,width:`${total?(done/total)*100:0}%`}}/>
        </div>
      </Card>
      <Card>
        <div style={{fontSize:13,fontWeight:700,color:"#5d7290",marginBottom:12}}>🔧 รายการตรวจเช็ค</div>
        {items.length===0?(<div style={{fontSize:13,color:"#8aa0b8",fontStyle:"italic"}}>ยังไม่มีรายการ · ไปตั้งค่าที่ ⚙️ ก่อนค่ะ</div>)
        :items.map(item=>{
          const ck=!!checked[sanitizeKey(item)];
          return(
            <label key={item} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:8,cursor:"pointer",marginBottom:4,background:ck?"rgba(18,160,120,0.08)":"transparent",transition:"background 0.15s"}}>
              <input type="checkbox" checked={ck} onChange={()=>toggle(item)} style={{width:18,height:18,accentColor:role.color,cursor:"pointer",flexShrink:0}}/>
              <span style={{fontSize:14,color:ck?"#128a6a":"#3b4f69",flex:1}}>{item}</span>
              {ck&&<span style={{color:"#128a6a",fontSize:13}}>✓</span>}
            </label>
          );
        })}
      </Card>
      <Card>
        <div style={{fontSize:13,fontWeight:700,color:"#5d7290",marginBottom:10}}>📝 หมายเหตุ</div>
        <textarea value={note} onChange={e=>{setNote(e.target.value);setSaved(false);}} placeholder="เช่น อุปกรณ์ชำรุด, ของขาด..." rows={3} style={{...BASE_INP,resize:"vertical",lineHeight:1.7}}/>
      </Card>
      <button onClick={handleSave} disabled={saving} style={{width:"100%",padding:"16px 0",borderRadius:12,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:16,fontWeight:800,background:saved?"#22a37f":saving?"#8aa0b8":`linear-gradient(90deg,${role.color},${shiftMeta.accent})`,color:"#fff",boxShadow:`0 4px 20px ${role.color}44`,transition:"all 0.3s"}}>
        {saving?"⏳ กำลัง Sync...":saved?"✅ บันทึก & Sync แล้ว!":"✨ บันทึกการเช็ค"}
      </button>
    </div>
  );
}

/* ── Summary Page ── */
function SummaryPage({selYear,selMonth,equipment,onLock}){
  const [allData,setAllData]=useState({}); const [loading,setLoading]=useState(true);
  const [expandedRow,setExpandedRow]=useState(null);
  const [roster,setRoster]=useState({});
  useEffect(()=>{
    const pre=`${selYear}-${String(selMonth+1).padStart(2,"0")}`;
    const u=onValue(ref(db,"roster"),snap=>{
      const raw=snap.val()||{};
      setRoster(Object.fromEntries(Object.entries(raw).filter(([k])=>k.startsWith(pre))));
    });
    return()=>u();
  },[selYear,selMonth]);
  useEffect(()=>{
    setLoading(true);
    const u=onValue(ref(db,"records"),snap=>{
      const raw=snap.val()||{};
      const f=Object.fromEntries(Object.entries(raw).filter(([k])=>k.startsWith(`${selYear}-${String(selMonth+1).padStart(2,"0")}`)));
      setAllData(f);setLoading(false);
    });
    return()=>u();
  },[selYear,selMonth]);

  function getTotal(roleId){
    if(roleId==="para") return PARA_GROUPS.reduce((s,g)=>s+g.items.length,0);
    if(roleId==="aemt") return AEMT_GROUPS.reduce((s,g)=>s+g.items.length,0);
    if(roleId==="driv") return DRIV_GROUPS.reduce((s,g)=>s+g.items.length,0);
    return (equipment[roleId]||[]).length;
  }
  function getDone(e){ return e?Object.values(e.checked||{}).filter(Boolean).length:0; }

  const days=getDays(selYear,selMonth); const rows=[];
  for(let d=1;d<=days;d++){
    for(const shift of SHIFTS){
      const roleResults=ROLES.map(r=>{
        const e=getEntry(allData,selYear,selMonth,d,shift,r.id);
        return{role:r,entry:e,done:getDone(e),total:recTotal(e,r.id)};
      });
      const ros=roster[rosterKey(selYear,selMonth,d,shift)];
      const allOK=roleResults.every(r=>r.entry&&r.entry.name&&r.done===r.total&&r.total>0);
      if(!allOK) rows.push({day:d,shift,roleResults,ros});
    }
  }

  const copyText="สรุปเวรที่ไม่ได้เช็คอุปกรณ์ EMS\nเดือน"+MONTH_NAMES[selMonth]+" "+(selYear+543)+"\n"+"─".repeat(36)+"\n"+
    rows.map(({day,shift,roleResults,ros})=>{
      const missing=roleResults.filter(r=>!r.entry||!r.entry.name||r.done<r.total);
      return "• "+day+" "+MONTH_NAMES[selMonth]+" เวร"+shift+"\n"+missing.map(r=>{
        const who=r.entry?.name?r.entry.name:("ไม่ได้เช็ค — ผู้อยู่เวร: "+(dutyName(ros,r.role.id,shift)||"ไม่ได้ลงชื่อเวร"));
        return "  - "+r.role.short+": "+who+" ["+r.done+"/"+r.total+"]";
      }).join("\n");
    }).join("\n")+"\n"+"─".repeat(36)+"\nรวม "+rows.length+" เวร";

  if(loading) return <div style={{textAlign:"center",padding:60,color:"#7f93ab"}}><div style={{fontSize:32,marginBottom:12}}>⏳</div>กำลังโหลด...</div>;
  return(
    <div>
      <Card>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,marginBottom:4}}>{"📋 สรุปเดือน"+MONTH_NAMES[selMonth]+" "+(selYear+543)}</div>
            <div style={{fontSize:13,color:"#5d7290"}}>เวรที่ยังเช็คไม่ครบ</div>
          </div>
          <button onClick={onLock} style={{padding:"8px 14px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:"rgba(232,137,58,0.15)",color:"#c26a1e"}}>🔒 ล็อค</button>
        </div>
      </Card>
      {rows.length===0?(
        <div style={{background:"rgba(18,160,120,0.1)",border:"1.5px solid #128a6a55",borderRadius:14,padding:36,textAlign:"center"}}>
          <div style={{fontSize:44,marginBottom:10}}>✅</div>
          <div style={{fontSize:16,fontWeight:700,color:"#128a6a"}}>ครบทุกเวรแล้วค่ะ!</div>
        </div>
      ):(
        <>
          <div style={{background:"rgba(226,92,134,0.1)",border:"1.5px solid #e25c8655",borderRadius:10,padding:"12px 16px",marginBottom:14,fontSize:14}}>
            ⚠️ พบ <strong>{rows.length}</strong> เวร ที่ยังไม่สมบูรณ์
          </div>
          {rows.map(({day,shift,roleResults,ros},idx)=>{
            const sm=SHIFT_META[shift];
            const rowKey=`${day}_${shift}`;
            const isExp=expandedRow===rowKey;
            return(
              <div key={idx} style={{marginBottom:8,background:"#ffffff",borderRadius:12,overflow:"hidden",border:"1px solid #e3edf8"}}>
                {/* clickable header */}
                <div onClick={()=>setExpandedRow(isExp?null:rowKey)}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",cursor:"pointer",userSelect:"none"}}>
                  <div style={{padding:"4px 10px",borderRadius:8,fontSize:13,fontWeight:800,background:sm.accent+"22",color:sm.accent}}>
                    {sm.icon} {day} {MONTH_NAMES[selMonth].slice(0,3)} · เวร{shift}
                  </div>
                  <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}>
                    {roleResults.map(r=>{
                      const ok=r.entry&&r.entry.name&&r.done===r.total&&r.total>0;
                      return <span key={r.role.id} style={{fontSize:16}}>{ok?"✅":"❌"}</span>;
                    })}
                    <span style={{fontSize:12,color:"#7f93ab",marginLeft:4}}>{isExp?"▲":"▼"}</span>
                  </div>
                </div>
                {/* expandable detail */}
                {isExp&&(
                  <div style={{padding:"0 12px 12px",display:"flex",flexDirection:"column",gap:8}}>
                    {roleResults.map(r=>{
                      const ok=r.entry&&r.entry.name&&r.done===r.total&&r.total>0;
                      return(
                        <div key={r.role.id} style={{display:"flex",flexDirection:"column",gap:4,padding:"10px 12px",borderRadius:8,background:ok?"rgba(18,160,120,0.06)":"rgba(226,92,134,0.06)",border:"1px solid "+(ok?"#128a6a33":"#e25c8633")}}>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <span style={{fontSize:18}}>{r.role.icon}</span>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13,fontWeight:700,color:r.role.color}}>{r.role.short}</div>
                              <div style={{fontSize:12,color:"#5d7290"}}>{r.entry?.name||"ยังไม่ได้บันทึก"}</div>
                              {!r.entry?.name&&<div style={{fontSize:12,color:"#c26a1e",marginTop:2}}>👤 ผู้อยู่เวร: {dutyName(ros,r.role.id,shift)||"ไม่ได้ลงชื่อเวร"}</div>}
                            </div>
                            <div style={{fontSize:12,color:ok?"#128a6a":"#d6456f",fontWeight:700}}>{ok?"✓ ครบ":r.done+"/"+r.total}</div>
                          </div>
                          {r.entry?.note&&(
                            <div style={{fontSize:12,color:"#5d7290",padding:"6px 10px",background:"#f6faff",borderRadius:6}}>
                              📝 {r.entry.note}
                            </div>
                          )}
                          {r.entry?.savedAt&&(
                            <div style={{fontSize:11,color:"#8aa0b8"}}>
                              ⏰ บันทึกเมื่อ {new Date(r.entry.savedAt).toLocaleString("th-TH",{hour:"2-digit",minute:"2-digit",day:"numeric",month:"short"})}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <Card>
            <div style={{fontSize:13,fontWeight:700,color:"#5d7290",marginBottom:10}}>📋 คัดลอกส่งหัวหน้า</div>
            <div style={{background:"#f1f7ff",borderRadius:8,padding:14,fontSize:12,lineHeight:1.9,color:"#2b3d55",fontFamily:"monospace",whiteSpace:"pre-wrap",marginBottom:12}}>{copyText}</div>
            <button onClick={()=>navigator.clipboard.writeText(copyText)} style={{padding:"10px 22px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:"#6a8df5",color:"#fff"}}>
              📋 คัดลอกข้อความ
            </button>
          </Card>
        </>
      )}
    </div>
  );
}

/* ── รายชื่อเวรย้อนหลัง / ภาพรวม ── */
function RosterHistoryPage({selYear,selMonth,onLock}){
  const [roster,setRoster]=useState({}); const [allData,setAllData]=useState({});
  const [loading,setLoading]=useState(true); const [filter,setFilter]=useState("all");
  const [openKey,setOpenKey]=useState(null); const [copied,setCopied]=useState("");
  const pre=`${selYear}-${String(selMonth+1).padStart(2,"0")}`;

  useEffect(()=>{
    setLoading(true);
    const pick=raw=>Object.fromEntries(Object.entries(raw||{}).filter(([k])=>k.startsWith(pre)));
    const u1=onValue(ref(db,"roster"),s=>setRoster(pick(s.val())));
    const u2=onValue(ref(db,"records"),s=>{setAllData(pick(s.val()));setLoading(false);});
    return()=>{u1();u2();};
  },[pre]);

  const rows=[];
  for(let d=getDays(selYear,selMonth);d>=1;d--){
    if(isFutureDate(selYear,selMonth,d)) continue;
    for(const shift of [...SHIFTS].reverse()){
      // ข้ามเวรที่ยังไม่เริ่ม (เช้า 08:15, บ่าย 16:15, ดึก 00:15 ของวันถัดไป)
      const start=new Date(selYear,selMonth,d+(shift==="ดึก"?1:0),shift==="เช้า"?8:shift==="บ่าย"?16:0,15);
      if(start>getThaiNow()) continue;
      const key=rosterKey(selYear,selMonth,d,shift);
      const ros=roster[key];
      const checks={};
      ROLES.forEach(r=>checks[r.id]=getEntry(allData,selYear,selMonth,d,shift,r.id));
      const okAll=ROLES.every(r=>entryOK(checks[r.id],r.id));
      rows.push({d,shift,key,ros,checks,okAll});
    }
  }
  const shown=rows.filter(r=>filter==="all"||(filter==="missing"&&!r.okAll)||(filter==="noroster"&&!r.ros));
  const rosterCount=rows.filter(r=>r.ros).length;
  const okCount=rows.filter(r=>r.okAll).length;

  const short=(r,roleId)=>entryOK(r.checks[roleId],roleId)?"✅":r.checks[roleId]?"⚠️":"❌";
  const monthText="🫶 รายชื่อผู้ปฏิบัติงาน EMS\nเดือน"+MONTH_NAMES[selMonth]+" "+(selYear+543)+"\n"+"─".repeat(30)+"\n"+
    [...shown].reverse().map(r=>{
      const o=r.ros||{};
      return `• ${r.d} ${MONTH_NAMES[selMonth].slice(0,3)} เวร${r.shift}`+
        (r.ros?"\n  "+shownFields(r.shift,o).map(f=>`${f.label}: ${o[f.id]||"-"}`).join(" | "):"\n  (ไม่ได้ลงชื่อเวร)")+
        `\n  เช็ค: Para/ENP/RN ${short(r,"para")} A-EMT ${short(r,"aemt")} พขร. ${short(r,"driv")}`;
    }).join("\n")+"\n"+"─".repeat(30)+`\nลงชื่อเวร ${rosterCount}/${rows.length} · เช็คครบ ${okCount}/${rows.length} เวร`;

  function exportCsv(){
    const esc=v=>`"${String(v??"").replace(/"/g,'""')}"`;
    const st=(r,id)=>entryOK(r.checks[id],id)?"ครบ":r.checks[id]?`${entryDone(r.checks[id])}/${roleTotal(id)}`:"ไม่เช็ค";
    const head=["วันที่","เวร",...ROSTER_ALL.map(f=>f.label),"Para/ENP/RN เช็ค","ผู้เช็ค Para/ENP/RN","A-EMT เช็ค","ผู้เช็ค A-EMT","พขร. เช็ค","ผู้เช็ค พขร."];
    const lines=[head,...[...rows].reverse().map(r=>{const o=r.ros||{};return[
      `${r.d} ${MONTH_NAMES[selMonth]} ${selYear+543}`,r.shift,...ROSTER_ALL.map(f=>o[f.id]),
      st(r,"para"),r.checks.para?.name,st(r,"aemt"),r.checks.aemt?.name,st(r,"driv"),r.checks.driv?.name];})];
    const csv="﻿"+lines.map(l=>l.map(esc).join(",")).join("\r\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    a.download=`รายชื่อเวร_EMS_${pre}.csv`; document.body.appendChild(a); a.click(); a.remove();
  }

  const BTN={padding:"8px 12px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700};
  if(loading) return <div style={{textAlign:"center",padding:60,color:"#7f93ab"}}><div style={{fontSize:32,marginBottom:12}}>⏳</div>กำลังโหลด...</div>;
  return(
    <div>
      <Card>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,marginBottom:4}}>{"🫶 รายชื่อเวร "+MONTH_NAMES[selMonth]+" "+(selYear+543)}</div>
            <div style={{fontSize:13,color:"#5d7290"}}>ลงชื่อเวร {rosterCount}/{rows.length} · เช็คครบ {okCount}/{rows.length} เวร</div>
          </div>
          <button onClick={onLock} style={{...BTN,background:"rgba(232,137,58,0.15)",color:"#c26a1e"}}>🔒 ล็อค</button>
        </div>
        <div style={{display:"flex",gap:6,marginTop:12,flexWrap:"wrap"}}>
          {[["all","ทั้งหมด"],["missing","เช็คไม่ครบ"],["noroster","ไม่ได้ลงชื่อเวร"]].map(([id,l])=>(
            <button key={id} onClick={()=>setFilter(id)} style={{...BTN,background:filter===id?"#2a9fb8":"#f1f6fc",color:filter===id?"#fff":"#5d7290"}}>{l}</button>
          ))}
        </div>
      </Card>

      {shown.length===0&&<div style={{textAlign:"center",padding:30,color:"#7f93ab"}}>ไม่มีรายการ</div>}
      {shown.map(r=>{
        const sm=SHIFT_META[r.shift]; const o=r.ros||{}; const isOpen=openKey===r.key;
        return(
          <div key={r.key} style={{marginBottom:8,background:"#ffffff",borderRadius:12,border:"1px solid "+(r.okAll?"#e3edf8":"#e25c8644"),overflow:"hidden"}}>
            <div onClick={()=>setOpenKey(isOpen?null:r.key)} style={{padding:"12px 14px",cursor:"pointer",userSelect:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{padding:"3px 10px",borderRadius:8,fontSize:13,fontWeight:800,background:sm.accent+"22",color:sm.accent}}>{sm.icon} {r.d} {MONTH_NAMES[selMonth].slice(0,3)} · เวร{r.shift}</span>
                <span style={{marginLeft:"auto",fontSize:12,color:"#5d7290"}}>Para {short(r,"para")} · A-EMT {short(r,"aemt")} · พขร. {short(r,"driv")}</span>
              </div>
              {r.ros?(
                <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"2px 10px",fontSize:13,marginTop:8}}>
                  {shownFields(r.shift,o).map(f=>[
                    <span key={f.id+"l"} style={{color:"#7f93ab"}}>{f.label}</span>,
                    <span key={f.id+"v"} style={{color:"#2b3d55"}}>{o[f.id]||"-"}</span>
                  ])}
                </div>
              ):(
                <div style={{fontSize:13,color:"#d6456f",marginTop:8}}>⚠️ ไม่ได้ลงชื่อผู้ปฏิบัติงานเวรนี้</div>
              )}
            </div>
            {isOpen&&(()=>{
              const rep=buildShiftReport(selYear,selMonth,r.d,r.shift,r.ros,r.checks);
              return(
                <div style={{padding:"0 14px 14px"}}>
                  <div style={{background:"#f1f7ff",borderRadius:8,padding:12,fontSize:12,lineHeight:1.8,color:"#2b3d55",whiteSpace:"pre-wrap",marginBottom:8}}>{rep}</div>
                  <button onClick={()=>copyToClipboard(rep).then(()=>setCopied(r.key))} style={{...BTN,background:"#6a8df5",color:"#fff"}}>{copied===r.key?"✓ คัดลอกแล้ว":"📋 คัดลอกรายงานเวรนี้"}</button>
                </div>
              );
            })()}
          </div>
        );
      })}

      <Card>
        <div style={{fontSize:13,fontWeight:700,color:"#5d7290",marginBottom:10}}>📤 สรุปทั้งเดือน (ตามตัวกรองที่เลือก)</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>copyToClipboard(monthText).then(()=>setCopied("month"))} style={{...BTN,background:"#6a8df5",color:"#fff"}}>{copied==="month"?"✓ คัดลอกแล้ว":"📋 คัดลอกข้อความสรุป"}</button>
          <button onClick={exportCsv} style={{...BTN,background:"#22a37f",color:"#fff"}}>📊 ดาวน์โหลด Excel (CSV)</button>
        </div>
      </Card>
    </div>
  );
}

/* ── Dashboard ── */
function DashboardPage({selYear,selMonth,equipment,onLock}){
  const [allData,setAllData]=useState({}); const [loading,setLoading]=useState(true);
  const [delMode,setDelMode]=useState(false);
  const [delDay,setDelDay]=useState(1); const [delShift,setDelShift]=useState("เช้า");
  const [delRole,setDelRole]=useState("para"); const [deleting,setDeleting]=useState(false);
  const [delDone,setDelDone]=useState(false); const [expandedRow,setExpandedRow]=useState(null);

  useEffect(()=>{
    setLoading(true);
    const u=onValue(ref(db,"records"),snap=>{
      const raw=snap.val()||{};
      const f=Object.fromEntries(Object.entries(raw).filter(([k])=>k.startsWith(`${selYear}-${String(selMonth+1).padStart(2,"0")}`)));
      setAllData(f);setLoading(false);
    });
    return()=>u();
  },[selYear,selMonth]);

  async function handleDelete(){
    if(!window.confirm(`ลบข้อมูล ${delDay} ${MONTH_NAMES[selMonth]} เวร${delShift} ตำแหน่ง ${ROLE_MAP[delRole].short}?`)) return;
    setDeleting(true);
    await remove(ref(db,`records/${recKey(selYear,selMonth,delDay,delShift,delRole)}`));
    setDeleting(false);setDelDone(true);setTimeout(()=>setDelDone(false),2000);
  }

  function getTotal(roleId){ if(roleId==="para") return PARA_GROUPS.reduce((s,g)=>s+g.items.length,0); if(roleId==="aemt") return AEMT_GROUPS.reduce((s,g)=>s+g.items.length,0); if(roleId==="driv") return DRIV_GROUPS.reduce((s,g)=>s+g.items.length,0); return (equipment[roleId]||[]).length; }
  function getDone(e){ return e?Object.values(e.checked||{}).filter(Boolean).length:0; }

  const days=getDays(selYear,selMonth);
  let totalDone=0,totalMissing=0,totalIncomplete=0;
  const totalSlots=days*SHIFTS.length*ROLES.length;
  const roleStats=ROLES.map(r=>{
    let done=0,missing=0,incomplete=0;
    for(let d=1;d<=days;d++){
      for(const shift of SHIFTS){
        const k=recKey(selYear,selMonth,d,shift,r.id); const e=allData[k];
        const cnt=getDone(e); const tot=recTotal(e,r.id);
        if(!e||!e.name){missing++;}else if(cnt===tot){done++;}else{incomplete++;}
      }
    }
    totalDone+=done;totalMissing+=missing;totalIncomplete+=incomplete;
    return{role:r,done,missing,incomplete,total:days*SHIFTS.length};
  });

  const {day:todayDay}=todayParts();
  const last7=Array.from({length:7},(_,i)=>{
    const d=Math.max(1,Math.min(days,todayDay-6+i));
    let ok=0;
    SHIFTS.forEach(shift=>{
      const allOK=ROLES.every(r=>{
        const k=recKey(selYear,selMonth,d,shift,r.id); const e=allData[k];
        const cnt=getDone(e); const tot=recTotal(e,r.id);
        return e&&e.name&&cnt===tot&&tot>0;
      });
      if(allOK) ok++;
    });
    return{day:d,pct:Math.round((ok/SHIFTS.length)*100)};
  });

  const overallPct=Math.round((totalDone/totalSlots)*100);
  if(loading) return <div style={{textAlign:"center",padding:60,color:"#7f93ab"}}><div style={{fontSize:32,marginBottom:12}}>⏳</div>กำลังโหลด...</div>;

  return(
    <div>
      <Card>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,marginBottom:2}}>📊 Dashboard</div>
            <div style={{fontSize:13,color:"#5d7290"}}>เดือน{MONTH_NAMES[selMonth]} {selYear+543}</div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>exportToExcel(allData,equipment,selYear,selMonth)} style={{padding:"8px 14px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:"#22a37f",color:"#fff"}}>📥 Excel</button>
            <button onClick={()=>setDelMode(d=>!d)} style={{padding:"8px 14px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:delMode?"#e25c86":"rgba(226,92,134,0.2)",color:delMode?"#fff":"#d6456f"}}>🗑️ ลบข้อมูล</button>
            <button onClick={onLock} style={{padding:"8px 14px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:"rgba(232,137,58,0.15)",color:"#c26a1e"}}>🔒 ล็อค</button>
          </div>
        </div>
      </Card>

      {delMode&&(
        <Card style={{border:"1.5px solid rgba(226,92,134,0.4)"}}>
          <div style={{fontSize:14,fontWeight:800,color:"#d6456f",marginBottom:14}}>🗑️ ลบข้อมูลที่ระบุ</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
            <div style={{flex:1,minWidth:80}}>
              <div style={{fontSize:12,color:"#5d7290",marginBottom:6}}>วันที่</div>
              <select value={delDay} onChange={e=>setDelDay(+e.target.value)} style={BASE_SEL}>
                {Array.from({length:days},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{flex:1,minWidth:80}}>
              <div style={{fontSize:12,color:"#5d7290",marginBottom:6}}>เวร</div>
              <select value={delShift} onChange={e=>setDelShift(e.target.value)} style={BASE_SEL}>
                {SHIFTS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{flex:1,minWidth:100}}>
              <div style={{fontSize:12,color:"#5d7290",marginBottom:6}}>ตำแหน่ง</div>
              <select value={delRole} onChange={e=>setDelRole(e.target.value)} style={BASE_SEL}>
                {ROLES.map(r=><option key={r.id} value={r.id}>{r.short}</option>)}
              </select>
            </div>
          </div>
          {(()=>{const k=recKey(selYear,selMonth,delDay,delShift,delRole);const e=allData[k];
            return e?(
              <div style={{background:"rgba(226,92,134,0.08)",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13}}>
                <div style={{color:"#d6456f",fontWeight:700,marginBottom:4}}>ข้อมูลที่จะถูกลบ:</div>
                <div style={{color:"#5d7290"}}>👤 {e.name||"ไม่มีชื่อ"} · {e.savedAt?.slice(0,10)||"-"}</div>
              </div>
            ):(
              <div style={{background:"#f6faff",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13,color:"#8aa0b8"}}>ไม่มีข้อมูลในเวรนี้</div>
            );
          })()}
          <button onClick={handleDelete} disabled={deleting||!allData[recKey(selYear,selMonth,delDay,delShift,delRole)]} style={{width:"100%",padding:"11px 0",borderRadius:9,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:800,background:delDone?"#22a37f":deleting?"#8aa0b8":"#e25c86",color:"#fff",transition:"all 0.3s"}}>
            {delDone?"✅ ลบเรียบร้อย!":deleting?"⏳ กำลังลบ...":"🗑️ ยืนยันลบข้อมูล"}
          </button>
        </Card>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {[{label:"ครบทุกรายการ",value:totalDone,color:"#128a6a",icon:"✅"},{label:"ไม่สมบูรณ์",value:totalIncomplete,color:"#e8893a",icon:"⚠️"},{label:"ไม่มีข้อมูล",value:totalMissing,color:"#d6456f",icon:"❌"}].map(s=>(
          <div key={s.label} style={{background:"#ffffff",borderRadius:12,padding:"14px 12px",textAlign:"center"}}>
            <div style={{fontSize:22}}>{s.icon}</div>
            <div style={{fontSize:24,fontWeight:900,color:s.color,marginTop:4}}>{s.value}</div>
            <div style={{fontSize:11,color:"#7f93ab",marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      <Card>
        <div style={{display:"flex",alignItems:"center",gap:20}}>
          <div style={{position:"relative",width:80,height:80,flexShrink:0}}>
            <svg viewBox="0 0 36 36" style={{width:80,height:80,transform:"rotate(-90deg)"}}>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e9f1fb" strokeWidth="3"/>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke={overallPct>=80?"#128a6a":overallPct>=50?"#e8893a":"#d6456f"} strokeWidth="3" strokeDasharray={`${overallPct} ${100-overallPct}`} strokeLinecap="round"/>
            </svg>
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:16,fontWeight:900,color:"#1f3047"}}>{overallPct}%</div>
          </div>
          <div>
            <div style={{fontSize:15,fontWeight:800}}>ภาพรวมการเช็ค</div>
            <div style={{fontSize:13,color:"#5d7290",marginTop:4}}>เช็คแล้ว {totalDone} จาก {totalSlots} เวร</div>
          </div>
        </div>
      </Card>

      <Card>
        <div style={{fontSize:13,fontWeight:700,color:"#5d7290",marginBottom:14}}>แยกตามตำแหน่ง</div>
        {roleStats.map(({role,done,missing,incomplete,total})=>{
          const pct=Math.round((done/total)*100);
          return(
            <div key={role.id} style={{marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={{fontSize:18}}>{role.icon}</span>
                <span style={{fontSize:14,fontWeight:700,color:role.color}}>{role.short}</span>
                <span style={{marginLeft:"auto",fontSize:13,fontWeight:800,color:pct>=80?"#128a6a":pct>=50?"#e8893a":"#d6456f"}}>{pct}%</span>
              </div>
              <div style={{height:8,background:"#e6eef8",borderRadius:99,overflow:"hidden",marginBottom:4}}>
                <div style={{height:"100%",borderRadius:99,background:pct>=80?"#128a6a":pct>=50?"#e8893a":"#d6456f",width:`${pct}%`,transition:"width 0.5s"}}/>
              </div>
              <div style={{display:"flex",gap:12,fontSize:11,color:"#7f93ab"}}>
                <span>✅ {done}</span><span>⚠️ {incomplete}</span><span>❌ {missing}</span>
              </div>
            </div>
          );
        })}
      </Card>

      <Card>
        <div style={{fontSize:13,fontWeight:700,color:"#5d7290",marginBottom:14}}>7 วันล่าสุด</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:8,height:80}}>
          {last7.map(({day,pct})=>(
            <div key={day} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{fontSize:10,color:pct===100?"#128a6a":pct>=50?"#e8893a":"#d6456f",fontWeight:700}}>{pct}%</div>
              <div style={{width:"100%",background:pct===100?"#128a6a":pct>=50?"#e8893a":"#d6456f",borderRadius:"4px 4px 0 0",height:`${Math.max(4,pct*0.6)}px`,transition:"height 0.5s"}}/>
              <div style={{fontSize:10,color:"#7f93ab"}}>{day}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ── Settings ── */
/* ── ของค้างส่งต่อเวร: ของขาด/ใช้แล้วรอเติม/กำลังล้าง ให้เวรถัดไปรู้และกดปิดเมื่อเติมแล้ว ── */
const PENDING_STATUS=[
  {id:"missing", label:"ขาด / ต้องเบิกเติม", icon:"📦"},
  {id:"used",    label:"ใช้แล้ว รอเติม",     icon:"🔁"},
  {id:"washing", label:"กำลังล้าง / ทำความสะอาด", icon:"🫧"},
  {id:"repair",  label:"ชำรุด / ส่งซ่อม",    icon:"🔧"},
  {id:"other",   label:"อื่น ๆ",             icon:"📝"},
];
const PSTAT=Object.fromEntries(PENDING_STATUS.map(x=>[x.id,x]));
let PENDING_OPEN=[];
function applyPending(v){
  PENDING_OPEN=Object.entries(v||{}).map(([id,x])=>({id,...x})).filter(x=>x&&!x.resolved&&x.item)
    .sort((a,b)=>String(a.at||"").localeCompare(String(b.at||"")));
}
function pendingFor(itemId,label){
  const n=normName(label);
  return PENDING_OPEN.filter(p=>(itemId&&p.itemId===itemId)||(!p.itemId&&normName(p.item)===n));
}
function pendingWhen(p){
  if(!p.at) return "";
  const d=new Date(p.at); const t=new Date(d.toLocaleString("en-US",{timeZone:"Asia/Bangkok"}));
  return `${t.getDate()} ${MONTH_NAMES[t.getMonth()].slice(0,3)} ${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}${p.shift?` · เวร${p.shift}`:""}`;
}
function pendingReportLines(){
  if(!PENDING_OPEN.length) return [];
  return ["","📌 ของค้างส่งต่อเวร",...PENDING_OPEN.map(p=>`• ${p.item} — ${PSTAT[p.status]?.label||p.status}${p.note?` (${p.note})`:""} · แจ้งโดย ${p.by||"-"} ${pendingWhen(p)}`)];
}
// ป้ายเล็กข้างชื่ออุปกรณ์ในหน้าเช็ค
function PendingTag({itemId,label}){
  const ps=pendingFor(itemId,label);
  if(!ps.length) return null;
  const p=ps[0];
  return <span title={`${PSTAT[p.status]?.label||""} · ${p.by||""}`} style={{fontSize:11,fontWeight:700,color:"#b4530f",background:"rgba(232,137,58,0.15)",padding:"3px 8px",borderRadius:99,whiteSpace:"nowrap",flexShrink:0}}>📌 {PSTAT[p.status]?.label.split(" /")[0]||"ค้าง"}</span>;
}
const KEY_PENDING_NAME="ems_pending_name";
function allItemOptions(){
  const labels=[...PARA_GROUPS,...AEMT_GROUPS,...DRIV_GROUPS].flatMap(g=>g.items.map(i=>i.label));
  return [...new Set([...labels,...EXPIRY_ITEMS.map(i=>i.label)])];
}
function findItemId(label){
  const n=normName(label);
  for(const g of [...PARA_GROUPS,...AEMT_GROUPS,...DRIV_GROUPS]) for(const i of g.items) if(normName(i.label)===n) return i.id;
  return "";
}
function PendingCard({roleId}){
  const staff=useStaff();
  const names=[...new Set(Object.values(staff).flat())];
  const [open,setOpen]=useState(false);
  const [item,setItem]=useState(""); const [status,setStatus]=useState("missing"); const [note,setNote]=useState("");
  const [who,setWho]=useState(()=>ls(KEY_PENDING_NAME,""));
  const [msg,setMsg]=useState(""); const [busy,setBusy]=useState(false);
  const BTN={padding:"8px 12px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700};
  const list=PENDING_OPEN;

  async function add(){
    if(!item.trim()){setMsg("⚠️ กรุณาระบุอุปกรณ์");return;}
    if(!who.trim()){setMsg("⚠️ กรุณาใส่ชื่อผู้แจ้ง");return;}
    setBusy(true);setMsg("");
    try{
      const sd=getShiftAndDate();
      await set(ref(db,`pending/${Date.now().toString(36)}`),{item:item.trim(),itemId:findItemId(item),status,note:note.trim(),by:who.trim(),role:roleId||"",shift:sd.shift,at:new Date().toISOString(),resolved:false});
      ss(KEY_PENDING_NAME,who.trim());
      setItem("");setNote("");setStatus("missing");setOpen(false);setMsg("✅ แจ้งแล้ว เวรถัดไปจะเห็นรายการนี้");
    }catch(e){setMsg("⚠️ แจ้งไม่สำเร็จ: "+(e.message||e));}
    setBusy(false);
  }
  async function resolve(p){
    const name=window.prompt(`ใครเป็นคนเติม/แก้ “${p.item}”?`,ls(KEY_PENDING_NAME,"")||"");
    if(name===null) return;
    if(!name.trim()){setMsg("⚠️ กรุณาใส่ชื่อผู้เติม");return;}
    try{
      await set(ref(db,`pending/${p.id}`),{...Object.fromEntries(Object.entries(p).filter(([k])=>k!=="id")),resolved:true,resolvedBy:name.trim(),resolvedAt:new Date().toISOString()});
      ss(KEY_PENDING_NAME,name.trim());setMsg(`✅ ปิดรายการ ${p.item} แล้ว`);
    }catch(e){setMsg("⚠️ ไม่สำเร็จ: "+(e.message||e));}
  }

  return(
    <div style={{background:list.length?"rgba(232,137,58,0.08)":"#ffffff",border:`1.5px solid ${list.length?"#e8893a66":"#e3edf8"}`,borderRadius:14,padding:"12px 14px",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{flex:1,fontSize:14,fontWeight:800,color:list.length?"#b4530f":"#1f7f9a"}}>
          📌 ของค้างส่งต่อเวร {list.length?`(${list.length})`:""}
        </div>
        <button type="button" onClick={()=>{setOpen(o=>!o);setMsg("");}} style={{...BTN,background:open?"#f1f6fc":"#4a86e8",color:open?"#5d7290":"#fff"}}>{open?"ยกเลิก":"＋ แจ้งของค้าง"}</button>
      </div>
      {!list.length&&!open&&<div style={{fontSize:12,color:"#5d7290",marginTop:4}}>ไม่มีของค้าง ✨</div>}

      {list.map(p=>(
        <div key={p.id} style={{display:"flex",gap:8,alignItems:"center",background:"#ffffff",border:"1px solid #f3d9c2",borderRadius:10,padding:"8px 10px",marginTop:8}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:700,color:"#1f3047"}}>{PSTAT[p.status]?.icon||"📌"} {p.item}</div>
            <div style={{fontSize:12,color:"#b4530f",fontWeight:600}}>{PSTAT[p.status]?.label||p.status}{p.note?` · ${p.note}`:""}</div>
            <div style={{fontSize:11,color:"#7f93ab"}}>แจ้งโดย {p.by||"-"} · {pendingWhen(p)}</div>
          </div>
          <button type="button" onClick={()=>resolve(p)} style={{...BTN,background:"#22a37f",color:"#fff",minHeight:40,flexShrink:0}}>✅ เติมแล้ว</button>
        </div>
      ))}

      {open&&(
        <div style={{marginTop:10,background:"#ffffff",borderRadius:10,padding:10,border:"1px solid #e3edf8"}}>
          <div style={{fontSize:12,color:"#5d7290",marginBottom:4}}>อุปกรณ์</div>
          <NameInput value={item} onChange={setItem} options={allItemOptions()} placeholder="พิมพ์ชื่ออุปกรณ์ เช่น Closed suction"/>
          <div style={{fontSize:12,color:"#5d7290",margin:"10px 0 4px"}}>สถานะ</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {PENDING_STATUS.map(x=>(
              <button key={x.id} type="button" onClick={()=>setStatus(x.id)} style={{...BTN,background:status===x.id?"#e8893a":"#f1f6fc",color:status===x.id?"#fff":"#5d7290"}}>{x.icon} {x.label}</button>
            ))}
          </div>
          <div style={{fontSize:12,color:"#5d7290",margin:"10px 0 4px"}}>หมายเหตุ (ถ้ามี)</div>
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="เช่น เหลือ 1 ชิ้น, เบิกแล้วรอของ" style={{...BASE_INP,fontSize:16}}/>
          <div style={{fontSize:12,color:"#5d7290",margin:"10px 0 4px"}}>ชื่อผู้แจ้ง</div>
          <NameInput value={who} onChange={setWho} options={names} placeholder="พิมพ์ชื่อของคุณ"/>
          <button type="button" disabled={busy} onClick={add} style={{...BTN,width:"100%",padding:"12px 0",marginTop:12,background:"#e8893a",color:"#fff",fontSize:14}}>{busy?"⏳ กำลังบันทึก...":"📌 แจ้งให้เวรถัดไปรู้"}</button>
        </div>
      )}
      {msg&&<div style={{fontSize:13,marginTop:8,color:msg.startsWith("⚠️")?"#d6456f":"#128a6a"}}>{msg}</div>}
    </div>
  );
}

/* ── ป๊อปอัปแจ้งเตือนตอนเปิดแอป: ของหมดอายุ/ใกล้หมด + ของค้างส่งต่อเวร ── */
const KEY_ALERT_SEEN="ems_alert_seen";
function ssGet(k){try{return sessionStorage.getItem(k)||"";}catch{return "";}}
function ssSet(k,v){try{sessionStorage.setItem(k,v);}catch{}}
function StartupAlert({onGoExpiry,onGoCheck}){
  const [exp,setExp]=useState(null);
  const [pendingReady,setPendingReady]=useState(false);
  const [closed,setClosed]=useState(false);
  useEffect(()=>{const u=onValue(ref(db,"expiry"),s=>setExp(s.val()||{}));return()=>u();},[]);
  useEffect(()=>{const u=onValue(ref(db,"pending"),()=>setPendingReady(true));return()=>u();},[]);
  if(exp===null||!pendingReady||closed) return null;
  const al=expiryAlerts(exp); const pend=PENDING_OPEN;
  if(!al.length&&!pend.length) return null;
  // จำไว้ว่ารับทราบแล้ว (ต่อเวร) — ถ้ามีรายการใหม่หรือขึ้นเวรใหม่จะเด้งอีก
  const sd=getShiftAndDate();
  const sig=`${sd.year}-${sd.month}-${sd.day}_${sd.shift}|`+[...al.map(a=>a.id+":"+a.st.key),...pend.map(p=>p.id)].sort().join(",");
  if(ssGet(KEY_ALERT_SEEN)===sig) return null;
  const close=go=>{ssSet(KEY_ALERT_SEEN,sig);setClosed(true);go&&go();};
  const expired=al.filter(a=>a.st.key==="expired");
  const BTN={padding:"12px 0",borderRadius:12,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:800,flex:1};
  return(
    <div role="dialog" aria-modal="true" aria-label="แจ้งเตือน" style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(20,35,60,0.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#ffffff",borderRadius:20,width:"100%",maxWidth:420,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(20,35,60,0.3)",padding:"20px 18px"}}>
        <div style={{textAlign:"center",fontSize:36,marginBottom:4}}>🔔</div>
        <div style={{textAlign:"center",fontSize:18,fontWeight:800,color:"#1f3047",marginBottom:4}}>มีเรื่องต้องดูก่อนเริ่มเวร</div>
        <div style={{textAlign:"center",fontSize:13,color:"#5d7290",marginBottom:14}}>
          {[expired.length&&`หมดอายุ ${expired.length}`,al.length-expired.length&&`ใกล้หมดอายุ ${al.length-expired.length}`,pend.length&&`ของค้าง ${pend.length}`].filter(Boolean).join(" · ")} รายการ
        </div>

        {pend.length>0&&(
          <div style={{background:"rgba(232,137,58,0.08)",border:"1px solid #f3d9c2",borderRadius:12,padding:"10px 12px",marginBottom:10}}>
            <div style={{fontSize:14,fontWeight:800,color:"#b4530f",marginBottom:6}}>📌 ของค้างส่งต่อเวร</div>
            {pend.map(p=>(
              <div key={p.id} style={{fontSize:13,marginBottom:6}}>
                <div style={{fontWeight:700,color:"#1f3047"}}>{PSTAT[p.status]?.icon||"📌"} {p.item}</div>
                <div style={{color:"#b4530f"}}>{PSTAT[p.status]?.label||p.status}{p.note?` · ${p.note}`:""}</div>
                <div style={{fontSize:11,color:"#7f93ab"}}>แจ้งโดย {p.by||"-"} · {pendingWhen(p)}</div>
              </div>
            ))}
          </div>
        )}

        {al.length>0&&(
          <div style={{background:expired.length?"rgba(226,92,134,0.07)":"rgba(232,137,58,0.07)",border:`1px solid ${expired.length?"#f2c4d3":"#f3d9c2"}`,borderRadius:12,padding:"10px 12px",marginBottom:10}}>
            <div style={{fontSize:14,fontWeight:800,color:expired.length?"#d6456f":"#b4530f",marginBottom:6}}>⏰ วันหมดอายุ</div>
            {al.map(a=>(
              <div key={a.id} style={{display:"flex",gap:8,fontSize:13,marginBottom:4}}>
                <span style={{flex:1,color:"#1f3047"}}>{a.st.key==="expired"?"🔴":"🟠"} {a.label}</span>
                <span style={{color:a.st.color,fontWeight:700,whiteSpace:"nowrap"}}>{a.st.text}</span>
              </div>
            ))}
            {expired.length>0&&<div style={{fontSize:12,color:"#d6456f",marginTop:6,fontWeight:600}}>🚨 ของที่หมดอายุแล้ว ห้ามใช้ กรุณาเบิกเปลี่ยน</div>}
          </div>
        )}

        <div style={{display:"flex",gap:8,marginTop:6}}>
          {al.length>0&&<button type="button" onClick={()=>close(onGoExpiry)} style={{...BTN,background:"#e9f1fb",color:"#2f6fd6"}}>⏰ ดูวันหมดอายุ</button>}
          <button type="button" autoFocus onClick={()=>close(onGoCheck)} style={{...BTN,background:"#4a86e8",color:"#fff"}}>รับทราบ 👍</button>
        </div>
      </div>
    </div>
  );
}

/* ── ป้ายเตือนวันหมดอายุ (โชว์บนหน้าเช็คทุกตำแหน่ง) ── */
function ExpiryBanner({onOpen}){
  const exp=useExpiry();
  const al=expiryAlerts(exp);
  const missing=EXPIRY_ITEMS.filter(i=>!exp[i.id]?.date).length;
  if(!al.length&&!missing) return null;
  const expired=al.filter(a=>a.st.key==="expired");
  const bad=expired.length>0;
  return(
    <div style={{background:bad?"rgba(226,92,134,0.10)":al.length?"rgba(232,137,58,0.10)":"#f1f6fc",border:`1.5px solid ${bad?"#e25c8666":al.length?"#e8893a66":"#d3e1f1"}`,borderRadius:14,padding:"12px 14px",marginBottom:14}}>
      {al.length>0&&(
        <>
          <div style={{fontSize:14,fontWeight:800,color:bad?"#d6456f":"#c26a1e",marginBottom:6}}>
            ⏰ {bad?`หมดอายุแล้ว ${expired.length} รายการ`:""}{bad&&al.length>expired.length?" · ":""}{al.length>expired.length?`ใกล้หมดอายุ ${al.length-expired.length} รายการ`:""}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:8}}>
            {al.slice(0,6).map(a=>(
              <div key={a.id} style={{display:"flex",gap:8,fontSize:13}}>
                <span style={{flex:1,color:"#1f3047"}}>{a.st.key==="expired"?"🔴":"🟠"} {a.label}</span>
                <span style={{color:a.st.color,fontWeight:700}}>{a.st.text}</span>
              </div>
            ))}
            {al.length>6&&<div style={{fontSize:12,color:"#5d7290"}}>และอีก {al.length-6} รายการ</div>}
          </div>
        </>
      )}
      {missing>0&&<div style={{fontSize:12,color:"#5d7290",marginBottom:8}}>📝 ยังไม่ระบุวันหมดอายุ {missing} รายการ</div>}
      <button type="button" onClick={onOpen} style={{padding:"8px 14px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:"#4a86e8",color:"#fff"}}>
        ไปที่หน้าวันหมดอายุ →
      </button>
    </div>
  );
}

/* ── หน้าวันหมดอายุ (ทุกคนแก้ได้ ไม่ต้องใช้ PIN) ── */
const KEY_EXP_NAME="ems_exp_editor";
function ExpiryPage(){
  const exp=useExpiry();
  const staff=useStaff();
  const [who,setWho]=useState(()=>ls(KEY_EXP_NAME,""));
  const [filter,setFilter]=useState("alert");
  const [editing,setEditing]=useState(null); const [draft,setDraft]=useState("");
  const [msg,setMsg]=useState(""); const [busy,setBusy]=useState(false);
  const names=[...new Set([...(staff.nurse||[]),...(staff.aemt||[]),...(staff.ep||[])])];
  const rows=EXPIRY_ITEMS.map(i=>({...i,rec:exp[i.id]||null,st:expStatus(exp[i.id]?.date)}));
  const count=k=>rows.filter(r=>k==="alert"?(r.st.key==="expired"||r.st.key==="soon"):r.st.key===k).length;
  const show=r=>filter==="all"||(filter==="alert"&&(r.st.key==="expired"||r.st.key==="soon"))||(filter==="none"&&r.st.key==="none");
  const BTN={padding:"8px 12px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700};

  function startEdit(r){setEditing(r.id);setDraft(r.rec?.date||"");setMsg("");}
  async function save(r){
    if(!who.trim()){setMsg("⚠️ กรุณาใส่ชื่อผู้บันทึกด้านบนก่อน");return;}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(draft)){setMsg("⚠️ กรุณาเลือกวันหมดอายุ");return;}
    setBusy(true);setMsg("");
    try{
      const at=new Date().toISOString();
      const rec={date:draft,by:who.trim(),at};
      await set(ref(db,`expiry/${r.id}`),rec);
      await set(ref(db,`expiryLog/${r.id}/${Date.now()}`),{...rec,prev:r.rec?.date||""}).catch(()=>{});
      ss(KEY_EXP_NAME,who.trim());
      setEditing(null);setMsg(`✅ บันทึก ${r.label} แล้ว`);
    }catch(e){setMsg("⚠️ บันทึกไม่สำเร็จ: "+(e.message||e));}
    setBusy(false);
  }

  return(
    <div>
      <Card>
        <div style={{fontSize:16,fontWeight:800,marginBottom:4}}>⏰ วันหมดอายุ</div>
        <div style={{fontSize:13,color:"#5d7290",marginBottom:12,lineHeight:1.6}}>
          กรอกวันหมดอายุเฉพาะตอน<strong>ใช้ไปแล้วเติมของใหม่</strong>เท่านั้น ระบบจะเตือนเองเมื่อเหลือ ≤ {EXP_WARN_DAYS} วัน
        </div>
        <div style={{fontSize:12,color:"#5d7290",marginBottom:4}}>ชื่อผู้บันทึก</div>
        <NameInput value={who} onChange={setWho} options={names} placeholder="พิมพ์ชื่อของคุณ"/>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:12}}>
          {[["alert",`⚠️ ต้องดู (${count("alert")})`],["none",`📝 ยังไม่ระบุ (${count("none")})`],["all",`ทั้งหมด (${rows.length})`]].map(([id,l])=>(
            <button key={id} type="button" onClick={()=>setFilter(id)} style={{...BTN,background:filter===id?"#2a9fb8":"#f1f6fc",color:filter===id?"#fff":"#5d7290"}}>{l}</button>
          ))}
        </div>
        {msg&&<div style={{fontSize:13,marginTop:10,color:msg.startsWith("⚠️")?"#d6456f":"#128a6a"}}>{msg}</div>}
      </Card>

      {filter==="alert"&&count("alert")===0&&(
        <Card style={{textAlign:"center",color:"#128a6a",fontWeight:700}}>✨ ไม่มีของหมดอายุหรือใกล้หมดอายุ</Card>
      )}

      {EXPIRY_GROUPS.map(g=>{
        const list=rows.filter(r=>r.group===g.id&&show(r)).sort((a,b)=>filter==="all"?0:(a.st.days??9999)-(b.st.days??9999));
        if(!list.length) return null;
        return(
          <Card key={g.id} style={{padding:"14px 14px 8px"}}>
            <div style={{fontSize:14,fontWeight:800,marginBottom:10}}>{g.icon} {g.label}</div>
            {list.map(r=>(
              <div key={r.id} style={{borderTop:"1px solid #e3edf8",padding:"10px 2px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600}}>{r.label}</div>
                    <div style={{fontSize:12,color:"#7f93ab"}}>
                      {r.rec?.date?`Exp ${thaiShortDate(r.rec.date)}`:"ยังไม่ระบุวันหมดอายุ"}
                      {r.rec?.by?` · ${r.rec.by}`:""}
                    </div>
                  </div>
                  <span style={{fontSize:12,fontWeight:700,color:r.st.color,background:r.st.bg,padding:"4px 10px",borderRadius:99,whiteSpace:"nowrap"}}>{r.st.text}</span>
                  {editing!==r.id&&(
                    <button type="button" onClick={()=>startEdit(r)} style={{...BTN,background:"#e9f1fb",color:"#2f6fd6",minHeight:36}}>แก้</button>
                  )}
                </div>
                {editing===r.id&&(
                  <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                    <input type="date" value={draft} onChange={e=>setDraft(e.target.value)} style={{...BASE_INP,width:"auto",flex:"1 1 160px",fontSize:16}}/>
                    <button type="button" disabled={busy} onClick={()=>save(r)} style={{...BTN,background:"#4a86e8",color:"#fff"}}>{busy?"⏳":"บันทึก"}</button>
                    <button type="button" onClick={()=>setEditing(null)} style={{...BTN,background:"#f1f6fc",color:"#5d7290"}}>ยกเลิก</button>
                  </div>
                )}
              </div>
            ))}
          </Card>
        );
      })}
    </div>
  );
}

/* ── แก้รายการอุปกรณ์ที่ต้องเช็ค (ในแท็บตั้งค่า, ล็อก PIN) ── */
function ChecklistEditor({defaultRole,listKey="checklists",tabs=ROLES,defaults=DEFAULT_CHECKLISTS,title="📋 รายการอุปกรณ์ที่ต้องเช็ค",desc="แก้ชื่อ เพิ่ม ลบ หรือสลับลำดับได้ แล้วกดบันทึก · เวรที่เช็คไปแล้วยังนับตามรายการเดิม"}){
  const pick=(c,id)=>tabs?c[id]:(c&&Object.keys(c).length?c:null);
  const pathOf=id=>tabs?`${listKey}/${id}`:listKey;
  const [roleId,setRoleId]=useState(tabs?(ROLE_MAP[defaultRole]?defaultRole:"para"):"all");
  const [draft,setDraft]=useState(()=>clone(defaults[roleId]));
  const [dirty,setDirty]=useState(false);
  const [busy,setBusy]=useState(false); const [msg,setMsg]=useState("");
  const [custom,setCustom]=useState({});
  useEffect(()=>{const u=onValue(ref(db,listKey),s=>setCustom(s.val()||{}));return()=>u();},[]);
  // โหลดรายการใหม่เมื่อเปลี่ยนตำแหน่ง หรือมีคนอื่นบันทึก (ถ้ายังไม่ได้แก้ค้างไว้)
  useEffect(()=>{if(!dirty) setDraft(clone(normalizeChecklist(pick(custom,roleId))||defaults[roleId]));},[roleId,custom]);

  const BTN={padding:"8px 12px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700};
  const SMALL={...BTN,padding:0,width:36,height:36,background:"#f1f6fc",color:"#5d7290",flexShrink:0};
  const newId=p=>`${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`;
  function upd(fn){setDraft(d=>{const n=clone(d);fn(n);return n;});setDirty(true);setMsg("");}
  const total=draft.reduce((s,g)=>s+g.items.length,0);

  function switchRole(id){
    if(id===roleId) return;
    if(dirty&&!window.confirm("ยังไม่ได้บันทึกการแก้ไข ต้องการทิ้งแล้วเปลี่ยนตำแหน่งไหม?")) return;
    setDirty(false);setRoleId(id);setDraft(clone(normalizeChecklist(pick(custom,id))||defaults[id]));setMsg("");
  }
  async function save(){
    const clean=normalizeChecklist(draft);
    if(!clean||!clean.some(g=>g.items.length)){setMsg("⚠️ ต้องมีอย่างน้อย 1 รายการ");return;}
    const empty=draft.find(g=>g.items.some(i=>!String(i.label||"").trim()));
    if(empty&&!window.confirm("มีบางรายการที่ยังไม่ได้ใส่ชื่อ จะถูกตัดออก บันทึกต่อไหม?")) return;
    setBusy(true);
    try{await set(ref(db,pathOf(roleId)),clean);setDirty(false);setMsg(`✅ บันทึกแล้ว · ${clean.reduce((s,g)=>s+g.items.length,0)} รายการ มีผลกับการเช็คครั้งถัดไป`);}
    catch(e){setMsg("⚠️ บันทึกไม่สำเร็จ: "+(e.message||e));}
    setBusy(false);
  }
  async function resetDefault(){
    if(!window.confirm(`คืนค่ารายการของ ${tabs?ROLE_MAP[roleId].short:"รายการนี้"} กลับเป็นค่าเริ่มต้น?`)) return;
    setBusy(true);
    try{await remove(ref(db,pathOf(roleId)));setDirty(false);setDraft(clone(defaults[roleId]));setMsg("✅ คืนค่าเริ่มต้นแล้ว");}
    catch(e){setMsg("⚠️ ไม่สำเร็จ: "+(e.message||e));}
    setBusy(false);
  }

  return(
    <Card style={{border:"1.5px solid #9fd3e6"}}>
      <div style={{fontSize:14,fontWeight:800,color:"#1f7f9a",marginBottom:4}}>{title}</div>
      <div style={{fontSize:12,color:"#5d7290",marginBottom:12}}>{desc}</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
        {(tabs||[]).map(r=>(
          <button key={r.id} type="button" onClick={()=>switchRole(r.id)} style={{...BTN,background:roleId===r.id?"#2a9fb8":"#f1f6fc",color:roleId===r.id?"#fff":"#5d7290"}}>
            {r.icon} {r.short}{custom[r.id]?" ✎":""}
          </button>
        ))}
      </div>

      {draft.map((g,gi)=>(
        <div key={g.id} style={{border:"1px solid #e3edf8",borderRadius:12,padding:10,marginBottom:10,background:"#fbfdff"}}>
          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:20}}>{g.icon}</span>
            <input value={g.label} onChange={e=>upd(d=>{d[gi].label=e.target.value;})} aria-label="ชื่อหมวด"
              style={{...BASE_INP,fontWeight:700,fontSize:15}}/>
            <button type="button" aria-label="เลื่อนหมวดขึ้น" disabled={gi===0} onClick={()=>upd(d=>{[d[gi-1],d[gi]]=[d[gi],d[gi-1]];})} style={{...SMALL,opacity:gi===0?.4:1}}>▲</button>
            <button type="button" aria-label="เลื่อนหมวดลง" disabled={gi===draft.length-1} onClick={()=>upd(d=>{[d[gi+1],d[gi]]=[d[gi],d[gi+1]];})} style={{...SMALL,opacity:gi===draft.length-1?.4:1}}>▼</button>
            <button type="button" aria-label="ลบหมวด" onClick={()=>{if(window.confirm(`ลบหมวด “${g.label}” และ ${g.items.length} รายการในหมวดนี้?`)) upd(d=>{d.splice(gi,1);});}} style={{...SMALL,background:"rgba(226,92,134,0.12)",color:"#d6456f"}}>✕</button>
          </div>
          {g.items.map((it,ii)=>(
            <div key={it.id} style={{display:"flex",gap:5,alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:12,color:"#7f93ab",width:18,textAlign:"right",flexShrink:0}}>{ii+1}.</span>
              <textarea value={it.label} onChange={e=>upd(d=>{d[gi].items[ii].label=e.target.value.replace(/\n/g," ");})} placeholder="ชื่ออุปกรณ์" aria-label={`รายการที่ ${ii+1}`}
                rows={Math.min(3,Math.max(1,Math.ceil((it.label||"").length/24)))}
                style={{...BASE_INP,fontSize:14,padding:"8px 10px",resize:"none",lineHeight:1.4,minWidth:0}}/>
              <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0}}>
                <button type="button" aria-label="เลื่อนขึ้น" disabled={ii===0} onClick={()=>upd(d=>{const a=d[gi].items;[a[ii-1],a[ii]]=[a[ii],a[ii-1]];})} style={{...SMALL,height:22,width:32,fontSize:10,opacity:ii===0?.35:1}}>▲</button>
                <button type="button" aria-label="เลื่อนลง" disabled={ii===g.items.length-1} onClick={()=>upd(d=>{const a=d[gi].items;[a[ii+1],a[ii]]=[a[ii],a[ii+1]];})} style={{...SMALL,height:22,width:32,fontSize:10,opacity:ii===g.items.length-1?.35:1}}>▼</button>
              </div>
              <button type="button" aria-label="ลบรายการ" onClick={()=>upd(d=>{d[gi].items.splice(ii,1);})} style={{...SMALL,background:"rgba(226,92,134,0.12)",color:"#d6456f"}}>✕</button>
            </div>
          ))}
          <button type="button" onClick={()=>upd(d=>{d[gi].items.push({id:newId("i"),label:""});})} style={{...BTN,marginTop:4,marginLeft:23,background:"#e9f1fb",color:"#2f6fd6"}}>＋ เพิ่มรายการในหมวดนี้</button>
        </div>
      ))}
      <button type="button" onClick={()=>upd(d=>{d.push({id:newId("g"),label:`${d.length+1}. หมวดใหม่`,icon:"📦",color:"#4a86e8",items:[{id:newId("i"),label:""}]});})}
        style={{...BTN,width:"100%",padding:"10px 0",background:"#f1f6fc",color:"#2f6fd6",marginBottom:12}}>＋ เพิ่มหมวด</button>

      {msg&&<div style={{fontSize:13,marginBottom:10,color:msg.startsWith("⚠️")?"#d6456f":"#128a6a"}}>{msg}</div>}
      <div style={{display:"flex",gap:8}}>
        <button type="button" onClick={resetDefault} disabled={busy} style={{...BTN,flex:1,padding:"12px 0",background:"#f1f6fc",color:"#5d7290"}}>คืนค่าเริ่มต้น</button>
        <button type="button" onClick={save} disabled={busy||!dirty} style={{...BTN,flex:2,padding:"12px 0",background:dirty?"#4a86e8":"#b8cde8",color:"#fff",fontSize:14}}>
          {busy?"⏳ กำลังบันทึก...":dirty?`✨ บันทึก (${total} รายการ)`:"บันทึกแล้ว"}
        </button>
      </div>
    </Card>
  );
}

/* ── จัดการรายชื่อเจ้าหน้าที่ (ในแท็บตั้งค่า) ── */
function StaffManager(){
  const staff=useStaff();
  const [group,setGroup]=useState("nurse");
  const [text,setText]=useState(""); const [msg,setMsg]=useState(""); const [busy,setBusy]=useState(false);
  const list=[...(staff[group]||[])].sort((x,y)=>bareName(x).localeCompare(bareName(y),"th"));
  const BTN={padding:"8px 12px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700};

  async function addMany(){
    const names=[...new Set(text.split(/\n|,/).map(x=>x.trim()).filter(Boolean))];
    if(!names.length) return;
    const have=list.map(normName);
    const fresh=names.filter(n=>!have.includes(normName(n)));
    setBusy(true);setMsg("");
    try{await Promise.all(fresh.map(n=>addStaff(group,n)));setText("");setMsg(`✅ เพิ่ม ${fresh.length} ชื่อ`+(names.length>fresh.length?` (ซ้ำ ${names.length-fresh.length} ชื่อ ข้ามไป)`:""));}
    catch(e){setMsg("⚠️ เพิ่มไม่สำเร็จ: "+(e.message||e));}
    setBusy(false);
  }
  async function del(n){
    if(!window.confirm(`ลบ “${n}” ออกจากรายชื่อ?`)) return;
    try{await remove(ref(db,`staff/${group}/${staffKey(n)}`));}catch(e){setMsg("⚠️ ลบไม่สำเร็จ: "+(e.message||e));}
  }

  return(
    <Card style={{border:"1.5px solid #9fd3e6"}}>
      <div style={{fontSize:14,fontWeight:800,color:"#1f7f9a",marginBottom:4}}>🫶 รายชื่อเจ้าหน้าที่</div>
      <div style={{fontSize:12,color:"#5d7290",marginBottom:12}}>ชื่อในนี้จะเด้งขึ้นให้เลือก เมื่อพิมพ์ในหน้าลงเวร</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
        {STAFF_GROUPS.map(g=>(
          <button key={g.id} type="button" onClick={()=>{setGroup(g.id);setMsg("");}} style={{...BTN,background:group===g.id?"#4a86e8":"#f1f6fc",color:group===g.id?"#fff":"#5d7290"}}>
            {g.label} ({(staff[g.id]||[]).length})
          </button>
        ))}
      </div>
      <div style={{fontSize:12,color:"#5d7290",marginBottom:6}}>เพิ่มชื่อ (วางได้หลายชื่อ บรรทัดละ 1 ชื่อ)</div>
      <textarea value={text} onChange={e=>{setText(e.target.value);setMsg("");}} rows={4}
        placeholder={group==="vehicle"?"กษ 1139 นครศรีธรรมราช":"นส.กานดา ศรีสุข\nนายสมชาย ขับดี"}
        style={{...BASE_INP,width:"100%",boxSizing:"border-box",resize:"vertical",lineHeight:1.7,fontSize:16}}/>
      <button type="button" onClick={addMany} disabled={busy} style={{...BTN,width:"100%",padding:"12px 0",marginTop:8,background:busy?"#8aa0b8":"#4a86e8",color:"#fff",fontSize:14}}>
        {busy?"⏳ กำลังเพิ่ม...":"＋ เพิ่มเข้ารายชื่อ"}
      </button>
      {msg&&<div style={{fontSize:13,marginTop:8,color:msg.startsWith("⚠️")?"#d6456f":"#128a6a"}}>{msg}</div>}
      <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:6}}>
        {list.length===0&&<div style={{fontSize:13,color:"#7f93ab"}}>ยังไม่มีรายชื่อในกลุ่มนี้</div>}
        {list.map(n=>(
          <div key={n} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 6px 6px 12px",background:"#f6faff",borderRadius:8}}>
            <span style={{flex:1,fontSize:14}}>{n}</span>
            <button type="button" aria-label={`ลบ ${n}`} onClick={()=>del(n)} style={{...BTN,width:40,height:36,padding:0,background:"rgba(226,92,134,0.15)",color:"#d6456f"}}>✕</button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SettingsPage({myRole,equipment,onSaveEquip}){
  const role=ROLE_MAP[myRole];
  const [draft,setDraft]=useState([...(equipment[myRole]||[])]);
  const [saved,setSaved]=useState(false); const [saving,setSaving]=useState(false);
  const [currentPin,setCurrentPin]=useState(""); const [newPin,setNewPin]=useState("");
  const [pinSaved,setPinSaved]=useState(false); const [pinError,setPinError]=useState("");
  const [realPin,setRealPin]=useState(DEFAULT_PIN);

  useEffect(()=>{const u=onValue(ref(db,"config/summaryPin"),s=>{if(s.val())setRealPin(s.val())});return()=>u();},[]);

  function update(i,val){const d=[...draft];d[i]=val;setDraft(d);setSaved(false);}
  function add(){setDraft([...draft,""]);setSaved(false);}
  function removeItem(i){const d=[...draft];d.splice(i,1);setDraft(d);setSaved(false);}
  function move(i,dir){const d=[...draft],j=i+dir;if(j<0||j>=d.length)return;[d[i],d[j]]=[d[j],d[i]];setDraft(d);setSaved(false);}

  async function handleSaveEquip(){
    setSaving(true);
    const clean=draft.filter(x=>x.trim());
    const newEq={...equipment,[myRole]:clean};
    await set(ref(db,"equipment"),newEq);onSaveEquip(newEq);
    setSaving(false);setSaved(true);setTimeout(()=>setSaved(false),2000);
  }
  async function handleChangePin(){
    setPinError("");
    if(currentPin!==realPin){setPinError("PIN ปัจจุบันไม่ถูกต้อง");return;}
    if(newPin.length<4){setPinError("PIN ใหม่ต้องมีอย่างน้อย 4 ตัว");return;}
    if(!/^\d+$/.test(newPin)){setPinError("PIN ต้องเป็นตัวเลขเท่านั้น");return;}
    await set(ref(db,"config/summaryPin"),newPin);
    setPinSaved(true);setCurrentPin("");setNewPin("");setTimeout(()=>setPinSaved(false),2000);
  }

  return(
    <div>
      <ChecklistEditor defaultRole={myRole}/>
      <ChecklistEditor listKey="expiryItems" tabs={null} defaults={DEFAULT_EXPIRY}
        title="⏰ รายการที่ต้องติดตามวันหมดอายุ"
        desc="เพิ่ม ลบ แก้ชื่อ หรือสลับลำดับได้ · แก้ชื่อแล้ววันหมดอายุที่กรอกไว้ยังอยู่ · ลบแล้วจะไม่เตือนรายการนั้นอีก"/>

      {myRole!=="para"&&myRole!=="aemt"&&myRole!=="driv"&&(
        <>
          <Card>
            {draft.map((item,i)=>(
              <div key={i} style={{display:"flex",gap:6,marginBottom:8,alignItems:"center"}}>
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  <button onClick={()=>move(i,-1)} style={iconBtn}>▲</button>
                  <button onClick={()=>move(i,1)} style={iconBtn}>▼</button>
                </div>
                <input value={item} onChange={e=>update(i,e.target.value)} placeholder={`รายการที่ ${i+1}`} style={BASE_INP}/>
                <button onClick={()=>removeItem(i)} style={{...iconBtn,background:"rgba(226,92,134,0.15)",color:"#d6456f",padding:"6px 10px",fontSize:14}}>✕</button>
              </div>
            ))}
            <button onClick={add} style={{marginTop:6,padding:"9px 18px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:role.color+"22",color:role.color}}>+ เพิ่มรายการ</button>
          </Card>
          <div style={{display:"flex",gap:10,marginBottom:24}}>
            <button onClick={()=>{if(window.confirm("รีเซ็ตรายการกลับค่าเริ่มต้น?"))setDraft([...DEFAULT_EQUIPMENT[myRole]]);}} style={{flex:1,padding:"13px 0",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:700,background:"#f1f6fc",color:"#5d7290"}}>🔄 รีเซ็ต</button>
            <button onClick={handleSaveEquip} disabled={saving} style={{flex:3,padding:"13px 0",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:15,fontWeight:800,background:saved?"#22a37f":saving?"#8aa0b8":`linear-gradient(90deg,${role.color},${role.color}cc)`,color:"#fff",transition:"all 0.3s"}}>
              {saving?"⏳ กำลังบันทึก...":saved?"✅ บันทึกแล้ว!":"✨ บันทึกการตั้งค่า"}
            </button>
          </div>
        </>
      )}

      <StaffManager/>

      <Card style={{border:"1.5px solid rgba(232,137,58,0.3)"}}>
        <div style={{fontSize:14,fontWeight:800,color:"#c26a1e",marginBottom:14}}>🔑 เปลี่ยน PIN</div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:12,color:"#5d7290",marginBottom:6}}>PIN ปัจจุบัน</div>
          <input type="password" inputMode="numeric" value={currentPin} onChange={e=>{setCurrentPin(e.target.value);setPinError("");}} placeholder="PIN ปัจจุบัน" maxLength={6} style={{...BASE_INP,letterSpacing:6,fontSize:20}}/>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,color:"#5d7290",marginBottom:6}}>PIN ใหม่ (4-6 หลัก)</div>
          <input type="password" inputMode="numeric" value={newPin} onChange={e=>{setNewPin(e.target.value.replace(/\D/g,""));setPinError("");}} placeholder="PIN ใหม่" maxLength={6} style={{...BASE_INP,letterSpacing:6,fontSize:20}}/>
        </div>
        {pinError&&<div style={{fontSize:13,color:"#d6456f",marginBottom:10}}>⚠️ {pinError}</div>}
        <button onClick={handleChangePin} style={{width:"100%",padding:"12px 0",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:800,background:pinSaved?"#22a37f":"linear-gradient(90deg,#4a86e8,#3a6fd0)",color:"#fff"}}>
          {pinSaved?"✅ เปลี่ยน PIN เรียบร้อย!":"🔑 เปลี่ยน PIN"}
        </button>
        <div style={{fontSize:12,color:"#8aa0b8",marginTop:10,textAlign:"center"}}>PIN เริ่มต้น: 1234</div>
      </Card>
    </div>
  );
}

/* ── Success Screen ── */
function SuccessScreen({myName,role,selDay,selMonth,selYear,selShift,totalItems,note,savedAt,onClose}){
  const sm=SHIFT_META[selShift];
  const timeStr=savedAt?new Date(savedAt).toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"}):"";
  return(
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16,overflowY:"auto"}}>
      <div style={{background:"linear-gradient(160deg,#f3f8ff,#ecf7f6)",borderRadius:20,padding:28,maxWidth:400,width:"100%",border:"2px solid #128a6a55",boxShadow:"0 0 60px rgba(18,160,120,0.25)"}}>
        
        {/* Header - screenshot area */}
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:56,marginBottom:10,animation:"bounce 0.6s ease"}}>✅</div>
          <div style={{fontSize:20,fontWeight:900,color:"#128a6a",marginBottom:4}}>เช็คเสร็จสมบูรณ์!</div>
          <div style={{fontSize:12,color:"#7f93ab"}}>ขอบคุณสำหรับความร่วมมือ ขอให้เป็นวันที่ดี 🍀</div>
        </div>

        {/* Report card - screenshot friendly */}
        <div style={{background:"#f1f7ff",border:"1.5px solid #128a6a44",borderRadius:14,padding:18,marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,paddingBottom:12,borderBottom:"1px solid #e3edf8"}}>
            <div style={{fontSize:28}}>🚑</div>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:"#1f3047"}}>EMS Equipment Check</div>
              <div style={{fontSize:11,color:"#7f93ab"}}>รพ.มหาราช นครศรีธรรมราช</div>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div style={{background:"#f6faff",borderRadius:8,padding:"10px 12px"}}>
              <div style={{fontSize:11,color:"#7f93ab",marginBottom:4}}>ผู้ตรวจเช็ค</div>
              <div style={{fontSize:13,fontWeight:700,color:"#1f3047"}}>{role.icon} {role.short}</div>
              <div style={{fontSize:13,color:"#1f3047",marginTop:2}}>{myName||"-"}</div>
            </div>
            <div style={{background:"#f6faff",borderRadius:8,padding:"10px 12px"}}>
              <div style={{fontSize:11,color:"#7f93ab",marginBottom:4}}>วันที่/เวร</div>
              <div style={{fontSize:13,fontWeight:700,color:sm.accent}}>{sm.icon} เวร{selShift}</div>
              <div style={{fontSize:12,color:"#1f3047",marginTop:2}}>{selDay} {MONTH_NAMES[selMonth]} {selYear+543}</div>
            </div>
          </div>

          <div style={{background:"rgba(18,160,120,0.08)",border:"1px solid #128a6a33",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
            <div style={{fontSize:11,color:"#7f93ab",marginBottom:4}}>ผลการตรวจเช็ค</div>
            <div style={{fontSize:15,fontWeight:900,color:"#128a6a"}}>✓ ครบ {totalItems} รายการ</div>
            {timeStr&&<div style={{fontSize:11,color:"#7f93ab",marginTop:4}}>บันทึกเมื่อ {timeStr} น.</div>}
          </div>

          {note&&(
            <div style={{background:"#f6faff",borderRadius:8,padding:"10px 12px"}}>
              <div style={{fontSize:11,color:"#7f93ab",marginBottom:4}}>📝 ปัญหา/ข้อเสนอแนะ</div>
              <div style={{fontSize:13,color:"#1f3047"}}>{note}</div>
            </div>
          )}
        </div>

        {/* Warning if duplicate */}
        <div style={{fontSize:11,color:"#7f93ab",textAlign:"center",marginBottom:14}}>
          📸 แคปหน้าจอตรงนี้ได้เลยค่ะ แล้วกด "กลับหน้าหลัก"
        </div>

        <button onClick={onClose} style={{width:"100%",padding:"14px 0",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:15,fontWeight:800,background:"linear-gradient(90deg,#22a37f,#1a8a6b)",color:"#fff"}}>
          กลับหน้าหลัก
        </button>
      </div>
      <style>{`@keyframes bounce{0%{transform:scale(0)}60%{transform:scale(1.2)}100%{transform:scale(1)}}`}</style>
    </div>
  );
}

/* ── Root App ── */
export default function App(){
  const {year:ty,month:tm,day:td}=todayParts();
  const {shift:autoShift,year:shiftYear,month:shiftMonth,day:shiftDay}=getShiftAndDate();
  const [myRole,setMyRole]=useState(()=>ls(KEY_ROLE,null));
  const [view,setView]=useState("check");
  const [selYear,setSelYear]=useState(shiftYear); const [selMonth,setSelMonth]=useState(shiftMonth);
  const [selDay,setSelDay]=useState(shiftDay); const [selShift,setSelShift]=useState(autoShift);
  const [equipment,setEquipment]=useState(DEFAULT_EQUIPMENT);
  const [pinUnlocked,setPinUnlocked]=useState(()=>{const t=ls(PIN_SESSION_KEY,0);return t&&(Date.now()-t)<8*60*60*1000;});

  useEffect(()=>{const u=onValue(ref(db,"equipment"),snap=>{const d=snap.val();if(d)setEquipment(d);});return()=>u();},[]);
  // รายการอุปกรณ์ที่แก้ในแอป
  const [,setChkVer]=useState(0);
  useEffect(()=>{const u=onValue(ref(db,"checklists"),snap=>{applyChecklists(snap.val());setChkVer(v=>v+1);});return()=>u();},[]);
  useEffect(()=>{const u=onValue(ref(db,"expiryItems"),snap=>{applyExpiryItems(snap.val());setChkVer(v=>v+1);});return()=>u();},[]);
  useEffect(()=>{const u=onValue(ref(db,"pending"),snap=>{applyPending(snap.val());setChkVer(v=>v+1);});return()=>u();},[]);

  function selectRole(id){setMyRole(id);ss(KEY_ROLE,id);}
  function switchRole(){setMyRole(null);ss(KEY_ROLE,null);setView("check");}
  function handleUnlock(){setPinUnlocked(true);}
  function handleLock(){setPinUnlocked(false);ss(PIN_SESSION_KEY,0);setView("check");}

  if(!myRole) return <RoleSelectScreen onSelect={selectRole}/>;
  if((view==="dashboard"||view==="summary"||view==="roster"||view==="settings")&&!pinUnlocked) return <PinLockScreen onUnlock={handleUnlock}/>;

  const role=ROLE_MAP[myRole];
  const TABS=[
    {id:"check",     label:"📝 บันทึก"},
    {id:"expiry",    label:"⏰ วันหมดอายุ"},
    {id:"summary",   label:"🗂️ สรุป 🔒"},
    {id:"roster",    label:"🫶 รายชื่อเวร 🔒"},
    {id:"dashboard", label:"📈 Dashboard 🔒"},
    {id:"settings",  label:"⚙️ ตั้งค่า 🔒"},
  ];

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#f3f8ff,#ecf7f6)",fontFamily:"'Sarabun','Noto Sans Thai',sans-serif",color:"#1f3047"}}>
      <div style={{background:"linear-gradient(100deg,#d4ecfb,#dfe3fc)",color:"#1f3047",padding:"14px 18px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 2px 14px rgba(74,134,232,0.15)",flexWrap:"wrap"}}>
        <div style={{fontSize:26}}>🚑</div>
        <div>
          <div style={{fontSize:17,fontWeight:800,letterSpacing:1}}>EMS Equipment Check</div>
          <div style={{fontSize:11,opacity:.85}}>รพ.มหาราช · ☁️ Firebase</div>
        </div>
        <button onClick={switchRole} style={{display:"flex",alignItems:"center",gap:6,background:role.color+"33",border:`1.5px solid ${role.color}66`,borderRadius:20,padding:"5px 14px",cursor:"pointer",fontFamily:"inherit",color:"#1f3047",fontSize:13,fontWeight:700}}>
          {role.icon} {role.short} <span style={{fontSize:11,opacity:.7}}>เปลี่ยน</span>
        </button>
        <div style={{marginLeft:"auto",display:"flex",gap:6,flexWrap:"wrap"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setView(t.id)} style={{padding:"7px 13px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,background:view===t.id?"#ffffff":"rgba(255,255,255,0.55)",color:view===t.id?"#2f6fd6":"#3b4f69",boxShadow:view===t.id?"0 2px 8px rgba(74,134,232,0.18)":"none",transition:"all 0.2s"}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"18px 14px"}}>
        {view!=="settings"&&view!=="expiry"&&(
          <div style={{background:"#ffffff",borderRadius:14,padding:"13px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            {view==="check"?(
              <>
                <span style={{fontSize:13,color:"#5d7290"}}>🗓️</span>
                <span style={{fontSize:13,fontWeight:700,color:"#1f3047"}}>{selDay} {MONTH_NAMES[selMonth]} {selYear+543}</span>
                <div style={{display:"flex",gap:6,marginLeft:"auto"}}>
                  {(myRole==="driv"?DRIV_SHIFTS:SHIFTS).map(s=>(
                    <button key={s} onClick={()=>{
                      const sd=getShiftAndDate();
                      setSelShift(s);
                      // เวรดึกใช้วันเมื่อวาน ถ้าเวลาปัจจุบันอยู่ในช่วงเวรดึก
                      if(s==="ดึก"){
                        const now=getThaiNow(); const h=now.getHours(); const m=now.getMinutes();
                        const inDirk=(h*60+m)<8*60+15;
                        if(inDirk){const y=new Date(getThaiNow());y.setDate(y.getDate()-1);setSelYear(y.getFullYear());setSelMonth(y.getMonth());setSelDay(y.getDate());}
                        else{setSelYear(shiftYear);setSelMonth(shiftMonth);setSelDay(shiftDay);}
                      } else {setSelYear(shiftYear);setSelMonth(shiftMonth);setSelDay(shiftDay);}
                    }} style={{padding:"6px 13px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:selShift===s?SHIFT_META[s].accent:"#f1f6fc",color:selShift===s?"#fff":"#5d7290",transition:"all 0.2s"}}>
                      {SHIFT_META[s].icon} {s}
                    </button>
                  ))}
                </div>
              </>
            ):(
              <>
                <span style={{fontSize:13,opacity:.65}}>เดือน/ปี:</span>
                <select value={selMonth} onChange={e=>setSelMonth(+e.target.value)} style={BASE_SEL}>
                  {MONTH_NAMES.map((m,i)=><option key={i} value={i}>{m}</option>)}
                </select>
                <select value={selYear} onChange={e=>setSelYear(+e.target.value)} style={BASE_SEL}>
                  {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y+543}</option>)}
                </select>
              </>
            )}
          </div>
        )}
        <StartupAlert onGoExpiry={()=>setView("expiry")} onGoCheck={()=>setView("check")}/>
        {view==="check"&&<PendingCard roleId={myRole}/>}
        {view==="check"&&<ExpiryBanner onOpen={()=>setView("expiry")}/>}
        {view==="expiry"&&<ExpiryPage/>}
        {view==="check"&&myRole==="para"&&<ParaCheckPage selYear={selYear} selMonth={selMonth} selDay={selDay} selShift={selShift}/>}
        {view==="check"&&myRole==="aemt"&&<AemtCheckPage selYear={selYear} selMonth={selMonth} selDay={selDay} selShift={selShift}/>}
        {view==="check"&&myRole==="driv"&&<DrivCheckPage selYear={selYear} selMonth={selMonth} selDay={selDay} selShift={selShift}/>}
        {view==="summary"  &&<SummaryPage   selYear={selYear} selMonth={selMonth} equipment={equipment} onLock={handleLock}/>}
        {view==="roster"   &&<RosterHistoryPage selYear={selYear} selMonth={selMonth} onLock={handleLock}/>}
        {view==="dashboard"&&<DashboardPage selYear={selYear} selMonth={selMonth} equipment={equipment} onLock={handleLock}/>}
        {view==="settings" &&<SettingsPage  myRole={myRole} equipment={equipment} onSaveEquip={setEquipment}/>}
      </div>
    </div>
  );
}
