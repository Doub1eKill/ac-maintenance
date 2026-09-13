import { test, ledger, shot, note, hydrated } from "../../lib";

const body = (page) => page.evaluate(() => document.body.innerText as string);
const status = (t: string) => t.match(/บันทึกแล้ว|บันทึกไม่สำเร็จ|รูปโปรไฟล์[^\n]*/)?.[0] ?? "(no status text)";

test("profile avatar: a text file renamed .jpg and a zero-byte image", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto("/tech/profile"); await page.locator("main").last().waitFor({ timeout: 120_000 }); await hydrated(page, "main"); await page.waitForTimeout(1000);
  const input = page.locator('input[type="file"]').first();

  await input.setInputFiles({ name: "fake.jpg", mimeType: "image/jpeg", buffer: Buffer.from("this is not an image at all\n".repeat(50)) });
  await page.getByText(/บันทึกแล้ว|บันทึกไม่สำเร็จ|รูปโปรไฟล์ต้อง/).first().waitFor({ timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const s1 = status(await body(page));
  note("upload-fake-jpg.txt", s1);
  ledger("Uploads", `text bytes named fake.jpg (image/jpeg): page says "${s1}" — DB/file checked separately`, "UI", /ไม่สำเร็จ|ต้องเป็นไฟล์รูปภาพ/.test(s1) ? "PASS" : "FAIL", await shot(page, "upload-fake-jpg"));

  await page.reload(); await page.locator("main").last().waitFor({ timeout: 60_000 }); await hydrated(page, "main"); await page.waitForTimeout(800);
  await page.locator('input[type="file"]').first().setInputFiles({ name: "empty.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(0) });
  await page.getByText(/บันทึกแล้ว|บันทึกไม่สำเร็จ|รูปโปรไฟล์ต้อง/).first().waitFor({ timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const s2 = status(await body(page));
  ledger("Uploads", `zero-byte empty.jpg: page says "${s2}"`, "UI", /ไม่สำเร็จ|ต้องเป็นไฟล์รูปภาพ|\(no status/.test(s2) ? "PASS" : "FAIL", await shot(page, "upload-zero-byte"));
});
