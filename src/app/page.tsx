import UploadForm from "@/components/UploadForm";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-5 py-12 sm:py-20">
      <header className="flex flex-col gap-3 text-center">
        <div className="mx-auto flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-lg">
            🚀
          </span>
          <span className="text-lg font-semibold tracking-tight">AppDrop</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Đẩy app lên, nhận link cài đặt
        </h1>
        <p className="text-base text-muted">
          Upload file <code className="text-accent-2">.ipa</code> hoặc{" "}
          <code className="text-accent-2">.apk</code> → chia sẻ 1 link → tester mở
          trên điện thoại là cài được. Như Diawi, nhưng self-hosted.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-surface/60 p-6 backdrop-blur">
        <UploadForm />
      </section>

      <footer className="flex flex-col gap-2 text-center text-xs text-muted">
        <p>
          iOS cần app đã ký <strong>ad-hoc / enterprise</strong> và UDID thiết bị
          nằm trong provisioning profile — đây là yêu cầu của Apple, không bypass
          được.
        </p>
        <p>Android chỉ cần bật &quot;Cài từ nguồn không xác định&quot;.</p>
      </footer>
    </main>
  );
}
