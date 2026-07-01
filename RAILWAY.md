# Deploy public lên Railway

Cho **ai cũng vào link tải/cài** app. Railway cho container có disk bền + domain
HTTPS public → code chạy nguyên, upload file lớn OK, **iOS OTA chạy luôn** qua
domain HTTPS của Railway (khỏi cần domain riêng hay self-signed).

---

## Các bước (~10 phút)

### 1. Tạo project
1. Vào **railway.app** → **New Project** → **Deploy from GitHub repo**.
2. Kết nối GitHub, chọn repo **`sonhai88/appdrop`**.
3. Railway đọc `railway.json` → build bằng `Dockerfile` tự động.

### 2. Gắn Volume (để file + DB không mất khi redeploy)
- Service → **Settings** (hoặc **Data**) → **Add Volume**.
- Mount path: **`/data`** (Dockerfile đã set `DATA_DIR=/data`).

### 3. Biến môi trường (Variables)
| Biến | Giá trị | Bắt buộc? |
|---|---|---|
| `APP_PASSWORD` | mật khẩu upload (để trống = ai cũng upload được) | tuỳ |
| `MAX_APPS` | `20` | tuỳ (mặc định 20) |
| `PUBLIC_BASE_URL` | để **trống** — tự lấy từ domain Railway | không |
| `R2_*` (5 biến) | nếu muốn lưu trên R2 thay vì volume | tuỳ |

> Không cần set `DATA_DIR`/`PORT` — Dockerfile + Railway lo sẵn.

### 4. Mở domain public
- Service → **Settings** → **Networking** → **Generate Domain**.
- Được URL kiểu `https://appdrop-production-xxxx.up.railway.app` (HTTPS valid).

### 5. Xong
- Mở domain → (đăng nhập nếu có `APP_PASSWORD`) → upload build.
- Link `/d/<slug>` **ai cũng vào tải/cài được** (không cần đăng nhập).
- **iOS**: cài OTA chạy luôn vì domain Railway đã HTTPS valid.

---

## Lưu ý

- **File lớn**: Railway volume có dung lượng giới hạn theo gói. Nhiều build nặng →
  bật **R2** (xem [R2.md](./R2.md)) để đẩy file lên object storage, volume chỉ giữ SQLite.
- **Chi phí**: Railway tính theo dùng (RAM/CPU/bandwidth/volume). Gói Hobby có credit
  hàng tháng; app nhẹ nên thường trong hạn, nhưng bandwidth tải build nhiều thì để ý.
- **Cap 20 app** + auto-cleanup hết hạn vẫn chạy như thường (giữ storage gọn).
- Mật khẩu upload: chỉ chặn trang upload + dashboard. Trang cài/tải luôn public.
