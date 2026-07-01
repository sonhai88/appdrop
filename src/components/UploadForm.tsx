"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBytes } from "@/lib/format";

type Status = "idle" | "uploading" | "error";

const ACCEPTED = [".ipa", ".apk"];

function isAccepted(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED.some((ext) => lower.endsWith(ext));
}

export default function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [expiry, setExpiry] = useState("30");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function pickFile(f: File | undefined | null) {
    if (!f) return;
    if (!isAccepted(f.name)) {
      setError("Chỉ chấp nhận file .ipa (iOS) hoặc .apk (Android).");
      return;
    }
    setError(null);
    setFile(f);
  }

  function startUpload() {
    if (!file) return;
    setStatus("uploading");
    setProgress(0);
    setError(null);

    const params = new URLSearchParams({
      filename: file.name,
      comment,
      expiry,
      password,
    });

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/upload?${params.toString()}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const { slug } = JSON.parse(xhr.responseText);
        router.push(`/d/${slug}`);
      } else {
        let message = "Upload thất bại. Thử lại nhé.";
        try {
          message = JSON.parse(xhr.responseText).error ?? message;
        } catch {}
        setError(message);
        setStatus("error");
      }
    };
    xhr.onerror = () => {
      setError("Mất kết nối khi upload. Kiểm tra mạng rồi thử lại.");
      setStatus("error");
    };
    // Raw file body — streamed straight to disk on the server.
    xhr.send(file);
  }

  const uploading = status === "uploading";
  const platform = file ? (file.name.toLowerCase().endsWith(".ipa") ? "iOS" : "Android") : null;

  return (
    <div className="flex flex-col gap-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pickFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition cursor-pointer ${
          dragging
            ? "border-accent bg-accent/10"
            : "border-border bg-surface hover:border-accent/60 hover:bg-surface-2"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".ipa,.apk"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
        <div className="grid h-14 w-14 place-items-center rounded-full bg-accent/15 text-2xl">
          📦
        </div>
        {file ? (
          <div className="flex flex-col gap-1">
            <span className="text-base font-semibold text-foreground">{file.name}</span>
            <span className="text-sm text-muted">
              {platform} · {formatBytes(file.size)}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-base font-semibold text-foreground">
              Kéo thả file vào đây, hoặc bấm để chọn
            </span>
            <span className="text-sm text-muted">.ipa cho iOS · .apk cho Android</span>
          </div>
        )}
      </div>

      {file && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Ghi chú (tuỳ chọn)</span>
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="vd: build staging, fix bug đăng nhập"
              maxLength={500}
              disabled={uploading}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Link hết hạn sau</span>
            <select
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              disabled={uploading}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            >
              <option value="1">1 ngày</option>
              <option value="7">7 ngày</option>
              <option value="30">30 ngày</option>
              <option value="90">90 ngày</option>
              <option value="0">Không hết hạn</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">
              Mật khẩu link (tuỳ chọn)
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Để trống = ai có link đều mở được"
              disabled={uploading}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </label>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {uploading ? (
        <div className="flex flex-col gap-2">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-center text-sm text-muted">
            Đang upload… {progress}%
          </span>
        </div>
      ) : (
        <button
          onClick={startUpload}
          disabled={!file}
          className="h-12 rounded-xl bg-gradient-to-r from-accent to-accent-2 text-base font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Tạo link cài đặt
        </button>
      )}
    </div>
  );
}
