import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth-server";
import { formatStatusLabel, storyTitle, thumbColor } from "@/lib/storyStatus";
import type { Story, StoryPhoto } from "@/lib/supabase";
import { publicPhotoUrl } from "@/lib/supabase";

type StoryRow = Story & { story_photos: StoryPhoto[] };

export const dynamic = "force-dynamic";

export default async function HomePage() {
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
    .eq("creator_id", user.id as string)
    .order("created_at", { ascending: false })
    .limit(10);

  const stories = (data ?? []) as StoryRow[];

  return (
    <div className="flex flex-col">
      <header className="pb-6 pt-2">
        <h1 className="text-2xl font-bold text-ink">Ahoj, {user.displayName}</h1>
        <p className="mt-1 text-sm text-gray-500">Čo dnes ideme zdieľať?</p>
      </header>

      <Link href="/new" className="btn-primary mb-8">
        + Nová storka
      </Link>

      <p className="label-eyebrow">Posledné</p>

      {error && (
        <p className="rounded-2xl bg-red-50 p-3 text-xs text-red-600">
          Nepodarilo sa načítať storky. Skús refresh.
        </p>
      )}

      {!error && stories.length === 0 && (
        <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
          Zatiaľ žiadne storky. Začni prvou cez tlačidlo vyššie.
        </p>
      )}

      <ul className="space-y-3">
        {stories.map((s) => {
          const href =
            s.status === "draft" ? `/draft/${s.id}` : `/done/${s.id}`;
          const statusColor =
            s.status === "draft"
              ? "text-amber-600"
              : s.status === "approved"
                ? "text-blue-600"
                : "text-gray-500";
          const firstPhoto = (s.story_photos ?? [])
            .sort((a, b) => a.sort_order - b.sort_order)[0];
          return (
            <li key={s.id}>
              <Link href={href} className="card-row transition hover:bg-gray-100">
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
                  <p className={`mt-0.5 text-xs ${statusColor}`}>
                    {formatStatusLabel(s.status, "lydka")}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
