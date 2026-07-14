import { randomUUID } from "node:crypto";
import { createWriteStream, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export type StorageProvider = "local" | "s3";

export interface UploadedFile {
  key: string;
  publicUrl: string;
  provider: StorageProvider;
  sizeBytes: number;
  contentType: string;
}

function activeProvider(): StorageProvider {
  const hasS3 =
    Boolean(process.env.STORAGE_ENDPOINT) &&
    Boolean(process.env.STORAGE_ACCESS_KEY_ID) &&
    Boolean(process.env.STORAGE_SECRET_ACCESS_KEY) &&
    Boolean(process.env.STORAGE_BUCKET);
  return hasS3 ? "s3" : "local";
}

// ── Local implementation ──────────────────────────────────────────────────────

const UPLOADS_DIR = join(process.cwd(), "public", "uploads", "listings");

function ensureUploadsDir() {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function localKeyToPublicUrl(key: string): string {
  return `/api/uploads/${encodeURIComponent(key)}`;
}

export function localUploadPath(key: string): string | null {
  if (!isSafeLocalUploadKey(key)) return null;
  return join(UPLOADS_DIR, key);
}

export function normalizeStoredMediaUrl(url: string): string {
  const legacyPrefix = "/uploads/listings/";
  if (!url.startsWith(legacyPrefix)) return url;

  const key = url.slice(legacyPrefix.length);
  return isSafeLocalUploadKey(key) ? localKeyToPublicUrl(key) : url;
}

function isSafeLocalUploadKey(key: string) {
  return basename(key) === key && /^listing-[0-9a-f-]+\.(?:jpe?g|png|webp)$/i.test(key);
}

async function saveLocally(
  stream: ReadableStream<Uint8Array>,
  key: string
): Promise<number> {
  ensureUploadsDir();
  const filePath = localUploadPath(key);
  if (!filePath) throw new Error("Invalid local upload key.");
  let bytes = 0;
  const nodeReadable = Readable.fromWeb(stream as import("stream/web").ReadableStream);
  const writer = createWriteStream(filePath);
  nodeReadable.on("data", (chunk: Buffer) => { bytes += chunk.length; });
  await pipeline(nodeReadable, writer);
  return bytes;
}

// ── S3 implementation (ready to activate with env vars) ──────────────────────
// When STORAGE_ENDPOINT, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY,
// and STORAGE_BUCKET are set this path is used. No other code changes needed.

async function saveToS3(
  stream: ReadableStream<Uint8Array>,
  key: string,
  contentType: string,
  sizeBytes: number
): Promise<string> {
  const endpoint = process.env.STORAGE_ENDPOINT!;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY!;
  const bucket = process.env.STORAGE_BUCKET!;
  const region = process.env.STORAGE_REGION ?? "auto";

  // Build a pre-signed PutObject URL using the AWS Signature V4 algorithm.
  // We use the native crypto/fetch approach so there's no extra dependency;
  // swap this for @aws-sdk/client-s3 if you prefer the official SDK.
  const requestUrl = buildObjectStorageUrl(endpoint, bucket, key);

  const date = new Date();
  const dateStr = date.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 8);
  const datetime = date.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";

  const credentialScope = `${dateStr}/${region}/s3/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;

  const headers: Record<string, string> = {
    host: requestUrl.host,
    "x-amz-date": datetime,
    "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    "content-type": contentType,
    "content-length": String(sizeBytes)
  };

  const sortedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaderNames.map((k) => `${k}:${headers[k]}`).join("\n") + "\n";
  const signedHeaders = sortedHeaderNames.join(";");

  const canonicalRequest = [
    "PUT",
    requestUrl.pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD"
  ].join("\n");

  const { createHash, createHmac } = await import("node:crypto");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    datetime,
    credentialScope,
    createHash("sha256").update(canonicalRequest).digest("hex")
  ].join("\n");

  function hmac(key: Buffer | string, data: string) {
    return createHmac("sha256", key).update(data).digest();
  }

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStr), region), "s3"),
    "aws4_request"
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  const authHeader = `AWS4-HMAC-SHA256 Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const body = await new Response(stream).arrayBuffer();
  const uploadResp = await fetch(requestUrl, {
    method: "PUT",
    headers: { ...headers, authorization: authHeader },
    body
  });

  if (!uploadResp.ok) {
    throw new Error(`S3 upload failed: ${uploadResp.status} ${await uploadResp.text()}`);
  }

  return getPublicUrl(key);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateStorageKey(originalName: string, prefix = "listing"): string {
  const ext = originalName.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  return `${prefix}-${randomUUID()}.${safeExt}`;
}

export async function uploadFile(
  stream: ReadableStream<Uint8Array>,
  key: string,
  contentType: string,
  sizeBytes: number
): Promise<UploadedFile> {
  const provider = activeProvider();

  if (provider === "s3") {
    const publicUrl = await saveToS3(stream, key, contentType, sizeBytes);
    return { key, publicUrl, provider: "s3", sizeBytes, contentType };
  }

  const saved = await saveLocally(stream, key);
  return {
    key,
    publicUrl: localKeyToPublicUrl(key),
    provider: "local",
    sizeBytes: saved,
    contentType
  };
}

export function getPublicUrl(key: string): string {
  const provider = activeProvider();
  if (provider === "s3") {
    const publicBase = process.env.STORAGE_PUBLIC_URL ?? `${process.env.STORAGE_ENDPOINT}/${process.env.STORAGE_BUCKET}`;
    return `${publicBase.replace(/\/$/, "")}/${key}`;
  }
  return localKeyToPublicUrl(key);
}

function buildObjectStorageUrl(endpoint: string, bucket: string, key: string) {
  const url = new URL(endpoint);
  const endpointPath = url.pathname.replace(/\/$/, "");
  const usesVirtualHostedStyle = url.hostname === bucket || url.hostname.startsWith(`${bucket}.`);
  url.pathname = usesVirtualHostedStyle
    ? `${endpointPath}/${key}`
    : `${endpointPath}/${bucket}/${key}`;
  url.search = "";
  return url;
}
