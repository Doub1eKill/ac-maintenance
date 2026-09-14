import type { Page } from "@playwright/test";
import { test, ledger, shot, note, hydrated, pngBuffer } from "../../lib";

const body = (page: Page) => page.evaluate(() => document.body.innerText as string);
// The result alert's title, not the "กด บันทึกรูปโปรไฟล์ ด้านล่าง" hint that
// appears the moment a file is chosen.
const status = (t: string) => t.match(/บันทึกไม่สำเร็จ[^\n]*|บันทึกแล้ว/)?.[0] ?? "(no status text)";
const storedAvatar = async (page: Page) => {
  await page.goto("/tech/profile"); await page.locator("main").last().waitFor({ timeout: 120_000 }); await page.waitForTimeout(800);
  return (await page.locator("main img").first().getAttribute("src").catch(() => null)) ?? "(no img)";
};

// Choosing a picture no longer saves it by itself: the panel holds it and the
// "บันทึกรูปโปรไฟล์" button commits (changed after run 20260913-1742).
async function choose(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  await page.goto("/tech/profile"); await page.locator("main").last().waitFor({ timeout: 120_000 }); await hydrated(page, "main"); await page.waitForTimeout(800);
  await page.locator('input[type="file"]').first().setInputFiles(file);
  await page.waitForTimeout(400);
  const save = page.getByRole("button", { name: /บันทึกรูปโปรไฟล์/ });
  if (await save.count()) await save.click();
  await page.getByText(/^บันทึกแล้ว$|^บันทึกไม่สำเร็จ$/).first().waitFor({ timeout: 40_000 }).catch(() => {});
  await page.waitForTimeout(1200);
  return status(await body(page));
}

test("profile avatar: text bytes named .jpg are refused, a zero-byte file too, a real PNG is stored (BUG-012)", async ({ page }) => {
  test.setTimeout(300_000);
  const before = await storedAvatar(page);

  const s1 = await choose(page, { name: "fake.jpg", mimeType: "image/jpeg", buffer: Buffer.from("this is not an image at all\n".repeat(50)) });
  note("upload-fake-jpg.txt", s1);
  ledger("Uploads", `text bytes named fake.jpg (image/jpeg): page says "${s1}"`, "UI", /ไม่สำเร็จ/.test(s1) ? "PASS" : "FAIL", await shot(page, "upload-fake-jpg"));
  ledger("Uploads", "fake.jpg: nothing stored (avatar unchanged after reload)", "UI", (await storedAvatar(page)) === before ? "PASS" : "FAIL", "runs/" + process.env.QA_RUN + "/upload-fake-jpg.png");

  // Zero bytes is "no file chosen" to the form, so a plain save is fine too —
  // as long as nothing lands in /uploads.
  const s2 = await choose(page, { name: "empty.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(0) });
  ledger("Uploads", `zero-byte empty.jpg: page says "${s2}", avatar unchanged`, "UI", (await storedAvatar(page)) === before ? "PASS" : "FAIL", await shot(page, "upload-zero-byte"));

  // A file called .html with an image/* type must never come back as a page.
  const s3 = await choose(page, { name: "page.html", mimeType: "image/png", buffer: Buffer.from("<html><script>alert(1)</script></html>") });
  ledger("Uploads", `HTML bytes named page.html (image/png): page says "${s3}"`, "UI", /ไม่สำเร็จ/.test(s3) && (await storedAvatar(page)) === before ? "PASS" : "FAIL", await shot(page, "upload-html-as-image"));

  const s4 = await choose(page, { name: "real.png", mimeType: "image/png", buffer: pngBuffer([10, 120, 220], 96) });
  const src = await storedAvatar(page);
  ledger("Uploads", `real PNG: page says "${s4}", stored as ${src}`, "UI", /บันทึกแล้ว/.test(s4) && /%2Fuploads%2F[^&]*\.jpg|\/uploads\/[^?]*\.jpg/.test(src) ? "PASS" : "FAIL", await shot(page, "upload-real-png"));
});
