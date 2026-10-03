import { test as setup, expect } from "@playwright/test";
import path from "node:path";
import { QA, OUT_ROOT, ledger, shot, note, registerViaForm, loginViaForm, hydrated, db } from "../lib";

const AUTH = path.join(OUT_ROOT, "auth");

// The seeded password accounts from the skill notes do not exist in this
// database (every user has password = NULL — the data was restored from a dump,
// not seeded, and the seed would wipe it). So the QA accounts are registered
// through the real form. That is also the first test: an institutional address
// that asks for org_admin must come out pending (BUG-001, fixed 696a74a) —
// the admin session below is then earned the real way: the seeded admin
// approves the request on /admin/approvals and the QA admin logs in.

setup("register QA accounts through the form", async ({ page }) => {
  // technician on an institutional domain → active immediately (by design)
  let out = await registerViaForm(page, { name: "QA_TEST_USER_TECH", email: QA.tech, phone: "081-000-1001", password: QA.password, role: "technician" });
  let art = await shot(page, "setup-register-tech");
  const techOk = /ลงทะเบียนสำเร็จ|ถูกลงทะเบียนในระบบเรียบร้อยแล้ว/.test(out);
  ledger("Register", "technician on .ac.th registers (or already exists)", "UI", techOk ? "PASS" : "FAIL", art);
  expect(techOk, out).toBeTruthy();

  // second technician, for the two-context claim race
  out = await registerViaForm(page, { name: "QA_TEST_USER_TECH2", email: QA.tech2, phone: "081-000-1002", password: QA.password, role: "technician" });
  art = await shot(page, "setup-register-tech2");
  ledger("Register", "second technician registers", "UI", /ลงทะเบียนสำเร็จ|เรียบร้อยแล้ว/.test(out) ? "PASS" : "FAIL", art);

  // org_admin on an institutional domain — the escalation probe (BUG-001)
  out = await registerViaForm(page, { name: "QA_TEST_USER_ADMIN", email: QA.admin, phone: "081-000-1003", password: QA.password, role: "org_admin" });
  art = await shot(page, "setup-register-admin");
  const adminActive = /เปิดใช้งานแล้ว \(Active\)/.test(out);
  const adminPending = /รออนุมัติ|Pending/.test(out);
  const adminExists = /ถูกลงทะเบียนในระบบเรียบร้อยแล้ว/.test(out);
  note("setup-register-admin.txt", out);
  ledger(
    "Register",
    "org_admin requested on .ac.th address lands pending, never active (BUG-001)",
    "UI",
    adminActive ? "FAIL" : adminPending || adminExists ? "PASS" : "FAIL",
    art
  );
  expect(adminActive, out).toBeFalsy();

  // public domain → pending (by design)
  out = await registerViaForm(page, { name: "QA_TEST_USER_PENDING", email: QA.pending, phone: "081-000-1004", password: QA.password, role: "technician" });
  art = await shot(page, "setup-register-pending");
  ledger("Register", "public-domain address lands pending", "UI", /รออนุมัติ|Pending|เรียบร้อยแล้ว/.test(out) ? "PASS" : "FAIL", art);
});

setup("technician session via the login form", async ({ page }) => {
  const url = await loginViaForm(page, QA.tech, QA.password);
  const art = await shot(page, "setup-login-tech");
  const ok = /\/tech|#signed-in/.test(url);
  ledger("Login", "QA technician logs in and lands on /tech*", "UI", ok ? "PASS" : "FAIL", art);
  expect(ok, url).toBeTruthy();
  await page.context().storageState({ path: path.join(AUTH, "tech.json") });
});

setup("second technician session", async ({ page }) => {
  const url = await loginViaForm(page, QA.tech2, QA.password);
  expect(/\/tech|#signed-in/.test(url), url).toBeTruthy();
  await page.context().storageState({ path: path.join(AUTH, "tech2.json") });
});

setup("admin session: pending refusal, approval by the seeded admin, then login", async ({ page, browser }) => {
  // 1. Still pending: the login form must send the account to
  //    /pending-approval rather than "อีเมลหรือรหัสผ่านไม่ถูกต้อง" (BUG-003).
  let url = await loginViaForm(page, QA.admin, QA.password);
  const refusedRight = /\/pending-approval\?email=/.test(url);
  const alreadyActive = /\/admin|#signed-in/.test(url);
  ledger(
    "Login",
    alreadyActive
      ? "pending org_admin check skipped: already approved earlier in this run"
      : "pending org_admin is sent to /pending-approval, not told the password is wrong (BUG-003)",
    "UI",
    refusedRight || alreadyActive ? "PASS" : "FAIL",
    await shot(page, "setup-login-admin-pending")
  );

  // 2. The seeded org_admin approves the request. The demo-role button is the
  //    dev-only way into that account (it has no password), so a production
  //    build (the default, see playwright.config.ts) approves through SQL
  //    instead. The approvals page itself is still driven through the UI by
  //    admin/workflows.spec.ts, as the QA admin.
  if (!alreadyActive && process.env.QA_SERVER !== "dev") {
    db(`update users set status = 'active' where email = '${QA.admin}' and status = 'pending'`);
    const [[status]] = db(`select status from users where email = '${QA.admin}'`);
    ledger("Approvals", `QA org_admin approved through SQL (production build has no demo-role login): status ${status}`, "DB", status === "active" ? "PASS" : "FAIL");
    expect(status, "QA admin status after SQL approval").toBe("active");
  } else if (!alreadyActive) {
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => sessionStorage.setItem("ac-maintenance.browser-session", "1"));
    const admin = await ctx.newPage();
    await admin.goto("/login");
    await hydrated(admin);
    await admin.getByRole("button", { name: /ผู้บริหารองค์กร/ }).click();
    // 120 s like the other cold-route waits: the first /admin of a run is a
    // compile plus a round of Aiven queries, and 60 s has not always covered it.
    await admin.waitForURL(/\/admin/, { timeout: 120_000 });
    await admin.goto("/admin/approvals");
    await admin.locator("main").waitFor({ timeout: 120_000 });
    await hydrated(admin, "main");
    const card = admin.locator("main").locator("div").filter({ hasText: QA.admin }).filter({ has: admin.getByRole("button", { name: /^อนุมัติ$/ }) }).last();
    const listed = await card.count();
    ledger("Approvals", "the pending org_admin request is listed with role ผู้ดูแลระบบ", "UI", listed && /ผู้ดูแลระบบ/.test(await card.innerText()) ? "PASS" : "FAIL", await shot(admin, "setup-approvals-admin-card"));
    expect(listed, "QA admin card on /admin/approvals").toBeTruthy();
    await card.getByRole("button", { name: /^อนุมัติ$/ }).click();
    await admin.waitForTimeout(2500);
    await ctx.close();
  }

  // 3. Now it can log in — and this is the admin session the suite runs as.
  url = await loginViaForm(page, QA.admin, QA.password);
  const ok = /\/admin|#signed-in/.test(url);
  ledger("Login", "approved org_admin logs in to /admin", "UI", ok ? "PASS" : "FAIL", await shot(page, "setup-login-admin"));
  expect(ok, url).toBeTruthy();
  await page.context().storageState({ path: path.join(AUTH, "admin.json") });
});

setup("warm the heavy routes so later timings are the app, not the compiler", async ({ browser }) => {
  setup.setTimeout(600_000);
  for (const [file, routes] of [["admin.json", ["/admin", "/admin/work-orders", "/admin/assets", "/admin/qr-codes", "/admin/settings", "/admin/team", "/admin/approvals", "/admin/calendar"]], ["tech.json", ["/tech", "/tech/assets", "/tech/my-jobs", "/tech/history", "/tech/calendar", "/tech/catalogue"]]] as const) {
    const ctx = await browser.newContext({ storageState: path.join(AUTH, file) });
    await ctx.addInitScript(() => sessionStorage.setItem("ac-maintenance.browser-session", "1"));
    const page = await ctx.newPage();
    for (const r of routes) { const t0 = Date.now(); await page.goto(r, { timeout: 120_000, waitUntil: "load" }).catch(() => {}); note(`warm-${r.replace(/\//g, "-")}.txt`, `${Date.now() - t0}ms`); }
    await ctx.close();
  }
});
