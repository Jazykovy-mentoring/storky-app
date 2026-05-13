"use client";

import { useState } from "react";

type Props = {
  text: string;
  className?: string;
  label?: string;
  doneLabel?: string;
};

export function CopyButton({
  text,
  className = "btn-primary",
  label = "Skopírovať text",
  doneLabel = "Skopírované",
}: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback: vytvorí textarea, vyberie a kopíruje
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  return (
    <button type="button" onClick={handleCopy} className={className}>
      {copied ? doneLabel : label}
    </button>
  );
}
