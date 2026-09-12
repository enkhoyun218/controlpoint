"use client";

import { useState } from "react";
import { CornerDownLeft, Loader2, Sparkles } from "lucide-react";

import { Card } from "@/components/ui";

type Answer = {
  text: string;
  mode: "live" | "offline";
  notice?: string;
  question: string;
};

export default function AdvisorBox({
  suggestions,
}: {
  suggestions: readonly string[];
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 3 || pending) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
      } else {
        setAnswer({
          text: data.answer,
          mode: data.mode,
          notice: data.notice,
          question: trimmed,
        });
      }
    } catch {
      setError("Could not reach the advisor endpoint.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card
        title="Ask about this company's readiness"
        subtitle="Answers are generated from the same computed snapshot the rest of the app uses — readiness, gaps, criteria coverage, and every SoD finding"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
        >
          <label htmlFor="question" className="sr-only">
            Your question
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                ask(question);
              }
            }}
            rows={3}
            maxLength={500}
            placeholder="e.g. What's blocking my Type II readiness?"
            className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="num text-[11px] text-ink-muted">
              {question.length}/500 · ⌘↵ to send
            </p>
            <button
              type="submit"
              disabled={pending || question.trim().length < 3}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Thinking
                </>
              ) : (
                <>
                  Ask the advisor
                  <CornerDownLeft className="h-3.5 w-3.5" aria-hidden />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-2 text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
            Try one of these
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setQuestion(s);
                  ask(s);
                }}
                disabled={pending}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-[#bcd7e2] hover:text-ink disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      {answer ? (
        <Card
          title={answer.question}
          right={
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
              <Sparkles className="h-3 w-3" aria-hidden />
              {answer.mode === "live" ? "Claude Haiku" : "Offline summary"}
            </span>
          }
        >
          {answer.notice ? (
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 ring-1 ring-amber-200 ring-inset">
              {answer.notice}
            </p>
          ) : null}
          <div className="space-y-3 text-sm leading-6 whitespace-pre-wrap text-ink">
            {answer.text}
          </div>
          <p className="mt-4 border-t border-line pt-3 text-[11px] leading-5 text-ink-muted">
            Generated from synthetic data about a fictional company. Not audit
            advice, not an opinion, and not a substitute for an examination by a
            licensed firm.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
