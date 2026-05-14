"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackBar } from "@/components/BackBar";
import { CopyButton } from "@/components/CopyButton";
import {
  createBrowserSupabaseClient,
  publicPhotoUrl,
  type Story,
  type StoryPhoto,
} from "@/lib/supabase";

type DetailStory = Story & { story_photos: StoryPhoto[] };

export default function VercaStoryDetailPage() {
  const params = useParams<{ storyId: string }>();
  const router = useRouter();
  const [story, setStory] = useState<DetailStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadState, setDownloadState] = useState<
    "idle" | "downloading" | "done" | "noPhotos" | "error"
  >("idle");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createBrowserSupabaseClient();
      const { data, error: fetchError } = await supabase
        .from("stories")
        .select(
          "id, creator_id, status, original_comment, generated_text, created_at, approved_at, published_at, published_by, story_photos(id, story_id, storage_path, sort_order, created_at)",
        )
        .eq("id", params.storyId)
        .single();
      if (cancelled) return;
      if (fetchError || !data) {
        setError("Storka sa nenašla.");
      } else {
        setStory(data as DetailStory);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.storyId]);

  async function handleDownloadPhotos() {
    if (!story) return;
    const photos = (story.story_photos ?? []).sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    if (photos.length === 0) {
      setDownloadState("noPhotos");
      setTimeout(() => setDownloadState("idle"), 1800);
      return;
    }

    setDownloadState("downloading");
    try {
      const files = await Promise.all(
        photos.map(async (p, i) => {
          const url = publicPhotoUrl(p.storage_path);
          const res = await fetch(url);
          const blob = await res.blob();
          return new File([blob], `storka-${story.id}-${i + 1}.jpg`, {
            type: blob.type || "image/jpeg",
          });
        }),
      );

      type ShareableNavigator = Navigator & {
        canShare?: (data: { files?: File[] }) => boolean;
        share?: (data: { files?: File[]; title?: string }) => Promise<void>;
      };
      const nav = navigator as ShareableNavigator;
      if (nav.canShare?.({ files }) && nav.share) {
        await nav.share({ files, title: "Storka" });
      } else {
        files.forEach((f) => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(f);
          a.download = f.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        });
      }
      setDownloadState("done");
      setTimeout(() => setDownloadState("idle"), 2000);
    } catch {
      setDownloadState("error");
      setTimeout(() => setDownloadState("idle"), 2000);
    }
  }

  async function handleMarkPublished() {
    if (!story) return;
    setMarking(true);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: updateError } = await supabase
      .from("stories")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        published_by: user?.id,
      })
      .eq("id", story.id);

    if (updateError) {
      setError(updateError.message);
      setMarking(false);
      return;
    }
    router.push("/verca");
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <BackBar href="/verca" title="Storka" />
        <p className="text-sm text-gray-500">Načítavam…</p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex flex-col">
        <BackBar href="/verca" title="Storka" />
        <p className="text-sm text-red-600">{error ?? "Storka sa nenašla."}</p>
      </div>
    );
  }

  const photos = (story.story_photos ?? []).sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  const headerLabel =
    story.status === "published" ? "Publishnutá storka" : "Pripravené na publish";

  return (
    <div className="flex flex-col">
      <BackBar href="/verca" title={headerLabel} />

      <p className="label-eyebrow">Fotky</p>
      {photos.length === 0 ? (
        <p className="mb-6 rounded-2xl bg-gray-50 p-4 text-xs text-gray-500">
          Lydka nepridala fotky k tejto storke.
        </p>
      ) : (
        <div className="mb-6 grid grid-cols-3 gap-2">
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.id}
              src={publicPhotoUrl(p.storage_path)}
              alt=""
              className="aspect-square w-full rounded-xl object-cover"
            />
          ))}
        </div>
      )}

      <div className="mb-6 rounded-2xl bg-gray-50 p-4">
        <p className="label-eyebrow">Finálny text od Lydky</p>
        <p className="whitespace-pre-line text-sm leading-relaxed text-ink">
          {story.generated_text}
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <CopyButton
          text={story.generated_text ?? ""}
          label="Skopírovať text"
          doneLabel="Text skopírovaný"
        />
        <button
          type="button"
          onClick={handleDownloadPhotos}
          className="btn-secondary"
          disabled={downloadState === "downloading"}
        >
          {downloadState === "downloading" && "Sťahujem…"}
          {downloadState === "done" && "Stiahnuté"}
          {downloadState === "noPhotos" && "Žiadne fotky"}
          {downloadState === "error" && "Skús znova"}
          {downloadState === "idle" && "Stiahnuť fotky"}
        </button>
        {story.status === "approved" && (
          <button
            type="button"
            onClick={handleMarkPublished}
            className="btn-primary mt-4"
            disabled={marking}
          >
            {marking ? "Ukladám…" : "Označiť za publishnuté"}
          </button>
        )}
        <Link href="/verca" className="btn-ghost mt-2">
          {"← Späť na zoznam"}
        </Link>
      </div>
    </div>
  );
}
