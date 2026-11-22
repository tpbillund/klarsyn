// Admin-PIN: PBKDF2-SHA256 med tilfældigt salt. PIN'en selv gemmes aldrig.
(() => {
  const ITERATIONS = 150_000;

  function toB64(bytes: Uint8Array): string {
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  }

  function fromB64(b64: string): Uint8Array {
    const s = atob(b64);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  function isValidPin(pin: string): boolean {
    return /^[0-9]{4,12}$/.test(pin);
  }

  async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
      key,
      256
    );
    return new Uint8Array(bits);
  }

  async function create(pin: string): Promise<PinRecord> {
    if (!isValidPin(pin)) throw new Error("invalid pin");
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derive(pin, salt, ITERATIONS);
    return { salt: toB64(salt), hash: toB64(hash), iterations: ITERATIONS };
  }

  async function verify(pin: string, rec: PinRecord): Promise<boolean> {
    if (!isValidPin(pin)) return false;
    const got = await derive(pin, fromB64(rec.salt), rec.iterations);
    const want = fromB64(rec.hash);
    if (got.length !== want.length) return false;
    let diff = 0;
    for (let i = 0; i < got.length; i++) diff |= (got[i] ?? 0) ^ (want[i] ?? 0);
    return diff === 0;
  }

  KS.pin = { isValidPin, create, verify };
})();
