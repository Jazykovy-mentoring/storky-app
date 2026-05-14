import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BackBar } from "@/components/BackBar";
import { CopyButton } from "@/components/CopyButton";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  publicPhotoUrl,
  type Story,
  type StoryPhoto,
} from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

type DoneStory = Story & { story_photos: StoryPhoto[] };

export default async function DonePage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "lydka") {
    redirect(user?.role === "verca" ? "/verca" : "/login");
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("stories")
    .select(
      "id, creator_id, status, original_comment, generated_text, created_at, approved_at, published_at, published_by, story_photos(id, story_id, storage_path, sort_order, created_at)",
    )
    .eq("id", params.id)
    .single();

  if (error || !data) {
    notFound();
  }

  const story = data as DoneStory;
  const photos = (story.story_photos ?? []).sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return (
    <div className="flex flex-col">
      <BackBar href="/" title="Pripravené" />

      <div className="mb-6 rounded-2xl border border-green-100 bg-green-50 p-4">
        <p className="mb-1 text-sm font-medium text-green-900">
          Storka schválená
        </p>
        <p className="text-xs text-green-700">
          Storka je pripravená pre Verču na publish.
        </p>
      </div>

      {photos.length > 0 && (
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
        <p className="label-eyebrow">Finálny text</p>
        <p className="whitespace-pre-line text-sm leading-relaxed text-ink">
          {story.generated_text}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <CopyButton text={story.generated_text ?? ""} />
        <Link href="/" className="btn-ghost mt-2">
          {"← Späť na domov"}
        </Link>
      </div>
    </div>
  );
}
