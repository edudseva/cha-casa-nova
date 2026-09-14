// Internal workspace sites can read the authenticated OpenAI user from the
// forwarded request headers:
//
// import { headers } from "next/headers";
//
// export default async function Home() {
//   const requestHeaders = await headers();
//   const email = requestHeaders.get("oai-authenticated-user-email");
//   const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
//   const fullName =
//     encodedFullName &&
//     requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
//       "percent-encoded-utf-8"
//       ? decodeURIComponent(encodedFullName)
//       : null;
//   const displayName = fullName ?? email;
//   // ...
// }

import config from "@/data/site-config.json";
import { GiftCatalogV2 } from "./gift-catalog-v2";
import type { Gift, SiteConfig } from "@/types/gift";

export default function Home() {
  return <GiftCatalogV2 gifts={[] as Gift[]} config={config as SiteConfig} />;
}
