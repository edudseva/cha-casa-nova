import type { Metadata } from "next";
import { ArrowLeft, Heart, Home, Lock, Maximize2 } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Nossa história | Chá de Casa Nova",
  description: "Um pouco da história de Ana e Eduardo em fotos.",
};

const photos = [
  { src: "/photos/festa-junina.jpeg", alt: "Ana e Eduardo juntos em uma festa junina", label: "Celebrando juntos", featured: true },
  { src: "/photos/aventura.jpeg", alt: "Ana e Eduardo em uma aventura na natureza", label: "Nossas aventuras" },
  { src: "/photos/ana-e-gatinha.jpeg", alt: "Ana abraçada com a gatinha do casal", label: "Muito carinho" },
  { src: "/photos/nossa-familia.jpeg", alt: "Ana e Eduardo com a gatinha e os cachorros", label: "Nossa família" },
  { src: "/photos/carnaval-brasilia.jpeg", alt: "Ana e Eduardo juntos em Brasília", label: "Dias de alegria" },
  { src: "/photos/nos-dois.jpeg", alt: "Ana e Eduardo juntos", label: "Nós dois" },
  { src: "/photos/dia-especial.jpeg", alt: "Ana e Eduardo vestidos para uma ocasião especial", label: "Momentos especiais" },
  { src: "/photos/machu-picchu-1.jpeg", alt: "Ana e Eduardo em Machu Picchu", label: "Conhecendo o mundo", featured: true },
  { src: "/photos/machu-picchu-2.jpeg", alt: "Ana e Eduardo sentados em Machu Picchu", label: "Memórias para sempre" },
  { src: "/photos/celebracao.jpeg", alt: "Ana e Eduardo juntos em uma comemoração", label: "Sempre juntos" },
];

function PhotoCard({ photo }: { photo: (typeof photos)[number] }) {
  return (
    <a className={`couple-photo ${photo.featured ? "couple-photo-featured" : ""}`} href={photo.src} target="_blank" rel="noopener noreferrer" aria-label={`Abrir foto: ${photo.label}`}>
      <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
      <span className="couple-photo-caption"><span>{photo.label}</span><Maximize2 size={16} aria-hidden="true" /></span>
    </a>
  );
}

export default function PhotosPage() {
  return (
    <main className="photos-page">
      <header className="site-header photos-header">
        <Link className="brand" href="/#inicio" aria-label="Voltar ao início"><span className="brand-mark"><Home size={18} /></span><span>Nosso cantinho</span></Link>
        <nav aria-label="Navegação principal"><Link href="/#presentes">Presentes</Link><Link href="/#pix">Pix</Link><Link href="/projeto">O projeto</Link><Link className="current" href="/fotos">Fotos</Link></nav>
      </header>

      <section className="couple-hero">
        <div className="couple-hero-copy">
          <Link className="back-link" href="/"><ArrowLeft size={17} /> Voltar para a lista</Link>
          <p className="eyebrow">Ana & Eduardo</p>
          <h1>Nossa história<br />em fotos</h1>
          <p>Entre aventuras, celebrações e muitos momentos especiais, chegamos ao começo de um novo capítulo: a construção do nosso lar.</p>
        </div>
        <div className="couple-hero-collage">
          <img className="couple-hero-main" src="/photos/machu-picchu-2.jpeg" alt="Ana e Eduardo juntos em Machu Picchu" loading="eager" decoding="async" fetchPriority="high" />
          <img className="couple-hero-detail" src="/photos/ana-e-gatinha.jpeg" alt="Ana com a gatinha do casal" loading="eager" decoding="async" />
          <span><Heart size={15} fill="currentColor" /> O nosso novo começo</span>
        </div>
      </section>

      <section className="couple-gallery-section">
        <div className="couple-gallery-heading"><p className="eyebrow">Um pouco de nós</p><h2>Memórias que trouxeram a gente até aqui</h2><p>Clique em uma foto para vê-la por inteiro.</p></div>
        <div className="couple-gallery">{photos.map((photo) => <PhotoCard key={photo.src} photo={photo} />)}</div>
      </section>

      <section className="photos-cta"><Heart fill="currentColor" /><h2>Agora vocês também fazem parte dessa história.</h2><p>Cada presente e cada mensagem ajudam a construir este novo começo.</p><Link href="/#presentes">Ver a lista de presentes</Link></section>

      <footer><div className="footer-heart"><Heart fill="currentColor" /></div><p>Obrigado por fazer parte do começo da nossa casa.</p><small>Ana & Eduardo</small><Link className="admin-lock-link" href="/admin" aria-label="Acessar área administrativa" title="Área administrativa"><Lock size={14} /></Link></footer>
    </main>
  );
}
