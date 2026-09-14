import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { loadSiteConfig } from "@/lib/runtime-config";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const config = await loadSiteConfig();
  return {
    title: config.seoTitle,
    description: config.seoDescription,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
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
