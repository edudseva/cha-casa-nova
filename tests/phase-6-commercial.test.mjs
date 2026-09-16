import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("migrações comerciais preservam isolamento, preço e unicidade do pedido pendente", () => {
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync(new URL("../drizzle/", import.meta.url)).filter((name) => /^\d{4}_.*\.sql$/.test(name)).sort()) {
    db.exec(read(`drizzle/${file}`).replaceAll("--> statement-breakpoint", ""));
  }
  db.exec("PRAGMA foreign_keys = ON");
  db.prepare("INSERT INTO platform_plans (id,code,name,price_cents) VALUES ('p1','standard','Standard',12000)").run();
  db.prepare("INSERT INTO commercial_requests (id,user_id,email,kind,status,plan_id,amount_cents) VALUES ('r1','u1','one@example.com','order','awaiting_payment_setup','p1',12000)").run();
  assert.throws(() => db.prepare("INSERT INTO commercial_requests (id,user_id,email,kind,status,plan_id) VALUES ('r2','u1','one@example.com','order','awaiting_payment_setup','p1')").run(), /UNIQUE/);
  db.prepare("UPDATE commercial_requests SET status = 'cancelled' WHERE id = 'r1'").run();
  db.prepare("INSERT INTO commercial_requests (id,user_id,email,kind,status,plan_id) VALUES ('r2','u1','one@example.com','order','awaiting_payment_setup','p1')").run();
  assert.throws(() => db.prepare("INSERT INTO commercial_coupons (id,code,discount_percent) VALUES ('c1','BAD',101)").run(), /CHECK/);
  assert.throws(() => db.prepare("INSERT INTO commercial_requests (id,user_id,email,kind,status,plan_id) VALUES ('r3','u2','two@example.com','order','awaiting_payment_setup','missing')").run(), /FOREIGN KEY/);
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  db.close();
});

test("nenhuma rota de cliente confirma pagamento e mutações comerciais são autorizadas no servidor", () => {
  const customer = read("app/api/comercial/solicitacoes/route.ts");
  const owner = read("app/api/plataforma/comercial/route.ts");
  assert.match(customer, /getChatGPTUser\(\)/);
  assert.match(customer, /WHERE id = \? AND user_id = \? AND email = \?/);
  assert.match(customer, /sameOrigin\(request\)/);
  assert.match(owner, /requirePlatformOwnerApi\(\)/);
  assert.match(owner, /sameOrigin\(request\)/);
  assert.doesNotMatch(customer, /payment_confirmed|payment\.paid|status = 'paid'/);
});
