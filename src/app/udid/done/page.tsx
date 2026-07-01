import Link from "next/link";
import CopyField from "@/components/CopyField";

export const dynamic = "force-dynamic";

export default async function UdidDone({
  searchParams,
}: {
  searchParams: Promise<{ udid?: string }>;
}) {
  const { udid } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-6 px-5 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-green-500/15 text-2xl">
        ✅
      </span>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Đã lấy UDID</h1>
        <p className="text-sm text-muted">
          Mã đã được gửi cho người phát hành app. Copy gửi thêm nếu cần:
        </p>
      </div>

      {udid ? (
        <CopyField value={udid} />
      ) : (
        <p className="text-sm text-muted">Không đọc được UDID. Thử lại nhé.</p>
      )}

      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ‹ Về trang chính
      </Link>
    </main>
  );
}
