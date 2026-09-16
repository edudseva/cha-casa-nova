"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Building2, Check, ChevronRight, CircleDollarSign, Download, Eye, Gift, Home, LayoutDashboard, Palette, RefreshCw, RotateCcw, UserRound, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Reservation = {
  id: number; gift_id: string; gift_name: string; guest_name: string; guest_contact: string;
  delivery_choice: string; order_reference: string; message: string; status: "purchased" | "cancelled"; created_at: string;
};
type Contribution = {
  id: number; guest_name: string; guest_contact: string; amount_cents: number;
  transaction_reference: string; message: string; payment_status: "declared" | "confirmed" | "rejected"; created_at: string;
};
type AdminData = { reservations: Reservation[]; contributions: Contribution[]; catalog: { total: number; reserved: number; available: number; source: string } };

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

function deliveryLabel(value: string) {
  return value === "casal" ? "Endereço do casal" : value === "convidado" ? "Convidado receberá" : "Outro endereço";
}

const roleLabels: Record<string, string> = { owner: "Responsável principal", editor: "Administrador", viewer: "Somente leitura" };

export function AdminDashboard({ displayName, role, canManage, showPlatformLink }: { displayName: string; role: string; canManage: boolean; showPlatformLink: boolean }) {
  const [data, setData] = useState<AdminData>({ reservations: [], contributions: [], catalog: { total: 0, reserved: 0, available: 0, source: "" } });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [pixFilter, setPixFilter] = useState<"declared" | "all">("declared");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin", { cache: "no-store", signal: AbortSignal.timeout(8_000) });
      const result = await response.json() as AdminData & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível carregar os dados.");
      setData(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar os dados.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const summary = useMemo(() => ({
    gifts: data.reservations.filter((item) => item.status === "purchased").length,
    declaredPix: data.contributions.filter((item) => item.payment_status === "declared").length,
    confirmedPix: data.contributions.filter((item) => item.payment_status === "confirmed").reduce((sum, item) => sum + item.amount_cents, 0),
  }), [data]);
  const visibleContributions = pixFilter === "declared" ? data.contributions.filter((item) => item.payment_status === "declared") : data.contributions;

  const guests = useMemo(() => {
    const rows = new Map<string, { key: string; name: string; contact: string; gifts: number; pix: number; interactions: number; last: string }>();
    const add = (name: string, contact: string, kind: "gift" | "pix", value: number, createdAt: string) => {
      const key = (contact.trim() || name.trim()).toLocaleLowerCase("pt-BR");
      const current = rows.get(key) ?? { key, name, contact, gifts: 0, pix: 0, interactions: 0, last: createdAt };
      current.name = current.name || name;
      current.contact = current.contact || contact;
      current.interactions += 1;
      if (kind === "gift") current.gifts += 1;
      else current.pix += value;
      if (createdAt > current.last) current.last = createdAt;
      rows.set(key, current);
    };
    data.reservations.forEach((item) => add(item.guest_name, item.guest_contact, "gift", 0, item.created_at));
    data.contributions.forEach((item) => add(item.guest_name, item.guest_contact, "pix", item.amount_cents, item.created_at));
    return [...rows.values()].sort((a, b) => b.last.localeCompare(a.last));
  }, [data]);

  async function update(kind: "reservation" | "contribution", id: number, status: string) {
    const key = `${kind}-${id}`;
    setUpdating(key);
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, id, status }), signal: AbortSignal.timeout(8_000),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível atualizar.");
      await load();
      toast.success("Situação atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    } finally { setUpdating(null); }
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link className="brand" href="/"><span className="brand-mark"><Home size={18} /></span><span><small>Painel do evento</small>Nosso cantinho</span></Link>
        <div><span className="admin-user"><strong>{displayName}</strong><small>{roleLabels[role] ?? role}</small></span><Button asChild variant="outline"><Link href="/conta"><UserRound /> Conta</Link></Button><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw /> Atualizar</Button></div>
      </header>
      <section className="admin-shell">
        <div className="admin-heading-row">
          <div className="admin-heading"><p className="eyebrow">Área privada</p><h1>Controle do chá</h1><p>Confira presentes e contribuições declaradas antes de considerar cada registro concluído.</p></div>
          <span className="admin-context-pill"><LayoutDashboard /> Visão operacional</span>
        </div>
        <div className="admin-summary">
          <article className="admin-metric admin-metric-gifts"><span className="admin-metric-icon"><Gift /></span><div><small>Presentes</small><strong>{summary.gifts}</strong><span>confirmados pelos convidados</span></div></article>
          <article className="admin-metric admin-metric-pending"><span className="admin-metric-icon"><RefreshCw /></span><div><small>Requer atenção</small><strong>{summary.declaredPix}</strong><span>Pix aguardando conferência</span></div></article>
          <article className="admin-metric admin-metric-total"><span className="admin-metric-icon"><CircleDollarSign /></span><div><small>Total conferido</small><strong>{money.format(summary.confirmedPix / 100)}</strong><span>em contribuições por Pix</span></div></article>
        </div>

        <div className="admin-section-label"><strong>Gerenciar o evento</strong><span>Conteúdo, equipe e experiência dos convidados</span></div>
        <nav className="admin-workspace-nav" aria-label="Gerenciar o evento">
          {canManage && <Link href="/admin/personalizacao"><span><Palette /></span><div><strong>Conteúdo e aparência</strong><small>Evento, páginas, fotos, lista, Pix e cores</small></div><ChevronRight /></Link>}
          {role === "owner" && <Link href="/admin/usuarios"><span><UsersRound /></span><div><strong>Usuários do evento</strong><small>Convites, perfis e revogação de acesso</small></div><ChevronRight /></Link>}
          {showPlatformLink && <Link href="/plataforma"><span><Building2 /></span><div><strong>Plataforma</strong><small>Sites e operação geral</small></div><ChevronRight /></Link>}
          <Link href="/" target="_blank" rel="noopener noreferrer"><span><Eye /></span><div><strong>Visualizar site</strong><small>Abra a experiência atual dos convidados</small></div><ChevronRight /></Link>
        </nav>

        <div className="admin-section-label"><strong>Acompanhar interações</strong><span>Confira registros e trate pendências antes de exportar</span></div>
        <Tabs defaultValue="presentes" className="admin-tabs">
          <TabsList><TabsTrigger value="presentes"><Gift /> Presentes</TabsTrigger><TabsTrigger value="pix"><CircleDollarSign /> Pix {summary.declaredPix > 0 && <span className="admin-tab-count">{summary.declaredPix}</span>}</TabsTrigger><TabsTrigger value="convidados"><UsersRound /> Convidados</TabsTrigger><TabsTrigger value="relatorios"><BarChart3 /> Relatórios</TabsTrigger></TabsList>
          <TabsContent value="presentes" className="admin-panel">
            <div className="admin-panel-heading"><div><h2>Presentes</h2><p>Desfaça uma confirmação somente quando ela tiver sido registrada por engano.</p></div><Button asChild variant="outline"><a href="/api/admin/export?type=presentes"><Download /> Exportar CSV</a></Button></div>
            <p className="admin-mobile-hint">Deslize a tabela para o lado para consultar todos os dados.</p>
            <div className="admin-table-wrap"><Table><TableHeader><TableRow><TableHead>Presente</TableHead><TableHead>Convidado</TableHead><TableHead>Entrega</TableHead><TableHead>Pedido</TableHead><TableHead>Data</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader><TableBody>
              {loading && <TableRow><TableCell colSpan={7} className="admin-empty">Carregando presentes...</TableCell></TableRow>}
              {data.reservations.map((item) => <TableRow key={item.id}><TableCell><strong>{item.gift_name}</strong>{item.message && <small>{item.message}</small>}</TableCell><TableCell>{item.guest_name}<small>{item.guest_contact || "Sem contato"}</small></TableCell><TableCell>{deliveryLabel(item.delivery_choice)}</TableCell><TableCell>{item.order_reference || "—"}</TableCell><TableCell>{date.format(new Date(`${item.created_at}Z`))}</TableCell><TableCell><Badge variant={item.status === "purchased" ? "default" : "secondary"}>{item.status === "purchased" ? "Confirmado" : "Liberado"}</Badge></TableCell><TableCell className="text-right">{canManage ? <Button size="sm" variant="outline" disabled={updating === `reservation-${item.id}`} onClick={() => void update("reservation", item.id, item.status === "purchased" ? "cancelled" : "purchased")}>{item.status === "purchased" ? <><RotateCcw /> Liberar</> : <><Check /> Restaurar</>}</Button> : <span className="admin-read-only">Somente leitura</span>}</TableCell></TableRow>)}
              {!loading && !data.reservations.length && <TableRow><TableCell colSpan={7} className="admin-empty">Nenhum presente confirmado.</TableCell></TableRow>}
            </TableBody></Table></div>
          </TabsContent>
          <TabsContent value="pix" className="admin-panel">
            <div className="admin-panel-heading"><div><h2>Contribuições por Pix</h2><p>Confira cada pagamento no banco antes de marcar como conferido.</p></div><Button asChild variant="outline"><a href="/api/admin/export?type=pix"><Download /> Exportar CSV</a></Button></div>
            <div className="admin-list-controls" role="group" aria-label="Filtrar contribuições Pix"><Button type="button" size="sm" variant={pixFilter === "declared" ? "default" : "outline"} aria-pressed={pixFilter === "declared"} onClick={() => setPixFilter("declared")}>Aguardando conferência ({summary.declaredPix})</Button><Button type="button" size="sm" variant={pixFilter === "all" ? "default" : "outline"} aria-pressed={pixFilter === "all"} onClick={() => setPixFilter("all")}>Todas ({data.contributions.length})</Button></div>
            <p className="admin-mobile-hint">Deslize a tabela para o lado para consultar todos os dados.</p>
            <div className="admin-table-wrap"><Table><TableHeader><TableRow><TableHead>Convidado</TableHead><TableHead>Valor</TableHead><TableHead>Referência</TableHead><TableHead>Data</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
              {loading && <TableRow><TableCell colSpan={6} className="admin-empty">Carregando contribuições...</TableCell></TableRow>}
              {!loading && visibleContributions.map((item) => <TableRow key={item.id}><TableCell><strong>{item.guest_name}</strong><small>{item.guest_contact || "Sem contato"}</small>{item.message && <small>{item.message}</small>}</TableCell><TableCell>{money.format(item.amount_cents / 100)}</TableCell><TableCell className="admin-reference">{item.transaction_reference || "—"}</TableCell><TableCell>{date.format(new Date(`${item.created_at}Z`))}</TableCell><TableCell><Badge variant={item.payment_status === "confirmed" ? "default" : "secondary"}>{item.payment_status === "confirmed" ? "Conferido" : item.payment_status === "rejected" ? "Não localizado" : "Declarado"}</Badge></TableCell><TableCell className="admin-actions">{canManage ? <><Button size="sm" disabled={updating === `contribution-${item.id}` || item.payment_status === "confirmed"} onClick={() => void update("contribution", item.id, "confirmed")}><Check /> Conferir</Button><Button size="sm" variant="outline" disabled={updating === `contribution-${item.id}` || item.payment_status === "rejected"} onClick={() => void update("contribution", item.id, "rejected")}>Não localizado</Button></> : <span className="admin-read-only">Somente leitura</span>}</TableCell></TableRow>)}
              {!loading && !visibleContributions.length && <TableRow><TableCell colSpan={6} className="admin-empty">{pixFilter === "declared" ? "Nenhuma contribuição aguardando conferência." : "Nenhuma contribuição registrada."}</TableCell></TableRow>}
            </TableBody></Table></div>
          </TabsContent>
          <TabsContent value="convidados" className="admin-panel">
            <div className="admin-panel-heading"><div><h2>Convidados com interação</h2><p>Lista consolidada de quem confirmou presente ou declarou uma contribuição.</p></div><Button asChild variant="outline"><a href="/api/admin/export?type=convidados"><Download /> Exportar CSV</a></Button></div>
            <p className="admin-mobile-hint">Deslize a tabela para o lado para consultar todos os dados.</p>
            <div className="admin-table-wrap"><Table><TableHeader><TableRow><TableHead>Convidado</TableHead><TableHead>Contato</TableHead><TableHead>Presentes</TableHead><TableHead>Pix declarado</TableHead><TableHead>Interações</TableHead><TableHead>Última interação</TableHead></TableRow></TableHeader><TableBody>
              {loading && <TableRow><TableCell colSpan={6} className="admin-empty">Carregando convidados...</TableCell></TableRow>}
              {guests.map((guest) => <TableRow key={guest.key}><TableCell><strong>{guest.name || "Convidado"}</strong></TableCell><TableCell>{guest.contact || "Não informado"}</TableCell><TableCell>{guest.gifts}</TableCell><TableCell>{money.format(guest.pix / 100)}</TableCell><TableCell>{guest.interactions}</TableCell><TableCell>{date.format(new Date(`${guest.last}Z`))}</TableCell></TableRow>)}
              {!loading && !guests.length && <TableRow><TableCell colSpan={6} className="admin-empty">Nenhum convidado interagiu com o site ainda.</TableCell></TableRow>}
            </TableBody></Table></div>
          </TabsContent>
          <TabsContent value="relatorios" className="admin-panel">
            <div className="admin-panel-heading"><div><h2>Relatório do evento</h2><p>Indicadores atualizados a partir das interações registradas neste site.</p></div><div className="admin-report-actions"><Button asChild variant="outline"><a href="/api/admin/export?type=presentes"><Download /> Presentes</a></Button><Button asChild variant="outline"><a href="/api/admin/export?type=pix"><Download /> Pix</a></Button></div></div>
            <div className="admin-report-grid">
              <article><small>Itens no catálogo</small><strong>{data.catalog.total}</strong><span>{data.catalog.available} disponíveis</span></article>
              <article><small>Presentes confirmados</small><strong>{summary.gifts}</strong><span>{data.catalog.reserved} reservas ativas</span></article>
              <article><small>Convidados identificados</small><strong>{guests.length}</strong><span>com ao menos uma interação</span></article>
              <article><small>Pix confirmado</small><strong>{money.format(summary.confirmedPix / 100)}</strong><span>{summary.declaredPix} aguardando conferência</span></article>
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
