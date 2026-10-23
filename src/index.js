import React from 'react';
import ReactDOM from 'react-dom/client';
import { getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
let started = false;
function start() {
  if (started) return;
  started = true;
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// ล็อกอินแบบไม่ระบุตัวตน (Anonymous Auth) ก่อนแตะฐานข้อมูล
// เพื่อให้ใช้กฎ Firebase แบบ "auth != null" ได้ ผู้ใช้ไม่ต้องทำอะไรเพิ่ม
// ถ้าล็อกอินไม่ได้ (ยังไม่เปิด Anonymous ใน Firebase หรือเน็ตหลุด) แอปยังเปิดได้ตามเดิม
try {
  const auth = getAuth(getApps()[0]);
  onAuthStateChanged(auth, (u) => { if (u) start(); });
  signInAnonymously(auth).catch(() => start());
  setTimeout(start, 6000);
} catch (e) {
  start();
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
