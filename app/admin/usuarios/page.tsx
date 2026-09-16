import Link from "next/link";
import { ArrowLeft, Home, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAdminPageAccess } from "@/lib/admin-auth";
import { loadEventMembers } from "@/lib/event-members";
import { CURRENT_SITE_ID } from "@/lib/site-context";
import { PlatformMembers } from "@/app/plataforma/platform-members";

export const dynamic = "force-dynamic";

export default async function EventUsersPage() {
  const result = await requireAdminPageAccess("members.manage", "/admin/usuarios");
  if (!result) {
    return <main className="admin-denied"><UsersRound size={34} /><h1>Acesso restrito</h1><p>Somente o responsável principal pode gerenciar os acessos deste evento.</p><Link href="/admin">Voltar ao painel</Link></main>;
  }

  const access = await loadEventMembers(CURRENT_SITE_ID);
  return <main className="admin-page">
    <header className="admin-header">
      <Link className="brand" href="/"><span className="brand-mark"><Home size={18} /></span><span><small>Painel do evento</small>Nosso cantinho</span></Link>
      <Button asChild variant="outline"><Link href="/admin"><ArrowLeft /> Voltar ao painel</Link></Button>
    </header>
    <section className="admin-shell admin-users-shell">
      <div className="admin-heading-row"><div className="admin-heading"><p className="eyebrow">Equipe do evento</p><h1>Usuários e acessos</h1><p>Defina quem pode administrar o site e quem terá acesso somente para consulta.</p></div><span className="admin-context-pill"><UsersRound /> Controle de acesso</span></div>
      <PlatformMembers siteId={CURRENT_SITE_ID} initialMembers={access.members} initialInvitations={access.invitations} endpoint="/api/admin/membros" compact />
    </section>
  </main>;
}
