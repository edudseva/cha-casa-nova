import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { loadSiteConfig } from "@/lib/runtime-config";
import "./globals.css";

// Endereço público do site. Se o link mudar, atualize aqui.
const SITE_URL = "https://cha-casa-nova-producao.eduardo-7f9.workers.dev";

export async function generateMetadata(): Promise<Metadata> {
  const config = await loadSiteConfig();
  return {
    title: config.seoTitle,
    description: config.seoDescription,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: SITE_URL,
      siteName: config.seoTitle,
      title: config.seoTitle,
      description: config.seoDescription,
      images: [{ url: `${SITE_URL}/og-image.jpg`, width: 1200, height: 630, alt: config.seoTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: config.seoTitle,
      description: config.seoDescription,
      images: [`${SITE_URL}/og-image.jpg`],
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const config = await loadSiteConfig();
  const theme = {
    "--site-background": config.theme.background,
    "--site-surface": config.theme.surface,
    "--site-primary": config.theme.primary,
    "--site-primary-dark": config.theme.primaryDark,
    "--site-pix-background": config.theme.pixBackground,
    "--site-accent": config.theme.accent,
    "--site-text": config.theme.text,
    "--site-muted-text": config.theme.mutedText,
  } as CSSProperties;

  return (
    <html lang="pt-BR">
      <head><link rel="preload" as="image" href={config.couplePhoto} fetchPriority="high" /></head>
      <body className="antialiased" style={theme}>{children}<Toaster position="top-center" /></body>
    </html>
  );
}
