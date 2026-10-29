import bcrypt from "bcryptjs";
import type { Browser, Page } from "@playwright/test";
import { test, expect, QA, ledger, shot, hydrated, loginViaForm, db, toastText } from "../../lib";

// The account features added 4 Oct 2026: the Online/Offline badge
// (src/lib/presence.ts), suspending someone who holds jobs, and removing a
// suspended account (src/lib/admin/users.ts).
//
// Uses its own technician, made here through SQL, never tech/tech2: removal
// cannot be undone, and the tech project needs both of those afterwards. The
// two jobs it holds are inserted here too, on real units with nothing of the
// kind open, and deleted again at the end so the rest of the run counts the
// same pool. baseline restore removes the user row and the audit rows.

const NAME = "QA_TEST_USER_REMOVE";
// Unique per pass: a removed account keeps its row, with the email replaced,
// so a second pass in the same run starts from a fresh one.
const EMAIL = `qa.remove.${Date.now()}@qa-run.ac.th`;

const sq = (s: string) => s.replace(/'/g, "''");
// browser.newContext() inside a test inherits the project's storageState, i.e.
// the QA admin's cookies. Contexts that must be someone else start empty.
const NO_SESSION = { storageState: { cookies: [], origins: [] } };
const one = (q: string) => db(q)[0]?.[0] ?? null;

/** The team page filtered to the throwaway account; waits for its card, or for the empty state once it is gone. */
async function openTeam(page: Page, expectCard = true) {
  await page.goto(`/admin/team?q=${encodeURIComponent(NAME)}`);
  await page.locator("main").last().waitFor({ timeout: 60_000 });
  if (expectCard) await hydrated(page, "[data-slot=user-card]");
  else await page.getByText("ไม่พบผู้ใช้งานที่ตรงกับคำค้นนี้").waitFor({ timeout: 60_000 }).catch(() => {});
}
const card = (page: Page) => page.locator("[data-slot=user-card]", { hasText: NAME });
const badge = async (page: Page) => (await card(page).locator(".flex-wrap > span").nth(1).innerText()).trim();

/** A context signed in as the throwaway technician, sitting on /tech. */
async function signInAsRemovable(browser: Browser) {
  const ctx = await browser.newContext(NO_SESSION);
  await ctx.addInitScript(() => sessionStorage.setItem("ac-maintenance.browser-session", "1"));
  const page = await ctx.newPage();
  const url = await loginViaForm(page, EMAIL, QA.password);
  return { ctx, page, url };
}

test.describe.configure({ mode: "serial" });

test.describe("accounts: presence, suspending with held jobs, removal", () => {
  let userId = "";
  let jobIds: string[] = [];
  let acCodes: string[] = [];
  let logId = "";

  test.beforeAll(() => {
    const hash = bcrypt.hashSync(QA.password, 10);
    userId = one(
      `insert into users (role, status, name, email, password, email_verified_at, created_at, updated_at)
       values ('technician', 'active', '${NAME}', '${sq(EMAIL)}', '${sq(hash)}', now() at time zone 'utc', now() at time zone 'utc', now() at time zone 'utc')
       returning id`
    )!;
    db(`insert into user_phones (user_id, phone_number, is_primary, created_at, updated_at)
        values (${userId}, '081-000-1009', true, now() at time zone 'utc', now() at time zone 'utc')`);
    // Two units with no open repair job, so the one-open-job-per-kind index
    // has nothing to refuse.
    const units = db(
      `select a.id, a.ac_code from air_conditioners a
       where not exists (select 1 from work_orders w where w.air_conditioner_id = a.id and w.type = 'repair' and w.status in ('pending', 'claimed'))
       order by a.id limit 2`
    );
    acCodes = units.map((u) => u[1]!);
    jobIds = units.map(
      (u) =>
        one(
          `insert into work_orders (air_conditioner_id, status, type, priority, issue_description, claimed_by, claimed_at, created_at, updated_at)
           values (${u[0]}, 'claimed', 'repair', 'low', 'QA_TEST held job', ${userId}, now() at time zone 'utc', now() at time zone 'utc', now() at time zone 'utc')
           returning id`
        )!
    );
  });

  test.afterAll(() => {
    // Whatever state the jobs ended in, they were only ever QA's.
    if (logId) db(`delete from maintenance_logs where id = ${logId}`);
    if (jobIds.length) db(`delete from work_orders where id in (${jobIds.join(",")})`);
  });

  test("presence: Offline before sign-in, Online after, Offline after sign-out; API refuses non-admins", async ({ page, browser }) => {
    await openTeam(page);
    const before = await badge(page);
    ledger("Presence", `never-signed-in account reads Offline (got "${before}")`, "UI", before === "Offline" ? "PASS" : "FAIL", await shot(page, "presence-offline-before"));

    const anonCtx = await browser.newContext(NO_SESSION);
    const anon = (await anonCtx.request.post("/api/presence")).status();
    await anonCtx.close();
    ledger("Presence", `anonymous heartbeat is refused (${anon})`, "API", anon === 401 ? "PASS" : "FAIL");

    const tech = await signInAsRemovable(browser);
    await tech.page.goto("/tech");
    await tech.page.locator("main").last().waitFor({ timeout: 90_000 });
    const beat = await tech.page.evaluate(async () => (await fetch("/api/presence", { method: "POST" })).status);
    const read = await tech.page.evaluate(async () => (await fetch("/api/presence")).status);
    ledger("Presence", `technician heartbeat accepted (${beat}), technician cannot read who is online (${read})`, "API", beat === 204 && read === 401 ? "PASS" : "FAIL");
    const seen = one(`select last_seen_at is not null from users where id = ${userId}`);
    ledger("Presence", "sign-in recorded last_seen_at", "DB", seen === "t" ? "PASS" : "FAIL");

    await openTeam(page);
    const online = await badge(page);
    ledger("Presence", `signed-in technician reads Online on the team page (got "${online}")`, "UI", online === "Online" ? "PASS" : "FAIL", await shot(page, "presence-online"));

    // Sign out the way the app's own button does, then let the open team page
    // poll without a reload.
    const { csrfToken } = await (await tech.ctx.request.get("/api/auth/csrf")).json();
    await tech.ctx.request.post("/api/auth/signout", { form: { csrfToken, callbackUrl: "/login" }, maxRedirects: 0 });
    await tech.ctx.close();
    const polled = page.waitForResponse((r) => r.url().endsWith("/api/presence") && r.request().method() === "GET", { timeout: 15_000 });
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await polled.catch(() => {});
    await page.waitForTimeout(500);
    const after = await badge(page);
    const order = one(`select signed_out_at >= last_seen_at from users where id = ${userId}`);
    ledger("Presence", `after sign-out the card turns Offline without a reload (got "${after}"; signed_out_at >= last_seen_at: ${order})`, "UI", after === "Offline" && order === "t" ? "PASS" : "FAIL", await shot(page, "presence-offline-after"));
    expect(online).toBe("Online");
    expect(after).toBe("Offline");
  });

  test("suspend: held jobs are listed, released to the pool and audited", async ({ page }) => {
    const auditFloor = one("select coalesce(max(id), 0) from system_audit_logs")!;
    await openTeam(page);
    await card(page).getByRole("button", { name: "ระงับสิทธิ์" }).click();
    const dlg = page.getByRole("alertdialog");
    await dlg.getByText("ช่างคนนี้มีงานค้างอยู่").waitFor({ timeout: 30_000 }).catch(() => {});
    const text = await dlg.innerText();
    const listsBoth = acCodes.every((code) => text.includes(code));
    ledger("Suspend", `dialog warns about ${jobIds.length} held jobs and lists their units`, "UI", /ช่างคนนี้มีงานค้างอยู่/.test(text) && listsBoth && text.includes(`${jobIds.length} งาน`) ? "PASS" : "FAIL", await shot(page, "suspend-held-dialog"));
    const confirm = dlg.getByRole("button", { name: "คืนงานและระงับสิทธิ์" });
    ledger("Suspend", "confirm button reads คืนงานและระงับสิทธิ์", "UI", (await confirm.count()) === 1 ? "PASS" : "FAIL");
    await confirm.click();
    const tt = await toastText(page, 15_000);
    ledger("Suspend", `toast reports the released jobs ("${tt}")`, "UI", new RegExp(`คืนงาน ${jobIds.length} งาน`).test(tt) ? "PASS" : "FAIL", await shot(page, "suspend-held-toast"));

    const jobs = db(`select status, claimed_by from work_orders where id in (${jobIds.join(",")})`);
    ledger("Suspend", "held jobs are back in the pool: pending, nobody holding them", "DB", jobs.length === jobIds.length && jobs.every((j) => j[0] === "pending" && j[1] === null) ? "PASS" : "FAIL");
    const status = one(`select status from users where id = ${userId}`);
    ledger("Suspend", `account is suspended (${status})`, "DB", status === "suspended" ? "PASS" : "FAIL");
    const audit = db(`select action, entity_id from system_audit_logs where id > ${auditFloor} order by id`);
    const released = audit.filter((a) => a[0] === "RELEASE_WORKORDER").map((a) => a[1]);
    const suspended = audit.some((a) => a[0] === "SUSPEND_USER" && a[1] === userId);
    ledger("Suspend", `audit: RELEASE_WORKORDER for each job (${released.join(",")}) and SUSPEND_USER`, "DB", jobIds.every((id) => released.includes(id)) && suspended ? "PASS" : "FAIL");

    await openTeam(page);
    const buttons = (await card(page).locator("button").allInnerTexts()).map((b) => b.trim());
    const shown = await badge(page);
    ledger("Suspend", `suspended card reads ถูกระงับ with เปิดใช้งาน + ลบออกจากระบบ (got "${shown}" / ${buttons.join(", ")})`, "UI", shown === "ถูกระงับ" && buttons.includes("เปิดใช้งาน") && buttons.includes("ลบออกจากระบบ") && !buttons.includes("รีเซ็ตรหัสผ่าน") ? "PASS" : "FAIL", await shot(page, "suspend-card"));
    expect(status).toBe("suspended");
  });

  test("remove: the card goes, sign-in goes, the name and history stay", async ({ page, browser }) => {
    const auditFloor = one("select coalesce(max(id), 0) from system_audit_logs")!;
    // History that has to survive: one of the released jobs pinned to this person as reporter.
    db(`update work_orders set reported_by_id = ${userId} where id = ${jobIds[0]}`);
    // ...and a maintenance entry they wrote, for the unit's history page. Inserted
    // straight in, so the unit's schedule is not rolled forward the way closing
    // a job would.
    const detail = `QA_TEST work by a removed account ${Date.now()}`;
    logId = one(
      `insert into maintenance_logs (air_conditioner_id, work_order_id, user_id, action, repair_detail, performed_at, created_at, updated_at)
       select air_conditioner_id, null, ${userId}, 'repair', '${sq(detail)}', now() at time zone 'utc', now() at time zone 'utc', now() at time zone 'utc'
       from work_orders where id = ${jobIds[0]}
       returning id`
    )!;
    const qr = one(`select a.qr_code from work_orders w join air_conditioners a on a.id = w.air_conditioner_id where w.id = ${jobIds[0]}`)!;

    await openTeam(page);
    await card(page).getByRole("button", { name: "ลบออกจากระบบ" }).click();
    const dlg = page.getByRole("alertdialog");
    await dlg.waitFor();
    const text = await dlg.innerText();
    ledger("Remove", "dialog spells out what goes and what stays", "UI", /สิ่งที่ถูกลบ/.test(text) && /สิ่งที่เก็บไว้/.test(text) && /ย้อนกลับไม่ได้/.test(text) ? "PASS" : "FAIL", await shot(page, "remove-dialog"));
    await dlg.getByRole("button", { name: "ลบออกจากระบบ" }).click();
    const tt = await toastText(page, 15_000);
    ledger("Remove", `toast confirms removal ("${tt}")`, "UI", /ลบผู้ใช้ออกจากระบบแล้ว/.test(tt) ? "PASS" : "FAIL");

    await openTeam(page, false);
    const left = await card(page).count();
    ledger("Remove", `no card left on the team page (${left})`, "UI", left === 0 ? "PASS" : "FAIL", await shot(page, "remove-team-after"));

    const row = db(`select email, password is null, deleted_at is not null, name, status from users where id = ${userId}`)[0] ?? [];
    ledger("Remove", `row kept with name, email replaced (${row[0]}), password cleared, deleted_at set`, "DB", row[0] === `removed-${userId}@deleted.invalid` && row[1] === "t" && row[2] === "t" && row[3] === NAME ? "PASS" : "FAIL");
    const phones = one(`select count(*) from user_phones where user_id = ${userId}`);
    const freed = one(`select count(*) from users where email = '${sq(EMAIL)}'`);
    ledger("Remove", `phones deleted (${phones}) and the old email is free to register again (${freed} rows)`, "DB", phones === "0" && freed === "0" ? "PASS" : "FAIL");
    const reporter = one(`select u.name from work_orders w join users u on u.id = w.reported_by_id where w.id = ${jobIds[0]}`);
    ledger("Remove", `history still names the person (${reporter})`, "DB", reporter === NAME ? "PASS" : "FAIL");
    // The same on screen: the unit's history, as a signed-in viewer sees it (/qr/[id]).
    await page.goto(`/qr/${qr}`);
    const entry = page.locator("div.pl-6", { hasText: detail });
    await entry.waitFor({ timeout: 60_000 });
    const entryText = (await entry.innerText()).replace(/\s+/g, " ");
    const named = entryText.includes(`โดย ${NAME}`);
    ledger("Remove", `unit history page still shows "โดย ${NAME}" on their entry`, "UI", named ? "PASS" : "FAIL", await shot(page, "remove-history-name"));
    expect(entryText).toContain(`โดย ${NAME}`);
    const audited = one(`select count(*) from system_audit_logs where id > ${auditFloor} and action = 'DELETE_USER' and entity_id = ${userId}`);
    ledger("Remove", "audit: DELETE_USER", "DB", audited === "1" ? "PASS" : "FAIL");

    const again = await signInAsRemovable(browser);
    ledger("Remove", "the old email and password no longer sign in", "UI", again.url.includes("/login") ? "PASS" : "FAIL", await shot(again.page, "remove-login-refused"));
    await again.ctx.close();
    expect(left).toBe(0);
  });
});
