# AppDrop — Deploy guide (self-host VPS)

Diawi-clone: upload `.ipa` / `.apk` → nhận link → tester mở trên điện thoại là cài (OTA).
Stack: **Next.js 16 + SQLite + disk storage + Caddy (auto HTTPS)**.

---

## 0. Bức tranh tổng thể

```
Điện thoại tester
   │  https://apps.yourdomain.com/d/<slug>
   ▼
Caddy (cổng 443, tự lo Let's Encrypt SSL)
   │  reverse_proxy → localhost:3000
   ▼
Next.js server (npm start)  ──>  /var/lib/appdrop/data/  (app.db + file .ipa/.apk)
```

iOS bắt buộc HTTPS valid → **đó là lý do phải có domain + Caddy**, không chạy được bằng IP trần.

---

## 1. Mua + trỏ domain (anh đang ở bước này)

iOS OTA **không chạy với IP trần hay self-signed cert**. Cần 1 domain/subdomain thật.

1. Mua domain rẻ: Cloudflare Registrar (giá gốc), Namecheap, hoặc Porkbun (~$1–10/năm cho `.com`/`.xyz`).
2. Trỏ về VPS — tạo 1 **A record**:
   - Type: `A`
   - Name: `apps` (→ thành `apps.yourdomain.com`) hoặc `@` cho root domain
   - Value: **IP public của VPS**
   - Proxy (nếu dùng Cloudflare): **TẮT** (DNS only / màu xám) — để Caddy tự lấy cert. Bật proxy cam cũng được nhưng lúc đầu để xám cho đơn giản.
3. Chờ DNS lan (vài phút tới ~1h). Check:
   ```bash
   dig +short apps.yourdomain.com   # phải ra đúng IP VPS
   ```

> Chưa muốn mua domain? Test **Android** trước bằng IP LAN (`http://192.168.x.x:3000`) cũng được. Nhưng **iOS thì bắt buộc** mới có domain + HTTPS.

---

## 2. Cài Node 20+ và Caddy trên VPS

```bash
# Node 20 (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential   # build-essential cho better-sqlite3

# Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

---

## 3. Deploy app

```bash
# Tạo user + thư mục
sudo useradd -r -m -d /opt/appdrop appdrop
sudo mkdir -p /var/lib/appdrop/data
sudo chown -R appdrop:appdrop /var/lib/appdrop

# Lấy code lên /opt/appdrop (clone repo hoặc rsync từ máy anh)
sudo -u appdrop git clone <repo-url> /opt/appdrop   # hoặc rsync -a ./ user@vps:/opt/appdrop
cd /opt/appdrop

# Cài + build
sudo -u appdrop npm ci
sudo -u appdrop npm run build

# Cấu hình env
sudo -u appdrop cp env.sample .env
sudo -u appdrop nano .env     # sửa PUBLIC_BASE_URL=https://apps.yourdomain.com, DATA_DIR=/var/lib/appdrop/data
```

Chạy bằng systemd:

```bash
sudo cp deploy/appdrop.service /etc/systemd/system/appdrop.service
sudo systemctl daemon-reload
sudo systemctl enable --now appdrop
journalctl -u appdrop -f         # xem log
```

---

## 4. Caddy

```bash
# Sửa domain trong Caddyfile rồi:
sudo cp Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile      # đổi apps.example.com → apps.yourdomain.com
sudo systemctl reload caddy
```

Caddy tự xin SSL Let's Encrypt trong vài giây. Mở `https://apps.yourdomain.com` → thấy trang upload là xong.

---

## 5. Test

**Android:** mở link `/d/<slug>` trên máy Android → nút *Tải & cài APK* → nếu chặn thì bật "Cài ứng dụng không xác định".

**iOS:** mở link trên iPhone (Safari) → nút *Cài đặt lên iPhone* → bấm "Cài đặt" ở popup → ra màn hình chính chờ tải.

---

## 6. ⚠️ iOS signing — cái web KHÔNG làm hộ được

Web chỉ host file + sinh manifest. App `.ipa` phải được **anh ký sẵn** thì iOS mới cài:

- **Ad-hoc**: UDID của từng iPhone test phải nằm trong provisioning profile lúc build `.ipa`. Máy lạ (UDID chưa đăng ký) → bấm Cài đặt sẽ báo lỗi "không cài được".
- **Enterprise (Apple Developer Enterprise Program)**: cài được trên mọi máy, nhưng sau khi cài phải vào *Cài đặt → Cài đặt chung → VPN & Quản lý thiết bị → Tin cậy* nhà phát triển.
- **Development**: tương tự ad-hoc, cần UDID + device registered.

Nếu tester báo "không cài được": 90% là UDID chưa nằm trong profile, **không phải lỗi web**. Diawi cũng dính y hệt giới hạn này.

---

## 7. Vận hành

- **Backup**: chỉ cần backup thư mục `DATA_DIR` (`/var/lib/appdrop/data`) — chứa cả DB lẫn file.
- **Update app**: `cd /opt/appdrop && git pull && npm ci && npm run build && sudo systemctl restart appdrop`
- **Dọn build hết hạn**: link hết hạn tự ẩn (DB check `expires_at`), nhưng file vẫn nằm trên disk. Có thể thêm cron xoá folder cũ trong `DATA_DIR/uploads/` sau này nếu cần.

---

## Chạy local (dev) để xem trước

```bash
npm ci
npm run dev        # http://localhost:3000  — Android test được ngay; iOS cần domain HTTPS
```
