import Link from "next/link";
import { Home } from "lucide-react";
import { requireAdminPageAccess } from "@/lib/admin-auth";
import { loadPixAdminConfig, loadSiteConfig } from "@/lib/runtime-config";
import { PersonalizationForm } from "./personalization-form";

export const dynamic = "force-dynamic";

export default async function PersonalizationPage() {
  const result = await requireAdminPageAccess("event.settings.edit", "/admin/personalizacao");

  if (!result) {
    return (
      <main className="admin-denied">
        <Home size={34} />
        <h1>Acesso restrito</h1>
        <p>
          Seu perfil não permite alterar as configurações deste evento.
        </p>
        <Link href="/conta">Ver minha conta e acessos</Link>
      </main>
    );
  }

    const [config, pix] = await Promise.all([loadSiteConfig(), loadPixAdminConfig()]);

    return (
      <PersonalizationForm initialConfig={config} initialPix={pix} />
  );
}
