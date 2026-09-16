import { env } from "cloudflare:workers";

// Legacy rows receive this identifier through migration 0007 in either isolated D1.
export const CURRENT_SITE_ID = "cha-casa-nova-homologacao";
// An absent or unexpected environment must keep commercial site creation closed.
export const SITE_ENVIRONMENT = (env as unknown as { APP_ENV?: string }).APP_ENV === "homologation" ? "homologation" : "production";
