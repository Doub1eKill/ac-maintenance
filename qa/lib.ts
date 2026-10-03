import { test as base, type Locator, type Page } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { runPsql } from "./psql.mjs";

/** One run id for every spec in an invocation; set QA_RUN to pin it. */
export const RUN = process.env.QA_RUN ?? new Date().toISOString().replace(/[-:T]/g, "").slice(0, 13);
// Outside the project tree on purpose. Next dev's file watcher treats every
// write under the repo as a change: a screenshot or a ledger line landing in
// qa/runs/ triggered "[Fast Refresh] rebuilding" and a full page reload — the
// login page reloaded twelve times in one test and never got past the form.
// The run folder is copied into qa/runs/ once the browser work is over.
export const OUT_ROOT = process.env.QA_OUT ?? path.resolve(process.cwd(), "..", "ac-maintenance-qa");
export const RUN_DIR = path.join(OUT_ROOT, "runs", RUN);
fs.mkdirSync(RUN_DIR, { recursive: true });

const LEDGER = path.join(RUN_DIR, "ledger.md");
if (!fs.existsSync(LEDGER)) {
  fs.writeFileSync(
    LEDGER,
    "| # | Feature | Check | Method | Result | Artifact |\n|---|---------|-------|--------|--------|----------|\n"
  );
}
let ledgerN = fs.readFileSync(LEDGER, "utf8").split("\n").filter((l) => /^\| \d+ \|/.test(l)).length;

// SKIP: the check does not apply on this pass, because what it creates was
// already created earlier in the same run — admin/workflows.spec.ts runs once
// in [admin] and again as [admin-seed] in a full sweep. Only for a refusal
// the app words as exactly that; any other outcome is still PASS or FAIL.
export type Result = "PASS" | "FAIL" | "BLOCKED" | "SKIP";

/** Append a ledger line the moment a check finishes. Returns the line number. */
export function ledger(feature: string, check: string, method: "UI" | "API" | "DB" | "CODE", result: Result, artifact = "—") {
  ledgerN += 1;
  fs.appendFileSync(LEDGER, `| ${ledgerN} | ${feature} | ${check} | ${method} | ${result} | ${artifact} |\n`);
  return ledgerN;
}

/** Full-page screenshot into the run folder; returns the relative path for the ledger. */
export async function shot(page: Page, name: string) {
  const rel = path.join("runs", RUN, `${name}.png`);
  await page.screenshot({ path: path.join(OUT_ROOT, rel), fullPage: true });
  return rel.replace(/\\/g, "/");
}

/** Write any text artifact into the run folder. */
export function note(name: string, body: string) {
  const rel = path.join("runs", RUN, name);
  fs.writeFileSync(path.join(OUT_ROOT, rel), body);
  return rel.replace(/\\/g, "/");
}

/** Collect console errors + page errors for the life of a page. */
export function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`[console.error] ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`[pageerror] ${String(e)}`));
  return errors;
}

/** A tiny valid PNG, for file inputs that demand an image. */
/**
 * The unit picture a register form needs since the guest view (a plain
 * PNG the server re-encodes; what it shows does not matter to any check).
 */
export function unitPhoto() {
  return { name: "unit.png", mimeType: "image/png", buffer: pngBuffer([90, 140, 200], 96) };
}

export function pngBuffer(color: [number, number, number] = [40, 120, 200], size = 64): Buffer {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = color[0]; raw[o + 1] = color[1]; raw[o + 2] = color[2];
    }
  }
  const crc = (buf: Buffer) => {
    let c = ~0 >>> 0;
    for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
    return (~c) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export const QA = {
  password: "QaPassw0rd!!",
  admin: "qa.admin@qa-run.ac.th",
  tech: "qa.tech@qa-run.ac.th",
  tech2: "qa.tech2@qa-run.ac.th",
  pending: "qa.pending@example.invalid",
  building: { name: "QA_TEST_BLDG_001", abbr: "QAB001" },
  room: "QA-101",
};

/**
 * Wait until React has attached its handlers. Clicking a form before hydration
 * submits it natively — and on /login that put the password in the URL as a
 * GET query string (recorded as a finding). Every form interaction waits here.
 */
export async function hydrated(page: Page, selector = "form") {
  // React 19 stamps a __reactFiber$… key on every DOM node it has hydrated;
  // networkidle is not enough because Next dev keeps compiling after the HTML
  // has arrived and the click landed on an un-hydrated form.
  // Seen in this run: a fresh context sometimes sits on the login page's
  // Suspense fallback for a minute with no form at all (dev-server compile
  // stall). A reload clears it; count them so the report can say how often.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.waitForFunction(
        (sel) => {
          const el = document.querySelector(sel);
          return !!el && Object.keys(el).some((k) => k.startsWith("__reactFiber"));
        },
        selector,
        { timeout: 20_000 }
      );
      await page.waitForTimeout(200);
      return;
    } catch {
      hydrationReloads += 1;
      fs.appendFileSync(path.join(RUN_DIR, "hydration-reloads.txt"), `${new Date().toISOString()} ${page.url()} attempt ${attempt}
`);
      if (attempt === 3) throw new Error(`no hydrated <${selector}> on ${page.url()} after 3 loads`);
      await page.reload();
    }
  }
}
export let hydrationReloads = 0;

/** Log in through the real form. Returns the landing URL. */
export async function loginViaForm(page: Page, email: string, password: string) {
  await page.goto("/login");
  await hydrated(page);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /เข้าสู่ระบบ \(Sign In\)/ }).click();
  // Dev mode compiles the credentials route on first hit; wait for either a
  // navigation away from /login or an error message to show.
  await Promise.race([
    page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90_000 }).catch(() => {}),
    page.getByText(/อีเมลหรือรหัสผ่านไม่ถูกต้อง|ถูกระงับการใช้งาน|ตั้งรหัสผ่านใหม่ก่อน|รอการอนุมัติสิทธิ์/).first().waitFor({ timeout: 90_000 }).catch(() => {}),
  ]);
  // "/" is only a hop: the root route redirects by role. Wait for the landing.
  if (!page.url().includes("/login")) {
    await page.waitForURL(/\/(admin|tech|pending-approval)/, { timeout: 90_000 }).catch(() => {});
    // "/" itself is the signed-in root; its role redirect can take a minute on
    // a loaded dev server. Signed in is what this function reports.
    if (new URL(page.url()).pathname === "/") return page.url() + "#signed-in";
  }
  await page.waitForTimeout(300);
  return page.url();
}

/**
 * The postgres:// DATABASE_URL from the repo's .env — the Aiven database
 * production runs on, since 17 September. Same source qa/baseline.mjs reads.
 * Never logged.
 */
const POSTGRES_URL: string | null = (() => {
  try {
    return fs.readFileSync(path.resolve(__dirname, "..", ".env"), "utf8").match(/^DATABASE_URL="?(postgres(?:ql)?:\/\/[^"\r\n]+)"?/m)?.[1] ?? null;
  } catch {
    return null;
  }
})();

/**
 * Read (or, sparingly, write) the database directly — the "DB" method in the
 * ledger. Same client and flags as qa/baseline.mjs: psql (QA_PSQL for the
 * binary). Rows come back as arrays of strings, NULL as null. Never logs the
 * query.
 *
 * Specs keep to plain SQL: spell sum(boolean) as sum(case when … then 1 else 0
 * end), and no backslash escapes in string literals.
 */
export function db(query: string): (string | null)[][] {
  if (!POSTGRES_URL) throw new Error("no postgres:// DATABASE_URL in .env");
  return runPsql(POSTGRES_URL, query);
}

/** Toast text, if one shows within a few seconds. */
export async function toastText(page: Page, timeout = 8000) {
  const items = page.locator("[data-sonner-toaster] li");
  await items.first().waitFor({ timeout }).catch(() => {});
  await page.waitForTimeout(300);
  return (await items.allInnerTexts().catch(() => [])).join(" | ");
}

/**
 * Wait for the toasts on screen to go away so the next click is not
 * intercepted by one, and so the next toastText() reads a fresh one. Waits
 * rather than removing the nodes: sonner owns that DOM, and pulling an <li>
 * out from under React made its next insert throw ("insertBefore ... not a
 * child of this node") and took the whole page down.
 */
export async function clearToasts(page: Page) {
  await page
    .locator("[data-sonner-toaster] li")
    .first()
    .waitFor({ state: "detached", timeout: 8000 })
    .catch(() => {});
}

/**
 * Close a hand-rolled modal that is still open, if one is.
 *
 * The add-building and add-room forms close themselves only on success, so a
 * refused duplicate leaves the overlay up — and the spec's next click then
 * lands on "div.fixed.inset-0 intercepts pointer events" instead of the
 * button it named. That is what blocked the whole tech project on run
 * 20260929: the second pass over the same seed found the room already there.
 *
 * Escape is no help here on purpose — it is wired to the view-only modals
 * only, so a stray key cannot throw away a half-filled form. Clicks the X in
 * the modal header instead. A no-op when nothing is open, so it is safe to
 * call before any step that opens one.
 */
export async function dismissModal(page: Page) {
  const overlay = page.locator("div.fixed.inset-0").last();
  if (!(await overlay.isVisible().catch(() => false))) return;
  await overlay.locator("button").first().click({ timeout: 5000 }).catch(() => {});
  await overlay.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
}

/**
 * Choose a room inside a RoomCascadePicker.
 *
 * The picker replaced the building/room pair of <select>s in the
 * create-work-order modal on 19 Sep (ecfdef5); rooms are chips with
 * role="radio" now, so the old `select.nth(1)` quietly resolved to the unit
 * select instead — which stays disabled until a room is chosen, so the specs
 * sat waiting for it to enable until the suite timed out.
 *
 * Driven through the picker's own search shortcut rather than the three
 * cascading steps: one field, one click, and it sets building, floor and room
 * together, so a spec does not have to know which building a room is in.
 *
 * `scope` is whatever contains the picker — the modal, or the page.
 */
export async function pickRoom(scope: Locator | Page, roomName: string) {
  const search = scope.getByRole("searchbox", { name: "ค้นหาห้อง" });
  await search.waitFor({ timeout: 15_000 });
  await search.fill(roomName);
  const option = scope.getByRole("option", { name: new RegExp(`ห้อง ${escapeForRegExp(roomName)}\\b`) }).first();
  await option.waitFor({ timeout: 15_000 });
  await option.click();
  // The unit select is disabled until the room lands; waiting on that rather
  // than on a timeout is what makes this stable on Aiven's latency.
  await scope.locator('select[name="airConditionerId"]:not([disabled])').waitFor({ timeout: 15_000 }).catch(() => {});
}

function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Register through the real form. Returns the visible outcome text. */
export async function registerViaForm(
  page: Page,
  opts: { name: string; email: string; phone: string; password: string; role: "technician" | "org_admin"; tamperRole?: string }
) {
  await page.goto("/register");
  await hydrated(page);
  if (opts.role === "org_admin") {
    await page.getByRole("button", { name: /ผู้บริหาร|Org Admin|แอดมิน/ }).first().click();
  }
  if (opts.tamperRole) {
    await page.locator('input[name="role"]').evaluate((el, v) => ((el as HTMLInputElement).value = v), opts.tamperRole);
  }
  await page.locator('input[name="avatar"]').setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: pngBuffer() });
  await page.locator('input[name="name"]').fill(opts.name);
  await page.locator('input[name="phone"]').fill(opts.phone);
  await page.locator("#email").fill(opts.email);
  // The field checks the address as it is typed (half a second after the
  // last keystroke, then a round trip). Let that settle so the button is in
  // its final state — and if the answer is "already registered" the button
  // is held, so that is the outcome, without a submit.
  const status = page.locator("#email-check");
  await page.waitForTimeout(700);
  await status.locator("text=/กำลังตรวจสอบ/").waitFor({ state: "hidden", timeout: 20_000 }).catch(() => {});
  if (/ลงทะเบียนในระบบเรียบร้อยแล้ว/.test(await status.innerText())) {
    return (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ");
  }
  // The address has to be proven readable before the button works: a code
  // is mailed and typed back. The harness cannot read the mailbox, so it
  // asks for a code the normal way and then overwrites the stored hash with
  // one it knows — the same sha256(email:code) the app writes — through the
  // database, which nothing outside this harness can do.
  await verifyEmailInForm(page, opts.email);
  await page.locator("#password").fill(opts.password);
  await page.getByRole("button", { name: /ยืนยันลงทะเบียน/ }).click();
  // The outcome is either the success screen or the form-level alert — not
  // the inline email status, whose warnings share words with both.
  await page.locator('h3:has-text("ลงทะเบียนสำเร็จ"), form > [role="alert"]').first().waitFor({ timeout: 45_000 }).catch(() => {});
  await page.waitForTimeout(500);
  return (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ");
}

/** The code the harness plants; hashed the way src/lib/email-verification.ts does. */
export const QA_EMAIL_CODE = "246810";
export function plantEmailCode(email: string) {
  const hash = crypto.createHash("sha256").update(`${email.toLowerCase()}:${QA_EMAIL_CODE}`).digest("hex");
  db(`update email_verification_codes set code_hash = '${hash}', attempts = 0, expires_at = now() + interval '15 minutes' where email = '${email.toLowerCase()}' and verified_at is null`);
}

/**
 * Walks the proof step on /register for an address already typed into the
 * field: request a code, plant a known one, type it, wait for the tick.
 * Assumes the inline check has already settled on the address.
 */
export async function verifyEmailInForm(page: Page, email: string) {
  await page.getByRole("button", { name: /ส่งรหัสยืนยัน/ }).click();
  await page.locator("#email-code").waitFor({ timeout: 30_000 });
  plantEmailCode(email);
  await page.locator("#email-code").fill(QA_EMAIL_CODE);
  await page.getByRole("button", { name: /^ยืนยันรหัส$/ }).click();
  await page.locator("#email-verified").waitFor({ timeout: 30_000 });
}

/**
 * storageState carries cookies but not sessionStorage, and BrowserSessionGuard
 * signs out any /admin or /tech load that has no marker there. Every feature
 * context gets the marker the login page would have set.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript((k: string) => {
      try { window.sessionStorage.setItem(k, "1"); } catch { /* storage blocked */ }
    }, "ac-maintenance.browser-session");
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's fixture `use`, not a React hook
    await use(context);
  },
});
export { expect } from "@playwright/test";
