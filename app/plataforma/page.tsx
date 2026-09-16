import Link from "next/link";
import { Building2, Home, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requirePlatformOwnerPage } from "@/lib/platform-access";
import { loadPlatformWorkspace } from "@/lib/platform-workspace";
import { loadOwnerWorkspace } from "@/lib/platform-owner";
import { loadSiteConfig } from "@/lib/runtime-config";
import { OwnerConsole } from "./owner-console";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const user = await requirePlatformOwnerPage();
  if (!user) return <main className="admin-denied"><ShieldCheck size={34} /><h1>Acesso do proprietário</h1><p>Esta área administra a plataforma, os sites e as permissões.</p><Link href="/">Voltar ao site</Link></main>;

  const config = await loadSiteConfig();
  const owner = await loadOwnerWorkspace(user, config.eventTitle, config.coupleNames);
  const access = await loadPlatformWorkspace(user, config.eventTitle, config.coupleNames);

  return <main className="platform-page owner-page">
    <header className="admin-header">
      <Link className="brand" href="/"><span className="brand-mark"><Building2 size={18} /></span><span><small>Visão do proprietário</small>Plataforma de eventos</span></Link>
      <div><span className="admin-user"><strong>{user.displayName}</strong><small>Proprietário</small></span><Button asChild variant="outline"><Link href="/conta"><UserRound /> Conta</Link></Button><Button asChild variant="outline"><Link href="/admin"><Home /> Painel do evento</Link></Button></div>
    </header>
    <section className="platform-shell">
      <div className="platform-heading-row"><div className="platform-heading"><p className="eyebrow">Operação da plataforma</p><h1>Central do proprietário</h1><p>Controle clientes, sites, planos e atendimento em um único lugar.</p><p><Link className="commercial-inline" href="/plataforma/comercial">Abrir operação comercial →</Link></p></div><span className="platform-context-pill"><ShieldCheck /> Acesso reservado</span></div>
      <OwnerConsole initial={owner} legacySites={access.siteRows} />
    </section>
  </main>;
}
