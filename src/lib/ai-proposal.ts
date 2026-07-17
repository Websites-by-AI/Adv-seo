// Optional AI-powered enhancement layer for the rule-based proposal
// generator in `proposal.ts`. If an `OPENAI_API_KEY` environment variable
// is configured, this rewrites the templated proposal into a more natural,
// specifically-tailored Persian pitch using an LLM. If no key is present
// (the common case in this sandbox) or the call fails for any reason, the
// original rule-based template is returned unchanged — the feature is
// purely additive and never blocks the core workflow.

import type { ProposalCompanyInput } from "@/lib/proposal";

export function hasAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

const TIMEOUT_MS = 15_000;

export async function enhanceProposalWithAi(
  templateContent: string,
  company: ProposalCompanyInput,
): Promise<{ content: string; aiGenerated: boolean }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { content: templateContent, aiGenerated: false };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.6,
        messages: [
          {
            role: "system",
            content:
              "تو یک مشاور بازاریابی دیجیتال فارسی‌زبان هستی که برای صاحبان کسب‌وکار پیشنهاد بهبود سئو و پروفایل گوگل می‌نویسی. لحن حرفه‌ای، محترمانه و مشتری‌مدار داشته باش. خروجی را فقط به زبان فارسی و در قالب Markdown با تیتر و لیست شماره‌دار بازنویسی کن. اطلاعات واقعی موجود در متن پایه (نام شرکت، تلفن، وبسایت، آدرس، نام نمایشگاه) را حفظ کن و چیزی از خودت اختراع نکن.",
          },
          {
            role: "user",
            content: `این پیشنهاد قالب‌محور را برای شرکت «${company.name}» بازنویسی و شخصی‌سازی کن تا طبیعی‌تر و متقاعدکننده‌تر به نظر برسد، اما ساختار ۱۰ بندی و اطلاعات واقعی آن را حفظ کن:\n\n${templateContent}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return { content: templateContent, aiGenerated: false };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const aiContent = data.choices?.[0]?.message?.content?.trim();

    if (!aiContent) {
      return { content: templateContent, aiGenerated: false };
    }

    return { content: aiContent, aiGenerated: true };
  } catch {
    // Network error, timeout, or malformed response: silently fall back.
    return { content: templateContent, aiGenerated: false };
  } finally {
    clearTimeout(timeout);
  }
}
