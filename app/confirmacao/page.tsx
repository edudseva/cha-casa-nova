import type { Metadata } from "next";
import { Heart, Home, Lock } from "lucide-react";
import Link from "next/link";
import { RsvpForm } from "@/components/rsvp-form";
import { loadSiteConfig } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await loadSiteConfig();
  return {
    title: `Confirme sua presença | ${config.seoTitle}`,
    description: `Confirme sua presença no chá de casa nova de ${config.coupleNames}.`,
  };
}

export default async function ConfirmationPage() {
  const config = await loadSiteConfig();
  return (
    <main className="rsvp-page">
      <header className="site-header">
        <Link className="brand" href="/#inicio" aria-label="Voltar ao início">
          <span className="brand-mark"><Home size={18} /></span>
          <span>{config.brandLabel}</span>
        </Link>
        <nav aria-label="Navegação principal">
          <Link className="nav-rsvp-link" href="/confirmacao" aria-current="page">Confirme sua presença</Link>
          {config.giftsEnabled && <Link href="/#presentes">Presentes</Link>}
          {config.pixEnabled && <Link href="/#pix">Pix</Link>}
          {config.projectPageEnabled && <Link href="/projeto">O projeto</Link>}
          {config.photosPageEnabled && <Link href="/fotos">Fotos</Link>}
        </nav>
      </header>

      <RsvpForm />

      <footer>
        <div className="footer-heart"><Heart fill="currentColor" /></div>
        <p>{config.footerMessage}</p>
        <small>{config.coupleNames}</small>
        <Link className="admin-lock-link" href="/admin" aria-label="Acessar área administrativa" title="Área administrativa"><Lock size={14} /></Link>
      </footer>
    </main>
  );
}
