import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import siteConfig from "@/data/site-config.json";
import "./globals.css";

export const metadata: Metadata = {
  title: siteConfig.eventTitle,
  description: siteConfig.welcomeMessage,
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = {
    "--site-background": siteConfig.theme.background,
    "--site-surface": siteConfig.theme.surface,
    "--site-primary": siteConfig.theme.primary,
    "--site-primary-dark": siteConfig.theme.primaryDark,
    "--site-pix-background": siteConfig.theme.pixBackground,
    "--site-accent": siteConfig.theme.accent,
    "--site-text": siteConfig.theme.text,
    "--site-muted-text": siteConfig.theme.mutedText,
  } as CSSProperties;

  return (
    <html lang="pt-BR">
      <head><link rel="preload" as="image" href={siteConfig.couplePhoto} fetchPriority="high" /></head>
      <body className="antialiased" style={theme}>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
