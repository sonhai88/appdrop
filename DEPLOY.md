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

iOS bắt buộc HTTPS được trust → cần **domain public** (cách A, mục 1–7) HOẶC **self-signed CA cài lên từng iPhone** (cách B, mục LAN ngay dưới). Android thì không cần gì.

---

## ⭐ Dùng trong mạng nội bộ (LAN, KHÔNG domain)

Kịch bản: máy chạy AppDrop nằm trong mạng công ty, tester cùng wifi/LAN. Không mở ra internet.

### Android — chạy ngay, 0 setup
Mở `http://<IP-máy-server>:3000` (vd `http://192.168.1.50:3000`) → upload `.apk` → gửi link `/d/<slug>` → tester mở trên Android → *Tải & cài APK*. Xong. Không cần Caddy, không cần cert.

> Nên đặt **IP tĩnh** cho máy server (DHCP đổi IP là link chết). IT công ty set reservation theo MAC là được.

### iOS — cần self-signed CA (cài 1 lần / iPhone)

iOS OTA từ chối http và self-signed chưa trust. Cách làm không cần domain: tạo 1 CA nội bộ, ký cert cho server, cài CA đó lên từng iPhone.

**Bước 1 — tạo cert (chạy trên máy server, cần `openssl`):**
```bash
sudo mkdir -p /etc/appdrop/certs
sudo ./scripts/gen-ios-certs.sh 192.168.1.50 /etc/appdrop/certs   # đổi thành IP tĩnh của anh
```
Ra: `server.crt`/`server.key` (cho Caddy) + `appdrop-ca.mobileconfig` (cho iPhone). Cert đã đúng chuẩn iOS (SAN + EKU + hạn <825 ngày).

**Bước 2 — Caddy dùng cert đó** (cài Caddy theo mục 2 bên dưới, rồi):
```bash
sudo cp Caddyfile.lan /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile        # đổi 192.168.1.50 → IP máy anh (cả 3 chỗ)
sudo systemctl reload caddy
```

**Bước 3 — `.env`:**
```
PUBLIC_BASE_URL=https://192.168.1.50   # đúng IP đã ký trong cert
DATA_DIR=/var/lib/appdrop/data
```

**Bước 4 — mỗi iPhone làm 1 lần:**
1. Mở `http://192.168.1.50/appdrop-ca.mobileconfig` (http, để tránh cảnh báo cert lúc chưa trust) → *Cho phép tải Cấu hình*.
2. Cài đặt → **Đã tải hồ sơ** → *Cài đặt*.
3. Cài đặt → Cài đặt chung → Giới thiệu → **Cài đặt tin cậy chứng chỉ** → bật **Tin cậy hoàn toàn** cho "AppDrop Internal CA". ⚠️ Bước này Apple bắt làm tay, profile không tự bật hộ được.
4. Xong — giờ mở `https://192.168.1.50/d/<slug>` → *Cài đặt lên iPhone* chạy như Diawi.

> ⚠️ Đây chỉ lo phần **HTTPS transport**. File `.ipa` **vẫn phải ký ad-hoc/enterprise + UDID máy đó** (mục 6). Hai chuyện tách biệt, đừng nhầm.

> Không muốn đụng từng máy? Mua 1 domain rẻ rồi trỏ **A record về private IP** + Caddy DNS-01 challenge → cert valid mà không cần mở port ra ngoài, iPhone khỏi cài CA. Bảo em nếu đổi hướng này.

---

## 1. (Cách A — có domain public) Mua + trỏ domain

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

## 7. Lưu trữ file build

File `.ipa/.apk` + `app.db` đều nằm trong **`DATA_DIR`** (mặc định `/var/lib/appdrop/data`).

### Đổi chỗ lưu → NAS / ổ mạng công ty
Chỉ cần trỏ `DATA_DIR` vào mount point của NAS, không đụng code:

```bash
# Ví dụ mount SMB (NAS công ty) — /etc/fstab để tự mount lại khi reboot:
//nas.company.local/appdrop  /mnt/appdrop  cifs  credentials=/etc/appdrop/smb.cred,uid=appdrop,gid=appdrop,file_mode=0660,dir_mode=0770  0  0

sudo mount -a
# rồi trong .env:
DATA_DIR=/mnt/appdrop/data
sudo systemctl restart appdrop
```
NFS thì tương tự (`type nfs`). File từ đó nằm trên NAS chung, không ăn disk máy server.

### Tự dọn build hết hạn (đã có sẵn)
App **tự xoá** cả DB row lẫn file khi link quá `expires_at` — chạy lúc khởi động + mỗi giờ (`src/instrumentation.ts` → `sweepExpired()`). Không cần cron ngoài. Build đặt "Không hết hạn" thì giữ mãi.

## 8. Vận hành

- **Backup**: backup thư mục `DATA_DIR` — chứa cả DB lẫn file (nếu đã trỏ NAS thì NAS lo backup).
- **Update app**: `cd /opt/appdrop && git pull && npm ci && npm run build && sudo systemctl restart appdrop`
- **Xem log dọn dẹp**: `journalctl -u appdrop | grep cleanup`

---

## Chạy local (dev) để xem trước

```bash
npm ci
npm run dev        # http://localhost:3000  — Android test được ngay; iOS cần domain HTTPS
```
