"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackBar } from "@/components/BackBar";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { uploadPhoto } from "@/lib/photoUpload";

const MAX_PHOTOS = 3;

type LocalPhoto = {
  file: File;
  preview: string;
};

export default function NewStoryPage() {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup object URLs.
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const incoming = Array.from(files).slice(0, MAX_PHOTOS - photos.length);
    const next = incoming.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...next]);
    e.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!raw.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // 1. Insert story (bez generated_text — pridáme po Claude).
      const { data: story, error: insertError } = await supabase
        .from("stories")
        .insert({
          creator_id: user.id,
          original_comment: raw.trim(),
          status: "draft",
        })
        .select("id")
        .single();

      if (insertError || !story) {
        throw new Error(insertError?.message ?? "Nepodarilo sa vytvoriť storku");
      }

      // 2. Upload fotky + insert do story_photos.
      for (let i = 0; i < photos.length; i++) {
        const { storage_path } = await uploadPhoto(
          photos[i].file,
          user.id,
          story.id,
          i,
        );
        const { error: photoError } = await supabase
          .from("story_photos")
          .insert({
            story_id: story.id,
            storage_path,
            sort_order: i,
          });
        if (photoError) {
          throw new Error(`Foto ${i + 1}: ${photoError.message}`);
        }
      }

      router.push(`/draft/${story.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Niečo sa pokazilo, skús znova.";
      setError(message);
      setSubmitting(false);
    }
  }

  const remainingSlots = MAX_PHOTOS - photos.length;

  return (
    <div className="flex flex-col">
      <BackBar href="/" title="Nová storka" />

      <p className="label-eyebrow">Fotky (max {MAX_PHOTOS})</p>
      <div className="mb-6 grid grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <button
            key={p.preview}
            type="button"
            onClick={() => removePhoto(i)}
            className="group relative aspect-square overflow-hidden rounded-xl"
            aria-label={`Odstrániť foto ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.preview}
              alt=""
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white opacity-0 transition group-hover:opacity-100">
              Odstrániť
            </span>
          </button>
        ))}
        {remainingSlots > 0 && (
          <label className="flex aspect-square cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-2xl text-gray-400 transition hover:border-ink hover:text-ink">
            +
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={handleFiles}
              disabled={submitting}
            />
          </label>
        )}
      </div>

      <p className="label-eyebrow mb-1">Tvoj komentár</p>
      <p className="mb-2 text-xs italic text-gray-500">
        Píš ako kamarátke do Slacku – agent to potom spracuje
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={6}
          className="input-base h-32 resize-none"
          placeholder="Napíš pár viet, čo sa práve stalo…"
          disabled={submitting}
        />
        {error && (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || !raw.trim()}
          className="btn-primary mt-6"
        >
          {submitting ? "Ukladám…" : "Pokračovať"}
        </button>
      </form>
    </div>
  );
}
