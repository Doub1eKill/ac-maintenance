import { test, expect, ledger, shot, note, loginViaForm, db, QA } from "../../lib";

// Regressions for the sign-in findings of run 20260913-1742. Each check names
// the bug it guards; the fix commits are in HANDOFF.md.

test("BUG-009: a submit before hydration never puts the password in the URL", async ({ browser }) => {
  // JavaScript off is the strongest form of "before hydration": nothing React
  // does can help, so this is the server-rendered form on its own.
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(QA.tech);
  await page.locator("#password").fill(QA.password);
  const submit = page.getByRole("button", { name: /เข้าสู่ระบบ \(Sign In\)/ });
  const disabled = await submit.isDisabled();
  ledger("Login", "submit button is disabled in the server-rendered HTML", "UI", disabled ? "PASS" : "FAIL", await shot(page, "reg-login-nojs"));

  await page.locator("#password").press("Enter");
  await page.waitForTimeout(1500);
  const afterEnter = page.url();
  ledger("Login", `Enter before hydration: URL stays ${new URL(afterEnter).pathname}${new URL(afterEnter).search}`, "UI", /password=/.test(afterEnter) ? "FAIL" : "PASS", "runs/" + process.env.QA_RUN + "/reg-login-nojs.png");

  // Even a submit forced through the browser's default path must POST.
  const methods: string[] = [];
  page.on("request", (r) => { if (new URL(r.url()).pathname === "/login" && r.isNavigationRequest()) methods.push(r.method()); });
  await page.evaluate(() => document.querySelector<HTMLButtonElement>("form button[type=submit]")?.removeAttribute("disabled"));
  await submit.click({ force: true });
  await page.waitForTimeout(2500);
  const leaked = /password=/.test(page.url());
  ledger("Login", `forced native submit uses ${methods.join(",") || "(no navigation)"}; URL ${leaked ? "LEAKS the password" : "is clean"}`, "UI", !leaked && methods.every((m) => m === "POST") ? "PASS" : "FAIL", await shot(page, "reg-login-nojs-forced"));
  await ctx.close();
});

test("BUG-003: an account with no password gets the reset message, not 'wrong password'", async ({ page }) => {
  // Every seeded account has password = NULL (see auth.setup.ts); the first
  // technician is the one the demo-role button signs in as.
  const [[email]] = db("select email from users where password is null and role='technician' and status='active' order by id limit 1");
  expect(email).toBeTruthy();
  await loginViaForm(page, email!, "definitely-not-it");
  const t = await page.evaluate(() => document.body.innerText);
  const msg = t.match(/ตั้งรหัสผ่านใหม่ก่อน[^\n]*|อีเมลหรือรหัสผ่านไม่ถูกต้อง[^\n]*/)?.[0] ?? "(no message)";
  note("reg-login-nullpw.txt", `${email}: ${msg}`);
  ledger("Login", `NULL-password account: "${msg}"`, "UI", /ตั้งรหัสผ่านใหม่ก่อน/.test(msg) ? "PASS" : "FAIL", await shot(page, "reg-login-nullpw"));
});

test("B2: a wrong password never reveals that an account is pending", async ({ page }) => {
  // QA.pending is registered pending by auth.setup and approved only later,
  // by the admin project. Before B2 the status was checked first, so any
  // password at all was answered with the pending redirect.
  await loginViaForm(page, QA.pending, "not-the-password");
  const t = await page.evaluate(() => document.body.innerText);
  const generic = /อีเมลหรือรหัสผ่านไม่ถูกต้อง/.test(t) && !page.url().includes("/pending-approval");
  ledger("Login", "pending account + wrong password → generic message, no /pending-approval", "UI", generic ? "PASS" : "FAIL", await shot(page, "reg-login-pending-wrongpw"));
  const url = await loginViaForm(page, QA.pending, QA.password);
  ledger("Login", "pending account + right password → /pending-approval", "UI", /\/pending-approval/.test(url) ? "PASS" : "FAIL", await shot(page, "reg-login-pending-rightpw"));
});

test("BUG-003: an unknown address still gets the generic message", async ({ page }) => {
  await loginViaForm(page, "nobody-" + Date.now() + "@qa-run.ac.th", "whatever123");
  const t = await page.evaluate(() => document.body.innerText);
  ledger("Login", "unknown address → อีเมลหรือรหัสผ่านไม่ถูกต้อง", "UI", /อีเมลหรือรหัสผ่านไม่ถูกต้อง/.test(t) ? "PASS" : "FAIL", await shot(page, "reg-login-unknown"));
});

test("BUG-011: the public QR page and the login page carry one <main> at most", async ({ page }) => {
  const [[uuid]] = db("select qr_code from air_conditioners order by id limit 1");
  for (const path of ["/login", `/qr/${uuid}`]) {
    await page.goto(path);
    await page.waitForLoadState("domcontentloaded"); await page.waitForTimeout(1200);
    const mains = await page.locator("main").count();
    ledger("A11y", `${path}: ${mains} <main> landmark(s)`, "UI", mains <= 1 ? "PASS" : "FAIL", await shot(page, `reg-main-${path.replace(/[^a-z0-9]+/gi, "-")}`));
  }
});
