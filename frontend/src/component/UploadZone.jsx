import { useRef, useState } from "react";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 10;

export function UploadZone({ onFile, loading }) {
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState(null);
  const inputRef = useRef(null);

  function validateAndHandle(file) {
    setFileError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError(`Unsupported file type "${file.type}". Please upload a JPEG, PNG, or WebP image.`);
      return;
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      setFileError(`File is too large (${sizeMB.toFixed(1)} MB). Maximum allowed size is ${MAX_SIZE_MB} MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onFile(file, reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);

          const file = e.dataTransfer.files?.[0];
          if (file && !loading) validateAndHandle(file);
        }}
        onClick={() => !loading && inputRef.current?.click()}
        className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
          loading
            ? "cursor-not-allowed border-[oklch(0.7_0.22_270)]/40 bg-[oklch(0.7_0.22_270)]/5"
            : dragging
            ? "border-[oklch(0.7_0.22_270)] bg-[oklch(0.7_0.22_270)]/10"
            : "border-white/15 hover:border-[oklch(0.7_0.22_270)]/60 hover:bg-white/[0.03]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={loading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) validateAndHandle(file);
            // Reset input so same file can be re-selected after an error
            e.target.value = "";
          }}
        />

        {/* Icon / Spinner */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.6_0.22_270)] to-[oklch(0.6_0.22_230)] shadow-lg shadow-[oklch(0.6_0.22_270)]/40">
          {loading ? (
            <svg
              className="h-6 w-6 animate-spin text-white"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-6 w-6 text-white"
            >
              <path
                d="M12 4v12m0-12l-4 4m4-4l4 4M4 20h16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* Text */}
        <p className="text-lg font-medium text-foreground">
          {loading ? "Uploading & generating fingerprint…" : "Drop your image here"}
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          {loading
            ? "This may take a moment while the AI model processes your image"
            : "or click to browse · PNG, JPG, WebP up to 10 MB"}
        </p>

        {/* Progress dots when loading */}
        {loading && (
          <div className="mt-4 flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-[oklch(0.7_0.22_270)] animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Client-side validation error */}
      {fileError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {fileError}
        </div>
      )}
    </div>
  );
}