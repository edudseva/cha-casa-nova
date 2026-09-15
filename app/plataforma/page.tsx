import Link from "next/link";
import { Building2, CircleDollarSign, Clock3, ExternalLink, Gift, Home, LayoutDashboard, Palette, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requirePlatformOwnerPage } from "@/lib/platform-access";
import { loadPlatformWorkspace } from "@/lib/platform-workspace";
import { loadPixAdminConfig, loadSiteConfig } from "@/lib/runtime-config";
import { PlatformMembers } from "./platform-members";
import { PlatformSites } from "./platform-sites";

const auditLabels: Record<string, string> = {
  "site.created": "Site criado",
  "site.configuration_updated": "Configurações atualizadas",
  "reservation.status_updated": "Status de presente atualizado",
  "contribution.status_updated": "Status de contribuição atualizado",
  "invitation.created": "Convite criado",
  "invitation.cancelled": "Convite cancelado",
  "invitation.resent": "Convite reenviado",
};

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const user = await requirePlatformOwnerPage();
  if (!user) {
    return <main className="admin-denied"><ShieldCheck size={34} /><h1>Acesso do proprietário</h1><p>Esta área administra a plataforma, os sites e as permissões.</p><Link href="/">Voltar ao site</Link></main>;
  }

  const [config, pix] = await Promise.all([loadSiteConfig(), loadPixAdminConfig()]);
  const workspace = await loadPlatformWorkspace(user, config.eventTitle, config.coupleNames);

  return <main className="platform-page">
    <header className="admin-header">
      <Link className="brand" href="/"><span className="brand-mark"><Building2 size={18} /></span><span><small>Visão do proprietário</small>Plataforma de eventos</span></Link>
      <div><span className="admin-user"><strong>{user.displayName}</strong></span><Button asChild variant="outline"><Link href="/admin"><Home /> Painel do evento</Link></Button></div>
    </header>

    <section className="platform-shell">
      <div className="platform-heading-row"><div className="platform-heading"><p className="eyebrow">Visão do proprietário</p><h1>Central da plataforma</h1><p>Administre os sites e mantenha separadas as configurações que pertencem à plataforma e ao casal.</p></div><span className="platform-context-pill"><LayoutDashboard /> Operação geral</span></div>

      <div className="platform-metrics">
        <article className="platform-metric-sites"><span><Building2 /></span><p><small>Portfólio</small><strong>{workspace.sites}</strong><em>sites cadastrados</em></p></article>
        <article className="platform-metric-members"><span><Users /></span><p><small>Acessos</small><strong>{workspace.members}</strong><em>vínculos ativos</em></p></article>
        <article className="platform-metric-gifts"><span><Gift /></span><p><small>Movimentação</small><strong>{workspace.confirmedGifts}</strong><em>presentes confirmados</em></p></article>
        <article className="platform-metric-pix"><span><CircleDollarSign /></span><p><small>Financeiro</small><strong>{workspace.confirmedPix}</strong><em>Pix confirmados</em></p></article>
      </div>

      <PlatformSites initialSites={workspace.siteRows} />

      <div className="platform-grid">
        <article className="platform-site-card platform-featured-card">
          <div className="platform-card-top"><span className="platform-status">Homologação</span><span>Ativo</span></div>
          <h2>{config.eventTitle}</h2>
          <p>{config.coupleNames}</p>
          <dl>
            <div><dt>Configuração</dt><dd>Concluída</dd></div>
            <div><dt>Pix</dt><dd>{pix.hasKey && pix.enabled ? "Configurado" : "Pendente"}</dd></div>
            <div><dt>Identificador</dt><dd>{workspace.siteId}</dd></div>
          </dl>
          <div className="platform-actions"><Button asChild><Link href="/admin">Administrar evento <ExternalLink /></Link></Button><Button asChild variant="outline"><Link href="/admin/personalizacao"><Palette /> Personalizar</Link></Button></div>
        </article>

        <aside className="platform-role-card platform-guidance-card">
          <p className="eyebrow">Papéis separados</p>
          <h2>Controle sem confusão</h2>
          <div><ShieldCheck /><p><strong>Proprietário da plataforma</strong><span>Gerencia sites, clientes, permissões e recursos estruturais.</span></p></div>
          <div><Users /><p><strong>Administradores do evento</strong><span>Gerenciam presentes, Pix, conteúdo e aparência do próprio site.</span></p></div>
        </aside>
      </div>

      <PlatformMembers
        siteId={workspace.siteId}
        initialMembers={workspace.memberRows}
        initialInvitations={workspace.invitationRows}
      />

      <section className="platform-role-card platform-audit-card">
        <p className="eyebrow">Auditoria administrativa</p>
        <h2>Alterações recentes</h2>
        {workspace.auditRows.length ? workspace.auditRows.map((entry) => (
          <div key={entry.id}>
            <Clock3 />
            <p>
              <strong>{auditLabels[entry.action] ?? entry.action}</strong>
              <span>{entry.actorEmail} · {new Date(`${entry.createdAt.replace(" ", "T")}Z`).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
            </p>
          </div>
        )) : <p>Nenhuma alteração administrativa registrada ainda.</p>}
      </section>
    </section>
  </main>;
}
