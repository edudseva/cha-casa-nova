import Link from "next/link";
import { getChatGPTUser, chatGPTSignInPath } from "@/app/chatgpt-auth";
import { commercialCatalog } from "@/lib/commercial";
import { CommercialActions } from "./commercial-actions";

export const dynamic = "force-dynamic";

export default async function ProductPage() {
  const [catalog, user] = await Promise.all([commercialCatalog(), getChatGPTUser()]);
  return <main className="commercial-page">
    <nav className="commercial-nav"><Link href="/">← Voltar ao evento</Link><span>Plataforma de eventos <b>· Homologação privada</b></span></nav>
    <div className="commercial-wrap">
      <header className="commercial-hero"><p className="commercial-kicker">Uma experiência para cada celebração</p><h1>{catalog.settings.headline}</h1><p>{catalog.settings.description}</p><span className="commercial-notice">Apresentação em homologação. Nenhuma cobrança ou ativação de site é feita nesta etapa.</span></header>
      <section aria-labelledby="plans-heading"><div className="commercial-section-heading"><p className="commercial-kicker">Escolha seu formato</p><h2 id="plans-heading">Planos em preparação</h2><p>Os valores abaixo só aparecem após configuração; pedidos não geram cobrança nesta versão.</p></div>
        <div className="commercial-plans">{catalog.plans.map((plan) => <article key={plan.id} className="commercial-plan"><span className="commercial-plan-icon">✦</span><h3>{plan.name}</h3><p className="commercial-price">{plan.price_cents > 0 ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(plan.price_cents / 100) : "Preço a definir"}</p><ul><li>Até {plan.max_sites} {plan.max_sites === 1 ? "site" : "sites"}</li><li>Até {plan.max_members} membros</li><li>Até {plan.max_gifts} presentes e {plan.max_gallery_images} fotos</li><li>{plan.custom_domain_enabled ? "Domínio personalizado sujeito à ativação" : "Endereço da plataforma"}</li></ul><a className="commercial-inline" href="#solicitar">Solicitar informações →</a></article>)}</div>
      </section>
      <section id="solicitar" className="commercial-request"><div><p className="commercial-kicker">Seu próximo passo</p><h2>Conte com a gente para começar</h2><p>O teste é uma solicitação para acompanhamento. A liberação efetiva do site dependerá da implantação comercial e de confirmação da equipe.</p></div>{user ? <CommercialActions plans={catalog.plans} days={catalog.settings.trial_days} /> : <Link className="commercial-button" href={chatGPTSignInPath("/produto#solicitar")}>Entrar para solicitar</Link>}</section>
      <section className="commercial-disclosures" aria-label="Informações da operação"><article><h2>Termos e privacidade</h2><p>Os documentos contratuais estão em revisão. Nenhum pedido nesta homologação constitui contratação ou aceite definitivo. Antes da oferta pública, termos, privacidade e tratamento de dados serão disponibilizados em versão aprovada.</p></article><article><h2>Cancelamento e suporte</h2><p>Solicitações de teste e contratação podem ser canceladas pela própria conta. Dúvidas podem ser registradas no painel de solicitações abaixo.</p>{catalog.settings.sales_email && <p>Contato: <a href={`mailto:${catalog.settings.sales_email}`}>{catalog.settings.sales_email}</a></p>}</article></section>
      <footer className="commercial-footer">Homologação privada · <Link href="/plataforma">Área do proprietário</Link></footer>
    </div>
  </main>;
}
