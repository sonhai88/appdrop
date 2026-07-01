# Setup nhanh (cho người dựng server)

AppDrop = tự host, upload `.ipa/.apk` → link cài OTA. Dùng trong **mạng nội bộ (LAN)**.
Chi tiết đầy đủ ở [DEPLOY.md](./DEPLOY.md). File này chỉ liệt kê lệnh.

> Đổi `192.168.1.50` thành **IP tĩnh** của máy server ở mọi chỗ bên dưới.
> Máy server phải đặt IP tĩnh (DHCP đổi IP là link chết).

---

## 1. Cài Node 20 + Caddy (Ubuntu/Debian)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential

sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

## 2. Deploy app

```bash
sudo useradd -r -m -d /opt/appdrop appdrop
sudo mkdir -p /var/lib/appdrop/data && sudo chown -R appdrop:appdrop /var/lib/appdrop

sudo -u appdrop git clone https://github.com/sonhai88/appdrop /opt/appdrop
cd /opt/appdrop
sudo -u appdrop npm ci
sudo -u appdrop npm run build

sudo -u appdrop cp env.sample .env
sudo -u appdrop nano .env      # xem mục 3
```

`.env`:
```
PUBLIC_BASE_URL=https://192.168.1.50
DATA_DIR=/var/lib/appdrop/data
PORT=3000
APP_PASSWORD=đặt-mật-khẩu-chung   # để trống = ai trong LAN cũng upload được
```

> Trang cài đặt (`/d/...`, `/udid`) luôn public để tester dùng; `APP_PASSWORD` chỉ
> khoá trang upload + dashboard `/builds`. Tester lấy UDID tại `/udid`, admin xem ở `/builds/udids`.

Chạy bằng systemd:
```bash
sudo cp deploy/appdrop.service /etc/systemd/system/appdrop.service
sudo systemctl daemon-reload
sudo systemctl enable --now appdrop
```

## 3. Android — xong ngay

Không cần Caddy. Tester mở `http://192.168.1.50:3000` → upload `.apk` → gửi link → cài.
(Muốn dùng chung HTTPS với iOS thì làm tiếp mục 4, mở `https://192.168.1.50`.)

## 4. iOS — self-signed cert (bắt buộc, làm 1 lần)

```bash
# Tạo CA + cert + profile
sudo mkdir -p /etc/appdrop/certs
cd /opt/appdrop
sudo ./scripts/gen-ios-certs.sh 192.168.1.50 /etc/appdrop/certs

# Caddy dùng cert đó
sudo cp Caddyfile.lan /etc/caddy/Caddyfile
sudo sed -i 's/192.168.1.50/<IP-THẬT>/g' /etc/caddy/Caddyfile   # đổi IP
sudo systemctl reload caddy
```

**Mỗi iPhone làm 1 lần:**
1. Mở `http://192.168.1.50/appdrop-ca.mobileconfig` → tải + Cài đặt hồ sơ.
2. Cài đặt → Cài đặt chung → Giới thiệu → **Cài đặt tin cậy chứng chỉ** → bật **Tin cậy hoàn toàn** cho "AppDrop Internal CA".
3. Xong → mở `https://192.168.1.50/d/<slug>` cài như Diawi.

> ⚠️ File `.ipa` phải được **ký ad-hoc/enterprise + UDID máy đó** trước khi upload — người dev app lo, không phải việc của server.

## 5. Vận hành

```bash
journalctl -u appdrop -f                 # log app
# update:
cd /opt/appdrop && sudo -u appdrop git pull && sudo -u appdrop npm ci \
  && sudo -u appdrop npm run build && sudo systemctl restart appdrop
```

- File build + DB nằm ở `DATA_DIR`. Backup = copy thư mục đó.
- Build hết hạn tự xoá (app tự dọn mỗi giờ). Không cần cron.
- Lưu ra NAS: trỏ `DATA_DIR` vào mount NAS (xem DEPLOY.md mục 7).
