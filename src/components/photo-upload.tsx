"use client";

import { CheckCircle, ImagePlus, Loader2, Star, Trash2, Upload, X } from "lucide-react";
import Image from "next/image";
import type { ChangeEvent, RefObject } from "react";
import { useRef, useState } from "react";

interface UploadedPhoto {
  url: string;
  key: string;
  name: string;
}

interface PhotoSlotProps {
  label: string;
  inputName: string;
}

type UploadResponse = {
  url?: string;
  key?: string;
  error?: string;
};

export function PhotoUploadSlot({ label, inputName }: PhotoSlotProps) {
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = await parseUploadResponse(response);

      if (!response.ok || !data.url) {
        setError(data.error ?? "Upload failed. Try again.");
        return;
      }

      setPhoto({ url: data.url, key: data.key ?? data.url, name: file.name });
    } catch {
      setError("Network error. Check connection and try again.");
    } finally {
      setUploading(false);
      resetInput(inputRef);
    }
  }

  function clearPhoto() {
    setPhoto(null);
    setError(null);
    resetInput(inputRef);
  }

  return (
    <div className="relative">
      <input type="hidden" name={inputName} value={photo?.url ?? ""} readOnly />

      {photo ? (
        <div className="group relative aspect-square overflow-hidden rounded-md border border-[var(--line)]">
          <Image src={photo.url} alt={label} fill className="object-cover" />
          <div className="absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex">
            <button
              type="button"
              onClick={clearPhoto}
              className="focus-ring rounded-full bg-white p-1 text-[var(--ink)]"
              aria-label="Remove photo"
            >
              <X size={16} />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1 bg-black/50 px-2 py-1 text-[10px] text-white">
            <CheckCircle size={10} /> {label}
          </div>
        </div>
      ) : (
        <label className="grid aspect-square cursor-pointer place-items-center rounded-md border border-dashed border-[var(--line-2)] bg-[var(--background)] text-center text-sm text-[var(--ink-muted)] transition-colors hover:border-[var(--ink)] hover:bg-white">
          <div>
            {uploading ? (
              <Loader2 className="mx-auto mb-2 animate-spin" size={22} />
            ) : (
              <Upload className="mx-auto mb-2" size={22} />
            )}
            <div className="text-xs font-semibold">{uploading ? "Uploading..." : label}</div>
            {error ? <div className="mt-1 text-[10px] text-red-600">{error}</div> : null}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}

interface MultiUploadProps {
  label: string;
  maxPhotos?: number;
}

export function MultiPhotoUpload({ label, maxPhotos = 8 }: MultiUploadProps) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const coverPhoto = photos[0];

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files);
    const openSlots = maxPhotos - photos.length;
    if (openSlots <= 0) {
      setError(`Maximum ${maxPhotos} photos allowed.`);
      resetInput(inputRef);
      return;
    }

    setError(null);
    setUploading(true);

    const toUpload = selectedFiles.slice(0, openSlots);
    const results: UploadedPhoto[] = [];
    const failures: string[] = [];

    try {
      for (const file of toUpload) {
        try {
          const form = new FormData();
          form.append("file", file);

          const response = await fetch("/api/upload", { method: "POST", body: form });
          const data = await parseUploadResponse(response);

          if (response.ok && data.url) {
            results.push({ url: data.url, key: data.key ?? `${data.url}-${results.length}`, name: file.name });
          } else {
            failures.push(`${file.name}: ${data.error ?? "Upload failed"}`);
          }
        } catch {
          failures.push(`${file.name}: network error`);
        }
      }

      if (selectedFiles.length > toUpload.length) {
        const skipped = selectedFiles.length - toUpload.length;
        failures.push(`${skipped} photo${skipped === 1 ? "" : "s"} skipped. Maximum ${maxPhotos} photos allowed.`);
      }

      setPhotos((prev) => [...prev, ...results]);
      setError(failures.length ? failures.join(" ") : null);
    } finally {
      setUploading(false);
      resetInput(inputRef);
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, photoIndex) => photoIndex !== index));
  }

  function clearPhotos() {
    setPhotos([]);
    setError(null);
    resetInput(inputRef);
  }

  return (
    <div className="grid gap-3">
      <div className="sr-only" aria-hidden="true">
        {photos.map((photo, index) => (
          <input key={`${photo.url}-${index}`} type="hidden" name="mediaUrls" value={photo.url} readOnly />
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(240px,0.75fr)]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--background)]">
          {coverPhoto ? (
            <>
              <Image src={coverPhoto.url} alt="Cover photo" fill className="object-cover" sizes="(min-width: 1024px) 55vw, 100vw" />
              <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-xs font-bold text-white">
                <Star size={13} /> Cover
              </div>
              <button
                type="button"
                onClick={() => removePhoto(0)}
                className="focus-ring absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/90 text-[var(--ink)] shadow-sm"
                aria-label="Remove cover photo"
              >
                <Trash2 size={15} />
              </button>
            </>
          ) : (
            <UploadTile inputRef={inputRef} uploading={uploading} label={label} large onFiles={handleFiles} />
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 lg:grid-cols-2">
          {photos.map((photo, index) => (
            <div key={`${photo.key || photo.url}-${index}`} className="group relative aspect-square overflow-hidden rounded-md border border-[var(--line)] bg-[var(--background)]">
              <Image src={photo.url} alt={`Listing photo ${index + 1}`} fill className="object-cover" sizes="120px" />
              {index === 0 ? (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">Cover</span>
              ) : null}
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="focus-ring absolute right-1.5 top-1.5 hidden size-7 place-items-center rounded-full bg-black/65 text-white group-focus-within:grid group-hover:grid"
                aria-label={`Remove photo ${index + 1}`}
              >
                <X size={13} />
              </button>
            </div>
          ))}

          {coverPhoto && photos.length < maxPhotos ? (
            <UploadTile inputRef={inputRef} uploading={uploading} label={label} onFiles={handleFiles} />
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ink-muted)]">
        <span className="mono">{photos.length}/{maxPhotos} photos</span>
        {photos.length > 0 ? (
          <button
            type="button"
            onClick={clearPhotos}
            className="focus-ring rounded-md border border-[var(--line)] bg-white px-2.5 py-1 font-semibold text-[var(--ink)]"
          >
            Clear all
          </button>
        ) : null}
      </div>

      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}

function UploadTile({
  inputRef,
  uploading,
  label,
  large = false,
  onFiles
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  uploading: boolean;
  label: string;
  large?: boolean;
  onFiles: (files: FileList | null) => void;
}) {
  return (
    <label
      className={
        large
          ? "grid h-full cursor-pointer place-items-center p-6 text-center text-sm text-[var(--ink-muted)] transition-colors hover:bg-white focus-within:outline focus-within:outline-2 focus-within:outline-[var(--ink)]"
          : "grid aspect-square cursor-pointer place-items-center rounded-md border border-dashed border-[var(--line-2)] bg-[var(--background)] text-center text-xs text-[var(--ink-muted)] transition-colors hover:border-[var(--ink)] hover:bg-white focus-within:outline focus-within:outline-2 focus-within:outline-[var(--ink)]"
      }
    >
      <div>
        {uploading ? (
          <Loader2 className="mx-auto mb-2 animate-spin" size={large ? 30 : 20} />
        ) : (
          <ImagePlus className="mx-auto mb-2" size={large ? 30 : 20} />
        )}
        <div className="font-bold text-[var(--ink)]">{uploading ? "Uploading..." : label}</div>
        {large ? <div className="mt-1 text-xs">JPEG, PNG, or WebP</div> : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => onFiles(event.target.files)}
        disabled={uploading}
      />
    </label>
  );
}

async function parseUploadResponse(response: Response): Promise<UploadResponse> {
  try {
    return await response.json() as UploadResponse;
  } catch {
    return {};
  }
}

function resetInput(inputRef: RefObject<HTMLInputElement | null>) {
  if (inputRef.current) inputRef.current.value = "";
}
