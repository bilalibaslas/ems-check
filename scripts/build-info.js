// รันอัตโนมัติก่อน build (npm prebuild): บันทึกวันที่ build (เวลาไทย) ไว้แสดง "อัปเดตล่าสุด" ท้ายแอป
const fs = require("fs");
const path = require("path");
const date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }); // YYYY-MM-DD
const info = JSON.stringify({ date }) + "\n";
fs.writeFileSync(path.join(__dirname, "..", "src", "buildInfo.json"), info);
fs.writeFileSync(path.join(__dirname, "..", "public", "build-info.json"), JSON.stringify({ date, builtAt: new Date().toISOString() }) + "\n");
console.log("build date:", date);
