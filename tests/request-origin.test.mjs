import assert from "node:assert/strict";
import test from "node:test";
import { sameOrigin } from "../lib/request-origin.ts";

const request = (headers) => new Request("https://evento.example.com/api/admin", { method: "PATCH", headers });

test("mutações aceitam a origem exata e o sinal de navegação da mesma origem", () => {
  assert.equal(sameOrigin(request({ origin: "https://evento.example.com" })), true);
  assert.equal(sameOrigin(request({ "sec-fetch-site": "same-origin" })), true);
});

test("mutações rejeitam origem ausente, cruzada, malformada ou com protocolo diferente", () => {
  for (const headers of [
    {},
    { "sec-fetch-site": "cross-site" },
    { origin: "https://outro.example.com" },
    { origin: "http://evento.example.com" },
    { origin: "https://evento.example.com:8443" },
    { origin: "https://evento.example.com/rota" },
    { origin: "invalida" },
    { origin: "https://outro.example.com", "sec-fetch-site": "same-origin" },
  ]) assert.equal(sameOrigin(request(headers)), false, JSON.stringify(headers));
});
