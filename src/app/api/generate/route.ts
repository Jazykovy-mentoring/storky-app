// POST /api/generate
//
// Body: { storyId: string, regenerate?: boolean, previousDraft?: string }
//
// Načíta `original_comment` z DB, postaví system prompt z voice guide,
// zavolá Anthropic API a vráti vygenerovaný text. System prompt používa
// prompt caching (cache_control: ephemeral) — pri opakovaných „Skús inak"
// to znižuje cenu i latenciu.

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth";
import { buildSystemPrompt } from "@/lib/buildSystemPrompt";
import { fixTypography } from "@/lib/typography";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";
const MAX_TOKENS = 500;

type RequestBody = {
  storyId?: string;
  regenerate?: boolean;
  previousDraft?: string;
};

export async function POST(req: Request) {
  // Auth: musí byť Lydka.
  const user = await getCurrentUser();
  if (!user || user.role !== "lydka") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY nie je nastavený na serveri." },
      { status: 500 },
    );
  }

  let body: RequestBody = {};
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.storyId) {
    return NextResponse.json(
      { error: "storyId is required" },
      { status: 400 },
    );
  }

  // Načítaj story (RLS overí, že je Lydkina).
  const supabase = createServerSupabaseClient();
  const { data: story, error: fetchError } = await supabase
    .from("stories")
    .select("id, original_comment, creator_id")
    .eq("id", body.storyId)
    .single();

  if (fetchError || !story) {
    return NextResponse.json({ error: "Storka sa nenašla" }, { status: 404 });
  }
  if (story.creator_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = (story.original_comment ?? "").trim();
  if (!raw) {
    return NextResponse.json(
      { error: "Story nemá original_comment" },
      { status: 400 },
    );
  }

  // User message — pri regenerate dodáme aj predošlý draft, aby model
  // skúsil INÝ uhol pohľadu, nielen iný preformulovaný variant.
  const userMessage = body.regenerate && body.previousDraft
    ? `Raw komentár Lydky:\n${raw}\n\nPredošlý draft (NEPÁČIL sa Lydke):\n${body.previousDraft}\n\nSkús úplne iným spôsobom – iný otvor, iný uhol pohľadu, iná emočná farba. Nepoužívaj rovnaké formulácie ako v predošlom drafte.`
    : `Raw komentár Lydky:\n${raw}\n\nVytvor storku.`;

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: "text",
          text: buildSystemPrompt(),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const firstText = message.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text",
    );

    if (!firstText) {
      return NextResponse.json(
        { error: "Model nevrátil text" },
        { status: 502 },
      );
    }

    const text = fixTypography(firstText.text.trim());

    return NextResponse.json({
      text,
      usage: {
        input: message.usage.input_tokens,
        output: message.usage.output_tokens,
        cache_creation: message.usage.cache_creation_input_tokens ?? 0,
        cache_read: message.usage.cache_read_input_tokens ?? 0,
      },
      model: message.model,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Anthropic API error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
