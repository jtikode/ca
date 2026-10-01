"use client";

import { useState } from "react";

/** Shares the certificate's actual image file via the Web Share API when
 * available (so it can go straight into WhatsApp/Mail/Drive as a photo),
 * falling back to copying the direct link when the browser doesn't support
 * sharing files (e.g. most desktop browsers). */
export function ShareCertificateButton({
  fileUrl,
  fileName,
  certificateName,
}: {
  fileUrl: string;
  fileName: string;
  certificateName: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function handleShare() {
    setStatus("idle");
    try {
      const absoluteUrl = new URL(fileUrl, window.location.origin).toString();
      const response = await fetch(absoluteUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: certificateName });
        return;
      }
      if (navigator.share) {
        await navigator.share({ url: absoluteUrl, title: certificateName });
        return;
      }

      await navigator.clipboard.writeText(absoluteUrl);
      setStatus("copied");
    } catch (err) {
      // AbortError just means the user cancelled the native share sheet.
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Failed to share certificate", err);
      setStatus("error");
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button type="button" onClick={handleShare} className="text-sm font-semibold text-amber-400 hover:underline">
        Share
      </button>
      {status === "copied" && <span className="text-xs text-emerald-400">Link copied</span>}
      {status === "error" && <span className="text-xs text-red-400">Couldn&apos;t share</span>}
    </div>
  );
}
