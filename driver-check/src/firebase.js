// ใช้ Firebase โปรเจกต์เดียวกับ ems-check เพื่ออ่านตารางผู้ปฏิบัติงาน (roster) และรายชื่อ พขร. (staff/driv)
// ข้อมูลของแอปนี้เก็บแยกไว้ที่ driverCheck/ และ driverCheckConfig/ ไม่แตะข้อมูลเดิมของ ems-check
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCW_xpZq3nVeL86NUX5S8W1hbMSzdS4kpk",
  authDomain: "ems-equipment-mnst.firebaseapp.com",
  databaseURL: "https://ems-equipment-mnst-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ems-equipment-mnst",
  storageBucket: "ems-equipment-mnst.firebasestorage.app",
  messagingSenderId: "917321944070",
  appId: "1:917321944070:web:e5b06fe6554d35aba68787",
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
