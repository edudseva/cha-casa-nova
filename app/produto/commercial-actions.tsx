"use client";

import { FormEvent, useEffect, useState } from "react";
import type { CommercialPlan } from "@/lib/commercial";

type RequestRow = { id: string; kind: string; status: string; plan_id: string | null; coupon_code: string; amount_cents: number | null; note: string; created_at: string };

const statusLabel: Record<string, string> = { trial_requested: "Teste solicitado", awaiting_payment_setup: "Aguardando estrutura de cobrança", cancelled: "Cancelado", open: "Aberto", resolved: "Respondido" };

export function CommercialActions({ plans, days }: { plans: CommercialPlan[]; days: number }) {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [couponCode, setCouponCode] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { let live = true; fetch("/api/comercial/solicitacoes", { cache: "no-store" })
    .then((response) => response.json()).then((data) => { if (live && Array.isArray(data.requests)) setRows(data.requests); })
    .catch(() => { if (live) setMessage("Não foi possível carregar suas solicitações."); });
    return () => { live = false; }; }, []);

  async function submit(body: Record<string, unknown>) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/comercial/solicitacoes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "Não foi possível registrar."); return; }
      setRows(result.requests); setNote(""); setMessage("Solicitação registrada com sucesso.");
    } catch { setMessage("Falha de conexão. Tente novamente."); }
    finally { setBusy(false); }
  }

  function request(event: FormEvent, action: string) { event.preventDefault(); void submit({ action, planId, couponCode }); }
  return <div className="commercial-action-panel"><label>Plano desejado<select value={planId} onChange={(event) => setPlanId(event.target.value)}>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
    <div className="commercial-actions"><form onSubmit={(event) => request(event, "trial.request")}><button type="submit" disabled={busy || !planId}>Solicitar teste de até {days} dias</button></form><form onSubmit={(event) => request(event, "order.request")}><label>Cupom, se houver<input maxLength={24} value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="CÓDIGO" /></label><button type="submit" disabled={busy || !planId}>Registrar interesse em contratar</button></form></div>
    <div className="commercial-support"><h3>Falar com o suporte</h3><form onSubmit={(event) => { event.preventDefault(); void submit({ action: "support.open", note }); }}><label>Descreva sua dúvida<textarea value={note} onChange={(event) => setNote(event.target.value)} minLength={15} maxLength={500} required /></label><button type="submit" disabled={busy}>Abrir chamado</button></form></div>
    {message && <p role="status" className="commercial-feedback">{message}</p>}
    <section className="commercial-history"><h3>Suas solicitações</h3>{rows.length ? <ul>{rows.map((row) => <li key={row.id}><div><strong>{row.kind === "trial" ? "Teste" : row.kind === "order" ? "Interesse em contratar" : "Suporte"}</strong><span>{statusLabel[row.status] ?? row.status} · {row.created_at}</span>{row.amount_cents !== null && <small>Valor estimado: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(row.amount_cents / 100)} · sem cobrança</small>}{row.note && <small>{row.note}</small>}</div>{["trial_requested", "awaiting_payment_setup"].includes(row.status) && <button type="button" disabled={busy} onClick={() => void submit({ action: "request.cancel", id: row.id })}>Cancelar solicitação</button>}</li>)}</ul> : <p>Nenhuma solicitação ainda.</p>}</section>
  </div>;
}
