import { env } from "cloudflare:workers";
import { cleanSiteConfig, loadPixAdminConfig, loadSiteConfig } from "@/lib/runtime-config";
import { CURRENT_SITE_ID } from "@/lib/site-context";
import type { PixAdminConfig, SiteConfig, SiteConfigVersionSummary } from "@/types/gift";

type DraftRow = { payload: string; pix_payload: string; updated_at: string };
type VersionRow = { id: number; created_at: string; created_by_email: string };

function safeDraftConfig(payload: string | null, fallback: SiteConfig) {
  if (!payload) return fallback;
  try { return JSON.parse(payload) as SiteConfig; } catch { return fallback; }
}

function safeDraftPix(payload: string | null, fallback: PixAdminConfig) {
  if (!payload) return fallback;
  try { return { ...fallback, ...(JSON.parse(payload) as Partial<PixAdminConfig>), hasKey: fallback.hasKey }; } catch { return fallback; }
}

export async function loadSiteEditorState(userId: string) {
  const [publishedConfig, publishedPix, draft, versions] = await Promise.all([
    loadSiteConfig(),
    loadPixAdminConfig(),
    env.DB.prepare("SELECT payload, pix_payload, updated_at FROM site_config_drafts WHERE site_id = ? AND user_id = ? LIMIT 1").bind(CURRENT_SITE_ID, userId).first<DraftRow>(),
    env.DB.prepare("SELECT id, created_at, created_by_email FROM site_config_versions WHERE site_id = ? ORDER BY id DESC LIMIT 20").bind(CURRENT_SITE_ID).all<VersionRow>(),
  ]);
  const summaries: SiteConfigVersionSummary[] = versions.results.map((row) => ({ id: row.id, createdAt: row.created_at, createdByEmail: row.created_by_email }));
  return {
    publishedConfig,
    publishedPix,
    config: safeDraftConfig(draft?.payload ?? null, publishedConfig),
    pix: safeDraftPix(draft?.pix_payload ?? null, publishedPix),
    draftUpdatedAt: draft?.updated_at ?? null,
    versions: summaries,
  };
}

export function cleanDraftForPreview(config: SiteConfig) {
  return cleanSiteConfig(config);
}
