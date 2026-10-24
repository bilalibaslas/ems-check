import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// วันที่อัปเดตล่าสุด = วันที่ build/deploy (เวลาไทย) ใช้แสดงในเครดิตท้ายแอป
const BUILD_DATE = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }); // YYYY-MM-DD

export default defineConfig({
  plugins: [react()],
  define: { __BUILD_DATE__: JSON.stringify(BUILD_DATE) },
});
