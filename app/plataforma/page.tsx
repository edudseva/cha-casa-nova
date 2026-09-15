import Link from "next/link";
import { Building2, CheckCircle2, ExternalLink, Home, Palette, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requirePlatformOwnerPage } from "@/lib/platform-access";
import { loadPlatformWorkspace } from "@/lib/platform-workspace";
import { loadPixAdminConfig, loadSiteConfig } from "@/lib/runtime-config";
import { PlatformMembers } from "./platform-members";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const user = await requirePlatformOwnerPage();
  if (!user) {
    return <main className="admin-denied"><ShieldCheck size={34} /><h1>Acesso do proprietário</h1><p>Esta área administra a plataforma, os sites e as permissões.</p><Link href="/">Voltar ao site</Link></main>;
  }

  const [config, pix] = await Promise.all([loadSiteConfig(), loadPixAdminConfig()]);
  const workspace = await loadPlatformWorkspace(user, config.eventTitle);

  return <main className="platform-page">
    <header className="admin-header">
      <Link className="brand" href="/"><span className="brand-mark"><Building2 size={18} /></span><span>Plataforma de eventos</span></Link>
      <div><span>{user.displayName}</span><Button asChild variant="outline"><Link href="/admin"><Home /> Painel do evento</Link></Button></div>
    </header>

    <section className="platform-shell">
      <div className="platform-heading"><p className="eyebrow">Visão do proprietário</p><h1>Central da plataforma</h1><p>Administre os sites e mantenha separadas as configurações que pertencem à plataforma e ao casal.</p></div>

      <div className="platform-metrics">
        <article><Building2 /><p><strong>{workspace.sites}</strong><span>site ativo</span></p></article>
        <article><Users /><p><strong>{workspace.members}</strong><span>proprietário ativo</span></p></article>
        <article><CheckCircle2 /><p><strong>{workspace.confirmedGifts}</strong><span>presentes confirmados</span></p></article>
        <article><CheckCircle2 /><p><strong>{workspace.confirmedPix}</strong><span>Pix confirmados</span></p></article>
      </div>

      <div className="platform-grid">
        <article className="platform-site-card">
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

        <aside className="platform-role-card">
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
    </section>
  </main>;
}
