import Link from "next/link";
import { Home } from "lucide-react";
import { requireAdminPageAccess } from "@/lib/admin-auth";
import { loadSiteEditorState } from "@/lib/site-editor";
import { AdminSitePreview } from "./site-preview";

export const dynamic = "force-dynamic";

export default async function PreviewPage() {
  const result = await requireAdminPageAccess("event.settings.edit", "/admin/previa");
  if (!result) return <main className="admin-denied"><Home size={34} /><h1>Acesso restrito</h1><p>Seu perfil não permite visualizar este rascunho.</p><Link href="/conta">Ver minha conta e acessos</Link></main>;
  const editor = await loadSiteEditorState(result.user.id);
  return <AdminSitePreview config={editor.config} hasDraft={Boolean(editor.draftUpdatedAt)} updatedAt={editor.draftUpdatedAt} />;
}
