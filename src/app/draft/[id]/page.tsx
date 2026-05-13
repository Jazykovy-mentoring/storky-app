"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackBar } from "@/components/BackBar";
import {
  createBrowserSupabaseClient,
  publicPhotoUrl,
  type Story,
  type StoryPhoto,
} from "@/lib/supabase";
import { fixTypography } from "@/lib/typography";

type DraftStory = Story & { story_photos: StoryPhoto[] };

export default function DraftPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [story, setStory] = useState<DraftStory | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSavedRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createBrowserSupabaseClient();
      const { data, error: fetchError } = await supabase
        .from("stories")
        .select(
          "id, creator_id, status, original_comment, generated_text, created_at, approved_at, published_at, published_by, story_photos(id, story_id, storage_path, sort_order, created_at)",
        )
        .eq("id", id)
        .single();

      if (cancelled) return;
      if (fetchError || !data) {
        setError("Storka sa nenašla.");
        setLoading(false);
        return;
      }
      const next = data as DraftStory;
      setStory(next);
      setText(next.generated_text ?? "");
      lastSavedRef.current = next.generated_text ?? "";
      setLoading(false);

      // Auto-trigger generate, ak draft je prázdny.
      if (!next.generated_text) {
        await runGenerate(next, false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const runGenerate = useCallback(
    async (current: DraftStory, regenerate: boolean) => {
      setGenerating(true);
      setError(null);
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storyId: current.id,
            regenerate,
            previousDraft: regenerate ? text : undefined,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Chyba: ${res.status}`);
        }
        const data: { text: string } = await res.json();
        const cleaned = fixTypography(data.text);
        setText(cleaned);
        lastSavedRef.current = cleaned;

        const supabase = createBrowserSupabaseClient();
        await supabase
          .from("stories")
          .update({ generated_text: cleaned })
          .eq("id", current.id);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Generovanie zlyhalo";
        setError(message);
      } finally {
        setGenerating(false);
      }
    },
    [text],
  );

  async function handleRetry() {
    if (!story) return;
    await runGenerate(story, true);
  }

  async function handleBlurAutoSave() {
    if (!story) return;
    if (text === lastSavedRef.current) return;
    const supabase = createBrowserSupabaseClient();
    const { error: saveError } = await supabase
      .from("stories")
      .update({ generated_text: text })
      .eq("id", story.id);
    if (!saveError) {
      lastSavedRef.current = text;
    }
  }

  async function handleApprove() {
    if (!story) return;
    setApproving(true);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const { error: updateError } = await supabase
      .from("stories")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        generated_text: text,
      })
      .eq("id", story.id);

    if (updateError) {
      setError(updateError.message);
      setApproving(false);
      return;
    }
    router.push(`/done/${story.id}`);
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <BackBar href="/" title="Tvoj draft" />
        <p className="text-sm text-gray-500">Načítavam draft…</p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex flex-col">
        <BackBar href="/" title="Tvoj draft" />
        <p className="text-sm text-red-600">{error ?? "Storka sa nenašla."}</p>
      </div>
    );
  }

  const photos = (story.story_photos ?? []).sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return (
    <div className="flex flex-col">
      <BackBar href="/" title="Tvoj draft" />

      {photos.length > 0 && (
        <div className="mb-4 flex gap-2">
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.id}
              src={publicPhotoUrl(p.storage_path)}
              alt=""
              className="h-16 w-16 flex-shrink-0 rounded-xl object-cover"
            />
          ))}
        </div>
      )}

      <p className="label-eyebrow">Návrh storky</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlurAutoSave}
        rows={8}
        disabled={generating}
        className="h-44 w-full resize-none rounded-xl border border-amber-200 bg-amber-50/30 p-3 text-sm focus:border-ink focus:outline-none disabled:opacity-60"
        placeholder={generating ? "Agent píše…" : "Tu sa objaví návrh."}
      />

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="text-xs text-gray-500 underline-offset-2 hover:underline"
        >
          {showRaw ? "Skryť pôvodný komentár" : "Pôvodný komentár"}
        </button>
        {showRaw && (
          <p className="mt-2 border-l-2 border-gray-200 pl-3 text-xs italic text-gray-500">
            {story.original_comment}
          </p>
        )}
      </div>

      {error && (
        <p
          className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          className="btn-secondary flex-1"
          onClick={handleRetry}
          disabled={generating || approving}
        >
          {generating ? "Skúšam…" : "Skús inak"}
        </button>
        <button
          type="button"
          className="btn-primary flex-1"
          onClick={handleApprove}
          disabled={generating || approving || !text.trim()}
        >
          {approving ? "Ukladám…" : "Schváliť"}
        </button>
      </div>
    </div>
  );
}
