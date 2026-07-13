/**
 * S3-хранилище для Express (Timeweb S3 или любое S3-совместимое) + индекс медиа в kv.
 * Активируется, только если заданы переменные окружения S3_* (иначе Express работает
 * на локальном диске, как раньше). Использует aws4fetch (глобальный fetch Node 18+).
 *
 * Индекс медиа хранится в той же таблице kv под ключом "media" — совместимо с
 * Cloudflare-версией. Элемент: { filename, url, thumb, type, category, bytes, size, modified }.
 */

const crypto = require("crypto");
const path = require("path");

function createStorage({ kvGet, kvSet }) {
  const cfg = {
    endpoint: (process.env.S3_ENDPOINT || "").replace(/\/$/, ""),
    region: process.env.S3_REGION || "ru-1",
    bucket: process.env.S3_BUCKET || "",
    accessKey: process.env.S3_ACCESS_KEY || "",
    secretKey: process.env.S3_SECRET_KEY || "",
    publicBase: (process.env.S3_PUBLIC_BASE || "").replace(/\/$/, ""),
  };
  const enabled = !!(cfg.endpoint && cfg.bucket && cfg.accessKey && cfg.secretKey);

  let _aws = null;
  async function aws() {
    if (!_aws) {
      const { AwsClient } = await import("aws4fetch"); // ESM-пакет → динамический импорт в CJS
      _aws = new AwsClient({
        accessKeyId: cfg.accessKey,
        secretAccessKey: cfg.secretKey,
        region: cfg.region,
        service: "s3",
      });
    }
    return _aws;
  }

  const encKey = (k) => k.split("/").map(encodeURIComponent).join("/");
  const objUrl = (k) => `${cfg.endpoint}/${cfg.bucket}/${encKey(k)}`;
  const publicUrl = (k) => `${cfg.publicBase || `${cfg.endpoint}/${cfg.bucket}`}/${encKey(k)}`;
  const keyFromUrl = (url) => {
    const base = cfg.publicBase || `${cfg.endpoint}/${cfg.bucket}`;
    if (!url || !url.startsWith(base)) return null;
    return decodeURIComponent(url.slice(base.length + 1));
  };

  async function put(key, body, contentType) {
    const c = await aws();
    const r = await c.fetch(objUrl(key), {
      method: "PUT",
      body,
      headers: { "content-type": contentType || "application/octet-stream", "x-amz-acl": "public-read" },
    });
    if (!r.ok) throw new Error(`S3 PUT ${r.status}: ${await r.text().catch(() => "")}`);
    return publicUrl(key);
  }

  async function del(key) {
    if (!key) return;
    const c = await aws();
    await c.fetch(objUrl(key), { method: "DELETE" });
  }

  // Presigned URL для прямой загрузки крупного видео из браузера в обход сервера.
  async function presignPut(key, contentType, expires = 3600) {
    const c = await aws();
    const url = `${objUrl(key)}?X-Amz-Expires=${expires}`;
    const signed = await c.sign(
      new Request(url, { method: "PUT", headers: contentType ? { "content-type": contentType } : {} }),
      { aws: { signQuery: true } }
    );
    return signed.url;
  }

  // --- Индекс медиа (kv "media") ---
  const readMedia = async () => {
    const v = await kvGet("media");
    return Array.isArray(v) ? v : [];
  };
  async function addMedia(item) {
    const list = await readMedia();
    list.unshift(item);
    await kvSet("media", list);
  }
  async function removeMediaByUrl(url) {
    const list = await readMedia();
    await kvSet("media", list.filter((m) => m.url !== url));
  }

  const genName = (orig, defExt) => {
    const ext = path.extname(orig || "").toLowerCase() || defExt;
    return `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
  };
  const sanitizeFolder = (f) => String(f || "").replace(/[^a-z0-9_-]/gi, "");

  return {
    enabled, cfg,
    put, del, presignPut, publicUrl, keyFromUrl,
    readMedia, addMedia, removeMediaByUrl,
    genName, sanitizeFolder,
  };
}

module.exports = { createStorage };
