import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { localUploadPath } from "@/lib/storage";

const contentTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const filePath = localUploadPath(key);
  if (!filePath) return new NextResponse(null, { status: 404 });

  try {
    const bytes = await readFile(filePath);
    const extension = key.split(".").at(-1)?.toLowerCase() ?? "";
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentTypes[extension] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
