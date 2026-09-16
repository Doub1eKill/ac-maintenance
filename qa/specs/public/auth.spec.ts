import type { Page } from "@playwright/test";
import { test, QA, ledger, shot, note, loginViaForm, hydrated, watchConsole } from "../../lib";

test.describe("authentication, adversarially", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const bad = async (page: Page, email: string, password: string, label: string, slug: string) => {
    const url = await loginViaForm(page, email, password);
    const txt = await page.evaluate(() => document.body.innerText);
    const art = await shot(page, `login-${slug}`);
    const stillOut = url.includes("/login") || url.includes("/pending-approval");
    const hasMsg = /อีเมลหรือรหัสผ่านไม่ถูกต้อง|กรุณา|ไม่ถูกต้อง|ตั้งรหัสผ่านใหม่|ถูกระงับ|รอการอนุมัติ/.test(txt) || url.includes("/pending-approval");
    // must not leak whether the address exists
    const leaks = /ไม่พบ(บัญชี|ผู้ใช้|อีเมล)|not found|no user/i.test(txt);
    ledger("Login", `${label}: refused with a message, no existence leak`, "UI", stillOut && hasMsg && !leaks ? "PASS" : "FAIL", art);
    return { url, txt };
  };

  test("valid technician, then reload keeps the session", async ({ page }) => {
    const errors = watchConsole(page);
    const url = await loginViaForm(page, QA.tech, QA.password);
    const landed = /\/tech/.test(url);
    ledger("Login", "valid technician lands on /tech*", "UI", landed ? "PASS" : "FAIL", await shot(page, "login-tech-valid"));
    await page.reload();
    // "load" + the shell, not networkidle: the dev server's route prefetches
    // can hold a request open for minutes while a route compiles, and that
    // stalled this wait for the whole 180s test budget (run 20260915-1243).
    await page.waitForLoadState("load").catch(() => {});
    await page.locator("main").last().waitFor({ timeout: 60_000 }).catch(() => {});
    const stillIn = !page.url().includes("/login");
    ledger("Login", "session survives reload", "UI", stillIn ? "PASS" : "FAIL", await shot(page, "login-tech-reload"));
    const name = await page.evaluate(() => document.body.innerText.includes("QA_TEST_USER_TECH"));
    ledger("Login", "shell shows the signed-in user's name", "UI", name ? "PASS" : "FAIL", "runs/" + process.env.QA_RUN + "/login-tech-reload.png");
    ledger("Login", "no console errors on technician landing", "UI", errors.length === 0 ? "PASS" : "FAIL", note("login-tech-console.txt", errors.join("\n") || "(none)"));
  });

  test("uppercase + padded email is normalised (intended)", async ({ page }) => {
    const url = await loginViaForm(page, `  ${QA.tech.toUpperCase()}  `, QA.password);
    ledger("Login", "'  QA.TECH@…  ' still logs in (trim + lowercase)", "UI", /\/tech/.test(url) ? "PASS" : "FAIL", await shot(page, "login-tech-padded"));
  });

  test("wrong password", async ({ page }) => { await bad(page, QA.tech, "definitely-wrong", "wrong password", "badpw"); });
  test("unknown email", async ({ page }) => { await bad(page, "nobody@qa-run.ac.th", QA.password, "unknown email", "unknown"); });
  test("malformed email", async ({ page }) => { await bad(page, "not-an-email", QA.password, "malformed email", "malformed"); });
  test("SQL injection in email", async ({ page }) => { await bad(page, "' OR 1=1--", "' OR 1=1--", "SQL injection", "sqli"); });
  test("XSS in both fields", async ({ page }) => {
    const { txt } = await bad(page, "<script>alert(1)</script>@x.com", "<script>alert(1)</script>", "XSS payload", "xss");
    ledger("Login", "XSS payload is not reflected raw", "UI", txt.includes("<script>") ? "FAIL" : "PASS", "runs/" + process.env.QA_RUN + "/login-xss.png");
  });
  test("Thai characters in both fields", async ({ page }) => { await bad(page, "ผู้ใช้@ทดสอบ.ไทย", "รหัสผ่านภาษาไทย", "Thai in both fields", "thai"); });
  test("2000-char inputs", async ({ page }) => { await bad(page, "a".repeat(1990) + "@x.com", "p".repeat(2000), "2000-char inputs", "long"); });

  test("empty fields are blocked by the form", async ({ page }) => {
    await page.goto("/login");
    await hydrated(page);
    await page.getByRole("button", { name: /เข้าสู่ระบบ \(Sign In\)/ }).click();
    await page.waitForTimeout(800);
    const still = page.url().includes("/login");
    const requiredBlocked = await page.locator("#email").evaluate((el: HTMLInputElement) => !el.validity.valid);
    ledger("Login", "empty submit stays on /login (required fields)", "UI", still && requiredBlocked ? "PASS" : "FAIL", await shot(page, "login-empty"));
  });

  test("account with NULL password (restored data) gets the reset message", async ({ page }) => {
    const { txt } = await bad(page, "houston16@example.net", "anything", "NULL-password account", "nullpw");
    ledger("Login", "NULL-password account → 'ตั้งรหัสผ่านใหม่' message", "UI", /ตั้งรหัสผ่านใหม่/.test(txt) ? "PASS" : "FAIL", "runs/" + process.env.QA_RUN + "/login-nullpw.png");
  });

  test("pending account is sent to /pending-approval", async ({ page }) => {
    const url = await loginViaForm(page, QA.pending, QA.password);
    ledger("Login", "pending account → /pending-approval?email=", "UI", /\/pending-approval\?email=/.test(url) ? "PASS" : "FAIL", await shot(page, "login-pending"));
  });

  test("callbackUrl: same-origin honoured, off-site refused", async ({ page }) => {
    await page.goto("/login?callbackUrl=%2Ftech%2Fmy-jobs");
    await hydrated(page);
    await page.locator("#email").fill(QA.tech);
    await page.locator("#password").fill(QA.password);
    await page.getByRole("button", { name: /เข้าสู่ระบบ \(Sign In\)/ }).click();
    await page.waitForURL(/\/tech/, { timeout: 45_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    ledger("Login", "?callbackUrl=/tech/my-jobs returns there", "UI", page.url().endsWith("/tech/my-jobs") ? "PASS" : "FAIL", await shot(page, "login-callback-ok"));

    for (const [slug, cb] of [["offsite", "https://example.com"], ["protocol-relative", "//example.com"]]) {
      await page.context().clearCookies();
      await page.goto(`/login?callbackUrl=${encodeURIComponent(cb)}`);
      await hydrated(page);
      await page.locator("#email").fill(QA.tech);
      await page.locator("#password").fill(QA.password);
      await page.getByRole("button", { name: /เข้าสู่ระบบ \(Sign In\)/ }).click();
      await page.waitForTimeout(6000);
      const host = new URL(page.url()).host;
      ledger("Login", `?callbackUrl=${cb} does not leave localhost`, "UI", host === new URL(process.env.QA_BASE_URL ?? "http://localhost:3000").host ? "PASS" : "FAIL", await shot(page, `login-callback-${slug}`));
    }
  });

  test("logout clears the session; Back does not resurrect the dashboard", async ({ page }) => {
    await loginViaForm(page, QA.tech, QA.password);
    await page.goto("/tech");
    await hydrated(page, "main");
    // open the user menu in the shell and sign out
    await page.getByRole("button", { name: /QA_TEST_USER_TECH|ช่างซ่อมบำรุง/ }).first().click().catch(() => {});
    const out = page.getByRole("menuitem", { name: /ออกจากระบบ/ });
    if (await out.count()) await out.click(); else await page.goto("/api/auth/signout").then(() => page.getByRole("button").first().click());
    await page.waitForURL(/\/login/, { timeout: 30_000 }).catch(() => {});
    const loggedOut = page.url().includes("/login");
    ledger("Logout", "sign out returns to /login", "UI", loggedOut ? "PASS" : "FAIL", await shot(page, "logout"));
    await page.goBack();
    await page.waitForTimeout(2500);
    const back = page.url();
    const dash = await page.evaluate(() => document.body.innerText.includes("งานทั้งหมด") && !document.body.innerText.includes("เข้าสู่ระบบ (Sign In)"));
    ledger("Logout", "Back after logout does not show a dashboard", "UI", !dash ? "PASS" : "FAIL", await shot(page, "logout-back"));
    await page.goto("/tech/my-jobs");
    await page.waitForTimeout(2500);
    ledger("Logout", "/tech/my-jobs after logout redirects to /login", "UI", page.url().includes("/login") ? "PASS" : "FAIL", await shot(page, "logout-direct"));
    void back;
  });

  test("login page: demo-role panel is present in dev (must not ship)", async ({ page }) => {
    await page.goto("/login");
    await hydrated(page);
    const demo = await page.getByText(/ทดสอบเข้าสู่ระบบด่วน/).count();
    ledger("Login", "demo-role panel visible in development (verify absent in production build)", "UI", demo ? "BLOCKED" : "PASS", await shot(page, "login-demo-panel"));
  });
});
