import { env } from "cloudflare:workers";
import defaults from "@/data/site-config.json";
import { CURRENT_SITE_ID } from "@/lib/site-context";
import type { PhotoGalleryItem, PixAdminConfig, SiteConfig } from "@/types/gift";

type PixEnvironment = { PIX_KEY?: string; PIX_RECEIVER?: string; PIX_CITY?: string };
type PixInput = { enabled?: boolean; key?: string; receiver?: string; city?: string };
type PixRuntimeConfig = PixAdminConfig & { key: string };

const defaultPhotoGallery: PhotoGalleryItem[] = [
  { src: "/photos/festa-junina.jpeg", alt: "Ana e Eduardo juntos em uma festa junina", label: "Celebrando juntos", featured: true },
  { src: "/photos/aventura.jpeg", alt: "Ana e Eduardo em uma aventura na natureza", label: "Nossas aventuras", featured: false },
  { src: "/photos/ana-e-gatinha.jpeg", alt: "Ana abraçada com a gatinha do casal", label: "Muito carinho", featured: false },
  { src: "/photos/nossa-familia.jpeg", alt: "Ana e Eduardo com os animais da família", label: "Nossa família", featured: false },
  { src: "/photos/carnaval-brasilia.jpeg", alt: "Ana e Eduardo juntos em Brasília", label: "Dias de alegria", featured: false },
  { src: "/photos/nos-dois.jpeg", alt: "Ana e Eduardo juntos", label: "Nós dois", featured: false },
  { src: "/photos/dia-especial.jpeg", alt: "Ana e Eduardo em uma ocasião especial", label: "Momentos especiais", featured: false },
  { src: "/photos/machu-picchu-1.jpeg", alt: "Ana e Eduardo em Machu Picchu", label: "Conhecendo o mundo", featured: true },
  { src: "/photos/machu-picchu-2.jpeg", alt: "Ana e Eduardo sentados em Machu Picchu", label: "Memórias para sempre", featured: false },
  { src: "/photos/celebracao.jpeg", alt: "Ana e Eduardo juntos em uma comemoração", label: "Sempre juntos", featured: false },
];

const fallback = { ...defaults, photoGallery: defaultPhotoGallery } as SiteConfig;
const colorPattern = /^#[0-9a-f]{6}$/i;

function safeText(value: unknown, standard: string, limit: number, allowEmpty = false) {
  if (typeof value !== "string") return standard;
  const cleaned = value.trim().slice(0, limit);
  return cleaned || (allowEmpty ? "" : standard);
}

function safeColor(value: unknown, standard: string) {
  return typeof value === "string" && colorPattern.test(value) ? value : standard;
}

function safeBoolean(value: unknown, standard: boolean) {
  return typeof value === "boolean" ? value : standard;
}

function safePublicUrl(value: unknown, standard = "") {
  const raw = safeText(value, standard, 1000, true);
  if (!raw) return "";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : standard;
  } catch {
    return standard;
  }
}

export function cleanSiteConfig(input: Partial<SiteConfig>): SiteConfig {
  let sheet = safeText(input.giftSheetCsvUrl, fallback.giftSheetCsvUrl, 1000);
  try {
    const url = new URL(sheet);
    if (url.protocol !== "https:" || url.hostname !== "docs.google.com") sheet = fallback.giftSheetCsvUrl;
  } catch {
    sheet = fallback.giftSheetCsvUrl;
  }

  const values = Array.isArray(input.suggestedPixValues)
    ? input.suggestedPixValues.map(Number).filter((value) => Number.isFinite(value) && value > 0 && value <= 100000).slice(0, 12)
    : fallback.suggestedPixValues;

  const photos = Array.isArray(input.photoGallery)
    ? input.photoGallery.flatMap((photo) => {
        const src = safePublicUrl(photo?.src, "");
        if (!src) return [];
        return [{
          src,
          alt: safeText(photo?.alt, "Foto do casal", 180),
          label: safeText(photo?.label, "Nossa história", 80),
          featured: Boolean(photo?.featured),
        }];
      }).slice(0, 30)
    : fallback.photoGallery;

  return {
    eventTitle: safeText(input.eventTitle, fallback.eventTitle, 100),
    coupleNames: safeText(input.coupleNames, fallback.coupleNames, 100),
    brandLabel: safeText(input.brandLabel, fallback.brandLabel, 80),
    eventDate: typeof input.eventDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.eventDate) ? input.eventDate : null,
    eventTime: typeof input.eventTime === "string" && /^\d{2}:\d{2}$/.test(input.eventTime) ? input.eventTime : "",
    eventLocation: safeText(input.eventLocation, fallback.eventLocation, 300, true),
    welcomeMessage: safeText(input.welcomeMessage, fallback.welcomeMessage, 1200),
    welcomeTitle: safeText(input.welcomeTitle, fallback.welcomeTitle, 100),
    welcomeDescription: safeText(input.welcomeDescription, fallback.welcomeDescription, 500),
    heroEyebrow: safeText(input.heroEyebrow, fallback.heroEyebrow, 120),
    heroImage: safePublicUrl(input.heroImage, fallback.heroImage),
    heroImageAlt: safeText(input.heroImageAlt, fallback.heroImageAlt, 180),
    couplePhoto: safePublicUrl(input.couplePhoto, fallback.couplePhoto),
    couplePhotoAlt: safeText(input.couplePhotoAlt, fallback.couplePhotoAlt, 180),
    photoGallery: photos.length ? photos : fallback.photoGallery,
    deliveryAddress: safeText(input.deliveryAddress, fallback.deliveryAddress, 500),
    giftSheetCsvUrl: sheet,
    giftSectionEyebrow: safeText(input.giftSectionEyebrow, fallback.giftSectionEyebrow, 120),
    giftSectionTitle: safeText(input.giftSectionTitle, fallback.giftSectionTitle, 120),
    giftSectionDescription: safeText(input.giftSectionDescription, fallback.giftSectionDescription, 500),
    pixSectionEyebrow: safeText(input.pixSectionEyebrow, fallback.pixSectionEyebrow, 120),
    pixSectionTitle: safeText(input.pixSectionTitle, fallback.pixSectionTitle, 120),
    pixSectionDescription: safeText(input.pixSectionDescription, fallback.pixSectionDescription, 500),
    footerMessage: safeText(input.footerMessage, fallback.footerMessage, 300),
    whatsappUrl: safePublicUrl(input.whatsappUrl),
    instagramUrl: safePublicUrl(input.instagramUrl),
    giftsEnabled: safeBoolean(input.giftsEnabled, fallback.giftsEnabled),
    pixEnabled: safeBoolean(input.pixEnabled, fallback.pixEnabled),
    projectPageEnabled: safeBoolean(input.projectPageEnabled, fallback.projectPageEnabled),
    photosPageEnabled: safeBoolean(input.photosPageEnabled, fallback.photosPageEnabled),
    seoTitle: safeText(input.seoTitle, fallback.seoTitle, 100),
    seoDescription: safeText(input.seoDescription, fallback.seoDescription, 300),
    suggestedPixValues: values.length ? values : fallback.suggestedPixValues,
    theme: {
      background: safeColor(input.theme?.background, fallback.theme.background),
      surface: safeColor(input.theme?.surface, fallback.theme.surface),
      primary: safeColor(input.theme?.primary, fallback.theme.primary),
      primaryDark: safeColor(input.theme?.primaryDark, fallback.theme.primaryDark),
      pixBackground: safeColor(input.theme?.pixBackground, fallback.theme.pixBackground),
      accent: safeColor(input.theme?.accent, fallback.theme.accent),
      text: safeColor(input.theme?.text, fallback.theme.text),
      mutedText: safeColor(input.theme?.mutedText, fallback.theme.mutedText),
    },
  };
}

async function ensureTables() {
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS site_config (id INTEGER PRIMARY KEY NOT NULL, site_id TEXT DEFAULT 'cha-casa-nova-homologacao' NOT NULL, payload TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_site_config_site ON site_config (site_id)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS pix_config (id INTEGER PRIMARY KEY NOT NULL, site_id TEXT DEFAULT 'cha-casa-nova-homologacao' NOT NULL, pix_key TEXT NOT NULL, receiver TEXT NOT NULL, city TEXT NOT NULL, enabled INTEGER DEFAULT 1 NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_pix_config_site ON pix_config (site_id)"),
  ]);
}

export async function loadSiteConfig(): Promise<SiteConfig> {
  try {
    await ensureTables();
    const row = await env.DB.prepare("SELECT payload FROM site_config WHERE site_id = ?").bind(CURRENT_SITE_ID).first<{ payload: string }>();
    return row?.payload ? cleanSiteConfig(JSON.parse(row.payload)) : fallback;
  } catch (error) {
    console.error("Could not load site configuration", error);
    return fallback;
  }
}

export async function saveSiteConfig(input: Partial<SiteConfig>) {
  const config = cleanSiteConfig(input);
  await ensureTables();
  await env.DB.prepare("INSERT INTO site_config (site_id, payload, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(site_id) DO UPDATE SET payload = excluded.payload, updated_at = CURRENT_TIMESTAMP").bind(CURRENT_SITE_ID, JSON.stringify(config)).run();
  return config;
}

function cleanPixText(value: string, maxLength: number) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 .-]/g, "").toUpperCase().slice(0, maxLength);
}

export async function loadPixConfig(): Promise<PixRuntimeConfig> {
  const fixed = env as unknown as PixEnvironment;
  await ensureTables();
  const row = await env.DB.prepare("SELECT pix_key, receiver, city, enabled FROM pix_config WHERE site_id = ?").bind(CURRENT_SITE_ID).first<{ pix_key: string; receiver: string; city: string; enabled: number }>();
  const key = row?.pix_key?.trim() || fixed.PIX_KEY?.trim() || "";
  const receiver = cleanPixText(row?.receiver?.trim() || fixed.PIX_RECEIVER?.trim() || "", 25);
  const city = cleanPixText(row?.city?.trim() || fixed.PIX_CITY?.trim() || "BRASILIA", 15);
  return { key, receiver, city, enabled: row ? Boolean(row.enabled) : true, hasKey: Boolean(key) };
}

export async function loadPixAdminConfig(): Promise<PixAdminConfig> {
  const { enabled, receiver, city, hasKey } = await loadPixConfig();
  return { enabled, receiver, city, hasKey };
}

export async function savePixConfig(input: PixInput): Promise<PixAdminConfig> {
  const current = await loadPixConfig();
  const key = safeText(input.key, current.key, 77);
  const receiver = cleanPixText(safeText(input.receiver, current.receiver, 25), 25);
  const city = cleanPixText(safeText(input.city, current.city || "BRASILIA", 15), 15);
  const enabled = safeBoolean(input.enabled, current.enabled);
  if (!key || !receiver) throw new Error("Informe a chave Pix e o nome do favorecido.");
  await env.DB.prepare("INSERT INTO pix_config (site_id, pix_key, receiver, city, enabled, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(site_id) DO UPDATE SET pix_key = excluded.pix_key, receiver = excluded.receiver, city = excluded.city, enabled = excluded.enabled, updated_at = CURRENT_TIMESTAMP").bind(CURRENT_SITE_ID, key, receiver, city, enabled ? 1 : 0).run();
  return { enabled, receiver, city, hasKey: true };
}
