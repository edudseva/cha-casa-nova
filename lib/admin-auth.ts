import { env } from "cloudflare:workers";
import { getChatGPTUser, requireChatGPTUser } from "@/app/chatgpt-auth";

type AdminEnvironment = { ADMIN_EMAIL?: string; ADMIN_EMAILS?: string };

function configuredEmails() {
  const adminEnvironment = env as unknown as AdminEnvironment;
  return new Set(
    [adminEnvironment.ADMIN_EMAIL, adminEnvironment.ADMIN_EMAILS]
      .filter(Boolean)
      .flatMap((value) => value!.split(/[;,\n]/))
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isAdmin(email: string) {
  return configuredEmails().has(email.trim().toLowerCase());
}

export async function requireAdminPage() {
  const user = await requireChatGPTUser("/admin");
  if (!isAdmin(user.email)) return null;
  return user;
}

export async function requireAdminApi() {
  const user = await getChatGPTUser();
  if (!user) return { ok: false as const, status: 401, error: "Entre com sua conta para acessar." };
  if (!isAdmin(user.email)) {
    return { ok: false as const, status: 403, error: "Acesso não autorizado." };
  }
  return { ok: true as const, user };
}
