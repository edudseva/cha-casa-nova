import type { Metadata } from "next";
import { ArrowLeft, Heart, Home, Lock, Maximize2 } from "lucide-react";
import Link from "next/link";
import { loadSiteConfig } from "@/lib/runtime-config";
import type { PhotoGalleryItem } from "@/types/gift";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await loadSiteConfig();
  return { title: `Nossa história | ${config.seoTitle}`, description: `Um pouco da história de ${config.coupleNames} em fotos.` };
}

function PhotoCard({ photo }: { photo: PhotoGalleryItem }) {
  return (
    <a className={`couple-photo ${photo.featured ? "couple-photo-featured" : ""}`} href={photo.src} target="_blank" rel="noopener noreferrer" aria-label={`Abrir foto: ${photo.label}`}>
      <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
      <span className="couple-photo-caption"><span>{photo.label}</span><Maximize2 size={16} aria-hidden="true" /></span>
    </a>
  );
}

export default async function PhotosPage() {
  const config = await loadSiteConfig();
  const photos = config.photoGallery;
  const heroMain = photos.find((photo) => photo.featured) ?? photos[0];
  const heroDetail = photos.find((photo) => photo.src !== heroMain.src) ?? heroMain;
  return (
    <main className="photos-page">
      <header className="site-header photos-header">
        <Link className="brand" href="/#inicio" aria-label="Voltar ao início"><span className="brand-mark"><Home size={18} /></span><span>{config.brandLabel}</span></Link>
        <nav aria-label="Navegação principal">{config.giftsEnabled && <Link href="/#presentes">Presentes</Link>}{config.pixEnabled && <Link href="/#pix">Pix</Link>}{config.projectPageEnabled && <Link href="/projeto">O projeto</Link>}<Link className="current" href="/fotos">Fotos</Link></nav>
      </header>

      <section className="couple-hero">
        <div className="couple-hero-copy">
          <Link className="back-link" href="/"><ArrowLeft size={17} /> Voltar para a lista</Link>
          <p className="eyebrow">{config.coupleNames}</p>
          <h1>Nossa história<br />em fotos</h1>
          <p>Entre aventuras, celebrações e muitos momentos especiais, chegamos ao começo de um novo capítulo: a construção do nosso lar.</p>
        </div>
        <div className="couple-hero-collage">
          <img className="couple-hero-main" src={heroMain.src} alt={heroMain.alt} loading="eager" decoding="async" fetchPriority="high" referrerPolicy="no-referrer" />
          <img className="couple-hero-detail" src={heroDetail.src} alt={heroDetail.alt} loading="eager" decoding="async" referrerPolicy="no-referrer" />
          <span><Heart size={15} fill="currentColor" /> O nosso novo começo</span>
        </div>
      </section>

      <section className="couple-gallery-section">
        <div className="couple-gallery-heading"><p className="eyebrow">Um pouco de nós</p><h2>Memórias que trouxeram a gente até aqui</h2><p>Clique em uma foto para vê-la por inteiro.</p></div>
        <div className="couple-gallery">{photos.map((photo) => <PhotoCard key={photo.src} photo={photo} />)}</div>
      </section>

      <section className="photos-cta"><Heart fill="currentColor" /><h2>Agora vocês também fazem parte dessa história.</h2><p>Cada presente e cada mensagem ajudam a construir este novo começo.</p><Link href="/#presentes">Ver a lista de presentes</Link></section>

      <footer><div className="footer-heart"><Heart fill="currentColor" /></div><p>{config.footerMessage}</p><small>{config.coupleNames}</small><Link className="admin-lock-link" href="/admin" aria-label="Acessar área administrativa" title="Área administrativa"><Lock size={14} /></Link></footer>
    </main>
  );
}
