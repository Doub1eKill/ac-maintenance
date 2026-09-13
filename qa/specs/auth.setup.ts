import { test as setup, expect } from "@playwright/test";
import path from "node:path";
import { QA, OUT_ROOT, ledger, shot, note, registerViaForm, loginViaForm, hydrated } from "../lib";

const AUTH = path.join(OUT_ROOT, "auth");

// The seeded password accounts from the skill notes do not exist in this
// database (every user has password = NULL — the data was restored from a dump,
// not seeded, and the seed would wipe it). So the QA accounts are registered
// through the real form. That is also the first test: an institutional address
// that asks for org_admin should NOT come out active.

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

  // org_admin on an institutional domain — the escalation probe
  out = await registerViaForm(page, { name: "QA_TEST_USER_ADMIN", email: QA.admin, phone: "081-000-1003", password: QA.password, role: "org_admin" });
  art = await shot(page, "setup-register-admin");
  const adminActive = /เปิดใช้งานแล้ว \(Active\)/.test(out);
  const adminExists = /เรียบร้อยแล้ว/.test(out);
  note("setup-register-admin.txt", out);
  ledger(
    "Register",
    "org_admin requested on .ac.th address must NOT be active without approval",
    "UI",
    adminActive ? "FAIL" : adminExists ? "BLOCKED" : "PASS",
    art
  );

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

setup("admin session via the login form", async ({ page }) => {
  // If the escalation is closed, this account is pending and the login is
  // refused; fall back to the dev-only demo-role button and say so.
  let url = await loginViaForm(page, QA.admin, QA.password);
  if (/\/admin|#signed-in/.test(url)) {
    ledger("Login", "QA org_admin (registered via form) logs in to /admin", "UI", "PASS", await shot(page, "setup-login-admin"));
  } else {
    ledger("Login", "QA org_admin refused (pending) — using demo-role for admin session", "UI", "BLOCKED", await shot(page, "setup-login-admin-refused"));
    await page.goto("/login");
    await hydrated(page);
    await page.getByRole("button", { name: /ผู้บริหารองค์กร/ }).click();
    await page.waitForURL(/\/admin/, { timeout: 30_000 });
    url = page.url();
  }
  expect(/\/admin/.test(url), url).toBeTruthy();
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
