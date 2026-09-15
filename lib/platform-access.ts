import { env } from "cloudflare:workers";
import { getChatGPTUser, requireChatGPTUser } from "@/app/chatgpt-auth";

type PlatformEnvironment = { PLATFORM_OWNER_EMAIL?: string; PLATFORM_OWNER_EMAILS?: string };

function ownerEmails() {
  const platformEnvironment = env as unknown as PlatformEnvironment;
  return new Set(
    [platformEnvironment.PLATFORM_OWNER_EMAIL, platformEnvironment.PLATFORM_OWNER_EMAILS]
      .filter(Boolean)
      .flatMap((value) => value!.split(/[;,\n]/))
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isPlatformOwner(email: string) {
  return ownerEmails().has(email.trim().toLowerCase());
}

export async function requirePlatformOwnerPage() {
  const user = await requireChatGPTUser("/plataforma");
  return isPlatformOwner(user.email) ? user : null;
}

export async function requirePlatformOwnerApi() {
  const user = await getChatGPTUser();
  if (!user) return { ok: false as const, status: 401, error: "Entre com sua conta para acessar." };
  if (!isPlatformOwner(user.email)) return { ok: false as const, status: 403, error: "Acesso não autorizado." };
  return { ok: true as const, user };
}
