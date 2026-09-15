"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Check, Download, Gift, Heart, Home, Palette, RefreshCw, RotateCcw } from "lucide-react";
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
type AdminData = { reservations: Reservation[]; contributions: Contribution[] };

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

function deliveryLabel(value: string) {
  return value === "casal" ? "Endereço do casal" : value === "convidado" ? "Convidado receberá" : "Outro endereço";
}

export function AdminDashboard({ displayName, showPlatformLink }: { displayName: string; showPlatformLink: boolean }) {
  const [data, setData] = useState<AdminData>({ reservations: [], contributions: [] });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

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
        <Link className="brand" href="/"><span className="brand-mark"><Home size={18} /></span><span>Nosso cantinho</span></Link>
        <div><span>Olá, {displayName}</span>{showPlatformLink && <Button asChild variant="outline"><Link href="/plataforma"><Building2 /> Plataforma</Link></Button>}<Button asChild variant="outline"><Link href="/admin/personalizacao"><Palette /> Personalização</Link></Button><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw /> Atualizar</Button></div>
      </header>
      <section className="admin-shell">
        <div className="admin-heading"><p className="eyebrow">Área privada</p><h1>Controle do chá</h1><p>Confira presentes e contribuições declaradas antes de considerar cada registro concluído.</p></div>
        <div className="admin-summary">
          <article><Gift /><strong>{summary.gifts}</strong><span>presentes confirmados</span></article>
          <article><Heart /><strong>{summary.declaredPix}</strong><span>Pix aguardando conferência</span></article>
          <article><Check /><strong>{money.format(summary.confirmedPix / 100)}</strong><span>Pix conferidos por vocês</span></article>
        </div>

        <Tabs defaultValue="presentes" className="admin-tabs">
          <TabsList><TabsTrigger value="presentes">Presentes</TabsTrigger><TabsTrigger value="pix">Pix</TabsTrigger></TabsList>
          <TabsContent value="presentes" className="admin-panel">
            <div className="admin-panel-heading"><div><h2>Presentes</h2><p>Desfaça uma confirmação somente quando ela tiver sido registrada por engano.</p></div><Button asChild variant="outline"><a href="/api/admin/export?type=presentes"><Download /> Exportar CSV</a></Button></div>
            <p className="admin-mobile-hint">Deslize a tabela para o lado para consultar todos os dados.</p>
            <div className="admin-table-wrap"><Table><TableHeader><TableRow><TableHead>Presente</TableHead><TableHead>Convidado</TableHead><TableHead>Entrega</TableHead><TableHead>Pedido</TableHead><TableHead>Data</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader><TableBody>
              {loading && <TableRow><TableCell colSpan={7} className="admin-empty">Carregando presentes...</TableCell></TableRow>}
              {data.reservations.map((item) => <TableRow key={item.id}><TableCell><strong>{item.gift_name}</strong>{item.message && <small>{item.message}</small>}</TableCell><TableCell>{item.guest_name}<small>{item.guest_contact || "Sem contato"}</small></TableCell><TableCell>{deliveryLabel(item.delivery_choice)}</TableCell><TableCell>{item.order_reference || "—"}</TableCell><TableCell>{date.format(new Date(`${item.created_at}Z`))}</TableCell><TableCell><Badge variant={item.status === "purchased" ? "default" : "secondary"}>{item.status === "purchased" ? "Confirmado" : "Liberado"}</Badge></TableCell><TableCell className="text-right"><Button size="sm" variant="outline" disabled={updating === `reservation-${item.id}`} onClick={() => void update("reservation", item.id, item.status === "purchased" ? "cancelled" : "purchased")}>{item.status === "purchased" ? <><RotateCcw /> Liberar</> : <><Check /> Restaurar</>}</Button></TableCell></TableRow>)}
              {!loading && !data.reservations.length && <TableRow><TableCell colSpan={7} className="admin-empty">Nenhum presente confirmado.</TableCell></TableRow>}
            </TableBody></Table></div>
          </TabsContent>
          <TabsContent value="pix" className="admin-panel">
            <div className="admin-panel-heading"><div><h2>Contribuições por Pix</h2><p>O valor só entra no total abaixo depois que vocês conferirem no banco.</p></div><Button asChild variant="outline"><a href="/api/admin/export?type=pix"><Download /> Exportar CSV</a></Button></div>
            <p className="admin-mobile-hint">Deslize a tabela para o lado para consultar todos os dados.</p>
            <div className="admin-table-wrap"><Table><TableHeader><TableRow><TableHead>Convidado</TableHead><TableHead>Valor</TableHead><TableHead>Referência</TableHead><TableHead>Data</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
              {loading && <TableRow><TableCell colSpan={6} className="admin-empty">Carregando contribuições...</TableCell></TableRow>}
              {data.contributions.map((item) => <TableRow key={item.id}><TableCell><strong>{item.guest_name}</strong><small>{item.guest_contact || "Sem contato"}</small>{item.message && <small>{item.message}</small>}</TableCell><TableCell>{money.format(item.amount_cents / 100)}</TableCell><TableCell className="admin-reference">{item.transaction_reference || "—"}</TableCell><TableCell>{date.format(new Date(`${item.created_at}Z`))}</TableCell><TableCell><Badge variant={item.payment_status === "confirmed" ? "default" : "secondary"}>{item.payment_status === "confirmed" ? "Conferido" : item.payment_status === "rejected" ? "Não localizado" : "Declarado"}</Badge></TableCell><TableCell className="admin-actions"><Button size="sm" disabled={updating === `contribution-${item.id}`} onClick={() => void update("contribution", item.id, "confirmed")}><Check /> Conferir</Button><Button size="sm" variant="outline" disabled={updating === `contribution-${item.id}`} onClick={() => void update("contribution", item.id, "rejected")}>Não localizado</Button></TableCell></TableRow>)}
              {!loading && !data.contributions.length && <TableRow><TableCell colSpan={6} className="admin-empty">Nenhuma contribuição registrada.</TableCell></TableRow>}
            </TableBody></Table></div>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
