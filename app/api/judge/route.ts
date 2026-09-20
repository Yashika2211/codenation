import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceSupabase, canUseServiceRole } from "@/lib/supabase/service";
import { judge, cooldownRemaining, type JudgeEvent } from "@/lib/judge/execute";
import { isLanguageId } from "@/lib/judge/languages";

export const runtime = "nodejs";
// A judged submission can outlive the default budget on a compiled language.
export const maxDuration = 300;

const BodySchema = z.object({
  problemSlug: z.string().min(1).max(100),
  language: z.string().refine(isLanguageId, "Unsupported language"),
  source: z.string().min(1).max(64_000),
  mode: z.enum(["run", "submit"]),
  duelId: z.string().uuid().nullish(),
  telemetry: z
    .object({
      totalChars: z.number().int().min(0).max(10_000_000).optional(),
      pastedChars: z.number().int().min(0).max(10_000_000).optional(),
      pasteEvents: z.number().int().min(0).max(100_000).optional(),
      keystrokes: z.number().int().min(0).max(10_000_000).optional(),
      timeToFirstSubmitMs: z.number().int().min(0).max(86_400_000).optional(),
    })
    .optional(),
});

function line(event: JudgeEvent): string {
  return `${JSON.stringify(event)}\n`;
}

/**
 * Judges a submission and streams each case back as NDJSON, so the Tests tab
 * fills in live rather than waiting for the whole set.
 *
 * Everything that matters is re-derived here: the problem comes from the
 * database by slug, the user from the session cookie, and the test cases from
 * the service role. Nothing about the grade is taken from the request body.
 */
export async function POST(request: NextRequest) {
  if (!canUseServiceRole()) {
    return NextResponse.json(
      { error: "The judge is not configured on this deployment." },
      { status: 503 },
    );
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const body = parsed.data;

  const supabase = await createServerSupabase();
  const { data: userData } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };
  const user = userData.user;

  if (body.mode === "submit" && !user) {
    return NextResponse.json({ error: "Sign in to submit." }, { status: 401 });
  }

  // Rate limit lives here, at the edge of the system, before any work is done.
  if (user) {
    const wait = await cooldownRemaining(user.id);
    if (wait > 0) {
      return NextResponse.json(
        { error: `Wait ${Math.ceil(wait / 1000)}s between submissions.` },
        { status: 429, headers: { "retry-after": String(Math.ceil(wait / 1000)) } },
      );
    }
  }

  const service = createServiceSupabase();
  const { data: problem } = await service
    .from("problems")
    .select("*")
    .eq("slug", body.problemSlug)
    .maybeSingle();

  if (!problem || (!problem.is_public && problem.author_id !== user?.id)) {
    return NextResponse.json({ error: "Problem not found." }, { status: 404 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of judge({
          userId: user?.id ?? null,
          problem,
          language: body.language,
          source: body.source,
          mode: body.mode,
          duelId: body.duelId ?? null,
          telemetry: body.telemetry ?? {},
        })) {
          controller.enqueue(encoder.encode(line(event)));
        }
      } catch {
        controller.enqueue(
          encoder.encode(line({ type: "error", message: "The judge failed unexpectedly." })),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
