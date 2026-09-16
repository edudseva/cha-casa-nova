"use client";

import { FormEvent, useState } from "react";
import { Activity, Archive, Building2, Download, Globe2, Headset, LayoutTemplate, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { OwnerWorkspace, OwnerPlan, OwnerSite, OwnerClient } from "@/lib/platform-owner";
import { PlatformSites } from "./platform-sites";
import { PlatformMembers } from "./platform-members";
import type { PlatformSite } from "@/lib/platform-workspace";

const formatDate = (value: string | null) => value ? new Date(`${value.replace(" ", "T")}Z`).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Ainda não realizada";

const statusName: Record<string, string> = { active: "Ativo", draft: "Em configuração", pending: "Pendente", healthy: "Saudável", attention: "Atenção", scheduled: "Programada", cancelled: "Cancelada", ended: "Encerrada", expired: "Expirada" };

function Status({ value }: { value: string }) {
  return <span className={`owner-status owner-status-${value}`}>{statusName[value] ?? value}</span>;
}

function PlanEditor({ plan, onSave, busy }: { plan: OwnerPlan; onSave: (data: Record<string, unknown>) => Promise<void>; busy: boolean }) {
  const [form, setForm] = useState(plan);
  const number = (key: keyof OwnerPlan, value: string) => setForm((previous) => ({ ...previous, [key]: Number(value) }));
  return <form className="owner-plan" onSubmit={(event) => { event.preventDefault(); void onSave({ action: "plan.update", ...form }); }}>
    <div className="owner-card-heading"><div><strong>{plan.name}</strong><small>Configurações internas do plano</small></div><Status value="active" /></div>
    <div className="owner-fields two"><label>Nome<Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={80} required /></label><label>Preço em centavos<Input type="number" min="0" value={form.priceCents} onChange={(event) => number("priceCents", event.target.value)} required /></label></div>
    <div className="owner-fields four"><label>Sites<Input type="number" min="1" value={form.maxSites} onChange={(event) => number("maxSites", event.target.value)} required /></label><label>Membros<Input type="number" min="1" value={form.maxMembers} onChange={(event) => number("maxMembers", event.target.value)} required /></label><label>Presentes<Input type="number" min="1" value={form.maxGifts} onChange={(event) => number("maxGifts", event.target.value)} required /></label><label>Fotos<Input type="number" min="1" value={form.maxGalleryImages} onChange={(event) => number("maxGalleryImages", event.target.value)} required /></label></div>
    <div className="owner-checks"><label><input type="checkbox" checked={form.customDomainEnabled} onChange={(event) => setForm({ ...form, customDomainEnabled: event.target.checked })} /> Domínio personalizado</label><label><input type="checkbox" checked={form.exportsEnabled} onChange={(event) => setForm({ ...form, exportsEnabled: event.target.checked })} /> Exportação</label></div>
    <Button type="submit" disabled={busy} variant="outline">Salvar limites</Button>
  </form>;
}

function ClientEditor({ client, onSave, busy }: { client: OwnerClient; onSave: (data: Record<string, unknown>) => Promise<void>; busy: boolean }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email);
  return <div className="owner-client-item">
    {editing ? <form className="owner-client-edit" onSubmit={(event) => { event.preventDefault(); void onSave({ action: "client.update", id: client.id, name, email }).then(() => setEditing(false)); }}><label>Nome<Input value={name} onChange={(event) => setName(event.target.value)} required /></label><label>E-mail<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><Button type="submit" disabled={busy}>Salvar</Button><Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button></form> : <><div><strong>{client.name}</strong><small>{client.email}</small></div><span>{client.sites} {client.sites === 1 ? "site" : "sites"}</span><Button variant="ghost" onClick={() => setEditing(true)}>Editar</Button></>}
  </div>;
}

function SiteRow({ site, workspace, run, busy }: { site: OwnerSite; workspace: OwnerWorkspace; run: (data: Record<string, unknown>) => Promise<void>; busy: boolean }) {
  const [clientId, setClientId] = useState(site.clientId ?? "");
  const [planId, setPlanId] = useState(site.planId ?? "");
  const [templateId, setTemplateId] = useState(site.templateId ?? "");
  const [slugConfirmation, setSlugConfirmation] = useState("");
  return <article className="owner-site-row">
    <div className="owner-card-heading"><div><strong>{site.name}</strong><small>{site.slug} · {site.coupleNames || "Responsáveis pendentes"}</small></div><Status value={site.status} /></div>
    <div className="owner-site-facts"><span><b>{site.memberCount}</b> membros</span><span><b>{site.giftCount}</b> itens em cache</span><span><b>{site.galleryCount}</b> fotos</span><span><Status value={site.healthStatus} /></span></div>
    <form className="owner-site-assign" onSubmit={(event) => { event.preventDefault(); void run({ action: "site.assign", siteId: site.id, clientId, planId, templateId }); }}>
      <label>Cliente<select value={clientId} onChange={(event) => setClientId(event.target.value)}><option value="">Não vinculado</option>{workspace.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
      <label>Plano<select value={planId} onChange={(event) => setPlanId(event.target.value)}><option value="">Não definido</option>{workspace.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
      <label>Modelo<select value={templateId} onChange={(event) => setTemplateId(event.target.value)}><option value="">Não definido</option>{workspace.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
      <Button disabled={busy} type="submit" variant="outline">Salvar vínculo</Button>
    </form>
    <div className="owner-row-actions">
      <Button variant="outline" disabled={busy} onClick={() => void run({ action: "health.check", siteId: site.id })}><Activity /> Verificar saúde</Button>
      <Button variant="outline" asChild><a href={`/api/plataforma/exportar?siteId=${encodeURIComponent(site.id)}`}><Download /> Exportar dados</a></Button>
      {site.id !== workspace.currentSiteId && <AlertDialog><AlertDialogTrigger asChild><Button variant="outline"><Archive /> Solicitar exclusão</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Programar exclusão do site</AlertDialogTitle><AlertDialogDescription>A solicitação entra em espera por sete dias. Confirme o identificador exato: <strong>{site.slug}</strong>.</AlertDialogDescription></AlertDialogHeader><Label htmlFor={`confirm-${site.id}`}>Identificador</Label><Input id={`confirm-${site.id}`} value={slugConfirmation} onChange={(event) => setSlugConfirmation(event.target.value)} /><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction disabled={slugConfirmation !== site.slug || busy} onClick={() => void run({ action: "deletion.schedule", siteId: site.id, slug: slugConfirmation })}>Programar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
    </div>
  </article>;
}

export function OwnerConsole({ initial, legacySites }: { initial: OwnerWorkspace; legacySites: PlatformSite[] }) {
  const [workspace, setWorkspace] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [currentTime] = useState(() => Date.now());
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [domainSiteId, setDomainSiteId] = useState(initial.currentSiteId);
  const [hostname, setHostname] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateTheme, setTemplateTheme] = useState("botanical");
  const [supportSiteId, setSupportSiteId] = useState(initial.currentSiteId);
  const [supportReason, setSupportReason] = useState("");
  const [supportDetails, setSupportDetails] = useState<{ members: Record<string, unknown>[]; invitations: Record<string, unknown>[]; recentAudit: Record<string, unknown>[] } | null>(null);

  async function run(data: Record<string, unknown>) {
    setBusy(true);
    try {
      const response = await fetch("/api/plataforma/operacoes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data), signal: AbortSignal.timeout(15_000) });
      const result = await response.json() as { error?: string; workspace?: OwnerWorkspace };
      if (!response.ok || !result.workspace) throw new Error(result.error ?? "Não foi possível concluir a operação.");
      setWorkspace(result.workspace);
      toast.success("Operação registrada na auditoria.");
      if (data.action === "support.end") setSupportDetails(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível concluir a operação."); }
    finally { setBusy(false); }
  }

  async function viewSupport(siteId: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/plataforma/operacoes?supportSiteId=${encodeURIComponent(siteId)}`, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
      const result = await response.json() as { error?: string; members: Record<string, unknown>[]; invitations: Record<string, unknown>[]; recentAudit: Record<string, unknown>[] };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível consultar o suporte.");
      setSupportDetails(result);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha na consulta."); }
    finally { setBusy(false); }
  }

  return <div className="owner-console">
    <div className="owner-metrics"><article><Building2 /><span>Sites<strong>{workspace.metrics.sites}</strong></span></article><article><Users /><span>Clientes<strong>{workspace.metrics.clients}</strong></span></article><article><Globe2 /><span>Domínios ativos<strong>{workspace.metrics.domains}</strong></span></article><article><Headset /><span>Suportes abertos<strong>{workspace.metrics.supportSessions}</strong></span></article></div>
    <Tabs defaultValue="sites" className="owner-tabs">
      <TabsList aria-label="Áreas da plataforma" className="owner-tabs-list"><TabsTrigger value="sites"><Building2 /> Sites</TabsTrigger><TabsTrigger value="clientes"><Users /> Clientes</TabsTrigger><TabsTrigger value="catalogo"><LayoutTemplate /> Modelos e planos</TabsTrigger><TabsTrigger value="dominios"><Globe2 /> Domínios</TabsTrigger><TabsTrigger value="suporte"><Headset /> Suporte e dados</TabsTrigger><TabsTrigger value="acessos"><ShieldCheck /> Acessos</TabsTrigger></TabsList>
      <TabsContent value="sites" className="owner-tab-body"><section className="owner-section"><div className="owner-section-heading"><h2>Sites e operação</h2><p>Vincule o cliente, defina o plano e acompanhe o estado de cada evento.</p></div><div className="owner-site-list">{workspace.sites.map((site) => <SiteRow key={site.id} site={site} workspace={workspace} run={run} busy={busy} />)}</div></section><PlatformSites initialSites={legacySites} /></TabsContent>
      <TabsContent value="clientes" className="owner-tab-body"><section className="owner-section"><div className="owner-section-heading"><h2>Clientes</h2><p>Cadastro comercial separado dos participantes de cada evento.</p></div><form className="owner-create-form" onSubmit={(event: FormEvent) => { event.preventDefault(); void run({ action: "client.create", name: clientName, email: clientEmail }).then(() => { setClientName(""); setClientEmail(""); }); }}><label>Nome<Input value={clientName} onChange={(event) => setClientName(event.target.value)} minLength={2} maxLength={120} required /></label><label>E-mail<Input type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} required /></label><Button type="submit" disabled={busy}>Cadastrar cliente</Button></form><div className="owner-list">{workspace.clients.map((client) => <ClientEditor key={client.id} client={client} busy={busy} onSave={run} />)}</div></section></TabsContent>
      <TabsContent value="catalogo" className="owner-tab-body"><section className="owner-section"><div className="owner-section-heading"><h2>Planos e limites</h2><p>Defina limites internos. O preço só aparece aqui e não realiza cobrança automática.</p></div><div className="owner-plan-grid">{workspace.plans.map((plan) => <PlanEditor key={plan.id} plan={plan} busy={busy} onSave={run} />)}</div></section><section className="owner-section"><div className="owner-section-heading"><h2>Modelos cadastrados</h2><p>Os modelos indicam a direção visual vinculada ao site. A aplicação automática ao conteúdo será ativada em uma etapa posterior.</p></div><form className="owner-create-form owner-template-form" onSubmit={(event) => { event.preventDefault(); void run({ action: "template.create", name: templateName, description: templateDescription, previewTheme: templateTheme }).then(() => { setTemplateName(""); setTemplateDescription(""); }); }}><label>Nome<Input value={templateName} onChange={(event) => setTemplateName(event.target.value)} minLength={3} maxLength={80} required /></label><label>Direção visual<select value={templateTheme} onChange={(event) => setTemplateTheme(event.target.value)}><option value="botanical">Botânico</option><option value="classic">Clássico</option><option value="contemporary">Contemporâneo</option></select></label><label>Descrição<Input value={templateDescription} onChange={(event) => setTemplateDescription(event.target.value)} maxLength={300} /></label><Button disabled={busy}>Cadastrar modelo</Button></form><div className="owner-template-grid">{workspace.templates.map((template) => <article key={template.id} className={`owner-template owner-template-${template.previewTheme}`}><LayoutTemplate /><strong>{template.name}</strong><p>{template.description}</p></article>)}</div></section></TabsContent>
      <TabsContent value="dominios" className="owner-tab-body"><section className="owner-section"><div className="owner-section-heading"><h2>Domínios</h2><p>Registre solicitações e acompanhe a preparação. A ativação depende de verificação DNS e configuração de hospedagem.</p></div><form className="owner-create-form" onSubmit={(event) => { event.preventDefault(); void run({ action: "domain.register", siteId: domainSiteId, hostname }).then(() => setHostname("")); }}><label>Site<select value={domainSiteId} onChange={(event) => setDomainSiteId(event.target.value)}>{workspace.sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label><label>Domínio<Input value={hostname} onChange={(event) => setHostname(event.target.value)} placeholder="evento.exemplo.com.br" required /></label><Button disabled={busy}>Registrar domínio</Button></form><div className="owner-list">{workspace.domains.length ? workspace.domains.map((domain) => <div key={domain.id}><div><strong>{domain.hostname}</strong><small>{domain.siteName} · Sem alteração de DNS pelo painel</small></div><Status value={domain.status} />{domain.status === "pending" && <Button disabled={busy} variant="ghost" onClick={() => void run({ action: "domain.remove", siteId: domain.siteId, id: String(domain.id) })}>Remover</Button>}</div>) : <p className="owner-empty">Nenhum domínio solicitado.</p>}</div></section></TabsContent>
      <TabsContent value="suporte" className="owner-tab-body"><section className="owner-section"><div className="owner-section-heading"><h2>Suporte auditado</h2><p>Abra uma consulta com motivo registrado e acesso somente de leitura por 30 minutos.</p></div><form className="owner-support-form" onSubmit={(event) => { event.preventDefault(); void run({ action: "support.start", siteId: supportSiteId, reason: supportReason }).then(() => setSupportReason("")); }}><label>Site<select value={supportSiteId} onChange={(event) => setSupportSiteId(event.target.value)}>{workspace.sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label><label>Motivo<Textarea value={supportReason} onChange={(event) => setSupportReason(event.target.value)} minLength={10} maxLength={300} placeholder="Descreva o atendimento solicitado" required /></label><Button disabled={busy}>Abrir sessão</Button></form><div className="owner-list">{workspace.supportSessions.length ? workspace.supportSessions.map((session) => <div key={session.id}><div><strong>{session.siteName}</strong><small>{session.reason} · {formatDate(session.createdAt)} · termina {formatDate(session.expiresAt)}</small></div><Status value={session.status} />{session.status === "active" && <div className="owner-inline-actions"><Button variant="outline" disabled={busy} onClick={() => void viewSupport(session.siteId)}>Consultar</Button><Button variant="ghost" disabled={busy} onClick={() => void run({ action: "support.end", id: session.id })}>Encerrar</Button></div>}</div>) : <p className="owner-empty">Nenhuma sessão registrada.</p>}</div>{supportDetails && <div className="owner-support-data"><h3>Consulta da sessão</h3><p>{supportDetails.members.length} membros · {supportDetails.invitations.length} convites · {supportDetails.recentAudit.length} ações recentes</p><div>{supportDetails.members.map((member, index) => <p key={index}><strong>{String(member.display_name || member.email)}</strong> · {String(member.role)} · {String(member.status)}</p>)}</div></div>}</section><section className="owner-section"><div className="owner-section-heading"><h2>Exportação e exclusão</h2><p>O download de cada site está na aba Sites. A chave Pix não integra o arquivo exportado.</p></div><div className="owner-list">{workspace.deletionRequests.length ? workspace.deletionRequests.map((request) => <div key={request.id}><div><strong>{request.siteName}</strong><small>Solicitada em {formatDate(request.createdAt)} · prazo {formatDate(request.scheduledFor)}</small></div><Status value={request.status} />{request.status === "scheduled" && <Button variant="outline" disabled={busy} onClick={() => void run({ action: "deletion.cancel", id: request.id })}>Cancelar</Button>}{request.status === "scheduled" && new Date(request.scheduledFor.replace(" ", "T") + "Z").getTime() <= currentTime && <Button variant="destructive" disabled={busy} onClick={() => { const slug = window.prompt("Digite o identificador do site para concluir a exclusão definitiva:"); if (slug) void run({ action: "deletion.execute", id: request.id, slug }); }}>Concluir exclusão</Button>}</div>) : <p className="owner-empty">Nenhuma exclusão solicitada.</p>}</div></section></TabsContent>
      <TabsContent value="acessos" className="owner-tab-body"><PlatformMembers siteId={workspace.currentSiteId} initialMembers={workspace.members} initialInvitations={workspace.invitations} /><section className="owner-section"><div className="owner-section-heading"><h2>Auditoria recente</h2><p>Registros de alterações, consultas e operações administrativas.</p></div><div className="owner-audit-list">{workspace.audits.map((entry) => <div key={entry.id}><span><SlidersHorizontal /> {entry.action}</span><small>{entry.actorEmail} · {formatDate(entry.createdAt)}</small></div>)}</div></section></TabsContent>
    </Tabs>
  </div>;
}
