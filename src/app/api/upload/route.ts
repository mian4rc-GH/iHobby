import { NextResponse } from "next/server";
import { getCurrentActor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { rateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import { generateStorageKey, uploadFile } from "@/lib/storage";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!can(actor.role, "listing:create") && !can(actor.role, "listing:update:own")) {
    return NextResponse.json({ error: "Upload access requires seller permissions." }, { status: 403 });
  }

  const limited = rateLimit(`upload:${actor.id}`, 30, 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Upload rate limit exceeded. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds(limited)) } }
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data upload." }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not parse upload form." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file field found in form." }, { status: 400 });
  }

  const fileType = file.type as (typeof ALLOWED_TYPES)[number];
  if (!ALLOWED_TYPES.includes(fileType)) {
    return NextResponse.json(
      { error: `File type ${file.type} not allowed. Use JPEG, PNG, or WebP.` },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_BYTES / 1024 / 1024} MB.` },
      { status: 413 }
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasExpectedImageSignature(fileType, bytes)) {
    return NextResponse.json(
      { error: "File contents do not match the declared image type." },
      { status: 400 }
    );
  }

  try {
    const key = generateStorageKey(file.name);
    const result = await uploadFile(file.stream(), key, file.type, file.size);
    return NextResponse.json({
      key: result.key,
      url: result.publicUrl,
      provider: result.provider,
      sizeBytes: result.sizeBytes
    });
  } catch (err) {
    console.error("[upload] Failed to save file:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}

function hasExpectedImageSignature(contentType: (typeof ALLOWED_TYPES)[number], bytes: Uint8Array) {
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (contentType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return signature.every((value, index) => bytes[index] === value);
  }

  return bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}
