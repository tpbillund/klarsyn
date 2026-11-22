import { test } from "node:test";
import assert from "node:assert/strict";
import { loadKS } from "./helpers.mjs";

const KS = loadKS();

test("PIN: gyldighed (4-12 cifre)", () => {
  assert.equal(KS.pin.isValidPin("1234"), true);
  assert.equal(KS.pin.isValidPin("123456789012"), true);
  assert.equal(KS.pin.isValidPin("123"), false);
  assert.equal(KS.pin.isValidPin("1234567890123"), false);
  assert.equal(KS.pin.isValidPin("12a4"), false);
});

test("PIN: rigtig PIN godkendes, forkert afvises, PIN gemmes aldrig i klartekst", async () => {
  const rec = await KS.pin.create("2468");
  assert.ok(!JSON.stringify(rec).includes("2468"));
  assert.equal(await KS.pin.verify("2468", rec), true);
  assert.equal(await KS.pin.verify("2469", rec), false);
  assert.equal(await KS.pin.verify("", rec), false);
});

test("PIN: samme PIN giver forskellig hash (tilfældigt salt)", async () => {
  const a = await KS.pin.create("1111");
  const b = await KS.pin.create("1111");
  assert.notEqual(a.hash, b.hash);
});
