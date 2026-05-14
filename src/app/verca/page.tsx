import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  publicPhotoUrl,
  type Story,
  type StoryPhoto,
} from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth-server";
import { formatStatusLabel, storyTitle, thumbColor } from "@/lib/storyStatus";

type StoryRow = Story & { story_photos: StoryPhoto[] };

export const dynamic = "force-dynamic";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("sk-SK", {
      day: "numeric",
      month: "long",
    });
  } catch {
    return "";
  }
}

export default async function VercaHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "verca") redirect("/");

  const supabase = createServerSupabaseClient();
  const { data: readyData } = await supabase
    .from("stories")
    .select(
      "id, creator_id, status, original_comment, generated_text, created_at, approved_at, published_at, published_by, story_photos(id, story_id, storage_path, sort_order, created_at)",
    )
    .eq("status", "approved")
    .order("approved_at", { ascending: false });

  const { data: publishedData } = await supabase
    .from("stories")
    .select(
      "id, creator_id, status, original_comment, generated_text, created_at, approved_at, published_at, published_by, story_photos(id, story_id, storage_path, sort_order, created_at)",
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(20);

  const ready = (readyData ?? []) as StoryRow[];
  const published = (publishedData ?? []) as StoryRow[];

  return (
    <div className="flex flex-col">
      <header className="pb-6 pt-2">
        <h1 className="text-2xl font-bold text-ink">Ahoj, {user.displayName}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {ready.length > 0
            ? `Lydka pre teba pripravila ${ready.length} ${
                ready.length === 1 ? "storku" : "storky"
              }.`
            : "Zatiaľ nič nové od Lydky."}
        </p>
      </header>

      <p className="label-eyebrow">Pripravené na publish</p>
      {ready.length === 0 ? (
        <p className="mb-8 rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
          Keď Lydka schváli novú storku, objaví sa tu.
        </p>
      ) : (
        <ul className="mb-8 space-y-3">
          {ready.map((s) => {
            const firstPhoto = (s.story_photos ?? []).sort(
              (a, b) => a.sort_order - b.sort_order,
            )[0];
            return (
              <li key={s.id}>
                <Link
                  href={`/verca/${s.id}`}
                  className="card-row transition hover:bg-gray-100"
                >
                  {firstPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={publicPhotoUrl(firstPhoto.storage_path)}
                      alt=""
                      className="h-12 w-12 flex-shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div
                      className={`h-12 w-12 flex-shrink-0 rounded-xl ${thumbColor(s.id)}`}
                      aria-hidden
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {storyTitle(s)}
                    </p>
                    <p className="mt-0.5 text-xs text-blue-600">
                      Od Lydky · {formatDate(s.approved_at)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="label-eyebrow">História</p>
      {published.length === 0 ? (
        <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
          Tu uvidíš všetko, čo si už publishla.
        </p>
      ) : (
        <ul className="space-y-3">
          {published.map((s) => {
            const firstPhoto = (s.story_photos ?? []).sort(
              (a, b) => a.sort_order - b.sort_order,
            )[0];
            return (
              <li key={s.id}>
                <Link
                  href={`/verca/${s.id}`}
                  className="card-row transition hover:bg-gray-100"
                >
                  {firstPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={publicPhotoUrl(firstPhoto.storage_path)}
                      alt=""
                      className="h-12 w-12 flex-shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div
                      className={`h-12 w-12 flex-shrink-0 rounded-xl ${thumbColor(s.id)}`}
                      aria-hidden
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {storyTitle(s)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatStatusLabel(s.status, "verca")}
                      {s.published_at ? ` · ${formatDate(s.published_at)}` : ""}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
