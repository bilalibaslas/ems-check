import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { app } from "./firebase";
import App from "./App.jsx";
import "./styles.css";

const root = createRoot(document.getElementById("root"));
let started = false;
function start() {
  if (started) return;
  started = true;
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

// ล็อกอินแบบไม่ระบุตัวตนก่อนอ่าน/เขียนฐานข้อมูล (ใช้กับกฎ Firebase "auth != null")
// ล็อกอินไม่ได้ก็ยังเปิดแอปได้ตามเดิม
try {
  const auth = getAuth(app);
  onAuthStateChanged(auth, (u) => { if (u) start(); });
  signInAnonymously(auth).catch(() => start());
  setTimeout(start, 6000);
} catch {
  start();
}
