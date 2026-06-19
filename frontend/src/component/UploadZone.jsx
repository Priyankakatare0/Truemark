import { useRef, useState } from "react";

export function UploadZone({ onFile, loading }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  function handleFile(file) {
    const reader = new FileReader();

    reader.onload = () => {
      onFile(file, reader.result);
    };

    reader.readAsDataURL(file);
  }

  return (
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
        if (file) handleFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
        dragging
          ? "border-[oklch(0.7_0.22_270)] bg-[oklch(0.7_0.22_270)]/10"
          : "border-white/15 hover:border-[oklch(0.7_0.22_270)]/60 hover:bg-white/[0.03]"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {/* Icon */}
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.6_0.22_270)] to-[oklch(0.6_0.22_230)] shadow-lg shadow-[oklch(0.6_0.22_270)]/40">
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
      </div>

      {/* Text */}
      <p className="text-lg font-medium text-foreground">
        {loading ? "Generating fingerprint…" : "Drop your image here"}
      </p>

      <p className="mt-1 text-sm text-muted-foreground">
        or click to browse · PNG, JPG, WebP up to 20MB
      </p>
    </div>
  );
}