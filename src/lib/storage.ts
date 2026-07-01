import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { UPLOADS_DIR } from "./config";

/** Absolute path to a build's own folder: <UPLOADS_DIR>/<slug>/ */
export function buildDir(slug: string): string {
  return path.join(UPLOADS_DIR, slug);
}

export function buildFilePath(slug: string, fileName: string): string {
  return path.join(buildDir(slug), fileName);
}

/** Best-effort recursive delete — used to roll back a failed upload. */
export function removeBuildDir(slug: string): void {
  fs.rmSync(buildDir(slug), { recursive: true, force: true });
}

/**
 * Stream a web ReadableStream straight to disk without buffering the whole
 * file in memory (builds can be hundreds of MB). Enforces a byte ceiling and
 * aborts + cleans up if the upload exceeds it.
 *
 * Returns the number of bytes written.
 */
export async function streamToFile(
  webStream: ReadableStream<Uint8Array>,
  destPath: string,
  maxBytes: number,
): Promise<number> {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  let bytesWritten = 0;
  const out = fs.createWriteStream(destPath);
  const reader = webStream.getReader();

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      bytesWritten += value.byteLength;
      if (bytesWritten > maxBytes) {
        throw new Error("FILE_TOO_LARGE");
      }

      // Respect backpressure: wait for drain when the buffer is full.
      if (!out.write(value)) {
        await new Promise<void>((resolve) => out.once("drain", resolve));
      }
    }
  } catch (err) {
    out.destroy();
    fs.rmSync(destPath, { force: true });
    throw err;
  }

  await new Promise<void>((resolve, reject) => {
    out.end((err?: Error | null) => (err ? reject(err) : resolve()));
  });

  return bytesWritten;
}

/** Save a decoded icon buffer (PNG) into the build folder. */
export function saveIcon(slug: string, buffer: Buffer, fileName = "icon.png"): void {
  const dest = buildFilePath(slug, fileName);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buffer);
}

/** Read a stored file as a Node Readable for streaming back in a response. */
export function openReadStream(slug: string, fileName: string): Readable {
  return fs.createReadStream(buildFilePath(slug, fileName));
}

export function fileExists(slug: string, fileName: string): boolean {
  return fs.existsSync(buildFilePath(slug, fileName));
}
