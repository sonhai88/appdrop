import { Readable } from "node:stream";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

/**
 * Cloudflare R2 = S3-compatible object storage with zero egress fees, ideal for
 * serving large builds. Enabled only when all creds are present — otherwise the
 * app falls back to local disk (see blob.ts), so it runs with zero config too.
 */
export function r2Enabled(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_BASE_URL,
  );
}

let client: S3Client | null = null;
function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
      },
    });
  }
  return client;
}

const bucket = () => process.env.R2_BUCKET as string;

/** Object keys — all builds live under builds/<slug>/. */
export const buildKey = (slug: string, fileName: string) =>
  `builds/${slug}/${fileName}`;
export const iconKey = (slug: string) => `builds/${slug}/icon.png`;
export const manifestKey = (slug: string) => `builds/${slug}/manifest.plist`;

/** Public https URL (r2.dev or custom domain) for an object key. */
export function r2PublicUrl(key: string): string {
  const base = (process.env.R2_PUBLIC_BASE_URL as string).replace(/\/+$/, "");
  return `${base}/${key}`;
}

/** Stream a file up to R2 (multipart under the hood — handles 100s of MB). */
export async function r2PutStream(
  key: string,
  body: Readable,
  contentType: string,
): Promise<void> {
  await new Upload({
    client: s3(),
    params: { Bucket: bucket(), Key: key, Body: body, ContentType: contentType },
  }).done();
}

export async function r2PutBuffer(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function r2Delete(keys: string[]): Promise<void> {
  await Promise.all(
    keys.map((Key) =>
      s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key })),
    ),
  );
}
