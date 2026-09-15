"use client";

import { FormEvent, useState } from "react";
import { Clock3, MailPlus, RotateCcw, ShieldCheck, UserRoundCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlatformInvitation, PlatformMember } from "@/lib/platform-workspace";

type AccessSnapshot = { members: PlatformMember[]; invitations: PlatformInvitation[]; error?: string };

const roleLabels: Record<string, string> = {
  owner: "Responsável principal",
  editor: "Administrador",
  viewer: "Somente leitura",
};

const statusLabels: Record<string, string> = {
  pending: "Aguardando aceite",
  accepted: "Aceito",
  cancelled: "Cancelado",
  expired: "Expirado",
};

export function PlatformMembers({
  siteId,
  initialMembers,
  initialInvitations,
}: {
  siteId: string;
  initialMembers: PlatformMember[];
  initialInvitations: PlatformInvitation[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [email, setEmail] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  function applySnapshot(result: AccessSnapshot) {
    setMembers(result.members);
    setInvitations(result.invitations);
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking("invite");
    try {
      const response = await fetch("/api/plataforma/membros", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role: "editor" }),
        signal: AbortSignal.timeout(8_000),
      });
      const result = await response.json() as AccessSnapshot;
      if (!response.ok) throw new Error(result.error ?? "Não foi possível criar o convite.");
      applySnapshot(result);
      setEmail("");
      toast.success("Convite criado e válido por 7 dias.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o convite.");
    } finally {
      setWorking(null);
    }
  }

  async function updateInvitation(id: number, action: "cancel" | "resend") {
    setWorking(`${action}-${id}`);
    try {
      const response = await fetch("/api/plataforma/membros", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action }),
        signal: AbortSignal.timeout(8_000),
      });
      const result = await response.json() as AccessSnapshot;
      if (!response.ok) throw new Error(result.error ?? "Não foi possível atualizar o convite.");
      applySnapshot(result);
      toast.success(action === "cancel" ? "Convite cancelado." : "Convite renovado por 7 dias.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o convite.");
    } finally {
      setWorking(null);
    }
  }

  return <section className="platform-access-card">
    <div className="platform-access-heading">
      <div><p className="eyebrow">Acessos do evento</p><h2>Administradores e convites</h2><p>Convide quem poderá administrar este site. O acesso fica vinculado somente ao evento selecionado.</p></div>
      <span><ShieldCheck /> {siteId}</span>
    </div>

    <form className="platform-invite-form" onSubmit={invite}>
      <div><Label htmlFor="invite-email">E-mail da pessoa</Label><Input id="invite-email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@exemplo.com" required /></div>
      <Button type="submit" disabled={working === "invite"}><MailPlus /> {working === "invite" ? "Criando..." : "Criar convite"}</Button>
    </form>
    <p className="platform-invite-note"><Clock3 /> O convite expira em 7 dias. Na homologação privada, a pessoa também precisa ser liberada no acesso do ambiente antes de abrir o painel.</p>

    <div className="platform-access-grid">
      <div><h3><UserRoundCheck /> Pessoas com acesso</h3><div className="platform-access-list">
        {members.map((member) => <article key={member.id}><div><strong>{member.displayName}</strong><span>{member.email}</span></div><Badge variant="secondary">{roleLabels[member.role] ?? member.role}</Badge></article>)}
        {!members.length && <p className="platform-empty">Nenhum acesso ativo.</p>}
      </div></div>
      <div><h3><MailPlus /> Convites</h3><div className="platform-access-list">
        {invitations.map((invitation) => <article key={invitation.id}><div><strong>{invitation.email}</strong><span>{roleLabels[invitation.role] ?? invitation.role} · {statusLabels[invitation.status] ?? invitation.status}</span></div><div className="platform-invite-actions"><Badge variant={invitation.status === "pending" ? "default" : "secondary"}>{statusLabels[invitation.status] ?? invitation.status}</Badge>{invitation.status === "pending" && <Button type="button" size="sm" variant="outline" aria-label={`Cancelar convite de ${invitation.email}`} disabled={working === `cancel-${invitation.id}`} onClick={() => void updateInvitation(invitation.id, "cancel")}><X /> Cancelar</Button>}{["cancelled", "expired"].includes(invitation.status) && <Button type="button" size="sm" variant="outline" disabled={working === `resend-${invitation.id}`} onClick={() => void updateInvitation(invitation.id, "resend")}><RotateCcw /> Renovar</Button>}</div></article>)}
        {!invitations.length && <p className="platform-empty">Nenhum convite criado.</p>}
      </div></div>
    </div>
  </section>;
}
