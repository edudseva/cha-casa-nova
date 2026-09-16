"use client";
/* eslint-disable @next/next/no-img-element -- preview accepts runtime-configured local or HTTPS images */

import { CSSProperties, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gift, Heart, Landmark, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SiteConfig } from "@/types/gift";

export function AdminSitePreview({ config, hasDraft, updatedAt }: { config: SiteConfig; hasDraft: boolean; updatedAt: string | null }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const style = {
    "--preview-bg": config.theme.background,
    "--preview-surface": config.theme.surface,
    "--preview-primary": config.theme.primary,
    "--preview-primary-dark": config.theme.primaryDark,
    "--preview-accent": config.theme.accent,
    "--preview-text": config.theme.text,
    "--preview-muted": config.theme.mutedText,
  } as CSSProperties;
  return <main className="editor-preview-page" style={style}>
    <header className="editor-preview-toolbar">
      <div><Button asChild variant="outline"><Link href="/admin/personalizacao"><ArrowLeft /> Voltar ao editor</Link></Button><span><strong>Prévia protegida</strong><small>{hasDraft ? `Rascunho salvo${updatedAt ? ` em ${new Date(`${updatedAt}Z`).toLocaleString("pt-BR")}` : ""}` : "Conteúdo publicado"}</small></span></div>
      <div className="editor-device-switch" aria-label="Tamanho da prévia"><Button type="button" variant={device === "desktop" ? "default" : "outline"} onClick={() => setDevice("desktop")}><Monitor /> Desktop</Button><Button type="button" variant={device === "mobile" ? "default" : "outline"} onClick={() => setDevice("mobile")}><Smartphone /> Mobile</Button></div>
    </header>
    <section className={`editor-preview-stage ${device}`}>
      <div className="editor-preview-site">
        <header><span>{config.brandLabel}</span><nav>{config.giftsEnabled && <a href="#preview-gifts">Presentes</a>}{config.pixEnabled && <a href="#preview-pix">Pix</a>}{config.projectPageEnabled && <span>O projeto</span>}{config.photosPageEnabled && <span>Fotos</span>}</nav></header>
        <section className="editor-preview-hero"><div><small>{config.heroEyebrow}</small><h1>{config.eventTitle}</h1><p>{config.welcomeMessage}</p><button type="button"><Gift /> Escolher um presente</button></div><img src={config.heroImage} alt={config.heroImageAlt} /></section>
        {config.giftsEnabled && <section id="preview-gifts" className="editor-preview-section"><small>{config.giftSectionEyebrow}</small><h2>{config.giftSectionTitle}</h2><p>{config.giftSectionDescription}</p><div className="editor-preview-gifts">{["Um presente especial", "Para o novo lar", "Nossa escolha"].map((name, index) => <article key={name}><span><Gift /></span><small>{index === 1 ? "Decoração" : "Casa"}</small><strong>{name}</strong><button type="button">Ver presente</button></article>)}</div></section>}
        {config.pixEnabled && <section id="preview-pix" className="editor-preview-pix"><Landmark /><small>{config.pixSectionEyebrow}</small><h2>{config.pixSectionTitle}</h2><p>{config.pixSectionDescription}</p></section>}
        {config.photosPageEnabled && config.photoGallery[0] && <section className="editor-preview-story"><img src={config.photoGallery[0].src} alt={config.photoGallery[0].alt} /><div><Heart /><small>Nossa história</small><h2>{config.photoGallery[0].label}</h2><p>{config.welcomeDescription}</p></div></section>}
        <footer>{config.footerMessage}</footer>
      </div>
    </section>
  </main>;
}
