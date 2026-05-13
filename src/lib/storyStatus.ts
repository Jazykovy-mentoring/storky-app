// Helper na formátovanie status labelov v UI.

import type { Story } from "@/lib/supabase";

export function formatStatusLabel(
  status: Story["status"],
  viewer: "lydka" | "verca",
): string {
  if (viewer === "lydka") {
    if (status === "draft") return "Draft · čaká na schválenie";
    if (status === "approved") return "Schválené · čaká na Verču";
    if (status === "published") return "Postnuté";
  }
  if (status === "approved") return "Pripravené na publish · od Lydky";
  if (status === "published") return "Publishnuté";
  return status;
}

/**
 * Krátky derived „title" zo storky — prvých ~40 znakov z generated_text alebo
 * z original_comment ak generated chýba. Používame v zoznamoch.
 */
export function storyTitle(story: {
  generated_text: string | null;
  original_comment: string;
}): string {
  const source = (story.generated_text ?? story.original_comment).trim();
  if (source.length <= 40) return source;
  return source.slice(0, 37).trimEnd() + "…";
}

const THUMB_COLORS = [
  "bg-amber-100",
  "bg-green-100",
  "bg-pink-100",
  "bg-purple-100",
  "bg-blue-100",
  "bg-rose-100",
];

/**
 * Deterministická placeholder farba pre náhľad bez fotky.
 * Vstup: story id (uuid), výstup: tailwind bg class.
 */
export function thumbColor(storyId: string): string {
  let hash = 0;
  for (let i = 0; i < storyId.length; i++) {
    hash = (hash * 31 + storyId.charCodeAt(i)) | 0;
  }
  return THUMB_COLORS[Math.abs(hash) % THUMB_COLORS.length];
}
