// Работа с R2 из Cloudflare Functions.
// Небольшие объекты (фото, превью) — через нативный binding env.MEDIA.
// Крупное видео — presigned PUT (браузер грузит напрямую, минуя лимит тела Worker).

import { AwsClient } from "aws4fetch";

export function genName(originalName: string, fallbackExt = "") {
  const dot = originalName.lastIndexOf(".");
  const ext = (dot >= 0 ? originalName.slice(dot) : fallbackExt).toLowerCase();
  const rand = crypto.randomUUID().slice(0, 8);
  return `${Date.now()}-${rand}${ext}`;
}

export function publicUrl(env: any, key: string) {
  const base = String(env.R2_PUBLIC_BASE || "").replace(/\/$/, "");
  return `${base}/${key}`;
}

// key объекта из его публичного URL (для удаления)
export function keyFromUrl(env: any, url: string) {
  const base = String(env.R2_PUBLIC_BASE || "").replace(/\/$/, "");
  return url.startsWith(base) ? url.slice(base.length + 1) : url.replace(/^\//, "");
}

export async function r2Put(env: any, key: string, data: ArrayBuffer | ReadableStream, contentType: string) {
  await env.MEDIA.put(key, data, { httpMetadata: { contentType } });
  return publicUrl(env, key);
}

export async function r2Delete(env: any, key: string) {
  await env.MEDIA.delete(key);
}

// Presigned PUT-URL для прямой загрузки из браузера (S3-совместимый эндпоинт R2).
export async function presignPut(env: any, key: string, contentType: string, expiresSec = 3600) {
  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });
  // Кодируем сегменты, но сохраняем "/" (иначе ключ с папкой сломается)
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const endpoint =
    `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET}/${encodedKey}`;
  const url = new URL(endpoint);
  url.searchParams.set("X-Amz-Expires", String(expiresSec));
  const signed = await client.sign(
    new Request(url.toString(), { method: "PUT", headers: { "content-type": contentType } }),
    { aws: { signQuery: true } }
  );
  return signed.url;
}

export function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
