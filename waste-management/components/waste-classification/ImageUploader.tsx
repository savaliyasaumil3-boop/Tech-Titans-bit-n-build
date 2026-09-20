"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  onFileSelected: (file: File, previewUrl: string) => void;
  onClear: () => void;
  previewUrl: string | null;
  disabled?: boolean;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 10;

export function ImageUploader({
  onFileSelected,
  onClear,
  previewUrl,
  disabled = false,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndAccept = useCallback(
    (file: File) => {
      setError(null);
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("Please upload a valid image (JPG, PNG, or WEBP).");
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Image is too large. Maximum size is ${MAX_SIZE_MB} MB.`);
        return;
      }
      const url = URL.createObjectURL(file);
      onFileSelected(file, url);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) validateAndAccept(file);
    },
    [validateAndAccept]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndAccept(file);
      // reset input so re-uploading same file triggers onChange
      e.target.value = "";
    },
    [validateAndAccept]
  );

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
        id="waste-image-input"
      />

      {previewUrl ? (
        /* ── Image Preview ── */
        <div className="relative group rounded-xl overflow-hidden border border-border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Selected waste image"
            className="w-full max-h-64 object-contain"
          />
          {!disabled && (
            <button
              onClick={() => {
                onClear();
                setError(null);
              }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-colors opacity-0 group-hover:opacity-100"
              title="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        /* ── Drop Zone ── */
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5 scale-[0.99]"
              : "border-border hover:border-primary/50 hover:bg-muted/30",
            disabled && "opacity-50 cursor-not-allowed pointer-events-none"
          )}
        >
          <div className={cn(
            "p-4 rounded-full transition-colors",
            isDragging ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <ImageIcon className="h-8 w-8" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Drag &amp; drop your image here
            </p>
            <p className="text-xs text-muted-foreground">
              or click to browse files
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
            <span className="px-2 py-0.5 rounded bg-muted border border-border">JPG</span>
            <span className="px-2 py-0.5 rounded bg-muted border border-border">PNG</span>
            <span className="px-2 py-0.5 rounded bg-muted border border-border">WEBP</span>
            <span>· max {MAX_SIZE_MB} MB</span>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {!previewUrl && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          <Upload className="h-3.5 w-3.5 mr-2" />
          Choose Image
        </Button>
      )}
    </div>
  );
}
