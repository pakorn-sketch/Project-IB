# วิธีต่อ API ใหม่

## 1. แก้ Google Apps Script

เอาโค้ดจากไฟล์นี้ไปวางแทนโค้ดเดิมใน Apps Script:

`api/google-apps-script-doGet.js`

โค้ดใหม่จะแยกเป็น 2 แบบ:

- `?action=health` ใช้เช็กว่า API เปิดอยู่
- `?action=data` ใช้ดึงข้อมูลจากชีต `summary`

## 2. Deploy ใหม่

ใน Google Apps Script ให้กด:

Deploy > Manage deployments > Edit > New version > Deploy

ตั้งค่า Web app:

- Execute as: Me
- Who has access: Anyone

## 3. ทดสอบ URL

เปิด URL นี้ใน Browser:

`https://script.google.com/macros/s/AKfycbx3Tux2UVSPjDvexl8Vz_YaYrliqakeMxd_BZoYlobSzPATUOkdFNX9OJSn989wS5qO/exec?action=data`

ผลลัพธ์ที่ถูกต้องต้องเป็น JSON ประมาณนี้:

```json
{
  "success": true,
  "sheet": "summary",
  "total": 10,
  "updatedAt": "2026-07-06T00:00:00.000Z",
  "data": []
}
```

ถ้ายังขึ้นแค่ `API OK` แปลว่า Apps Script ยังไม่ได้ deploy โค้ดเวอร์ชันใหม่
หรือ URL ที่ใช้อยู่ยังเป็น deployment เก่า
