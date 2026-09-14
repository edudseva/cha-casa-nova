import { Home } from "lucide-react";

export default function Loading() {
  return <main className="site-loading" role="status" aria-live="polite"><span><Home size={22} /></span><p>Preparando nosso cantinho...</p></main>;
}
