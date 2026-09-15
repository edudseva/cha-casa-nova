"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Check, DoorOpen, ShieldCheck, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AccountInvitation, AccountMembership } from "@/lib/account-access";

const roleLabels: Record<string, string> = { owner: "Responsável principal", editor: "Administrador", viewer: "Somente leitura" };
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export function AccountAccessPanel({
  displayName, email, signOutPath, initialMemberships, initialInvitations,
}: {
  displayName: string; email: string; signOutPath: string;
  initialMemberships: AccountMembership[]; initialInvitations: AccountInvitation[];
}) {
  const [memberships, setMemberships] = useState(initialMemberships);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [working, setWorking] = useState<number | null>(null);

  async function updateInvitation(id: number, action: "accept" | "decline") {
    setWorking(id);
    try {
      const response = await fetch("/api/conta/convites", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action }), signal: AbortSignal.timeout(8_000),
      });
      const result = await response.json() as { memberships?: AccountMembership[]; invitations?: AccountInvitation[]; error?: string };
      if (!response.ok || !result.memberships || !result.invitations) throw new Error(result.error ?? "Não foi possível atualizar o convite.");
      setMemberships(result.memberships); setInvitations(result.invitations);
      toast.success(action === "accept" ? "Convite aceito. Seu acesso está ativo." : "Convite recusado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o convite.");
    } finally { setWorking(null); }
  }

  return <main className="admin-page account-page">
    <header className="admin-header">
      <Link className="brand" href="/"><span className="brand-mark"><UserRound /></span><span><small>Identidade e acessos</small>Minha conta</span></Link>
      <Button asChild variant="outline"><a href={signOutPath}><DoorOpen /> Sair da conta</a></Button>
    </header>
    <section className="admin-shell account-shell">
      <div className="account-profile-card"><span><UserRound /></span><div><p className="eyebrow">Conta autenticada</p><h1>{displayName}</h1><p>{email}</p></div><Badge><ShieldCheck /> Sessão protegida</Badge></div>

      <section className="account-section">
        <div className="account-section-heading"><div><p className="eyebrow">Ação necessária</p><h2>Convites recebidos</h2></div><span>{invitations.length} pendente{invitations.length === 1 ? "" : "s"}</span></div>
        <div className="account-list">
          {invitations.map((invitation) => <article key={invitation.id}>
            <div><strong>{invitation.siteName}</strong><span>{roleLabels[invitation.role] ?? invitation.role}</span><small><CalendarClock /> Expira em {date.format(new Date(`${invitation.expiresAt.replace(" ", "T")}Z`))}</small></div>
            {invitation.status === "pending" ? <div className="account-actions"><Button disabled={working === invitation.id} onClick={() => void updateInvitation(invitation.id, "accept")}><Check /> Aceitar</Button><Button variant="outline" disabled={working === invitation.id} onClick={() => void updateInvitation(invitation.id, "decline")}><X /> Recusar</Button></div> : <Badge variant="secondary">Expirado</Badge>}
          </article>)}
          {!invitations.length && <p className="account-empty">Você não possui convites pendentes.</p>}
        </div>
      </section>

      <section className="account-section">
        <div className="account-section-heading"><div><p className="eyebrow">Seus acessos</p><h2>Eventos vinculados</h2></div><span>{memberships.length} ativo{memberships.length === 1 ? "" : "s"}</span></div>
        <div className="account-list">
          {memberships.map((membership) => <article key={membership.id}><div><strong>{membership.siteName}</strong><span>{roleLabels[membership.role] ?? membership.role}</span><small>Identificador: {membership.siteSlug}</small></div><Button asChild variant="outline"><Link href="/admin">Abrir painel</Link></Button></article>)}
          {!memberships.length && <p className="account-empty">Nenhum evento está vinculado à sua conta. Aceite um convite válido para começar.</p>}
        </div>
      </section>
    </section>
  </main>;
}
