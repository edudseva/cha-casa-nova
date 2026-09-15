import Link from "next/link";
import { Home } from "lucide-react";
import { requireAdminPageAccess } from "@/lib/admin-auth";
import { isPlatformOwner } from "@/lib/platform-access";
import { AdminDashboard } from "./admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const result = await requireAdminPageAccess();
  if (!result) {
    return (
      <main className="admin-denied">
        <Home size={34} />
        <h1>Acesso restrito</h1>
        <p>Esta área é exclusiva dos responsáveis autorizados pelo evento.</p>
        <Link href="/conta">Ver minha conta e convites</Link>
      </main>
    );
  }

  return <AdminDashboard
    displayName={result.user.displayName}
    role={result.access.role}
    canManage={result.access.role !== "viewer"}
    showPlatformLink={isPlatformOwner(result.user.email)}
  />;
}
