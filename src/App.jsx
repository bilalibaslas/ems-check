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
  { id:"para", label:"Paramedic / ENP / RN", short:"Para/RN", icon:"🩺", color:"#ef4444" },
  { id:"aemt", label:"AEMT",                  short:"AEMT",    icon:"🚑", color:"#3b82f6" },
  { id:"driv", label:"พขร.",                  short:"พขร.",    icon:"🚗", color:"#10b981" },
];
const ROLE_MAP = Object.fromEntries(ROLES.map(r=>[r.id,r]));
const SHIFTS = ["เช้า","บ่าย","ดึก"];
const SHIFT_META = {
  "เช้า":{accent:"#F59E0B",icon:"🌅"},
  "บ่าย":{accent:"#3B82F6",icon:"🌤"},
  "ดึก": {accent:"#7C3AED",icon:"🌙"},
};

/* ── Para/RN grouped items ── */
const PARA_GROUPS = [
  {
    id:"airway", label:"1. Airway and Breathing", icon:"💨", color:"#ef4444",
    items:[
      {id:"ett",          label:"ETT no 3-8 (ระบุอันที่หมดเร็วสุด)",                       hasExp:true},
      {id:"facemask",     label:"Face mask (ผู้ใหญ่, เด็ก 2 ขนาด)",                        hasExp:false},
      {id:"ambubag",      label:"Ambubag (3 ขนาด) (ระบุอันที่หมดเร็วสุด)",                  hasExp:true},
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
    id:"ivdrug", label:"2. IV Set and Drug", icon:"💉", color:"#3b82f6",
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
      {id:"etomidate",    label:"Etomidate, Succinylcholine (ในตู้เย็น)",                    hasExp:true},
    ]
  },
  {
    id:"monitor", label:"3. Monitoring Equipment", icon:"📟", color:"#10b981",
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

function ls(key,fb){try{const v=localStorage.getItem(key);return v?JSON.parse(v):fb;}catch{return fb;}}
function ss(key,v){try{localStorage.setItem(key,JSON.stringify(v));}catch{}}
function getDays(y,m){return new Date(y,m+1,0).getDate();}
function recKey(y,m,d,shift,roleId){return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}_${shift}_${roleId}`;}
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
  if(days<0)  return "#ef4444";  // หมดแล้ว
  if(days<=30) return "#f59e0b"; // ใกล้หมด
  return "#4ade80"; // OK
}
function ettExpText(days){
  if(days===null) return null;
  if(days<0)   return `หมดอายุแล้ว ${Math.abs(days)} วัน ⚠️`;
  if(days===0) return "หมดอายุวันนี้! ⚠️";
  if(days<=30) return `เหลือ ${days} วัน ⚠️`;
  return `เหลือ ${days} วัน ✓`;
}

const BASE_INP={background:"rgba(255,255,255,0.07)",border:"1.5px solid rgba(255,255,255,0.13)",borderRadius:9,padding:"10px 14px",color:"#f1f5f9",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",width:"100%"};
const BASE_SEL={background:"rgba(255,255,255,0.1)",border:"1.5px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"8px 12px",color:"#f1f5f9",fontSize:14,fontFamily:"inherit",cursor:"pointer"};
const iconBtn={background:"rgba(255,255,255,0.07)",border:"none",borderRadius:6,color:"#94a3b8",cursor:"pointer",padding:"3px 7px",fontSize:11,lineHeight:1};
function Card({children,style={}}){return <div style={{background:"rgba(255,255,255,0.05)",borderRadius:14,padding:"18px 20px",marginBottom:14,...style}}>{children}</div>;}

/* ── Excel Export ── */
function exportToExcel(allData,equipment,selYear,selMonth){
  const days=getDays(selYear,selMonth);
  const rows=[["วันที่","เวร","ตำแหน่ง","ชื่อ","เช็คแล้ว","ทั้งหมด","สถานะ","หมายเหตุ"]];
  for(let d=1;d<=days;d++){
    for(const shift of SHIFTS){
      for(const role of ROLES){
        const k=recKey(selYear,selMonth,d,shift,role.id);
        const e=allData[k];
        let done=0,total=0;
        if(role.id==="para"){
          total=PARA_GROUPS.reduce((s,g)=>s+g.items.length,0);
          done=e?Object.values(e.checked||{}).filter(Boolean).length:0;
        } else {
          const its=equipment[role.id]||[];
          total=its.length;
          done=e?Object.values(e.checked||{}).filter(Boolean).length:0;
        }
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
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f172a,#1e293b)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Sarabun','Noto Sans Thai',sans-serif",padding:24}}>
      <div style={{fontSize:44,marginBottom:12}}>🔒</div>
      <div style={{fontSize:20,fontWeight:800,color:"#f1f5f9",marginBottom:6}}>Dashboard & จัดการข้อมูล</div>
      <div style={{fontSize:14,color:"#64748b",marginBottom:40}}>ใส่ PIN เพื่อเข้าถึง</div>
      <div style={{display:"flex",gap:16,marginBottom:36,animation:shake?"shake 0.4s ease":"none"}}>
        {Array.from({length:correctPin.length}).map((_,i)=>(
          <div key={i} style={{width:18,height:18,borderRadius:"50%",background:i<pin.length?(error?"#ef4444":"#f1f5f9"):"rgba(255,255,255,0.15)",transition:"background 0.15s"}}/>
        ))}
      </div>
      {error&&<div style={{fontSize:13,color:"#ef4444",marginBottom:20,fontWeight:600}}>PIN ไม่ถูกต้อง</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3, 72px)",gap:12}}>
        {digits.map((d,i)=>(
          <button key={i} onClick={()=>d==="⌫"?handleDelete():d?handleDigit(d):null} disabled={!d}
            style={{width:72,height:72,borderRadius:16,border:"none",cursor:d?"pointer":"default",fontFamily:"inherit",fontSize:d==="⌫"?22:26,fontWeight:700,background:d?"rgba(255,255,255,0.08)":"transparent",color:d?"#f1f5f9":"transparent"}}>
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
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f172a,#1e293b)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Sarabun','Noto Sans Thai',sans-serif"}}>
      <div style={{fontSize:52,marginBottom:16}}>🚑</div>
      <div style={{fontSize:22,fontWeight:900,color:"#f1f5f9",marginBottom:6}}>EMS Equipment Check</div>
      <div style={{fontSize:14,color:"#64748b",marginBottom:40}}>รพ.มหาราช · เลือกตำแหน่งของคุณ</div>
      {ROLES.map(r=>(
        <button key={r.id} onClick={()=>onSelect(r.id)} style={{width:"100%",maxWidth:360,marginBottom:14,padding:"20px 24px",borderRadius:16,border:`2px solid ${r.color}44`,cursor:"pointer",background:`linear-gradient(135deg,${r.color}22,${r.color}11)`,display:"flex",alignItems:"center",gap:16,fontFamily:"inherit"}}>
          <div style={{fontSize:32}}>{r.icon}</div>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:17,fontWeight:800,color:"#f1f5f9"}}>{r.label}</div>
            <div style={{fontSize:12,color:"#64748b",marginTop:2}}>แตะเพื่อเข้าระบบ</div>
          </div>
          <div style={{marginLeft:"auto",color:r.color,fontSize:22}}>›</div>
        </button>
      ))}
    </div>
  );
}

/* ── Para Check Page ── */
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
    await set(dbRef,{name:myName,checked,note,expDates,roleId:"para",savedAt:new Date().toISOString()});
    setSaving(false);setSaved(true);setWarn("duplicate");setTimeout(()=>setSaved(false),2500);
    if(paraDone===paraTotal&&note.trim()) setShowSuccess(true);
  }

  function getExpDays(id){ return daysUntilExp(expDates[id]||""); }
  function setExp(id,val){ setExpDates(p=>({...p,[id]:val})); setSaved(false); }

  if(loading) return <div style={{textAlign:"center",padding:60,color:"#64748b"}}><div style={{fontSize:32,marginBottom:12}}>⏳</div>กำลังโหลด...</div>;

  return(
    <div>
      {showSuccess&&<SuccessScreen myName={myName} role={role} selDay={selDay} selMonth={selMonth} selYear={selYear} selShift={selShift} totalItems={totalItems} note={note} savedAt={new Date().toISOString()} onClose={()=>setShowSuccess(false)}/>}
      {/* date badge */}
      <div style={{background:shiftMeta.accent+"20",border:`1.5px solid ${shiftMeta.accent}44`,borderRadius:10,padding:"10px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:13,color:shiftMeta.accent}}>{shiftMeta.icon} {selDay} {MONTH_NAMES[selMonth]} {selYear+543} · เวร{selShift}</span>
        {saved&&<span style={{marginLeft:"auto",fontSize:12,color:"#4ade80"}}>✓ Sync ☁️</span>}
      </div>

      {warn==="future"&&(
        <div style={{background:"rgba(239,68,68,0.12)",border:"1.5px solid #ef444466",borderRadius:10,padding:"12px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div><div style={{fontSize:14,fontWeight:700,color:"#f87171"}}>วันที่เป็นอนาคต!</div><div style={{fontSize:12,color:"#94a3b8"}}>กรุณาตรวจสอบวันที่ก่อนบันทึกค่ะ</div></div>
        </div>
      )}
      {warn==="duplicate"&&!saved&&(
        <div style={{background:"rgba(251,191,36,0.12)",border:"1.5px solid #fbbf2466",borderRadius:10,padding:"12px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:20}}>📋</span>
          <div><div style={{fontSize:14,fontWeight:700,color:"#fbbf24"}}>เวรนี้มีข้อมูลอยู่แล้ว</div><div style={{fontSize:12,color:"#94a3b8"}}>ถ้าบันทึกใหม่จะทับข้อมูลเดิมค่ะ</div></div>
        </div>
      )}

      {/* name */}
      <Card>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <span style={{fontSize:26}}>{role.icon}</span>
          <div><div style={{fontWeight:800,fontSize:15,color:role.color}}>{role.label}</div><div style={{fontSize:12,color:"#64748b"}}>ผู้รับผิดชอบตรวจเช็ค</div></div>
        </div>
        <input value={myName} onChange={e=>{setMyName(e.target.value);setSaved(false);}} placeholder="ชื่อ-นามสกุลของคุณ" style={BASE_INP}/>
      </Card>

      {/* overall progress */}
      <Card style={{paddingBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:700,color:"#94a3b8"}}>ความคืบหน้าทั้งหมด</span>
          <span style={{fontSize:13,color:doneItems===totalItems&&totalItems>0?"#4ade80":"#f59e0b"}}>{doneItems}/{totalItems}</span>
        </div>
        <div style={{height:8,background:"#1e293b",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:99,transition:"width 0.3s",background:`linear-gradient(90deg,${role.color},#4ade80)`,width:`${totalItems?(doneItems/totalItems)*100:0}%`}}/>
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
              <span style={{fontSize:12,color:groupDone===group.items.length?"#4ade80":"#f59e0b",fontWeight:700}}>{groupDone}/{group.items.length}</span>
            </div>

            {/* items */}
            {group.items.map(item=>{
              const ck=!!checked[item.id];
              return(
                <div key={item.id}>
                  <label style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:8,cursor:"pointer",marginBottom:4,background:ck?"rgba(74,222,128,0.08)":"transparent",transition:"background 0.15s"}}>
                    <input type="checkbox" checked={ck} onChange={()=>toggle(item.id)} style={{width:18,height:18,accentColor:group.color,cursor:"pointer",flexShrink:0}}/>
                    <span style={{fontSize:14,color:ck?"#4ade80":"#cbd5e1",flex:1}}>{item.label}</span>
                    {ck&&<span style={{color:"#4ade80",fontSize:13}}>✓</span>}
                  </label>

                  {/* Expiry date field */}
                  {item.hasExp&&ck&&(()=>{
                    const expVal=expDates[item.id]||"";
                    const days=daysUntilExp(expVal);
                    return(
                      <div style={{marginLeft:42,marginBottom:10,padding:"10px 14px",background:"rgba(255,255,255,0.04)",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)"}}>
                        <div style={{fontSize:12,color:"#94a3b8",marginBottom:6}}>📅 วันหมดอายุ (Exp. Date)</div>
                        <input type="date" value={expVal} onChange={e=>setExp(item.id,e.target.value)}
                          style={{...BASE_INP,width:"auto",padding:"8px 12px",fontSize:13,colorScheme:"dark"}}/>
                        {expVal&&(
                          <div style={{marginTop:6,fontSize:12,fontWeight:700,color:ettExpColor(days)}}>
                            {ettExpText(days)}
                          </div>
                        )}
                        {days!==null&&days<=30&&days>=0&&(
                          <div style={{marginTop:6,padding:"8px 12px",background:"rgba(245,158,11,0.15)",borderRadius:6,fontSize:12,color:"#fbbf24"}}>
                            ⚠️ กรุณาแจ้งหัวหน้าเพื่อเบิกของใหม่
                          </div>
                        )}
                        {days!==null&&days<0&&(
                          <div style={{marginTop:6,padding:"8px 12px",background:"rgba(239,68,68,0.15)",borderRadius:6,fontSize:12,color:"#f87171"}}>
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
      <Card style={{border:noteError?"1.5px solid #ef4444":"undefined"}}>
        <div style={{fontSize:13,fontWeight:700,color:noteError?"#f87171":"#94a3b8",marginBottom:6}}>
          📝 เขียนปัญหาหรือข้อเสนอแนะทุกครั้ง หากไม่มีเขียน "ไม่มี" ได้เลย
          <span style={{color:"#ef4444"}}> *</span>
        </div>
        {noteError&&<div style={{fontSize:12,color:"#f87171",marginBottom:8}}>⚠️ กรุณากรอกข้อมูลก่อนบันทึกค่ะ</div>}
        <textarea value={note} onChange={e=>{setNote(e.target.value);setSaved(false);setNoteError(false);}}
          placeholder='เช่น "ไม่มี" หรือ "Defibrillator ใกล้หมดแบต"...'
          rows={3} style={{...BASE_INP,resize:"vertical",lineHeight:1.7,border:noteError?"1.5px solid #ef4444":BASE_INP.border}}/>
      </Card>

      <button onClick={handleSave} disabled={saving} style={{width:"100%",padding:"16px 0",borderRadius:12,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:16,fontWeight:800,background:saved?"#16a34a":saving?"#475569":`linear-gradient(90deg,${role.color},${shiftMeta.accent})`,color:"#fff",boxShadow:`0 4px 20px ${role.color}44`,transition:"all 0.3s"}}>
        {saving?"⏳ กำลัง Sync...":saved?"✅ บันทึก & Sync แล้ว!":"💾 บันทึกการเช็ค"}
      </button>
    </div>
  );
}


/* ── AEMT grouped items ── */
const AEMT_GROUPS = [
  {
    id:"airway", label:"1. Airway and Breathing", icon:"💨", color:"#3b82f6",
    items:[
      {id:"opa",        label:"Oropharyngeal airway (ผู้ใหญ่ 3 อัน, เด็ก 4 อัน)",    hasExp:false},
      {id:"nasal",      label:"Nasal cannula (ผู้ใหญ่, เด็ก 2 อัน)",                  hasExp:false},
      {id:"maskreservoir", label:"Mask c reservoir bag (ผู้ใหญ่, เด็ก)",              hasExp:false},
      {id:"collarmask", label:"Collar mask (ผู้ใหญ่, เด็ก)",                          hasExp:false},
      {id:"nebu",       label:"Set พ่นยา (ผู้ใหญ่, เด็ก)",                            hasExp:false},
      {id:"suction",    label:"Suction (เครื่อง, สาย, ความสะอาด)",                    hasExp:false},
      {id:"suctiontubes",label:"สาย Suction (ดำ, ขาว, เขียว, ส้ม, แดง)",             hasExp:false},
      {id:"o2bottle",   label:"Oxygen Humidifier Bottle",                              hasExp:true},
    ]
  },
  {
    id:"circulation", label:"2. Circulation", icon:"🩸", color:"#ef4444",
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
    id:"equipment", label:"3. Equipment", icon:"🔧", color:"#f59e0b",
    items:[
      {id:"delivery",   label:"Set คลอด",                                             hasExp:true},
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
    id:"ppe", label:"4. PPE", icon:"🦺", color:"#10b981",
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


/* ── พขร. grouped items ── */
const DRIV_GROUPS = [
  {
    id:"equipment", label:"1. อุปกรณ์ในรถ", icon:"🚑", color:"#10b981",
    items:[
      {id:"infect_bin",   label:"ถังขยะติดเชื้อ",                hasExp:false, hasNote:false},
      {id:"needle_bin",   label:"ถังทิ้งเข็ม",                   hasExp:false, hasNote:false},
      {id:"o2_main1",     label:"ถังออกซิเจนใหญ่ ถัง 1",         hasExp:false, hasO2:true},
      {id:"o2_main2",     label:"ถังออกซิเจนใหญ่ ถัง 2",         hasExp:false, hasO2:true},
      {id:"o2_portable",  label:"ถังออกซิเจนเล็กพกพา",           hasExp:false, hasO2:true},
    ]
  },
  {
    id:"transfer", label:"2. อุปกรณ์ยกเคลื่อนย้าย", icon:"🛗", color:"#3b82f6",
    items:[
      {id:"stairchair",   label:"เก้าอี้ Stair chair",            hasExp:false, hasNote:false},
      {id:"longboard",    label:"กระดาน Long spinal board",        hasExp:false, hasNote:false},
      {id:"headimmo",     label:"หมอน Head immobilizer",           hasExp:false, hasNote:false},
      {id:"belt3",        label:"Belt 3 เส้น",                    hasExp:false, hasNote:false},
    ]
  },
  {
    id:"car", label:"3. ความพร้อมของรถ", icon:"🚗", color:"#f59e0b",
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

/* ── พขร. Check Page ── */
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
    await set(dbRef,{name:myName,checked,note,o2Levels,scratchNote,roleId:"driv",savedAt:new Date().toISOString()});
    setSaving(false);setSaved(true);setWarn("duplicate");setTimeout(()=>setSaved(false),2500);
    if(drivDone===drivTotal&&note.trim()) setShowSuccess(true);
  }

  if(loading) return <div style={{textAlign:"center",padding:60,color:"#64748b"}}><div style={{fontSize:32,marginBottom:12}}>⏳</div>กำลังโหลด...</div>;

  return(
    <div>
      {showSuccess&&<SuccessScreen myName={myName} role={role} selDay={selDay} selMonth={selMonth} selYear={selYear} selShift={selShift} totalItems={totalItems} note={note} savedAt={new Date().toISOString()} onClose={()=>setShowSuccess(false)}/>}
      <div style={{background:shiftMeta.accent+"20",border:`1.5px solid ${shiftMeta.accent}44`,borderRadius:10,padding:"10px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:13,color:shiftMeta.accent}}>{shiftMeta.icon} {selDay} {MONTH_NAMES[selMonth]} {selYear+543} · เวร{selShift}</span>
        {saved&&<span style={{marginLeft:"auto",fontSize:12,color:"#4ade80"}}>✓ Sync ☁️</span>}
      </div>
      {warn==="future"&&(
        <div style={{background:"rgba(239,68,68,0.12)",border:"1.5px solid #ef444466",borderRadius:10,padding:"12px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div><div style={{fontSize:14,fontWeight:700,color:"#f87171"}}>วันที่เป็นอนาคต!</div><div style={{fontSize:12,color:"#94a3b8"}}>กรุณาตรวจสอบวันที่ก่อนบันทึกค่ะ</div></div>
        </div>
      )}
      {warn==="duplicate"&&!saved&&(
        <div style={{background:"rgba(251,191,36,0.12)",border:"1.5px solid #fbbf2466",borderRadius:10,padding:"12px 16px",marginBottom:14}}>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:myName?"8px":"0"}}>
            <span style={{fontSize:20}}>⚠️</span>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#fbbf24"}}>เวรนี้มีข้อมูลอยู่แล้ว!</div>
              <div style={{fontSize:12,color:"#94a3b8"}}>ถ้ากรอกชื่อและบันทึกใหม่จะทับข้อมูลเดิมค่ะ</div>
            </div>
          </div>
        </div>
      )}
      <Card>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <span style={{fontSize:26}}>{role.icon}</span>
          <div><div style={{fontWeight:800,fontSize:15,color:role.color}}>{role.label}</div><div style={{fontSize:12,color:"#64748b"}}>ผู้รับผิดชอบตรวจเช็ค</div></div>
        </div>
        <input value={myName} onChange={e=>{setMyName(e.target.value);setSaved(false);}} placeholder="ชื่อ-นามสกุลของคุณ" style={BASE_INP}/>
      </Card>
      <Card style={{paddingBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:700,color:"#94a3b8"}}>ความคืบหน้าทั้งหมด</span>
          <span style={{fontSize:13,color:doneItems===totalItems&&totalItems>0?"#4ade80":"#f59e0b"}}>{doneItems}/{totalItems}</span>
        </div>
        <div style={{height:8,background:"#1e293b",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:99,transition:"width 0.3s",background:`linear-gradient(90deg,${role.color},#4ade80)`,width:`${totalItems?(doneItems/totalItems)*100:0}%`}}/>
        </div>
      </Card>

      {DRIV_GROUPS.map(group=>{
        const groupDone=group.items.filter(item=>checked[item.id]).length;
        return(
          <Card key={group.id} style={{border:`1.5px solid ${group.color}33`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <span style={{fontSize:22}}>{group.icon}</span>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:800,color:group.color}}>{group.label}</div></div>
              <span style={{fontSize:12,color:groupDone===group.items.length?"#4ade80":"#f59e0b",fontWeight:700}}>{groupDone}/{group.items.length}</span>
            </div>
            {group.items.map(item=>{
              const ck=!!checked[item.id];
              const o2Val=o2Levels[item.id]||"";
              const o2Num=parseInt(o2Val)||0;
              const o2Low=o2Val&&o2Num<500;
              return(
                <div key={item.id}>
                  <label style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:8,cursor:"pointer",marginBottom:4,background:ck?"rgba(74,222,128,0.08)":"transparent",transition:"background 0.15s"}}>
                    <input type="checkbox" checked={ck} onChange={()=>toggle(item.id)} style={{width:18,height:18,accentColor:group.color,cursor:"pointer",flexShrink:0}}/>
                    <span style={{fontSize:14,color:ck?"#4ade80":"#cbd5e1",flex:1}}>{item.label}</span>
                    {ck&&!item.hasO2&&<span style={{color:"#4ade80",fontSize:13}}>✓</span>}
                  </label>

                  {/* O2 level input */}
                  {item.hasO2&&ck&&(
                    <div style={{marginLeft:42,marginBottom:10,padding:"10px 14px",background:"rgba(255,255,255,0.04)",borderRadius:8,border:`1px solid ${o2Low?"#ef444466":"rgba(255,255,255,0.1)"}`}}>
                      <div style={{fontSize:12,color:"#94a3b8",marginBottom:6}}>💨 ปริมาณ O₂ ที่เหลือ (PSI หรือ Bar)</div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <input type="number" min="0" max="2000" value={o2Val}
                          onChange={e=>setO2(item.id,e.target.value)}
                          placeholder="เช่น 1500"
                          style={{...BASE_INP,width:140,padding:"8px 12px",fontSize:14}}/>
                        <span style={{fontSize:13,color:"#64748b"}}>PSI</span>
                      </div>
                      {o2Val&&(
                        <div style={{marginTop:6,fontSize:12,fontWeight:700,color:o2Low?"#ef4444":"#4ade80"}}>
                          {o2Low?"🚨 ออกซิเจนต่ำกว่า 500 PSI! กรุณาเติมก่อนออกปฏิบัติการ":"✓ ปริมาณออกซิเจนปกติ"}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Scratch note */}
                  {item.hasNote&&ck&&(
                    <div style={{marginLeft:42,marginBottom:10,padding:"10px 14px",background:"rgba(255,255,255,0.04)",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)"}}>
                      <div style={{fontSize:12,color:"#94a3b8",marginBottom:6}}>📝 ระบุตำแหน่งรอยเฉี่ยว (ถ้ามี)</div>
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

      <Card style={{border:noteError?"1.5px solid #ef4444":"undefined"}}>
        <div style={{fontSize:13,fontWeight:700,color:noteError?"#f87171":"#94a3b8",marginBottom:6}}>
          📝 เขียนปัญหาหรือข้อเสนอแนะทุกครั้ง หากไม่มีเขียน "ไม่มี" ได้เลย
          <span style={{color:"#ef4444"}}> *</span>
        </div>
        {noteError&&<div style={{fontSize:12,color:"#f87171",marginBottom:8}}>⚠️ กรุณากรอกข้อมูลก่อนบันทึกค่ะ</div>}
        <textarea value={note} onChange={e=>{setNote(e.target.value);setSaved(false);setNoteError(false);}}
          placeholder='เช่น "ไม่มี" หรือ "น้ำมันเชื้อเพลิงเหลือน้อย"'
          rows={3} style={{...BASE_INP,resize:"vertical",lineHeight:1.7,border:noteError?"1.5px solid #ef4444":BASE_INP.border}}/>
      </Card>

      <button onClick={handleSave} disabled={saving} style={{width:"100%",padding:"16px 0",borderRadius:12,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:16,fontWeight:800,background:saved?"#16a34a":saving?"#475569":`linear-gradient(90deg,${role.color},${shiftMeta.accent})`,color:"#fff",boxShadow:`0 4px 20px ${role.color}44`,transition:"all 0.3s"}}>
        {saving?"⏳ กำลัง Sync...":saved?"✅ บันทึก & Sync แล้ว!":"💾 บันทึกการเช็ค"}
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
    await set(dbRef,{name:myName,checked,note,expDates,roleId:"aemt",savedAt:new Date().toISOString()});
    setSaving(false);setSaved(true);setWarn("duplicate");setTimeout(()=>setSaved(false),2500);
    if(doneItems===totalItems&&note.trim()) setShowSuccess(true);
  }

  if(loading) return <div style={{textAlign:"center",padding:60,color:"#64748b"}}><div style={{fontSize:32,marginBottom:12}}>⏳</div>กำลังโหลด...</div>;

  return(
    <div>
      {showSuccess&&<SuccessScreen myName={myName} role={role} selDay={selDay} selMonth={selMonth} selYear={selYear} selShift={selShift} totalItems={totalItems} note={note} savedAt={new Date().toISOString()} onClose={()=>setShowSuccess(false)}/>}
      <div style={{background:shiftMeta.accent+"20",border:`1.5px solid ${shiftMeta.accent}44`,borderRadius:10,padding:"10px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:13,color:shiftMeta.accent}}>{shiftMeta.icon} {selDay} {MONTH_NAMES[selMonth]} {selYear+543} · เวร{selShift}</span>
        {saved&&<span style={{marginLeft:"auto",fontSize:12,color:"#4ade80"}}>✓ Sync ☁️</span>}
      </div>
      {warn==="future"&&(
        <div style={{background:"rgba(239,68,68,0.12)",border:"1.5px solid #ef444466",borderRadius:10,padding:"12px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div><div style={{fontSize:14,fontWeight:700,color:"#f87171"}}>วันที่เป็นอนาคต!</div><div style={{fontSize:12,color:"#94a3b8"}}>กรุณาตรวจสอบวันที่ก่อนบันทึกค่ะ</div></div>
        </div>
      )}
      {warn==="duplicate"&&!saved&&(
        <div style={{background:"rgba(251,191,36,0.12)",border:"1.5px solid #fbbf2466",borderRadius:10,padding:"12px 16px",marginBottom:14}}>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:myName?"8px":"0"}}>
            <span style={{fontSize:20}}>⚠️</span>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#fbbf24"}}>เวรนี้มีข้อมูลอยู่แล้ว!</div>
              <div style={{fontSize:12,color:"#94a3b8"}}>ถ้ากรอกชื่อและบันทึกใหม่จะทับข้อมูลเดิมค่ะ</div>
            </div>
          </div>
        </div>
      )}
      <Card>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <span style={{fontSize:26}}>{role.icon}</span>
          <div><div style={{fontWeight:800,fontSize:15,color:role.color}}>{role.label}</div><div style={{fontSize:12,color:"#64748b"}}>ผู้รับผิดชอบตรวจเช็ค</div></div>
        </div>
        <input value={myName} onChange={e=>{setMyName(e.target.value);setSaved(false);}} placeholder="ชื่อ-นามสกุลของคุณ" style={BASE_INP}/>
      </Card>
      <Card style={{paddingBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:700,color:"#94a3b8"}}>ความคืบหน้าทั้งหมด</span>
          <span style={{fontSize:13,color:doneItems===totalItems&&totalItems>0?"#4ade80":"#f59e0b"}}>{doneItems}/{totalItems}</span>
        </div>
        <div style={{height:8,background:"#1e293b",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:99,transition:"width 0.3s",background:`linear-gradient(90deg,${role.color},#4ade80)`,width:`${totalItems?(doneItems/totalItems)*100:0}%`}}/>
        </div>
      </Card>
      {AEMT_GROUPS.map(group=>{
        const groupDone=group.items.filter(item=>checked[item.id]).length;
        return(
          <Card key={group.id} style={{border:`1.5px solid ${group.color}33`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <span style={{fontSize:22}}>{group.icon}</span>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:800,color:group.color}}>{group.label}</div></div>
              <span style={{fontSize:12,color:groupDone===group.items.length?"#4ade80":"#f59e0b",fontWeight:700}}>{groupDone}/{group.items.length}</span>
            </div>
            {group.items.map(item=>{
              const ck=!!checked[item.id];
              return(
                <div key={item.id}>
                  <label style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:8,cursor:"pointer",marginBottom:4,background:ck?"rgba(74,222,128,0.08)":"transparent",transition:"background 0.15s"}}>
                    <input type="checkbox" checked={ck} onChange={()=>toggle(item.id)} style={{width:18,height:18,accentColor:group.color,cursor:"pointer",flexShrink:0}}/>
                    <span style={{fontSize:14,color:ck?"#4ade80":"#cbd5e1",flex:1}}>{item.label}</span>
                    {ck&&<span style={{color:"#4ade80",fontSize:13}}>✓</span>}
                  </label>
                  {item.hasExp&&ck&&(()=>{
                    const expVal=expDates[item.id]||"";
                    const days=daysUntilExp(expVal);
                    return(
                      <div style={{marginLeft:42,marginBottom:10,padding:"10px 14px",background:"rgba(255,255,255,0.04)",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)"}}>
                        <div style={{fontSize:12,color:"#94a3b8",marginBottom:6}}>📅 วันหมดอายุ (Exp. Date)</div>
                        <input type="date" value={expVal} onChange={e=>setExp(item.id,e.target.value)}
                          style={{...BASE_INP,width:"auto",padding:"8px 12px",fontSize:13,colorScheme:"dark"}}/>
                        {expVal&&<div style={{marginTop:6,fontSize:12,fontWeight:700,color:ettExpColor(days)}}>{ettExpText(days)}</div>}
                        {days!==null&&days<=30&&days>=0&&(
                          <div style={{marginTop:6,padding:"8px 12px",background:"rgba(245,158,11,0.15)",borderRadius:6,fontSize:12,color:"#fbbf24"}}>
                            ⚠️ กรุณาแจ้งหัวหน้าเพื่อเบิกของใหม่
                          </div>
                        )}
                        {days!==null&&days<0&&(
                          <div style={{marginTop:6,padding:"8px 12px",background:"rgba(239,68,68,0.15)",borderRadius:6,fontSize:12,color:"#f87171"}}>
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
      <Card style={{border:noteError?"1.5px solid #ef4444":"undefined"}}>
        <div style={{fontSize:13,fontWeight:700,color:noteError?"#f87171":"#94a3b8",marginBottom:6}}>
          📝 เขียนปัญหาหรือข้อเสนอแนะทุกครั้ง หากไม่มีเขียน "ไม่มี" ได้เลย
          <span style={{color:"#ef4444"}}> *</span>
        </div>
        {noteError&&<div style={{fontSize:12,color:"#f87171",marginBottom:8}}>⚠️ กรุณากรอกข้อมูลก่อนบันทึกค่ะ</div>}
        <textarea value={note} onChange={e=>{setNote(e.target.value);setSaved(false);setNoteError(false);}}
          placeholder='เช่น "ไม่มี" หรือ "อุปกรณ์ชำรุด..."'
          rows={3} style={{...BASE_INP,resize:"vertical",lineHeight:1.7,border:noteError?"1.5px solid #ef4444":BASE_INP.border}}/>
      </Card>
      <button onClick={handleSave} disabled={saving} style={{width:"100%",padding:"16px 0",borderRadius:12,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:16,fontWeight:800,background:saved?"#16a34a":saving?"#475569":`linear-gradient(90deg,${role.color},${shiftMeta.accent})`,color:"#fff",boxShadow:`0 4px 20px ${role.color}44`,transition:"all 0.3s"}}>
        {saving?"⏳ กำลัง Sync...":saved?"✅ บันทึก & Sync แล้ว!":"💾 บันทึกการเช็ค"}
      </button>
    </div>
  );
}

/* ── General Check Page (AEMT, พขร.) ── */
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
  if(loading) return <div style={{textAlign:"center",padding:60,color:"#64748b"}}><div style={{fontSize:32,marginBottom:12}}>⏳</div>กำลังโหลด...</div>;

  return(
    <div>
      {showSuccess&&<SuccessScreen myName={myName} role={role} selDay={selDay} selMonth={selMonth} selYear={selYear} selShift={selShift} totalItems={totalItems} note={note} savedAt={new Date().toISOString()} onClose={()=>setShowSuccess(false)}/>}
      <div style={{background:shiftMeta.accent+"20",border:`1.5px solid ${shiftMeta.accent}44`,borderRadius:10,padding:"10px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:13,color:shiftMeta.accent}}>{shiftMeta.icon} {selDay} {MONTH_NAMES[selMonth]} {selYear+543} · เวร{selShift}</span>
        {saved&&<span style={{marginLeft:"auto",fontSize:12,color:"#4ade80"}}>✓ Sync ☁️</span>}
      </div>
      {warn==="future"&&(
        <div style={{background:"rgba(239,68,68,0.12)",border:"1.5px solid #ef444466",borderRadius:10,padding:"12px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div><div style={{fontSize:14,fontWeight:700,color:"#f87171"}}>วันที่เป็นอนาคต!</div><div style={{fontSize:12,color:"#94a3b8"}}>กรุณาตรวจสอบวันที่ก่อนบันทึกค่ะ</div></div>
        </div>
      )}
      {warn==="duplicate"&&!saved&&(
        <div style={{background:"rgba(251,191,36,0.12)",border:"1.5px solid #fbbf2466",borderRadius:10,padding:"12px 16px",marginBottom:14}}>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:myName?"8px":"0"}}>
            <span style={{fontSize:20}}>⚠️</span>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#fbbf24"}}>เวรนี้มีข้อมูลอยู่แล้ว!</div>
              <div style={{fontSize:12,color:"#94a3b8"}}>ถ้ากรอกชื่อและบันทึกใหม่จะทับข้อมูลเดิมค่ะ</div>
            </div>
          </div>
        </div>
      )}
      <Card>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <span style={{fontSize:26}}>{role.icon}</span>
          <div><div style={{fontWeight:800,fontSize:15,color:role.color}}>{role.label}</div><div style={{fontSize:12,color:"#64748b"}}>ผู้รับผิดชอบตรวจเช็ค</div></div>
        </div>
        <input value={myName} onChange={e=>{setMyName(e.target.value);setSaved(false);}} placeholder="ชื่อ-นามสกุลของคุณ" style={BASE_INP}/>
      </Card>
      <Card style={{paddingBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:700,color:"#94a3b8"}}>ความคืบหน้า</span>
          <span style={{fontSize:13,color:done===total&&total>0?"#4ade80":"#f59e0b"}}>{done}/{total}</span>
        </div>
        <div style={{height:8,background:"#1e293b",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:99,transition:"width 0.3s",background:`linear-gradient(90deg,${role.color},#4ade80)`,width:`${total?(done/total)*100:0}%`}}/>
        </div>
      </Card>
      <Card>
        <div style={{fontSize:13,fontWeight:700,color:"#94a3b8",marginBottom:12}}>🔧 รายการตรวจเช็ค</div>
        {items.length===0?(<div style={{fontSize:13,color:"#475569",fontStyle:"italic"}}>ยังไม่มีรายการ · ไปตั้งค่าที่ ⚙️ ก่อนค่ะ</div>)
        :items.map(item=>{
          const ck=!!checked[sanitizeKey(item)];
          return(
            <label key={item} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:8,cursor:"pointer",marginBottom:4,background:ck?"rgba(74,222,128,0.08)":"transparent",transition:"background 0.15s"}}>
              <input type="checkbox" checked={ck} onChange={()=>toggle(item)} style={{width:18,height:18,accentColor:role.color,cursor:"pointer",flexShrink:0}}/>
              <span style={{fontSize:14,color:ck?"#4ade80":"#cbd5e1",flex:1}}>{item}</span>
              {ck&&<span style={{color:"#4ade80",fontSize:13}}>✓</span>}
            </label>
          );
        })}
      </Card>
      <Card>
        <div style={{fontSize:13,fontWeight:700,color:"#94a3b8",marginBottom:10}}>📝 หมายเหตุ</div>
        <textarea value={note} onChange={e=>{setNote(e.target.value);setSaved(false);}} placeholder="เช่น อุปกรณ์ชำรุด, ของขาด..." rows={3} style={{...BASE_INP,resize:"vertical",lineHeight:1.7}}/>
      </Card>
      <button onClick={handleSave} disabled={saving} style={{width:"100%",padding:"16px 0",borderRadius:12,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:16,fontWeight:800,background:saved?"#16a34a":saving?"#475569":`linear-gradient(90deg,${role.color},${shiftMeta.accent})`,color:"#fff",boxShadow:`0 4px 20px ${role.color}44`,transition:"all 0.3s"}}>
        {saving?"⏳ กำลัง Sync...":saved?"✅ บันทึก & Sync แล้ว!":"💾 บันทึกการเช็ค"}
      </button>
    </div>
  );
}

/* ── Summary Page ── */
function SummaryPage({selYear,selMonth,equipment,onLock}){
  const [allData,setAllData]=useState({}); const [loading,setLoading]=useState(true);
  const [expandedRow,setExpandedRow]=useState(null);
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
        const k=recKey(selYear,selMonth,d,shift,r.id); const e=allData[k];
        return{role:r,entry:e,done:getDone(e),total:getTotal(r.id)};
      });
      const allOK=roleResults.every(r=>r.entry&&r.entry.name&&r.done===r.total&&r.total>0);
      if(!allOK) rows.push({day:d,shift,roleResults});
    }
  }

  const copyText="สรุปเวรที่ไม่ได้เช็คอุปกรณ์ EMS\nเดือน"+MONTH_NAMES[selMonth]+" "+(selYear+543)+"\n"+"─".repeat(36)+"\n"+
    rows.map(({day,shift,roleResults})=>{
      const missing=roleResults.filter(r=>!r.entry||!r.entry.name||r.done<r.total);
      return "• "+day+" "+MONTH_NAMES[selMonth]+" เวร"+shift+"\n"+missing.map(r=>"  - "+r.role.short+": "+(r.entry?.name||"ไม่มีชื่อ")+" ["+r.done+"/"+r.total+"]").join("\n");
    }).join("\n")+"\n"+"─".repeat(36)+"\nรวม "+rows.length+" เวร";

  if(loading) return <div style={{textAlign:"center",padding:60,color:"#64748b"}}><div style={{fontSize:32,marginBottom:12}}>⏳</div>กำลังโหลด...</div>;
  return(
    <div>
      <Card>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,marginBottom:4}}>{"📋 สรุปเดือน"+MONTH_NAMES[selMonth]+" "+(selYear+543)}</div>
            <div style={{fontSize:13,color:"#94a3b8"}}>เวรที่ยังเช็คไม่ครบ</div>
          </div>
          <button onClick={onLock} style={{padding:"8px 14px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:"rgba(251,191,36,0.15)",color:"#fbbf24"}}>🔒 ล็อค</button>
        </div>
      </Card>
      {rows.length===0?(
        <div style={{background:"rgba(74,222,128,0.1)",border:"1.5px solid #4ade8055",borderRadius:14,padding:36,textAlign:"center"}}>
          <div style={{fontSize:44,marginBottom:10}}>✅</div>
          <div style={{fontSize:16,fontWeight:700,color:"#4ade80"}}>ครบทุกเวรแล้วค่ะ!</div>
        </div>
      ):(
        <>
          <div style={{background:"rgba(239,68,68,0.1)",border:"1.5px solid #ef444455",borderRadius:10,padding:"12px 16px",marginBottom:14,fontSize:14}}>
            ⚠️ พบ <strong>{rows.length}</strong> เวร ที่ยังไม่สมบูรณ์
          </div>
          {rows.map(({day,shift,roleResults},idx)=>{
            const sm=SHIFT_META[shift];
            const rowKey=`${day}_${shift}`;
            const isExp=expandedRow===rowKey;
            return(
              <div key={idx} style={{marginBottom:8,background:"rgba(255,255,255,0.05)",borderRadius:12,overflow:"hidden",border:"1px solid rgba(255,255,255,0.08)"}}>
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
                    <span style={{fontSize:12,color:"#64748b",marginLeft:4}}>{isExp?"▲":"▼"}</span>
                  </div>
                </div>
                {/* expandable detail */}
                {isExp&&(
                  <div style={{padding:"0 12px 12px",display:"flex",flexDirection:"column",gap:8}}>
                    {roleResults.map(r=>{
                      const ok=r.entry&&r.entry.name&&r.done===r.total&&r.total>0;
                      return(
                        <div key={r.role.id} style={{display:"flex",flexDirection:"column",gap:4,padding:"10px 12px",borderRadius:8,background:ok?"rgba(74,222,128,0.06)":"rgba(239,68,68,0.06)",border:"1px solid "+(ok?"#4ade8033":"#ef444433")}}>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <span style={{fontSize:18}}>{r.role.icon}</span>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13,fontWeight:700,color:r.role.color}}>{r.role.short}</div>
                              <div style={{fontSize:12,color:"#94a3b8"}}>{r.entry?.name||"ยังไม่ได้บันทึก"}</div>
                            </div>
                            <div style={{fontSize:12,color:ok?"#4ade80":"#f87171",fontWeight:700}}>{ok?"✓ ครบ":r.done+"/"+r.total}</div>
                          </div>
                          {r.entry?.note&&(
                            <div style={{fontSize:12,color:"#94a3b8",padding:"6px 10px",background:"rgba(255,255,255,0.04)",borderRadius:6}}>
                              📝 {r.entry.note}
                            </div>
                          )}
                          {r.entry?.savedAt&&(
                            <div style={{fontSize:11,color:"#475569"}}>
                              🕐 บันทึกเมื่อ {new Date(r.entry.savedAt).toLocaleString("th-TH",{hour:"2-digit",minute:"2-digit",day:"numeric",month:"short"})}
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
            <div style={{fontSize:13,fontWeight:700,color:"#94a3b8",marginBottom:10}}>📋 คัดลอกส่งหัวหน้า</div>
            <div style={{background:"#0f172a",borderRadius:8,padding:14,fontSize:12,lineHeight:1.9,color:"#e2e8f0",fontFamily:"monospace",whiteSpace:"pre-wrap",marginBottom:12}}>{copyText}</div>
            <button onClick={()=>navigator.clipboard.writeText(copyText)} style={{padding:"10px 22px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:"#3b82f6",color:"#fff"}}>
              📋 คัดลอกข้อความ
            </button>
          </Card>
        </>
      )}
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

  function getTotal(roleId){ if(roleId==="para") return PARA_GROUPS.reduce((s,g)=>s+g.items.length,0); return (equipment[roleId]||[]).length; }
  function getDone(e){ return e?Object.values(e.checked||{}).filter(Boolean).length:0; }

  const days=getDays(selYear,selMonth);
  let totalDone=0,totalMissing=0,totalIncomplete=0;
  const totalSlots=days*SHIFTS.length*ROLES.length;
  const roleStats=ROLES.map(r=>{
    let done=0,missing=0,incomplete=0;
    for(let d=1;d<=days;d++){
      for(const shift of SHIFTS){
        const k=recKey(selYear,selMonth,d,shift,r.id); const e=allData[k];
        const cnt=getDone(e); const tot=getTotal(r.id);
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
        const cnt=getDone(e); const tot=getTotal(r.id);
        return e&&e.name&&cnt===tot&&tot>0;
      });
      if(allOK) ok++;
    });
    return{day:d,pct:Math.round((ok/SHIFTS.length)*100)};
  });

  const overallPct=Math.round((totalDone/totalSlots)*100);
  if(loading) return <div style={{textAlign:"center",padding:60,color:"#64748b"}}><div style={{fontSize:32,marginBottom:12}}>⏳</div>กำลังโหลด...</div>;

  return(
    <div>
      <Card>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,marginBottom:2}}>📊 Dashboard</div>
            <div style={{fontSize:13,color:"#94a3b8"}}>เดือน{MONTH_NAMES[selMonth]} {selYear+543}</div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>exportToExcel(allData,equipment,selYear,selMonth)} style={{padding:"8px 14px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:"#16a34a",color:"#fff"}}>📥 Excel</button>
            <button onClick={()=>setDelMode(d=>!d)} style={{padding:"8px 14px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:delMode?"#ef4444":"rgba(239,68,68,0.2)",color:delMode?"#fff":"#f87171"}}>🗑️ ลบข้อมูล</button>
            <button onClick={onLock} style={{padding:"8px 14px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:"rgba(251,191,36,0.15)",color:"#fbbf24"}}>🔒 ล็อค</button>
          </div>
        </div>
      </Card>

      {delMode&&(
        <Card style={{border:"1.5px solid rgba(239,68,68,0.4)"}}>
          <div style={{fontSize:14,fontWeight:800,color:"#f87171",marginBottom:14}}>🗑️ ลบข้อมูลที่ระบุ</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
            <div style={{flex:1,minWidth:80}}>
              <div style={{fontSize:12,color:"#94a3b8",marginBottom:6}}>วันที่</div>
              <select value={delDay} onChange={e=>setDelDay(+e.target.value)} style={BASE_SEL}>
                {Array.from({length:days},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{flex:1,minWidth:80}}>
              <div style={{fontSize:12,color:"#94a3b8",marginBottom:6}}>เวร</div>
              <select value={delShift} onChange={e=>setDelShift(e.target.value)} style={BASE_SEL}>
                {SHIFTS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{flex:1,minWidth:100}}>
              <div style={{fontSize:12,color:"#94a3b8",marginBottom:6}}>ตำแหน่ง</div>
              <select value={delRole} onChange={e=>setDelRole(e.target.value)} style={BASE_SEL}>
                {ROLES.map(r=><option key={r.id} value={r.id}>{r.short}</option>)}
              </select>
            </div>
          </div>
          {(()=>{const k=recKey(selYear,selMonth,delDay,delShift,delRole);const e=allData[k];
            return e?(
              <div style={{background:"rgba(239,68,68,0.08)",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13}}>
                <div style={{color:"#f87171",fontWeight:700,marginBottom:4}}>ข้อมูลที่จะถูกลบ:</div>
                <div style={{color:"#94a3b8"}}>👤 {e.name||"ไม่มีชื่อ"} · {e.savedAt?.slice(0,10)||"-"}</div>
              </div>
            ):(
              <div style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13,color:"#475569"}}>ไม่มีข้อมูลในเวรนี้</div>
            );
          })()}
          <button onClick={handleDelete} disabled={deleting||!allData[recKey(selYear,selMonth,delDay,delShift,delRole)]} style={{width:"100%",padding:"11px 0",borderRadius:9,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:800,background:delDone?"#16a34a":deleting?"#475569":"#ef4444",color:"#fff",transition:"all 0.3s"}}>
            {delDone?"✅ ลบเรียบร้อย!":deleting?"⏳ กำลังลบ...":"🗑️ ยืนยันลบข้อมูล"}
          </button>
        </Card>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {[{label:"ครบทุกรายการ",value:totalDone,color:"#4ade80",icon:"✅"},{label:"ไม่สมบูรณ์",value:totalIncomplete,color:"#f59e0b",icon:"⚠️"},{label:"ไม่มีข้อมูล",value:totalMissing,color:"#f87171",icon:"❌"}].map(s=>(
          <div key={s.label} style={{background:"rgba(255,255,255,0.05)",borderRadius:12,padding:"14px 12px",textAlign:"center"}}>
            <div style={{fontSize:22}}>{s.icon}</div>
            <div style={{fontSize:24,fontWeight:900,color:s.color,marginTop:4}}>{s.value}</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      <Card>
        <div style={{display:"flex",alignItems:"center",gap:20}}>
          <div style={{position:"relative",width:80,height:80,flexShrink:0}}>
            <svg viewBox="0 0 36 36" style={{width:80,height:80,transform:"rotate(-90deg)"}}>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3"/>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke={overallPct>=80?"#4ade80":overallPct>=50?"#f59e0b":"#f87171"} strokeWidth="3" strokeDasharray={`${overallPct} ${100-overallPct}`} strokeLinecap="round"/>
            </svg>
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:16,fontWeight:900,color:"#f1f5f9"}}>{overallPct}%</div>
          </div>
          <div>
            <div style={{fontSize:15,fontWeight:800}}>ภาพรวมการเช็ค</div>
            <div style={{fontSize:13,color:"#94a3b8",marginTop:4}}>เช็คแล้ว {totalDone} จาก {totalSlots} เวร</div>
          </div>
        </div>
      </Card>

      <Card>
        <div style={{fontSize:13,fontWeight:700,color:"#94a3b8",marginBottom:14}}>แยกตามตำแหน่ง</div>
        {roleStats.map(({role,done,missing,incomplete,total})=>{
          const pct=Math.round((done/total)*100);
          return(
            <div key={role.id} style={{marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={{fontSize:18}}>{role.icon}</span>
                <span style={{fontSize:14,fontWeight:700,color:role.color}}>{role.short}</span>
                <span style={{marginLeft:"auto",fontSize:13,fontWeight:800,color:pct>=80?"#4ade80":pct>=50?"#f59e0b":"#f87171"}}>{pct}%</span>
              </div>
              <div style={{height:8,background:"#1e293b",borderRadius:99,overflow:"hidden",marginBottom:4}}>
                <div style={{height:"100%",borderRadius:99,background:pct>=80?"#4ade80":pct>=50?"#f59e0b":"#f87171",width:`${pct}%`,transition:"width 0.5s"}}/>
              </div>
              <div style={{display:"flex",gap:12,fontSize:11,color:"#64748b"}}>
                <span>✅ {done}</span><span>⚠️ {incomplete}</span><span>❌ {missing}</span>
              </div>
            </div>
          );
        })}
      </Card>

      <Card>
        <div style={{fontSize:13,fontWeight:700,color:"#94a3b8",marginBottom:14}}>7 วันล่าสุด</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:8,height:80}}>
          {last7.map(({day,pct})=>(
            <div key={day} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{fontSize:10,color:pct===100?"#4ade80":pct>=50?"#f59e0b":"#f87171",fontWeight:700}}>{pct}%</div>
              <div style={{width:"100%",background:pct===100?"#4ade80":pct>=50?"#f59e0b":"#f87171",borderRadius:"4px 4px 0 0",height:`${Math.max(4,pct*0.6)}px`,transition:"height 0.5s"}}/>
              <div style={{fontSize:10,color:"#64748b"}}>{day}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ── Settings ── */
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
      <Card>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
          <span style={{fontSize:28}}>{role.icon}</span>
          <div>
            <div style={{fontSize:16,fontWeight:800}}>ตั้งค่ารายการอุปกรณ์</div>
            <div style={{fontSize:13,color:"#94a3b8"}}>สำหรับ {role.label}</div>
          </div>
        </div>
        {(myRole==="para"||myRole==="aemt"||myRole==="driv")&&(
          <div style={{marginTop:10,padding:"10px 14px",background:"rgba(16,185,129,0.1)",borderRadius:8,fontSize:13,color:"#6ee7b7"}}>
            ℹ️ {myRole==="para"?"Para/RN":myRole==="aemt"?"AEMT":"พขร."} ใช้รายการอุปกรณ์แบบหมวดหมู่ที่กำหนดไว้ในระบบค่ะ ไม่สามารถแก้ไขผ่านหน้านี้ได้
          </div>
        )}
      </Card>

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
                <button onClick={()=>removeItem(i)} style={{...iconBtn,background:"rgba(239,68,68,0.15)",color:"#f87171",padding:"6px 10px",fontSize:14}}>✕</button>
              </div>
            ))}
            <button onClick={add} style={{marginTop:6,padding:"9px 18px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:role.color+"22",color:role.color}}>+ เพิ่มรายการ</button>
          </Card>
          <div style={{display:"flex",gap:10,marginBottom:24}}>
            <button onClick={()=>{if(window.confirm("รีเซ็ตรายการกลับค่าเริ่มต้น?"))setDraft([...DEFAULT_EQUIPMENT[myRole]]);}} style={{flex:1,padding:"13px 0",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:700,background:"rgba(255,255,255,0.07)",color:"#94a3b8"}}>🔄 รีเซ็ต</button>
            <button onClick={handleSaveEquip} disabled={saving} style={{flex:3,padding:"13px 0",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:15,fontWeight:800,background:saved?"#16a34a":saving?"#475569":`linear-gradient(90deg,${role.color},${role.color}cc)`,color:"#fff",transition:"all 0.3s"}}>
              {saving?"⏳ กำลังบันทึก...":saved?"✅ บันทึกแล้ว!":"💾 บันทึกการตั้งค่า"}
            </button>
          </div>
        </>
      )}

      <Card style={{border:"1.5px solid rgba(251,191,36,0.3)"}}>
        <div style={{fontSize:14,fontWeight:800,color:"#fbbf24",marginBottom:14}}>🔑 เปลี่ยน PIN</div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:6}}>PIN ปัจจุบัน</div>
          <input type="password" inputMode="numeric" value={currentPin} onChange={e=>{setCurrentPin(e.target.value);setPinError("");}} placeholder="PIN ปัจจุบัน" maxLength={6} style={{...BASE_INP,letterSpacing:6,fontSize:20}}/>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:6}}>PIN ใหม่ (4-6 หลัก)</div>
          <input type="password" inputMode="numeric" value={newPin} onChange={e=>{setNewPin(e.target.value.replace(/\D/g,""));setPinError("");}} placeholder="PIN ใหม่" maxLength={6} style={{...BASE_INP,letterSpacing:6,fontSize:20}}/>
        </div>
        {pinError&&<div style={{fontSize:13,color:"#f87171",marginBottom:10}}>⚠️ {pinError}</div>}
        <button onClick={handleChangePin} style={{width:"100%",padding:"12px 0",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:800,background:pinSaved?"#16a34a":"linear-gradient(90deg,#d97706,#b45309)",color:"#fff"}}>
          {pinSaved?"✅ เปลี่ยน PIN เรียบร้อย!":"🔑 เปลี่ยน PIN"}
        </button>
        <div style={{fontSize:12,color:"#475569",marginTop:10,textAlign:"center"}}>PIN เริ่มต้น: 1234</div>
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
      <div style={{background:"linear-gradient(135deg,#0f172a,#1e293b)",borderRadius:20,padding:28,maxWidth:400,width:"100%",border:"2px solid #4ade8055",boxShadow:"0 0 60px rgba(74,222,128,0.25)"}}>
        
        {/* Header - screenshot area */}
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:56,marginBottom:10,animation:"bounce 0.6s ease"}}>✅</div>
          <div style={{fontSize:20,fontWeight:900,color:"#4ade80",marginBottom:4}}>เช็คเสร็จสมบูรณ์!</div>
          <div style={{fontSize:12,color:"#64748b"}}>ขอบคุณสำหรับความร่วมมือ ขอให้เป็นวันที่ดี 🍀</div>
        </div>

        {/* Report card - screenshot friendly */}
        <div style={{background:"#0f172a",border:"1.5px solid #4ade8044",borderRadius:14,padding:18,marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,paddingBottom:12,borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
            <div style={{fontSize:28}}>🚑</div>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:"#f1f5f9"}}>EMS Equipment Check</div>
              <div style={{fontSize:11,color:"#64748b"}}>รพ.มหาราช นครศรีธรรมราช</div>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"10px 12px"}}>
              <div style={{fontSize:11,color:"#64748b",marginBottom:4}}>ผู้ตรวจเช็ค</div>
              <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>{role.icon} {role.short}</div>
              <div style={{fontSize:13,color:"#f1f5f9",marginTop:2}}>{myName||"-"}</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"10px 12px"}}>
              <div style={{fontSize:11,color:"#64748b",marginBottom:4}}>วันที่/เวร</div>
              <div style={{fontSize:13,fontWeight:700,color:sm.accent}}>{sm.icon} เวร{selShift}</div>
              <div style={{fontSize:12,color:"#f1f5f9",marginTop:2}}>{selDay} {MONTH_NAMES[selMonth]} {selYear+543}</div>
            </div>
          </div>

          <div style={{background:"rgba(74,222,128,0.08)",border:"1px solid #4ade8033",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
            <div style={{fontSize:11,color:"#64748b",marginBottom:4}}>ผลการตรวจเช็ค</div>
            <div style={{fontSize:15,fontWeight:900,color:"#4ade80"}}>✓ ครบ {totalItems} รายการ</div>
            {timeStr&&<div style={{fontSize:11,color:"#64748b",marginTop:4}}>บันทึกเมื่อ {timeStr} น.</div>}
          </div>

          {note&&(
            <div style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"10px 12px"}}>
              <div style={{fontSize:11,color:"#64748b",marginBottom:4}}>📝 ปัญหา/ข้อเสนอแนะ</div>
              <div style={{fontSize:13,color:"#f1f5f9"}}>{note}</div>
            </div>
          )}
        </div>

        {/* Warning if duplicate */}
        <div style={{fontSize:11,color:"#64748b",textAlign:"center",marginBottom:14}}>
          📸 แคปหน้าจอตรงนี้ได้เลยค่ะ แล้วกด "กลับหน้าหลัก"
        </div>

        <button onClick={onClose} style={{width:"100%",padding:"14px 0",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:15,fontWeight:800,background:"linear-gradient(90deg,#16a34a,#15803d)",color:"#fff"}}>
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

  function selectRole(id){setMyRole(id);ss(KEY_ROLE,id);}
  function switchRole(){setMyRole(null);ss(KEY_ROLE,null);setView("check");}
  function handleUnlock(){setPinUnlocked(true);}
  function handleLock(){setPinUnlocked(false);ss(PIN_SESSION_KEY,0);setView("check");}

  if(!myRole) return <RoleSelectScreen onSelect={selectRole}/>;
  if((view==="dashboard"||view==="summary"||view==="settings")&&!pinUnlocked) return <PinLockScreen onUnlock={handleUnlock}/>;

  const role=ROLE_MAP[myRole];
  const TABS=[
    {id:"check",     label:"📋 บันทึก"},
    {id:"summary",   label:"📋 สรุป 🔒"},
    {id:"dashboard", label:"📊 Dashboard 🔒"},
    {id:"settings",  label:"⚙️ ตั้งค่า 🔒"},
  ];

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f172a,#1e293b)",fontFamily:"'Sarabun','Noto Sans Thai',sans-serif",color:"#f1f5f9"}}>
      <div style={{background:"linear-gradient(90deg,#dc2626,#b91c1c)",padding:"14px 18px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 4px 24px rgba(220,38,38,0.4)",flexWrap:"wrap"}}>
        <div style={{fontSize:26}}>🚑</div>
        <div>
          <div style={{fontSize:17,fontWeight:800,letterSpacing:1}}>EMS Equipment Check</div>
          <div style={{fontSize:11,opacity:.85}}>รพ.มหาราช · ☁️ Firebase</div>
        </div>
        <button onClick={switchRole} style={{display:"flex",alignItems:"center",gap:6,background:role.color+"33",border:`1.5px solid ${role.color}66`,borderRadius:20,padding:"5px 14px",cursor:"pointer",fontFamily:"inherit",color:"#f1f5f9",fontSize:13,fontWeight:700}}>
          {role.icon} {role.short} <span style={{fontSize:11,opacity:.7}}>เปลี่ยน</span>
        </button>
        <div style={{marginLeft:"auto",display:"flex",gap:6,flexWrap:"wrap"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setView(t.id)} style={{padding:"7px 13px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,background:view===t.id?"#fff":"rgba(255,255,255,0.15)",color:view===t.id?"#dc2626":"#fff",transition:"all 0.2s"}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"18px 14px"}}>
        {view!=="settings"&&(
          <div style={{background:"rgba(255,255,255,0.05)",borderRadius:14,padding:"13px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            {view==="check"?(
              <>
                <span style={{fontSize:13,color:"#94a3b8"}}>📅</span>
                <span style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>{selDay} {MONTH_NAMES[selMonth]} {selYear+543}</span>
                <div style={{display:"flex",gap:6,marginLeft:"auto"}}>
                  {SHIFTS.map(s=>(
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
                    }} style={{padding:"6px 13px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:selShift===s?SHIFT_META[s].accent:"rgba(255,255,255,0.07)",color:selShift===s?"#fff":"#94a3b8",transition:"all 0.2s"}}>
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
        {view==="check"&&myRole==="para"&&<ParaCheckPage selYear={selYear} selMonth={selMonth} selDay={selDay} selShift={selShift}/>}
        {view==="check"&&myRole==="aemt"&&<AemtCheckPage selYear={selYear} selMonth={selMonth} selDay={selDay} selShift={selShift}/>}
        {view==="check"&&myRole==="driv"&&<DrivCheckPage selYear={selYear} selMonth={selMonth} selDay={selDay} selShift={selShift}/>}
        {view==="summary"  &&<SummaryPage   selYear={selYear} selMonth={selMonth} equipment={equipment} onLock={handleLock}/>}
        {view==="dashboard"&&<DashboardPage selYear={selYear} selMonth={selMonth} equipment={equipment} onLock={handleLock}/>}
        {view==="settings" &&<SettingsPage  myRole={myRole} equipment={equipment} onSaveEquip={setEquipment}/>}
      </div>
    </div>
  );
}
