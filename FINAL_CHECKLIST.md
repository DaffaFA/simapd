# FINAL INTEGRATION CHECKLIST

Checklist ini harus semua ✓ sebelum demo / sidang.

### INFRASTRUKTUR:
- [ ] `docker-compose up --build -d` → semua 5 service Up/Healthy
- [ ] `docker-compose ps` → tidak ada service "Exit" atau "Restarting"
- [ ] `docker-compose logs backend` → tidak ada FATAL/ERROR saat startup

### API DASAR:
- [ ] `GET  /health`                      → {"status":"ok","version":"1.0.0"}
- [ ] `POST /api/v1/auth/login`           → 200 + access_token
- [ ] `GET  /api/v1/auth/me (no token)`   → 401
- [ ] `GET  /api/v1/auth/me (with token)` → 200 + user data
- [ ] `GET  /api/v1/sp/config`            → 200 + {sp1_threshold:3,...}

### PERSONNEL & SP:
- [ ] `GET  /api/v1/personnel`            → list dengan seeded data
- [ ] `POST /api/v1/personnel`            → 201 + new record
- [ ] `PUT  /api/v1/personnel/:id`        → 200 + updated
- [ ] `POST /api/v1/violations/:id/link`  → linked + SP auto-check dijalankan
- [ ] `GET  /api/v1/sp/active`            → list SP aktif (jika ada)

### ANALYTICS:
- [ ] `GET /api/v1/analytics/dashboard`   → 200 + {summary,trend,byType,byShift,offenders}
- [ ] `GET /api/v1/analytics/export/csv`  → file .csv terdownload dengan BOM
- [ ] `GET /api/v1/analytics/export/pdf`  → file .pdf terdownload

### WEBSOCKET:
- [ ] `wscat -c "ws://localhost/stream?token=VALID_JWT"`
  → Receive: `{"event":"system","message":"Connected","level":"info"}`
- [ ] `wscat -c "ws://localhost/stream"` (no token)
  → Receive: `{"event":"error","message":"Unauthorized"}` + close

### AI SERVICE (jika mock mode):
- [ ] `MOCK_INFERENCE=true docker-compose up ai-service`
- [ ] Dalam 10 detik: `redis-cli subscribe detections` → muncul JSON messages
- [ ] NestJS log: "Violation saved from detection" muncul untuk non-compliant
- [ ] WebSocket client menerima `{"event":"violation_alert",...}`

### FRONTEND:
- [ ] `http://localhost` → halaman login tampil (Next.js berjalan)
- [ ] Login dengan admin/admin123 → redirect ke dashboard
- [ ] Dashboard: card summary berisi data (tidak hardcoded)
- [ ] WS indicator "Terhubung" tampil di header setelah login
- [ ] Tabel Pelanggaran: memuat data dari API, pagination berfungsi
- [ ] Export CSV → file terdownload dan bisa dibuka di Excel
- [ ] Refresh halaman → tetap login (token persisted)

### KEAMANAN & EDGE CASES:
- [ ] `DELETE /api/v1/personnel/:id` tanpa token → 401
- [ ] `POST /api/v1/sp/issue` dengan role supervisor → 403
- [ ] `POST /api/v1/violations/:id/link` dengan personnel_id tidak valid → 422
- [ ] SP Config: `PUT /api/v1/sp/config {sp1_threshold:5}` → config ter-update
- [ ] Restart backend container → WS client auto-reconnect dalam 3 detik

### SWAGGER:
- [ ] `http://localhost/api/docs` → semua endpoint terdaftar
- [ ] Authorize dengan Bearer token → endpoint protected bisa diakses
- [ ] `POST /auth/login` via Swagger → berfungsi
