/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

type AccessJwtHeader = { alg?: string; kid?: string };
type AccessJwtClaims = {
  aud?: string | string[];
  iss?: string;
  exp?: number;
  nbf?: number;
  email?: string;
  sub?: string;
  name?: string;
};
type AccessJwk = JsonWebKey & { kid?: string };
type AccessJwksResponse = { keys?: AccessJwk[] };
type VerifiedAccessIdentity = { email: string; id: string; name: string };

type AccessEnvironment = {
  CF_ACCESS_ISSUER?: string;
  CF_ACCESS_AUDS?: string;
};

let accessJwksCache: {
  issuer: string;
  expiresAt: number;
  keys: AccessJwk[];
} | null = null;

function decodeBase64Url(value: string): Uint8Array | null {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function decodeJwtJson<T>(value: string): T | null {
  const decoded = decodeBase64Url(value);
  if (!decoded) return null;
  try {
    return JSON.parse(new TextDecoder().decode(decoded)) as T;
  } catch {
    return null;
  }
}

function normalizeAccessIssuer(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const candidate = value.trim().startsWith("https://")
      ? value.trim()
      : `https://${value.trim()}`;
    const url = new URL(candidate);
    if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

async function getAccessSigningKey(issuer: string, kid: string): Promise<AccessJwk | null> {
  const now = Date.now();
  if (
    !accessJwksCache ||
    accessJwksCache.issuer !== issuer ||
    accessJwksCache.expiresAt <= now ||
    !accessJwksCache.keys.some((key) => key.kid === kid)
  ) {
    const response = await fetch(`${issuer}/cdn-cgi/access/certs`);
    if (!response.ok) return null;
    const jwks = await response.json() as AccessJwksResponse;
    if (!Array.isArray(jwks.keys)) return null;
    accessJwksCache = {
      issuer,
      expiresAt: now + 5 * 60 * 1000,
      keys: jwks.keys,
    };
  }
  return accessJwksCache.keys.find((key) => key.kid === kid) ?? null;
}

async function verifyCloudflareAccess(request: Request, env: Env): Promise<VerifiedAccessIdentity | null> {
  const token = request.headers.get("cf-access-jwt-assertion");
  const accessEnvironment = env as Env & AccessEnvironment;
  const issuer = normalizeAccessIssuer(accessEnvironment.CF_ACCESS_ISSUER);
  const allowedAudiences = (accessEnvironment.CF_ACCESS_AUDS ?? "")
    .split(/[;,\\n]/)
    .map((audience) => audience.trim())
    .filter(Boolean);
  if (!token || !issuer || allowedAudiences.length === 0) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const header = decodeJwtJson<AccessJwtHeader>(parts[0]);
  const claims = decodeJwtJson<AccessJwtClaims>(parts[1]);
  const signature = decodeBase64Url(parts[2]);
  if (!header || header.alg !== "RS256" || !header.kid || !claims || !signature) return null;
  if (claims.iss !== issuer || typeof claims.exp !== "number" || claims.exp <= Date.now() / 1000) return null;
  if (typeof claims.nbf === "number" && claims.nbf > Date.now() / 1000) return null;

  const tokenAudiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!tokenAudiences.some((audience) => typeof audience === "string" && allowedAudiences.includes(audience))) return null;
  if (typeof claims.email !== "string" || !claims.email.trim()) return null;

  try {
    const jwk = await getAccessSigningKey(issuer, header.kid);
    if (!jwk) return null;
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      publicKey,
      signature,
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    if (!valid) return null;
  } catch {
    return null;
  }

  const email = claims.email.trim();
  return {
    email,
    id: typeof claims.sub === "string" && claims.sub ? claims.sub : email.toLowerCase(),
    name: typeof claims.name === "string" && claims.name.trim() ? claims.name.trim() : email,
  };
}

function isAdminRequest(pathname: string): boolean {
  return pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/");
}

function forwardVerifiedAdminIdentity(request: Request, identity: VerifiedAccessIdentity | null): Request {
  const headers = new Headers(request.headers);
  // Never trust identity headers supplied by the browser. The Worker recreates
  // these headers only after validating Cloudflare Access' signed JWT.
  headers.delete("x-admin-access-email");
  headers.delete("x-admin-access-id");
  headers.delete("x-admin-access-name");
  headers.delete("cf-access-authenticated-user-email");

  if (identity) {
    headers.set("x-admin-access-email", identity.email);
    headers.set("x-admin-access-id", identity.id);
    headers.set("x-admin-access-name", identity.name);
  }
  return new Request(request, { headers });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (isAdminRequest(url.pathname)) {
      const identity = await verifyCloudflareAccess(request, env);
      request = forwardVerifiedAdminIdentity(request, identity);
    }

    let response: Response;
    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      response = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    } else {
      response = await handler.fetch(request, env, ctx);
    }

    const secured = new Response(response.body, response);
    secured.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    secured.headers.set("X-Content-Type-Options", "nosniff");
    secured.headers.set("X-Frame-Options", "DENY");
    secured.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    secured.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    secured.headers.set("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    return secured;
  },
};

export default worker;
