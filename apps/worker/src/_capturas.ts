import { chromium } from "patchright";
import { resolve } from "node:path";
process.loadEnvFile(resolve(process.cwd(), "../../.env"));
const OUT = process.env.OUT!;
const BASE = process.env.BASE || "http://localhost:60486";
const U = process.env.SUPABASE_URL!, S = process.env.SUPABASE_SECRET_KEY!, P = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const post = async (path: string, body: unknown, key: string, token?: string) => { const r = await fetch(U + path, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${token ?? key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }); const t = await r.text(); return { status: r.status, ...(t ? JSON.parse(t) : {}) }; };
const link = await post("/auth/v1/admin/generate_link", { type: "magiclink", email: "raimundo.lecaros@uc.cl" }, S);
const ses = await post("/auth/v1/verify", { type: "magiclink", token_hash: link.hashed_token ?? link.properties.hashed_token }, P);
const valor = "base64-" + Buffer.from(JSON.stringify(ses)).toString("base64url");
const b = await chromium.launch({ channel: "chrome", headless: true });
try {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addCookies([{ name: "sb-ssmtlqtpzzhkhibkcfhi-auth-token", value: valor, domain: new URL(BASE).hostname, path: "/", secure: BASE.startsWith("https"), sameSite: "Lax" }]);
  const page = await ctx.newPage();
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("console", (m) => m.type() === "error" && errores.push(m.text().slice(0, 200)));
  const foto = async (n: string, full = false) => { await page.waitForTimeout(800); await page.screenshot({ path: `${OUT}/${n}.png`, fullPage: full }); console.log("ok", n); };
  const paso = async (n: string, f: () => Promise<unknown>) => { try { await f(); } catch (e) { console.log("FALLÓ", n, (e as Error).message.split("\n").slice(0, 3).join(" | ")); } };
  await paso("resultados", async () => { await page.goto(`${BASE}/resultados`); await page.locator('main a[href^="/auto?id="]').first().waitFor({ timeout: 30000 }); await foto("1-resultados"); await foto("1b-resultados-completo", true); });
  await paso("detalle", async () => { await page.locator('main a[href^="/auto?id="]').first().click(); await page.getByRole("link", { name: /^Ver en/ }).waitFor(); await page.waitForTimeout(1500); await foto("2-detalle"); await foto("2b-detalle-completo", true); });
  await paso("seguimientos", async () => { await page.locator("nav").getByRole("link", { name: "Seguimientos" }).click(); await page.getByRole("heading", { name: "Seguimientos" }).first().waitFor(); await foto("3-seguimientos"); });
  await paso("chat", async () => { await page.getByRole("button", { name: "Nuevo seguimiento" }).first().dispatchEvent("click"); await foto("4-chat"); await page.getByRole("button", { name: "Cancelar" }).click(); await page.waitForTimeout(400); });
  await paso("fuentes", async () => { await page.locator("nav").getByRole("link", { name: "Fuentes" }).click(); await page.getByRole("heading", { name: "Fuentes" }).first().waitFor(); await foto("5-fuentes"); await foto("5b-fuentes-completo", true); });
  console.log("errores:", errores.filter((e) => !/React DevTools|HMR|hmr|webpack-hmr/.test(e)).slice(0, 8));
} finally {
  await b.close();
  const r = await post("/auth/v1/logout?scope=local", {}, P, ses.access_token);
  console.log("sesión de prueba cerrada:", r.status);
}
