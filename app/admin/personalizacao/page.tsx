import Link from "next/link";
import { Home } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-auth";
import { loadPixAdminConfig, loadSiteConfig } from "@/lib/runtime-config";
import { PersonalizationForm } from "./personalization-form";

export const dynamic = "force-dynamic";

export default async function PersonalizationPage() {
  const user = await requireAdminPage();

  if (!user) {
    return (
      <main className="admin-denied">
        <Home size={34} />
        <h1>Acesso restrito</h1>
        <p>
          Esta área é exclusiva dos responsáveis pelo chá.
        </p>
        <Link href="/">Voltar ao site</Link>
      </main>
    );
  }

    const [config, pix] = await Promise.all([loadSiteConfig(), loadPixAdminConfig()]);

    return (
      <PersonalizationForm initialConfig={config} initialPix={pix} />
  );
}
