// ---------------------------------------------------------------------------
// News headlines: the event schedule/effect is pure (news.ts) — this service
// only generates and persists the headline TEXT, via the GLM API (Vercel AI
// SDK, OpenAI-compatible). Falls back to the template headline; the game
// never blocks on the LLM.
// ---------------------------------------------------------------------------

import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { GLM_API_KEY, GLM_BASE_URL, GLM_MODEL } from "$app/env/private";
import { dev } from "$app/env";
import { prisma } from "$server/db";
import { REGION } from "../gameConfig";
import {
  activeNews,
  newsWindows,
  type NewsEventData,
  type NewsKind,
} from "../news";
import { devState } from "./time";

const LLM_TIMEOUT_MS = 8_000;

/** Fixed synthetic events for dev-panel simulation. */
const DEV_OVERRIDES: Record<
  NewsKind,
  { priceMult: number; fabricatorMult: number; headline: string }
> = {
  PRICE_SURGE: {
    priceMult: 1.3,
    fabricatorMult: 1,
    headline: "SIMULATED: Grid congestion — spot price +30%",
  },
  PRICE_DROP: {
    priceMult: 0.75,
    fabricatorMult: 1,
    headline: "SIMULATED: Oversupply on the grid — spot price -25%",
  },
  FABRICATOR_BOOST: {
    priceMult: 1,
    fabricatorMult: 1.5,
    headline: "SIMULATED: Subsidy program — fabricator output +50%",
  },
  FABRICATOR_SLOWDOWN: {
    priceMult: 1,
    fabricatorMult: 0.5,
    headline: "SIMULATED: Material shortage — fabricator output -50%",
  },
};

function devOverrideEvent(now: Date): NewsEventData | null {
  const kind = devState.newsOverride;
  if (!dev || kind === null || kind === "none") return null;
  const o = DEV_OVERRIDES[kind];
  return {
    id: `dev-${kind}`,
    kind,
    priceMult: o.priceMult,
    fabricatorMult: o.fabricatorMult,
    startMs: now.getTime(),
    endMs: now.getTime() + 2 * 3_600_000,
    templateHeadline: o.headline,
    description: o.headline,
  };
}

/** Active event, honoring the dev-panel simulation override. */
export function resolveActiveNews(now: Date): NewsEventData | null {
  if (dev && devState.newsOverride !== null) {
    return devOverrideEvent(now);
  }
  return activeNews(now);
}

/** Events overlapping [from, to], honoring the dev-panel override. */
export function resolveNewsWindows(from: Date, to: Date): NewsEventData[] {
  if (dev && devState.newsOverride !== null) {
    if (devState.newsOverride === "none") return [];
    const o = DEV_OVERRIDES[devState.newsOverride];
    return [
      {
        id: `dev-${devState.newsOverride}`,
        kind: devState.newsOverride,
        priceMult: o.priceMult,
        fabricatorMult: o.fabricatorMult,
        startMs: from.getTime(),
        endMs: to.getTime(),
        templateHeadline: o.headline,
        description: o.headline,
      },
    ];
  }
  return newsWindows(from, to);
}

const glm = GLM_API_KEY
  ? createOpenAICompatible({
      name: "glm",
      baseURL: GLM_BASE_URL ?? "https://api.z.ai/api/paas/v4",
      apiKey: GLM_API_KEY,
    })
  : null;

/** Returns the persisted headline for an event, generating it once if needed. */
export async function ensureHeadline(
  event: NewsEventData,
): Promise<{ headline: string; generated: boolean }> {
  // Simulated dev events are never persisted or sent to the LLM.
  if (event.id.startsWith("dev-")) {
    return { headline: event.templateHeadline, generated: false };
  }
  const existing = await prisma.newsEvent.findUnique({
    where: { id: event.id },
  });
  if (existing)
    return { headline: existing.headline, generated: existing.generated };

  let headline = event.templateHeadline;
  let generated = false;

  if (glm) {
    try {
      const result = await generateText({
        model: glm(GLM_MODEL ?? "glm-4.5-flash"),
        prompt:
          `Write ONE news ticker headline for a minimalist energy-grid game. ` +
          `Event: ${event.description}. Region: ${REGION.name}, Germany. ` +
          `Rules: English, max 80 characters, terse newswire tone, no emojis, ` +
          `no quotes, no trailing period. Reply with the headline only.`,
        abortSignal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      });
      const text = result.text.trim().replace(/^["']|["']$/g, "");
      if (text.length > 0 && text.length <= 120) {
        headline = text;
        generated = true;
      }
    } catch {
      // LLM failure — template headline is used.
    }
  }

  await prisma.newsEvent.upsert({
    where: { id: event.id },
    update: {},
    create: { id: event.id, kind: event.kind, headline, generated },
  });
  return { headline, generated };
}
