"use client";

import { FormEvent, useEffect, useState } from "react";
import type { CommercialSettings, CommercialPlan } from "@/lib/commercial";

type Coupon = { id: string; code: string; discount_percent: number; expires_at: string | null; active: number };
type RequestRow = { id: string; email: string; kind: string; status: string; plan_id: string | null; coupon_code: string; amount_cents: number | null; note: string; created_at: string };
type Dashboard = { settings: CommercialSettings; plans: CommercialPlan[]; coupons: Coupon[]; requests: RequestRow[]; metrics: { kind: string; status: string; total: number }[] };

export function CommercialConsole() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [settings, setSettings] = useState<CommercialSettings | null>(null);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(10);
  const [expiry, setExpiry] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => { fetch("/api/plataforma/comercial", { cache: "no-store" }).then((response) => response.json())
    .then((result: Dashboard) => { setData(result); setSettings(result.settings); })
    .catch(() => setFeedback("Não foi possível carregar a operação comercial.")); }, []);

  async function run(body: Record<string, unknown>) {
    setBusy(true); setFeedback("");
    try {
      const response = await fetch("/api/plataforma/comercial", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) { setFeedback(result.error ?? "Falha ao salvar."); return; }
      setData(result); setSettings(result.settings); setFeedback("Alteração salva.");
    } catch { setFeedback("Falha de conexão."); } finally { setBusy(false); }
  }

  function saveSettings(event: FormEvent) { event.preventDefault(); if (settings) void run({ action: "settings.save", headline: settings.headline, description: settings.description, trialDays: settings.trial_days, salesEmail: settings.sales_email, termsDraft: settings.terms_draft, privacyDraft: settings.privacy_draft }); }
  if (!data || !settings) return <p role="status" className="commercial-feedback">{feedback || "Carregando…"}</p>;
  return <div className="commercial-console">
    <div className="commercial-banner"><strong>Homologação privada</strong><span>Cobrança: não configurada. Pedidos registrados aqui não concedem acesso, não debitam valores e não viram assinatura.</span></div>
    <section className="commercial-admin-card"><h2>Indicadores operacionais</h2><div className="commercial-metrics">{data.metrics.length ? data.metrics.map((metric) => <div key={`${metric.kind}-${metric.status}`}><b>{metric.total}</b><span>{metric.kind} · {metric.status}</span></div>) : <p>Ainda não há solicitações.</p>}</div></section>
    <section className="commercial-admin-card"><h2>Apresentação e textos em revisão</h2><p>Os rascunhos jurídicos ficam visíveis somente ao proprietário. A página comercial informa que a versão final ainda não foi aprovada.</p><form className="commercial-admin-form" onSubmit={saveSettings}><label>Título<input value={settings.headline} maxLength={100} minLength={8} onChange={(event) => setSettings({ ...settings, headline: event.target.value })} required /></label><label>Descrição<textarea value={settings.description} maxLength={400} minLength={20} onChange={(event) => setSettings({ ...settings, description: event.target.value })} required /></label><div className="commercial-fields"><label>Dias previstos para teste<input type="number" min={1} max={90} value={settings.trial_days} onChange={(event) => setSettings({ ...settings, trial_days: Number(event.target.value) })} required /></label><label>E-mail comercial<input type="email" value={settings.sales_email} onChange={(event) => setSettings({ ...settings, sales_email: event.target.value })} /></label></div><label>Minuta dos termos<textarea value={settings.terms_draft} maxLength={10000} onChange={(event) => setSettings({ ...settings, terms_draft: event.target.value })} /></label><label>Minuta da política de privacidade<textarea value={settings.privacy_draft} maxLength={10000} onChange={(event) => setSettings({ ...settings, privacy_draft: event.target.value })} /></label><button disabled={busy}>Salvar preparação</button></form></section>
    <section className="commercial-admin-card"><h2>Cupons de simulação</h2><p>Os cupons alteram apenas o valor estimado do pedido; não há cobrança ou resgate financeiro.</p><form className="commercial-coupon-form" onSubmit={(event) => { event.preventDefault(); void run({ action: "coupon.create", code, discountPercent: discount, expiresAt: expiry }).then(() => setCode("")); }}><label>Código<input value={code} minLength={4} maxLength={24} onChange={(event) => setCode(event.target.value.toUpperCase())} required /></label><label>Desconto %<input type="number" min={1} max={100} value={discount} onChange={(event) => setDiscount(Number(event.target.value))} required /></label><label>Validade<input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} /></label><button disabled={busy}>Criar cupom</button></form><div className="commercial-rows">{data.coupons.map((coupon) => <div key={coupon.id}><strong>{coupon.code}</strong><span>{coupon.discount_percent}% · {coupon.expires_at || "Sem vencimento"} · {coupon.active ? "Ativo" : "Desativado"}</span>{Boolean(coupon.active) && <button type="button" disabled={busy} onClick={() => void run({ action: "coupon.disable", id: coupon.id })}>Desativar</button>}</div>)}</div></section>
    <section className="commercial-admin-card"><h2>Pedidos e suporte</h2><p>Histórico recente; somente o proprietário pode ver os endereços de contato.</p><div className="commercial-rows">{data.requests.map((row) => <div key={row.id}><strong>{row.email}</strong><span>{row.kind} · {row.status} · {row.created_at}<br />{row.note}{row.coupon_code && ` · Cupom ${row.coupon_code}`}</span>{row.kind === "support" && row.status === "open" && <button type="button" disabled={busy} onClick={() => void run({ action: "support.resolve", id: row.id })}>Marcar resolvido</button>}</div>)}{!data.requests.length && <p>Sem pedidos registrados.</p>}</div></section>
    {feedback && <p role="status" className="commercial-feedback">{feedback}</p>}
  </div>;
}
