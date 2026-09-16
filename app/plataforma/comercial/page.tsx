import Link from "next/link";
import { requirePlatformOwnerPage } from "@/lib/platform-access";
import { CommercialConsole } from "./commercial-console";

export const dynamic = "force-dynamic";

export default async function CommercialPage() {
  const user = await requirePlatformOwnerPage();
  if (!user) return <main className="admin-denied"><h1>Acesso reservado</h1><Link href="/plataforma">Voltar à plataforma</Link></main>;
  return <main className="platform-page owner-page"><header className="admin-header"><Link className="brand" href="/plataforma">← Central do proprietário</Link><Link href="/produto">Ver apresentação</Link></header><div className="platform-shell"><div className="platform-heading"><p className="eyebrow">Fase 6 · homologação</p><h1>Operação comercial</h1><p>Prepare a oferta, acompanhe solicitações e organize suporte antes da abertura ao público.</p></div><CommercialConsole /></div></main>;
}
