import { env } from "cloudflare:workers";
import defaults from "@/data/site-config.json";
import type { SiteConfig } from "@/types/gift";

const fallback = defaults as SiteConfig;
const colorPattern = /^#[0-9a-f]{6}$/i;

function safeText(value: unknown, standard: string, limit: number) {
  return typeof value === "string"
    ? value.trim().slice(0, limit) || standard
    : standard;
}

function safeColor(value: unknown, standard: string) {
  return typeof value === "string" && colorPattern.test(value)
    ? value
    : standard;
}

function clean(input: Partial<SiteConfig>): SiteConfig {
  let sheet = safeText(
    input.giftSheetCsvUrl,
    fallback.giftSheetCsvUrl,
    1000
  );

  try {
    const url = new URL(sheet);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "docs.google.com"
    ) {
      sheet = fallback.giftSheetCsvUrl;
    }
  } catch {
    sheet = fallback.giftSheetCsvUrl;
  }

  const values = Array.isArray(input.suggestedPixValues)
    ? input.suggestedPixValues
        .map(Number)
        .filter(
          (value) =>
            Number.isFinite(value) &&
            value > 0 &&
            value <= 100000
        )
        .slice(0, 12)
    : fallback.suggestedPixValues;

  return {
    eventTitle: safeText(
      input.eventTitle,
      fallback.eventTitle,
      100
    ),
    coupleNames: safeText(
      input.coupleNames,
      fallback.coupleNames,
      100
    ),
    brandLabel: safeText(
      input.brandLabel,
      fallback.brandLabel,
      80
    ),
    eventDate:
      typeof input.eventDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(input.eventDate)
        ? input.eventDate
        : null,
    welcomeMessage: safeText(
      input.welcomeMessage,
      fallback.welcomeMessage,
      1200
    ),
    heroEyebrow: safeText(
      input.heroEyebrow,
      fallback.heroEyebrow,
      120
    ),
    heroImage: fallback.heroImage,
    heroImageAlt: fallback.heroImageAlt,
    couplePhoto: fallback.couplePhoto,
    couplePhotoAlt: fallback.couplePhotoAlt,
    deliveryAddress: safeText(
      input.deliveryAddress,
      fallback.deliveryAddress,
      500
    ),
    giftSheetCsvUrl: sheet,
    suggestedPixValues:
      values.length > 0
        ? values
        : fallback.suggestedPixValues,
    theme: {
      background: safeColor(
        input.theme?.background,
        fallback.theme.background
      ),
      surface: safeColor(
        input.theme?.surface,
        fallback.theme.surface
      ),
      primary: safeColor(
        input.theme?.primary,
        fallback.theme.primary
      ),
      primaryDark: safeColor(
        input.theme?.primaryDark,
        fallback.theme.primaryDark
      ),
      pixBackground: safeColor(
        input.theme?.pixBackground,
        fallback.theme.pixBackground
      ),
      accent: safeColor(
        input.theme?.accent,
        fallback.theme.accent
      ),
      text: safeColor(
        input.theme?.text,
        fallback.theme.text
      ),
      mutedText: safeColor(
        input.theme?.mutedText,
        fallback.theme.mutedText
      ),
    },
  };
}

async function ensureTable() {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS site_config (id INTEGER PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"
  ).run();
}

export async function loadSiteConfig(): Promise<SiteConfig> {
  try {
    await ensureTable();

    const row = await env.DB.prepare(
      "SELECT payload FROM site_config WHERE id = 1"
    ).first<{ payload: string }>();

    return row?.payload
      ? clean(JSON.parse(row.payload))
      : fallback;
  } catch (error) {
    console.error("Could not load site configuration", error);
    return fallback;
  }
}

export async function saveSiteConfig(
  input: Partial<SiteConfig>
) {
  const config = clean(input);

  await ensureTable();

  await env.DB.prepare(
    "INSERT INTO site_config (id, payload, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = CURRENT_TIMESTAMP"
  )
    .bind(JSON.stringify(config))
    .run();

  return config;
}
