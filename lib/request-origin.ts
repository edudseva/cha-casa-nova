/** Protege requisições que alteram dados contra envios de outras páginas. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") === "same-origin";

  try {
    const supplied = new URL(origin);
    const target = new URL(request.url);
    return (supplied.protocol === "https:" || supplied.protocol === "http:")
      && origin === supplied.origin
      && supplied.origin === target.origin;
  } catch {
    return false;
  }
}
