"use client";

import { FormEvent, useMemo, useState } from "react";
import { CalendarDays, CirclePlus, Globe2, Mail, Settings2, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PlatformSite } from "@/lib/platform-workspace";

type SitesResult = { sites: PlatformSite[]; siteId?: string; error?: string };

const eventLabels: Record<string, string> = {
  "cha-de-panela": "Chá de panela",
  casamento: "Casamento",
  "cha-revelacao": "Chá revelação",
  aniversario: "Aniversário",
  outro: "Outro evento",
};

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

export function PlatformSites({ initialSites }: { initialSites: PlatformSite[] }) {
  const [sites, setSites] = useState(initialSites);
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [name, setName] = useState("");
  const [coupleNames, setCoupleNames] = useState("");
  const [eventType, setEventType] = useState("cha-de-panela");
  const [eventDate, setEventDate] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const draftCount = useMemo(() => sites.filter((site) => site.status === "draft").length, [sites]);

  function updateName(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  function resetForm() {
    setName(""); setCoupleNames(""); setEventType("cha-de-panela"); setEventDate("");
    setSlug(""); setSlugEdited(false); setOwnerEmail("");
  }

  async function createSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    try {
      const response = await fetch("/api/plataforma/sites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, coupleNames, eventType, eventDate, slug, ownerEmail }),
        signal: AbortSignal.timeout(10_000),
      });
      const result = await response.json() as SitesResult;
      if (!response.ok) throw new Error(result.error ?? "Não foi possível criar o site.");
      setSites(result.sites);
      setOpen(false);
      resetForm();
      toast.success("Estrutura do novo site criada em homologação.");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o site.");
    } finally {
      setWorking(false);
    }
  }

  return <section className="platform-sites-card">
    <div className="platform-sites-heading">
      <div><p className="eyebrow">Portfólio de eventos</p><h2>Sites cadastrados</h2><p>Crie a estrutura inicial de cada cliente antes de configurar conteúdo, presentes e publicação.</p></div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button><CirclePlus /> Novo site</Button></DialogTrigger>
        <DialogContent className="platform-create-dialog">
          <DialogHeader><DialogTitle>Criar novo site de evento</DialogTitle><DialogDescription>Esta etapa cria somente uma estrutura privada em homologação. Nenhum domínio público será alterado.</DialogDescription></DialogHeader>
          <form onSubmit={createSite} className="platform-create-form">
            <div className="platform-form-wide"><Label htmlFor="site-name">Nome do evento</Label><Input id="site-name" value={name} onChange={(event) => updateName(event.target.value)} maxLength={100} placeholder="Chá de casa nova de Ana e Eduardo" required /></div>
            <div><Label htmlFor="couple-names">Nomes dos responsáveis</Label><Input id="couple-names" value={coupleNames} onChange={(event) => setCoupleNames(event.target.value)} maxLength={100} placeholder="Ana & Eduardo" required /></div>
            <div><Label>Tipo de evento</Label><Select value={eventType} onValueChange={(value) => value && setEventType(value)}><SelectTrigger aria-label="Tipo de evento"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cha-de-panela">Chá de panela</SelectItem><SelectItem value="casamento">Casamento</SelectItem><SelectItem value="cha-revelacao">Chá revelação</SelectItem><SelectItem value="aniversario">Aniversário</SelectItem><SelectItem value="outro">Outro evento</SelectItem></SelectContent></Select></div>
            <div><Label htmlFor="event-date">Data do evento <span>(opcional)</span></Label><Input id="event-date" type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></div>
            <div><Label htmlFor="site-slug">Identificador do site</Label><Input id="site-slug" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(slugify(event.target.value)); }} minLength={3} maxLength={48} placeholder="ana-e-eduardo" required /><small>Use letras, números e hífens. O domínio será definido apenas na publicação.</small></div>
            <div className="platform-form-wide"><Label htmlFor="owner-email">Administrador inicial <span>(opcional)</span></Label><Input id="owner-email" type="email" autoComplete="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} maxLength={254} placeholder="cliente@exemplo.com" /><small>Se informado, um convite interno válido por sete dias será criado junto com o site.</small></div>
            <div className="platform-create-actions"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={working}><Settings2 /> {working ? "Criando..." : "Criar estrutura em homologação"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>

    <div className="platform-sites-summary"><span><Globe2 /> {sites.length} cadastrados</span><span><Settings2 /> {draftCount} em configuração</span></div>
    <div className="platform-sites-list">
      {sites.map((site) => <article key={site.id} className={`platform-site-row platform-site-${site.status}`}>
        <div className="platform-site-title"><div><strong>{site.name}</strong><span>{site.coupleNames || "Responsáveis ainda não informados"}</span></div><Badge variant={site.status === "active" ? "default" : "secondary"}>{site.status === "active" ? "Ativo" : "Rascunho"}</Badge></div>
        <dl><div><dt>Tipo</dt><dd>{eventLabels[site.eventType] ?? "Outro evento"}</dd></div><div><dt>Data</dt><dd>{site.eventDate ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${site.eventDate}T12:00:00Z`)) : "A definir"}</dd></div><div><dt>Identificador</dt><dd>{site.slug}</dd></div></dl>
        <footer><span><UsersRound /> Estrutura de acessos criada</span><span><CalendarDays /> {site.onboardingStatus === "started" ? "Configuração iniciada" : site.status === "active" ? "Configuração atual" : "Aguardando configuração"}</span>{site.status === "draft" && <span><Mail /> Ainda não publicado</span>}</footer>
      </article>)}
    </div>
  </section>;
}
