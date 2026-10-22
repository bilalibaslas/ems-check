# EMS Driver Check

แอปบันทึกการเป่าแอลกอฮอล์และความพร้อมของ พขร. พร้อม Activation time (AT)
แยกจากแอป ems-check แต่ใช้ Firebase Realtime Database โปรเจกต์เดียวกัน

## อ่านจาก ems-check (อ่านอย่างเดียว)
- `roster/{YYYY-MM-DD}_{เวร}` → ชื่อ พขร. (`driv`), A-EMT (`aemt`), ทะเบียนรถ (`vehicle`)
- `staff/driv`, `staff/aemt` → รายชื่อสำหรับช่องค้นชื่อ
- `config/summaryPin` → PIN แอดมิน (ใช้ปลดล็อกหน้าตั้งค่าเกณฑ์)

## ข้อมูลของแอปนี้
- `driverCheck/{YYYY-MM-DD}_{เวร}`
  - `start` ผลตรวจต้นเวร (แอลกอฮอล์, BP, PR, SpO2, ความล้า, ความเห็นผู้ตรวจ, สิ่งที่ทำแล้ว, คนแทน)
  - `startPrev/{timestamp}` ผลตรวจต้นเวรรอบที่ไม่ผ่าน ก่อนเปลี่ยนคน
  - `runs/{id}` การออก EMS แต่ละครั้ง: `n` ครั้งที่, `blows[]` การเป่า (เวลา, ค่า, ชื่อ), `at`, `reason`, `reasonNote`, `actions`
- `driverCheckConfig/thresholds` เกณฑ์ (ถ้าไม่มี ใช้ค่าตั้งต้นใน `src/logic.js`)

เวรดึก (00:15–08:14) นับเป็นวันก่อนหน้า เหมือน ems-check

## รัน / deploy
```
npm install
npm run dev     # ทดสอบในเครื่อง
npm run build   # ได้โฟลเดอร์ dist/
```
บน Vercel: สร้างโปรเจกต์ใหม่จาก repo นี้ ตั้ง **Root Directory = `driver-check`** (Framework: Vite)
