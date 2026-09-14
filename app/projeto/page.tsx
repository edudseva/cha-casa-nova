import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Heart, Home, Lock } from "lucide-react";
import Link from "next/link";
import { loadProjectGallery } from "@/lib/project-gallery";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "O projeto | Chá de Casa Nova",
  description: "Conheça os ambientes e as cores que inspiram o novo lar de Ana e Eduardo.",
};

export default async function ProjectPage() {
  const gallery = await loadProjectGallery();
  const featured = gallery.find((room) => room.featured && room.projectImage) ?? gallery.find((room) => room.projectImage) ?? gallery[0];
  const roomComparisons = gallery.filter((room) => room.currentImage && room.projectImage);
  const rooms = gallery.filter((room) => room.projectImage && room !== featured);
  return (
    <main className="project-page">
      <header className="site-header project-header">
        <Link className="brand" href="/#inicio" aria-label="Voltar ao início"><span className="brand-mark"><Home size={18} /></span><span>Nosso cantinho</span></Link>
        <nav aria-label="Navegação principal"><Link href="/#presentes">Presentes</Link><Link href="/#pix">Pix</Link><Link className="current" href="/projeto">O projeto</Link><Link href="/fotos">Fotos</Link></nav>
      </header>

      <section className="project-page-hero">
        <div className="project-page-copy">
          <Link className="back-link" href="/"><ArrowLeft size={17} /> Voltar ao início</Link>
          <p className="eyebrow">Nosso projeto tomando forma</p>
          <h1>Um lar pensado<br />em cada detalhe</h1>
          <p>Madeira, terracota, tons de areia e verde oliva conectam os ambientes do nosso novo cantinho.</p>
        </div>
        <figure className="project-page-featured">
          <img src={featured.projectImage ?? featured.currentImage ?? "/project/sala.jpeg"} alt={`Projeto do ambiente ${featured.room}`} loading="eager" decoding="async" fetchPriority="high" referrerPolicy="no-referrer" />
          <figcaption><Heart size={15} fill="currentColor" /> {featured.room}</figcaption>
        </figure>
      </section>

      {roomComparisons.length > 0 && (
        <section className="project-before-after" aria-labelledby="before-after-title">
          <div className="project-rooms-heading">
            <p className="eyebrow">Do espaço real ao projeto</p>
            <h2 id="before-after-title">O começo e o que estamos construindo</h2>
            <p className="project-section-intro">Cada ambiente lado a lado: como recebemos o apartamento e como imaginamos o nosso novo lar.</p>
          </div>
          <div className="project-comparison-grid">
            {roomComparisons.map((comparison, index) => (
              <article key={`${comparison.room}-${index}`} className="project-comparison-card">
                <header><span>{comparison.room}</span></header>
                <div className="project-comparison-images">
                  <figure><img src={comparison.currentImage!} alt={`Foto atual do ambiente ${comparison.room}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" /><figcaption>Como é hoje</figcaption></figure>
                  <figure><img src={comparison.projectImage!} alt={`Projeto do ambiente ${comparison.room}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" /><figcaption>Como vai ficar</figcaption></figure>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="project-rooms">
        <div className="project-rooms-heading"><p className="eyebrow">Ambiente por ambiente</p><h2>As escolhas para o nosso cantinho</h2></div>
        <div className="project-rooms-grid">
          {rooms.map((room, index) => <figure key={`${room.room}-${index}`} className="project-room-card"><img src={room.projectImage!} alt={`Projeto do ambiente ${room.room}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" /><figcaption><span>{room.room}</span>{room.description && <p>{room.description}</p>}</figcaption></figure>)}
        </div>
      </section>

      <section className="project-page-cta"><p className="eyebrow">Faça parte desse começo</p><h2>Ajude a transformar o projeto em lar.</h2><Link href="/#presentes">Ver a lista de presentes <ArrowRight size={18} /></Link></section>

      <footer><div className="footer-heart"><Heart fill="currentColor" /></div><p>Obrigado por fazer parte do começo da nossa casa.</p><small>Ana & Eduardo</small><Link className="admin-lock-link" href="/admin" aria-label="Acessar área administrativa" title="Área administrativa"><Lock size={14} /></Link></footer>
    </main>
  );
}
