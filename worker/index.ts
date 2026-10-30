/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  ADMIN_PANEL_PASSWORD?: string;
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

const ADMIN_SESSION_COOKIE = "__Host-cha-casa-admin";
const ADMIN_SESSION_SECONDS = 12 * 60 * 60;
const PASSWORD_ADMIN_EMAIL = "admin@cha-casa-nova.local";
const PASSWORD_ADMIN_ID = "admin-password-session";
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

type LoginAttempt = { count: number; windowStartedAt: number; blockedUntil: number };
const loginAttempts = new Map<string, LoginAttempt>();

function isAdminRequest(pathname: string): boolean {
  return pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/");
}

function isAdminApiRequest(pathname: string): boolean {
  return pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Uint8Array | null {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacSignature(payload: string, password: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

async function passwordsMatch(provided: string, configured: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [providedHash, configuredHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(configured)),
  ]);
  return constantTimeEqual(new Uint8Array(providedHash), new Uint8Array(configuredHash));
}

function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=") || null;
  }
  return null;
}

async function createAdminSession(password: string): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS;
  const nonce = base64UrlEncode(crypto.getRandomValues(new Uint8Array(16)));
  const payload = String(expiresAt) + "." + nonce;
  const signature = base64UrlEncode(await hmacSignature(payload, password));
  return payload + "." + signature;
}

async function hasValidAdminSession(request: Request, password: string): Promise<boolean> {
  const value = getCookie(request, ADMIN_SESSION_COOKIE);
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;

  const expiresAt = Number(parts[0]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
  if (expiresAt > Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS + 60) return false;

  const suppliedSignature = base64UrlDecode(parts[2]);
  if (!suppliedSignature) return false;
  const expectedSignature = await hmacSignature(parts[0] + "." + parts[1], password);
  return constantTimeEqual(suppliedSignature, expectedSignature);
}

function getClientKey(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "unknown-client";
}

function isLoginBlocked(clientKey: string): boolean {
  const attempt = loginAttempts.get(clientKey);
  if (!attempt) return false;
  const now = Date.now();
  if (attempt.blockedUntil > now) return true;
  if (now - attempt.windowStartedAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(clientKey);
    return false;
  }
  return false;
}

function recordFailedLogin(clientKey: string): boolean {
  const now = Date.now();
  let attempt = loginAttempts.get(clientKey);
  if (!attempt || now - attempt.windowStartedAt > LOGIN_WINDOW_MS) {
    attempt = { count: 0, windowStartedAt: now, blockedUntil: 0 };
  }
  attempt.count += 1;
  if (attempt.count >= LOGIN_MAX_ATTEMPTS) {
    attempt.blockedUntil = now + LOGIN_WINDOW_MS;
  }
  loginAttempts.set(clientKey, attempt);
  return attempt.blockedUntil > now;
}

function adminLoginPage(message: string, configured: boolean): Response {
  const notice = message
    ? '<p class="notice" role="alert">' + message + "</p>"
    : "";
  const form = configured
    ? '<form method="post" action="/admin/login"><label for="password">Senha de acesso</label><input id="password" name="password" type="password" minlength="14" autocomplete="current-password" required autofocus><button type="submit">Entrar no painel</button></form>'
    : '<p class="notice" role="alert">A senha ainda não foi configurada. Cadastre o Secret ADMIN_PANEL_PASSWORD nas configurações do Worker na Cloudflare.</p>';
  const html = [
    "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\">",
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>Acesso administrativo | Chá de Casa Nova</title>",
    "<style>",
    "*,*::before,*::after{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#f4f0e8;color:#25251f;font-family:Arial,Helvetica,sans-serif}",
    ".panel{width:min(100%,420px);padding:36px;background:#fff;border:1px solid #e5dfd3;border-radius:18px;box-shadow:0 18px 55px #30291b14}",
    "h1{margin:0 0 8px;font-size:25px}p{line-height:1.5;color:#656257}.subtitle{margin:0 0 26px;font-size:14px}",
    "label{display:block;margin:0 0 8px;font-size:14px;font-weight:700}input{width:100%;padding:13px 14px;border:1px solid #cfc8ba;border-radius:9px;font-size:16px;margin-bottom:16px}",
    "button{width:100%;padding:14px;border:0;border-radius:9px;background:#263c35;color:#fff;font-size:15px;font-weight:700;cursor:pointer}button:hover{background:#1b2f29}",
    ".notice{padding:11px 12px;border-radius:8px;background:#fff2df;color:#7b4718;font-size:13px;margin:0 0 18px}.back{display:block;margin-top:22px;text-align:center;font-size:13px;color:#68665d;text-decoration:none}",
    "</style></head><body><main class=\"panel\"><h1>Painel administrativo</h1>",
    '<p class="subtitle">Chá de Casa Nova</p>',
    notice,
    form,
    '<a class="back" href="/">Voltar ao site</a></main></body></html>',
  ].join("");
  return new Response(html, {
    status: message ? 401 : 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, private",
    },
  });
}

async function handleAdminLogin(request: Request, env: Env): Promise<Response> {
  const password = env.ADMIN_PANEL_PASSWORD;
  if (!password || password.length < 14) {
    return adminLoginPage("", false);
  }

  const origin = request.headers.get("origin");
  let sameOrigin = false;
  try {
    sameOrigin = Boolean(origin) && new URL(origin!).origin === new URL(request.url).origin;
  } catch {
    sameOrigin = false;
  }
  if (!sameOrigin) {
    return new Response("Requisição inválida.", { status: 403 });
  }

  const clientKey = getClientKey(request);
  if (isLoginBlocked(clientKey)) {
    return adminLoginPage("Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.", true);
  }

  let form: FormData;
  try {
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 8192) return new Response("Requisição muito grande.", { status: 413 });
    form = await request.formData();
  } catch {
    return adminLoginPage("Não foi possível processar a solicitação.", true);
  }

  const supplied = form.get("password");
  if (typeof supplied !== "string" || !(await passwordsMatch(supplied, password))) {
    const blocked = recordFailedLogin(clientKey);
    return adminLoginPage(
      blocked ? "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente." : "Senha incorreta. Tente novamente.",
      true,
    );
  }

  loginAttempts.delete(clientKey);
  const session = await createAdminSession(password);
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/admin",
      "Cache-Control": "no-store",
      "Set-Cookie": ADMIN_SESSION_COOKIE + "=" + session + "; Max-Age=" + ADMIN_SESSION_SECONDS + "; Path=/; Secure; HttpOnly; SameSite=Strict",
    },
  });
}

function adminLogoutResponse(): Response {
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/admin",
      "Cache-Control": "no-store",
      "Set-Cookie": ADMIN_SESSION_COOKIE + "=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict",
    },
  });
}

function forwardVerifiedAdminIdentity(request: Request): Request {
  const headers = new Headers(request.headers);
  // Browser-supplied identity headers are never trusted.
  headers.delete("x-admin-access-email");
  headers.delete("x-admin-access-id");
  headers.delete("x-admin-access-name");
  headers.delete("cf-access-authenticated-user-email");
  headers.delete("cf-access-jwt-assertion");
  headers.set("x-admin-access-email", PASSWORD_ADMIN_EMAIL);
  headers.set("x-admin-access-id", PASSWORD_ADMIN_ID);
  headers.set("x-admin-access-name", "Administrador");
  return new Request(request, { headers });
}

function secureResponse(response: Response): Response {
  const secured = new Response(response.body, response);
  secured.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("X-Frame-Options", "DENY");
  secured.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  secured.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  secured.headers.set("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  return secured;
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
      if (url.pathname === "/admin/login" && request.method === "POST") {
        return secureResponse(await handleAdminLogin(request, env));
      }
      if (url.pathname === "/admin/logout") {
        return secureResponse(adminLogoutResponse());
      }

      const password = env.ADMIN_PANEL_PASSWORD;
      if (!password || password.length < 14) {
        if (isAdminApiRequest(url.pathname)) {
          return secureResponse(Response.json(
            { error: "Senha do painel não configurada. Configure o Secret ADMIN_PANEL_PASSWORD no Worker." },
            { status: 503, headers: { "Cache-Control": "no-store" } },
          ));
        }
        return secureResponse(adminLoginPage("", false));
      }

      if (!(await hasValidAdminSession(request, password))) {
        if (isAdminApiRequest(url.pathname)) {
          return secureResponse(Response.json(
            { error: "Autenticação necessária." },
            { status: 401, headers: { "Cache-Control": "no-store" } },
          ));
        }
        return secureResponse(adminLoginPage("", true));
      }

      request = forwardVerifiedAdminIdentity(request);
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

    return secureResponse(response);
  },
};

export default worker;
