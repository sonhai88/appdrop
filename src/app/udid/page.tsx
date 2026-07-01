import Link from "next/link";

export const dynamic = "force-dynamic";

export default function UdidPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-12">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 text-2xl">
          📱
        </span>
        <h1 className="text-2xl font-bold">Lấy UDID iPhone</h1>
        <p className="text-sm text-muted">
          Bấm nút dưới trên <strong>iPhone/iPad</strong> để lấy mã UDID gửi cho
          người phát hành app. Cần cho việc đăng ký thiết bị (ad-hoc).
        </p>
      </header>

      <a
        href="/api/udid/profile"
        className="grid place-items-center rounded-xl bg-gradient-to-r from-accent to-accent-2 px-5 py-4 text-base font-semibold text-white transition hover:opacity-90"
      >
        Lấy UDID của máy này
      </a>

      <ol className="flex flex-col gap-2 rounded-2xl border border-border bg-surface/60 p-5 text-sm text-muted">
        <li>1. Bấm nút trên → iOS hỏi tải cấu hình → <strong>Cho phép</strong>.</li>
        <li>2. Cài đặt → <strong>Đã tải hồ sơ</strong> → Cài đặt.</li>
        <li>3. Máy tự gửi UDID → hiện mã lên màn hình, copy gửi cho dev.</li>
      </ol>

      <p className="text-center text-xs text-muted">
        Chỉ hoạt động trên iOS qua HTTPS đã tin cậy. Android không cần UDID.
      </p>

      <Link href="/" className="text-center text-sm text-muted hover:text-foreground">
        ‹ Về trang chính
      </Link>
    </main>
  );
}
