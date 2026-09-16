import { env } from "cloudflare:workers";

export type CommercialSettings = {
  headline: string; description: string; trial_days: number; sales_email: string;
  terms_draft: string; privacy_draft: string; billing_status: string; updated_at: string;
};

export type CommercialPlan = {
  id: string; name: string; price_cents: number; max_sites: number;
  max_members: number; max_gifts: number; max_gallery_images: number;
  custom_domain_enabled: number;
};

export async function commercialCatalog() {
  const [settings, plans] = await env.DB.batch([
    env.DB.prepare("SELECT headline, description, trial_days, sales_email, terms_draft, privacy_draft, billing_status, updated_at FROM commercial_launch WHERE id = 1"),
    env.DB.prepare("SELECT id, name, price_cents, max_sites, max_members, max_gifts, max_gallery_images, custom_domain_enabled FROM platform_plans WHERE active = 1 ORDER BY max_sites, name"),
  ]);
  return {
    settings: (settings.results[0] ?? {
      headline: "Seu evento, do seu jeito", description: "Crie um espaço para celebrar e organizar seu evento.",
      trial_days: 14, sales_email: "", terms_draft: "", privacy_draft: "",
      billing_status: "unconfigured", updated_at: "",
    }) as CommercialSettings,
    plans: plans.results as CommercialPlan[],
  };
}

export { sameOrigin } from "@/lib/request-origin";

export async function limitedJson(request: Request, limit = 6000): Promise<Record<string, unknown> | null> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
  if (Number(request.headers.get("content-length") ?? 0) > limit) return null;
  const text = await request.text();
  if (text.length > limit) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch { return null; }
}

export function commercialError(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}
