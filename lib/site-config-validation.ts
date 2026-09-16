import type { PixAdminConfig, SiteConfig, SiteEditorIssue } from "@/types/gift";

const colorPattern = /^#[0-9a-f]{6}$/i;

function isPublicUrl(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

export function validateSiteEditor(config: SiteConfig, pix: PixAdminConfig, hasNewPixKey = false): SiteEditorIssue[] {
  const issues: SiteEditorIssue[] = [];
  const required: Array<[keyof SiteConfig, string, string]> = [
    ["coupleNames", "coupleNames", "Informe os nomes exibidos no site."],
    ["brandLabel", "brandLabel", "Informe o nome curto do site."],
    ["eventTitle", "eventTitle", "Informe o título principal."],
    ["welcomeMessage", "welcomeMessage", "Escreva a mensagem principal de boas-vindas."],
    ["seoTitle", "seoTitle", "Informe o título usado por buscadores."],
  ];
  required.forEach(([key, field, message]) => {
    if (typeof config[key] !== "string" || !String(config[key]).trim()) issues.push({ field, message, level: "error" });
  });

  if (config.giftsEnabled) {
    try {
      const url = new URL(config.giftSheetCsvUrl);
      if (url.protocol !== "https:" || url.hostname !== "docs.google.com") throw new Error();
    } catch { issues.push({ field: "giftSheetCsvUrl", message: "Use um link CSV HTTPS válido do Google Sheets.", level: "error" }); }
  }
  if (config.pixEnabled && (!pix.receiver.trim() || (!pix.hasKey && !hasNewPixKey))) {
    issues.push({ field: "pix", message: "Configure a chave e o nome do favorecido antes de publicar o Pix.", level: "error" });
  }
  if (config.photosPageEnabled && !config.photoGallery.length) {
    issues.push({ field: "photoGallery", message: "Adicione ao menos uma foto ou desative a página de fotos.", level: "error" });
  }
  [config.heroImage, config.couplePhoto, ...config.photoGallery.map((photo) => photo.src)].filter(Boolean).forEach((value) => {
    if (!isPublicUrl(value)) issues.push({ field: "images", message: `Revise o endereço de imagem: ${value}`, level: "error" });
  });
  Object.entries(config.theme).forEach(([field, value]) => {
    if (!colorPattern.test(value)) issues.push({ field: `theme.${field}`, message: `A cor ${field} deve usar o formato #RRGGBB.`, level: "error" });
  });
  if (!config.eventDate) issues.push({ field: "eventDate", message: "A data do evento ainda não foi informada.", level: "warning" });
  if (!config.eventLocation.trim()) issues.push({ field: "eventLocation", message: "O local do evento ainda não será exibido.", level: "warning" });
  return issues;
}
