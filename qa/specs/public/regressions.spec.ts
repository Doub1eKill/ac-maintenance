import fs from "node:fs";
import type { Page } from "@playwright/test";
import path from "node:path";
import { createResetToken } from "../../../src/lib/reset-token";
import { test, expect, ledger, shot, note, loginViaForm, hydrated, db, QA, QA_EMAIL_CODE, plantEmailCode, pngBuffer } from "../../lib";

// Regressions for the sign-in findings of run 20260913-1742. Each check names
// the bug it guards; the fix commits are in HANDOFF.md.

test("BUG-009: a submit before hydration never puts the password in the URL", async ({ browser }) => {
  // JavaScript off is the strongest form of "before hydration": nothing React
  // does can help, so this is the server-rendered form on its own.
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  // A production build prerenders /login with the form behind a Suspense
  // fallback (useSearchParams, see src/app/login/page.tsx): the form only
  // exists once JavaScript has run, so there is nothing to submit before
  // hydration at all. Dev server-renders it, and the checks below apply.
  if ((await page.locator("#email").count()) === 0) {
    const html = await page.content();
    const clientOnly = html.includes("BAILOUT_TO_CLIENT_SIDE_RENDERING") && !html.includes('name="password"');
    ledger("Login", "no form in the server-rendered HTML (client-only behind Suspense) — nothing can be submitted before hydration", "UI", clientOnly ? "PASS" : "FAIL", await shot(page, "reg-login-nojs"));
    expect(clientOnly, "login form absent from server HTML for a known reason").toBeTruthy();
    await ctx.close();
    return;
  }
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

test("guest view: a scanned sticker shows the unit's picture and record, nothing staff-only, and a technician sign-in", async ({ page }) => {
  // A unit with at least one visit, so there is a record to inspect — and
  // the name of whoever made the latest one, which a visitor must not see.
  const [[uuid, acCode, techName, repairDetail]] = db(
    "select a.qr_code, a.ac_code, u.name, l.repair_detail from maintenance_logs l join air_conditioners a on a.id=l.air_conditioner_id join users u on u.id=l.user_id where a.deleted_at is null order by l.performed_at desc limit 1"
  );
  expect(uuid).toBeTruthy();
  await page.goto(`/qr/${uuid}`);
  await page.waitForLoadState("domcontentloaded"); await page.waitForTimeout(1500);
  const t = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ");
  const hasPicture = (await page.locator("img[alt^='เครื่องปรับอากาศ']").count()) > 0 || /ยังไม่มีรูปเครื่องนี้/.test(t);
  ledger("Guest", `/qr/<uuid> for ${acCode}: picture (or its placeholder) and the record are shown without signing in`, "UI", t.includes(acCode!) && /ประวัติการซ่อมบำรุง/.test(t) && hasPicture ? "PASS" : "FAIL", await shot(page, "reg-guest-view"));
  ledger("Guest", `visitor sees what was repaired (${repairDetail ? "yes" : "no repair detail on this unit"}) but not who did it (${techName})`, "UI", !t.includes(techName!) && !/โดย /.test(t) && (!repairDetail || t.includes(repairDetail)) ? "PASS" : "FAIL", "runs/" + process.env.QA_RUN + "/reg-guest-view.png");
  ledger("Guest", "no claim/close/log controls for a visitor", "UI", !/รับงานทันที|บันทึกและปิดงาน|บันทึกงานซ่อมบำรุง|รูปหลังซ่อม/.test(t) ? "PASS" : "FAIL", "runs/" + process.env.QA_RUN + "/reg-guest-view.png");
  const href = await page.getByRole("link", { name: /เข้าสู่ระบบสำหรับช่าง/ }).getAttribute("href");
  ledger("Guest", `technician sign-in link carries the unit: ${href}`, "UI", !!href && href.startsWith("/login?callbackUrl=") && decodeURIComponent(href).includes(`/tech?ac=${acCode}`) ? "PASS" : "FAIL", "runs/" + process.env.QA_RUN + "/reg-guest-view.png");
});

test("email check while typing: a domain typo is suggested, a dead domain warned about, a registered address held", async ({ page }) => {
  await page.goto("/register");
  await hydrated(page, "form");
  const email = page.locator("#email");
  const status = page.locator("#email-check");
  const submit = page.locator('button[type="submit"]');

  // A slip in a well-known domain: offered, not applied.
  await email.fill("somchai@gmial.com");
  await expect(status).toContainText("gmail.com", { timeout: 10_000 });
  const suggested = await status.innerText();
  ledger("Register", "typo in a known domain suggests the right one", "UI", /gmail\.com/.test(suggested) ? "PASS" : "FAIL", await shot(page, "email-check-typo"));
  await status.getByRole("button", { name: /somchai@gmail\.com/ }).click();
  await expect(email).toHaveValue("somchai@gmail.com");
  await expect(status).toContainText("ใช้งานได้", { timeout: 10_000 });
  ledger("Register", "the suggestion fills the field and is re-checked", "UI", (await email.inputValue()) === "somchai@gmail.com" ? "PASS" : "FAIL", await shot(page, "email-check-applied"));

  // A domain the resolver knows nothing about: warned. Whether it also holds
  // the button depends on where the server enforces it (production), so only
  // the warning is asserted here.
  await email.fill("somchai@abcxyz-notreal-9981.com");
  await expect(status).toContainText("ไม่มีเซิร์ฟเวอร์รับอีเมล", { timeout: 15_000 });
  ledger("Register", "a domain with no MX record is warned about", "UI", "PASS", await shot(page, "email-check-no-mx"));

  // Any address already in the table: the field says so before any submit,
  // and the button is held. Read from the database rather than assumed from
  // setup, so the check holds with --no-deps and after a restore.
  const [[existing]] = db("select email from users order by id limit 1");
  await email.fill(existing!);
  await expect(status).toContainText("ลงทะเบียนในระบบเรียบร้อยแล้ว", { timeout: 15_000 });
  ledger("Register", "an already registered address is reported and holds the button", "UI", (await submit.isDisabled()) ? "PASS" : "FAIL", await shot(page, "email-check-taken"));

  // And a good institutional address says what will happen to it.
  await email.fill("somchai.new@pkru.ac.th");
  await expect(status).toContainText("อีเมลสถาบัน", { timeout: 15_000 });
  // Marked as institutional — but the button stays held until the address
  // is proven with a code; what appears instead is the offer to send one.
  const offersCode = (await page.getByRole("button", { name: /ส่งรหัสยืนยัน/ }).count()) === 1;
  ledger("Register", "an institutional address is marked, offers a code, and the button waits for it", "UI", offersCode && (await submit.isDisabled()) ? "PASS" : "FAIL", note("email-check-ok.txt", await status.innerText()));
});

test("email verification: the submit waits for a code, a wrong code is counted, the right one unlocks, a changed address withdraws it", async ({ page }) => {
  const email = `qa.otp.${Date.now()}@qa-run.ac.th`;
  await page.goto("/register");
  await hydrated(page, "form");
  const submit = page.locator('button[type="submit"]');
  const emailField = page.locator("#email");

  await emailField.fill(email);
  await expect(page.locator("#email-check")).toContainText(/ใช้งานได้|ไม่มีเซิร์ฟเวอร์/, { timeout: 15_000 });
  ledger("Register", "before any code the submit button is held", "UI", (await submit.isDisabled()) ? "PASS" : "FAIL", await shot(page, "otp-locked"));

  await page.getByRole("button", { name: /ส่งรหัสยืนยัน/ }).click();
  await page.locator("#email-code").waitFor({ timeout: 30_000 });
  const [[rows]] = db(`select count(*) from email_verification_codes where email = '${email}' and verified_at is null`);
  ledger("Register", "requesting a code stores one hashed row for the address", "DB", rows === "1" ? "PASS" : "FAIL", note("otp-row.txt", `rows=${rows}`));

  plantEmailCode(email);
  // The mail shows the code spaced out, so it is pasted that way; the field
  // has to take the digits and drop the rest (a maxLength would cut first).
  await page.locator("#email-code").focus();
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData("text/plain", "1 1 1 1 1 1");
    document.getElementById("email-code")!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await expect(page.locator("#email-code")).toHaveValue("111111");
  ledger("Register", "a spaced code pasted from the mail lands as six digits", "UI", "PASS", await shot(page, "otp-paste"));
  await page.getByRole("button", { name: /^ยืนยันรหัส$/ }).click();
  await expect(page.locator("#email-verify")).toContainText("ลองได้อีก 4 ครั้ง", { timeout: 15_000 });
  ledger("Register", "a wrong code is refused and counted, button still held", "UI", (await submit.isDisabled()) ? "PASS" : "FAIL", await shot(page, "otp-wrong"));

  await page.locator("#email-code").fill(QA_EMAIL_CODE);
  await page.getByRole("button", { name: /^ยืนยันรหัส$/ }).click();
  await page.locator("#email-verified").waitFor({ timeout: 15_000 });
  const tokenPresent = (await page.locator('input[name="emailVerificationToken"]').count()) === 1;
  ledger("Register", "the right code shows the tick, carries a token and releases the button", "UI", tokenPresent && !(await submit.isDisabled()) ? "PASS" : "FAIL", await shot(page, "otp-verified"));

  // The proof is for that address only: editing it takes the tick away.
  await emailField.fill(email.replace("qa.otp", "qa.other"));
  await page.waitForTimeout(900);
  const tickGone = (await page.locator("#email-verified").count()) === 0;
  ledger("Register", "changing the address withdraws the verification", "UI", tickGone && (await submit.isDisabled()) ? "PASS" : "FAIL", await shot(page, "otp-withdrawn"));

  // And the server does not take the form's word for it: a submit that
  // carries no token is refused whatever the button state was.
  await emailField.fill(email);
  await page.waitForTimeout(900);
  await page.locator('input[name="avatar"]').setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: pngBuffer() });
  await page.locator('input[name="name"]').fill("QA_OTP_NO_TOKEN");
  await page.locator('input[name="phone"]').fill("081-000-1999");
  await page.locator("#password").fill(QA.password);
  await page.evaluate(() => {
    const form = document.querySelector("form") as HTMLFormElement;
    form.querySelector('input[name="emailVerificationToken"]')?.remove();
    (form.querySelector('button[type="submit"]') as HTMLButtonElement).disabled = false;
    form.requestSubmit();
  });
  await page.locator('form > [role="alert"]').waitFor({ timeout: 45_000 });
  const alert = await page.locator('form > [role="alert"]').innerText();
  const [[created]] = db(`select count(*) from users where email = '${email}'`);
  ledger("Register", "a submit without the proof token is refused by the server and creates nothing", "UI", /ยืนยันอีเมล/.test(alert) && created === "0" ? "PASS" : "FAIL", await shot(page, "otp-no-token"));

  db(`delete from email_verification_codes where email like 'qa.otp.%' or email like 'qa.other.%'`);
});

test("password reset link works once: a second use is refused, the new password signs in", async ({ page }) => {
  // The signature covers the account's current password hash (src/lib/reset-token.ts),
  // so the link stops verifying as soon as it has set a password. Before, it
  // stayed good for its whole hour. Built here with the app's own signer and
  // secret, the same link the email would carry. tech2's password is "reset"
  // to the one it already had, so nothing later in the sweep notices.
  const secret = fs.readFileSync(path.resolve(__dirname, "..", "..", "..", ".env"), "utf8").match(/^AUTH_SECRET="?([^"\r\n]+)"?/m)?.[1];
  expect(secret, "AUTH_SECRET in .env").toBeTruthy();
  process.env.AUTH_SECRET = secret!;
  const [[id, hash]] = db(`select id, password from users where email = '${QA.tech2}'`);
  const link = `/reset-password?token=${createResetToken(Number(id), hash === "NULL" ? null : hash!)}`;

  const submit = async () => {
    await page.goto(link); await hydrated(page, "form");
    await page.locator("#password").fill(QA.password);
    await page.getByRole("button", { name: /บันทึกรหัสผ่านใหม่/ }).click();
    await page.waitForTimeout(2500);
    return page.evaluate(() => document.body.innerText);
  };

  const first = await submit();
  ledger("Password reset", "first use of a reset link sets the password", "UI", /ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว/.test(first) ? "PASS" : "FAIL", await shot(page, "reset-first-use"));
  const [[hashAfter]] = db(`select password from users where email = '${QA.tech2}'`);
  const second = await submit();
  const refused = /invalid or has expired/i.test(second) && !/ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว/.test(second);
  const [[hashAfterSecond]] = db(`select password from users where email = '${QA.tech2}'`);
  ledger("Password reset", `the same link a second time is refused and changes nothing (hash ${hashAfterSecond === hashAfter ? "unchanged" : "CHANGED"})`, "UI", refused && hashAfterSecond === hashAfter ? "PASS" : "FAIL", await shot(page, "reset-second-use"));
  const url = await loginViaForm(page, QA.tech2, QA.password);
  ledger("Password reset", "the password the link set signs in", "UI", /\/tech/.test(url) ? "PASS" : "FAIL", await shot(page, "reset-login"));

  expect(first).toMatch(/ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว/);
  expect(refused, "second use of the link refused").toBe(true);
  expect(hashAfterSecond).toBe(hashAfter);
});

test("sign-in throttle: the 11th wrong attempt for one address is refused, other addresses are not", async ({ page }) => {
  // An address that does not exist, new on every run: the count is per
  // address (src/lib/login-throttle.ts), so this never locks an account the
  // rest of the sweep signs in with. Unknown addresses count like wrong
  // passwords, or the throttle would tell which addresses exist.
  const target = `qa.throttle.${Date.now()}@qa-run.ac.th`;
  const message = async () => (await page.evaluate(() => document.body.innerText)).match(/พยายามเข้าสู่ระบบ[^\n]*|อีเมลหรือรหัสผ่านไม่ถูกต้อง[^\n]*/)?.[0] ?? "(no message)";
  const seen: string[] = [];
  for (let i = 1; i <= 10; i++) { await loginViaForm(page, target, `wrong-${i}`); seen.push(await message()); }
  const generic = seen.every((m) => /อีเมลหรือรหัสผ่านไม่ถูกต้อง/.test(m));
  ledger("Login throttle", `attempts 1-10 on one address get the ordinary refusal (${seen.filter((m) => /อีเมลหรือรหัสผ่าน/.test(m)).length}/10)`, "UI", generic ? "PASS" : "FAIL", await shot(page, "throttle-10"));
  await loginViaForm(page, target, "wrong-11");
  const eleventh = await message();
  ledger("Login throttle", `attempt 11: "${eleventh}"`, "UI", /พยายามเข้าสู่ระบบ/.test(eleventh) ? "PASS" : "FAIL", await shot(page, "throttle-11"));
  await loginViaForm(page, `qa.throttle.other.${Date.now()}@qa-run.ac.th`, "wrong");
  const other = await message();
  ledger("Login throttle", `another address right after: "${other}"`, "UI", /อีเมลหรือรหัสผ่านไม่ถูกต้อง/.test(other) ? "PASS" : "FAIL", await shot(page, "throttle-other"));
  const [[rows]] = db(`select count(*) from login_failures where email = '${target}'`);
  note("throttle.txt", `rows for ${target}: ${rows}\n${seen.join("\n")}\n11: ${eleventh}\nother: ${other}`);
  expect(generic, "first ten attempts").toBe(true);
  expect(eleventh).toMatch(/พยายามเข้าสู่ระบบ/);
  expect(other).toMatch(/อีเมลหรือรหัสผ่านไม่ถูกต้อง/);
});

test("sign-in throttle per IP: 50 failures from one IP refuse a fresh address from it, not from elsewhere", async ({ browser }) => {
  // The per-IP limit (50 in 15 minutes, src/lib/login-throttle.ts) counts
  // failures across every address. Fifty real attempts would take minutes,
  // so they are planted in login_failures for a documentation-range IP that
  // is new on every run; the attempt that matters goes through the form.
  // Locally the IP comes from X-Forwarded-For, which next start keeps when
  // the client sends one. On Vercel the header is replaced with the real
  // client address (probed 5 Oct 2026), so it cannot be used to dodge this.
  const ip = `198.51.100.${(Date.now() % 250) + 1}`;
  const tag = Date.now();
  db(`insert into login_failures (email, ip, created_at)
      select 'qa.ipthrottle.' || g || '.${tag}@qa-run.ac.th', '${ip}', now() at time zone 'utc'
      from generate_series(1, 50) g`);
  const fresh = `qa.ipthrottle.fresh.${tag}@qa-run.ac.th`;
  const message = (p: Page) =>
    p.evaluate(() => document.body.innerText).then((t) => t.match(/พยายามเข้าสู่ระบบ[^\n]*|อีเมลหรือรหัสผ่านไม่ถูกต้อง[^\n]*/)?.[0] ?? "(no message)");

  const fromIt = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip } });
  const p1 = await fromIt.newPage();
  await loginViaForm(p1, fresh, "wrong");
  const blocked = await message(p1);
  ledger("Login throttle", `a never-tried address from an IP with 50 recent failures: "${blocked}"`, "UI", /พยายามเข้าสู่ระบบ/.test(blocked) ? "PASS" : "FAIL", await shot(p1, "throttle-ip-blocked"));
  await fromIt.close();

  const elsewhere = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.254" } });
  const p2 = await elsewhere.newPage();
  await loginViaForm(p2, fresh, "wrong");
  const allowed = await message(p2);
  ledger("Login throttle", `the same address from another IP gets the ordinary refusal: "${allowed}"`, "UI", /อีเมลหรือรหัสผ่านไม่ถูกต้อง/.test(allowed) ? "PASS" : "FAIL", await shot(p2, "throttle-ip-elsewhere"));
  await elsewhere.close();

  const [[recorded]] = db(`select count(*) from login_failures where ip = '${ip}'`);
  ledger("Login throttle", `the refused attempt was not counted against the IP again (${recorded} rows, planted 50)`, "DB", recorded === "50" ? "PASS" : "FAIL");
  expect(blocked).toMatch(/พยายามเข้าสู่ระบบ/);
  expect(allowed).toMatch(/อีเมลหรือรหัสผ่านไม่ถูกต้อง/);
});

test("security headers are sent, and the camera stays allowed for the QR scanner", async ({ page }) => {
  const res = await page.request.get("/login");
  const h = res.headers();
  const want: Array<[string, RegExp]> = [
    ["content-security-policy", /frame-ancestors 'self'/],
    ["x-frame-options", /^SAMEORIGIN$/i],
    ["x-content-type-options", /^nosniff$/i],
    ["referrer-policy", /strict-origin-when-cross-origin/],
    ["permissions-policy", /camera=\(self\)/],
    // The full policy, reporting only (next.config.ts), and where it reports.
    ["content-security-policy-report-only", /default-src 'self'.*script-src 'self' 'unsafe-inline'.*object-src 'none'.*report-uri \/api\/csp-report/],
    ["reporting-endpoints", /csp="\/api\/csp-report"/],
  ];
  const missing = want.filter(([k, re]) => !re.test(h[k] ?? "")).map(([k]) => `${k}=${h[k] ?? "(none)"}`);
  ledger("Headers", `security headers on /login${missing.length ? ": missing " + missing.join(", ") : ""}`, "API", missing.length === 0 ? "PASS" : "FAIL", note("security-headers.txt", JSON.stringify(h, null, 1)));
  expect(missing).toEqual([]);
});

test("CSP report endpoint takes both report formats and answers 204", async ({ page }) => {
  // src/app/api/csp-report. Browsers send report-uri bodies as
  // application/csp-report and Reporting API batches as
  // application/reports+json; neither may error, and junk is ignored.
  const legacy = await page.request.post("/api/csp-report", {
    headers: { "content-type": "application/csp-report" },
    data: JSON.stringify({ "csp-report": { "document-uri": "http://localhost:3000/qa", "violated-directive": "img-src", "blocked-uri": "https://qa.invalid/x.png" } }),
  });
  const batch = await page.request.post("/api/csp-report", {
    headers: { "content-type": "application/reports+json" },
    data: JSON.stringify([{ type: "csp-violation", body: { documentURL: "http://localhost:3000/qa", effectiveDirective: "script-src-elem", blockedURL: "https://qa.invalid/x.js" } }]),
  });
  const junk = await page.request.post("/api/csp-report", { headers: { "content-type": "text/plain" }, data: "not json" });
  const codes = [legacy.status(), batch.status(), junk.status()];
  ledger("Headers", `CSP report endpoint: legacy ${codes[0]}, Reporting API ${codes[1]}, junk ${codes[2]}`, "API", codes.every((c) => c === 204) ? "PASS" : "FAIL");
  expect(codes).toEqual([204, 204, 204]);
});

test("field LCP: automated browsers send nothing, and only Vercel production stores a sample", async ({ browser }) => {
  // src/components/shared/web-vitals-reporter.tsx + /api/vitals (paper, temporary).
  // The database is shared with production, so this sweep must leave no rows.
  const [[qr]] = db("select qr_code from air_conditioners order by id limit 1");
  const [[before]] = db("select count(*) from web_vital_samples");
  const vitalsPosts = (ctxPage: import("@playwright/test").Page) => {
    const seen: string[] = [];
    ctxPage.on("request", (r) => { if (r.url().endsWith("/api/vitals")) seen.push(r.postData() ?? ""); });
    return seen;
  };
  // LCP is final once the page is hidden; a navigation away does that.
  const loadAndLeave = async (p: import("@playwright/test").Page) => {
    await p.goto(`/qr/${qr}`, { waitUntil: "load" });
    await p.waitForTimeout(1500);
    await p.goto("/login", { waitUntil: "load" });
    await p.waitForTimeout(800);
  };

  // 1. As every QA browser is: navigator.webdriver is true, so nothing is sent.
  const auto = await browser.newContext();
  const ap = await auto.newPage();
  const autoPosts = vitalsPosts(ap);
  await loadAndLeave(ap);
  await auto.close();
  ledger("Field LCP", `an automated browser sends no samples (${autoPosts.length} sent)`, "UI", autoPosts.length === 0 ? "PASS" : "FAIL");

  // 2. The same browser pretending not to be automated: the reporter must send one LCP for /qr/[id]...
  const human = await browser.newContext();
  await human.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
  const hp = await human.newPage();
  const humanPosts = vitalsPosts(hp);
  await loadAndLeave(hp);
  await human.close();
  const sent = humanPosts.map((b) => { try { return JSON.parse(b); } catch { return null; } }).filter(Boolean);
  const qrSample = sent.find((s) => s.path === "/qr/[id]" && s.name === "LCP");
  ledger("Field LCP", `a real browser sends an LCP sample for /qr/[id] (${sent.length} sent, value ${qrSample?.value?.toFixed?.(0) ?? "-"} ms)`, "UI", qrSample && qrSample.value > 0 ? "PASS" : "FAIL");

  // 3. ...and this local server, not being Vercel production, stores none of it.
  const [[after]] = db("select count(*) from web_vital_samples");
  ledger("Field LCP", `nothing stored off production (rows ${before} → ${after})`, "DB", before === after ? "PASS" : "FAIL");
  expect(autoPosts).toHaveLength(0);
  expect(qrSample).toBeTruthy();
  expect(after).toBe(before);
});

test("daily cron route: refuses without the secret, runs with it and records the run", async ({ page }) => {
  // src/app/api/cron/overdue-maintenance. The harness gives its server
  // CRON_SECRET=qa-cron-secret (playwright.config.ts); restore puts
  // system_settings.overdue_sync_at back, so production never sees this run.
  const path_ = "/api/cron/overdue-maintenance";
  const none = await page.request.get(path_);
  const wrong = await page.request.get(path_, { headers: { authorization: "Bearer not-it" } });
  const right = await page.request.get(path_, { headers: { authorization: "Bearer qa-cron-secret" } });
  const body = await right.json().catch(() => ({}));
  const [[age]] = db("select coalesce(extract(epoch from (now() at time zone 'UTC' - overdue_sync_at))::int, -1) from system_settings where id = 1");
  const recorded = Number(age) >= 0 && Number(age) < 120;
  ledger("Cron", `no secret → ${none.status()}, wrong secret → ${wrong.status()}, right secret → ${right.status()} ${JSON.stringify(body)}; overdue_sync_at ${recorded ? `set ${age}s ago` : `not set (${age})`}`, "API", none.status() === 401 && wrong.status() === 401 && right.status() === 200 && typeof body.created === "number" && recorded ? "PASS" : "FAIL", note("cron.txt", JSON.stringify({ none: none.status(), wrong: wrong.status(), right: right.status(), body, age })));
  expect(none.status()).toBe(401);
  expect(wrong.status()).toBe(401);
  expect(right.status()).toBe(200);
  expect(recorded, "overdue_sync_at recorded").toBe(true);
});
