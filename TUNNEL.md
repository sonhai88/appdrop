# Public miễn phí bằng Cloudflare Tunnel

Cho **ai cũng vào link tải/cài** mà không tốn tiền, không deploy đi đâu — máy anh
chạy app, `cloudflared` expose ra 1 URL HTTPS public. iOS OTA chạy luôn (Cloudflare
cấp cert HTTPS valid). Đổi lại: **máy phải bật** thì link mới sống.

## Chuẩn bị

```bash
brew install cloudflared          # nếu chưa có
npm run build && npm start        # chạy app ở chế độ production trên :3000
```

> Dùng `npm start` (production), KHÔNG `npm run dev` — dev qua tunnel hydrate chậm,
> dễ lỗi UI. Nhớ có `.env` (ít nhất `APP_PASSWORD` nếu muốn khoá upload).

## Cách 1 — Quick tunnel (nhanh nhất, URL ngẫu nhiên)

```bash
cloudflared tunnel --url http://localhost:3000
```
In ra URL kiểu `https://xxxx-yyyy.trycloudflare.com`. Gửi link đó, ai cũng vào được.
**URL đổi mỗi lần chạy lại.** Hợp để test nhanh.

### Giữ chạy nền (không chết khi đóng terminal)

```bash
# app
nohup npm start > ~/appdrop.log 2>&1 &
# tunnel
nohup cloudflared tunnel --url http://localhost:3000 > ~/tunnel.log 2>&1 &
grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' ~/tunnel.log | head -1   # lấy URL
```
Máy sleep vẫn ngắt — tránh sleep: `caffeinate -s` (chạy kèm) hoặc chỉnh Energy Saver.

## Cách 2 — Named tunnel (URL CỐ ĐỊNH, cần 1 domain trong Cloudflare)

Nếu anh có 1 domain đã add vào Cloudflare (account đang dùng cho R2):

```bash
cloudflared tunnel login                          # mở browser, chọn domain
cloudflared tunnel create appdrop                 # tạo tunnel tên appdrop
cloudflared tunnel route dns appdrop app.tencuaanh.com   # gắn subdomain cố định
cloudflared tunnel --url http://localhost:3000 run appdrop
```
→ URL cố định `https://app.tencuaanh.com`, không đổi. Đặt `PUBLIC_BASE_URL` = URL này
trong `.env` cho chắc (manifest iOS luôn đúng).

Chạy như service (tự bật lại): `sudo cloudflared service install` (dùng file config
tunnel), xem `cloudflared` docs.

## Dừng

```bash
pkill -f "cloudflared tunnel"   # tắt tunnel
pkill -f "next start"           # tắt app
```

## Giới hạn

- Máy tắt / mất mạng / sleep → link chết. Cần luôn-bật thì dùng [RAILWAY.md](./RAILWAY.md)
  hoặc 1 VPS (kể cả Oracle Cloud Free VM).
- Quick tunnel đổi URL mỗi lần; named tunnel mới cố định (cần domain).
