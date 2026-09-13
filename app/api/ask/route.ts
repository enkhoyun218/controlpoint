import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import {
  buildAdvisorContext,
  offlineAnswer,
  SYSTEM_PROMPT,
} from "@/lib/advisor";
import { clientKey, createRateLimiter } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Cheapest current model — this is a summarization task over a small,
// pre-computed context, not something that needs a frontier model.
const MODEL = "claude-haiku-4-5-20251001";
const MAX_QUESTION_LENGTH = 500;

// This is a public demo endpoint spending a real API key, so cap what one
// caller can do with it. Per-instance and best-effort — see lib/rateLimit.ts.
const limiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10 });

export async function POST(request: Request) {
  let question: unknown;
  try {
    ({ question } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof question !== "string" || question.trim().length < 3) {
    return NextResponse.json(
      { error: "Ask a question of at least a few characters." },
      { status: 400 },
    );
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `Questions are capped at ${MAX_QUESTION_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      answer: offlineAnswer(),
      mode: "offline",
      notice:
        "This deployment has no Anthropic API key set, so the answer below is computed locally from the dataset rather than generated. The figures are the same ones the rest of the app uses.",
    });
  }

  const limit = limiter.check(clientKey(request));
  if (!limit.ok) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return NextResponse.json(
      {
        error: `You've reached this demo's limit of 10 questions an hour. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const { context } = buildAdvisorContext();

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is the current readiness data for the company:\n\n<data>\n${context}\n</data>\n\nQuestion: ${question.trim()}`,
        },
      ],
    });

    const answer = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    return NextResponse.json(
      {
        answer: answer || "No answer came back. Try rephrasing.",
        mode: "live",
        model: MODEL,
      },
      { headers: { "X-RateLimit-Remaining": String(limit.remaining) } },
    );
  } catch (error) {
    console.error("Advisor request failed:", error);
    return NextResponse.json(
      {
        answer: offlineAnswer(),
        mode: "offline",
        notice:
          "The model call didn't complete, so the answer below is computed locally from the same dataset instead.",
      },
      { status: 200 },
    );
  }
}
