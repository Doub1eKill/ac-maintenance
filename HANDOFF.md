# Project Handoff & Technical Summary

# 🐞 สถานะบั๊กที่รู้แล้ว ณ 13 ก.ย. 2026 — ยังไม่แก้ทั้งหมด (DoubleKill)

เจ้าของโปรเจกต์ถาม *"ยังมีบัคอีกมั้ย"* — เช็คซ้ำบน `master` `bbf7533` แล้วจดไว้ที่นี่ก่อนลงมือ · **ไม่มีการแก้โค้ดในหัวข้อนี้** เป็น snapshot ของ backlog

## 🔴 บั๊กที่รู้แล้ว ยังอยู่ (ค้างมาตั้งแต่ 8 ก.ย.)

| # | บั๊ก | ที่อยู่ | ผลกระทบ |
|---|---|---|---|
| 1 | หน้า login ยังมีป้าย **"Multi-Tenant Campus Platform"** ทั้งที่ถอด multi-tenancy ไปตั้งแต่ 11 ส.ค. | `src/components/auth/auth-layout.tsx:33` | ผู้ใช้ทุกคนเห็นทุกครั้งที่เข้าระบบ · แก้ 1 บรรทัด |
| 2 | หน้าสมัครสำเร็จพาดหัว **"ลงทะเบียนสำเร็จ (Pending)" ตายตัว** ทั้งที่อีเมล `.ac.th`/`.edu`/`.edu.th` ได้ `active` ทันที | `src/components/auth/register-form.tsx:82` | จอเดียวขัดกันเอง — บอก pending แต่ล็อกอินได้เลย |
| 3 | `prisma.config.ts` **ไม่มี key `seed`** → `npx prisma db seed` ใช้ไม่ได้ | `prisma.config.ts` | dev เท่านั้น · ใช้ `npx tsx prisma/seed.ts` ไปก่อน |

## 🟠 eslint 31 error — มีของจริงปน ไม่ใช่แค่สไตล์

baseline **50 (31 error / 19 warning)** ไม่มีใครเพิ่มตั้งแต่ 8 ก.ย. แต่ไม่มีใครลดด้วย · แยกตาม rule:

| จำนวน | rule | ความหมายจริง | ไฟล์ |
|---|---|---|---|
| **17** | `react-hooks/set-state-in-effect` | React Compiler ชี้ `setState` ใน effect body → cascading re-render · ส่วนใหญ่เป็น "sync state จาก props" ที่ควรเป็น derived value หรือ `key` remount · **ไม่พัง แต่ render เกินจำเป็น** | `trash-modal:75` · `ac-history-modal:115` · `asset-manager:153` · `create-work-order-modal:49` · `settings-panel:234,252` · `team-panel:66` · `user-approvals-panel:53` · `work-order-detail-dialog:54` · `dashboard-search:44` · `building-groups:275` · `profile-panel:404` · `job-pool-panel:44,50` · `qr-scan-modal:24` · `tech-shell:115` · `hooks/use-mobile:14` |
| **10** | `no-explicit-any` | type hole · **น่าห่วงสุด 3 จุด**: `lib/auth.config.ts:67-68` (callbacks JWT/session = ทางเข้า auth) และ `lib/tech/maintenance-log.ts:128` (เขียน DB) | + `api/admin/maintenance-schedules/route.ts:118` · `upcoming-maintenance-table:282` · `log-action-modal:23-24` · `qr-scan-modal:20` · `option-wheel:66` · `lib/admin/air-conditioners.ts:92` |
| 3 | `react-hooks/refs` ×2 + `immutability` | อ่าน/แก้ ref ระหว่าง render | ทั้งหมดใน `ui/option-wheel.tsx:83,84,144` |
| 1 | `prefer-const` | | `lib/admin/air-conditioners.ts:92` (บรรทัดเดียวกับ `any`) |

> วิธีดึงรายการนี้ใหม่: `npx eslint src --format json -o /tmp/eslint.json` แล้ว group ตาม `ruleId` ที่ `severity === 2` · **อย่าใช้ `--max-warnings`** ใช้ไม่ได้บน Next 16

## 🟡 ของค้างจากงานในเซสชัน 9–13 ก.ย.

- `FlatACUnit.location` ใน `admin/qr-code-manager.tsx` — field ตาย ประกอบสตริงทุก render ไม่มีใครอ่าน
- คอมเมนต์อธิบายขนาดสติกเกอร์ (34→46mm, ทำไม 150 ไม่ใช่ 194) ยังอยู่ใน `qr-code-manager.tsx` ~บรรทัด 95–120 ขณะที่ค่าคงที่ย้ายไป `shared/qr-sticker.tsx` แล้ว — **แก้เลขในไฟล์ใหม่ต้องแก้คอมเมนต์ในไฟล์เก่าด้วย**
- `useSettleWithoutFrames` เคส "frame กลับมาหลัง 10 วิ" ปล่อยไว้โดยตั้งใจ — มีแค่ใน Browser pane ที่ได้ frame เดี่ยวจาก screenshot
- **7 commit ของ Esther03u (11 ก.ย.) ผ่านแค่ `tsc` + eslint + เปิดหน้าดู** — ยังไม่เคยทดสอบ interaction: ฟิลเตอร์ตารางงานใกล้ถึงรอบ · bottom nav มือถือฝั่งช่าง · โดนัทสถิติ · job pool animation

## ⚪ ที่ยังไม่รู้ — เพราะยังไม่มีใครหา

โปรเจกต์ **ไม่มี test framework** (ไม่มี vitest/jest/playwright ใน deps) · การทดสอบทั้งหมดคือคน/AI กดผ่านเบราว์เซอร์ทีละหน้า · ฟีเจอร์ที่ทำ 8–13 ก.ย. ทดสอบเฉพาะ happy path + เคสที่นึกออก

**ไม่เคยแตะเลยตั้งแต่ 11 ก.ย.:** ฝั่งช่างทั้งหมด (job pool, บันทึกงาน, สแกน QR) · reset password + SMTP · อัปโหลดรูป · ใบงาน/มอบหมายงาน · การเรียงภาษาไทยกับข้อมูลจริง

## ขั้นต่อไปที่เสนอ (รอเจ้าของตัดสิน)

1. **รัน `/anthropic-skills:qa-tester`** — ขับ Chromium จริง ล็อกอิน 2 บทบาท หาบั๊ก/permission bypass ทั้งระบบ เขียนรายงานพร้อมหลักฐาน · เหมาะตอนนี้ที่มีโค้ดจาก 2 คนเข้ามาโดยไม่มี test คุม
2. เก็บ 🔴 3 ตัวก่อน — ใช้เวลาไม่นาน
3. ลด `no-explicit-any` 3 จุดใน auth/maintenance-log ก่อนตัวอื่น

---

# 🎞️ motion primitives ทุกตัวลงจอดเองได้แม้ไม่มี frame — รอบสอง (13 ก.ย. 2026, DoubleKill)

branch `fix/motion-settle-without-frames` ตัดจาก `master` `03464b6` · ต่อจากหัวข้อ "🩹 `MotionNumber` ค้างเลขกลางทาง" — เจ้าของโปรเจกต์สั่ง *"แก้เลย"* กับข้อสังเกต 4 ข้อที่จดไว้ท้ายหัวข้อนั้น แก้ครบทั้ง 4

## `MotionNumber` เขียนใหม่เป็นแบบ idiomatic ของ motion (ข้อ 2, 3, 4)

`<motion.span>{label}</motion.span>` โดย `label` เป็น `MotionValue<string>` — motion เขียน `textContent` ให้ตรงๆ ทุกครั้งที่ค่าเปลี่ยน **ไม่ re-render React** · ตรวจใน `motion-dom/render/dom/DOMVisualElement.mjs` แล้วว่า `children.on("change", latest => this.current.textContent = latest)` **เป็น sync** ไม่ผ่าน frame loop — นี่คือคุณสมบัติที่ทำให้ `label.set()` ใน `settle()` ไปถึง DOM ได้ทั้งที่ rAF ตาย

> ⚠️ **ห้ามใช้ `useTransform` มาแปลงเลขเป็นข้อความ** — `useCombineMotionValues` ข้างในมัน schedule ผ่าน `frame.preRender` = rAF · ค่าที่แปลงจะไม่ไปถึง DOM ในแท็บที่ซ่อน ทำลายทุกอย่างที่แก้มา · ใช้ MotionValue สตริงตัวเดียวแล้ว `.set(format(n))` ใน `onUpdate` แทน

| ข้อ | เดิม | ใหม่ | พิสูจน์ (harness เคส 4) |
|---|---|---|---|
| 2 flash 1 frame ตอน mount | `useState(value)` → paint "73" → frame แรกดึงลง 0 | `useLayoutEffect` เซ็ต label เป็นจุดเริ่มก่อน paint (SSR ยังเป็น 73 สำหรับ no-JS/hydration ช้า) | before first frame: เก่า `"73"` → ใหม่ `"0"` |
| 3 `value` เปลี่ยนกลางทาง | `prevValueRef` เก็บ*เป้าเก่า* → กระโดด | `positionRef` อัปเดตทุก frame → วิ่งต่อจากที่อยู่ | 63→**83**→95 (กระโดด 17) vs 66→**77**→87→95 (ต่อเนื่อง) |
| 4 `setState` ทุก frame × 5 ตัว | ~300 re-render/วิ | 0 re-render ระหว่าง animate | — |

3 เส้นทางกู้ (onComplete / visibilitychange / timer backstop) ยังอยู่ครบ — harness เคส 1–3 ผลเท่ารอบแรก · `useLayoutEffect` ปลอดภัยเพราะ React 19 ไม่เตือน SSR แล้ว และ motion mount child subscription ใน **ref callback** (`use-motion-ref.mjs`) ซึ่งมาก่อน layout effect ของเรา

## ครอบครัว fade ทั้งหมดได้ `useSettleWithoutFrames` (ข้อ 1)

`MotionFade` · `MotionStagger` · `MotionStaggerItem` · `MotionModalContainer` — ทุกตัวที่ `initial={{ opacity: 0 }}` ตอน mount · `MotionCard`/`MotionActivePill` ไม่มี mount animation ไม่ต้อง

hook ตัวใหม่ `src/components/ui/motion/use-settle-without-frames.ts` ใช้ 3 เส้นทางเดียวกับ `MotionNumber` แล้วเขียน `opacity: 1; transform: none` ลง inline style · **แต่แค่นั้นไม่พอ** เจอของจริง 2 ชั้นระหว่างทดสอบ:

### 🔴 ชั้นที่ 1: motion ใช้ Web Animations API — inline style แพ้ WAAPI ใน cascade

motion วิ่ง opacity/transform ผ่าน `element.animate()` (WAAPI) เมื่อทำได้ · **animation ที่กำลัง running มีลำดับความสำคัญสูงกว่า inline style** · เขียน `opacity: 1` ไปก็ไม่เปลี่ยนอะไร — วัดได้ inline `opacity: 1` แต่ computed `0.069`

ต้อง **`el.getAnimations().forEach(a => a.finish())`** — sync ไม่ต้องรอ frame และ motion ได้ finish event ไป commit ค่าของตัวเอง · wrap `try` เพราะ animation แบบ infinite `finish()` ไม่ได้ (ของเราไม่มี)

### 🔴 ชั้นที่ 2: motion *สร้าง* animation บน frame ไม่ใช่ตอน mount

ถ้า settle วิ่งตอน rAF ตาย (mount ตอนซ่อน → `setTimeout(settle, 0)`) `getAnimations()` ยังว่าง — animation ยังไม่ถูกสร้าง · พอ frame มาทีหลัง (screenshot ปลุก 1 frame) motion สร้าง WAAPI **เริ่มจาก opacity 0** ทับ inline ของเราแล้วค้าง · วัดได้ `startTime: 8354ms` = สร้างหลัง load 8 วินาที

**`onAnimationStart` ของ motion ช่วยไม่ได้** — มันยิงตอน*ขอ* animation ใน effect เดียวกัน ก่อน frame ที่สร้างจริง · ลองแล้วไม่ทำงาน

ทางออก: ถ้า settle ไม่เจออะไรให้ finish → **เฝ้าด้วย `setInterval` 200ms นาน 10 วิ** finish ทันทีที่โผล่ · หยุดเมื่อ `onAnimationComplete` (mount animation จบแล้วโดยทางใดก็ตาม) · **หลังจากนั้นไม่แตะ element อีก** exit animation จึงยังเล่นตามปกติ

> เคส "frame กลับมาหลัง 10 วิ" ปล่อยไว้ — ในเบราว์เซอร์จริง frame กลับมาพร้อมแท็บแล้ว animation ก็เล่นจนจบเอง · เคสนี้มีแค่ใน pane ที่ได้ frame เดี่ยวๆ จาก screenshot

## ทดสอบใน pane ที่ rAF ตายจริง (สภาพที่เจอบั๊ก)

reload ตอน pane ซ่อน → screenshot ที่ ~7 วิ (ปลุก 1 frame) → อ่านที่ 11 วิ

| | ก่อน | หลัง |
|---|---|---|
| element ที่ motion ใส่ style | 7 | 7 |
| computed opacity < 1 | **1** (wrapper ทั้งหน้าใน `dashboard-layout` ค้าง 0.40 + WAAPI running) | **0** |
| WAAPI running ค้าง | 1 | **0** |
| KPI | `73 · 24 · 27 · 4` | `73 · 24 · 27 · 4` |
| screenshot แถว KPI | **มืดทั้งแถว** | **เห็นครบ** |

`rafAlive: false` ตลอดการวัด · ตรวจซ้ำที่ 27 วิ: element ที่ dim = 0, animation running = 0

harness jsdom (เคส 1–4, เก่า/v1/v2) รันแล้วผลตามตารางข้างบน · jsdom ติดตั้ง `--no-save` แล้วถอด ไม่แตะ `package.json`/lock

`tsc --noEmit` 0 error · eslint **50 (31/19)** เท่า baseline · ไม่แตะ DB

## ไฟล์ที่แตะ

| ไฟล์ | ทำอะไร |
|---|---|
| `ui/motion/motion-number.tsx` | เขียนใหม่ — MotionValue สตริง + `useLayoutEffect` + `positionRef` |
| `ui/motion/use-settle-without-frames.ts` | **ใหม่** — hook + `GENTLE_SPRING_SETTLE_MS` |
| `ui/motion/motion-fade.tsx` | `MotionFade`/`MotionStagger`/`MotionStaggerItem` ใช้ hook · ref + spread `onAnimationComplete` |
| `ui/motion/motion-modal.tsx` | `MotionModalContainer` ใช้ hook |
| `ui/motion/index.ts` | export hook |

> ⚠️ **spread `{...settle}` ต้องอยู่ก่อน `{...props}`** — ถ้าวันหนึ่งมีคนส่ง `onAnimationComplete` มาเอง จะทับของ hook และ element นั้นจะไม่รู้ว่า mount animation จบ (watch จะวิ่งจนครบ 10 วิแล้วหยุดเอง ไม่พังแต่เสียฟีเจอร์) · วันนี้ไม่มี caller ไหนส่ง

---

# 🩹 `MotionNumber` ค้างเลขกลางทางเมื่อแท็บถูกซ่อน — แก้แล้ว (13 ก.ย. 2026, DoubleKill)

branch `fix/motion-number-hidden-tab` ตัดจาก `master` `466bfbe` · แก้กับดักที่จดไว้ในหัวข้อ "🧹 pull งานของ Esther03u" ด้านล่าง

## สาเหตุที่แท้จริง

`animate()` ของ `motion` ขับด้วย frame loop บน `requestAnimationFrame` · **เบราว์เซอร์หยุด rAF สนิทในแท็บที่ไม่ visible** (ไม่ใช่ช้าลง — หยุด) · component เดิมผูก DOM กับ React state ที่อัปเดต**เฉพาะจาก `onUpdate`** ไม่มีทางอื่นที่ค่าสุดท้ายจะไปถึงหน้าจอ

```
mount → animate(0 → 73) → frame 1..N ผ่าน rAF → [แท็บซ่อน] → ไม่มี frame N+1 → ค้างที่ 29 ตลอดไป
```

ค่าที่ค้าง**เป็นตัวเลขจริงที่ดูน่าเชื่อถือ** (29 เครื่อง) ไม่ใช่ 0 หรือ "—" นี่คือสิ่งที่ทำให้มันอันตราย — ผมเองยังไปไล่ `pages.ts` เสียเวลาทั้งที่ DB ให้ 73 ถูกต้องตลอด

## 🔴 ค้นพบระหว่างทาง: มีเคสที่ `visibilitychange` ไม่ยิงแต่ rAF ตายอยู่ดี

ใน Browser pane ของ Claude วัดได้ `document.visibilityState === "visible"` แต่ `requestAnimationFrame` **ไม่ยิงเลยแม้แต่ครั้งเดียวใน 3 วินาที** · Chromium หยุด rAF ให้หน้าต่างที่ถูกบัง (occluded) โดยไม่จำเป็นต้องเปลี่ยน `visibilityState` · แปลว่า**ฟัง `visibilitychange` อย่างเดียวไม่พอ** ต้องมีทางที่ไม่พึ่งทั้ง rAF และ event

ผลข้างเคียงในสภาพนั้น: **`MotionFade` ค้างที่ opacity 0** — KPI cards ทั้งแถวมองไม่เห็นในหน้าต่างที่ถูกบัง (เห็นใน screenshot) · หายเองทันทีที่ rAF กลับมา จึงไม่ใช่เลขผิดแบบ `MotionNumber` ยังไม่ได้แก้ตัวนั้น

## ที่แก้ — 3 เส้นทางที่ไม่พึ่ง frame loop ไปถึงค่าจริง

| เส้นทาง | ครอบคลุม |
|---|---|
| `onComplete: settle` | จบปกติ → เขียน `value` ตรงๆ ไม่ใช่ `Math.round(latest)` ของ frame สุดท้าย |
| `visibilitychange` → hidden → `settle()` | แท็บซ่อนกลางทาง (เคสที่เจอจริง) |
| `setTimeout(settle, duration*1000 + 200)` | **rAF ตายแต่ไม่มี event** — timer โดน throttle ในแท็บซ่อน (≥1 วิ) แต่**ยังยิง** ต่างจาก rAF ที่หยุดสนิท |
| mount ตอนซ่อนอยู่ / `prefers-reduced-motion` | ไม่ animate เลย · `setTimeout(settle, 0)` |

`settle = () => { controls?.stop(); setDisplayValue(value) }` · **ไม่มี `setState` ใน body ของ effect** ทุกจุดอยู่ใน callback จึงไม่ชน `react-hooks/set-state-in-effect` ที่เป็น error ในโปรเจกต์นี้ · เพิ่ม `useReducedMotion()` จาก `motion/react` เข้า deps

## พิสูจน์ด้วย harness ที่คุม rAF เอง — เทียบของเก่ากับของใหม่

**Browser pane ทดสอบเรื่องนี้ไม่ได้** เพราะ rAF ไม่ยิงเลย animation ไม่มีวันเริ่ม · และ**ทุกอย่างในหน้าเดียวกันติดไปด้วย**: frame loop ของ motion เป็น global — พอ rAF แรกไม่กลับมา มันจะไม่ขอ frame ใหม่อีกเลยตลอดอายุหน้า (ตรวจแล้วเป็นแบบนี้จริงทั้งใน pane และใน harness)

จึงเขียน harness ด้วย jsdom (ติดตั้ง `--no-save` แล้วถอดออก ไม่แตะ `package.json`/lock) ที่ **rAF เป็นของเรา**: วิ่งบน timer 16ms จนสั่งให้หยุด = สิ่งที่เบราว์เซอร์ทำกับแท็บที่เสียโฟกัสพอดี · **แต่ละเคสรันคนละ process** ด้วยเหตุผลข้างบน

| เคส | เก่า `4735636` | ใหม่ |
|---|---|---|
| **1** ซ่อนกลางทาง + `visibilitychange` ยิง | วิ่งถึง 61 → หยุด rAF → **ค้าง 64 ตลอด** แม้ event มาแล้ว | 61 → 64 → event → **73 ทันที** |
| **2** rAF ตาย **ไม่มี event** (หน้าต่างถูกบัง) | **ค้าง 61 เลยเวลาจบ animation ไปแล้วก็ยังค้าง** (t=1150ms) | 63 ค้างจน backstop ที่ 1000ms → **73** |
| **3** ซ่อนอยู่ตั้งแต่ mount | 73 (บังเอิญถูก เพราะ `useState(value)`) · ขอ frame 0 ครั้ง | 73 · ขอ frame 0 ครั้ง — เท่ากัน ไม่ได้อ้างว่าดีขึ้น |

เคส 2 คือสภาพของ Browser pane เป๊ะ และเป็นเคสที่ **`visibilitychange` listener อย่างเดียวช่วยไม่ได้** — timer backstop คือตัวที่รอด

`tsc --noEmit` 0 error · eslint **50 (31/19) เท่า baseline** · ไม่แตะ DB

## ที่สังเกตแต่ไม่ได้แก้ (นอก scope)

- **flash 1 frame ตอน mount**: `useState(value)` แสดง 73 ก่อน แล้ว frame แรกของ animation ดึงลง 0 แล้วนับขึ้น — เห็นไม่ชัดที่ 60Hz แต่มีจริง · ของเดิมของ Esther03u ไม่ใช่กับดักที่ถาม
- **`value` เปลี่ยนกลางทาง**: `prevValueRef` เก็บ*เป้าหมายเก่า*ไม่ใช่ค่าที่แสดงอยู่ → animation ใหม่กระโดดไปเป้าเก่าก่อนแล้วค่อยวิ่ง — แก้ได้ด้วย `prevValueRef.current = latest` ใน `onUpdate`
- **`setState` ทุก frame** × 5 ตัวนับ ≈ 300 re-render/วิ ตลอด 0.8 วิ — วิธี idiomatic ของ motion คือ `useMotionValue` + `useTransform` + `<motion.span>` ที่เขียน DOM ตรงโดยไม่ re-render · ถ้าวันหนึ่ง refactor ต้องคง 3 เส้นทางข้างบนไว้เพราะ rAF ตายเหมือนกัน
- **`MotionFade` ค้าง opacity 0** ในหน้าต่างที่ถูกบัง (ข้างบน) — เหมือนกันทุก `motion.*` ที่ animate ตอน mount

## กฎสำหรับ QA/automation (ยังใช้)

ก่อน assert ตัวเลขบนหน้าภาพรวม ให้แท็บ visible + รอ ~1.2 วิ (duration 0.8 + backstop 0.2 + เผื่อ) · ตอนนี้ต่อให้แท็บซ่อน เลขก็จะถูกภายใน ~1 วิ (timer throttle) แต่ยังไม่ควรพึ่ง

## ไฟล์ที่แตะ

`src/components/ui/motion/motion-number.tsx` ไฟล์เดียว · harness อยู่ใน scratchpad ของ session ไม่ได้ commit (โปรเจกต์ยังไม่มี test framework — ถ้าวันหนึ่งมี vitest + jsdom เอาเคส 1–3 ข้างบนไปเป็น test ได้เลย)

---

# 🧹 pull งานของ Esther03u 7 commit + เก็บกวาดสิ่งที่ตกหล่น (13 ก.ย. 2026, DoubleKill)

branch `chore/post-pull-cleanup` ตัดจาก `master` `4735636`

## งานที่ pull มา (11 ก.ย. 2026, Esther03u) — ไม่ได้บันทึกลง HANDOFF จึงจดให้ที่นี่

**7 commit นี้ไม่แตะ `HANDOFF.md` เลย** ผิดกฎ "บันทึกงานลง HANDOFF ทุกครั้ง" · ผู้เขียนใช้ `docs/superpowers/specs/` + `docs/superpowers/plans/` แทน (มี spec/plan วันที่ 2026-09-11 อยู่ 4 ไฟล์) · ใครอ่าน HANDOFF อย่างเดียวจะไม่รู้ว่ามีของพวกนี้

| commit | งาน |
|---|---|
| `e5db123` | **โดนัทสถิติซ่อมบำรุง** บนหน้าภาพรวม (`maintenance-analytics-donut.tsx`) · **แยก `StickerCard` / `openStickerSheet` / `STICKER_SHEET_CSS` / `roomSequenceOf` / `qrTargetUrl` / `STICKERS_PER_SHEET` ออกจาก `qr-code-manager.tsx` ไปเป็น `src/components/shared/qr-sticker.tsx`** · `asset-manager.tsx` เรียกใช้สติกเกอร์ตัวเดียวกันด้วย |
| `4a55122` | KPI cards แบบผู้บริหาร (`overview-metrics-grid.tsx`) · ฟิลเตอร์ตารางงานใกล้ถึงรอบ · **bottom nav มือถือฝั่งช่าง** (`tech-bottom-nav.tsx`) |
| `823b1e3` `4c7919e` | spec + plan ระบบ motion |
| `59ed3af` | motion primitives ใน `src/components/ui/motion/` — `MotionCard` · `MotionFade` · `MotionNumber` · `MotionModal` · `MotionActivePill` · `motion-tokens.ts` (ใช้ package `motion` ที่มีอยู่แล้ว ไม่มี dependency ใหม่) |
| `a0a0276` `4735636` | ใส่ animation เข้าหน้าแอดมิน (metrics, tabs, tables) และฝั่งช่าง (job pool, bottom nav, shell) |

### ✅ งาน QR sticker ของ 9 ก.ย. รอด refactor มาครบ

ย้ายไฟล์แต่**ไม่เปลี่ยนค่าใดๆ** — `150mm` / `52mm` / `46mm` / `STICKERS_PER_SHEET = 5` / toast กัน pop-up ยังอยู่ทั้งหมดใน `qr-sticker.tsx` · ทดสอบหน้าจอจริงแล้ว โมดัลและเอกสารพิมพ์ยังตรงกับที่จดไว้ทุกอย่าง

> ⚠️ **คอมเมนต์อธิบายเหตุผลของขนาด (34→46mm, ทำไม 150 ไม่ใช่ 194) ยังอยู่ใน `qr-code-manager.tsx` บรรทัด ~95–120 ขณะที่ค่าคงที่ย้ายไป `qr-sticker.tsx` แล้ว** — ถ้าแก้ตัวเลขในไฟล์ใหม่ต้องไปแก้คอมเมนต์ในไฟล์เก่าด้วย ไม่งั้นจะโกหก

## 🔴 ตัวเลข KPI นับขึ้นด้วย requestAnimationFrame — อ่านผ่าน automation ตอนแท็บซ่อนจะได้เลขผิด

`MotionNumber` วิ่ง count-up จาก 0 ด้วย rAF · **แท็บที่ไม่ visible เบราว์เซอร์หยุด rAF** → เลขค้างกลางทาง

เจอจริงรอบนี้: หน้าภาพรวมอ่านได้ `29 เครื่อง · 9 · 11 · 2 คน` ทั้งที่ DB คือ `73 · 24 · 27 · 4` — ทุกตัวค้างที่ ~40% พอดี · พอสั่ง screenshot (บังคับให้ pane แสดง) แล้วอ่านซ้ำได้ `73 · 24 · 27 · 4` ถูกต้อง

**กฎสำหรับ QA/automation:** ก่อน assert ตัวเลขบนหน้าภาพรวม ต้องให้แท็บ visible แล้วรอ animation จบ (~2 วินาที) ไม่งั้นจะรายงานบั๊กผี · สำหรับผู้ใช้จริงไม่มีปัญหา เพราะ animation กลับมาวิ่งต่อทันทีที่สลับมาดูแท็บ

## เก็บกวาดที่ทำ

### 1. `public/uploads/` หลุดเข้า git

commit `e5db123` พ่วงรูป 2 ไฟล์มาด้วย (`1786677077680-S__17113110.jpg`, `…816-…jpg` 108 KB ต่อไฟล์ เนื้อหาเดียวกัน) · เป็นรูปจากเครื่องของอีกคน **ไม่มี row ไหนใน DB ของเราอ้างถึง** (เช็ค `users.avatar_url` และ `maintenance_logs` แล้ว) · หลุดมาเพราะโฟลเดอร์ไม่อยู่ใน `.gitignore` — ถ้าปล่อยไว้ รูปทุกใบที่ใครอัปโหลดตอน dev จะไหลเข้า repo

- เพิ่ม `/public/uploads/` ลง `.gitignore`
- `git rm --cached` ทั้ง 2 ไฟล์ (ยังอยู่บนดิสก์ แค่เลิก track)
- **ไม่ต้องมี `.gitkeep`** เพราะ `src/lib/upload.ts` ทำ `fs.mkdir(dir, { recursive: true })` เองก่อนเขียนทุกครั้ง

> ⚠️ รูป 2 ไฟล์นี้**ยังอยู่ใน history** (`e5db123`) ไม่ได้ rewrite — ตามหลักเดิมที่ตัดสินใจไว้ 8 ก.ย. ว่าไม่ rewrite history เพราะ SHA ใน HANDOFF จะตายและมี 2 คนเขียน repo

### 2. eslint 54 → กลับเป็น 50 baseline เดิม

ของใหม่จาก 7 commit นั้นทำให้ warning ขึ้นจาก 19 เป็น 23 (error 31 เท่าเดิม) · หาตัวใหม่ด้วยการรัน `eslint --format json` ทั้งก่อนและหลัง แล้ว diff เป็น set — ได้ 4 ตัวพอดี:

| ไฟล์ | ปัญหา | แก้ |
|---|---|---|
| `upcoming-maintenance-table.tsx` | import `MotionFade`, `motion`, `AnimatePresence` แต่ไม่ได้ใช้ | ลบ import |
| `overview-panel.tsx` | prop `weeklyActivity` รับมาแต่ไม่ได้ใช้ | ลบ **ทั้งสาย** |

**`weeklyActivity` ตายทั้งสายไม่ใช่แค่ prop** — `e5db123` ถอด widget "งานสัปดาห์นี้" ที่เป็นผู้อ่านคนเดียวออกไปแล้วแทนด้วยโดนัท แต่ทิ้ง plumbing ไว้: `getAdminOverviewData` ยังยิง `maintenanceLog.findMany` ย้อน 7 วัน → fold เป็นรายวัน → ส่งผ่าน `page.tsx` → `overview-client.tsx` → `OverviewPanel` ที่ไม่อ่าน · **นั่นคือ 1 query ต่อการเปิดหน้าภาพรวม 1 ครั้ง เพื่อตัวเลขที่ไม่มีใครแสดง** · ถอดออกทั้ง 4 ไฟล์ + `import { format, subDays } from "date-fns"` ที่เหลือค้าง · spec/plan ของ 11 ก.ย. ไม่ได้พูดถึง weekly เลย ถ้าจะเอากลับดูได้จาก `git show 65b1620:src/lib/admin/pages.ts`

## ทดสอบ

| ทดสอบ | ผล |
|---|---|
| หน้าภาพรวมหลังถอด `weeklyActivity` | ✅ KPI ครบ `73 · 24 · 27 · 4` โดนัท 50 ใบงาน ไม่มี console error |
| กระดานใบงาน | ✅ ไม่มี console error |
| `/admin/qr-codes` หลัง refactor ของอีกคน | ✅ โมดัล + เอกสารพิมพ์ยังมี `150mm`/`46mm` ครบ |
| `tsc --noEmit` | ✅ 0 error |
| eslint | ✅ **50 (31 error / 19 warning) = baseline ก่อน 11 ก.ย. เป๊ะ** |
| `git check-ignore public/uploads/…` | ✅ ถูก ignore โดย `.gitignore:58` |

ไม่แตะ DB — baseline `users 5 · phones 7 · buildings 5 · rooms 32 · acs 73 · models 189 · logs 230 · audit max 34 · pending 0` ตรงเป๊ะตอนเช็คก่อนเริ่ม

## สภาพแวดล้อม

รีเครื่องอีกรอบ (วันที่ข้ามจาก 9 → 13 ก.ย.) — **mysqld ตายอีก ปลุกผ่าน WMI แล้ว** ตามสูตร · dev server ที่ preview เปิดไว้ก็หายไปด้วย ต้องเปิดใหม่ · PostgreSQL ขึ้นเองตามปกติ

`feat/postgres` ตามหลัง `master` **38 commit** แล้ว — แต่ 7 ตัวของ Esther03u + ของผมรอบนี้ แตะแค่ `src/components/` · `src/app/admin/` · `src/lib/admin/pages.ts` · `docs/` · `.gitignore` **ไม่แตะ prisma/schema/prisma.ts/db-retry.ts** ผลสำรวจ merge เมื่อ 9 ก.ย. ยังใช้ได้ (conflict ที่ `HANDOFF.md` ที่เดียว) · ควรรัน `git merge-tree --write-tree --name-only feat/postgres master` ซ้ำอีกรอบก่อนลงมือเพื่อความชัวร์

---

# 🧭 เตรียม merge master เข้า feat/postgres — สำรวจแล้ว ยังไม่แตะอะไร (9 ก.ย. 2026, DoubleKill)

เจ้าของโปรเจกต์สั่ง: *"เตรียมไว้ก่อน แต่ยังไม่ต้องลบ Migration หรือโคลนไป"*

**ไม่มี branch ไหนถูกแตะ ไม่มี merge เกิดขึ้น ไม่มีไฟล์ถูกลบหรือคัดลอก** — สำรวจด้วย `git merge-tree --write-tree` ซึ่งคำนวณผลลัพธ์การ merge ใน object database ล้วนๆ **ไม่แตะ working tree และไม่สร้าง commit**

```bash
git merge-tree --write-tree --name-only feat/postgres master
```

| | |
|---|---|
| merge base | `c411ec9` |
| `master` | `71fa167` (นำอยู่ **28 commit**) |
| `feat/postgres` | `967bafd` (นำอยู่ 4 commit) |

## 🟢 ผลลัพธ์: conflict ที่เดียวคือ `HANDOFF.md`

**เบากว่าที่หัวข้อเก่าๆ เตือนไว้มาก** ไฟล์ที่ทั้งสองฝั่งแก้มีแค่ **2 ไฟล์**:

| ไฟล์ | ผล |
|---|---|
| `HANDOFF.md` | ⚠️ conflict — แบบเดียวกับทุกรอบ (ต่างฝ่ายต่างแทรกหัวข้อบนสุด) แก้โดยเก็บทั้งสองฝั่ง เรียงล่าสุดขึ้นก่อน |
| `src/lib/maintenance.ts` | ✅ git รวมให้เองได้ **และรวมถูกด้วย** |

ที่เหลือไม่ทับกันเลย เพราะสองฝั่งแก้คนละไฟล์ทั้งหมด:
- `feat/postgres` แตะ `prisma.ts` · `db-retry.ts` · `schema.prisma` · migrations · `package.json` · `tech/dashboard.ts` · `tech/maintenance-log.ts` · `admin/error.tsx`
- `master` แตะไฟล์ UI/lib อีก 40 ไฟล์ **ซึ่งไม่มีตัวไหนอยู่ในรายการข้างบนเลย**

### ตรวจ `maintenance.ts` ที่ auto-merge แล้วทีละบรรทัด

ดึง blob ออกจาก merged tree (`ed021f9`) มา diff กับฝั่ง master:

- **ฝั่ง postgres** แก้ *คอมเมนต์อธิบาย deadlock* ที่บรรทัด ~145 (InnoDB S→X lock → PostgreSQL FOR KEY SHARE, error 1213 → SQLSTATE 40P01)
- **ฝั่ง master** เพิ่ม *type + query + mapping* ของ `schedule` ที่บรรทัด ~286–380

**คนละโซนสนิท ไม่มีตรงไหนทับกัน** ไฟล์ที่ merge ออกมา = ของ master ทุกบรรทัด + คอมเมนต์ที่เขียนใหม่ของ postgres · ยืนยันว่าเก็บของทั้งสองฝั่งครบ (`FOR KEY SHARE` ✓ `40P01` ✓ `maintenanceSchedules:` ✓)

## 🟢 การ merge นี้ไม่ลบ migration และไม่คัดลอกอะไรไปไหน

ตรงตามที่สั่ง — ตรวจ `prisma/migrations/` ใน merged tree เทียบกับ `feat/postgres` ปัจจุบัน:

```
merged tree      → 20260907120918_init, migration_lock.toml
feat/postgres    → 20260907120918_init, migration_lock.toml   (เหมือนกันเป๊ะ)
```

migration ของ MySQL 13 ใบถูกลบไปแล้วตั้งแต่ commit `620d4d1` บน `feat/postgres` เมื่อ 7 ก.ย. **การ merge ไม่ได้ลบอะไรเพิ่ม** เพราะ master ไม่เคยแตะโฟลเดอร์นี้เลย

## 🟢 โค้ด 28 commit ของ master ปลอดภัยกับ PostgreSQL

ตรวจทั้ง `src/` บน master:

| ตรวจ | ผล |
|---|---|
| `contains:` / `mode: "insensitive"` | **0 จุด** ✅ |
| `$queryRaw` / `$executeRaw` / `queryRawUnsafe` | **0 จุด** ✅ |
| `NOW()` / `UTC_TIMESTAMP` / SQL ดิบ | **0 จุด** ✅ |
| แตะ `schema.prisma` / migrations / `prisma.ts` / `db-retry.ts` | **ไม่แตะเลย** ✅ |
| `.sort(` ที่เรียงข้อความโดยไม่ใช้ `localeCompare(_, "th")` | **0 จุด** ✅ |

`.sort(` ที่เจอทั้งหมด 4 จุด: `team-panel.tsx` และ `tech/pages.ts` ใช้ `localeCompare(_, "th")` ครบ · `compareJobOrder` ใน `maintenance.ts` ก็ใช้ · `dashboard-layout.tsx` เรียงความยาว URL ไม่ใช่ข้อความ

**นี่คือผลตอบแทนของกฎห้ามใช้ `contains`** — งานสองสัปดาห์บน master ข้ามเครื่องยนต์ได้โดยไม่ต้องแก้อะไรสักบรรทัด

## ⚠️ ที่ยังไม่ได้พิสูจน์ และเป็นต้นทุนจริงของขั้นตอนนี้

**git รวมโค้ดได้ ≠ โค้ดรันบน PostgreSQL ได้** — โค้ด 28 commit นั้น **ไม่เคยรันบน PostgreSQL เลยสักครั้ง** ตรวจด้วยตาว่าไม่มี pattern ที่ผูกกับ MySQL เท่านั้น ยังไม่ได้รันจริง

## 📋 ลำดับที่ต้องทำตอนได้ไฟเขียว (ยังไม่ทำ)

1. `git checkout feat/postgres && git merge master` → แก้ conflict `HANDOFF.md` ที่เดียว เก็บทั้งสองฝั่ง
2. **`npm install` ใหม่ทั้งรอบ** — driver adapter คนละตัว (`@prisma/adapter-mariadb` ↔ `PrismaPg`)
3. `npx prisma generate` แล้ว **ลบ `.next`**
4. สลับ `DATABASE_URL` ใน `.env` ไปชี้ PostgreSQL (สลับคอมเมนต์ 2 บรรทัด)
5. ทดสอบผ่านหน้าจอจริงทั้งชุด โดยเฉพาะของใหม่ที่ยังไม่เคยแตะ PostgreSQL: แก้ชื่อยี่ห้อ/รุ่น · omnibox · หน้าเจ้าหน้าที่ · QR sticker · **การเรียงภาษาไทย** (ICU th-TH เรียงต่างจาก utf8mb4_unicode_ci)
6. **สลับ `.env` กลับ + `npm install` กลับ** ถ้าจะกลับมาทำงานบน master ต่อ

> ⚠️ ข้อ 2 กับ 6 คือเหตุผลที่ยังไม่ควรทำถ้ายังไม่พร้อมทดสอบยาว — สลับ branch ไป/กลับต้อง `npm install` ใหม่ทุกครั้ง ไม่ใช่แค่ `git checkout`

---

# 🔕 ปุ่มพิมพ์เงียบสนิทเมื่อ pop-up ถูกบล็อก — แก้แล้ว (9 ก.ย. 2026, DoubleKill)

branch `feat/qr-print-popup-guard` ตัดจาก `master` `7a55a02`

เจ้าของโปรเจกต์ถามว่า *"ตอนนี้ระบบสามารถต่อปริ้นจริงได้ใช่มั้ย"* — ตอบว่าได้ แต่ระหว่างตรวจเจอบั๊กนี้ก่อน

## อาการ

```ts
const printWindow = window.open("", "_blank");
if (!printWindow) return;   // ← เงียบสนิท
```

`window.open` คืน `null` เมื่อเบราว์เซอร์บล็อก pop-up · **แอดมินกดปุ่มพิมพ์แล้วไม่มีอะไรเกิดขึ้นเลย ไม่มีข้อความ ไม่มี error ใน console** แล้วก็จะกดซ้ำอีกหลายครั้ง สุดท้ายสรุปว่า "ปุ่มเสีย" ทั้งที่ตัวบล็อกคือเบราว์เซอร์ ไม่ใช่แอป

เป็นโค้ดที่มีมาตั้งแต่ก่อนงานสติกเกอร์ (ยกมาใช้ต่อตอน refactor ไม่ได้แก้)

## แก้เป็น toast ที่บอกสาเหตุและทางออก

```
เบราว์เซอร์บล็อกหน้าต่างพิมพ์
กรุณาอนุญาต pop-up ของเว็บนี้ในแถบที่อยู่ แล้วกดพิมพ์อีกครั้ง
```

**ไม่มีทางพิมพ์ได้ถ้าไม่มีหน้าต่างนั้น** จึงไม่มี fallback ให้ทำ สิ่งเดียวที่มีประโยชน์คือชี้ให้ถูกว่าใครบล็อก

ปิดช่อง `if (!html) return` อีก 2 จุดด้วย (batch / เดี่ยว) — จุดนั้นจะเข้าได้ก็ต่อเมื่อ container ที่ซ่อนไว้ไม่ render ซึ่งเป็นบั๊กของเราเอง แต่ถ้าเงียบ แอดมินจะไปนั่งงมที่เครื่องพิมพ์แทน

`toast` ตัวเดียวกับทั้งระบบ (`sonner`) · `<Toaster>` mount อยู่ที่ `src/app/layout.tsx` แล้ว ไฟล์นี้แค่ยังไม่เคย import

## ทดสอบด้วยการทำให้ pop-up ถูกบล็อกจริง

`window.open = () => null` ในหน้าจริง แล้วกดปุ่มทั้งสองตัว:

| ทดสอบ | ผล |
|---|---|
| ปุ่ม "พิมพ์ (Print)" ในโมดัลเดี่ยว ตอนถูกบล็อก | ✅ toast ขึ้นครบสองบรรทัด |
| ปุ่ม "พิมพ์ QR Code (n)" แถบล่าง ตอนถูกบล็อก | ✅ toast เดียวกัน |
| **happy path** — `window.open` คืน spy object | ✅ เขียนเอกสาร 10,456 ตัวอักษร มี `class="sheet"`, `@page { size: A4`, `.sticker`, `window.print()` ครบ · **ไม่มี toast error** |
| console error | ✅ ไม่มี |

> 💡 **วิธีทดสอบ happy path โดยไม่เปิดไดอะล็อกพิมพ์จริง** — `window.open = () => ({ document: { write: h => buf += h, close(){} } })` แล้วตรวจสิ่งที่เขียนลง buffer · ถ้าปล่อยให้เปิดหน้าต่างจริง เอกสารลูกจะ `window.print()` ทันทีแล้วไดอะล็อกจะค้างรอคน

`tsc --noEmit` 0 error · eslint 50 (31/19) เท่า baseline · ไม่แตะ DB

## เรื่องต่อพรินเตอร์จริงที่ยังยืนยันแทนไม่ได้

เส้นทางคือ `window.open` → `window.print()` → **ไดอะล็อกพิมพ์ของเบราว์เซอร์** ซึ่งลิสต์เครื่องพิมพ์จริงในเครื่องทั้งหมด ไม่ต้องตั้งค่าอะไรเพิ่มในระบบ · แต่ **ยังไม่เคยส่งงานเข้าเครื่องพิมพ์จริงสักครั้ง** ยืนยันได้แค่ระดับ layout engine

ตอนพิมพ์จริงมี 3 อย่างในไดอะล็อกที่มีผลต่อขนาด:

| ตั้งค่า | ต้องเป็น | ถ้าผิด |
|---|---|---|
| **Scale** | **100%** ห้าม "Fit to page" | QR หดจาก 46mm |
| **Margins** | Default (ให้ `@page margin: 8mm` ทำงาน) | เลือก None แล้วเลย์เอาต์เลื่อน |
| Background graphics | เปิดถ้าวงกลมดำเลขลำดับออกมาเป็นวงว่าง | CSS มี `print-color-adjust: exact` แล้ว ปกติไม่ต้องแตะ |

**วิธียืนยัน:** พิมพ์ 1 แผ่นแล้วเอาไม้บรรทัดวัด QR ต้องได้ **46mm** ถ้าได้ 43–44 แปลว่าโดน Fit to page

## ไฟล์ที่แตะ

`src/components/admin/qr-code-manager.tsx` — import `toast` · guard ใน `openStickerSheet` และอีก 2 จุดที่อ่าน print area

---

# 📐 สติกเกอร์ QR ขยายเป็นคอลัมน์เดียว 5 ดวง/แผ่น (9 ก.ย. 2026, DoubleKill)

branch `feat/qr-sticker-bigger` ตัดจาก `master` `6e3fdb9` · **แทนที่ตัวเลขทั้งหมดในหัวข้อ "🖨️ ฟอร์มพิมพ์สติกเกอร์ QR ลง A4" ข้างล่าง**

เจ้าของโปรเจกต์ดูแผ่นตัวอย่างแล้วบอก: *"ยังเล็กไปหน่อย ปรับให้เหลือคอลัมเดียว ลดจำนวนแต่ได้ขนาดใหญ่ขึ้นน่าจะโอเคกว่า"*

| | เดิม | ใหม่ |
|---|---|---|
| คอลัมน์ | 2 | **1** |
| ดวงต่อแผ่น | 12 | **5** |
| สติกเกอร์ | 95 × 43 mm | **150 × 52 mm** |
| QR | 34 mm (0.64 mm/module) | **46 mm (0.87 mm/module)** |

## ทำไมไม่กว้างเต็ม 194mm ทั้งที่เหลือคอลัมน์เดียว

ลอง 194mm เต็มความกว้างก่อน แล้ว**วัดความกว้างของหมึกจริง**ด้วย `Range.getBoundingClientRect()` ทีละบรรทัด:

| บรรทัด | กว้างสุด |
|---|---|
| acCode `B120345-2-521625-01` | **68.4 mm** |
| ยี่ห้อ `Mitsubishi Electric` | 60.0 mm |
| เลขลำดับ + ห้อง | 57.3 mm |
| รุ่น · BTU | 49.0 mm |

**เหลือกระดาษเปล่าเกือบ 60mm ต่อดวง** — ป้ายที่ยาวเกือบหนึ่งฝ่ามือโดยครึ่งหนึ่งไม่มีอะไรอยู่ ไปแปะบนแอร์แล้วเปลืองเปล่า · จะขยายฟอนต์ให้เต็มก็ต้องดัน acCode ไปถึง 12mm ซึ่งใหญ่เกินเหตุ

**เลือก 150mm** → คอลัมน์ข้อความได้ **92.5mm** กว้างกว่าที่ยาวสุดในข้อมูลวันนี้ (68.4mm) อยู่พอควร เผื่อชื่อยี่ห้อ/รุ่นจริงของ มรภ.ภูเก็ต ที่ยังไม่รู้ว่ายาวแค่ไหน · จัดกึ่งกลางคอลัมน์

> **แถบว่างด้านขวาของแผ่นเป็นราคาที่ยอมจ่าย ไม่ใช่บั๊ก** — จำนวนแถวถูกกำหนดด้วย**ความสูง**ของหน้า (5 × 52 + 4 × 4 = 276 ≤ 281mm) สติกเกอร์กว้างขึ้นไม่ได้ดวงเพิ่มแม้แต่ดวงเดียว

## กันข้อความล้นกรอบ

ช่องสูง 46mm ใส่ข้อความไปแล้ว ~43mm เหลือ slack แค่ 3mm — **ถ้าชื่อยี่ห้อยาวจนตัดขึ้นบรรทัดที่สอง (7mm) จะดันบรรทัดสุดท้ายทะลุเส้นตัด**

- `.sticker-brand` / `.sticker-spec` → `white-space: nowrap` + `text-overflow: ellipsis`
- `.sticker-body` → `overflow: hidden`

ยอมให้ชื่อโดนตัดท้ายดีกว่าให้สติกเกอร์พิมพ์ทะลุกรอบตัวเอง · acCode ซึ่งเป็นตัวระบุตัวจริงไม่โดนกฎนี้

## ทดสอบ

วัดจากไฟล์ที่ generate ด้วย CSS ตัวจริงในโค้ด แล้วเสิร์ฟผ่าน dev server (`public/__sheet-preview.html` ชั่วคราว แล้วลบทิ้ง)

| วัด | ได้ |
|---|---|
| สติกเกอร์ | **150.0 × 52.0 mm** |
| QR | **46.0 × 46.0 mm** |
| คอลัมน์ข้อความ | **92.5 mm** |
| เลย์เอาต์ | 1 คอลัมน์ × 5 แถว |
| บรรทัดที่โดน ellipsis ตัด | **0** |
| ข้อความล้นความสูง | **0** |

`tsc --noEmit` 0 error · eslint 50 (31/19) เท่า baseline · ไม่แตะ DB

> 💡 **วัดความกว้างของ "หมึก" ไม่ใช่ของกล่อง** — `.sticker-brand` เป็น block element กว้างเต็มพ่อแม่เสมอ `getBoundingClientRect()` ของ element จึงตอบไม่ตรงคำถาม · ใช้ `const r=document.createRange(); r.selectNodeContents(el); r.getBoundingClientRect().width` ถึงจะได้ความกว้างของตัวอักษรจริง ซึ่งเป็นตัวเลขที่ใช้ตัดสินความกว้างสติกเกอร์

## ไฟล์ที่แตะ

`src/components/admin/qr-code-manager.tsx` — `STICKER_SHEET_CSS` · `STICKERS_PER_SHEET` 12 → 5 · `size` ของ `QRCodeSVG` ที่ render ซ่อนไว้ 160 → 220 px (ให้ SVG คมพอตอน scale เป็น 46mm)

---

# 🖨️ ฟอร์มพิมพ์สติกเกอร์ QR ลง A4 — วัดเป็นมิลลิเมตรจริง (9 ก.ย. 2026, DoubleKill)

> ⚠️ **ตัวเลขในหัวข้อนี้ถูกแทนที่แล้ว** — 34mm / 95×43 / 12 ดวงต่อแผ่น เป็นของรอบแรก · ค่าที่ใช้จริงตอนนี้คือ **46mm / 150×52 / 5 ดวง** ดูหัวข้อ "📐 สติกเกอร์ QR ขยายเป็นคอลัมน์เดียว" ด้านบน · เหตุผลเรื่อง level H, print-color-adjust, ฟอนต์ไทย และการรวมปุ่มพิมพ์สองตัว ยังใช้ได้ทั้งหมด

branch `feat/qr-sticker-sheet` ตัดจาก `master` `8bdf29b`

เจ้าของโปรเจกต์สั่ง: *"ทำเรื่องฟอร์มตอนปริ้น QR Code ลงกระดาษ กำหนดขนาดให้พอเหมาะสำหรับแสกนและมองเห็น A4 1 แผ่นปริ้นได้หลายอัน มีกรอบชัดเจนเพื่อง่ายในการตัดไปแปะ 1 QR ต้องมี ยี่ห้อ รุ่น BTU และลำดับ 1, 2, 3"*

## ของเดิมพิมพ์ออกมาแล้วสแกนไม่ได้แน่นอน

- **ทุกขนาดเป็น px** → ขนาดจริงบนกระดาษขึ้นกับที่เบราว์เซอร์เดา DPI · QR `size={120}` px ออกมาราว **31.8mm บนกระดาษ ถ้า DPI ตรง** แต่ไม่มีอะไรรับประกัน
- กรอบเป็น **เส้นประ + มุมโค้ง** ตัดตามยาก
- ไม่มี **BTU** ไม่มี **ลำดับ**
- ปุ่มพิมพ์เดี่ยวกับพิมพ์ทีละหลายอันเป็น **markup คนละชุด + CSS คนละชุด** และตัวเดี่ยวเพี้ยนไปไกลถึงขั้นต้องใช้ `qrHtml.replace('class="', 'style="')` มากลบปัญหา — hack ตัวนั้นหายไปแล้ว

## เลข 34mm คือตัวตั้ง ที่เหลือตามมาหมด

ค่าที่เข้ารหัสคือ origin + `/qr/` + uuid ≈ **60 bytes** · ที่ error correction **level H** ได้ symbol **45 module** รวม quiet zone เป็น **53 module**

| ขนาด QR | mm ต่อ module | สแกนได้ไหม |
|---|---|---|
| 26mm | 0.49 | ⚠️ ก้ำกึ่ง กล้องเก่า/ห้องมืดเริ่มไม่อ่าน |
| **34mm** | **0.64** | ✅ สบาย |

**คง level H ไว้ ไม่ลดเพื่อให้ symbol เล็กลง** — สติกเกอร์ไปติดบนแอร์ที่มีฝุ่นและความชื้น H คือตัวที่ยังอ่านออกตอนมุมสติกเกอร์ถลอก

34mm บังคับให้สติกเกอร์เป็น **95 × 43mm** และหน้าละ **12 ดวง (2 คอลัมน์ × 6 แถว)**:

```
กว้าง  210 − 16 (margin) = 194 − gutter 4 = 190 / 2 = 95mm
สูง    297 − 16 (margin) = 281 · 6 แถว × 43 + 5 × 4 = 278mm ✅
```

**เคยคิด 3 คอลัมน์ × 6 = 18 ดวง/แผ่น แล้วทิ้ง** เพราะช่อง 62mm เหลือที่ให้ QR แค่ ~26mm ซึ่งตกไปอยู่ในโซนก้ำกึ่งข้างบน · ประหยัดกระดาษจาก 7 แผ่นเหลือ 5 แผ่น (73 เครื่อง) ไม่คุ้มกับสติกเกอร์ที่สแกนไม่ติด

## กรอบเป็นเส้นตัด ไม่ใช่เครื่องประดับ

`border: 0.4mm solid #111` **มุมฉาก ไม่โค้ง** — กรรไกรเดินตามเส้นตรงทึบได้ ไม่ใช่เส้นประมุมมน · เว้น gutter 4mm ระหว่างดวง เพื่อให้มีที่เผื่อตัด ไม่ใช้เส้นร่วมกัน

## หน้าตา 1 ดวง

```
┌─────────────────────────────────────────┐
│            ⬤3  เครื่องที่ 3 · ห้อง 1-846367 │
│  [QR 34mm]  Carrier                     │
│             YP-6434 · 24,000 BTU        │
│             B467711-1-846367-03         │
│             สแกนเพื่อแจ้งซ่อม / ดูประวัติ    │
└─────────────────────────────────────────┘
```

ใส่ **ห้อง** ลงไปด้วยทั้งที่ไม่ได้สั่ง — "เครื่องที่ 3" เฉยๆ ไม่มีความหมายถ้าไม่รู้ว่าห้องไหน และ acCode ก็มีอยู่แล้วแต่อ่านไม่ออกด้วยตา

## จุดที่พังเงียบถ้าไม่ระวัง

| กฎ | ทำไม |
|---|---|
| `-webkit-print-color-adjust: exact` + `print-color-adjust: exact` | ถ้าไม่ใส่ **วงกลมดำของเลขลำดับจะพิมพ์ออกมาเป็นวงว่าง** เบราว์เซอร์ตัด background fill ทิ้งตอนพิมพ์เป็นค่าเริ่มต้น |
| font stack ต้องมี `Tahoma` / `Leelawadee UI` | หน้าต่างพิมพ์เป็น `about:blank` โหลด Google Fonts ไม่ได้ · ถ้าตกไป font ที่ไม่มีไทย ป้ายทั้งใบกลายเป็นสี่เหลี่ยม |
| `.sticker-qr svg { width: 34mm }` ทำงานได้เพราะ `qrcode.react` ใส่ `viewBox` มาให้ | ตัว SVG มี `width`/`height` เป็น px ติดมา CSS จึงต้องมี viewBox ถึงจะ scale ได้ ไม่ใช่แค่ crop |
| ใส่ทั้ง `page-break-inside` และ `break-inside` | Chrome สาย print ยังอ่านตัวเก่าอยู่ |

## พิมพ์เดี่ยวกับพิมพ์ทีละหลายอันใช้ `StickerCard` ตัวเดียวกันแล้ว

`STICKER_SHEET_CSS` + `openStickerSheet()` + `<StickerCard>` ใช้ร่วมกันทั้งสองปุ่ม · **พิมพ์เดี่ยว = sheet ที่มีดวงเดียว** ไม่ใช่ layout แยก จึงไม่มีทางเพี้ยนออกจากกันได้อีก

โมดัลบนจอเพิ่มบรรทัด BTU ให้ตรงกับสิ่งที่พิมพ์ออกมา · `id="single-qr-print-area"` เดิมถูกถอดทิ้ง (ไม่มีใครอ่านแล้ว) การ์ดขาวในโมดัลตอนนี้เป็น **preview บนจอ** ล้วนๆ ส่วน `single-sticker-print-area` ที่ซ่อนไว้คือตัวจริงที่ถูกพิมพ์

## ทดสอบด้วยการวัดจริง ไม่ใช่ดูด้วยตา

ดึง `STICKER_SHEET_CSS` **ออกจาก bundle ที่ dev server เสิร์ฟจริง** (`/_next/static/chunks/app/admin/qr-codes/page.js`) แล้วเอาไป render ใน iframe กว้าง 210mm พร้อม `innerHTML` ของ `batch-print-area` จริง แล้ว `getBoundingClientRect()` แปลงกลับเป็น mm

| วัด | ได้ |
|---|---|
| ขนาด QR | **34.00 × 34.00 mm** ✅ ตรงเป๊ะ |
| ขนาดสติกเกอร์ | 93.05 × 43.00 mm (กว้างหด ~2mm เพราะ scrollbar ของ iframe หน้าต่างพิมพ์จริงไม่มี) |
| คอลัมน์ | 2 ✅ |
| ดวงที่อยู่ในขอบเขตหน้าแรก (297 − 8mm) | **12 ✅ ตรงกับ `STICKERS_PER_SHEET`** |
| ดวงที่ข้อความล้นกรอบ | **0 จาก 73** รวมยี่ห้อยาวสุด "Mitsubishi Electric" |
| เลขลำดับ 6 ดวงแรก | `1, 2, 1, 2, 3, 4` ✅ รีเซ็ตตามห้องถูกต้อง |
| ปุ่มพิมพ์เดี่ยว | ✅ ได้ `.sticker` 1 ดวง เนื้อหาครบ ใช้ component เดียวกัน |
| แถบล่างบอกจำนวนแผ่น | ✅ เลือก 73 → "A4 แผ่นละ 12 ดวง · ใช้ 7 แผ่น" |
| console error | ✅ ไม่มี |

`tsc --noEmit` 0 error · eslint 50 (31/19) เท่า baseline · **ไม่แตะฐานข้อมูล** ไม่มีอะไรต้องคืนค่า

> 💡 **วิธีวัดหน้าพิมพ์โดยไม่ต้องสั่งพิมพ์จริง** — `window.open` แล้วเอกสารลูกจะ `window.print()` + `window.close()` เองใน `onload` แทรกเข้าไปวัดไม่ทัน · ให้ fetch chunk ที่มี CSS ออกมา แล้ว render ใน iframe ขนาด A4 แทน วัดได้ครบและได้ค่าที่ ship จริง ไม่ใช่ค่าที่พิมพ์ซ้ำในเทสต์

## ไฟล์ที่แตะ

`src/components/admin/qr-code-manager.tsx` ไฟล์เดียว — `STICKER_SHEET_CSS` · `STICKERS_PER_SHEET` · `qrTargetUrl()` · `StickerCard` · `openStickerSheet()` · แทนที่ handler พิมพ์ทั้งสองตัว

---

# 🔢 โมดัล QR บอกลำดับเครื่องในห้อง (9 ก.ย. 2026, DoubleKill)

branch `feat/qr-room-sequence` ตัดจาก `master` `67abfed` โดยตรง **ไม่ขึ้นกับ `feat/catalogue-rename`** merge แยกได้

> **merge เข้า master แล้วทั้งคู่** — `feat/catalogue-rename` fast-forward · `feat/qr-room-sequence` เป็น merge commit · **conflict มีที่เดียวคือ `HANDOFF.md`** เหมือนทุกรอบ (สอง branch แทรกหัวข้อบนสุดของไฟล์คนละอัน) แก้โดยเก็บทั้งสองฝั่ง เรียงล่าสุดขึ้นก่อน ไม่มีอะไรถูกทิ้ง · ไฟล์ `src/` ไม่ชนกันเลยเพราะสอง branch แตะคนละไฟล์ทั้งหมด

เจ้าของโปรเจกต์สั่ง: *"เพิ่มส่วนระบุลำดับด้วยว่าเป็นแอร์ตัวที่เท่าไหร่ของห้องนั้นๆ"*

เดิมโมดัล "ตัวอย่าง QR ประจำเครื่อง" ที่ `/admin/qr-codes` แสดงแค่ **acCode + ยี่ห้อ(รุ่น)** — ไม่บอกด้วยซ้ำว่าเป็นห้องไหน ต้องถอดรหัสจาก acCode เอาเอง

ตอนนี้มีบล็อกใต้การ์ด QR:

```
# เครื่องที่ 1 ของห้องนี้
Administration Building 293183 - ห้อง 1-19179 (ชั้น 1) · ห้องนี้มีแอร์ในระบบ 2 เครื่อง
```

## 🔴 ลำดับต้องอ่านจาก acCode ห้ามนับตำแหน่งในลิสต์

`acCode` คือ `[BLDG]-[ROOM]-[NN]` และ **`NN` ถูกกำหนดครั้งเดียวตอนลงทะเบียนแล้วพิมพ์ติดอยู่บนตัวเครื่อง**

ถ้านับจากตำแหน่งใน `r.acUnits` แทน วันที่เครื่องอื่นในห้องถูกถอดออก เครื่องที่เหลือจะถูกเปลี่ยนเลขบนจอ แต่**สติกเกอร์บนผนังยังเป็นเลขเดิม** — กลายเป็นสองแหล่งที่ขัดกันเองโดยที่ไม่มีใครไปแก้สติกเกอร์ได้

```ts
// ชื่อห้องมีขีดของตัวเองอยู่แล้ว ("6-53142") จึงต้องอ่าน segment สุดท้าย ไม่ใช่ที่สาม
function roomSequenceOf(acCode: string): number | null {
  const last = acCode.split("-").pop();
  if (!last || !/^\d+$/.test(last)) return null;
  return Number(last);
}
```

อ่านไม่ออก → คืน `null` แล้วขึ้น "ไม่ทราบลำดับในห้อง" แทนที่จะเดา

> ⚠️ **ตัวเลขสองตัวในบล็อกนี้ไม่ใช่เศษส่วน** — "เครื่องที่ 3" มาจาก acCode ส่วน "ห้องนี้มีแอร์ในระบบ 4 เครื่อง" มาจากจำนวนแถวจริง · `createAirConditionerAction` นับ **soft-deleted ด้วย** ตอนออกเลข (ไม่งั้นเครื่องใหม่จะได้รหัสซ้ำกับเครื่องที่ถูกปลดไปแล้ว ซึ่งยังเป็นแถวใต้ unique index เดิม) ดังนั้นวันหนึ่งอาจเจอ "เครื่องที่ 5" ในห้องที่มี 4 เครื่อง — ถูกต้องทั้งคู่ จึงเขียนเป็นสองประโยคแยกกัน **ห้ามรวบเป็น "3 จาก 4"**

## บรรทัดสถานที่ใช้ `formatUnitLocation` ไม่ประกอบสตริงเอง

ตาม comment หัวไฟล์ `src/lib/location.ts` ที่บันทึกไว้ว่าเคยมีคนเขียนแยกกัน **4 แบบ** จนแอร์ตัวเดียวกันอ่านไม่เหมือนกันแล้วแต่หน้า · เรียกด้วย `withFloor: true` เพราะโมดัลนี้แสดงเครื่องเดียวโดดๆ ไม่ได้อยู่ใต้หัวข้อกลุ่มที่บอกอาคารให้แล้ว

> `FlatACUnit.location` ที่ประกอบเองใน `qr-code-manager.tsx` (`${b.name} - ห้อง ${r.name}`) **ไม่มีที่ไหนเรียกใช้เลย** เป็น field ตายอยู่ — ไม่ได้แตะไว้ ถ้าจะเก็บกวาดวันหลังลบได้เลย

## สติกเกอร์ที่พิมพ์ออกมาไม่เปลี่ยน

บล็อกใหม่อยู่**นอก** `single-qr-print-area` เจตนา — เลขลำดับอยู่ใน acCode บนสติกเกอร์อยู่แล้ว และ batch print (`batch-print-area`) เป็นคนละ markup ถ้าใส่ในสติกเกอร์จะกลายเป็นสองแบบที่ไม่ตรงกัน · **ตรวจแล้วว่า print area ยังมีแค่ acCode กับยี่ห้อ(รุ่น)เหมือนเดิม**

ถ้าวันหนึ่งอยากให้ขึ้นบนสติกเกอร์ด้วย ต้องแก้ **ทั้งสองที่** พร้อมกัน

## ทดสอบผ่านหน้าจอจริง

| ทดสอบ | ผล |
|---|---|
| ห้อง `1-846367` (4 เครื่อง) เปิดตัว `-03` | ✅ "เครื่องที่ 3 ของห้องนี้ · ห้องนี้มีแอร์ในระบบ 4 เครื่อง" |
| ห้อง `1-19179` (2 เครื่อง) เปิดตัว `-01` | ✅ "เครื่องที่ 1 ของห้องนี้ · ห้องนี้มีแอร์ในระบบ 2 เครื่อง" |
| `single-qr-print-area` ไม่มีอะไรเพิ่ม | ✅ `B467711-1-846367-03 / Carrier (YP-6434)` เท่าเดิม |
| จอมือถือ 375px | ✅ ตัดบรรทัดสวย ไม่ล้นการ์ด `max-w-sm` |
| console error | ✅ ไม่มี |

`tsc --noEmit` 0 error · eslint **50 (31 error / 19 warning) เท่า baseline** · **ไม่แตะฐานข้อมูลเลย** จึงไม่มีอะไรต้องคืนค่า

## 🔴 เครื่อง dev ปิดหมดหลังรีเครื่อง — ต้องปลุกเอง

เปิดมารอบนี้ **ทั้ง mysqld (3306) และ dev server (3000) ไม่ได้ทำงาน** ทั้งคู่ ขั้นตอนที่ใช้ได้จริง:

```powershell
Remove-Item C:\xampp\mysql\data\mysql.pid -Force -ErrorAction SilentlyContinue
Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
  CommandLine = '"C:\xampp\mysql\bin\mysqld.exe" --defaults-file=C:\xampp\mysql\bin\my.ini'
}
```

แล้ว **วนเช็คจนกว่า mysql client จะต่อติด** ก่อนค่อยสตาร์ท dev server — mysqld ใช้เวลาสักพักกว่าจะรับ connection และ Next จะพังถ้าขึ้นก่อน · ยืนยันด้วย `SELECT COUNT(*) FROM air_conditioners` = 73

> **PostgreSQL ไม่ต้องทำแบบนี้** (`postgresql-x64-16` เป็น Automatic ขึ้นเองตอนบูต) — เฉพาะ mysqld ของ XAMPP เท่านั้นที่ตายถ้าใช้ `Start-Process`

## ไฟล์ที่แตะ

`src/components/admin/qr-code-manager.tsx` ไฟล์เดียว — `roomSequenceOf()` · `FlatACUnit` เพิ่ม `roomSequence` / `roomUnitsCount` · บล็อกใหม่ในโมดัล

---

# ✏️ ช่างแก้ชื่อยี่ห้อ/รุ่นที่พิมพ์ผิดได้เอง (8 ก.ย. 2026, DoubleKill)

เจ้าของโปรเจกต์สั่ง: *"ทำให้ช่างแก้ชื่อได้ กันกรณีเขียนผิดจะได้ไม่เสียเวลาไปแจ้ง"*

ก่อนหน้านี้แคตตาล็อกมีแค่ **เพิ่ม** กับ **ลบ(ถังขยะ)** — และลบเป็นสิทธิ์แอดมินล้วน ช่างที่พิมพ์ชื่อรุ่นผิดจึงต้องเพิ่มชื่อที่ถูกเข้าไปใหม่แล้วรอแอดมินมาเก็บกวาดตัวเก่า **ใช้คนสองคนกับรอหนึ่งรอบ เพื่อคำที่พิมพ์ผิดคำเดียว**

## ทำไมการเปลี่ยนชื่ออยู่ใต้ `verifyAssetEditor` ได้ ทั้งที่ลบยังต้องเป็นแอดมิน

**การเปลี่ยนชื่อไม่ใช่ทางอ้อมไปสู่การลบ** — มันเปลี่ยนป้ายของแถวที่ยังอยู่ ทุกเครื่องยังชี้ `id` เดิม ไม่มีอะไรหายจากดรอปดาวน์ และชื่อเดิมถูกเก็บไว้ใน audit log คู่กับคนที่พิมพ์ชื่อใหม่ · ต่างจากการลบที่ไปถึงทุกเครื่องที่ผูกอยู่และต้องกู้ผ่านถังขยะที่มีแต่แอดมินเปิดได้

| action | guard |
|---|---|
| `updateAcBrandAction` / `updateAcModelAction` | `verifyAssetEditor` (ช่าง + แอดมิน) |
| `delete` / `restore` / `permanentlyDelete` | `verifyOrgAdmin` เหมือนเดิม |

## กฎที่ action ทั้งสองตัวบังคับ

1. **ตรวจซ้ำแบบเดียวกับตอนเพิ่ม แต่ยกเว้นแถวตัวเอง** — ใช้ `normaliseCatalogueName` ตัวเดิม (trim · ยุบช่องว่าง · lowercase) ถ้าไม่ยกเว้นตัวเอง การแก้แค่ตัวพิมพ์ใหญ่/ช่องว่างจะชนกับตัวเอง · **แถวในถังขยะยังนับ** เพราะ `ac_brands_name_unique` / `ac_models_brand_id_name_unique` ไม่ข้ามแถวที่ถูก soft delete — ถ้าไม่ดักไว้จะไปพังที่ฐานข้อมูลแทน · รุ่นตรวจเฉพาะในยี่ห้อตัวเอง เพราะชื่อรุ่นเดียวกันคนละยี่ห้อคือคนละสินค้า
2. **แถวในถังขยะแก้ไม่ได้** — มองไม่เห็นทั้งสองหน้าอยู่แล้ว คำขอจึงมาได้จากแท็บค้างเท่านั้น และถ้าปล่อยให้แก้ จะเป็นการเปลี่ยนสิ่งที่แอดมินจะได้กลับมาตอนกู้คืนโดยไม่มีใครรู้
3. **ค่าไม่เปลี่ยน = ไม่เขียนอะไรเลย** เปิดฟอร์มแล้วกดบันทึกทั้งที่ไม่ได้แก้ จะไม่มีแถว audit ที่บันทึกว่า "ไม่มีอะไรเกิดขึ้น" · **พิสูจน์แล้ว: กดบันทึกโดยไม่แก้ ไม่มีแถวใหม่ใน `system_audit_logs`**
4. **audit เก็บทั้ง `oldValues` และ `newValues`** — `UPDATE_AC_BRAND` / `UPDATE_AC_MODEL` · ชื่อเดิมอยู่ในนั้น การเปลี่ยนชื่อผิดจึงย้อนได้เสมอ

> ⚠️ **`updated_at` ไม่ขยับตอนแก้ชื่อ** — `AcBrand` / `AcModel` ไม่มี `@updatedAt` และคอลัมน์ไม่มี `ON UPDATE CURRENT_TIMESTAMP` เหมือนกับตอน create ที่ไม่ได้เซ็ตเช่นกัน · ถ้าวันหนึ่งต้องรู้ว่าแถวไหนถูกแก้ล่าสุดเมื่อไหร่ ให้อ่านจาก audit log ไม่ใช่จากคอลัมน์นี้

## แก้ BTU ไปพร้อมกัน และผลที่ตามมาที่ต้องรู้

ฟอร์มแก้รุ่นแก้ทั้งชื่อและ BTU เพราะเลข BTU ที่พิมพ์ผิดคือปัญหาชนิดเดียวกันและอยู่บนแถวเดียวกัน

**`getUnitForLog` มี fallback `u.btu ?? u.acModel?.defaultBtu`** — เครื่องที่คอลัมน์ `btu` ของตัวเองเป็น `NULL` จะแสดงเลขของรุ่น ดังนั้นแก้ `default_btu` ที่นี่ **เปลี่ยนสิ่งที่เครื่องเหล่านั้นแสดงด้วย** ซึ่งคือสิ่งที่ต้องการเมื่อเลขในแคตตาล็อกคือตัวที่พิมพ์ผิด และไม่เคยไปทับเครื่องที่มีเลขของตัวเอง

## UI

**หน้าช่าง `/tech/catalogue`** — ปุ่มดินสอบนหัวการ์ดยี่ห้อและท้ายทุกแถวรุ่น กดแล้วแถวนั้นกลายเป็นฟอร์มที่ **มีค่าเดิมกรอกไว้ให้แล้ว** ไม่ใช่ช่องว่าง จะได้ไม่มีทางสงสัยว่ากำลังแก้ชื่อไหน

> ปุ่มดินสอของยี่ห้อเป็น **พี่น้องของปุ่มหัวการ์ด ไม่ใช่ลูก** — `<button>` ซ้อนกันไม่ได้ และหน้าที่ของหัวการ์ดคือกางรายการ · หน้าแอดมินเลี่ยงปัญหานี้ด้วย `stopPropagation` เพราะหัวการ์ดที่นั่นเป็น `div` อยู่แล้ว

**หน้าแอดมิน `/admin/settings` → จัดการยี่ห้อ/รุ่นแอร์** — ใส่ให้ด้วย ไม่ใช่ scope ที่สั่งมาโดยตรง แต่แอดมินที่มองแถวเดียวกันอยู่แล้วไม่ควรต้องเข้าหน้าช่างเพื่อแก้คำผิด และ wrapper ใน `app/admin/master-data/actions.ts` ที่ไม่มีใครเรียกก็คือ dead surface

ข้อความแนะนำหัวหน้าช่างอัปเดตเป็น: *"...พิมพ์ชื่อผิดกดปุ่มดินสอแก้เองได้ ไม่ต้องแจ้งผู้ดูแลระบบ · การลบหรือกู้คืนยังต้องให้ผู้ดูแลระบบทำให้"*

## ทดสอบผ่านหน้าจอจริง (ล็อกอินทั้ง 2 บทบาท)

| ทดสอบ | ผล |
|---|---|
| ช่างแก้ชื่อยี่ห้อ `Carrier` → `daikin Carrierr Typo` → กลับเป็น `Carrier` | ✅ ทั้งลิสต์เรียงใหม่ตาม |
| **ยุบช่องว่างซ้ำ** — พิมพ์ `Carrierr␣␣Typo` เก็บเป็น `Carrierr␣Typo` | ✅ `tidyCatalogueName` ทำงาน |
| **ดักซ้ำข้ามตัวพิมพ์/ช่องว่าง** — แก้ยี่ห้อเป็น `␣␣daikin␣␣` | ✅ ขึ้น "มียี่ห้อนี้อยู่ในระบบแล้ว (ชื่อในระบบ: Daikin)" ไม่เขียน DB |
| ดักซ้ำระดับรุ่นในยี่ห้อเดียวกัน — แก้ `AA-9268X` เป็น `bg-7522` | ✅ ขึ้น "มีรุ่นนี้อยู่ในยี่ห้อนี้แล้ว (ชื่อในระบบ: BG-7522)" |
| ช่างแก้ชื่อ+BTU รุ่น `AA-9268` 24,000 → `AA-9268X` 30,000 → กลับเดิม | ✅ audit บันทึกทั้งสองฟิลด์ |
| **กดบันทึกโดยไม่แก้อะไร** | ✅ สำเร็จเงียบๆ ไม่มีแถว audit ใหม่ |
| **เปลี่ยนชื่อรุ่นแล้วหน้าอื่นตามด้วยจริง** — `DI-1926` → `DI-1926-QA` แล้วค้นที่ omnibox | ✅ ขึ้นทั้งกลุ่ม "เครื่องแอร์" (`B467711-6-53142-02 · Carrier · DI-1926-QA`) และกลุ่ม "ยี่ห้อ/รุ่น" |
| แอดมินแก้ชื่อยี่ห้อจาก `/admin/settings` (`Carrier` → `Carrier QA` → กลับ) | ✅ ไม่กางการ์ด (`stopPropagation`) |
| ฟอร์มแก้รุ่นบนการ์ดแอดมิน | ✅ ชื่อ/BTU/ปุ่ม เรียงในการ์ด กดยกเลิกกลับเป็นแถวเดิม |
| console error ในเบราว์เซอร์ | ✅ ไม่มี |

`tsc --noEmit` 0 error · eslint **50 ปัญหา (31 error / 19 warning) เท่า baseline ก่อนแก้เป๊ะ ไม่มีของใหม่**

> 📌 **baseline eslint จริงคือ 50 ไม่ใช่ 51** ที่หัวข้อเก่าจดไว้ — วัดด้วย `git stash` แล้วรัน `npx eslint src` ซ้ำบน master สะอาด · `npx next lint --max-warnings=N` ใช้ไม่ได้แล้วบน Next 16 ให้เรียก `npx eslint src` ตรงๆ

**คืนค่าข้อมูลทดสอบครบ** — ชื่อทุกแถวกลับเป็นของเดิม ลบแถว audit ที่เกิดจากการทดสอบ (id 43–50) ทิ้งแล้ว · `users 5 · phones 7 · buildings 5 · rooms 32 · acs 73 · models 189 · logs 230 · audit max id 34 · pending 0` · `updated_at` ของแถวที่แตะไม่ขยับเลยตามที่อธิบายข้างบน จึงไม่เหลือร่องรอย

## ไฟล์ที่แตะ

| ไฟล์ | ทำอะไร |
|---|---|
| `src/lib/admin/master-data.ts` | `updateAcBrandAction` + `updateAcModelAction` |
| `src/app/tech/actions.ts` | wrapper ทั้งสองตัว |
| `src/app/admin/master-data/actions.ts` | wrapper ทั้งสองตัว |
| `src/app/tech/catalogue/catalogue-client.tsx` | ปุ่มดินสอ + ฟอร์มแก้ในแถว |
| `src/app/admin/master-data/master-data-client.tsx` | ปุ่มดินสอ + ฟอร์มแก้ในแถว |

---

# 🏢 ไอคอนอาคารบนหน้าสินทรัพย์เป็นตัวเลขมั่ว — แก้แล้ว (8 ก.ย. 2026, DoubleKill)

commit `2959c67`

## อาการ

หน้า `/admin/assets` กล่องไอคอนหน้าชื่ออาคารขึ้นเป็นตัวเลขที่อ่านไม่ออก — `46771`, `6055`, `27820`, `12034`, `67292`

## สาเหตุ

`asset-manager.tsx` เรนเดอร์ **ตัวย่ออาคารเป็นข้อความ** ในกล่องขนาดตายตัว `h-8 w-8` (32px):

```tsx
<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-mono text-xs font-bold">
  {b.abbreviation}
</span>
```

ตัวย่อในข้อมูลจริง**ยาว 7 ตัวอักษรทุกอัน** (`B467711`, `B660550`, `B278201`, `B120345`, `B572921`) · monospace 7 ตัวยัดไม่ลง 32px จึงล้นออกและถูกตัด เหลือเป็นตัวเลขที่ดูเหมือนสุ่ม — `B467711` ตัดเหลือ `46771`

## แก้เป็น

ใช้ไอคอน `Building2` แทน **เหมือนที่ `BuildingGroupList` ใช้มาตลอด** (`building-groups.tsx:314-316` เป็นกล่องเดียวกันเป๊ะแต่ใส่ไอคอน) · หน้านี้เป็นที่เดียวในโปรเจกต์ที่หลุดไปใส่ข้อความ — ตรวจด้วย grep ทั้ง `src/` แล้วไม่มีที่อื่นเรนเดอร์ `abbreviation` แบบนี้อีก

**ตัวย่อไม่ได้หายไป** ย้ายลงบรรทัดล่างคู่กับจำนวนห้อง/แอร์ ซึ่งมีที่พอและอ่านออกว่ามันคืออะไร (ตัวย่อคือส่วนหน้าของ `acCode` ทุกตัวในอาคารนั้น):

```
🏢  Administration Building 293183
    B467711 • 10 ห้อง • 23 แอร์
```

เพิ่ม `min-w-0` + `truncate` ให้บรรทัดนี้ด้วย กันล้นเมื่อชื่ออาคารยาว

## ทดสอบ

ทั้ง 5 อาคารขึ้นไอคอนพร้อมตัวย่อครบถ้วน · `tsc --noEmit` 0 error · eslint 51 เท่าเดิม · **อ่านอย่างเดียว ไม่ได้แตะข้อมูล**

---

# ✅ หน้าอนุมัติผู้ใช้งานเป็นการ์ด + merge 3 branch เข้า master แล้ว (8 ก.ย. 2026, DoubleKill)

## merge เสร็จแล้ว — master ตอนนี้รวมงาน 3 ก้อน

| branch | วิธี merge |
|---|---|
| `feat/tech-catalogue` | fast-forward |
| `feat/omni-search` | fast-forward (ซ้อนบน tech-catalogue อยู่แล้ว) |
| `feat/team-cards` | merge commit `10a794b` |

**Conflict มีที่เดียวคือ `HANDOFF.md`** — ทุก branch แทรกหัวข้อของตัวเองที่บนสุดของไฟล์ · แก้โดยเก็บทั้งสองฝั่ง เรียงใหม่ล่าสุดขึ้นก่อน ไม่มีอะไรถูกทิ้ง · ส่วน `src/lib/admin/pages.ts` กับ `src/app/admin/actions.ts` ที่ทั้งสอง branch แก้ **git รวมให้เองได้** เพราะเติมคนละฟังก์ชัน (`getAdminSearchIndex` กับ `getTechnicianDetail`)

**`feat/postgres` ยังไม่ merge** รอ Aiven ตามแผน

> ⚠️ **ตอน merge `feat/postgres` ทีหลังจะหนักกว่านี้มาก** — มันเขียน `src/lib/prisma.ts` ใหม่ทั้งไฟล์ แก้ `db-retry.ts` และลบ migration ทั้งชุด ขณะที่ master เดินไปแล้ว 13 commit · **ควรเอา master มา merge เข้า `feat/postgres` ก่อนที่จะห่างกันมากกว่านี้** ไม่ใช่รอไปทำทีเดียวตอนจบ

## หน้าอนุมัติผู้ใช้งาน: ตาราง → การ์ด

เจ้าของโปรเจกต์สั่งให้ขึ้นแบบเดียวกับหน้าเจ้าหน้าที่ และย้ำว่า **"ไม่ต้องมีประวัติ ไม่ต้องกดเข้าไปได้ แค่ให้ขึ้นข้อมูลครบตามที่กรอกสมัครเข้ามา"**

การ์ดแสดงครบทุกอย่างที่ `registerUser()` เก็บ: **รูป · ชื่อ · อีเมล · บทบาท · สถานะ · เบอร์โทร · วันเวลาที่ขอ** แล้วปิดท้ายด้วยปุ่ม **อนุมัติ / ปฏิเสธ** · ขอบการ์ดเป็นสีเตือนสำหรับคนที่ยัง `pending`

**ไม่ทำให้กดเข้าไปได้** — บัญชีที่รออนุมัติยังไม่มีประวัติการทำงานให้เปิด และปุ่มที่สำคัญอยู่บนการ์ดอยู่แล้ว

### เบอร์โทรต้องดึงเพิ่ม และดึงเฉพาะหน้านี้

`userListSelect` ไม่เคยดึง `phones` มา · เพิ่มเฉพาะใน `getApprovalsPageData` ไม่ใส่ใน select กลาง เพราะ**หน้าเจ้าหน้าที่แสดงคน 40 คนโดยไม่ได้โชว์เบอร์สักคน** การดึงมาทั้งหมดคือการจ่ายเปล่า

แยก type เป็น `PendingUserWithContact extends PendingUser` แทนที่จะทำ `phone` เป็น optional บน `PendingUser` — หน้าที่ต้องใช้เบอร์จะได้รับข้อมูลที่ไม่มีเบอร์มาไม่ได้เลยตั้งแต่ระดับ type

## แยก `UserCard` ออกมาใช้ร่วมกัน

การ์ดของหน้าเจ้าหน้าที่กับหน้าอนุมัติเหมือนกันราว 80% · ถ้าก๊อปไว้คนละที่ วันหนึ่งจะแสดงคนคนเดียวกันคนละแบบ โดยเฉพาะการจัดการรูปที่ตัดสินใจไปแล้วรอบหนึ่ง (4:3 · fallback เป็นตัวย่อบนพื้น primary พร้อมไอคอนบทบาทจางๆ)

`UserCard` รับ `actions` เป็น ReactNode เพราะสองหน้าถามคนละคำถาม — หน้าหนึ่งจัดการบัญชีที่มีอยู่แล้ว อีกหน้าตัดสินว่าควรมีไหม · และรับ `meta` สำหรับบรรทัดเพิ่มเติม (หน้าอนุมัติใส่เบอร์กับวันที่ขอ)

**`stopPropagation` ย้ายไปอยู่ที่ตัว `UserCard`** ครอบปุ่มทั้งแถวทีเดียว ไม่ต้องจำไปใส่ทีละปุ่มในแต่ละหน้า

## 🔴 หน้านี้ทดสอบไม่ได้ถ้าไม่สร้างข้อมูล

`pending` = **0 คน** ในฐานข้อมูล หน้าจึงว่างเปล่าตลอด · ต้อง insert ผู้ใช้ `pending` ขึ้นมาเองพร้อมแถวใน `user_phones` ถึงจะเห็นอะไร

```sql
INSERT INTO users (role,status,name,email,password,avatar_url,created_at,updated_at)
VALUES ('technician','pending','QA Pending Tester','qa.pending@example.com','<hash>',NULL,'2026-09-08 04:30:00','2026-09-08 04:30:00');
INSERT INTO user_phones (user_id,phone_number,is_primary,created_at,updated_at)
VALUES (LAST_INSERT_ID(),'081-234-5678',1,'2026-09-08 04:30:00','2026-09-08 04:30:00');
```

ยืนยันการแปลงเวลาไปด้วยในตัว: insert `04:30:00` (UTC) แล้วหน้าจอขึ้น **11:30** ตรงตาม `Asia/Bangkok`

**ลบข้อมูลทดสอบออกแล้ว** — users 5 · phones 7 · pending 0 · audit max id 34 เท่าเดิม

## ทดสอบผ่านหน้าจอจริง

| ทดสอบ | ผล |
|---|---|
| การ์ดคำขอแสดงครบทุกฟิลด์ที่กรอกสมัคร | ✅ รูป/ชื่อ/อีเมล/บทบาท/สถานะ/เบอร์/วันที่ขอ |
| ขอบการ์ดและ chip เป็นสีเตือนสำหรับ `pending` | ✅ |
| badge ในไซด์บาร์ขึ้นเลข 1 | ✅ |
| การ์ดกดเข้าไปไม่ได้ | ✅ ตามที่สั่ง |
| หน้าเจ้าหน้าที่หลังเปลี่ยนมาใช้ `UserCard` ร่วม | แสดงเหมือนเดิมทุกอย่าง ✅ |
| หลัง merge: `/admin` มีแถบค้นหา · `/tech/catalogue` ขึ้นยี่ห้อครบ · route guard ยังกันแอดมินออกจาก `/tech` | ✅ |

`tsc --noEmit` 0 error · eslint **51 เท่าเดิม ไม่มีของใหม่** · ไม่มี error ใน server log

---

# 👥 หน้าเจ้าหน้าที่เป็นการ์ด + โมดัลประวัติการทำงาน (8 ก.ย. 2026, DoubleKill)

branch `feat/team-cards` ตัดจาก `master` โดยตรง **ไม่ขึ้นกับ branch อื่นเลย** merge แยกได้

| commit | งาน |
|---|---|
| `cc85978` | ตารางเจ้าหน้าที่ → การ์ด + โมดัลประวัติการทำงาน |
| `f7a3ecf` | ย้ายปุ่มเพิ่มห้องไปที่หัวข้อชั้น + เพิ่มปุ่มเพิ่มชั้น |

## หน้ารายชื่อ: ตาราง 5 คอลัมน์ → การ์ด

การ์ดนำด้วยรูปโปรไฟล์ ตามด้วยชื่อ · อีเมล · chip บทบาท/สถานะ · ปุ่มระงับสิทธิ์ + รีเซ็ตรหัสผ่าน · กดที่การ์ดเปิดโมดัลรายละเอียด

**3 จุดที่ต่างจากร่างที่เจ้าของโปรเจกต์ส่งมา และเหตุผล** (เจ้าของบอกว่า "ปรับตามความเหมาะสมได้เลย"):

| ร่าง | ทำจริง | ทำไม |
|---|---|---|
| รูปแนวตั้ง ~250px | **4:3** | ยังนำด้วยรูปเหมือนเดิม แต่เห็น 3 แถวต่อจอแทน 2 ซึ่งต่างกันมากตอนมีช่าง 40 คน |
| ไม่มีอีเมล | **มีใต้ชื่อ** | อีเมลคือ identity ที่ใช้ล็อกอิน และช่องค้นหาบน header ก็ค้นด้วยอีเมล ถ้าไม่แสดงจะกลายเป็นค้นเจอแต่ดูไม่ออกว่าทำไม |
| — | **เรียงตามชื่อ ไม่ใช่ `createdAt desc`** | grid ไม่มีคอลัมน์ให้กวาดตา เรียงตามวันที่สมัครทำให้คนเดิมย้ายตำแหน่งทุกสัปดาห์ |

**หน้าละ 9 ไม่ใช่ 10** — 10 หารด้วย 3 คอลัมน์ไม่ลงตัว แถวสุดท้ายจะเหลือการ์ดเดียวโดด

### 🔴 fallback รูปคือเคสปกติ ไม่ใช่ข้อยกเว้น

`avatar_url` เป็น `NULL` **ทั้ง 5 คน** เพราะทุกบัญชีมาจาก seed ก่อนที่ `9a10e5a` จะบังคับให้คนสมัครใหม่ใส่รูป · fallback จึงต้องดูตั้งใจ ไม่ใช่กล่องเปล่า — ใช้ตัวย่อชื่อบนพื้น `bg-primary` พร้อมไอคอนบทบาท (`Wrench` / `Building2`) จางๆ ซ้อนหลัง ตาม pattern เดิมของไซด์บาร์และหน้าโปรไฟล์

**`userListSelect` ไม่เคยดึง `avatarUrl` มาเลย** ต้องเพิ่มเข้าไปก่อน

## โมดัลประวัติการทำงาน

ซ้าย: รูป · chip · ชื่อ · อีเมล · **เบอร์โทรทุกเบอร์** · ปุ่มทั้งสอง
ขวา: tree **อาคาร → ชั้น → ห้อง → เครื่อง → รายการที่ทำ**

**ใช้ `BuildingGroupList` / `FloorGroupList` / `RoomGroupList` ตัวเดิม** ที่ขับทุกหน้าจอในระบบ · และนั่นคือสิ่งที่ทำให้ **"ขึ้นเฉพาะที่เคยทำ"** เป็นจริงโดยไม่ต้องเขียน filter — `groupByBuilding` ไม่สร้าง entry ให้อาคารที่ไม่มีแถวตรงเลย ป้อน log ของช่างคนเดียวเข้าไปก็ได้ tree ของเขาพอดี

> **generic ต้องเขียนออกมาเอง** — `<BuildingGroupList<TechnicianLogRow>>` ไม่งั้น inference ต้องวิ่งผ่าน render callback 3 ชั้นแล้วตกไปที่ constraint กลายเป็น `Floorable[]` / `Roomable[]` · และ prop ชื่อ `groups` ไม่ใช่ `buildings` พร้อม `emptyMessage` ที่บังคับ

### 🔴 กรอง `userId` ที่ query ไม่ใช่ที่ component

ถ้ากรองตอนแสดงผล แถวของช่างคนอื่นจะถูกดึงและส่งมาถึงเบราว์เซอร์ก่อน แล้ววันหนึ่งจะมีคนแก้ component แล้วเผลอโชว์ — ซึ่งสำหรับคำถาม "คนนี้ทำอะไรไปบ้าง" คือคำตอบผิดทั้งหมด

**พิสูจน์แล้วด้วยข้อมูลจริง:** Craig Yost ขึ้น 57 ครั้ง · 5 อาคาร · 20 เครื่อง ตรงกับ SQL เป๊ะ · แต่ 20 เครื่องนั้นมี log รวมกัน **68 รายการ** — 11 รายการของช่างคนอื่นไม่โผล่ · ยอดตรงทุกชั้น: อาคาร 28+8+5+10+6=57 · ชั้น 12+8+8=28 · ห้อง 9+3=12 · เครื่อง 5+4=9 · และห้อง 1-846367 ขึ้นแค่เครื่อง `-01`/`-03` ส่วน `-02` หายไปเพราะไม่เคยแตะ

**ดึงทีเดียวจบตอนเปิดโมดัล** — ช่าง 1 คนมี log 43–68 รายการ กางเครื่องแต่ละตัวจึงไม่ต้องยิงเพิ่ม · ถ้าโตเป็นหลักพันต้องเปลี่ยนไปโหลดรายเครื่อง

### ปุ่มบนการ์ดต้อง `stopPropagation()`

การ์ดกดได้ทั้งใบ ถ้าไม่หยุด event ปุ่ม "ระงับสิทธิ์" จะเปิดโมดัลรายละเอียดขึ้นมาซ้อนหลัง dialog ยืนยัน · **เจ้าของโปรเจกต์สั่งให้เก็บปุ่มไว้ทั้งบนการ์ดและในโมดัล** เพื่อความง่ายในการกด

## ปุ่มเพิ่มห้อง/เพิ่มชั้นบนหน้าสินทรัพย์

| | เดิม | ตอนนี้ |
|---|---|---|
| หัวข้ออาคาร | `+ เพิ่มห้อง` | **`+ เพิ่มชั้น`** |
| หัวข้อชั้น | ไม่มีปุ่ม | **`+ เพิ่มห้อง`** (ช่องชั้นเติมให้และล็อก) |

เดิมปุ่มเพิ่มห้องอยู่บนหัวข้ออาคาร ซึ่งสูงกว่าสิ่งที่มันสร้างหนึ่งชั้น และถามชั้นเป็นช่องตัวเลขเปล่า · จะเพิ่มห้องที่ชั้น 4 ต้องเปิดจากอาคารแล้วพิมพ์ "4" จากความจำ

### 🔴 ไม่มีตาราง `floors` ในระบบ

`rooms.floor` เป็น**คอลัมน์บนตารางห้อง** ชั้นมีอยู่ได้เพราะมีห้องถือเลขชั้นนั้น · **ชั้นที่ไม่มีห้องไม่มีที่เก็บ** ถ้าทำปุ่ม "เพิ่มชั้น" ให้สร้างชั้นลอยๆ พอรีเฟรชมันจะหายไปเฉยๆ

จึงให้ "เพิ่มชั้น" เปิดฟอร์มเดียวกันแต่ช่องชั้นว่างและแก้ได้ พร้อมข้อความใต้ช่องบอกตรงๆ ว่า *"ชั้นเกิดขึ้นจากห้องที่อยู่บนชั้นนั้น การสร้างชั้นใหม่จึงคือการสร้างห้องแรกของชั้น"*

> ถ้าวันหนึ่งต้องการให้ชั้นมีอยู่จริงโดยไม่มีห้อง (สร้างโครงตึกไว้ก่อน) ต้องเพิ่มตาราง `floors` + migration + แก้ทุกที่ที่ใช้ `groupByFloor` — คนละขนาดงาน

## ของแถมที่แก้ไปด้วย

`getActiveTechnicians()` เขียน `select` ซ้ำเองแยกจาก `userListSelect` · พอหน้าเจ้าหน้าที่ต้องใช้ `avatar_url` ตัวนั้นไม่ได้โตตาม ทำให้ `tsc` พังที่ `/admin` และ `/admin/work-orders` · รวมให้ใช้ `userListSelect` + `toUserRow` ร่วมกันแล้ว

## ⚠️ หน้า `/admin` ไม่มีแถบค้นหา — ไม่ใช่ของพัง

`SEARCH_PLACEHOLDERS` ใน `admin-shell.tsx` มีแค่ 4 หน้า (`work-orders`, `team`, `assets`, `qr-codes`) หน้าที่ไม่อยู่ในตารางได้ `onSearchChange = undefined` แล้ว header ไม่เรนเดอร์ช่องเลย · **หน้าภาพรวมมีช่องค้นหาของตัวเองอยู่ในการ์ด "รอซ่อมด่วน" อยู่แล้ว** เดิมจึงตั้งใจไม่ให้ซ้ำ

การแก้ให้ขึ้นทุกหน้าอยู่บน branch `feat/omni-search` ไม่ใช่ branch นี้

## ทดสอบผ่านหน้าจอจริง

| ทดสอบ | ผล |
|---|---|
| การ์ด 5 คน เรียงตามชื่อ | ✅ |
| กดการ์ด → โมดัล | ✅ |
| tree ไล่ลง 4 ชั้นจนถึงรายการ log | ✅ ยอดตรงทุกชั้น |
| กด "รีเซ็ตรหัสผ่าน" บนการ์ด | ขึ้น dialog **ไม่เปิดโมดัลซ้อน** ✅ |
| แอดมินที่ไม่มี log | empty state + ปุ่มระงับสิทธิ์ตัวเองถูกปิด ✅ |
| Escape | หุบเครื่องก่อน แล้วค่อยปิดโมดัล ✅ |
| ทุกหัวข้อชั้นมีปุ่มเพิ่มห้อง | ✅ ฟอร์มจากชั้น 4 ล็อกเลข 4 |
| ปุ่มจากอาคาร | เปิด "เพิ่มชั้นใหม่" ช่องว่างแก้ได้ ✅ |

`tsc --noEmit` 0 error · eslint **51 เท่าเดิม ไม่มีของใหม่** · ไม่มี error ใน server log · **อ่านอย่างเดียวทั้งหมด** ตรวจแล้วรหัสผ่านทุกคนยัง NULL · audit 29 แถว max id 34 · rooms 32 / buildings 5 / acs 73 เท่าเดิม

## สถานะ branch ทั้งหมด ณ ตอนนี้

```
master              ee3a212
feat/postgres       967bafd   ย้าย PostgreSQL ขั้น 0–5 · รอ Aiven
feat/tech-catalogue bded5dd   ช่างจัดการสาระบบแอร์
feat/omni-search    4f15898   ซ้อนบน tech-catalogue · แถบค้นหาทุกหน้าอยู่นี่
feat/team-cards     f7a3ecf   จาก master โดยตรง
```

**ลำดับ merge ที่แนะนำ:** `tech-catalogue` → `omni-search` (ต้องหลัง เพราะซ้อนอยู่) → `team-cards` (อิสระ) · `feat/postgres` เก็บแยกจนกว่า Aiven พร้อม

> **HANDOFF.md จะชนกันตอน merge** เพราะทุก branch แทรกหัวข้อของตัวเองที่บนสุดของไฟล์ · เป็น conflict แบบเอาทั้งสองฝั่งมาต่อกัน แก้ไม่ยาก แค่ต้องรู้ล่วงหน้า
# 🔎 ช่องค้นหาบน header กลายเป็น omnibox แล้ว — ครบ 3 เฟส (8 ก.ย. 2026, DoubleKill)

เจ้าของโปรเจกต์ส่งภาพ omnibox ของ Chrome มาแล้วขอให้ทำแบบเดียวกัน · branch `feat/omni-search` ตัดจาก `feat/tech-catalogue` (ต้องใช้ `src/lib/search.ts` ที่สร้างไว้ในนั้น)

| เฟส | commit |
|---|---|
| 1 เครื่องแอร์ + ตัวหนา + คีย์บอร์ด (ฝั่งช่าง) | `09a0d42` |
| 2–3 กลุ่มที่เหลือ + ฝั่ง admin | `0f45d5c` |

## โครงที่ใช้ — ลอกของ Chrome

**แถวแรกคือ fallback เสมอ: "กรองรายการในหน้านี้ด้วย …"** ซึ่งคือสิ่งที่ช่องนี้ทำมาตลอด · ของเดิมไม่หายไปไหน กด Enter บนคำที่ไม่ตรงกับอะไรเลยก็ยังกรองเหมือนเดิม · เปิดดรอปดาวน์เมื่อพิมพ์ **≥2 ตัวอักษร** และ Escape ปิดดรอปดาวน์แต่**คงตัวกรองไว้**

| กลุ่ม | ช่าง | แอดมิน | กดแล้วไปไหน |
|---|---|---|---|
| เครื่องแอร์ | ✅ | ✅ | ช่าง → **เปิดโมดัลประวัติตรงนั้น** · แอดมิน → `/admin/assets?q=` |
| ใบงาน (ที่ยังไม่เสร็จ) | — | ✅ | `/admin/work-orders?q=` |
| อาคาร · ห้อง | ✅ | ✅ | `?q=` ไปหน้ารายการสินทรัพย์ |
| ยี่ห้อ/รุ่น | ✅ | ✅ | ช่าง → `/tech/catalogue?model=` · แอดมิน → `/admin/master-data` |
| ผู้ใช้งาน | — | ✅ | `active` → `/admin/team?q=` · `pending` → `/admin/approvals` |
| เมนู | ✅ | ✅ | href ของเมนูนั้น |

**เฉพาะเครื่องแอร์ฝั่งช่างเท่านั้นที่เปิดในที่เดิมไม่ไปไหน** เพราะคำถามที่อยู่เบื้องหลังการพิมพ์รหัสแอร์คือ "เครื่องนี้เคยทำอะไรไปบ้าง" ซึ่งโมดัลประวัติตอบได้โดยไม่ต้องทิ้งหน้าที่ทำอยู่

จัดกลุ่มพร้อม cap ต่อกลุ่ม (4) และรวม (10) — กลุ่มที่มีร้อยรายการจะได้ไม่กลบกลุ่มอื่น · คีย์บอร์ดเดินบนลิสต์ที่ flatten แล้ว จะได้ไม่กระโดดข้ามกลุ่มมั่ว

## 🔴 การตัดสินใจสำคัญ: ไม่ใช้ `contains` ของ Prisma

วิธีที่ตรงที่สุดคือยิง server action ค้นทุกคีย์สโตรก แต่ **`contains` ให้ผลไม่เหมือนกันระหว่าง engine** — MySQL `utf8mb4_unicode_ci` ไม่สนตัวพิมพ์ PostgreSQL สน · ทั้ง `src/` **ไม่มี `contains` เลยสักจุด** และนั่นคือสิ่งที่ทำให้แผนย้าย PG เป็นงานกลไก

**จึงโหลด index ทั้งก้อนครั้งเดียวตอนคลิกช่องครั้งแรก แล้วกรองใน JS** ผ่าน `matchesQuery()` ตัวเดียวกับที่ลิสต์ใช้ · ไม่ยิงทุกตัวอักษร (เร็วกว่า) และไม่พึ่ง collation ของ DB

**ขนาดตอนนี้:** ช่าง ~300 entry (แอร์ 73 + ห้อง 32 + อาคาร 5 + รุ่น 189) · แอดมินเพิ่มใบงานที่ยังไม่เสร็จ 55 + ผู้ใช้ 5 · `getAdminSearchIndexAction()` ตอบใน **33ms**

> **⚠️ เพดานของวิธีนี้:** ถ้าโหลดข้อมูลจริงของ มรภ.ภูเก็ตแล้วเกินหลักพัน entry ต้องเปลี่ยนไปเป็น debounced server query ซึ่งจะชนปัญหา `contains` ทันที · ทางออกตอนนั้นคือกรองใน JS **ฝั่ง server** (ดึงเฉพาะคอลัมน์ที่ค้น แล้ว filter ก่อนส่งกลับ) ไม่ใช่เติม `contains` เข้าไป · ใบงานเป็นส่วนที่จะโตเร็วที่สุด — ตัดใบงานที่ปิดแล้วออกไปแล้ว เพราะ "หาใบงานนั้น" เกือบทั้งหมดหมายถึงใบที่ยังเปิดอยู่

## ช่องค้นหาของแอดมินขึ้นทุกหน้าแล้ว

เดิมมีแค่ 4 หน้าจาก 10 (`SEARCH_PLACEHOLDERS`) · ช่องที่**กรองได้อย่างเดียว**ควรอยู่เฉพาะหน้าที่มีลิสต์ แต่ช่องที่**กระโดดข้ามหน้าได้**ควรอยู่ทุกหน้า — หน้าตั้งค่าคือที่ที่คนนึกอยากหาเครื่องพอดี · หน้าที่ไม่มีใน map ใช้ placeholder กลาง `"ค้นหารหัสแอร์, อาคาร, ใบงาน, ผู้ใช้..."`

## 🐛 บั๊ก 2 ตัวที่เจอตอนทดสอบ (แก้แล้วทั้งคู่)

**1. `onFocus` อย่างเดียวไม่พอ** — Escape กับ Enter ปิดดรอปดาวน์โดยไม่ย้ายโฟกัส คลิกกลับเข้าไปที่ช่องเดิมจึงไม่เกิด focus event · ทางเดียวที่จะเปิดใหม่คือพิมพ์เพิ่มอีกตัว · เพิ่ม `onClick` ควบคู่

**2. เลือก suggestion ตอนอยู่หน้าปลายทางอยู่แล้ว → ตัวกรองถูกล้างทันที** · ตัวจริงคือ: `router.replace(pathname)` ที่ถอด `?q=` ออกทำให้ `searchParams` เปลี่ยน → effect รันซ้ำ → ไม่เจอ `q` → `setSearch("")` **ล้างคำที่เพิ่งตั้งไปเมื่อครู่**

แก้โดยผูกการ reset เข้ากับ **path ที่จำไว้** ไม่ใช่กับการที่ effect ทำงาน:

```ts
const lastPathRef = useRef(pathname);
useEffect(() => {
  const term = searchParams.get("q");
  if (term) { setSearch(term); lastPathRef.current = pathname; router.replace(pathname); return; }
  if (lastPathRef.current !== pathname) { lastPathRef.current = pathname; setSearch(""); }
}, [pathname, searchParams, router]);
```

ทำเหมือนกันทั้ง `tech-shell.tsx` และ `dashboard-search.tsx` (ของแอดมิน)

## รายละเอียดที่ตั้งใจให้เป็นแบบนี้

- **ดรอปดาวน์ลอยทับได้** (`absolute`) ต่างจาก `SearchableSelect` ที่ต้องขยายลงมา เพราะ header ไม่ได้อยู่ใน scroll container — คนละสถานการณ์
- **บนมือถือเป็น overlay เต็มความกว้าง** (`fixed inset-x-2`) เพราะช่องกว้าง 192px ดรอปดาวน์ขนาดนั้นอ่านไม่ออก
- **`highlightMatch()` ตัดสตริงจากต้นฉบับ** เทียบแบบ lowercase แต่หั่นจากข้อความจริง ตัวพิมพ์เดิมจึงไม่เพี้ยน มีแค่น้ำหนักที่เปลี่ยน · ภาษาไทยไม่มีตัวพิมพ์ใหญ่-เล็ก และรหัสรุ่นเป็น ASCII จึงไม่มีปัญหา offset เลื่อน
- **เมนูสร้างจาก `navItems` ไม่ใช่ลิสต์ที่สอง** — เพิ่มหน้าใหม่ในไซด์บาร์แล้วค้นเจอเลย ไม่ต้องจำไปลงทะเบียนซ้ำ
- **รายการห้องเรียงด้วย `localeCompare(..., "th")`** ไม่ใช่ `orderBy` ของ Prisma ด้วยเหตุผลเดียวกับที่เขียนไว้ในหัวข้อตรวจ collation

## ทดสอบผ่านหน้าจอจริงทั้ง 2 ฝั่ง

| ทดสอบ | ผล |
|---|---|
| พิมพ์ `B4677` (ช่าง) | 8 รายการ ตัวหนาตรงส่วนที่พิมพ์ทั้งในรหัสและบรรทัดสถานที่ ✅ |
| คลิกเครื่องแอร์ | เปิดโมดัลประวัติเครื่องนั้น ✅ |
| `ArrowDown` + `Enter` | เลือกได้ ✅ |
| `Enter` แถวแรก | ปิดดรอปดาวน์ ตัวกรองยังอยู่ ✅ |
| คลิก suggestion ห้อง | ลิสต์เหลือ "ห้อง 7-970896 · 3 แอร์" ✅ |
| คลิก suggestion รุ่น | ไป `/tech/catalogue` กรองเหลือ Carrier ✅ |
| แอดมินที่ `/admin/settings` (เดิมไม่มีช่องค้นหา) | มีช่อง + เห็นกลุ่ม เครื่องแอร์/ใบงาน/ห้อง ✅ |
| คลิก suggestion ใบงาน | ไปกระดานใบงาน เหลือ "ทั้งหมด 1 รายการ" ใบนั้น ✅ |
| คำที่ไม่ตรงอะไรเลย | "ไม่พบรายการที่ตรงกับคำค้นนี้" ✅ |

`tsc --noEmit` 0 error · eslint **51 เท่าเดิม ไม่มีของใหม่** · ไม่มี error ใน server log · **อ่านอย่างเดียวทั้งหมด ไม่มีข้อมูลทดสอบให้คืน**

---

# ✅ ช่างจัดการสาระบบแอร์และลงทะเบียนเครื่องได้เองแล้ว — ครบ 5 เฟส (8 ก.ย. 2026, DoubleKill)

ทำตามแผนที่เขียนไว้ใน `ee3a212` ครบทุกเฟส · branch `feat/tech-catalogue` ตัดจาก `master` (ไม่ใช่จาก `feat/postgres` เพื่อไม่ให้ติดรอ Aiven)

| เฟส | commit |
|---|---|
| 1–2 ด่านสิทธิ์ + wrapper | `7cb45fb` |
| 3 แก้รุ่นในโมดัลบันทึกงาน | `4197736` |
| 4–5 หน้าสาระบบ + ลงทะเบียนเครื่อง + รอบล้าง | `84e8d53` |

## หลักการที่ยึดไว้: ไม่ก๊อปตรรกะ ย้ายแค่ด่านตรวจสิทธิ์

เพิ่ม `verifyAssetEditor()` ใน `src/lib/auth-guards.ts` รับทั้ง `org_admin` และ `technician` แล้วสลับเฉพาะ 6 action ที่ `src/lib/admin/{master-data,air-conditioners,schedules}.ts` · **ไม่มีตรรกะไหนถูกก๊อปไป `src/lib/tech/` เลย** — `src/app/tech/actions.ts` เป็น wrapper บางๆ ชี้กลับมาที่ implementation เดิม

**การลบ/กู้คืน/ล้างถังขยะ (6 action) ยังเป็น `verifyOrgAdmin` เหมือนเดิม** และไม่มี wrapper ฝั่งช่าง จึงไม่มีแม้แต่ reference ใน bundle ของช่าง · ทดสอบแล้ว: ล็อกอินเป็นช่างแล้วเปิด `/admin/master-data` โดนเด้งกลับหน้า login

## สิ่งที่เพิ่มเข้ามานอกเหนือจากแผน (แต่จำเป็น)

**1. `createAcBrandAction` / `createAcModelAction` ไม่เคยมี `logAudit`** — ในแผนผมเข้าใจผิดว่ามีอยู่แล้ว ตรวจจริงแล้วมีแต่ฝั่ง delete/restore/purge · เพิ่มให้ทั้งคู่ พร้อม `createAirConditionerAction` ที่ก็ไม่มี · ตอนนี้ทุกการเขียนสาระบบตอบได้ว่าใครทำ

**2. เทียบชื่อซ้ำแบบไม่สนตัวพิมพ์และช่องว่าง** — unique index เทียบทีละไบต์ ซึ่งพอตอนมีแอดมินคนเดียวพิมพ์เอง แต่พอช่างหลายคนเพิ่มจากหน้างาน `"Inverter 12000"` / `"inverter 12000"` / `"Inverter  12000"` จะผ่านหมดและกลายเป็นสาระบบที่ยุบรวมทีหลังไม่ได้ · `normaliseCatalogueName()` ใน `master-data.ts` กันไว้ และข้อความ error บอกชื่อที่มีอยู่จริงให้ด้วย

**3. `updateAirConditionerAction` ต้องแยก "ไม่ส่งมา" ออกจาก "ส่งมาว่าง"** — `status` กับ `installedAt` เดิมบังคับส่ง ถ้าไม่ส่งจะเขียน null ทับ · โมดัลแก้รุ่นของช่างไม่ได้แสดงสองช่องนี้ ถ้าไม่แก้จะ**ล้างวันติดตั้งและรีเซ็ตสถานะทุกครั้งที่บันทึก** · ตอนนี้ไม่ส่ง = ไม่แตะ ส่งมาว่าง = ล้าง (ฟอร์มแอดมินส่งเสมอ จึงไม่กระทบ)

## `acCode` — ยืนยันว่าไม่ใส่ชั้น และแก้การชนกันแล้ว

รูปแบบยังเป็น `[BLDG]-[ROOM]-[NN]` ตามเหตุผล 4 ข้อในแผน (`rooms` unique ต่ออาคารอยู่แล้ว · ชื่อห้องบอกชั้นอยู่แล้วทั้งสองชุดข้อมูล · `floor` เป็น nullable · รหัสถูกพิมพ์ลงสติกเกอร์แต่ชั้นแก้ได้)

**แก้การชนกันแล้ว** — เดิมนับเครื่องในห้องนอกทรานแซกชันแล้วค่อย insert · ตอนนี้จับ Prisma `P2002` แล้วนับใหม่ ลองสูงสุด 5 ครั้ง โดยใช้ `นับได้ + attempt` ไม่ใช่ `+ 1` เพื่อให้ข้ามช่องว่างของเลขที่เคยถูกลบถาวรไปได้ · **ไม่ใช้ `SELECT ... FOR UPDATE`** เพราะทั้ง `src/` ไม่มี raw SQL เลย ซึ่งเป็นคุณสมบัติที่ทำให้ย้ายไป PostgreSQL ได้ง่าย

ทดสอบจริง: ลงทะเบียนเข้าห้อง `1-19179` ที่มีอยู่แล้ว 2 เครื่อง ได้ `B467711-1-19179-03` ถูกต้อง

## ระบบค้นหา

**ของเดิมที่ใช้ได้อยู่แล้วไม่ได้เขียนใหม่** — `filterJobs()` ย้ายไปเรียก `matchesQuery()` ที่ `src/lib/search.ts` ตัวเดียวกับที่ฟอร์มใช้ พฤติกรรมเหมือนเดิมทุกอย่าง แค่เลิกเป็นสำเนาที่ 4 ของกฎเดียวกัน

**ของใหม่คือ `src/components/shared/searchable-select.tsx`** — พิมพ์แล้วกรองทันที รองรับลูกศร/Enter/Escape (Escape ปิดเฉพาะดรอปดาวน์ ไม่ทะลุไปปิดโมดัล) · **ขยายลงมาในหน้าไม่ใช่ลอยทับ** เพราะโมดัลของโปรเจกต์นี้เป็น `fixed inset-0` ที่ scroll เนื้อหาตัวเอง panel แบบ absolute จะโดน clip

**ถ้าพิมพ์แล้วไม่เจอ จะมีปุ่ม "เพิ่ม … เป็นรุ่นใหม่" ท้ายรายการ** และพอกดแล้วเลือกให้อัตโนมัติ · ช่างไม่ต้องออกจากฟอร์มเลย · BTU ที่พิมพ์ไว้จะกลายเป็น `defaultBtu` ของรุ่นใหม่ด้วย

`BrandModelPicker` ถูกแยกออกมาใช้ร่วมกันระหว่างโมดัลบันทึกงานกับฟอร์มลงทะเบียน

## 🔴 กับดักที่เจอตอนทำ

**โมดัลของช่างเป็น `<form>` อยู่แล้ว** — panel แก้รุ่นจึง**ต้องไม่เป็น form ซ้อน** (HTML ไม่ยอม เบราว์เซอร์จะยุบให้เงียบๆ แล้วปุ่มบันทึกรุ่นจะไปกดส่งใบบันทึกงานแทน) · ประกอบ `FormData` เองและใช้ `type="button"` ทุกปุ่ม

**ห้ามเอาการแก้รุ่นไปใส่ในทรานแซกชันของ `logMaintenanceAction`** — มันล็อกแถวเครื่องแบบ exclusive และห่อด้วย `withDeadlockRetry` อยู่แล้ว · panel จึงบันทึกแยกก่อน · ทดสอบแล้วว่าแก้รุ่นเสร็จแล้วกดบันทึกงานต่อทันที ไม่มี deadlock

**เปลี่ยน branch ต้อง `npm install` ใหม่** — `feat/postgres` ถอด `@prisma/adapter-mariadb` ออกและใส่ `@prisma/adapter-pg` แทน พอกลับมา branch นี้ `tsc` ฟ้อง `Cannot find module '@prisma/adapter-mariadb'` ทันที · ต้อง `npm install` + `npx prisma generate` (client ที่ generate ค้างอยู่เป็นของ PostgreSQL) และลบ `.next` ทิ้ง

**เรียงห้องในดรอปดาวน์ต้องเรียงใน JS** — `listRoomOptions()` ใช้ `localeCompare(..., "th")` ไม่ใช่ `orderBy` ของ Prisma เพราะ `utf8mb4_unicode_ci` ของ MariaDB ดันคำที่ขึ้นต้นด้วยสระหน้าไปท้ายสุด (ดูหัวข้อตรวจ collation ที่เขียนไว้บน `feat/postgres`)

## ทดสอบผ่านหน้าจอจริงทั้งหมด (ล็อกอินเป็น Craig Yost)

| ทดสอบ | ผล |
|---|---|
| ค้นหายี่ห้อในดรอปดาวน์ พิมพ์ `dai` | เหลือ Daikin ตัวเดียว + ปุ่มเพิ่มยี่ห้อ ✅ |
| เพิ่มรุ่นใหม่จากโมดัลบันทึกงาน | สร้างแล้วเลือกให้อัตโนมัติ พร้อม `default_btu` จากช่อง BTU ✅ |
| บันทึกเครื่อง | FK ย้ายไปรุ่นใหม่ · **`status` และ `installed_at` ไม่ถูกแตะ** ✅ |
| บันทึกงานต่อทันที | ใบงานปิด ไม่มี deadlock ไม่มี error ✅ |
| audit | `CREATE_AC_MODEL` / `UPDATE_AIRCONDITIONER` / `CREATE_AIRCONDITIONER` ทุกแถว `user_id` = ช่าง ✅ |
| หน้า `/tech/catalogue` ค้นหา `KQ-48` | เหลือ Panasonic ยี่ห้อเดียว (ค้นเจอจากชื่อ**รุ่น**) ✅ |
| ลงทะเบียนเครื่องใหม่ | ได้ `B467711-1-19179-03` + schedule 3 เดือนในทรานแซกชันเดียว + qr uuid ใหม่ ✅ |
| แก้รอบล้าง 3 → 6 เดือน | `next_due_date` ขยับเป็น 2027-03-08 การ์ดอัปเดตตาม ✅ |
| Enter เลือกรายการในดรอปดาวน์ | ใช้ได้ ✅ |
| ช่างเปิด `/admin/master-data` | เด้งกลับ login ✅ |

`tsc --noEmit` 0 error · eslint **51 ปัญหาเท่าเดิมเป๊ะ ไม่มีของใหม่** (วัด baseline ด้วยการ stash เทียบ) · **คืนค่าข้อมูลทดสอบครบแล้ว** — users 5 / brands 5 / models 189 / acs 73 / logs 230 / schedules 73 / max audit id 34 เท่าเดิมทุกตัว

## ยังไม่ได้ทำ

- **ยังไม่ push** branch นี้ขึ้น GitHub
- **ช่างยังพิมพ์สติกเกอร์ QR เองไม่ได้** — ตั้งใจ · หลังลงทะเบียนโมดัลจะค้างหน้าจอบอกรหัสเครื่องและเตือนว่าต้องให้แอดมินพิมพ์สติกเกอร์ ไม่งั้นช่างจะเดินไปสแกนแล้วไม่เจอ
- **ช่างย้ายเครื่องข้ามห้องไม่ได้** — ข้อจำกัดเดิมของ `updateAirConditionerAction` เพราะ `acCode` พิมพ์ลงสติกเกอร์ไปแล้ว

---

# 📋 แผน: ให้ช่างจัดการสาระบบแอร์และลงทะเบียนเครื่องได้เอง — ยังไม่ได้ลงมือ (7 ก.ย. 2026, DoubleKill)

> **สถานะ: แผน ไม่ใช่งานที่ทำแล้ว** · เจ้าของโปรเจกต์สั่งให้วางแผนไว้ก่อน ยังไม่ต้องเขียนโค้ด · ยังไม่มี branch สำหรับงานนี้

## ปัญหาที่จะแก้

ช่างทำได้แค่ 5 อย่าง — ดูข้อมูล, รับงาน, รับงานหลายใบ, บันทึกผลงาน, สแกน QR (`src/app/tech/actions.ts`) · การเพิ่มยี่ห้อ/รุ่นแอร์และการลงทะเบียนเครื่องเป็นของแอดมินล้วน กันด้วย `verifyOrgAdmin()`

ช่างที่เจอแอร์รุ่นที่ยังไม่มีในสาระบบตอนอยู่หน้างานจึงทำอะไรต่อไม่ได้ ต้องออกจากงาน ไปแจ้งแอดมิน รอเพิ่มให้ แล้วค่อยกลับมา

## หลักการ: ไม่เขียนตรรกะใหม่ ย้ายแค่ด่านตรวจสิทธิ์

ตรรกะมีครบแล้วใน `src/lib/admin/` สิ่งเดียวที่กันช่างอยู่คือบรรทัด `await verifyOrgAdmin()` บรรทัดแรกของแต่ละ action

**ห้ามก๊อปตรรกะไป `src/lib/tech/`** เพราะในนั้นมีกฎที่พลาดง่ายมาก: กรองรุ่นที่ถูกลบด้วย `findFirst` แทน `findUnique` (`air-conditioners.ts:91-97`), `firstDueDateFor()` ที่กันเครื่องติดตั้งมานานไม่ให้ได้วันครบกำหนดย้อนหลังหลายปี (บรรทัด 142-160), การล้าง `brand`/`model` เมื่อสลับไป master และล้าง FK เมื่อสลับไป custom (บรรทัด 226-242), และการสร้าง `maintenanceSchedule` ในทรานแซกชันเดียวกับเครื่อง (บรรทัด 116-128) · โค้ดสองชุดจะเพี้ยนออกจากกันภายในไม่กี่เดือน

## ขอบเขตสิทธิ์

| ช่างจะทำได้ | ยังเป็นของแอดมินเท่านั้น |
|---|---|
| เพิ่มยี่ห้อ · เพิ่มรุ่น (ชื่อ + BTU) | **ลบ/กู้คืน/ล้างถังขยะ** ยี่ห้อและรุ่น (6 action) |
| ลงทะเบียนเครื่องใหม่ (mint acCode + QR + schedule) | ลบเครื่อง · จัดการอาคาร/ห้อง |
| แก้ข้อมูลเครื่อง (รุ่น, BTU, สถานะ, วันติดตั้ง) | อนุมัติผู้ใช้ · ตั้งค่าระบบ · พิมพ์สติกเกอร์ QR |
| แก้รอบล้าง (`frequencyValue`/`frequencyUnit`) | |

**ทำไมลบยังเป็นของแอดมิน:** เพิ่มผิดแก้ได้ด้วยการเพิ่มใหม่ · ลบผิดกระทบทุกเครื่องที่ผูกอยู่ และต้องรู้เรื่องถังขยะกับ unique index ที่ยังกินชื่อเดิมอยู่

**เจ้าของโปรเจกต์สั่งชัดว่าไม่ต้องทำคิวรออนุมัติ** ช่างเพิ่มเข้าสาระบบได้เลย · ตัวคุมคุณภาพคือ `logAudit` + unique index `ac_models_brand_id_name_unique`

## 5 เฟส

| เฟส | ทำอะไร | ไฟล์หลัก |
|---|---|---|
| 1 | `verifyAssetEditor()` รับทั้ง 2 บทบาท แล้วสลับเฉพาะ 6 action · เพิ่ม `logAudit` ให้ `createAirConditionerAction` ที่ยังไม่มี | `src/lib/auth-guards.ts` · `src/lib/admin/{master-data,air-conditioners,schedules}.ts` |
| 2 | wrapper ฝั่งช่าง (ไฟล์ `"use server"` export ได้แต่ async function จึงต้องห่อ) | `src/app/tech/actions.ts` |
| 3 | **จุดที่ช่างใช้บ่อยที่สุด** — แก้/เพิ่มรุ่นได้จากในโมดัลบันทึกงาน | `src/components/tech/log-action-modal.tsx` |
| 4 | เมนูใหม่ "จัดการสาระบบแอร์" (ตัดปุ่มลบและถังขยะออก) | `src/app/tech/catalogue/` · `tech-shell.tsx` · `src/lib/tech/pages.ts` |
| 5 | ลงทะเบียนเครื่องใหม่ + แก้รอบล้าง | `src/app/tech/assets/` |

> **⚠️ เฟส 3 ต้องระวัง:** `logMaintenanceAction` เป็นทรานแซกชันที่ห่อด้วย `withDeadlockRetry` และล็อกแถวเครื่องแบบ exclusive อยู่แล้ว — **ห้ามเอาการแก้รุ่นไปใส่ในทรานแซกชันนั้น** ให้เป็นคนละ action ที่ยิงก่อน ไม่งั้นจะไปกวนลำดับล็อกที่ `src/lib/tech/maintenance-log.ts:79` อธิบายไว้ว่าเป็นตัวแก้ deadlock ตัวจริง

**เฟส 1-3 อย่างเดียวแก้ปัญหาที่เล่ามาได้ครบแล้ว** เฟส 4-5 เป็นของเพิ่ม หยุดหลังเฟส 3 ได้

## รูปแบบ acCode — สรุปว่า **ไม่ใส่ชั้น** เก็บ `[BLDG]-[ROOM]-[NN]` ไว้เหมือนเดิม

เจ้าของโปรเจกต์ถามว่าควรเพิ่มชั้นเข้าไปในรหัสด้วยไหม · ตรวจข้อมูลจริงแล้วตอบว่าไม่ควร:

1. **ไม่ช่วยเรื่องความไม่ซ้ำเลย** — `rooms` มี `@@unique([buildingId, name])` อยู่แล้ว `BLDG-ROOM` จึงไม่ซ้ำโดยฐานข้อมูลบังคับ ชั้นเพิ่มความไม่ซ้ำได้ 0
2. **ชื่อห้องบอกชั้นอยู่แล้วทั้งสองชุดข้อมูล** — seed ใช้ `101`/`201` (หลักแรกคือชั้น) ข้อมูลจริงใช้ `2-521625`/`7-782581` (ตัวหน้าคือชั้นตรงๆ) · ใส่ชั้นเข้าไปจะได้ `SCI-1-101-01` และ `B120345-2-2-521625-01` ซ้ำซ้อนและอ่านยากขึ้น
3. **`rooms.floor` เป็น nullable** — "ไม่ระบุชั้น" เป็นสถานะจริงที่ `floorLabel()` รองรับ ถ้าชั้นอยู่ในรหัส ห้องที่ยังไม่กรอกชั้นต้องมีตัวแทนแบบ `X` ทำให้รหัสไม่เป็นแบบเดียวกัน
4. **ข้อสำคัญที่สุด: acCode พิมพ์ลงสติกเกอร์แล้วเปลี่ยนไม่ได้ แต่ `floor` แก้ได้** วันที่มีคนแก้ชั้นของห้องให้ถูก สติกเกอร์ทุกใบในห้องนั้นกลายเป็นข้อมูลผิดทันที · การฝัง metadata ที่แก้ได้ลงในรหัสถาวรคือการรับประกันว่าวันหนึ่งมันจะไม่ตรงกัน

**ถ้าอยากเห็นชั้น มันมีอยู่แล้ว** — `groupByFloor`/`floorLabel` ใน `src/components/shared/building-groups.tsx` ขับโครงสร้าง อาคาร → ชั้น → ห้อง → เครื่อง ทุกหน้าจอ · ชั้นเป็นมิติของการ**จัดกลุ่ม** ไม่ใช่มิติของ**การระบุตัวตน**

### 🔴 แต่ต้องแก้การชนกันของเลขลำดับ (ทำในเฟส 5)

สูตรปัจจุบัน "นับเครื่องในห้อง + 1" (`air-conditioners.ts:70-71`) อ่านนอกทรานแซกชันแล้วค่อย insert · ช่างสองคนลงทะเบียนห้องเดียวกันพร้อมกันจะได้เลขเดียวกัน · `air_conditioners_ac_code_unique` กันข้อมูลเสียไว้ แต่คนที่แพ้เจอ error ดิบ · เดิมความเสี่ยงต่ำเพราะมีแอดมินคนเดียว **พอเปิดให้ช่างทุกคนทำ ความเสี่ยงขึ้นทันที**

**วิธีที่เลือก: retry เมื่อชน ไม่ใช่ row lock** — จับ Prisma `P2002` บน index นั้น นับใหม่ ลองใหม่สูงสุด 5 ครั้ง · เหตุผลที่ไม่ใช้ `SELECT ... FOR UPDATE`: ทั้ง `src/` **ไม่มี `$queryRaw`/`$executeRaw` เลยสักจุด** ซึ่งเป็นคุณสมบัติที่ทำให้ย้ายไป PostgreSQL ได้ง่าย (ระบุไว้ในแผน PG) การเติม raw SQL จะทิ้งคุณสมบัตินั้นเพื่อแก้ปัญหาที่ retry ก็แก้ได้

**การนับต้องนับรวมเครื่องที่ soft-delete ต่อไป** — ตอนนี้ `include: { airConditioners: true }` ไม่ได้กรอง `deletedAt` ซึ่ง**ถูกแล้ว** ถ้าไปกรองออก ห้องที่เคยลบเครื่องกลางๆ ไปจะสร้างรหัสซ้ำกับเครื่องที่ยังอยู่ทันที

## ระบบช่วยค้นหา

**ของที่มีอยู่แล้วและใช้ได้ดี — ห้ามเขียนใหม่:** `filterJobs()` ที่ `src/components/tech/types.ts:39-54` กรองแบบ substring, case-insensitive, ครอบ `acCode`/`brand`/`location` พร้อมกัน และแคบลงทุกตัวอักษรที่พิมพ์เพิ่ม · ใช้อยู่แล้วทั้ง 4 หน้าฝั่งช่าง · กรองใน JS ทั้งหมด ไม่พึ่ง `contains` ของ Prisma

**ช่องว่างจริงอยู่ที่ฟอร์ม ไม่ใช่ที่ลิสต์** — ฟอร์มใช้ `NativeSelect` ดรอปดาวน์เปล่าๆ ทั้งยี่ห้อ รุ่น และห้อง พอสาระบบโตขึ้นและช่างใช้บนมือถือ การเลื่อนหาในดรอปดาวน์ยาวๆ คือจุดที่ช้าจริง

**จะสร้าง `src/components/shared/searchable-select.tsx` ตัวเดียว** — พิมพ์แล้วกรองทันทีด้วยตรรกะเดียวกับ `filterJobs` (ย้ายฟังก์ชันเทียบข้อความออกมาเป็น helper กลาง ไม่ก๊อป) · รองรับคีย์บอร์ดและใช้ `useEscapeToClose` ที่มีอยู่แล้ว · ปุ่มกดง่ายด้วยมือเดียวตาม `design.md` · ไอคอน `lucide-react` เท่านั้น

**ถ้าพิมพ์แล้วไม่เจอ ต้องมีปุ่ม "เพิ่มสิ่งที่พิมพ์เป็นรุ่นใหม่" ท้ายรายการ** — จุดนี้คือที่ที่งานทั้งสองข้อมาบรรจบกัน ช่างไม่ต้องออกจากฟอร์มเลย

ใช้แทน `NativeSelect` ที่ ยี่ห้อ · รุ่น · ห้อง ทั้งฝั่งช่างและแอดมิน (ฟอร์มเดียวกัน แอดมินได้ประโยชน์ฟรี)

## ความเสี่ยงที่เหลือ

**สาระบบจะรกเร็วขึ้น** — ช่างหลายคนพิมพ์ชื่อรุ่นเดียวกันคนละแบบ (Inverter 12000 / inverter 12000 / INV 12000) · unique index กันได้แค่ตัวที่ตรงเป๊ะ · ทางลด: `searchable-select` ทำให้เห็นของเดิมก่อนอยู่แล้ว และให้ฝั่ง server เทียบชื่อแบบ case-insensitive + trim ก่อนสร้าง แล้วเตือนว่ามีรุ่นคล้ายกันอยู่แล้ว

## ทำบน branch ไหน

**ตัด branch ใหม่จาก `master`** (`feat/tech-catalogue`) ไม่ใช่จาก `feat/postgres` ไม่งั้นฟีเจอร์นี้จะถูกบล็อกอยู่หลังการย้ายฐานข้อมูลที่ยังรอ Aiven อยู่ · **อย่าลืมสลับ `DATABASE_URL` ใน `.env` กลับไป MariaDB ตอน checkout** เพราะ `.env` ไม่ถูก track ใน git จึงไม่เปลี่ยนตาม branch

## การทดสอบเมื่อลงมือ

| ทดสอบ | คาดหวัง |
|---|---|
| ช่างเพิ่มรุ่นใหม่จากโมดัลบันทึกงาน | แถวใน `ac_models` + แถวใน `system_audit_logs` ที่ `user_id` เป็นช่างคนนั้น |
| บันทึกงานต่อทันทีหลังแก้รุ่น | บันทึกครบ ไม่มี deadlock ใน log |
| เพิ่มรุ่นชื่อซ้ำในยี่ห้อเดิม | ข้อความว่ามีอยู่แล้ว ไม่ใช่ error ดิบจาก unique index |
| เพิ่มรุ่นที่อยู่ในถังขยะ | "อยู่ในถังขยะ กรุณาให้แอดมินกู้คืน" (ตรรกะเดิมมีอยู่แล้ว) |
| **ช่างยิง `deleteAcModelAction` ตรงๆ ข้าม UI** | ต้อง throw Unauthorized — พิสูจน์ว่าด่านใหม่ไม่เปิดกว้างเกิน |
| ช่างสองคนลงทะเบียนห้องเดียวกันพร้อมกัน | ได้ `-01` และ `-02` ไม่ใช่ error |
| แอดมินยังทำทุกอย่างได้เหมือนเดิม | ไม่มีอะไร regress |

`tsc --noEmit` 0 error · eslint ไม่มีปัญหาใหม่ · **คืนค่าข้อมูลทดสอบทุกครั้ง**

---

# 🖥️ ตั้งเครื่อง dev ใหม่ + คืนฐานข้อมูลให้ตรงกับเครื่องเดิม (7 ก.ย. 2026, DoubleKill)

เจ้าของโปรเจกต์ย้ายมาทำงานบนเครื่องใหม่ที่ `C:\Project\ac-maintenance` · บันทึกไว้เพราะขั้นตอนนี้มีกับดักที่เสียเวลาไปจริง

## กับดักที่เจอ เรียงตามเวลาที่เสีย

**1. `prisma/seed.ts` รันแล้วค้างไม่ยอมจบ** — ไม่ใช่ error ข้อมูลลงครบแล้ว แต่ process ไม่ exit เพราะท้ายไฟล์มีแค่ `.catch()` ไม่มี `$disconnect()` ส่วน `src/lib/prisma.ts` เปิด pool ไว้ `connectionLimit: 20` connection จึงค้างคา event loop · **ถ้าจะรัน seed อีกให้เติม** `.then(() => prisma.$disconnect())` **ก่อน** ไม่งั้นต้องนั่งรอจนหมดเวลาแล้วไป kill เอง

**2. `npx tsx <ไฟล์>.ts` ที่มี top-level await จะพัง** — `package.json` ไม่มี `"type": "module"` tsx จึงคอมไพล์เป็น CJS แล้วฟ้อง `Top-level await is currently not supported with the "cjs" output format` · ต้องห่อใน `async function main()` แบบที่ `seed.ts` ทำอยู่แล้ว

**3. ไฟล์ `.env` ถูกก็อปมาในชื่อ `env` (ไม่มีจุดนำหน้า)** — Next.js กับ dotenv ไม่โหลดให้ และที่อันตรายกว่าคือ pattern `.env*` ใน `.gitignore` **ไม่ครอบชื่อ `env`** มันจึงโผล่เป็นไฟล์ untracked พร้อมถูก commit ขึ้น GitHub ทั้ง `DATABASE_URL` และ `AUTH_SECRET` · rename เป็น `.env` แล้ว ตรวจด้วย `git check-ignore -v .env` ว่าโดน ignore จริง

## ฐานข้อมูล — อย่า seed ถ้าอยากได้ข้อมูลเดียวกับเครื่องเดิม

ตอนแรกใช้ `seed.ts` สร้างข้อมูลขึ้นมาใหม่ ได้ users 2 คน (`admin@pkru.ac.th` / `tech@pkru.ac.th`) ซึ่ง **คนละชุดกับที่ HANDOFF ทั้งไฟล์อ้างอิงอยู่** (users 5 / phones 7, `admin@hansen-jacobs-university.test` / `houston16@example.net`) · ทดสอบตามเคสในเอกสารแล้วจะหาบัญชีไม่เจอ และตัวเลขที่ใช้ยืนยันว่าคืนค่าข้อมูลทดสอบครบก็เทียบกันไม่ได้

**ทางที่ถูกคือ mysqldump จากเครื่องเดิมมา restore** ไม่ใช่ seed ใหม่:

```bash
# บนเครื่องต้นทาง
"C:\xampp\mysql\bin\mysqldump.exe" -h 127.0.0.1 -P 3306 -u root --default-character-set=utf8mb4 --single-transaction ac_maintenance > ac_maintenance_YYYYMMDD.sql

# บนเครื่องปลายทาง — ดัมป์มี DROP TABLE IF EXISTS ครบทุกตาราง จึง restore ทับได้เลย ไม่ต้อง DROP DATABASE
"C:\xampp\mysql\bin\mysql.exe" -h 127.0.0.1 -P 3306 -u root --default-character-set=utf8mb4 ac_maintenance < ac_maintenance_YYYYMMDD.sql
```

ผลลัพธ์ที่ได้ ตรงกับเครื่องเดิมทุกตัว: **users 5 · phones 7 · buildings 5 · rooms 32 · air_conditioners 73 · work_orders 61 · maintenance_logs 230 · system_settings 1** · `prisma migrate status` ขึ้น *Database schema is up to date* โดยไม่ต้องรัน `migrate deploy` เพิ่ม เพราะ `_prisma_migrations` ติดมากับดัมป์ครบทั้ง 12 ใบ

> ดัมป์เก่า `db-backups/ac_maintenance_before_F1_20260811.sql` **ใช้แทนไม่ได้** — เป็นสภาพก่อนถอด multi-tenancy มี 19 users กับตาราง `universities` และรู้จัก migration แค่ 4 ใบแรก

## `.next` ที่ก็อปข้ามเครื่องมาต้องลบทิ้ง

แคช 272 MB จากเครื่องเดิมถูกก็อปติดมาด้วย · ถ้าไม่ลบจะเจออาการที่เขียนไว้แล้วในหัวข้อ *"หลัง `git pull` ต้องทำ 3 อย่าง"* คือหน้า `/admin` ฟ้อง *"ไม่สามารถเชื่อมต่อฐานข้อมูล ... พอร์ต 3307"* ทั้งที่ไม่เกี่ยวกับ MySQL เลย · ปิด dev server ก่อนแล้วค่อย `Remove-Item -Recurse -Force .next`

## สถานะเครื่องนี้ ณ ตอนจบ

working tree สะอาด · `tsc --noEmit` ผ่าน 0 error · mysqld เปิดอยู่ที่ 3306 (spawn ผ่าน WMI) · dev server **ยังไม่ได้เปิด** · `.next` ว่าง build แรกจะช้ารอบเดียว · `.env` มีแค่ `DATABASE_URL` กับ `AUTH_SECRET` **ยังไม่มี `AUTH_URL` และ SMTP** ตามที่พักไว้

**บั๊ก fallback port 3307 ยังอยู่เหมือนเดิม** ทั้ง `src/lib/prisma.ts` และข้อความ error ที่ `src/lib/tech/dashboard.ts:111` — แผน PostgreSQL ขั้นที่ 3 แก้ให้อยู่แล้ว

---

# 📄 `PRODUCT.md` — ล้างเนื้อหา multi-tenant ที่ตกยุค (7 ก.ย. 2026, DoubleKill)

ไฟล์นี้ไม่ได้ถูกแตะตั้งแต่ก่อนถอด multi-tenancy (`20260811093000_remove_multi_tenancy`) จึงยังบรรยายระบบที่ไม่มีอยู่จริงแล้ว · ใครอ่านเพื่อทำความเข้าใจขอบเขตผลิตภัณฑ์จะเข้าใจผิดทั้งหมด

| เดิม | แก้เป็น |
|---|---|
| มี 3 บทบาท รวม **Super Admin** จัดการ multi-tenant | เหลือ 2 บทบาทตาม `enum UserRole` จริง — `org_admin`, `technician` |
| RBAC ระบุเส้นทาง `/super-admin/*` | ไม่มีโฟลเดอร์นี้ใน `src/app/` แล้ว เหลือ `/admin/*` กับ `/tech/*` และระบุ route guard ที่ `src/proxy.ts` |
| หัวข้อ **Multi-Tenant Boundary** แยกข้อมูลด้วย `university_id` | เปลี่ยนเป็น **Single-Tenant** พร้อมหมายเหตุว่าทำไม `org_admin` ยังใช้ชื่อเดิม (ตรงกับคอมเมนต์ใน `schema.prisma`) |
| Asset Hierarchy = `University` ➔ `Building` ➔ `Room` ➔ `AirConditioner` | `Building` ➔ `Floor` ➔ `Room` ➔ `AirConditioner` ตามโครงสร้าง 4 ระดับที่ใช้จริงทั้งระบบ |
| Product Principle ข้อ 2 = Strict Multi-Tenant Boundary | เปลี่ยนเป็น **QR Code as the Entry Point** ซึ่งเป็นแกนจริงของผลิตภัณฑ์ |
| ลิงก์เอกสารดีไซน์ชี้ไป `file:///c:/Users/LENOVO/OneDrive%20-%20.../DESIGN.md` | ลิงก์สัมพัทธ์ `design.md` (ชื่อที่ git track จริงคือตัวพิมพ์เล็ก) + เพิ่มลิงก์ `HANDOFF.md` |

**เพิ่มใหม่ 2 บรรทัด** ที่ระบบทำได้จริงแต่เอกสารไม่เคยพูดถึง: กติกาการสมัคร (บังคับครบทุกช่องรวมรูป · `.ac.th`/`.edu`/`.edu.th` ได้ `active` ทันที นอกนั้น `pending` — ตรวจกับ `register/actions.ts:58,117` แล้ว) และกฎห้ามใช้ emoji ใน UI ที่ `AGENTS.md` บังคับอยู่

**เอาคำว่า "แบบ Real-time" ออกจาก Work Order Dispatch** เพราะระบบเป็น Server Components + `revalidatePath` ไม่ได้ push อะไรแบบเรียลไทม์

diff ออกมา **+12 −10** เพราะเขียนกลับเป็น CRLF ตามของเดิม

---

# 🧹 เก็บกวาด repo — README กับ python bytecode (7 ก.ย. 2026, DoubleKill)

เจ้าของโปรเจกต์สังเกตว่าหน้า GitHub ยังขึ้นข้อความ *Rebuild entire application from Laravel/PHP/MySQL to Next.js* อยู่หลายไฟล์ · **ตรวจแล้วไม่มีโค้ด Laravel เหลืออยู่เลย** (ไฟล์ `.php` / `composer.json` / `artisan` = 0 จาก 328 ไฟล์ที่ track) · ข้อความนั้นคือ *commit ล่าสุดที่แตะไฟล์นั้น* ไม่ใช่เนื้อหาไฟล์ · ไฟล์อย่าง `postcss.config.mjs` ขึ้นแบบนั้นเพราะไม่มีใครต้องแก้มันอีกเลย ซึ่งปกติ

**เลือกไม่ rewrite history** เพราะ commit `5b97552` มี 204 commit ตามหลัง ถ้าแก้ข้อความ SHA จะเปลี่ยนใหม่หมด แล้ว **HANDOFF.md อ้าง SHA ไว้ 22 ตัว** จะตายทั้งหมด อีกทั้ง repo นี้มี 2 คนเขียน (chokun555phaerngam 105 / Esther03u 103) การ force push จะทำให้ clone ของอีกฝ่ายแตก

## `README.md` — เขียนใหม่ทั้งไฟล์

ของเดิมเป็น boilerplate ของ `create-next-app` เป๊ะๆ ไม่มีคำว่า ac-maintenance สักคำ ชี้ให้แก้ `app/page.tsx` ทั้งที่โปรเจกต์นี้ใช้ `src/app/` และโฆษณา Vercel · ตอนนี้มีบทบาทผู้ใช้ 2 แบบ, stack จริงพร้อมเวอร์ชัน, ขั้นตอนติดตั้ง, คำสั่งที่ใช้บ่อย, โครงสร้างโฟลเดอร์ และลิงก์ไปเอกสารอื่น

เขียนคำเตือนไว้ด้วยว่า `prisma/seed.ts` สั่ง `deleteMany()` ล้างข้อมูลก่อนเสมอ ห้ามรันใส่ฐานข้อมูลจริง · และ seed ต้องเรียกด้วย `npx tsx prisma/seed.ts` เพราะ `prisma.config.ts` ยังไม่มี key `seed`

## `.pyc` 2 ไฟล์ที่ถูก commit ขึ้นไป

`.agents/skills/ui-ux-pro-max/scripts/__pycache__/` มี bytecode ติดขึ้น git ไปด้วย และ `.gitignore` ไม่มี `__pycache__` เลย · เอาออกจาก index แล้ว (ไฟล์บนดิสก์ยังอยู่ ไม่กระทบ skill) พร้อมเพิ่ม `__pycache__/` กับ `*.pyc` ลง `.gitignore`

---

# 🐘 แผนย้ายฐานข้อมูลไป Aiven PostgreSQL — ยังไม่ได้ลงมือ (เขียน 6 ก.ย. 2026, DoubleKill)

> **สถานะ: แผน ไม่ใช่งานที่ทำแล้ว** · เจ้าของโปรเจกต์ตัดสินใจไป PostgreSQL หลังเทียบกับ Aiven MySQL แล้ว โดยมีเงื่อนไขสำคัญข้อเดียวที่ทำให้ทางนี้เป็นไปได้: **ข้อมูลปัจจุบันจะถูกล้างทิ้งทั้งหมดอยู่แล้ว** เพราะจะเปลี่ยนไปใช้ข้อมูลจริง · ถ้าเงื่อนไขนี้เปลี่ยน (ต้องเก็บข้อมูลเดิม) แผนนี้ใช้ไม่ได้ ต้องคุยกันใหม่

## ทำไมถึงทำได้ — สิ่งที่ตรวจโค้ดแล้วยืนยันว่า *ไม่* เป็นอุปสรรค

ตอนแรกผมประเมินว่าเป็นการ "เขียนชั้นฐานข้อมูลใหม่" ซึ่ง**ผิด** พอไล่ตรวจจริงโปรเจกต์นี้พกพาได้ดีกว่านั้นมาก:

| กลัวว่า | ตรวจแล้ว |
|---|---|
| SQL ดิบผูกกับ MySQL | **ไม่มี `$queryRaw` / `$executeRaw` ใน `src/` เลยสักจุด** — SQL ดิบอยู่แต่ในไฟล์ migration ซึ่งจะถูก generate ใหม่ทั้งชุดอยู่แล้ว |
| ตรรกะเรื่องเวลาต้องรื้อ | **ไม่ต้อง** — `businessDateToday()` / `businessDateFrom()` / `addMaintenanceInterval()` ใน `src/lib/maintenance.ts` คำนวณด้วย JS ล้วน ปักที่ UTC midnight เอง ไม่เรียกฟังก์ชันของ engine · Prisma เขียน UTC ลง `timestamp(0)` และ `date` บน PG ได้ผลเหมือน MySQL ทุกประการ |
| collation ต่างกันแล้วค้นหาเพี้ยน | **ไม่มีผล** — ไม่มี `contains:` / `startsWith:` / `mode: "insensitive"` ใน Prisma query เลย การกรองทั้งหมดทำใน JS หลังดึงข้อมูล |
| PG case-sensitive แล้วอีเมลซ้ำ/ล็อกอินพัง | **ไม่พัง** — `register/actions.ts:64` และ `auth.ts:44` ทำ `.toLowerCase().trim()` ก่อน query ทั้งคู่ |
| seed ต้องเขียนใหม่ | **ไม่ต้อง** — `prisma/seed.ts` (260 บรรทัด) ใช้ Prisma client ล้วน ไม่มี SQL ดิบ |

ที่เหลือคือ**งานกลไกล้วน** ประเมิน **~1 วัน** รวมทดสอบ (ไม่รวมเวลาเตรียมข้อมูลจริง)

---

## ขั้นที่ 0 — เตรียมก่อนแตะโค้ด

1. **สร้าง branch** `feat/postgres` — master ยังต่อ MariaDB ได้จนกว่า PG จะผ่านการทดสอบทั้งหมด · rollback = ไม่ merge เท่านั้น
2. **ลง PostgreSQL บนเครื่อง dev ด้วย** (แนะนำ PostgreSQL 16 ผ่าน EDB installer สำหรับ Windows) — **ข้อนี้ไม่ใช่ทางเลือก** ถ้า prod เป็น PG แต่เครื่อง dev ยังเป็น MariaDB จะกลายเป็นทดสอบบน engine หนึ่งแล้วขึ้นจริงอีก engine หนึ่ง ซึ่งแย่กว่าเลือกอันไหนก็ได้ · สร้าง database `ac_maintenance` และ user ให้เรียบร้อย
3. **สร้าง service บน Aiven** เลือก PostgreSQL · plan เล็กพอสำหรับ 12 ตาราง · จดไว้ 3 อย่าง: **Service URI** (รูปแบบ `postgres://avnadmin:…@HOST:PORT/defaultdb?sslmode=require` — port ของ Aiven **ไม่ใช่ 5432**), **CA certificate** (`ca.pem` ดาวน์โหลดจากหน้า service), และ **`max_connections`** ของ plan ที่เลือก (สำคัญ ดูขั้นที่ 3)

## ขั้นที่ 1 — `prisma/schema.prisma` (34 บรรทัด ทั้งหมดเป็น native type ที่ PG ไม่มี)

เปลี่ยน `datasource` ก่อน:

```prisma
datasource db {
  provider = "postgresql"
}
```

แล้วแก้ annotation ตามตารางนี้ — **ตรรกะไม่เปลี่ยนสักบรรทัด** เปลี่ยนแค่ native type:

| เดิม | เปลี่ยนเป็น | จำนวน | บรรทัด |
|---|---|---|---|
| `@db.UnsignedBigInt` | **ลบ attribute ทิ้ง** (`BigInt` → `bigint` เอง) | 27 | 26, 41, 42, 58, 97, 98, 114, 131, 132, 151–154, 184–187, 220, 221, 234, 235, 237, 273, 274, 277, 290, 291 |
| `@db.UnsignedInt` | **ลบ attribute ทิ้ง** (`Int` → `integer`) | 4 | 134, 159, 293, 315 |
| `@db.UnsignedSmallInt` | `@db.SmallInt` | 2 | 44 (`floor`), 292 (`frequencyMonths`) |
| `@db.DateTime(0)` | `@db.Timestamp(0)` | 1 | 199 (`MaintenanceLog.performedAt`) |

**ไม่ต้องแตะ** (PG รองรับตรงตัว): `@db.Timestamp(0)` ×28, `@db.VarChar(n)` ×26, `@db.Text` ×4, `@db.Date` ×3, `@db.Char(36)` ×1, `Json` ×3 (จะกลายเป็น `jsonb`), enum ทั้ง 6 ตัวพร้อม `@@map` (PG สร้างเป็น type จริงชื่อตาม map), ชื่อ index/FK ที่ระบุด้วย `map:` ทั้งหมด

**คอมเมนต์ที่ต้องแก้ตาม:** บรรทัด ~244–250 (`WorkOrder.createdAt`) พูดถึง `CURRENT_TIMESTAMP` ของ MySQL และ `UTC_TIMESTAMP()` — กฎยังเหมือนเดิม (ห้ามพึ่ง default ของ DB, Prisma เป็นคนใส่ค่า UTC) แต่ตัวอย่างต้องเปลี่ยนเป็น `now() AT TIME ZONE 'UTC'` ของ PG

## ขั้นที่ 2 — migration history: ทิ้งทั้งชุด สร้างใหม่ใบเดียว

13 ใบเดิมมี DDL เฉพาะ MySQL อยู่ 80 จุดใน 6 ไฟล์ (`AUTO_INCREMENT`, `BIGINT UNSIGNED`, `utf8mb4_unicode_ci`, `MODIFY COLUMN`, `UTC_TIMESTAMP()`) แปลงไม่คุ้ม และ**ไม่จำเป็นเพราะไม่มีข้อมูลให้ migrate**

```bash
# ชี้ DATABASE_URL ไปที่ PG บนเครื่องก่อน (ขั้นที่ 3)
Remove-Item -Recurse -Force prisma\migrations
npx prisma migrate dev --name init
npx prisma generate
```

`migration_lock.toml` จะถูกสร้างใหม่เป็น `provider = "postgresql"` เอง · **ประวัติการแก้สคีมาตั้งแต่ย้ายจาก Laravel ไม่ได้หายไปไหน** — อยู่ใน git history ของ `prisma/migrations/` เดิม และเหตุผลทุกข้ออยู่ในคอมเมนต์ของ `schema.prisma` ซึ่งยังอยู่ครบ

## ขั้นที่ 3 — `src/lib/prisma.ts` เขียนใหม่ทั้งไฟล์ (~30 บรรทัด)

```bash
npm uninstall @prisma/adapter-mariadb
npm install @prisma/adapter-pg@7.9.0 pg
npm install -D @types/pg
```

**ปักเวอร์ชัน adapter ให้ตรงกับ `prisma` / `@prisma/client` ที่ใช้อยู่ (7.9.0)** — ตอนเขียนแผน npm ล่าสุดคือ 7.10.0 ซึ่งถ้าปล่อยให้ติดตั้งเองจะได้ adapter ใหม่กว่า client · ถ้าจะอัปเกรดให้อัปทั้งสามตัวพร้อมกัน

```ts
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  // ตั้งใจให้ล้มดังๆ: ของเดิม fallback ไป 127.0.0.1:3307 เงียบๆ ซึ่งบน
  // production แปลว่า env หลุดแล้วแอปยังขึ้นได้แต่ต่อผิดที่
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  // Aiven บังคับ TLS · CA ส่งผ่าน env เป็น PEM ไม่ commit ไฟล์ cert ลง repo
  const ca = process.env.DATABASE_CA_CERT;

  const adapter = new PrismaPg({
    connectionString,
    ssl: ca ? { ca, rejectUnauthorized: true } : undefined,
    // ดูหมายเหตุเรื่อง connection ด้านล่าง — ห้ามยกเลข 20 ของ MariaDB มาใช้
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
  });

  return new PrismaClient({ adapter });
}
```

ส่วน `globalForPrisma` (กัน hot-reload สร้าง client ซ้ำ) เก็บไว้เหมือนเดิม

**⚠️ เรื่อง connection — จุดที่กัดตอนขึ้นจริงบ่อยที่สุด:** ของเดิมตั้ง `connectionLimit: 20` ซึ่งบน MySQL ไม่มีใครสนใจ แต่ connection ของ PostgreSQL หนักกว่ามาก และ **plan เล็กของ Aiven มี `max_connections` ต่ำ** — Next.js instance เดียวเปิด 20 ก็อาจกินไปครึ่งหนึ่งของ plan แล้ว · เริ่มที่ **5** · ถ้าไม่พอค่อยเปิด **connection pooler (PgBouncer) ที่ Aiven มีให้ในตัว** ซึ่งจะได้ port แยกอีกอัน — แต่ต่อตรงก่อนเสมอ pooler เป็นแผนสอง

**`.env` ที่ต้องมี:**
```
DATABASE_URL=postgres://avnadmin:…@HOST:PORT/ac_maintenance?sslmode=require
DATABASE_CA_CERT="-----BEGIN CERTIFICATE-----
…
-----END CERTIFICATE-----"
DATABASE_POOL_MAX=5
```
(เครื่อง dev: `postgresql://USER:PASS@127.0.0.1:5432/ac_maintenance` ไม่ต้องมี CA)

## ขั้นที่ 4 — `src/lib/db-retry.ts` (2 บรรทัด)

`isDeadlock()` ดักด้วย `errno === 1213` / `ER_LOCK_DEADLOCK` / ข้อความ `"Deadlock found"` ซึ่งเป็นของ MySQL ทั้งหมด · PostgreSQL ใช้ **SQLSTATE `40P01`** (`deadlock_detected`) และ driver `pg` ส่งมาใน `error.code` · เพิ่มก่อนบรรทัด "Last resort":

```ts
  // pg driver: SQLSTATE ตรงๆ · 40001 (serialization_failure) ใส่ไว้ด้วยเพราะ
  // retry แบบเดียวกันแก้ได้ แม้ที่ READ COMMITTED จะแทบไม่เจอ
  if (e.code === "40P01" || e.code === "40001") return true;
```

ของ MySQL เดิม**ลบทิ้งได้** หลัง merge — เหลือไว้ไม่ผิดแต่จะทำให้คนอ่านคิดว่ายังรองรับสอง engine

## ขั้นที่ 5 — เก็บกวาดที่อ้างถึง MySQL

| ไฟล์ | ทำอะไร |
|---|---|
| `prisma/clear-legacy-passwords.ts` | import `PrismaMariaDb` ตรงๆ — **ลบไฟล์ทิ้ง** เป็นสคริปต์ครั้งเดียวตอนย้ายจาก Laravel ไม่มีเหตุให้รันอีก (ยิ่งข้อมูลใหม่หมดยิ่งไม่ต้อง) |
| `src/lib/tech/dashboard.ts:111` | ข้อความ `dbError` บอก "MariaDB/MySQL … พอร์ต 3307" — **port ผิดอยู่แล้วตั้งแต่ตอนนี้** (`.env` ใช้ 3306) แก้เป็นข้อความกลางๆ ไม่ระบุ engine/port |
| `src/app/admin/error.tsx:35` | "เซิร์ฟเวอร์ MySQL/MariaDB" → ข้อความกลางๆ เช่นกัน |
| `.agents/AGENTS.md:10` | เปลี่ยน `@prisma/adapter-mariadb` → `@prisma/adapter-pg` |
| `PRODUCT.md:26` | เปลี่ยน stack line |
| `HANDOFF.md` | หัวข้อ environment ทั้งหมดที่พูดถึง XAMPP / WMI spawn mysqld / `mysql.exe -h 127.0.0.1 -P 3306` / deadlock ของ MariaDB 10.4.32 — **ใส่ป้าย "หมดอายุ — ย้ายไป PG แล้ว"** ไม่ต้องลบ เก็บไว้เป็นประวัติ แล้วเขียนวิธี start/stop PG บนเครื่อง + วิธีใช้ `psql` แทน |

## ขั้นที่ 6 — โหลดข้อมูลจริง: กฎที่ต่างจาก MySQL

- **อีเมลต้อง lowercase ก่อน insert** — `users_email_unique` บน PG แยกตัวพิมพ์ใหญ่-เล็ก (`A@x.com` กับ `a@x.com` เป็นคนละคน) โค้ดล็อกอิน lowercase ให้ก่อน query อยู่แล้ว ดังนั้น**ถ้าข้อมูลที่โหลดเข้าไปมีตัวพิมพ์ใหญ่ คนนั้นจะล็อกอินไม่ได้เลย**
- ห้องทุกห้องต้องมี `floor` (บังคับตั้งแต่ 5 ก.ย.) ไม่งั้นจะตกไปกอง "ไม่ระบุชั้น"
- ใบงานทุกใบต้องมี `type` (repair/cleaning) — คอลัมน์ไม่มี default ตั้งใจ
- ⚠️ **การเรียงชื่อภาษาไทยที่ระดับ DB อาจต่างจาก MariaDB** — มี `orderBy: { name: "asc" }` อยู่ **11 จุด** ใน `src/lib/**` (อาคาร ห้อง ยี่ห้อ รุ่น) · seed ใช้ชื่ออังกฤษเลยไม่เคยเห็นปัญหา แต่ข้อมูลจริงเป็นไทย · collation default ของ Aiven คือ `en_US.UTF-8` ซึ่งเรียงไทยตาม codepoint (คำที่ขึ้นด้วยสระหน้า เ แ โ ใ ไ จะไปกองผิดที่) · **หลังโหลดข้อมูลจริงให้เปิดดูลิสต์อาคาร/ห้อง/ยี่ห้อว่าเรียงถูกไหม** ถ้าผิด แก้ได้ 2 ทาง: (ก) สร้าง database ใหม่ด้วย ICU collation `th-TH-x-icu` ตั้งแต่ต้น (ต้องทำก่อน migrate เพราะเปลี่ยนทีหลังไม่ได้) หรือ (ข) เรียงใน JS ด้วย `localeCompare(…, "th")` ซึ่งลิสต์แบบกลุ่มทั้ง 8 หน้าทำอยู่แล้วใน `building-groups.tsx` — แนะนำ (ก) ถ้ายังไม่ได้สร้าง DB

## ขั้นที่ 7 — ทดสอบก่อน merge (ทำบนเครื่อง dev ที่เป็น PG แล้ว)

รันแอปจริง ไม่ใช่แค่ `tsc` — ไล่ตามลำดับที่เคยทดสอบไว้ใน HANDOFF:

- [ ] `npx tsx prisma/seed.ts` ผ่าน · ยอด 73 เครื่อง / 5 อาคาร / 32 ห้อง ขึ้นถูก
- [ ] ล็อกอินทั้ง 2 role ผ่านปุ่ม demo
- [ ] **3 action ที่เคยมีปัญหาตอนรื้อเฟส A**: บันทึกผลงาน (มีรูป 2 ใบ → ทดสอบ `sharp` + `saveUpload`), สแกน QR, สร้างใบงาน
- [ ] รับงานหลายงานพร้อมกัน (bulk claim) — เส้นทางที่ `withDeadlockRetry` คุมอยู่
- [ ] แก้โปรไฟล์: ชื่อ + เบอร์ + รูป — ตรวจ `user_phones` ว่าเบอร์รองไม่หาย
- [ ] **เรื่องเวลา** (จุดที่เคยพลาดบ่อยที่สุด): ตั้งรอบล้าง → `nextDueDate` โชว์วันเดียวกับที่ตั้ง (ไม่เลื่อน 1 วัน) · `performedAt` / `claimedAt` โชว์เวลาไทยถูก · ปฏิทินดึงช่วงเดือนถูก (`nextDueDate gte/lte`)
- [ ] `images` (`Json @default("[]")`) และ `old_values`/`new_values` ใน audit log อ่าน-เขียนได้ (ตอนนี้เป็น `jsonb` แล้ว key อาจเรียงใหม่ ซึ่งไม่กระทบ)
- [ ] ถังขยะยี่ห้อ/รุ่น: ลบ → กู้คืน → ลบถาวร (ทดสอบ `deletedAt` + unique constraint ที่ยังนับตัวที่อยู่ในถัง)
- [ ] `npx tsc --noEmit` และ `npm run build` (หยุด dev server ก่อน build ตามกฎเดิม)

## ขั้นที่ 8 — ขึ้น production (ทำพร้อมกัน ไม่แยก)

ตอนตั้ง `.env` บน server ต้องใส่ **`AUTH_URL` และ SMTP จริง** ที่ค้างอยู่ ("ยกเว้นข้อ 4 ยังไม่ต้อง" ตั้งแต่ 5 ก.ย.) ไปในรอบเดียวกัน — ไม่มีเหตุผลจะตั้ง env สองรอบ

## สิ่งที่ *ไม่* อยู่ในแผนนี้โดยตั้งใจ

- **ไม่ย้ายข้อมูลเดิม** — เงื่อนไขตั้งต้นคือล้างทิ้ง ถ้าเปลี่ยนใจต้องวางแผนใหม่ (การแปลง `BIGINT UNSIGNED` และ enum ข้าม engine ไม่ใช่เรื่องเล็ก)
- **ไม่แตะ `next-auth`** — ใช้ JWT ไม่มีตาราง session ในฐานข้อมูล
- **ไม่เปลี่ยน `Timestamp(0)` เป็น `timestamptz`** — จะเป็นการเปลี่ยนความหมายของทุกคอลัมน์เวลาพร้อมกันตอนที่กำลังเปลี่ยน engine ทำทีละอย่าง ค่อยพิจารณาทีหลังถ้ามีเหตุ

---

## ✅ Backlog รอบ 27 ส.ค. — ปิดครบทั้ง backend และ UI แล้ว (1 ก.ย. 2026)

เจ้าของโปรเจกต์ไล่ทดสอบระบบเองผ่านเบราว์เซอร์อีกรอบหลัง UI ปิดครบเมื่อ 27 ส.ค. แล้วสั่งงานมาเป็นชุด **ตกลงรายละเอียดครบทุกข้อแล้ว** · 28 ส.ค. เจ้าของโปรเจกต์เคาะการตัดสินใจที่ค้างอยู่ทั้ง 4 เรื่อง แล้ว DoubleKill ปิดงาน backend ทั้งหมดในวันเดียวกัน (`85c5c6a`, `97e24bc`) · **1 ก.ย. Esther03u ปิดฝั่ง UI ครบทั้ง 4 ข้อ** (ข้อ 4 เสร็จเฉพาะเฟส 1 ตามที่ตกลงเลื่อนเฟส 2 ไว้ก่อน)

---

# ✅ ถึง Esther03u — ปิดครบทั้ง 4 ข้อแล้ว (อ่านตรงนี้ก่อน)

| ลำดับ | งาน | ขนาด | เคยรอ backend | ตอนนี้ |
|---|---|---|---|---|
| **1** | 🐛 **ระบบสินทรัพย์ว่างเปล่าเมื่อมีคำค้นค้าง** | เล็ก | ไม่เคยรอ | ✅ **แก้แล้ว 1 ก.ย.** |
| **2** | **ปฏิทิน — ชื่ออาคารถูกตัดจนแยกไม่ออก** | เล็ก | รอผลตัดสิน | ✅ **แก้แล้ว 1 ก.ย.** |
| **3** | **แบ่งตามอาคาร 5 หน้า** | ใหญ่สุด | รอ field | ✅ **แก้แล้ว 1 ก.ย.** |
| **4** | ปุ่มลบ/กู้คืน + ถังขยะ ยี่ห้อ-รุ่นแอร์ | กลาง | รอ action | ✅ **แก้แล้ว 1 ก.ย. (เฟส 1)** |

---

# ✅ คำขอฝั่ง Backend — ทำให้แล้วครบ (3 ก.ย. 2026, DoubleKill)

> **ถึง Esther03u: `brandDeleted` / `modelDeleted` พร้อมใช้แล้วครบทั้ง 11 จุด** ตามชื่อ field ที่ขอมาเป๊ะ ลุยฝั่ง UI ได้เลย · รายละเอียดของที่ส่งให้อยู่ในหัวข้อ "📦 ของที่ส่งให้แล้ว รอบ 3 ก.ย." ด้านล่าง · เนื้อหาคำขอเดิมเก็บไว้ทั้งหมดเพื่อให้ตามที่มาได้

## ข้อ 4 เฟส 2 — กระจายสัญลักษณ์ยี่ห้อ/รุ่นที่ถูกลบไปทุกเครื่องที่ใช้อยู่

**สถานะ:** ✅ **backend เสร็จแล้ว 3 ก.ย. (`96990c5`)** — ข้อความด้านล่างนี้คือคำขอเดิมของ Esther03u เมื่อ 1 ก.ย. เก็บไว้ตามเดิม

ตรวจโค้ดแล้ว ทุกจุดที่ต้องแก้เป็นไฟล์ backend ล้วน (`src/lib/**`, `src/app/**/actions.ts`, `src/app/api/**` และ query ตรงใน `src/app/qr/[id]/page.tsx`) ตามกฎที่ตกลงกันไว้ ฝั่ง UI แตะไม่ได้ **จึงขอเป็น backend request แทนที่จะทำเอง**

**เป้าหมาย (ตัดสินไว้แล้วตั้งแต่ 28 ส.ค.):** ทุกเครื่องที่ยังใช้ยี่ห้อ/รุ่นที่ถูกลบ (soft delete) อยู่ ต้องมีสัญลักษณ์บอกให้รู้ ไม่ใช่แค่ตอนอยู่ในหน้า Master Data เท่านั้น

### grep เจอครบตามที่ HANDOFF เดิมบอกไว้ — ยืนยันจุดที่ต้องแก้ทั้งหมด

```
src/lib/admin/assets.ts:423        (getAirConditionerHistory — โมดัลแก้ไข/ประวัติเครื่อง)
src/lib/admin/dashboard.ts:204     (urgentUnits — การ์ด "รอซ่อมด่วน" หน้าภาพรวม + กระดานใบงาน)
src/lib/admin/dashboard.ts:233     (buildings prop — ระบบสินทรัพย์ + จัดการ QR Code)
src/lib/admin/work-order-board.ts:78  (WorkOrderItem — กระดานใบงาน)
src/lib/maintenance.ts:339         (TechnicianAssetUnit — หน้าช่าง "แอร์ทั้งหมด")
src/app/api/admin/maintenance-schedules/route.ts:90  (ปฏิทินซ่อมบำรุง)
src/app/qr/[id]/page.tsx:101       (หน้า QR สแกนสาธารณะ ไม่ต้อง login)
src/app/tech/actions.ts:121        (jobPool — หน้าช่าง "งานทั้งหมด")
src/app/tech/actions.ts:134        (myJobs — หน้าช่าง "งานของฉัน")
src/app/tech/actions.ts:148        (completedJobs — หน้าช่าง "ประวัติ")
src/app/tech/actions.ts:519        (scanQrCodeAction — ผลสแกน QR ในแอป)
```

ทุกจุดใช้แพทเทิร์นเดียวกันหมด (`ac.acBrand?.name || ac.brand || "ไม่ระบุ"` หรือ `??` แทน `||` บางจุด) คืนแค่สตริงชื่อล้วน ไม่มีที่ให้บอกว่ายี่ห้อ/รุ่นนั้นอยู่ในถังขยะหรือเปล่า

### field ที่ขอ — ตั้งชื่อตามแบบที่ `getAcTrashData()` ใช้อยู่แล้ว จะได้ไม่ต้องคิดชื่อใหม่

เพิ่ม 2 field คู่กับทุกจุดที่ resolve ชื่อยี่ห้อ/รุ่นจาก `acBrand`/`acModel`:

```typescript
brandDeleted: boolean   // ac.acBrand?.deletedAt != null
modelDeleted: boolean   // ac.acModel?.deletedAt != null
```

ทั้งสอง field คำนวณจาก `deletedAt` ของ relation ที่ query มาอยู่แล้วในทุกจุด (เพราะต้อง select `acBrand`/`acModel` เพื่อเอา `.name` อยู่แล้ว) แค่เพิ่ม `deletedAt: true` ใน `select` ของ `acBrand`/`acModel` แต่ละจุด แล้ว map ออกมาเป็น boolean — **ไม่ต้อง query เพิ่ม ไม่มี round trip เพิ่ม** เหมือนก้อน A ของงาน 28 ส.ค.

**จุดที่ต้อง unit ไม่มี `acBrand`/`acModel` เลย (ใช้ยี่ห้อ/รุ่นแบบพิมพ์เองตอนลงทะเบียน ไม่ใช่จากรายการหลัก)** — ให้ `brandDeleted`/`modelDeleted` เป็น `false` ไปเลย เพราะไม่มียี่ห้อ/รุ่นในถังขยะให้ตรงกับข้อความอิสระอยู่แล้ว

### ฝั่ง UI จะทำอะไรกับ field นี้ (เผื่อช่วยตัดสินใจตอนออกแบบ shape)

แผนคือไอคอนเตือนเล็กๆ (`AlertTriangle` หรือ `Info`, ใช้โทน `text-warning`) ต่อท้ายชื่อยี่ห้อ/รุ่นตรงจุดที่มันโชว์อยู่แล้ว พร้อม `title` tooltip ทำนอง *"ยี่ห้อนี้ถูกลบออกจากรายการหลักแล้ว (เครื่องนี้ยังใช้งานได้ปกติ)"* — ไม่ใช่ badge ใหญ่ ไม่ใช่สีแดงเตือนภัย เพราะเครื่องยังทำงานปกติทุกอย่าง แค่แจ้งให้รู้เฉยๆ ว่ายี่ห้อ/รุ่นนี้เลิกอยู่ในรายการหลักแล้ว

### ทำไมถึงใหญ่กว่าข้อ 1-4 รวมกัน (ทั้งสองฝั่ง)

- **ฝั่ง backend:** 7 ไฟล์ 11 จุด (มากกว่า field เดี่ยวๆ ของข้อ 3 หลายเท่า)
- **ฝั่ง UI (รอหลัง backend เสร็จ):** ต้องแก้ตรงกับจำนวนไฟล์ใกล้เคียงกัน เพราะทุกจุดที่ backend เพิ่ม field คือจุดที่ UI ต้องเพิ่มไอคอนด้วย — asset-manager.tsx, overview-panel.tsx (การ์ดรอซ่อมด่วน), work-order-board.tsx, assets-panel.tsx (ช่าง), maintenance-calendar.tsx, qr/[id]/page.tsx (หน้า public), job-pool/my-jobs/completed-jobs-panel.tsx (ช่าง)

**ไม่บล็อกใคร** — ตามที่ตกลงไว้ 28 ส.ค. ว่าเลื่อนเฟส 2 ไว้ก่อน เพิ่ม request นี้ไว้เผื่อเป็นคิวถัดไป ไม่ได้เร่งให้ทำตอนนี้

---

# 📦 ของที่ส่งให้แล้ว รอบ 3 ก.ย. — `brandDeleted` / `modelDeleted`

ชื่อ field ตรงตามที่ขอมา และ**ส่งทั้งสองตัวทุกจุด** แม้แต่หน้าที่แสดงแค่ยี่ห้อไม่แสดงรุ่น — เพื่อให้ component กลางตัวเดียวรับได้ทุกหน้าโดยไม่ต้องเช็คว่าจุดไหนมี field อะไร (เหตุผลเดียวกับที่ข้อ 3 จัด shape ให้เหมือนกันหมด)

| ที่ | ใช้ที่หน้า |
|---|---|
| `urgentUnits` (`dashboard.ts`) | การ์ดรอซ่อมด่วน + กระดานใบงาน |
| `buildings[].rooms[].acUnits[]` (`dashboard.ts`) | ระบบสินทรัพย์ + จัดการ QR Code |
| `toWorkOrderBoardRow()` (`work-order-board.ts`) | กระดานใบงาน ทุกหน้า |
| `getAirConditionerHistory()` (`assets.ts`) | โมดัลประวัติ/แก้ไขเครื่อง |
| `assetList` (`maintenance.ts`) | หน้าช่าง "แอร์ทั้งหมด" |
| `jobPool` / `myJobs` / `completedJobs` (`tech/actions.ts`) | หน้าช่าง 3 แท็บ |
| `scanQrCodeAction()` (`tech/actions.ts`) | ผลสแกน QR ในแอป |
| `/api/admin/maintenance-schedules` | ปฏิทินซ่อมบำรุง (ทั้ง admin และช่าง) |

## ⚠️ `src/app/qr/[id]/page.tsx` ต่างจาก 10 จุดที่เหลือ — ต้องเรียก helper เอง

หน้านี้ query Prisma ตรงในไฟล์ ไม่ได้ผ่าน mapper ใน `src/lib` จึง**ไม่มี shape ให้ยัด field เข้าไป** — DoubleKill แตะเฉพาะ `select` ให้ดึง `deletedAt` มาด้วยแล้ว ไม่ได้แตะ JSX เลย (เป็นเขต UI)

ตอนเขียนไอคอน ให้เรียก helper ตัวเดียวกับที่อีก 10 จุดใช้ อย่าเช็ค `deletedAt` เองในไฟล์:

```tsx
import { catalogueFlags } from "@/lib/catalogue-status";

const { brandDeleted, modelDeleted } = catalogueFlags(ac);
```

## 🔴 ถ้าจะเพิ่มจุดที่ 12 ในอนาคต — อย่าเขียนกฎเอง

`src/lib/catalogue-status.ts` มีทั้ง `catalogueFlags()` และ `catalogueNameSelect` (ชิ้นส่วน select ที่ต้องใช้) อยู่ในไฟล์เดียว **เพราะกับดักของงานนี้คือ select ที่ขอ `name` มาแต่ลืม `deletedAt`** — flag จะกลายเป็น `false` เงียบๆ ซึ่งหน้าตาเหมือน "ไม่มีอะไรถูกลบ" เป๊ะ ไม่มีอะไรฟ้องเลยทั้ง tsc และตอนรัน

**เครื่องที่พิมพ์ยี่ห้อ/รุ่นเองตอนลงทะเบียน** (ไม่ได้เลือกจากรายการหลัก) คืน `false` ทั้งคู่ ตามที่ขอมา — ข้อความอิสระไม่มีวันถูกลบจากรายการหลักได้

---

# ✅ ตรวจงาน backend ที่ Esther03u แก้มา (3 ก.ย. 2026, DoubleKill)

รอบ 1–2 ก.ย. มีการแก้ไฟล์ฝั่ง backend มาด้วย (`prisma/schema.prisma`, migration, `work-order-board.ts`, `work-orders.ts`, `assets.ts`, `settings.ts`) DoubleKill ไล่ตรวจให้ครบแล้ว

**ผ่าน:** ฟิลเตอร์สถานะ/อาคารของกระดานใบงาน (`workOrderBoardWhere`) นับตรงกับ SQL ดิบทุกกรณี — 4 สถานะ (44/6/6/2) และ 5 อาคาร (20/6/16/9/7) · กันระงับสิทธิ์บัญชีตัวเอง · กันชื่ออาคารเป็นตัวเลขล้วน (อาคารเดิม 5 หลังไม่มีตัวไหนโดนปฏิเสธ)

## 🔴 บั๊กที่เจอ — migration backfill ใส่เวลาผิด timezone 7 ชั่วโมง (แก้แล้ว `ab821a3`)

```sql
-- 20260901160000 — บรรทัดที่เป็นปัญหา
SET created_at = COALESCE(claimed_at, assigned_at, completed_at, updated_at, NOW())
```

**`NOW()` ของ MySQL คืนเวลาเครื่อง (ไทย) แต่คอลัมน์เวลาทุกตัวของระบบนี้เก็บ UTC** — 21 แถวที่ไม่มี timestamp อื่นให้ COALESCE เลยได้เวลาไทยไปนั่งในคอลัมน์ที่แอปอ่านเป็น UTC

อาการที่เห็น: ใบงาน 2 ใบที่สร้างห่างกัน 6 นาที

| ใบงาน | ที่มา | ค่าใน DB | แสดงบนกระดาน |
|---|---|---|---|
| #122 | backfill (`NOW()`) | `12:46:37` | **19:46** ❌ |
| #123 | Prisma สร้างจริง | `05:52:42` | 12:52 ✅ |

**ใบที่เก่ากว่าแสดงเวลาช้ากว่าใบที่ใหม่กว่าเกือบ 7 ชั่วโมง** และถ้า backfill รันหลัง 17:00 ไทย จะเด้งไปเป็นวันถัดไปเลย

**แก้ด้วย migration ตัวใหม่ `20260903140000` ไม่ได้แก้ migration เดิมที่ push ไปแล้ว** — เลื่อนเฉพาะแถวที่มาจาก `NOW()` (แยกออกได้เพราะ backfill เป็น UPDATE ครั้งเดียว ทุกแถวจึงมีวินาทีเดียวกัน ส่วนแถวที่ Prisma เขียนทีหลังมีเวลาของตัวเอง) และอ่านค่า offset จากเซิร์ฟเวอร์แทนการ hardcode 7 ชั่วโมง เครื่องที่ตั้ง timezone อื่นจึงแก้ถูกเหมือนกัน

### 📌 กฎที่ได้จากเรื่องนี้ — ห้ามใช้ `NOW()` ใน migration

ถ้าต้องเขียนเวลาปัจจุบันลงคอลัมน์ timestamp ใน SQL ให้ใช้ **`UTC_TIMESTAMP()`** เสมอ · `NOW()` / `CURRENT_TIMESTAMP` คือเวลาเครื่อง ซึ่งบนเครื่องเราคือ +07 และจะเพี้ยนทันที

`work_orders.created_at` ยังมี `DEFAULT CURRENT_TIMESTAMP` ติดอยู่จาก migration เดิม **จงใจไม่ถอดออก** เพราะไม่มีอะไรไปถึงมัน (`@default(now())` ทำให้ Prisma ส่งค่า UTC มาเองทุกครั้ง และ seed script ก็ผ่าน Prisma) — แต่เขียนคำเตือนไว้ที่ `schema.prisma` แล้วว่ามันไม่เท่ากับ `@default(now())` ถ้าจะ INSERT ด้วย SQL ดิบต้องใส่ `UTC_TIMESTAMP()` เอง

ไล่สแกนคอลัมน์เวลาอื่นทั้งฐานเผื่อมีปัญหาเดียวกันซ่อนอยู่แล้ว — `claimed_at` / `completed_at` / `performed_at` / `users.created_at` / `system_audit_logs.created_at` **สะอาดหมด**

## แก้เพิ่มอีก 2 จุดเล็ก (`7eaa0f9`)

1. **`getWorkOrdersPage` สร้าง where นอก `try`** — `BigInt(buildingId)` throw ถ้าค่าไม่ใช่ตัวเลข ทำให้หลุดออกไปเป็น unhandled rejection แทนที่จะคืน error object เหมือน error อื่นในฟังก์ชันเดียวกัน · UI ส่ง `""` → `undefined` ตลอดจึงยังไม่เคยเจอ แต่มันเป็น server action ย้ายเข้า `try` จบ
2. **กฎ "ชื่ออาคารห้ามเป็นตัวเลขล้วน" ใช้ `/^\d+$/` ซึ่งจับแต่เลขอารบิก** — `"๒๐"` ผ่านฉลุยทั้งที่คนอ่านแล้วเหมือน `"20"` เป๊ะ ซึ่งเป็นเหตุผลทั้งหมดที่มีกฎนี้ · ขยายเป็น `/^[\d๐-๙]+$/`

---

## ✅ อายุ session — ออกจากระบบเมื่อเปิดเบราว์เซอร์ใหม่ และเมื่อเลยเที่ยงคืน (`0a9c94c`)

ของเดิมใช้ค่า default ของ JWT คือ **30 วัน และต่ออายุใหม่ทุกครั้งที่อ่าน session** แปลว่าในทางปฏิบัติ**ไม่มีใครถูก logout เลย** ตอนนี้มี 2 กฎ

### 1. เที่ยงคืน — บังคับจากฝั่ง server (กฎหลักที่เชื่อถือได้)

ตอน login จะประทับ `expiresAt` = เที่ยงคืนถัดไปตามเวลาไทยลงในโทเคน **แล้วไม่ต่ออายุอีกเลย** — ถ้าคำนวณใหม่ทุก request เส้นตายจะถูกเลื่อนออกไปเรื่อยๆ ไม่มีวันถึง ซึ่งเป็นสาเหตุที่ `maxAge` เดิมไม่เคยทำงาน

พอเลยเวลา `jwt()` จะคืน `null` ซึ่ง Auth.js ตีความว่า "จบ session" แล้ว**ล้าง cookie ให้** (ไม่ใช่แค่ซ่อน session จาก response เดียว)

**โทเคนที่ไม่มี `expiresAt` ถือว่าหมดอายุด้วย** — คนที่ค้าง login อยู่ตอนนี้จึงโดนกฎนี้ทันที ไม่ใช่รอดไปจนกว่าจะบังเอิญ login ใหม่ · ผลคือทุกคนต้อง login ใหม่ 1 ครั้งตอน deploy รอบนี้

### 2. เปิดเบราว์เซอร์ใหม่ — ทำที่ฝั่ง client เพราะทำที่ cookie ไม่ได้

ปกติเรื่องนี้แก้ด้วยการทำให้ cookie เป็น session cookie (ไม่มีวันหมดอายุ = ตายพร้อมเบราว์เซอร์) **แต่ Auth.js เขียน `expires` ทับค่าที่เราตั้งเสมอ** (ดู `lib/utils/cookie.js` — มัน merge options ของตัวเองทีหลัง) จึงไม่มีทางขอ cookie แบบนั้นได้

`BrowserSessionGuard` จึงเช็คจากอีกด้าน: `sessionStorage` ถูกเบราว์เซอร์ล้างทิ้งเองเมื่อปิด ถ้าหน้า dashboard โหลดขึ้นมาแล้วไม่มี marker แปลว่าเป็นเบราว์เซอร์รอบใหม่ที่ไม่เคย login → สั่ง `signOut()` · หน้า login ตั้ง marker เดียวกันตอนโหลด เพื่อไม่ให้การ redirect ทันทีหลัง login ถูกเข้าใจผิดว่าเป็น session ค้าง

**ข้อแลกเปลี่ยนที่ยอมรับไว้:** เปิด **tab ใหม่แล้วพิมพ์ URL เอง** จะโดน logout ด้วย เพราะ tab นั้นมี `sessionStorage` ของตัวเองที่ว่างเปล่า · ส่วน refresh / กดลิงก์ / กดปุ่มในเว็บ / duplicate tab **ไม่โดน** เพราะ marker ติดไปด้วย

ถ้าไม่ชอบพฤติกรรม tab ใหม่ ถอดเฉพาะข้อ 2 ได้ โดยเอา `<BrowserSessionGuard />` ออกจาก `app/admin/layout.tsx` และ `app/tech/layout.tsx` — ข้อ 1 ยังทำงานเหมือนเดิม

### ผลทดสอบ

| กรณี | ผล |
|---|---|
| login 12:04 น. | session หมดอายุ `2026-09-05 00:00:00` (อีก 11.92 ชม.) ✅ |
| 23:59:59 | ได้เที่ยงคืนที่กำลังจะถึง ✅ |
| เที่ยงคืนตรงเผง | ได้เที่ยงคืน**ถัดไป** ไม่ใช่หมดอายุทันที ✅ |
| สิ้นเดือน / สิ้นปี | ข้ามเดือน ข้ามปีถูกต้อง ✅ |
| บังคับให้เส้นตายอยู่ในอดีต | login แล้ว **ไม่ได้ session เลย** และเข้า `/tech/assets` เด้งไป `/login` ✅ |

---

## ✅ ปุ่ม "ทดสอบเข้าสู่ระบบด่วน" ใช้งานได้แล้ว (3 ก.ย. `77f3d96`)

2 ปุ่มบนหน้า login **ไม่เคยใช้ได้เลยตั้งแต่แรก** — มันกรอก `admin@pkru.ac.th` / `Password123!` ซึ่ง**ไม่มีบัญชีนี้ใน DB** และต่อให้กรอกอีเมลที่ถูกต้อง ก็เข้าไม่ได้อยู่ดีเพราะบัญชีทดสอบมี `password = NULL` ตามกฎของโปรเจกต์

**ตอนนี้กดแล้วเข้าเลย ไม่ต้องตั้งรหัสผ่านก่อน** — เพิ่ม provider ตัวที่สองชื่อ `demo-role` ที่รับ **บทบาท** (ไม่ใช่อีเมล) แล้วล็อกอินเป็นบัญชี seed ของบทบาทนั้นโดยไม่ใช้รหัสผ่าน

| ปุ่ม | เข้าเป็น |
|---|---|
| ผู้บริหารองค์กร | Hansen-Jacobs University Admin |
| ช่างซ่อมบำรุง | Craig Yost |

**กฎ password = NULL ยังอยู่เหมือนเดิม** ไม่ได้เอารหัสผ่านถาวรไปฝากไว้กับบัญชีจริงเพื่อให้ปุ่มทำงาน

### ทำไมถึงปลอดภัยพอที่จะมีอยู่ในโค้ด

- **ลงทะเบียนเฉพาะนอก production** และเช็คที่ตัว array ของ providers ไม่ใช่ `if` ข้างใน `authorize()` — บน production NextAuth ไม่รู้จัก provider นี้เลย ไม่มีกิ่งไหนในเส้นทางล็อกอินที่กดพลาดแล้วเข้าได้
- **รับได้แค่บทบาท ไม่รับอีเมล** เจาะจงบัญชีใครไม่ได้
- **ข้ามบัญชีที่ suspended/pending** ใช้ลัดขั้นตอนอนุมัติไม่ได้

**ทดสอบบน production build จริง** (`next start`): ล็อกอินด้วยรหัสผ่านปกติ → ได้ session · ยิง `/api/auth/callback/demo-role` → **ไม่ได้ session** · HTML ของหน้า login **ไม่มีปุ่ม demo เลยสักตัว**

### 🔴 เจอตอนทดสอบ production build — ต้องแก้ก่อน deploy

**NextAuth ปฏิเสธทุก request บน production ถ้าไม่ตั้ง `AUTH_TRUST_HOST` หรือ `AUTH_URL`**

```
[auth][error] UntrustedHost: Host must be trusted. URL was: http://localhost:3100/api/auth/csrf
```

ทุก endpoint ของ auth คืน 500 ล็อกอินไม่ได้เลยแม้แต่คนเดียว — ตอน dev ไม่เจอเพราะ NextAuth ผ่อนให้ · **ต้องใส่ใน `.env` ตอน deploy** คู่กับ SMTP ที่ค้างอยู่:

```
AUTH_URL="https://<โดเมนจริง>"
```

---

## ⚠️ อ่านก่อนเริ่ม — หลัง `git pull` ต้องทำ 3 อย่าง ไม่งั้นหน้า `/admin` จะพัง

```bash
npx prisma migrate deploy && npx prisma generate
```

แล้ว **ปิด dev server แล้วเปิดใหม่** ทุกครั้งที่ pull แล้วมี migration ใหม่ — รอบล่าสุดคือ `20260903140000_fix_work_order_created_at_backfill_timezone` (แก้เวลาที่เพี้ยน 7 ชั่วโมง ดูหัวข้อ "ตรวจงาน backend ที่ Esther03u แก้มา") ก่อนหน้านั้นคือ `20260828120000_add_ac_catalogue_soft_delete` ที่เพิ่มคอลัมน์จริง

**ถ้าลืมรีสตาร์ท จะเจออาการนี้:** หน้า `/admin` ขึ้นข้อความ *"ไม่สามารถเชื่อมต่อฐานข้อมูล MariaDB/MySQL ได้ ... พอร์ต 3307"* ซึ่ง**ไม่เกี่ยวกับ MySQL เลย** ตัวจริงคือ `next dev` ยังถือ Prisma client ตัวเก่าที่โหลดตอนบูตซึ่งไม่รู้จักคอลัมน์ใหม่ (DoubleKill เจอเองตอนทดสอบ 28 ส.ค. · `tsc` ผ่านหมด สคริปต์ `tsx` ก็รันได้ปกติ เห็นเฉพาะตอนเปิดหน้าจริงเท่านั้น)

## ลำดับที่แนะนำตอนนี้ (3 ก.ย. 2026)

**backlog รอบ 27 ส.ค. ปิดครบทั้ง 4 ข้อทั้งสองฝั่งแล้ว** เหลือค้างอยู่ 2 อย่าง

1. **ข้อ 4 เฟส 2 ฝั่ง UI — Esther03u, ทำได้เลย ไม่ถูกบล็อกแล้ว** · `brandDeleted` / `modelDeleted` ส่งครบทั้ง 11 จุดแล้ว ดูหัวข้อ "📦 ของที่ส่งให้แล้ว รอบ 3 ก.ย." · จุดเดียวที่ต่างจากที่เหลือคือ `qr/[id]/page.tsx` ต้องเรียก `catalogueFlags(ac)` เอง
2. **SMTP credential ใน `.env`** — รอเจ้าของโปรเจกต์ใส่ ไม่มีใครทำแทนได้

*ลำดับเดิมของ backlog (ข้อ 1 → 2 → 3 → 4) เก็บไว้ในหัวข้อ "ลำดับที่แนะนำตอนวางแผน (27 ส.ค.)" ด้านล่าง*

### 🔴 กฎแบ่งงาน backend/frontend — ยกเลิกแล้ว (3 ก.ย. 2026)

เจ้าของโปรเจกต์ยกเลิกกฎที่ว่า DoubleKill ทำเฉพาะ backend (`schema.prisma`, `**/actions.ts`, `src/app/api/**`, `src/lib/**`) และ Esther03u ทำเฉพาะ `src/components/**`

**ต่อไปนี้ทั้งคู่แตะได้ทุกไฟล์** ไม่ต้องเขียน request ขอกันอีก · ส่วนที่ยังใช้ได้อยู่คือ **เขียนไว้ใน HANDOFF ว่าแตะอะไรไป** เพราะรอบ 1–2 ก.ย. มีบั๊ก timezone หลุดไปหนึ่งตัวและกว่าจะเจอต้องไล่ diff ทั้งก้อน (ดูหัวข้อ "ตรวจงาน backend ที่ Esther03u แก้มา")

---

# 🏗️ รื้อโครงสร้างโค้ด — ✅ เสร็จทั้งเฟส A และ B (3 ก.ย. 2026)

> # 🔴🔴 ถึง Esther03u — อ่านก่อนแตะโค้ดอะไรทั้งสิ้น
>
> **1. กฎแบ่งงาน backend/frontend ถูกยกเลิกแล้ว** โดยเจ้าของโปรเจกต์ (3 ก.ย.) — ต่อไปนี้ทั้งคู่แตะได้ทุกไฟล์ ไม่ต้องเขียน request ขอกันอีก
>
> **2. `/admin` และ `/tech` ถูกแตกเป็น 15 route จริงแล้ว** และ **ลบ 2 ไฟล์ทิ้ง**: `admin-dashboard-view.tsx` กับ `tech-mobile-view.tsx`
>
> **ถ้าคุณแก้งานข้อ 4 เฟส 2 ค้างไว้ในเครื่อง อย่าเพิ่ง `git pull` แบบ merge เฉยๆ** — ดูหัวข้อ "คู่มือย้ายงานที่ค้างอยู่" ด้านล่าง งานของคุณส่วนใหญ่**ไม่เสีย** เพราะ panel ทุกตัวยังอยู่ที่เดิมและรับ props เหมือนเดิมเป๊ะ

เจ้าของโปรเจกต์ให้วิเคราะห์โครงสร้างทั้งโปรเจกต์ (109 ไฟล์ ~18,700 บรรทัด) เพื่อแบ่งเป็นแต่ละหน้า แยก backend/frontend และ refactor · **เฟส A (backend ล้วน) ทำเสร็จแล้ว 3 ก.ย.** ส่วน**เฟส B ยังไม่เริ่ม** เพราะไปแตะไฟล์ชุดเดียวกับที่ Esther03u กำลังจะทำงานข้อ 4 เฟส 2 พอดี

> 🔴 **ถึง Esther03u: อย่าเพิ่งเริ่มเฟส B จนกว่าจะตกลงจังหวะกัน** — งานข้อ 4 เฟส 2 ของคุณกับเฟส B ของแผนนี้แตะไฟล์ชุดเดียวกันเป๊ะ ทำพร้อมกันจะ conflict หนักกว่างานทั้งสองฝั่งรวมกัน · **ทำข้อ 4 เฟส 2 ให้จบก่อน แล้วค่อยรื้อ** เป็นลำดับที่ปลอดภัยที่สุด

## ปัญหาที่พบ เรียงตามผลกระทบ

### 🔴 P1 — ทั้งแอปมีแค่ 2 route แต่มี 15 หน้าอยู่ข้างใน

`/admin` กับ `/tech` คือ route ทั้งหมดที่มีจริง ส่วน "หน้า" ต่างๆ สลับด้วย `useState` ใน `admin-dashboard-view.tsx:114` (`activeTab === "overview" && <OverviewPanel/>` ไล่ไปอีก 8 แท็บ)

| ผลกระทบ | หลักฐานที่วัดได้ |
|---|---|
| โหลดข้อมูลทุกหน้าทุกครั้ง | `/admin` ยิง **9 query ดึง ~437 แถว** ทุกครั้งที่เปิด แม้เข้าไปดูแค่แท็บ "อนุมัติผู้ใช้" ที่ใช้จริง 5 แถว · ในนั้นมี `ac_models` **189 แถว** ที่ใช้เฉพาะแท็บตั้งค่า |
| God Component | `admin-dashboard-view.tsx` 449 บรรทัด · state 8 ตัว · prop 17 ตัว · เป็นทั้ง router + state store + layout ในไฟล์เดียว |
| แชร์ลิงก์หน้าใดหน้าหนึ่งไม่ได้ | ทุกหน้าคือ URL เดียวกัน · refresh แล้วเด้งกลับ overview · ปุ่ม back ของเบราว์เซอร์ใช้ไม่ได้ |
| เพิ่มหน้าใหม่ต้องแก้ 3 ที่ | `page.tsx` (ดึงข้อมูล) + `dashboard-view.tsx` (เพิ่ม branch) + sidebar |

**มีของพิสูจน์อยู่แล้วว่าทางที่ถูกใช้ได้จริงในโปรเจกต์นี้** — `MaintenanceCalendar` ไม่รับ data prop เลย มันเรียก `/api/admin/maintenance-schedules` ของตัวเอง จึงเป็นแท็บเดียวที่ไม่ถ่วงการโหลดของแท็บอื่น

### 🟠 P2 — ฝั่ง tech ยังไม่ได้ทำตามแพทเทิร์นที่ฝั่ง admin วางไว้เอง

25 ส.ค. แยก `admin/actions.ts` เป็น `src/lib/admin/**` + wrapper บางๆ ไปแล้ว (1,748 → 135 บรรทัด) แต่ `tech/actions.ts` **540 บรรทัด** ยังมี implementation เต็มอยู่ใน `"use server"` และ `getTechnicianData()` ตัวเดียวยาว **190 บรรทัด** · `master-data/actions.ts` **506 บรรทัด** ก็เป็นแบบเดียวกัน

### 🟠 P3 — mapper 3 ตัวที่ต่างกันแค่ field เดียว (DRY)

`jobPool` / `myJobs` / `completedJobs` มี 11 บรรทัดเหมือนกันเป๊ะ ต่างแค่บรรทัดสุดท้าย (`createdAt` / `claimedAt` / `completedAt`) และ `include` block ก่อนหน้าซ้ำ 3 ครั้งทุกตัวอักษร

**หลักฐานว่าเป็นภาระจริง:** DoubleKill ต้องแก้ 3 ที่ซ้ำกันมาแล้ว 2 รอบติด — 28 ส.ค. เพิ่ม `buildingId`/`buildingName` และ 3 ก.ย. เพิ่ม `catalogueFlags` · **ถ้าลืมที่ใดที่หนึ่ง TypeScript ไม่ฟ้องเลย** เพราะเป็น object literal คนละตัว

### 🟡 P4 — ไฟล์ backend ที่โตเกินหมวดของตัวเอง

| ไฟล์ | บรรทัด | ปนกันกี่หมวด |
|---|---|---|
| `lib/admin/assets.ts` | 619 | **5** — อาคาร / ห้อง / แอร์ / ประวัติ+log / รอบ PM |
| `app/admin/master-data/actions.ts` | 506 | 2 หมวด + implementation อยู่ผิดที่ (P2) |
| `lib/admin/settings.ts` | 448 | **4** — สถานะผู้ใช้ / โปรไฟล์ / ตั้งค่าองค์กร / audit log |

### 🟡 P5 — `formatAcLocation` มี 4 เวอร์ชันกระจายกันอยู่

```
tech/actions.ts        "{อาคาร} ({ตัวย่อ}) - ห้อง {ห้อง} (ชั้น {ชั้น})"
work-order-board.ts    "{อาคาร} ({ตัวย่อ}) - ห้อง {ห้อง}"
maintenance.ts         "{อาคาร} - ห้อง {ห้อง}"
qr/[id] + assets.ts    "{อาคาร} - ห้อง {ห้อง}"    ← ประกอบสตริงซ้ำอีกที
```

เครื่องเดียวกันจึงแสดงที่อยู่ไม่เหมือนกัน แล้วแต่ว่าข้อมูลมาจาก endpoint ไหน

---

## ✅ เฟส A — backend ล้วน · เสร็จแล้ว 3 ก.ย. (6 commit)

**ไม่แตะ `src/components/**` เลยแม้แต่ไฟล์เดียว** และ **ทุก action ยังชื่อเดิม อยู่ path เดิม** (`@/app/admin/actions`, `@/app/tech/actions`, `@/app/admin/master-data/actions`) — เป็นการย้าย implementation ล้วน **UI ไม่ต้องแก้แม้แต่ import เดียว**

| ขั้น | commit | ผล |
|---|---|---|
| 1 | `8e64a0a` | `formatAcLocation` 4 แบบ 7 จุด → `src/lib/location.ts` ตัวเดียว |
| 2 | `386ae4a` | mapper 3 ตัว + include 3 ชุด → `src/lib/tech/job-rows.ts` |
| 3 | `b5ba2c9` | `app/tech/actions.ts` 471 → **55** บรรทัด + `src/lib/tech/**` |
| 4 | `f3eeef5` | `master-data/actions.ts` 506 → **80** บรรทัด + `lib/admin/master-data.ts` |
| 5-6 | `401501c` | `assets.ts` 619 → 5 ไฟล์ · `settings.ts` 448 → 4 ไฟล์ |

### โครงสร้าง backend หลังเฟส A

```
src/lib/
├── location.ts              ที่อยู่ของเครื่อง 4 รูปแบบ (เดิมกระจาย 7 จุด)
├── catalogue-status.ts      ธงยี่ห้อ/รุ่นที่ถูกลบ
├── admin/
│   ├── dashboard.ts         getOrgAdminData()
│   ├── work-orders.ts       ใบงาน
│   ├── work-order-board.ts  select + mapper + where ของกระดาน
│   ├── buildings.ts         อาคาร
│   ├── rooms.ts             ห้อง
│   ├── air-conditioners.ts  ลงทะเบียน/แก้ไขแอร์
│   ├── maintenance-logs.ts  ประวัติ + แก้ไข log
│   ├── schedules.ts         รอบ PM
│   ├── master-data.ts       ยี่ห้อ/รุ่น + ถังขยะ
│   ├── users.ts             อนุมัติ/ระงับ/รีเซ็ตรหัสผ่าน
│   ├── profile.ts           โปรไฟล์ตัวเอง (ใช้ร่วมกับฝั่งช่าง)
│   ├── organisation-settings.ts
│   └── audit-log.ts
└── tech/
    ├── guards.ts · dashboard.ts · jobs.ts · maintenance-log.ts · qr.ts · job-rows.ts
```

**ไฟล์ใหญ่สุดฝั่ง backend ลงจาก 619 เหลือ 281 บรรทัด**

### 📌 กฎที่ยังใช้เหมือนเดิม (สำคัญกว่าเดิมด้วยซ้ำ เพราะตอนนี้มี 3 ไฟล์ที่เป็น wrapper)

`"use server"` ห้าม re-export — `export { x } from "./y"` จะ build พัง (`Only async functions are allowed to be exported in a "use server" file`) **ทั้งที่ tsc ผ่าน** · เพิ่ม action ใหม่ต้องเขียน implementation ใน `src/lib/**` **แล้วเพิ่ม wrapper ในไฟล์ actions ด้วย** ข้ามข้อสองจะเรียกจาก UI ไม่ได้

### สิ่งที่เปลี่ยนพฤติกรรม (มีอย่างเดียว)

`jobPool` ได้ field `airConditionerId` เพิ่มมา (เดิมมีเฉพาะ `myJobs` / `completedJobs`) — optional ใน `TechJobItem` และการ์ดในกองงานไม่ได้อ่าน จึงไม่มีอะไรเปลี่ยนบนจอ แต่ทำให้ทั้ง 3 รายการ shape ตรงกันสนิท

**ที่อยู่ของเครื่องยังพิมพ์เหมือนเดิมทุกตัวอักษร** — พิสูจน์ด้วยการรันสูตรเก่ากับใหม่บนห้องจริงทั้ง 32 ห้อง ครบทั้ง 4 รูปแบบ 32/32 เหมือนกัน

### ⚠️ ที่ยังไม่ได้ทดสอบ

ยังไม่ได้กดปุ่มทดสอบ action ฝั่ง**เขียน**จริงหลังย้าย (รับงาน / บันทึกงาน / สแกน QR / สร้าง-แก้แอร์ / ลบยี่ห้อ) — ยืนยันแล้วเฉพาะ `npm run build` ผ่าน (ตัวเดียวที่จับกฎ `"use server"` ได้), `tsc` ผ่าน, และเส้นทาง**อ่าน**ทั้งหมดผ่าน wrapper ตัวใหม่ (หน้า `/admin` 173 แถว · หน้า `/tech` 73 เครื่อง · `/api/tech/units`)

**ใครเปิดเครื่องต่อ ช่วยกดทดสอบฝั่งเขียนสัก 2-3 ปุ่มด้วย** — โครงสร้าง wrapper แบบนี้ใช้กับ 19 action ฝั่ง admin มาตั้งแต่ 25 ส.ค. แล้วไม่มีปัญหา แต่ยังไม่ได้พิสูจน์ซ้ำหลังย้ายรอบนี้

## ✅ เฟส B — แตกเป็นหน้าจริง · เสร็จแล้ว 3 ก.ย. (`12d1d22`, `625a152`)

### แผนที่ route ใหม่

```
/admin              ภาพรวมระบบ            /tech              งานทั้งหมด (กองงาน)
/admin/work-orders  กระดานใบงาน            /tech/my-jobs      งานของฉัน
/admin/approvals    อนุมัติผู้ใช้งาน        /tech/history      ประวัติ
/admin/team         เจ้าหน้าที่ & ช่าง      /tech/assets       แอร์ทั้งหมด
/admin/assets       ระบบสินทรัพย์          /tech/calendar     ปฏิทิน
/admin/calendar     ปฏิทินซ่อมบำรุง        /tech/profile      โปรไฟล์ของฉัน
/admin/qr-codes     จัดการ QR Code
/admin/profile      จัดการโปรไฟล์
/admin/settings     ตั้งค่าระบบ
```

### ผลที่วัดได้จริง (ขนาด payload ที่ server ส่งจริง)

| หน้า | ก่อน | หลัง |
|---|---|---|
| `/admin/approvals` | ทุกหน้าโหลดชุดเดียวกันหมด **9 query ~437 แถว** | **14 KB** |
| `/admin/profile` | " | **14 KB** |
| `/admin/calendar` | " | **14 KB** (ไม่อ่าน DB เลย) |
| `/admin` (ภาพรวม) | " | 83 KB |
| `/tech/my-jobs` | ทุกหน้าโหลด pool 44 + ของฉัน 6 + ประวัติ 6 + แอร์ 73 | **15 KB** |
| `/tech/calendar` | " | **13 KB** (ไม่อ่าน DB เลย) |

**สิ่งที่ได้เพิ่มมานอกจากความเร็ว:** แชร์ลิงก์เข้าหน้าใดหน้าหนึ่งได้ · refresh แล้วอยู่หน้าเดิม · ปุ่ม back ของเบราว์เซอร์ใช้ได้ · เพิ่มหน้าใหม่ = สร้างโฟลเดอร์เดียว ไม่ต้องไปแก้ 3 ที่

### โครงสร้างใหม่ฝั่ง UI

```
src/app/admin/layout.tsx        guard + AdminShell (sidebar/header) ครอบทุกหน้า
src/app/admin/error.tsx         แบนเนอร์ตอนโหลดข้อมูลไม่ได้ (แทน dbError เดิม)
src/app/admin/<หน้า>/page.tsx   Server Component โหลดเฉพาะข้อมูลของตัวเอง
src/app/admin/<หน้า>/*-client.tsx  ตัวห่อบางๆ ที่ดึง search/handler มาป้อน panel

src/components/admin/admin-shell.tsx              sidebar + header + ปุ่มสร้างใบงาน
src/components/admin/create-work-order-provider.tsx  โมดัลสร้างใบงาน (โหลดข้อมูลตอนเปิด)
src/components/admin/use-admin-actions.ts         hook มอบหมาย/ยกเลิก/เปลี่ยนสถานะผู้ใช้
src/components/layout/dashboard-search.tsx        ช่องค้นหาบน header (ล้างเองตอนเปลี่ยนหน้า)
src/components/tech/tech-shell.tsx                shell ฝั่งช่าง + โมดัล 3 ตัว
src/lib/admin/pages.ts · src/lib/tech/pages.ts    loader ต่อหน้า
src/lib/admin/asset-tree.ts                       query + shape ของ อาคาร→ห้อง→แอร์
```

---

# 📊 ตาราง "รอซ่อมด่วน" แบ่งตามอาคารแล้ว (4 ก.ย. `4da12b9`)

หน้าภาพรวมของ admin เดิมเป็นตารางแบน 73 แถว แบ่งหน้าครั้งละ 5 แถว ชื่ออาคารซ้ำอยู่ทุกแถว และดูไม่ออกว่างานกระจุกอยู่อาคารไหน

ตอนนี้ใช้ `BuildingGroupList` **ตัวเดียวกับที่ฝั่งช่างใช้** จึงอ่านเหมือนกันทั้งสองฝั่ง

- จัดกลุ่ม**หลัง**กรองและเรียงแล้ว → อาคารจะโผล่ก็ต่อเมื่อมีแถวที่รอดจากการค้นหา และลำดับในกลุ่มยังเป็นไปตามหัวคอลัมน์ที่กดเรียง
- **แบ่งหน้าที่ระดับอาคาร ไม่ใช่ระดับแถว** → ไม่มีอาคารไหนถูกหั่นข้ามหน้าอีก
- หัวกลุ่มบอกจำนวนรายการ และจำนวน "ด่วน" ของอาคารนั้น · ท้ายตารางบอกจำนวนอาคาร
- **การติ๊กเลือกและปุ่มมอบหมายช่างยังทำงานข้ามกลุ่มเหมือนเดิม** เพราะอ่านจาก filtered row model ไม่ใช่จากสิ่งที่แสดงบนจอ

ผลจริง: 5 อาคาร = 23+7+22+12+9 = **73 รายการ ตรงกับของเดิม** · ด่วน 21/4/14/8/3 · บรรทัด "เลือกแล้ว 0 จาก 73 รายการ" ยังอยู่

> 💡 ยังเหลือจุดที่ปรับได้อีก: คอลัมน์ "สถานที่ / รุ่นแอร์" ยังพิมพ์ชื่ออาคารซ้ำในทุกแถวทั้งที่อยู่ในกลุ่มของอาคารนั้นอยู่แล้ว ทำให้คอลัมน์ตัดบรรทัดยาว 3 บรรทัด · ฝั่งช่างก็เป็นแบบเดียวกัน ถ้าจะแก้ควรแก้พร้อมกันทั้งสองฝั่งให้เหมือนเดิม

---

# 🔽 กลุ่มอาคารหุบไว้ทั้งหมดเป็นค่าเริ่มต้น (4 ก.ย. 2026, DoubleKill)

เจ้าของโปรเจกต์แจ้งว่าเข้าหน้าภาพรวมมาแล้วอาคารแรกถูกกางไว้ให้อัตโนมัติ (`Administration Building 293183` 23 รายการ) อีก 4 อาคารเลยถูกดันตกจอ ต้องเลื่อนลงไปหา จึงขอให้ **เริ่มต้นเป็นหุบทั้งหมด**

**ไฟล์ที่แตะ: `src/components/shared/building-groups.tsx` ไฟล์เดียว**

```ts
// เดิม — กางอาคารแรกให้เสมอ
const [expandedBuildingId, setExpandedBuildingId] = useState<string | null>(groups[0]?.buildingId ?? null);

// ใหม่
const [expandedBuildingId, setExpandedBuildingId] = useState<string | null>(null);
```

ไม่ต้องแก้อย่างอื่นเลย เพราะโค้ดรองรับสถานะ "ไม่มีอาคารไหนเปิด" อยู่แล้ว (`effectiveExpandedId` fallback เป็น `null` เวลากรองแล้วอาคารที่เปิดค้างอยู่หลุดหายไป) · พฤติกรรมเปิดได้ทีละอาคารและกดหัวกลุ่มเพื่อปิดยังเหมือนเดิม

**⚠️ `BuildingGroupList` เป็นคอมโพเนนต์กลาง — เปลี่ยนครั้งเดียวมีผลทั้ง 6 จุด** เลือกทางนี้แทนการเพิ่ม prop `defaultExpanded` เพราะหน้าที่มีอาคารเดียวก็กดเปิดครั้งเดียวจบ ไม่คุ้มกับการเพิ่มทางแยกให้คอมโพเนนต์

| ฝั่ง | ไฟล์ | ทดสอบผ่านหน้าจอจริงแล้ว |
|---|---|---|
| admin | `admin/upcoming-maintenance-table.tsx` (รอซ่อมด่วน) | ✅ 5 อาคารหุบหมด · กดแล้วกางได้ |
| admin | `admin/qr-code-manager.tsx` | ✅ (ปุ่ม "เลือกทั้งหมด" บนหัวกลุ่มยังอยู่ครบ) |
| tech | `tech/assets-panel.tsx` | ✅ |
| tech | `tech/job-pool-panel.tsx` | ✅ |
| tech | `tech/my-jobs-panel.tsx` | ✅ กดกางแล้วการ์ดใบงานขึ้นครบ 3 ใบ |
| tech | `tech/completed-jobs-panel.tsx` | ✅ |

ทดสอบด้วยการกดใช้จริงทั้ง 6 หน้าผ่าน dev server (login ด้วยปุ่ม demo ทั้ง admin และ Craig Yost) · console ไม่มี error · `tsc --noEmit` ผ่าน

---

# ✅ ทดสอบ 3 action ที่ค้างจากการรื้อเฟส A — ผ่านหมด (4 ก.ย. 2026, DoubleKill)

สาม action นี้ถูกย้ายไฟล์ตอนรื้อโครงสร้างแต่ยังไม่เคยกดใช้จริง ตอนนี้กดครบแล้วบน dev server และ**ตรวจผลถึงระดับแถวในฐานข้อมูล** ไม่ใช่แค่ดูหน้าจอ · คืนค่า DB กลับเป็นเดิมครบทุกแถวหลังทดสอบ (work_orders 58 · maintenance_logs 230 · audit 29 · pending 44 / claimed 6 / completed 6 / cancelled 2 เท่าเดิมเป๊ะ)

## 1. บันทึกงานจาก "งานของฉัน" (`logMaintenanceAction`) ✅

ปิดใบงาน #11 (B467711-7-970896-02) ด้วย ล้างแอร์ + สถานะ "ใช้งานได้ปกติ" + บันทึกภาษาไทย ผลที่ได้ครบทุกจุด:

| ตาราง | ผล |
|---|---|
| `work_orders` #11 | `claimed` → `completed` · `completed_at` = 2026-09-04 09:56:16 (UTC ถูกต้อง = 16:56 ไทย) |
| `maintenance_logs` #621 | `action=cleaning` · `work_order_id=11` · `user_id=3` · บันทึกภาษาไทยไม่เพี้ยน |
| `air_conditioners` #21 | `needs_cleaning` → `normal` |
| `maintenance_schedules` | `last_performed_at` 2025-12-11 → **2026-09-04** · `next_due_date` 2026-03-11 → **2026-12-04** (บวก 3 เดือนถูกต้อง เป็น `@db.Date` ล้วน ไม่มีเวลาปน) |
| `system_audit_logs` | เพิ่มแถว `COMPLETE_WORKORDER` |

**ลำดับล็อกที่กลัวกันไว้ไม่มีปัญหา** — transaction ผ่านฉลุย ไม่มี deadlock · หน้าจอเด้งการ์ดออกจาก "งานของฉัน" ทันที (3 → 2 งาน) และ badge ข้างเมนูลด 6 → 5

## 2. สแกน QR (`scanQrCodeAction`) ✅

กรอก `B467711-7-970896-03` ในโมดัลสแกน (ปุ่มบน header) → คืนข้อมูลครบ: รหัส · ยี่ห้อ Daikin · ตำแหน่ง "Administration Building 293183 - ห้อง 7-970896" · สถานะ "มีปัญหา" · ล้างล่าสุด 10/11/2025 · แถบ "มีใบงานด่วนอยู่!" พร้อมปุ่มรับงาน
เส้นทาง error ก็ทำงาน — กรอกรหัสมั่ว (`NOT-A-REAL-CODE`) ขึ้น toast แจ้งไม่พบเครื่อง ไม่ค้าง ไม่ throw

## 3. สร้างใบงานจากปุ่มบน header (admin) ✅

โมดัล cascade 3 ชั้นทำงานถูกต้อง: เลือกอาคาร → รายการห้องโผล่ 10 ห้อง → เลือกห้อง → รายการแอร์โผล่ 3 เครื่องพร้อม BTU
สร้างใบงานล้าง priority `high` บนเครื่อง #21 → ได้แถว `work_orders` #124 (`pending`, `type=cleaning`, `priority=high`, `created_at` UTC ถูกต้อง) + audit `CREATE_WORKORDER` · badge "กระดานใบงาน" 44 → 45 และการ์ด "รอล้าง" 25 → 26 ทันที
**ดีเลย์ตอนเปิดโมดัลครั้งแรกยังมีอยู่จริงตามที่บันทึกไว้** (โหลดรายชื่ออาคาร/ช่างตอนเปิด) แต่ไม่ถึงวินาที

## ✅ 3 เรื่องที่เจอระหว่างทดสอบ — แก้แล้วทั้งหมด (4 ก.ย.)

ทั้งสามเรื่องอยู่ในโมดัล "บันทึกประวัติการซ่อม" และมีต้นเหตุเดียวกัน: `log-action-modal.tsx` เรียก `Pattern` จาก **`@/components/examples/c-file-upload-4`** ซึ่งเป็นไฟล์ตัวอย่างของ ReUI มาใช้ตรงๆ

| # | อาการ | แก้อย่างไร |
|---|---|---|
| 1 | **ช่องอัปโหลดมีรูปปลอมติดมา 3 รูปทุกครั้งที่เปิด** — ไฟล์ตัวอย่างฝัง `defaultImages` ที่ดึงจาก `picsum.photos` ช่างจึงเห็น "หลักฐานก่อน/หลังซ่อม" เป็นรูปสุ่มจากเน็ตที่ไม่ใช่ของตัวเอง ตัวนับขึ้น `Gallery (3/1)` เกินเพดาน 1 ไฟล์ของตัวเอง (รูปพวกนี้ไม่เคยถูกส่งขึ้นเซิร์ฟเวอร์ แต่หลอกตาเต็มๆ และถ้าออกเน็ตไม่ได้จะขึ้นรูปแตก) | ลบ `defaultImages` และ `initialFiles` ทิ้ง |
| 2 | **console error ทุกครั้งที่เปิดโมดัล** — `Cannot update a component (LogActionModal) while rendering a different component (Pattern)` | ต้นเหตุอยู่ใน `use-file-upload.ts`: เรียก `onFilesChange` **จากข้างใน updater ของ `setState`** ทั้ง 3 จุด (`clearFiles` / `addFiles` / `removeFile`) ซึ่ง React รันช่วง render → กลายเป็น setState-in-render ของ component แม่ · ย้ายไปแจ้งจาก `useEffect` ที่ผูกกับ `state.files` แทน (ข้าม pass แรกตอน mount เพื่อให้ความหมายเหมือนเดิมคือแจ้งเฉพาะตอนเปลี่ยน) |
| 3 | **ปุ่มในช่องอัปโหลด 9 ปุ่มไม่ได้ใส่ `type="button"`** จึงเป็น `submit` ตามค่าเริ่มต้นของ HTML ทั้งที่อยู่ในฟอร์มเดียวกับ "บันทึกและเสร็จสิ้น" (ตอนเจอ ทดสอบแล้วว่ายังไม่ทำให้ฟอร์ม submit จริง แต่เป็นระเบิดเวลา) | ใส่ `type="button"` ให้ทุกปุ่มในคอมโพเนนต์ · ตอนนี้ในฟอร์มเหลือปุ่ม `submit` แค่ปุ่มเดียวคือ "บันทึกและเสร็จสิ้น" (ตรวจจาก DOM จริงแล้ว) |

**ย้ายไฟล์ด้วย:** `src/components/examples/c-file-upload-4.tsx` → **`src/components/tech/photo-upload.tsx`** (`Pattern` → `PhotoUpload`) เพราะไฟล์นี้ไม่ใช่ของตัวอย่างแล้ว มันคือช่องแนบรูปที่ช่างใช้จริง · มีคอมเมนต์บอกที่มาไว้หัวไฟล์ · **เหลือ `src/components/examples/` แค่ `c-pagination-3.tsx` ไฟล์เดียว** ซึ่งไม่มีใครเรียกใช้จริง (ตอบคำถามที่ค้างกับ Esther03u ไปได้ครึ่งหนึ่ง)

โมดัลส่ง `multiple={false}` เพิ่มให้ตรงกับ `maxFiles={1}` ที่ตั้งไว้อยู่แล้ว — เลือกรูปใหม่ทับรูปเดิมได้เลย จากเดิมที่ขึ้น error ว่าเกิน 1 ไฟล์แล้วต้องกด "Clear all" ก่อน

### ทดสอบหลังแก้ (กดใช้จริง ไม่ใช่แค่ build ผ่าน)

- เปิด/ปิดโมดัลซ้ำ — **ช่องแนบรูปว่างเปล่าทั้งสองช่อง ไม่มี `Gallery (3/1)` แล้ว** และ **console ไม่มี error เลย** (ดักนับ `console.error` เองระหว่างเปิดปิด ได้ 0)
- ตรวจ DOM ของฟอร์ม: ปุ่มทุกตัวมี `type` ชัดเจน มี `submit` ตัวเดียวคือปุ่มบันทึก
- **ปิดใบงาน #11 ซ้ำอีกรอบหลังแก้ ผ่านครบเหมือนเดิม** — log เขียนถูก · แอร์กลับเป็น `normal` · ตารางล้างเลื่อนไป 2026-12-04
- **ทดสอบแนบรูปจริงเป็นครั้งแรกของโปรเจกต์** — ยัดไฟล์ PNG เข้า input แล้วส่ง: ตัวนับขึ้น `Gallery (1/1) Total: 84Bytes` และ `maintenance_logs.before_photo_url` ได้ค่า `/uploads/1788517003749-before-test.jpg` (sharp แปลงเป็น jpg ให้) — **เส้นทางแนบรูปใช้งานได้จริง** ไม่ใช่แค่ปุ่มหลอก
- คืนค่า DB และลบไฟล์ที่อัปโหลดทดสอบออกจาก `public/uploads/` แล้ว

## ⚠️ mysqld: `Start-Process` ก็ไม่รอดแล้ว ต้องใช้ WMI

HANDOFF เดิมบอกว่าให้สตาร์ท MariaDB ด้วย PowerShell ห้ามใช้ Bash · รอบนี้เจอว่า **`Start-Process` ผ่าน PowerShell ก็ตายด้วย** — process ขึ้นมาฟังพอร์ต 3306 ได้จริง แล้วถูกฆ่าทิ้งทันทีที่คำสั่งจบ (log ขาดกลางแบบไม่มีข้อความ shutdown) เพราะถูกผูกไว้กับ job object ของ shell ที่เรียก

ทางที่ใช้ได้คือให้ WMI เป็นคนสร้าง process แทน จะหลุดออกจาก job object ของ shell:

```powershell
Remove-Item C:\xampp\mysql\data\mysql.pid -Force -ErrorAction SilentlyContinue
Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
  CommandLine = '"C:\xampp\mysql\bin\mysqld.exe" --defaults-file=C:\xampp\mysql\bin\my.ini'
}
```

และ **client ต้องต่อด้วย `-h 127.0.0.1 -P 3306`** — `mysql.exe` เปล่าๆ จะไปหา named pipe แล้วขึ้น `ERROR 2002 (10061)` ทั้งที่เซิร์ฟเวอร์รันอยู่

---

# ✅ ข้อ 4 เฟส 2 ฝั่ง UI — ปิดงานแล้ว (4 ก.ย. 2026, DoubleKill)

backend ส่ง `brandDeleted`/`modelDeleted` ครบ 11 จุดมาตั้งแต่ 3 ก.ย. (`96990c5`) แต่ยังไม่มีใครเอาไปแสดง ตอนนี้ทุกจุดที่โชว์ชื่อยี่ห้อ/รุ่นมีสัญลักษณ์บอกแล้วว่ายี่ห้อ/รุ่นนั้นถูกลบออกจากรายการหลัก

## คอมโพเนนต์กลางตัวเดียว: `src/components/shared/catalogue-mark.tsx`

```tsx
<CatalogueMark brandDeleted={x.brandDeleted} modelDeleted={x.modelDeleted} className="ml-1" />
```

- ไอคอน `AlertTriangle` จาก `lucide-react` ขนาด 12px โทน `text-warning` **ไม่ใช่ badge ไม่ใช่สีแดง** ตามที่ตกลงกันไว้ — เครื่องยังใช้งานได้ปกติ แค่แจ้งให้รู้
- **หนึ่งเครื่องขึ้นไอคอนตัวเดียว** ไม่ใช่ตัวหนึ่งต่อ field เพราะเกือบทุกหน้าพิมพ์ยี่ห้อกับรุ่นติดกันเป็นบรรทัดเดียว (`Carrier • ZI-5618`) สามเหลี่ยมสองอันติดกันจะอ่านเป็นสองปัญหา
- ข้อความบอกเองว่าอันไหนถูกลบ ผ่าน `title` + `aria-label`:
  - `ยี่ห้อนี้ถูกลบออกจากรายการหลักแล้ว (เครื่องนี้ยังใช้งานได้ปกติ)`
  - `รุ่นนี้ถูกลบ...` / `ยี่ห้อและรุ่นนี้ถูกลบ...`
- ไม่ส่ง flag = ไม่มีอะไรวาด (`return null`) เครื่องที่พิมพ์ยี่ห้อเองไม่มีวันติดไอคอน

## จุดที่ต่อสายแล้ว 12 จุด — ทดสอบผ่านหน้าจอจริงครบทุกจุด

วิธีทดสอบ: soft delete ยี่ห้อ `Carrier` (14 เครื่องใช้อยู่) และรุ่น `ZI-5618` (1 เครื่อง) ด้วย `deleted_at` แล้วไล่เปิดทุกหน้า · **คืนค่าเป็น NULL แล้ว ถังขยะกลับมาว่างเหมือนเดิม**

| ฝั่ง | หน้า / ไฟล์ | ผล |
|---|---|---|
| admin | ตาราง "รอซ่อมด่วน" (`upcoming-maintenance-table.tsx`) | ✅ ขึ้นไอคอนบนแถว Carrier · tooltip แยกถูกว่าเครื่องไหนลบแค่ยี่ห้อ เครื่องไหนลบทั้งยี่ห้อและรุ่น |
| admin | กระดานใบงาน (`work-order-board.tsx`) | ✅ 10 แถว |
| admin | โมดัลรายละเอียดใบงาน (`work-order-detail-dialog.tsx`) | ✅ |
| admin | ระบบสินทรัพย์ (`asset-manager.tsx`) | ✅ `Carrier • ZI-5618` ได้ tooltip "ยี่ห้อและรุ่น" ส่วน `Carrier • YP-6434` ได้ "ยี่ห้อ" อย่างเดียว |
| admin | โมดัลประวัติเครื่อง (`ac-history-modal.tsx`) | ✅ |
| admin | จัดการ QR Code (`qr-code-manager.tsx`) | ✅ (เฉพาะตารางบนจอ **ไม่ใส่ในสติกเกอร์ที่พิมพ์** — สติกเกอร์ติดอยู่บนตัวเครื่องหลายปี ไม่ควรมีสถานะที่เปลี่ยนได้อยู่บนนั้น) |
| ทั้งสองฝั่ง | ปฏิทินซ่อมบำรุง (`shared/maintenance-calendar.tsx`) | ✅ ในโมดัลรายละเอียดงาน |
| tech | แอร์ทั้งหมด (`assets-panel.tsx`) | ✅ |
| tech | งานทั้งหมด (`job-pool-panel.tsx`) | ✅ |
| tech | งานของฉัน (`my-jobs-panel.tsx`) | ✅ |
| tech | ประวัติ (`completed-jobs-panel.tsx`) | ✅ ผ่าน mapper เดียวกับสองหน้าบน |
| tech | ผลสแกน QR ในแอป (`qr-scan-modal.tsx`) | ✅ |
| public | หน้า QR สาธารณะ (`app/qr/[id]/page.tsx`) | ✅ หน้านี้แยกช่อง "ยี่ห้อ" กับ "รุ่น" คนละช่อง จึงส่ง flag เฉพาะช่องนั้น ได้ tooltip ตรงตัวทั้งสองช่อง · เรียก `catalogueFlags(ac)` เองตามที่ HANDOFF สั่งไว้ ไม่ได้เช็ค `deletedAt` เองในไฟล์ |

## type ที่ต้องแก้ตาม (กับดักที่เสียเวลาหาสาเหตุ)

`ACUnit` **ถูกประกาศซ้ำ 3 ที่** — `components/admin/types.ts`, `asset-manager.tsx` และ `qr-code-manager.tsx` ต่างมีของตัวเอง เพิ่ม field ที่เดียวแล้ว tsc จะฟ้องเป็นทอดๆ ว่า `ACUnit is not assignable to ACUnit` ซึ่งอ่านเหมือนไม่มีอะไรผิด ต้องเพิ่มให้ครบทั้งสามที่ · `WorkOrderItem`, `TechJobItem`, `Schedule`, `HistoryUnit`, `UpcomingMaintenanceAC`, `UrgentMaintenanceAC` แก้ที่เดียวจบ

> ถ้าจะรวม `ACUnit` สามตัวนี้เป็นตัวเดียวเมื่อไหร่ น่าจะคุ้ม — แต่ยังไม่ทำในรอบนี้เพราะไม่เกี่ยวกับงานที่สั่ง

---

# ✅ กระดานใบงานแบ่งตามอาคารแล้ว (4 ก.ย. 2026, DoubleKill)

`/admin/work-orders` เป็นหน้าสุดท้ายที่ยังเป็นตารางแบนยาว ชื่ออาคารซ้ำอยู่ทุกแถว ตอนนี้อ่านเหมือนอีก 5 หน้าที่แบ่งกลุ่มไปแล้ว — 5 อาคาร = 5 กลุ่ม หุบไว้เป็นค่าเริ่มต้น

**หัวกลุ่มบอก 4 ป้าย** (เจ้าของโปรเจกต์สั่งเพิ่มระหว่างรอบนี้ทีละชุด): `งานซ่อม N` · `งานล้างแอร์ N` · `รอดำเนินการ N` · `กำลังดำเนินการ N`

- **สองแกนคนละเรื่องกัน** — ซ่อม+ล้างบวกกันได้เท่ายอดของอาคารนั้นพอดี ส่วนรอดำเนินการ+กำลังดำเนินการตัดขวางทั้งสองแบบและ**ไม่ได้บวกกันเท่ายอด** เพราะยังมีใบที่เสร็จแล้วและที่ยกเลิกอยู่ในกลุ่มด้วย
- ใช้คำและสีเดียวกับคอลัมน์ "ประเภทงาน" และ "สถานะ" ในตารางข้างล่างเป๊ะ หัวกลุ่มกับแถวจะได้ไม่เพี้ยนจากกัน — บทเรียนจากป้าย "ด่วน N" ของตารางรอซ่อมด่วนที่เคยรวมสองอย่างเข้าด้วยกันจนไม่ตรงกับแถวไหนเลย
- ป้ายไหนเป็น 0 ไม่แสดง (อาคารที่ไม่มีช่างรับงานอยู่จะไม่มีป้าย "กำลังดำเนินการ" โผล่มาเป็น 0)

## ทำไมต้องเลิกแบ่งหน้าฝั่งเซิร์ฟเวอร์

หน้านี้ต่างจากอีก 5 หน้าตรงที่มันดึงทีละ 50 แถวจากฐานข้อมูล (`skip`/`take` + cache ต่อคีย์ filter) **กลุ่มอาคารประกอบจากแถวที่อยู่ในมือเท่านั้น** ถ้ายังแบ่งหน้าแบบเดิม อาคารเดียวจะถูกหั่นครึ่งไปโผล่หน้า 2 ซึ่งคือปัญหาที่ตอนแก้ตารางรอซ่อมด่วนตั้งใจกำจัด จึงเปลี่ยนมาโหลดทั้งกระดานทีเดียวแล้วแบ่งกลุ่มในเบราว์เซอร์ เหมือนที่ฝั่งช่างและตารางรอซ่อมด่วนทำอยู่

**มีเพดานกันไว้** `WORK_ORDER_BOARD_LIMIT = 500` ใน `src/lib/admin/work-order-board.ts` — ตอนนี้ 58 ใบงานต่อ 73 เครื่อง เหลือที่อีกเกือบสิบเท่า · ที่ต้องมีเพดานเพราะ**ใบงานสะสมขึ้นทุกรอบล้าง ต่างจากจำนวนเครื่องที่นิ่ง** · ถ้าชนเพดานเมื่อไหร่ หน้าจอจะขึ้นแถบบอกว่าโหลดมากี่ใบจากทั้งหมดกี่ใบ ไม่ใช่แสดงตารางสั้นๆ เงียบๆ เหมือนว่านั่นคือทั้งหมด

## สิ่งที่หายไปและเหตุผล

| หายไป | ทำไม |
|---|---|
| ตัวกรอง "ทุกอาคาร" | หัวกลุ่มคือตัวกรองอาคารอยู่แล้ว · dropdown ที่แค่ยุบหัวกลุ่มอีก 4 อันทิ้งไม่ได้บอกอะไรใหม่ |
| ปุ่มแบ่งหน้า 1/2 | ไม่มีหน้าให้แบ่งแล้ว · ถ้าอาคารเกิน 5 อาคาร `BuildingGroupList` จะแบ่งหน้า**ที่ระดับอาคาร**ให้เอง |
| `getWorkOrdersPage()` (server action + wrapper ใน `admin/actions.ts`) | ไม่มีใครเรียกแล้ว |
| `workOrderSearchWhere()` / `workOrderBoardWhere()` | มีไว้ให้ action ข้างบนอย่างเดียว |
| query อาคาร→ห้อง→เครื่อง ใน `getWorkOrdersPageData()` | โหลดมาเพื่อเติม dropdown อาคารล้วนๆ · หายไปพร้อม dropdown = หน้านี้ยิง query น้อยลง 1 ชุด (ชุดที่หนักที่สุดด้วย) |

การค้นหากลับมาทำฝั่ง client (ตรงกับทุกหน้าที่เหลือ) จับ 4 ฟิลด์เดิมที่ SQL เคยจับ: รหัสแอร์ · ยี่ห้อ · สถานที่ · ชื่อช่างที่ถือใบงาน · **เหตุผลเดิมที่ย้ายไปทำฝั่ง SQL คือค้นจากหน้า 2 แล้วไม่เจอแถวที่อยู่หน้า 1 — พอไม่มีหน้าแล้วเหตุผลนั้นก็หมดไป**

## field ที่เพิ่ม

`toWorkOrderBoardRow()` ส่ง `buildingId` / `buildingName` เพิ่ม (แยกออกจาก `location` ที่ประกอบไว้สำหรับแสดงผล) เหมือนที่ฝั่งช่างมีอยู่แล้ว — **ต้องเพิ่ม `id` ใน select ของ building ด้วย** ไม่งั้นจะจัดกลุ่มด้วยชื่อ ซึ่งจะรวมสองอาคารที่ชื่อซ้ำกันเข้าด้วยกัน

## ทดสอบผ่านหน้าจอจริง

- 5 กลุ่ม 20+6+16+9+7 = **58 ใบงาน ตรงกับของเดิม** · ป้าย "รอดำเนินการ" 17+2+14+9+2 = **44 ตรงกับ badge ข้างเมนู**
- ป้ายประเภทงานตรงกับฐานข้อมูลทุกอาคาร (ซ่อม 5/2/1/2/2 · ล้าง 15/4/15/7/5) รวม **ซ่อม 12 ล้าง 46 = 58** และแต่ละคู่บวกกันได้เท่ายอดของอาคารนั้น
- ป้าย "กำลังดำเนินการ" ขึ้นเฉพาะ 2 อาคารที่ Craig Yost ถือใบงานอยู่ (3+3 = 6 ตรงกับ `status='claimed'` ในฐานข้อมูล) อีก 3 อาคารไม่มีป้ายนี้
- ป้ายเดินตามตัวกรองด้วย: เลือก "เสร็จสิ้น" แล้วเหลือ 1+5 = 6 ใบ และป้ายสถานะที่เหลือหายไปเองเพราะเป็น 0
- กดหัวกลุ่ม → ตารางกางครบทุกคอลัมน์เหมือนเดิม
- กรองสถานะ "เสร็จสิ้น" → เหลือ 6 ใบใน 2 อาคาร **อาคารที่ไม่มีใบงานเลยหายไปจากรายการ** (ผลพลอยได้จากการจัดกลุ่ม)
- ค้นหา `Dormitory` → 16 ใบใน 1 อาคาร · ค้นด้วยรหัสแอร์เต็ม → 1 ใบ ในอาคารที่ถูกต้อง · ค้นคำที่ไม่มี → ขึ้น "ไม่พบข้อมูลใบงาน" · ล้างคำค้น → กลับมา 58
- **ปุ่ม "จ่ายงาน" เปิดโมดัลมอบหมายช่างได้ · กดที่แถวเปิดโมดัลรายละเอียดใบงานได้** ทั้งสองเส้นทางยังทำงาน
- หน้า `/admin` ภาพรวมที่ใช้ `WorkOrderItem` ชุดเดียวกันยังปกติ · `tsc --noEmit` ผ่าน 0 error

---

# ✅ ปฏิทิน — โมดัลรายละเอียดงานมีปุ่มย้อนกลับแล้ว (4 ก.ย. 2026, DoubleKill)

โมดัลรายละเอียดงานในปฏิทินเปิดได้จาก **2 ทาง** และทั้งสองทาง**ปิดสิ่งที่เปิดมันทิ้ง** ไม่ได้ซ้อนทับ:

1. กดชื่ออาคารในช่องวันที่ → โมดัลรายชื่องานของอาคารนั้น → กดงาน (โมดัลอาคารถูกปิด)
2. กดช่องวันที่ → แผงด้านข้างรายการงานของวัน → กดงาน (แผงถูกปิด)

เข้าไปแล้วพบว่ากดผิดตัว = ต้องเริ่มใหม่จากปฏิทิน ไม่มีทางถอยกลับ

**แก้:** จำที่มาไว้ใน state `eventOrigin` แล้วโมดัลงานจะขึ้นปุ่มลูกศรย้อนกลับที่หัวโมดัล (แทนที่ไอคอนประแจ) เมื่อมีที่ให้กลับ · กดแล้วเปิดรายการเดิมกลับมา

- **ป้ายกำกับบอกปลายทางจริง** ไม่ใช่คำว่า "ย้อนกลับ" ลอยๆ เพราะมีสองรายการที่พามาที่นี่ และจากในโมดัลมองไม่ออกว่ากำลังจะกลับไปไหน — `กลับไปรายการงานของ Library Building 273474` หรือ `กลับไปรายการงานวันที่ 13 กันยายน 2026`
- เปิดโมดัลตรงๆ โดยไม่ได้มาจากรายการไหน (ยังไม่มีเส้นทางแบบนั้นตอนนี้) ก็ไม่มีปุ่ม แสดงไอคอนประแจเหมือนเดิม
- ปิดโมดัลด้วยกากบาท หรือกด "สร้างใบงานซ่อมบำรุงตอนนี้" จะล้างที่มาทิ้งด้วย ไม่ค้างไว้ให้รอบหน้า
- **แผงด้านข้างกลับมาแบบล้างตัวกรองแล้ว** เพราะตอนปิดมันล้างไปแล้ว — เปิดใหม่เป็นมุมมองสดของวันนั้น ไม่ใช่แกล้งทำเป็นกู้สถานะเดิม

ทดสอบผ่านหน้าจอจริงทั้งสองเส้นทาง: อาคาร → งาน → กลับ ได้รายชื่อ 2 งานของ Library Building 273474 คืนมา · วัน → งาน → กลับ ได้แผง "13 กันยายน 2026" คืนมา · `tsc --noEmit` ผ่าน

---

# 🐛 ระบบสินทรัพย์ — ค้นหารหัสแอร์ไม่เจอมาตลอด (แก้แล้ว 4 ก.ย. 2026, DoubleKill)

เจ้าของโปรเจกต์กดลิงก์จากหน้าภาพรวมเข้ามาที่ `/admin/assets?q=B467711-1-846367-01` แล้วขึ้น **"ไม่พบอาคารที่ตรงกับ B467711-1-846367-01 (0 อาคาร)"** ทั้งที่เครื่องนั้นอยู่ในระบบ

**ต้นเหตุ:** ตัวกรองใน `asset-manager.tsx` เทียบคำค้นกับ**ชื่ออาคาร ตัวย่อ และชื่อห้องเท่านั้น ไม่เคยเทียบกับตัวเครื่องเลย** — ขณะที่ช่องค้นหาบน header เขียนว่า "ค้นหารหัสแอร์, สถานที่, หรือแบรนด์" และ**ปุ่ม "ไปดูรายละเอียด" บนการ์ดรอซ่อมด่วนส่งรหัสแอร์มาทาง `?q=` โดยเฉพาะ** ลิงก์เส้นนี้จึงพังมาตลอดตั้งแต่มีมัน

**แก้ 2 อย่าง:**

1. **เทียบกับตัวเครื่องด้วย** — รหัสแอร์ · ยี่ห้อ · รุ่น · เจอเครื่องในห้องไหน **หั่นให้เหลือเฉพาะเครื่องที่ตรง** ไม่ใช่คืนทั้งห้อง (ค้นรหัสเครื่องเดียวควรได้เครื่องเดียว ไม่ใช่ห้องที่มี 8 เครื่องแล้วให้ไปหาเอง) · ถ้าคำค้นตรงกับ**ชื่ออาคาร** คืนอาคารทั้งก้อนเหมือนเดิม เพราะคนค้นชื่ออาคารคือขอทั้งอาคาร
2. **กางอาคารที่เหลือให้อัตโนมัติระหว่างค้นหา** — เดิม `expandedBuilding` ตั้งค่าเริ่มต้นเป็นอาคารแรกของรายการ**ที่ยังไม่กรอง** พอกรองแล้วเหลืออาคารอื่น จะไม่มีอะไรกางเลย เจอหัวข้ออาคารลอยๆ อันเดียวซึ่งก็ยังดูเหมือน "ข้อมูลไม่ขึ้น" อยู่ดี

## ทดสอบผ่านหน้าจอจริง

| คำค้น | ผล |
|---|---|
| `B467711-1-846367-01` (ลิงก์ที่พัง) | ✅ 1 อาคาร · 1 ห้อง · **1 เครื่อง** กางให้พร้อมใช้งาน |
| `Carrier` (ยี่ห้อ) | ✅ 4 อาคาร — ตรงกับ SQL: 14 เครื่อง Carrier กระจายอยู่ 4 อาคาร |
| `Dormitory` (ชื่ออาคาร) | ✅ 1 อาคาร คืนมาทั้งก้อน 22 เครื่อง |
| `1-846367` (ชื่อห้อง) | ✅ 1 อาคาร เฉพาะห้องนั้น 4 เครื่อง |
| `zzzz` | ✅ 0 อาคาร ขึ้นข้อความไม่พบตามเดิม |
| (ล้างคำค้น) | ✅ กลับมา 5 อาคารครบ |

---

# 🔁 หน้าเว็บรีเฟรชตัวเองไม่หยุด — เป็นที่แคช `.next` ของ dev server ไม่ใช่โค้ด (4 ก.ย. 2026)

เจ้าของโปรเจกต์เจอ `/tech/assets` รีโหลดตัวเองรัวๆ ไม่หยุด **ทำซ้ำได้ในเครื่อง DoubleKill ด้วย** แล้วไล่หาจนจบ

## หลักฐานที่เก็บได้ (ไล่ทีละชั้น ไม่ได้เดา)

| ตรวจอะไร | ผล |
|---|---|
| `performance.getEntriesByType('navigation')[0].type` | `"reload"` — โหลด URL เดิมซ้ำ ไม่ใช่ redirect วนไปมา |
| log ของ dev server | มีแต่ `GET /tech/assets 200` เรียงกันเป็นร้อยครั้ง **ไม่มี request อื่นคั่นเลย** ไม่มี `/api/auth/*` ไม่มี RSC fetch → ตัด `BrowserSessionGuard` และ session หมดอายุออกได้ |
| ดักทับ `location.reload` ทั้งฟังก์ชัน | **ไม่เคยถูกเรียก** → ไม่มีโค้ดของเราสั่งรีโหลด |
| ดัก WebSocket แล้วดูข้อความสุดท้ายก่อนหน้าตาย | เป็นข้อความจาก `_next/webpack-hmr` ทุกครั้ง → คนสั่งรีโหลดคือ dev client ของ Next |
| `Compiling /tech/assets` ใน log | มีครั้งเดียว → ไม่ใช่การ recompile วน |
| process ของ dev server | กิน RAM **2.3 GB** และ CPU สะสม **1,125 วินาที** ทั้งที่เพิ่งรันได้ครึ่งชั่วโมง |
| ตาราง `work_orders` | 58 แถวเท่าเดิม ไม่มีแถวใหม่ → `syncOverdueMaintenanceWorkOrders()` ไม่ได้เขียนวน |

## ต้นเหตุ

**`.next/` ของ dev server เสียสภาพ** จากการที่รอบนี้มีการ**ย้าย/เปลี่ยนชื่อไฟล์ที่คอมไพล์ไปแล้ว ขณะ dev server กำลังรัน** (`examples/c-file-upload-4.tsx` → `tech/photo-upload.tsx`) และ**ลบ export ที่ฝั่ง client import อยู่** (`getWorkOrdersPage`) บวกกับรีสตาร์ท dev server ทั้งที่แท็บเบราว์เซอร์ยังเปิดค้างอยู่

อาการที่ยืนยันว่าแคชค้างจริง: console ยังพ่น `Failed to read source code from ...examples\c-file-upload-4.tsx` อยู่หลายนาที**หลังจากไฟล์นั้นถูกย้ายไปแล้ว** — dev server ยังถือ module graph ที่ชี้ไปยังไฟล์ที่ไม่มีอยู่จริง · client ที่ถือ HTML เก่าเชื่อมกลับมาแล้วเจอ build id ไม่ตรงกัน → hard reload → วนแบบนี้ไปเรื่อยๆ

## วิธีแก้ (แก้แล้ว หายสนิท)

```powershell
# ปิด dev server ก่อน แล้วค่อยลบ ห้ามลบขณะรัน
Remove-Item -Recurse -Force C:\Project\ac-maintenance\.next
# แล้วสตาร์ท dev server ใหม่
```

หลังทำ: `navigation.type` กลับเป็น `"navigate"` · หน้าอยู่นิ่งเกิน 30 วินาทีไม่ขยับ · log เหลือ `GET /tech/assets` แค่ครั้งเดียว · dev server กิน RAM 1.2 GB (จาก 2.3 GB)

**แท็บที่เปิดค้างไว้ต้องกด Ctrl+Shift+R หนึ่งครั้ง** เพราะยังถือ client ตัวเก่าที่ build id ไม่ตรงอยู่

## กฎที่ได้เพิ่ม

ต่อจากกฎเดิม "ห้ามรัน `npm run build` ขณะ dev server ทำงาน" — **ย้ายหรือเปลี่ยนชื่อไฟล์ที่ dev server คอมไพล์ไปแล้ว ให้ปิด dev server ก่อน** หรืออย่างน้อยหลังย้ายเสร็จให้ปิด → ลบ `.next` → เปิดใหม่ · การรีสตาร์ทเฉยๆ **ไม่พอ** เพราะ `.next` ที่เสียยังอยู่ (รอบนี้รีสตาร์ทไป 2 ครั้งก็ยังวนอยู่)

---

# ✅ ปิดงานค้าง 3 ข้อสุดท้าย (4 ก.ย. 2026, DoubleKill)

เหลือแต่ข้อ `AUTH_URL` + SMTP ที่เจ้าของโปรเจกต์สั่งพักไว้ก่อน (ต้องใช้โดเมนจริงกับ credential ของมหาวิทยาลัย)

## 1. คอลัมน์สถานที่ไม่พิมพ์ชื่ออาคารซ้ำแล้ว

ทุกหน้าจัดกลุ่มตามอาคารไปหมดแล้ว แต่ทุกแถวยังพิมพ์ชื่ออาคารซ้ำอีกรอบ ทั้งที่หัวกลุ่มเหนือมันบอกอยู่แล้ว — ในคอลัมน์แคบๆ ของกระดานใบงานมันตัดบรรทัดยาว 3 บรรทัดเพื่อบอกสิ่งที่รู้อยู่แล้ว

**วิธีแก้:** เพิ่ม option `withBuilding` ใน `formatUnitLocation()` แล้วให้ mapper ส่ง **`roomLocation`** มาคู่กับ `location` เดิม

```ts
location:     "Administration Building 293183 (B467711) - ห้อง 7-970896 (ชั้น 7)"  // เหมือนเดิม
roomLocation: "ห้อง 7-970896 (ชั้น 7)"                                              // ใหม่
```

- **`location` เดิมไม่ถูกแตะเลย** — ยังใช้กับหน้าที่โชว์เครื่องเดี่ยวๆ (โมดัลใบงาน · โมดัลปฏิทิน · ผลสแกน QR · หน้า QR สาธารณะ · โมดัลประวัติ) และ**ยังเป็นตัวที่การค้นหาเทียบอยู่** พิมพ์ชื่ออาคารในช่องค้นหาจึงยังเจอเหมือนเดิม รวมถึงตัวกรองอาคารฝั่งช่างที่ match กับสตริงนี้
- ที่เปลี่ยนมาใช้ `roomLocation` คือ 6 จุดที่จัดกลุ่มแล้ว: ตารางรอซ่อมด่วน · กระดานใบงาน · ฝั่งช่างทั้ง 4 หน้า
- **ไม่มีการ parse สตริงกลับ** — คำนวณจาก helper ตัวเดียวกันตั้งแต่ต้นทาง ตามกฎที่ตั้งไว้ว่าอย่าแกะสตริงที่ประกอบไว้เพื่อแสดงผล
- `overview-panel.tsx` เคยประกอบสตริงเองด้วย template `` `${b.name} - ห้อง ${r.name}` `` ตอนนี้เรียก helper แทน เหลือที่ประกอบเองศูนย์จุด

## 2. ปฏิทินพิมพ์คำว่า "ห้อง" แล้ว

`/api/admin/maintenance-schedules` เคยส่ง `withRoomLabel: false` อยู่จุดเดียวในระบบ ทำให้ปฏิทินเขียน `อาคาร - 4-568994` ส่วนอีก 3 รูปแบบเขียน `อาคาร - ห้อง 4-568994` · คอมเมนต์หัวไฟล์ `location.ts` ตั้งข้อสังเกตไว้เองว่า "ดูเหมือนหลุดมากกว่าตั้งใจ" — รอบนี้เคาะให้เหมือนกันหมด **เหลือรูปแบบเดียวคือมี "ห้อง" เสมอ** และแก้คอมเมนต์หัวไฟล์ให้ตรงกับความจริงใหม่

## 3. ลบ `components/examples/` ทิ้งทั้งโฟลเดอร์

เหลือ `c-pagination-3.tsx` ไฟล์เดียวหลังจาก `c-file-upload-4.tsx` ถูกย้ายไปเป็น `tech/photo-upload.tsx` · grep แล้วไม่มีใคร import เลย (มีแต่คอมเมนต์ที่อ้างถึงชื่อเก่า) ลบแล้ว **โฟลเดอร์ `examples/` หายไปทั้งโฟลเดอร์** — ปิดคำถามที่ค้างกับ Esther03u มา 2 รอบ

## ทดสอบผ่านหน้าจอจริง

| จุด | ก่อน | หลัง |
|---|---|---|
| กระดานใบงาน | `Administration Building 293183 (B467711) - ห้อง 1-846367` ตัด 3 บรรทัด | `ห้อง 1-846367` บรรทัดเดียว |
| ตารางรอซ่อมด่วน | ชื่ออาคารซ้ำทุกแถว | `ห้อง 1-846367` |
| ฝั่งช่าง "แอร์ทั้งหมด" | ชื่ออาคารเต็ม | `ห้อง 7-970896` |
| ฝั่งช่าง "งานของฉัน" | ชื่ออาคาร + ตัวย่อ + ห้อง + ชั้น | `ห้อง 1-19179 (ชั้น 1)` — **ชั้นยังอยู่** |
| ปฏิทิน (API) | `Administration Building 293183 - 4-568994` | `Administration Building 293183 - ห้อง 4-568994` |

- ค้นหาด้วยชื่ออาคารบนกระดานใบงาน `Dormitory` → 16 ใบ · ด้วยรหัสแอร์เต็ม → 1 ใบ · ล้างคำค้น → 58 ใบ **ยังทำงานเหมือนเดิมทุกอย่าง**
- ตัวกรองอาคารฝั่งช่างยังใช้ได้ (เลือก 293183 → เหลือกลุ่มเดียว · เลือก Dormitory → ไม่มีงาน · `ทุกอาคาร` → กลับมา 2 กลุ่ม)
- `tsc --noEmit` ผ่าน 0 error

---

# 🏢➜🚪 เพิ่มชั้นห้องระหว่างอาคารกับเครื่อง (5 ก.ย. 2026, DoubleKill)

เจ้าของโปรเจกต์สั่งว่า **กดอาคาร → เห็นห้อง → กดห้อง → ถึงจะเห็นแอร์ของห้องนั้น** และให้ทำเหมือนกันทุกหน้าที่จัดกลุ่มแบบนี้

## คอมโพเนนต์ใหม่ `RoomGroupList` (อยู่ไฟล์เดียวกับ `BuildingGroupList`)

- `groupByRoom()` จัดกลุ่มด้วย **`roomId` ไม่ใช่ชื่อห้อง** — ชื่อห้องซ้ำกันข้ามอาคารได้ (เหตุผลเดียวกับที่อาคารใช้ id)
- หน้าตา**เบากว่าหัวอาคารตั้งใจ** (ตัวเล็กกว่า ไอคอน `DoorClosed` พื้นการ์ดต่างกัน) ไม่งั้นจะกลายเป็นแถบหน้าตาเหมือนกันซ้อนกันสองชั้นจนดูไม่ออกว่าอันไหนอยู่ในอันไหน
- กติกาเดิม: ปิดหมดตอนเริ่ม เปิดได้ทีละห้อง ห้องที่ไม่มีของไม่โผล่
- **ห้องเดียวในอาคารเปิดให้เอง** — ค้นหาจนเหลือเครื่องเดียวแล้วต้องมาเจอแถบพับซ้อนแถบพับอีกทีไม่มีประโยชน์ · แต่ยังกดปิดได้ (ใช้ sentinel `"none"` แยกจาก "ยังไม่ได้เลือก" ไม่งั้นกดปิดแล้วมันเด้งเปิดเอง)
- **ไม่มีแบ่งหน้าในชั้นห้อง** — อาคารแบ่งหน้าเพราะมีเยอะ ส่วนห้องในอาคารเดียวมีไม่กี่ห้อง และ pager ซ้อน pager จะกลายเป็นปริศนาเอง

## field ที่เพิ่ม

`roomId` / `roomName` เดินทางมากับแถวเหมือนที่ `buildingId` / `buildingName` ทำ (+ `floor` ในแถวใบงานฝั่งช่าง) · จุดที่ต้องแก้ select เพิ่ม `id` ของ room: `work-order-board.ts` และ `maintenance.ts` — ส่วน `job-rows.ts` ใช้ `include` อยู่แล้วจึงได้มาเอง

## ผลพลอยได้: ตัดข้อมูลซ้ำออกอีกชั้น

หัวห้องบอกห้องอยู่แล้ว แถวข้างในเลยไม่ต้องบอกซ้ำ (เหตุผลเดียวกับที่รอบก่อนตัดชื่ออาคารออกจากแถว)

| หน้า | เดิม | ใหม่ |
|---|---|---|
| กระดานใบงาน | คอลัมน์ "สถานที่ตั้ง / ยี่ห้อ" | **"ยี่ห้อ / ขนาด"** เหลือแค่ยี่ห้อ |
| ตารางรอซ่อมด่วน | คอลัมน์ "สถานที่ / รุ่นแอร์" | **"รุ่นแอร์"** |
| จัดการ QR Code | มีคอลัมน์ "ห้อง" | **ตัดคอลัมน์ทิ้ง** |
| การ์ดฝั่งช่างทั้ง 4 หน้า | บรรทัดบนสุดเป็นชื่อห้อง | ตัดออก เหลือรหัสแอร์ + ยี่ห้อ |

**ชั้นไม่ได้หายไปไหน** — ย้ายไปอยู่บนหัวห้องแทน (`ชั้น 1 • 4 แอร์`) โดยเพิ่ม `floor` ให้แถวใบงานฝั่งช่างที่เดิมไม่มี

## หัวห้องบอกจำนวนแยกตามประเภทด้วย

เจ้าของโปรเจกต์สั่งเพิ่มหลังเห็นของจริง: หัวห้องเดิมบอกแค่ "N รายการ" ตอนนี้มีป้ายแยกประเภทเหมือนหัวอาคาร

- **ตารางรอซ่อมด่วน** — ซ่อมด่วน / ค้างล้าง / กำหนดล้าง
- **กระดานใบงาน** — งานซ่อม / งานล้างแอร์ / รอดำเนินการ / กำลังดำเนินการ
- **ฝั่งช่าง "แอร์ทั้งหมด"** — ไอคอนประแจ/หยดน้ำ พร้อมจำนวน เหมือนหัวอาคาร

**ดึงป้ายออกมาเป็นคอมโพเนนต์เดียวใช้ทั้งสองชั้น** (`GroupTypeBadges` / `GroupJobBadges`) ไม่ใช่ก๊อปโค้ดไปวางอีกชุด — สองชั้นที่สรุปแถวชุดเดียวกันต้องพูดตรงกัน และวิธีที่มันจะเริ่มไม่ตรงกันคือมีคนแก้แค่ชั้นเดียว

**3 หน้าที่ไม่ได้ใส่ เพราะไม่มีประเภทให้นับ:** จัดการ QR Code (ไม่มีสถานะงาน) และฝั่งช่าง งานทั้งหมด/งานของฉัน/ประวัติ (การ์ดใบงานไม่ได้แสดงประเภทงานอยู่แล้ว จะนับของที่หน้าจอไม่เคยบอกก็แปลก)

## ทดสอบผ่านหน้าจอจริงครบ 7 หน้า

| หน้า | ผล |
|---|---|
| `/admin` ตารางรอซ่อมด่วน | ✅ 10 ห้อง รวม 2+4+1+2+1+2+3+3+2+3 = **23 ตรงกับยอดอาคาร** · กดห้อง 1-846367 เห็น 4 เครื่อง · ป้ายห้องนั้นขึ้น ซ่อมด่วน 3 + ค้างล้าง 1 = 4 ตรงกับยอดห้อง |
| `/admin/work-orders` | ✅ 9 ห้อง รวม **20 ตรงกับยอดอาคาร** · กดห้อง 7-970896 เห็น 3 ใบงาน · **ตรวจทุกห้องด้วยสคริปต์: งานซ่อม + งานล้างแอร์ = ยอดของห้องนั้นครบทั้ง 9 ห้อง** |
| `/admin/qr-codes` | ✅ ห้อง + จำนวนเครื่อง · คอลัมน์ "ห้อง" หายไปแล้ว · ปุ่ม "เลือกทั้งอาคาร" ยังทำงาน |
| `/tech/assets` | ✅ `ห้อง 1-846367 / ชั้น 1 • 4 แอร์` |
| `/tech` งานทั้งหมด | ✅ `ชั้น 1 • 3 ใบงาน` |
| `/tech/my-jobs` | ✅ `ห้อง 7-970896 / ชั้น 7 • 2 ใบงาน` |
| `/tech/history` | ✅ ห้องเดียว **เปิดให้อัตโนมัติ** เห็นรหัสแอร์ทันที |

`/admin/assets` ไม่ต้องแก้ — เป็นอาคาร→ห้อง→เครื่องอยู่แล้วตั้งแต่ต้น · `tsc --noEmit` ผ่าน 0 error

---

# 🏢➜🪜➜🚪 แทรกชั้นเข้าไประหว่างอาคารกับห้อง (5 ก.ย. 2026, DoubleKill)

**อาคาร → ชั้น → ห้อง → เครื่อง** ครบทั้ง 8 หน้า · เจ้าของโปรเจกต์ยืนยัน 2 ข้อก่อนเริ่ม: **ชั้นเป็นตัวเลขล้วน** และ **4 ระดับไม่ลึกไป** เพราะของจริง 1 ชั้นมีได้ถึง 11 ห้อง

## ไม่ต้องแตะฐานข้อมูลเลย

`rooms.floor` (`Int?`) มีอยู่แล้วตั้งแต่ต้น แค่ไม่เคยเอามาจัดกลุ่ม — ที่ผ่านมาเอาไปโชว์เฉยๆ · **ไม่มี migration ไม่มีตาราง `floors`** และไม่ต้องมี ตราบใดที่ชั้นยังเป็นตัวเลข (ถ้าวันหนึ่งต้องมี G / ชั้นลอย / B1 ค่อยคุยกันใหม่ — ทางเลือกสองแบบจดไว้ในบทสนทนาแล้ว: เปลี่ยนคอลัมน์เป็น label+order หรือทำตาราง `floors` จริง)

## `FloorGroupList` + `groupByFloor()`

- **เรียงด้วยตัวเลข ไม่ใช่ตัวอักษร** — เรียงแบบ string แล้วชั้น 10 จะมาก่อนชั้น 2
- ห้องที่ยังไม่มีชั้น → กอง **"ไม่ระบุชั้น" เรียงท้ายสุดเสมอ** เพราะเป็นของที่ต้องไปตามแก้ ไม่ใช่ของที่ควรกลืนไปกลางลิสต์ (ตอนนี้ยังเป็น 0 ห้อง)
- **น้ำหนักหน้าตาอยู่กึ่งกลาง** ระหว่างหัวอาคาร (การ์ดทึบ ชิปสีหลัก) กับหัวห้อง (เบาสุด) — สามแถบซ้อนกันต้องอ่านออกว่าเป็นคนละชั้นความลึก ไม่ใช่ของสามอันเหมือนกัน
- หัวชั้นบอก `3 ห้อง • 7 ใบงาน` และมีป้ายแยกประเภทชุดเดียวกับหัวอาคาร/หัวห้อง (คอมโพเนนต์เดิม ไม่ได้ก๊อป)

## เปิดอัตโนมัติเมื่อเหลืออันเดียว — ทำครบทั้ง 3 ระดับ

ต้นไม้ลึก 4 ชั้นแล้ว ทุกคลิกที่ประหยัดได้ควรประหยัด · ตอนนี้ **อาคาร ชั้น และห้อง เปิดให้เองถ้ามีอันเดียว** เช่นหน้าประวัติของช่างที่มีงานเดียว: กดอาคาร → เห็นรหัสแอร์เลยโดยไม่ต้องกดต่ออีก 2 ที · ยังกดปิดได้ทุกระดับ (ใช้ sentinel `"none"` แยกจาก "ยังไม่ได้เลือก")

## 🔴 บั๊กที่เจอระหว่างทำ — แก้แล้ว

`formatUnitLocation()` เขียน `ชั้น ${room.floor || 1}` → **ห้องที่ไม่ได้กรอกชั้นถูกแสดงว่าอยู่ชั้น 1** และ**ชั้น 0 (ชั้นล่าง) ก็กลายเป็นชั้น 1 ด้วย** · ตอนที่ชั้นเป็นแค่ของประดับยังพอทน แต่พอเอามาเป็นตัวนำทางแล้วมันคือพาไปผิดชั้น · แก้เป็น `!= null` แล้วไม่มีชั้นก็ไม่พิมพ์

**ทำให้ช่องชั้นบังคับกรอกด้วย** (`rooms.ts` + ฟอร์มเพิ่มห้อง) ไม่งั้นห้องใหม่จะตกไปกอง "ไม่ระบุชั้น" แล้วหาไม่เจอ · ห้องเก่าที่ชั้นว่างไม่ถูกแตะ

## ทดสอบผ่านหน้าจอจริงครบ 8 หน้า

| หน้า | ผล |
|---|---|
| `/admin` รอซ่อมด่วน | 5 ชั้น · ห้อง 3+1+1+3+2 = **10** · รายการ 7+2+1+8+5 = **23 ตรงกับยอดอาคาร** |
| `/admin/work-orders` | 4 ชั้น · ห้อง 3+1+3+2 = **9** · ใบงาน 6+2+7+5 = **20 ตรงกับยอดอาคาร** |
| `/admin/assets` | อาคาร → ชั้น → ห้อง → การ์ดเครื่อง (แต่ก่อนข้ามชั้น) |
| `/admin/qr-codes` | `ชั้น 1 • 3 ห้อง • 7 เครื่อง` |
| `/tech/assets` | `ชั้น 6 • 3 ห้อง • 8 แอร์` พร้อมป้ายซ่อม/ล้าง |
| `/tech` งานทั้งหมด | 4 ชั้น รวม 17 ใบงาน |
| `/tech/my-jobs` | `ชั้น 1 • 1 ห้อง • 1 ใบงาน` |
| `/tech/history` | ชั้นเดียว ห้องเดียว → **เปิดทะลุถึงรหัสแอร์ให้เลย** |

`tsc --noEmit` ผ่าน 0 error

---

# 🗓️ ปฏิทิน — ใส่เลขชั้นให้เห็น แต่ไม่แยกเป็นระดับ (6 ก.ย. 2026, DoubleKill)

เจ้าของโปรเจกต์สั่งตรง: **"หน้านี้ไม่ต้องแยกชั้นแต่ให้เพิ่มเลขชั้นเข้าไปให้เห็น"** — และนั่นถูกแล้ว ปฏิทินไม่ควรได้ระดับชั้นแบบที่ลิสต์ 8 หน้าได้ไป เพราะ **ตารางเดือนไม่มีที่ให้ซ้อนอีกชั้น** และแผงรายวันเป็นลิสต์แบนโดยตั้งใจ — มันตอบคำถาม "วันนี้มีอะไรถึงกำหนด" ซึ่งเป็นคำถามที่ชั้นไม่ได้ช่วยกรองให้แคบลง · ชั้นจึงไปเกาะกับชื่อห้องแทนที่จะกลายเป็นระดับ: `ห้อง 5-883136 (ชั้น 5)`

## เดินผ่าน `formatUnitLocation` ทุกจุด ไม่ต่อ string เอง

ปฏิทินเป็นที่เดียวที่ยังต่อ `ห้อง {roomName}` ด้วยมือ 2 จุด ทั้งที่ `src/lib/location.ts` ตั้งขึ้นมาเพื่อเลิกทำแบบนี้ตั้งแต่ 4 ก.ย. · เพิ่ม helper `roomWithFloor()` ตัวเดียวในไฟล์ ให้ทุกจุดเรียกผ่าน `formatUnitLocation({ withBuilding: false, withFloor: true })` ชั้นเลยสะกดเหมือนกันหมดทั้งระบบ ไม่มีสำเนียงที่ 5 โผล่มาอีก

**4 จุดที่เห็นชั้นแล้ว:**

| จุด | ผลลัพธ์ |
|---|---|
| แผงรายวัน (Sheet ด้านขวา) | `Dormitory Building 590333 • ห้อง 5-883136 (ชั้น 5)` |
| โมดัลรายอาคาร (กดชิปในช่องวันที่) | `ห้อง 1-747465 (ชั้น 1)` — ไม่ซ้ำชื่ออาคารเพราะหัวโมดัลบอกแล้ว |
| โมดัลรายละเอียดงาน | `สถานที่: Dormitory Building 590333 - ห้อง 5-883136 (ชั้น 5)` (มาจาก `location` ของ API) |
| ดรอปดาวน์ "ห้อง" | `Dormitory Building 590333 • 5-883136 (ชั้น 5)` — ไม่ใส่คำว่า "ห้อง" ซ้ำ เพราะ label ของช่องบอกอยู่แล้ว |

## เรียงดรอปดาวน์ใหม่: อาคาร → ชั้น → ห้อง

เดิมเรียงตาม label ตัวอักษรล้วน ซึ่ง**ไม่มีปัญหาตอนที่ชั้นยังมองไม่เห็น** · พอทุกบรรทัดโชว์ชั้นแล้ว ลำดับที่ไล่ ชั้น 3 → ชั้น 1 → ชั้น 3 จะอ่านเหมือนของเสีย ทั้งที่มันเรียงถูกตามกติกาเดิม · **การทำของให้มองเห็นได้ ทำให้ลำดับเดิมกลายเป็นบั๊กขึ้นมา** เลยต้องแก้พร้อมกัน

อาคารยังเป็น key แรกเสมอ ไม่งั้นตอนเลือก "ทุกอาคาร" มันจะเอาคนละอาคารมาสลับกันตามชั้น · ห้องไม่มีชั้นไปท้ายสุด**ในอาคารของตัวเอง** เหมือนที่ลิสต์แบบกลุ่มทำ

## ที่แก้เพิ่มระหว่างทาง

- `route.ts` — เพิ่ม `floor` เข้า select และส่งออกมาเป็น field ใหม่ พร้อมให้ `location` ใส่ `withFloor: true`
- ลบคอมเมนต์เก่าที่ค้าง: `// The only view that leaves out the "ห้อง" label — preserved as it was.` **ไม่จริงมาตั้งแต่ 4 ก.ย. แล้ว** ตอนที่ปฏิทินเลิกตัดคำว่า "ห้อง" ทิ้ง — คอมเมนต์ที่โกหกอันตรายกว่าไม่มีคอมเมนต์

API ตัวนี้มีผู้ใช้รายเดียวคือ `maintenance-calendar.tsx` และคอมโพเนนต์นี้ใช้ร่วมกันทั้ง `/admin/calendar` และ `/tech/calendar` — แก้ที่เดียวได้ทั้งสองหน้า · ทดสอบผ่านหน้าจอจริงครบ 4 จุด เทียบกับ DB แล้วตรง (ห้อง `5-883136` = ชั้น 5, `1-747465` = ชั้น 1) · `tsc --noEmit` ผ่าน 0 error ไม่มี error ใน console

---

# 🗂️ `/admin/assets` — หุบอาคารไว้ก่อนเหมือนหน้าอื่น (6 ก.ย. 2026, DoubleKill)

หน้านี้เป็นหน้าเดียวที่ยัง **กางอาคารแรกทิ้งไว้ตอนเปิดเข้ามา** เพราะมันมีมาก่อน `BuildingGroupList` เลยไม่ได้ตามกฎเดียวกับอีก 7 ลิสต์ (`useState(buildings[0]?.id)`) · ผลคืออาคารที่เหลืออีก 4 ถูกดันหายไปใต้ ~20 แถวของอาคารที่บังเอิญมาก่อนตามตัวอักษร — และหลังใส่ระดับชั้นเข้าไปเมื่อ 5 ก.ย. ก็ยิ่งดันหนักกว่าเดิมอีกชั้น · ตอนนี้ทั้ง 5 อาคารพอดีหน้าจอเดียว

**ยกกฎเดียวกับ `BuildingGroupList` มาทั้งชุด** ไม่ใช่แค่เปลี่ยนค่าเริ่มต้น: sentinel `"none"` แยก "ปิดเอง" ออกจาก "ยังไม่ได้เลือก" และ **อาคารเดียวเปิดให้อัตโนมัติ** — ถ้าไม่แยกสองอย่างนี้ อาคารเดียวที่ผู้ใช้กดปิดจะเด้งกลับมาเปิดเองทันที

## 🔴 กับดักที่เกือบพลาด — ปิดอาคารแล้วค่อยค้นหา

ถ้าเช็ค `"none"` แล้วจบเลย จะได้บั๊กเดิมกลับมา: **ปิดอาคาร → พิมพ์ค้นหา → ผลลัพธ์โผล่มาแบบหุบ หน้าเลยดูเหมือนว่างเปล่า** ซึ่งคือบั๊กที่ auto-open ตอนค้นหาถูกใส่เข้ามาเพื่อแก้พอดี · แก้ด้วยการ **ล้าง state ทิ้งเมื่อคำค้นเปลี่ยน** (ต่อท้าย effect ที่รีเซ็ตเลขหน้าอยู่แล้ว) การกดปิดจะได้ไม่มีอายุยืนกว่าลิสต์ที่มันถูกกดปิด · ทดสอบครบทั้ง 4 ทาง: เปิดครั้งแรก / กดเปิด-ปิด / ปิดแล้วค้นหา / ปิดตอนอยู่ในผลค้นหา

## 🔴 บั๊กแถมที่เจอตอนทดสอบ — บรรทัดเดียวแต่ขัดกันเอง

ลิงก์ `/admin/assets?q=<รหัสแอร์>` ขึ้นว่า **"1 ห้อง • 22 แอร์"** — ครึ่งซ้ายนับจากห้องที่กรองแล้ว ครึ่งขวาเป็นยอดทั้งอาคารจาก `unitsCount` ของ server · **เลขสองตัวในบรรทัดเดียวกันตอบคนละคำถาม** · ตอนไม่ได้กรองมันเท่ากันพอดีเลยไม่มีใครเห็นมาก่อน · แก้ให้นับจาก `b.rooms` ทั้งคู่ เหมือนที่หัวชั้นทำอยู่แล้ว — ตอนไม่กรองเลขเท่าเดิมทุกตัว (23/7/22/12/9 = 73 ตรงกับ DB)

`tsc --noEmit` ผ่าน 0 error · ไม่มี error ใน console

---

# ☑️ QR Code — เลือกทั้งชั้น / เลือกทั้งห้อง (6 ก.ย. 2026, DoubleKill)

เดิมมีแค่ **"เลือกทั้งอาคาร"** ระดับเดียว · หลังใส่ชั้นเข้าไปเมื่อ 5 ก.ย. ช่องว่างมันชัดขึ้น: จะพิมพ์สติกเกอร์ทั้งชั้นทีเดียวไม่ได้เลย ต้องกางทุกห้องแล้วไล่ติ๊กทีละเครื่อง · **ไม่ต้องแตะ `building-groups.tsx`** เพราะ `FloorGroupList` กับ `RoomGroupList` รับ `renderExtra` อยู่แล้วตั้งแต่ตอนสร้าง — แก้อยู่ในไฟล์ `qr-code-manager.tsx` ไฟล์เดียว

`toggleSelectAllInGroup()` ก็ไม่ต้องแก้ เพราะมันรับอะไรก็ได้ที่มี `items` มาตั้งแต่แรก — กลุ่มชั้นและกลุ่มห้องเข้าเงื่อนไขนั้นพอดี

## รวมเหลือคอมโพเนนต์เดียว `SelectAllToggle`

อาคาร ชั้น ห้อง ล้วนแปลว่า "เอาทุกเครื่องที่อยู่ใต้หัวข้อนี้" เหมือนกันหมด จึงเป็นคอมโพเนนต์เดียวที่ใส่ label ต่างกัน ไม่ใช่ก๊อป 3 ชุดที่รอวันเพี้ยนออกจากกัน

## ⭐ หัวใจอยู่ที่สถานะ "เลือกบางส่วน" (indeterminate)

ต้นไม้ 4 ระดับที่ **ติ๊กได้ทุกระดับ** จะใช้งานไม่ได้เลยถ้าไม่มีสถานะนี้ — ติ๊กห้องเดียวแล้วชั้นกับอาคารข้างบนยังว่างเปล่า **ชั้นที่เลือกไปแล้วบางส่วนจะหน้าตาเหมือนชั้นที่ยังไม่ได้แตะเลย** วิธีหาของที่ตัวเองเลือกไว้คือต้องไล่กางทุกชั้นทีละชั้น

`indeterminate` เป็น DOM property ที่**ไม่มี HTML attribute รองรับ** JSX เลยเซ็ตไม่ได้ ต้องเขียนลงบน node ตรงๆ ผ่าน `ref` · ทดสอบแล้ว: เลือก 1 เครื่อง → ห้อง/ชั้น/อาคาร ขึ้น indeterminate ครบสายทั้ง 3 ระดับ

## ลบเช็คบ็อกซ์ที่ซ้ำออก 1 อัน

หัวตารางในห้องมีเช็คบ็อกซ์ "เลือกทั้งหมด" อยู่แล้วแบบไม่มีป้ายกำกับ · พอมี **"เลือกทั้งห้อง"** บนหัวห้องที่อยู่เหนือมันแค่ไม่กี่พิกเซล มันก็คือปุ่มเดียวกัน สถานะเดียวกัน ทำงานเหมือนกันเป๊ะ · เก็บอันบนหัวห้องไว้เพราะ **บอกว่าตัวเองทำอะไร และกดได้โดยไม่ต้องกางห้องก่อน** (ถ้าอยากได้กลับคืนบอกได้ ใส่คืนบรรทัดเดียว)

## ทดสอบผ่านหน้าจอจริง

| กด | ผล |
|---|---|
| เลือกทั้งห้อง (2 เครื่อง) | ห้อง ✅ · ชั้น/อาคาร = เลือกบางส่วน · ห้องอื่นไม่ขยับ |
| เลือกทั้งชั้น (ชั้น 1) | **7 รายการ** ตรงกับ `3 ห้อง • 7 เครื่อง` · 3 ห้อง ✅ ครบ · ชั้นอื่นไม่ขยับ |
| เลือกทั้งอาคาร | **23 รายการ** ตรงกับยอดอาคาร · ทุกชั้นทุกห้อง ✅ |
| ติ๊กเครื่องเดียวในตาราง | ห้อง/ชั้น/อาคาร = เลือกบางส่วน ทั้ง 3 ระดับ |

`tsc --noEmit` ผ่าน 0 error · ไม่มี error ใน console

---

# 🖼️ ปุ่มเปลี่ยนรูปโปรไฟล์ (6 ก.ย. 2026, DoubleKill)

**backend ทำไว้ครบตั้งแต่แรกแล้ว ขาดแต่ UI** — คอลัมน์ `users.avatar_url` มีอยู่, `saveUpload()` ถูกย้ายออกมาไว้ที่ `src/lib/upload.ts` เพื่อให้รูปโปรไฟล์เรียกใช้ได้, `updateProfileAction()` รับพารามิเตอร์ที่ 3 เป็น `avatarFile` พร้อมลบรูปเก่าทิ้งให้, `next.config.ts` ปรับ `bodySizeLimit` เผื่อรูปโปรไฟล์ไว้แล้ว และ `pages.ts` ทั้งฝั่ง admin/tech ก็ส่ง `profile.avatarUrl` มาให้อยู่แล้ว · **งานรอบนี้จึงเป็น UI ล้วน ไม่มี migration ไม่แตะ action**

## เลือกรูปแล้วยังไม่อัปโหลดทันที — และต้องบอกให้ชัด

`updateProfileAction` เขียนชื่อ เบอร์ และรูป **ในคอลเดียว** รูปจึงขึ้นไปพร้อมกับปุ่ม "บันทึกการเปลี่ยนแปลง" ไม่ใช่ตอนเลือกไฟล์ · กับดักของดีไซน์แบบนี้คือ **ภาพบนจอเปลี่ยนทันทีจนคนอ่านว่า "เสร็จแล้ว"** แล้วปิดหน้าไปโดยไม่กดบันทึก · จึงมีแถบแจ้งชัดๆ ว่า *"เลือกรูปใหม่แล้ว — กด บันทึกการเปลี่ยนแปลง ด้านล่างเพื่อยืนยัน"* พร้อมปุ่มยกเลิกรูปที่เลือก

## รายละเอียดที่ต้องระวัง

- **blob: URL ต้อง revoke** ไม่งั้นเลือกรูป 5 ครั้งก็ค้างในหน่วยความจำ 5 รูปตลอดอายุหน้า
- **ล้าง `input.value` หลังใช้** ไม่งั้นเลือกไฟล์เดิมซ้ำจะไม่เกิด change event
- **หลังบันทึกสำเร็จ preview ยังอยู่** ไม่เคลียร์ทิ้ง เพราะมันคือรูปเดียวกับที่เพิ่งเซฟ ถ้าเคลียร์ทันทีรูปจะกระพริบกลับไปเป็นอันเก่าระหว่างรอข้อมูลใหม่จาก server
- **เช็คชนิดไฟล์กับขนาด 8 MB ฝั่ง client ด้วย** ใช้ข้อความเดียวกับฝั่ง server เป๊ะ — เป็นการอำนวยความสะดวก ไม่ใช่ตัวป้องกัน ฝั่ง server ยังเช็คเหมือนเดิม
- `unoptimized` เฉพาะตอน src เป็น `blob:` เพราะ blob ไม่มีทางผ่าน image optimiser ส่วนรูปที่เก็บแล้วให้ผ่านตามปกติ

## แถบผู้ใช้มุมซ้ายล่างก็ต้องเปลี่ยนตาม

ในระบบมีที่แสดงรูปโปรไฟล์ 2 จุด — การ์ดโปรไฟล์กับชิปในไซด์บาร์ · **ถ้าอัปโหลดแล้วชิปยังเป็นตัวย่อชื่ออยู่ มันอ่านว่าอัปโหลดไม่สำเร็จ** จึงร้อย `avatarUrl` เข้าไปใน `user` ของ `pages.ts` ทั้งสองฝั่ง แล้วส่งต่อผ่าน `admin-shell` / `tech-shell` → `dashboard-layout` (ทั้งสองจุด fallback เป็นตัวย่อชื่อเหมือนเดิมถ้ายังไม่เคยตั้งรูป)

## ทดสอบผ่านหน้าจอจริง

| กรณี | ผล |
|---|---|
| เลือกรูป | preview ขึ้นทันที + แถบเตือนให้กดบันทึก · ชิปไซด์บาร์ยังไม่เปลี่ยน (ถูกต้อง ยังไม่ได้เซฟ) |
| กดบันทึก | DB ได้ `/uploads/...jpg` · ชิปไซด์บาร์เปลี่ยนตามทันทีผ่าน revalidate |
| โหลดหน้าใหม่ | ทั้ง 64px และ 32px โหลดผ่าน `/_next/image` สำเร็จ |
| เลือกไฟล์ `.txt` | ขึ้น "รูปโปรไฟล์ต้องเป็นไฟล์รูปภาพเท่านั้น" ไม่ส่งขึ้น server |
| อัปโหลดทับรูปเดิม | **ไฟล์เก่าถูกลบจริง** เหลือไฟล์เดียวใน `public/uploads/` |
| `/tech/profile` | ปุ่มขึ้นเหมือนกัน ไม่มีช่องเบอร์โทร (ตาม `showPhone={false}` เดิม — **เปิดใช้แล้ว 6 ก.ย.**) |

`tsc --noEmit` ผ่าน 0 error · ไม่มี error ใน console · **ล้างข้อมูลทดสอบคืนแล้ว** (`avatar_url` กลับเป็น NULL ทุกแถว, ลบไฟล์ที่อัปโหลดทดสอบออกจาก `public/uploads/`)

---

# 🕘 ช่างกดดูประวัติแอร์รายเครื่องได้แล้ว (6 ก.ย. 2026, DoubleKill)

**เกือบทั้งหมดต่อสายไว้อยู่แล้ว** — `AcHistoryModal` ถูก render อยู่ใน `tech-shell` แล้ว, `openHistoryFor` มีอยู่ใน context แล้ว, และ `getAirConditionerHistory()` **ไม่ได้ guard ด้วย `verifyOrgAdmin`** อยู่แล้ว (guard แค่ว่ามี session ที่ active เพราะประวัติชุดเดียวกันนี้เปิดสาธารณะอยู่บนหน้า QR อยู่แล้ว) · ที่ขาดคือ **หน้า `/tech/assets` ไม่เคยเรียก `openHistoryFor`** — มีที่เดียวคือ `/tech/history` · แก้ 2 ไฟล์ ไม่แตะ backend

## ทำเป็นปุ่มจริง ไม่ใช่กดทั้งการ์ด

`/tech/history` เปิดโมดัลตัวเดียวกันด้วยการ **กดทั้งการ์ด** ซึ่งไม่มีอะไรบอกเลยว่ากดได้นอกจาก `cursor-pointer` · การ์ดในหน้า `/tech/assets` มีทั้งริบบิ้นสถานะและชิปยี่ห้ออยู่แล้ว ถ้าทำให้ทั้งใบกดได้ยิ่งเดาไม่ออกว่ากดแล้วเกิดอะไร · จึงใส่**ปุ่ม "ดูประวัติ" พร้อมไอคอนนาฬิกา** หน้าตาและข้อความเดียวกับปุ่มในหน้าระบบสินทรัพย์ฝั่งแอดมิน เพราะมันเปิดโมดัลตัวเดียวกันเป๊ะ · วางในแถวล่างของการ์ดที่เป็น `justify-between` อยู่แล้วแต่มีลูกแค่ตัวเดียว — ที่ว่างฝั่งขวารออยู่พอดี

## สิทธิ์แก้ไข log ยังคุมเหมือนเดิม

`AcHistoryModal` รับ `currentUserId` จาก `tech-shell` และ **ไม่ส่ง `isAdmin`** ช่างจึงเห็นปุ่ม "แก้ไข" เฉพาะรายการที่ตัวเองเป็นคนบันทึก (ฝั่ง server `updateMaintenanceLogAction` ก็ยังบังคับกฎเดิมอยู่แล้วไม่ว่า UI จะโชว์อะไร)

## ทดสอบผ่านหน้าจอจริง (ล็อกอินเป็นช่าง Craig Yost)

| เครื่อง | ผล |
|---|---|
| `B467711-1-19179-02` (log ของ Angelina) | 3 รายการ ตรงกับ DB เป๊ะทั้งชนิดงานและวันที่ · **ไม่มีปุ่มแก้ไขสักอัน** ถูกต้อง |
| `B467711-1-846367-01` (log ของ Craig เอง) | 5 รายการ · **มีปุ่มแก้ไขครบ 5 อัน** ถูกต้อง |

`tsc --noEmit` ผ่าน 0 error · ไม่มี error ใน console

> 🔎 **เจอระหว่างทาง:** โมดัลประวัติกด Escape ปิดไม่ได้ · **แก้แล้วในหัวข้อถัดไป**

---

# ⎋ กด Escape ปิดโมดัลได้แล้ว (6 ก.ย. 2026, DoubleKill)

โมดัลในโปรเจกต์นี้เขียนเป็น `div.fixed.inset-0` เองทั้งหมด ไม่ได้ใช้ Radix Dialog ที่จัดการเรื่องนี้ให้ — **Escape คือปุ่มที่คนกดโดยไม่ต้องมอง** ทุกตัวเลยบังคับให้ไปหากากบาทเอง · ทำเป็น hook `useEscapeToClose` ตัวเดียวที่ `src/hooks/use-escape-to-close.ts` ไม่ก๊อป `useEffect` ไปแปะทีละไฟล์ เพราะมีสิบกว่าตัวและรายละเอียดพวกนี้จะหายไปตั้งแต่ก๊อปครั้งที่ 4

## กฎที่ใช้: เปิดดู = ปิดด้วย Escape ได้ · มีของที่พิมพ์ไว้ = ไม่ได้

ใส่ให้เฉพาะโมดัลที่ **เอาไว้ดูอย่างเดียว** — ประวัติแอร์, โมดัลงานในปฏิทิน, โมดัลรายอาคารในปฏิทิน, ตัวอย่าง QR (ทั้ง 2 หน้า), ถังขยะ · **ฟอร์มไม่ใส่** (เพิ่มอาคาร/ห้อง/แอร์, แก้ไขแอร์, ตั้งรอบล้าง, สร้างใบงาน, มอบหมายงาน, บันทึกผลงานที่มีรูปแนบ) เพราะ Escape พลาดทีเดียวคือทิ้งของที่พิมพ์ไว้ทั้งหมด — **ตรงนั้นความปลอดภัยมีค่ามากกว่าความสะดวก**

## Escape ถอยทีละชั้น

โมดัลประวัติมีฟอร์มแก้ไข log ซ้อนอยู่ข้างใน ถ้าปิดทั้งแผงตั้งแต่กดครั้งแรก คนที่แก้ค้างไว้ครึ่งทางจะเสียงานและไม่มีทางยกเลิกเฉพาะการแก้ · ตอนนี้ **กดครั้งแรกยกเลิกการแก้ กดครั้งที่สองปิดแผง** · ถังขยะทำแบบเดียวกัน — Escape เก็บกล่องยืนยันลบถาวรก่อน ปุ่มที่แปลว่า "ไม่เอาแล้ว" จะได้ไม่ทิ้งคำสั่งลบถาวรค้างไว้แบบมองไม่เห็น

## รายละเอียดที่อยู่ใน hook

- **อ่าน `onClose` ผ่าน ref** เพราะทุกที่ส่ง arrow function เข้ามา ตัวตนเลยเปลี่ยนทุก render — ถ้าไม่ทำ listener จะถูกถอดแล้วใส่ใหม่ทุกเฟรม
- **ข้ามถ้า `event.isComposing`** — Escape ระหว่างกำลังประกอบคำ (IME) เป็นของช่องข้อความ ไม่ใช่ของโมดัล
- **`enabled`** สำหรับโมดัลที่ parent เป็นคน render แบบมีเงื่อนไข (ปฏิทิน, asset-manager, qr-code-manager) เพราะเรียก hook ในฟังก์ชัน `renderXxx()` ไม่ได้ ต้องเรียกที่ระดับบนสุดแล้วเปิด/ปิดด้วย state ตัวเดียวกับที่ตัดสินว่าโมดัลอยู่บนจอไหม
- Sheet รายวันในปฏิทิน **ไม่ต้องใส่** เพราะเป็น Radix Sheet ที่จัดการ Escape เองอยู่แล้ว

## ทดสอบผ่านหน้าจอจริงครบ 6 จุด + 1 กรณีที่ต้องไม่ปิด

| โมดัล | ผล |
|---|---|
| ประวัติแอร์ (`/tech/assets`) | Escape ครั้งแรกยกเลิกการแก้ log · ครั้งที่สองปิดแผง ✅ |
| โมดัลรายอาคารในปฏิทิน | ปิด ✅ ปฏิทินยังอยู่ |
| โมดัลรายละเอียดงานในปฏิทิน | ปิด ✅ |
| ตัวอย่าง QR (`/admin/qr-codes`) | ปิด ✅ |
| ตัวอย่าง QR (`/admin/assets`) | ปิด ✅ |
| ถังขยะ (`/admin/settings`) | ปิด ✅ |
| **ฟอร์มเพิ่มอาคาร** | **ไม่ปิด** ✅ ตามที่ตั้งใจ |

`tsc --noEmit` ผ่าน 0 error · `eslint` ไฟล์ hook ใหม่ผ่านสะอาด · error 2 ตัวที่ eslint ยังฟ้องในไฟล์ที่แก้ (`set-state-in-effect` ใน ac-history-modal, `isBefore` ไม่ได้ใช้ใน maintenance-calendar) **มีอยู่ก่อนแล้ว** ยืนยันด้วยการ stash แล้ววิ่ง eslint บน HEAD เทียบ

---

# 📌 แถบเลือกหลายรายการ ตามหน้าจอไปด้วย (6 ก.ย. 2026, DoubleKill)

ต้นไม้ลึก 4 ระดับทำให้การติ๊กงานกระจายข้ามหลายชั้นหลายห้อง กว่าจะติ๊กครบ **แถบยืนยันก็ลอยพ้นจอไปนานแล้ว** — จะดูว่าเลือกไปกี่งานหรือจะกดรับ ต้องเลื่อนกลับขึ้นไปบนสุดแล้วก็เสียตำแหน่งที่ค้างไว้ในลิสต์ · ทำให้ลอยตามจอแล้ว

**เกาะขอบล่าง ไม่ใช่ขอบบน** (เจ้าของโปรเจกต์เคาะเอง — เห็นง่ายกว่า) · ขอบล่างคือที่ที่นิ้วโป้งอยู่แล้วบนมือถือ และไม่ไปแย่งขอบบนกับหัวข้ออาคาร

## ต้อง render ไว้ท้ายสุด ไม่ใช่หัวลิสต์

`sticky bottom-0` จะทำงานได้ก็ต่อเมื่อ element อยู่ท้ายสุดของ container — เพราะ sticky ขยับ element ได้แค่ภายในตำแหน่ง flow ของตัวเอง **ถ้ายังวางไว้หัวลิสต์เหมือนตอน `top-0` มันจะไม่มีอะไรให้ยึดตรงขอบล่าง** พอเลื่อนถึงท้ายหน้าแถบจะเด้งกลับขึ้นไปตำแหน่งเดิมแล้วหายจากจอ · ย้าย JSX ไปไว้หลัง `BuildingGroupList` ทั้ง 2 ไฟล์

**แก้ 2 ที่ เพราะเป็นปัญหาเดียวกันเป๊ะ:** แถบ "รับงานที่เลือก" ของช่าง (ที่สั่งมา) และแถบ "พิมพ์ QR Code" ของแอดมิน — เลือกสติกเกอร์ข้ามชั้นข้ามห้องแล้วปุ่มพิมพ์ก็หายขึ้นไปข้างบนแบบเดียวกัน

## พื้นทึบอยู่ที่ตัวห่อ ไม่ใช่ที่ตัวการ์ด

การ์ดทั้งสองใบเป็นสีโปร่ง (`bg-secondary/40` และ `bg-primary/10`) ซึ่ง**ไม่มีปัญหาตอนอยู่นิ่ง แต่พอลอยค้างแล้วรายการจะไหลทะลุให้เห็นจนอ่านไม่ออก** · เลยห่อด้วย `div` ที่เป็น `bg-background/95 backdrop-blur-sm` แทนที่จะไปแก้สีการ์ด — **หน้าตาการ์ดทั้งสองใบเหมือนเดิมทุกพิกเซล** แค่มีพื้นทึบรองอยู่ข้างหลัง

`z-30` ต่ำกว่าโมดัล (z-50) และสูงกว่าเนื้อหา ไม่ไปทับอะไร · header ของหน้าเป็น `static` (เลื่อนหายไปตามปกติ) แถบเลยมาปักที่ขอบบนจอพอดีไม่ซ้อนกับอะไร

## ทดสอบผ่านหน้าจอจริง

วัดจาก DOM ที่ 3 ตำแหน่งการเลื่อน (viewport 1280x800) ทั้ง `/tech` (เลือก 3 งาน) และ `/admin/qr-codes` (เลือกทั้งอาคาร 23 เครื่อง) ได้ผลเหมือนกันเป๊ะ:

| เลื่อนไปที่ | ขอบล่างของแถบ | สถานะ |
|---|---|---|
| บนสุด | 800 = ขอบจอพอดี | เกาะขอบล่าง |
| กลางหน้า | 800 | เกาะขอบล่าง |
| ท้ายสุด | 768 | ลงมานั่งที่ตำแหน่งจริงในลิสต์ (32px คือ padding ของ main) |

`elementFromPoint` กลางแถบชี้กลับมาที่ตัวแถบเองทุกครั้ง แปลว่าไม่มีอะไรทับ · ไม่มีการกดรับงานจริง ใบงานสถานะ claimed ยังเป็น 6 เท่าเดิม

## ⚠️ บทเรียน: dev server จำ syntax error ค้างจากตอนแก้ไฟล์ครึ่งทาง

ระหว่างแก้ไฟล์ 2 ขั้น (เปิด div ก่อน ปิด div ทีหลัง) dev server ไปคอมไพล์เอาตอนที่ยังไม่สมดุลพอดี แล้ว**ค้าง error นั้นไว้แม้ไฟล์จริงจะถูกต้องแล้ว** — `tsc --noEmit` ผ่าน 0 error แต่ console ยังฟ้อง `Unexpected token` ชี้ไปที่โค้ดเวอร์ชันเก่าที่ไม่มีอยู่บนดิสก์แล้ว · เป็นอาการเดียวกับที่จดไว้ตอน 4 ก.ย. (ย้ายไฟล์แล้ว `.next` เพี้ยน) · **แก้ด้วยวิธีเดิม: หยุด server → ลบ `.next` → เปิดใหม่** รีสตาร์ทเฉยๆ ไม่พอ

`tsc --noEmit` ผ่าน 0 error · eslint error 2 ตัวใน job-pool-panel (`set-state-in-effect`) **มีอยู่ก่อนแล้ว** ยืนยันด้วย stash เทียบกับ HEAD

---

# 🗑️ เอาไอคอน 3 จุดที่กดไม่ได้ออกจากการ์ด "งานของฉัน" (6 ก.ย. 2026, DoubleKill)

เจ้าของโปรเจกต์ถามว่ามุมขวาบนของการ์ดมีไว้ทำอะไร · ตรวจแล้ว **มันไม่ได้ทำอะไรเลย** — เป็น `<MoreVertical />` เปล่าๆ ไม่ใช่ `<button>` ไม่มี `onClick` ไม่มีเมนูอยู่ข้างหลัง เป็นของที่ติดมาจากเทมเพลตตั้งแต่ต้น · **ไอคอนที่หน้าตาเหมือนกดได้แต่กดไม่ได้ แย่กว่าไม่มีอะไรเลย** เพราะช่างจะกดแล้วคิดว่าแอปค้าง

ลบทั้งไอคอน ทั้ง import และเปลี่ยน `justify-between` เป็นแค่ `flex` เพราะเหลือลูกตัวเดียวแล้ว · `pr-8` ยังอยู่ ไม่ได้มีไว้เว้นที่ให้ไอคอน แต่เว้นให้ริบบิ้น "ด่วน" ที่ปักมุมขวาบนของการ์ด (จดคอมเมนต์กำกับไว้แล้วกันเข้าใจผิดรอบหน้า)

grep ทั้งโปรเจกต์แล้วมีที่เดียวจริงๆ · ทดสอบบนหน้าจอ: การ์ด `B660550-1-241631-02` ที่ถามมา แสดงครบเหมือนเดิมทุกอย่าง ไม่มีไอคอน 3 จุดเหลืออยู่บนหน้าเลย · `tsc --noEmit` และ `eslint` ผ่านสะอาดทั้งคู่

---

# 🔧💧 การ์ดงานของช่างบอกประเภทงาน + กดดูประวัติได้ (6 ก.ย. 2026, DoubleKill)

การ์ดงานฝั่งช่างบอกแค่รหัสแอร์ ยี่ห้อ และวันที่ — **ไม่มีตรงไหนบอกเลยว่างานที่รับมาคืองานอะไร** ช่างรับงาน เดินไปถึงห้อง แล้วค่อยรู้เอาตอนนั้นว่ามาล้างหรือมาซ่อม

## `work_orders.type` มีอยู่แล้ว แค่ไม่เคยส่งขึ้นมา

ไม่ต้องแตะฐานข้อมูล · คอลัมน์ `type` (repair/cleaning) มีอยู่และ**ถูกบันทึกตอนเปิดใบงานเสมอ** (ไม่มี default บังคับให้คนเปิดใบงานระบุเอง — ดูคอมเมนต์ในสคีมาว่าทำไมถึงเลิกเดาจากสถานะเครื่อง) · เพิ่ม `type: wo.type` ที่ `toTechJobRow()` ที่เดียว **แล้วทั้ง 3 ลิสต์ได้ไปพร้อมกัน** เพราะรวม mapper ไว้ตั้งแต่ตอนนั้น

## ใส่ป้ายให้ครบทั้ง 3 ลิสต์ ไม่ใช่แค่ "งานของฉัน"

ที่สั่งมาคือหน้า "งานของฉัน" แต่ **หน้า "งานทั้งหมด" สำคัญกว่าอีก** — เป็นหน้าที่ตัดสินใจกดรับงาน ถ้ารับงานล้างมาโดยเตรียมของมาซ่อมก็คือเสียเที่ยว · หน้าประวัติก็ใส่ด้วยเพื่อให้ทั้ง 3 หน้าพูดเรื่องเดียวกันเหมือนกัน

`JobTypeBadge` เป็นคอมโพเนนต์เดียว ใช้ประแจ/หยดน้ำชุดเดียวกับที่หน้า "แอร์ทั้งหมด" ใช้นับงานต่อห้องอยู่แล้ว จะได้ไม่มีสองสำเนียงในระบบเดียว · **ถ้าไม่มี type จะไม่แสดงอะไรเลย** (ผลลัพธ์จากการสแกน QR สร้าง job โดยไม่มี type — ขึ้น "งานล้าง" ทับงานซ่อมแย่กว่าไม่ขึ้นอะไร)

## ปุ่มดูประวัติบนการ์ด "งานของฉัน"

ปุ่มเดียวกับที่เพิ่งใส่ให้หน้า "แอร์ทั้งหมด" เปิดโมดัลตัวเดียวกัน · **ที่นี่ยิ่งควรมี เพราะสิ่งที่อยากรู้ว่าคราวที่แล้วทำอะไรไว้ คือรู้ก่อนเริ่มงาน ไม่ใช่หลังจบ** · ต่อผ่าน `openHistoryFor` ที่มีอยู่แล้วใน context

## ทดสอบผ่านหน้าจอจริง เทียบกับ DB ทุกใบ

| หน้า | เครื่อง | บนจอ | ใน DB |
|---|---|---|---|
| งานของฉัน | `B660550-1-241631-02` | งานล้าง | `cleaning` ✅ |
| งานของฉัน | `B660550-1-241631-03` | งานซ่อม | `repair` ✅ |
| งานทั้งหมด | `B660550-1-241631-01` | งานล้าง | `cleaning` ✅ |
| ประวัติ | `B660550-8-194445-03` | งานซ่อม | `repair` ✅ |

ปุ่มดูประวัติเปิดโมดัลถูกเครื่อง ขึ้น 4 รายการ ตรงกับจำนวน log ใน DB · `tsc --noEmit` ผ่าน 0 error

---

# ☎️ ช่องเบอร์โทรฝั่งช่าง — เปิดใช้ได้แล้ว (6 ก.ย. 2026, DoubleKill)

หน้าโปรไฟล์ช่างไม่มีช่องเบอร์โทรเพราะ `showPhone={false}` ที่ตั้งไว้ตั้งแต่ 23 ส.ค. — **ตอนนั้นข้อมูลฝั่งช่างยังไม่มีเบอร์มาให้** และถ้าโชว์ช่องว่างไว้ กดบันทึกทีเดียวจะลบเบอร์จริงทิ้งโดยที่เจ้าตัวมองไม่เห็นด้วยซ้ำ (action อ่าน `""` ว่า "ลบทิ้ง") · การ์ดใบนั้นถูกต้องตอนนั้น แต่**หมดอายุไปแล้ว**: `getTechShellData()` ดึงเบอร์หลักมาให้ตั้งแต่ตอนแยกหน้าเป็น 15 route

**ลบ prop ทิ้งเลย ไม่ใช่แค่พลิกเป็น `true`** — เหลือไว้ก็เป็นสวิตช์ที่ไม่มีใครใช้ และเป็นกับดักให้คนหลังปิดมันโดยไม่รู้ว่าทำไมเคยมี

## ทดสอบเคสที่การ์ดใบนั้นกลัว — ไม่เกิดแล้ว

Craig Yost มีเบอร์ 2 เบอร์: หลัก `085-409-1366` และ **รอง `084-241-8999`** ซึ่งฟอร์มนี้มีช่องเดียว มองไม่เห็นเบอร์รองเลย · ทดสอบจริงโดยแก้เบอร์เป็น `081-000-2222` แล้วกดบันทึก:

| แถวใน `user_phones` | ผล |
|---|---|
| เบอร์หลักเก่า `085-409-1366` | ถูกลบ ✅ ถูกต้อง (ถูกพิมพ์ทับ) |
| เบอร์ใหม่ `081-000-2222` | เขียนเป็น primary ✅ |
| **เบอร์รอง `084-241-8999`** | **ยังอยู่ครบ ไม่ถูกแตะ** ✅ |

`deleteMany({ where: { userId, isPrimary: true } })` ทำงานตามที่คอมเมนต์ไว้เป๊ะ — ลบเฉพาะเบอร์หลัก เบอร์รองที่บันทึกมาจากที่อื่นไม่ใช่ของฟอร์มนี้ที่จะทิ้ง

**คืนค่าข้อมูลทดสอบกลับแล้ว** — ลบแถวที่เพิ่งสร้าง แล้ว insert เบอร์เดิมกลับด้วย id/timestamp ชุดเดิม ตรวจแล้วเหมือนก่อนทดสอบทุก field · `tsc --noEmit` ผ่าน 0 error

> eslint ยังฟ้อง `set-state-in-effect` 1 จุดในไฟล์นี้ (`setMounted(true)` ใน `ThemeCard`) — **มีมาก่อน** ไม่เกี่ยวกับงานรอบนี้

---

# 🔒 หน้าโปรไฟล์อ่านอย่างเดียวจนกว่าจะกด "แก้ไขข้อมูล" (7 ก.ย. 2026, DoubleKill)

เดิมช่องชื่อกับเบอร์โทรพิมพ์แก้ได้ตลอดเวลาทั้ง 2 ฝั่ง · หน้าโปรไฟล์ถูกเปิดมา**ดู**บ่อยกว่าเปิดมา**แก้** มาก ช่องที่เปิดรออยู่ตลอดจึงมีแต่โอกาสให้พิมพ์โดนชื่อที่ไม่ได้ตั้งใจจะแตะ · ตอนนี้ต้องกดปุ่ม **"แก้ไขข้อมูล"** ก่อนถึงจะแก้ได้ แล้วมีปุ่ม **บันทึก / ยกเลิก** คู่กัน

**แก้ที่ `profile-panel.tsx` ไฟล์เดียว ได้ทั้ง 2 ฝั่ง** เพราะ `/admin/profile` กับ `/tech/profile` เรียกคอมโพเนนต์ตัวเดียวกัน

## รูปโปรไฟล์คือข้อยกเว้น ตามที่สั่ง

เปลี่ยนรูปได้เลยโดยไม่ต้องเข้าโหมดแก้ไข · แต่การเปลี่ยนรูปก็ยังต้องกดบันทึกอยู่ดี (เพราะ `updateProfileAction` เขียนชื่อ+เบอร์+รูปในคอลเดียว) จึงมีปุ่มบันทึกโผล่มาตอนเลือกรูปแล้วเท่านั้น และ **ใช้ป้ายว่า "บันทึกรูปโปรไฟล์" ไม่ใช่ "บันทึกการเปลี่ยนแปลง"** เพราะนอกโหมดแก้ไขมีแค่รูปเท่านั้นที่เปลี่ยนได้ · ข้อความเตือนก็อ้างชื่อปุ่มตามตัวแปรเดียวกัน จะได้ไม่มีวันชี้ไปที่ปุ่มที่ไม่มีอยู่บนจอ

## 🔴 กับดักที่ต้องกันไว้ — บันทึกรูปแล้วชื่อเก่าทับของใหม่

`name` / `phone` ใน state ถูก seed ตอน mount ครั้งเดียว · ถ้าปล่อยให้ปุ่มบันทึกส่ง state ไปเสมอ **การบันทึกที่ตั้งใจเปลี่ยนแค่รูป จะเขียนชื่อกับเบอร์ชุดเก่าทับของที่เพิ่งอัปเดตไป** · แก้โดยตอนอยู่นอกโหมดแก้ไขให้ส่งค่าจาก props (ข้อมูลจริงจาก server) ไม่ใช่จาก state

```ts
const nextName = isEditing ? name : profile.name;
const nextPhone = isEditing ? phone : profile.phone ?? "";
```

เหตุผลเดียวกันทำให้ `startEditing()` ต้อง seed ช่องกรอกจาก props ใหม่ทุกครั้งที่เปิดฟอร์ม ไม่ใช่ใช้ค่าที่ค้างจากการแก้รอบก่อน

## รายละเอียดที่ตั้งใจให้เป็นแบบนี้

- **ปุ่ม "ยกเลิก" คืนค่าเฉพาะชื่อกับเบอร์ ไม่แตะรูปที่เลือกค้างไว้** — เพราะรูปเลือกได้โดยไม่ต้องเปิดฟอร์ม ถ้ายกเลิกฟอร์มแล้วลบรูปไปด้วย คนที่เลือกรูปไว้**ก่อน**กดแก้ไขจะเสียรูปฟรี · รูปมีปุ่ม "ยกเลิกรูปที่เลือก" ของตัวเองอยู่แล้ว
- **แถวอ่านอย่างเดียวใช้หน้าตาเดียวกับช่องอีเมล** ซึ่งแก้ไม่ได้อยู่แล้วมาตลอด — "ตอนนี้ยังแก้ไม่ได้" กับ "แก้ไม่ได้เลย" เลยดูเหมือนกัน ซึ่งตรงกับความจริงในมุมของคนใช้
- เบอร์โทรที่ยังไม่ได้กรอกแสดงว่า **"ยังไม่ได้ระบุ"** ไม่ใช่ช่องว่างเปล่า

## ทดสอบผ่านหน้าจอจริงทั้ง 2 ฝั่ง

| กรณี | ผล |
|---|---|
| เปิดหน้ามาครั้งแรก | **ช่องที่แก้ได้ = 0** · มีแค่ปุ่ม "เปลี่ยนรูป" กับ "แก้ไขข้อมูล" ✅ |
| เลือกรูปนอกโหมดแก้ไข | ปุ่ม "บันทึกรูปโปรไฟล์" โผล่ · **ช่องกรอกยังล็อกอยู่ (0 ช่อง)** ✅ |
| ยกเลิกรูปที่เลือก | ปุ่มบันทึกหายไป เหลือ 2 ปุ่มเดิม ✅ |
| กด "แก้ไขข้อมูล" | ช่องกรอกโผล่พร้อมค่าจริงจาก server · ปุ่มเปลี่ยนเป็น บันทึก + ยกเลิก ✅ |
| พิมพ์แก้แล้วกด "ยกเลิก" | กลับเป็นอ่านอย่างเดียว แสดงค่าเดิมจาก DB ไม่ใช่ค่าที่พิมพ์ ✅ |
| แก้เบอร์แล้วกดบันทึก | DB ได้ค่าใหม่ · **เบอร์รองไม่หาย · ชื่อไม่ถูกแตะ** · ออกจากโหมดแก้ไขเอง ✅ |
| `/admin/profile` | เหมือนกันทุกข้อ ✅ |

`tsc --noEmit` ผ่าน 0 error · ไม่มี error ใน console · **คืนค่าข้อมูลทดสอบแล้ว** (เบอร์ Craig Yost กลับเป็น `085-409-1366` พร้อม id/timestamp ชุดเดิม, `avatar_url` ยังเป็น NULL ทุกแถว, ไม่มีไฟล์ตกค้างใน `public/uploads/`)

> eslint ยังฟ้อง `set-state-in-effect` 1 จุดในไฟล์นี้ (`setMounted(true)` ใน `ThemeCard`) — **มีมาก่อน** ไม่เกี่ยวกับงานรอบนี้

---

# 📝 หน้าสมัครสมาชิก — เพิ่มรูปโปรไฟล์กับเบอร์โทร (7 ก.ย. 2026, DoubleKill)

เดิมหน้าสมัครมีแค่ บทบาท / ชื่อ / อีเมล / รหัสผ่าน · ทั้งที่ระบบมีทั้ง `users.avatar_url` และตาราง `user_phones` อยู่แล้ว คนสมัครใหม่จึงต้องไปเพิ่มเองทีหลังในหน้าโปรไฟล์ · ตอนนี้ใส่ได้ตั้งแต่ตอนสมัคร

> **อัปเดตวันเดียวกัน: เจ้าของโปรเจกต์สั่งให้ "บังคับใส่รูปตอนสมัคร"** · รูปโปรไฟล์จึงกลายเป็น**ของบังคับ** ส่วนเบอร์โทรยัง**ไม่บังคับ**ตามเดิม · รายละเอียดการบังคับอยู่ท้ายหัวข้อนี้

## รวมกติกาของรูปโปรไฟล์ไว้ที่เดียว — `src/lib/avatar.ts` (ไฟล์ใหม่)

ขนาดสูงสุด 8 MB กับข้อความปฏิเสธเคยเขียนแยกกัน 2 ที่ (ใน action กับใน client ข้างๆ กัน) · **ถ้าปล่อยให้หน้าสมัครก๊อปเป็นชุดที่ 3 คือมี 3 โอกาสที่ client จะรับไฟล์ที่ server ปฏิเสธ** ซึ่งในสายตาคนใช้คือ "อัปโหลดแล้วเงียบไปเฉยๆ" · ย้ายมาไว้ที่เดียวแล้วให้ทั้ง 3 จุดเรียกใช้:

```ts
export const AVATAR_MAX_BYTES = 8 * 1024 * 1024;
export function avatarRejectionReason(file: File): string | null
```

เป็น constant กับ pure function ล้วน ไม่มี `"use server"` ทั้ง client และ server จึง import ได้

## ลำดับการเขียนใน `registerUser()` — ตั้งใจให้เป็นแบบนี้

1. ตรวจไฟล์**ก่อน**แตะอะไรทั้งนั้น ไฟล์ที่ถูกปฏิเสธจึงไม่มีต้นทุน
2. เช็คว่าอีเมลซ้ำหรือยัง
3. **เขียนไฟล์ลงดิสก์หลังจากรู้แล้วว่าอีเมลว่าง** — ถ้าเขียนก่อน คนที่กดสมัครซ้ำด้วยอีเมลที่มีคนใช้แล้วจะทิ้งไฟล์ค้างไว้ทุกครั้งที่กด
4. `user.create` + `userPhone.create` **ใน transaction เดียว** ไม่งั้นถ้าเบอร์ล้มจะเหลือ user ที่ไม่มีเบอร์แต่รายงานว่าสำเร็จ
5. ถ้า transaction ล้ม → `deleteUpload()` ไฟล์ที่เพิ่งเขียน เพราะมันไม่มีเจ้าของแล้ว

เขียนไฟล์**นอก** transaction ตามกฎเดิมของโปรเจกต์ (ห้ามค้าง transaction คร่อม I/O หลายเมกะไบต์)

เบอร์ว่างไม่สร้างแถวเลย ไม่ได้เก็บเป็น empty string ที่แยกไม่ออกจาก "ไม่ได้กรอก" · `formData.get("phone") ?? ""` เพราะ `get` คืน `null` ถ้า browser ไม่ส่งฟิลด์มา ซึ่ง Zod จะฟ้องว่า "expected string" แทนที่จะมองว่าว่าง

## ⚠️ ข้อควรรู้: นี่คือช่องอัปโหลดไฟล์ที่ยังไม่ต้องล็อกอิน

หน้าสมัครเปิดสาธารณะ การรับไฟล์ตรงนี้จึงแปลว่า **คนที่ยังไม่มีบัญชีเขียนไฟล์ลงเซิร์ฟเวอร์ได้** · ที่กันไว้แล้วในโค้ด: จำกัดชนิดกับขนาด, เขียนหลังผ่านการตรวจทุกอย่าง, ลบทิ้งถ้าสมัครไม่สำเร็จ, และ `saveUpload()` ย่อรูปเหลือ 1600px อยู่แล้ว · **ที่ยังไม่มีคือ rate limit** ซึ่งเป็นงานระดับ infrastructure ไม่ได้อยู่ในขอบเขตรอบนี้ — ถ้ากังวลตอนขึ้นจริง ทางเลือกที่ง่ายที่สุดคือเอารูปออกจากหน้าสมัครแล้วให้ไปใส่ในหน้าโปรไฟล์หลังอนุมัติแทน (ซึ่งใช้งานได้อยู่แล้ว)

## ทดสอบผ่านหน้าจอจริง 3 ทาง

| กรณี | ผล |
|---|---|
| เลือกไฟล์ `.txt` | ขึ้น "รูปโปรไฟล์ต้องเป็นไฟล์รูปภาพเท่านั้น" · **ล้าง input ทิ้งด้วย** ไฟล์ที่ server จะปฏิเสธจึงไม่ค้างรอส่ง |
| สมัครพร้อมรูป + เบอร์ | `avatar_url` ได้ path จริง · `user_phones` ได้ 1 แถว `is_primary=1` · ไฟล์อยู่ใน `public/uploads/` จริง · **อีเมล `Reg.Test@Example.Com` ถูก lowercase เป็น `reg.test@example.com`** |
| สมัครโดยไม่ใส่ทั้งคู่ | สำเร็จเหมือนเดิม · `avatar_url` = NULL · **แถวเบอร์ = 0 แถว** ไม่ใช่แถวว่าง |

หน้าโปรไฟล์ทั้ง 2 ฝั่งยังทำงานปกติหลังเปลี่ยนไปใช้ `avatar.ts` ร่วมกัน · `tsc --noEmit` ผ่าน 0 error · eslint 0 error (เหลือ warning 2 ตัวเรื่อง import ที่ไม่ได้ใช้ ซึ่ง**มีมาก่อน**: `AnimatedIcon`, `verifyOrgAdmin`) · **ลบผู้ใช้ทดสอบ 2 บัญชีและไฟล์ที่อัปโหลดออกแล้ว** ยอดกลับเป็น users 5 / phones 7 เท่าเดิม

## 🔒 บังคับใส่รูปโปรไฟล์ (สั่งเพิ่มทีหลังในวันเดียวกัน)

### ทำไมถึงใช้ `required` ของ browser ไม่ได้

ช่อง `<input type="file">` ถูกซ่อนไว้หลังปุ่มที่จัดสไตล์เอง (`className="hidden"`) · **ถ้าใส่ `required` ลงไป browser จะไม่ยอม submit ฟอร์มเลยและไม่แสดงอะไรให้ผู้ใช้เห็นด้วย** เพราะมันโฟกัสไปที่ control ที่ซ่อนอยู่ไม่ได้ (Chrome จะบ่นใน console ว่า `An invalid form control with name='avatar' is not focusable` แล้วเงียบ) · จะกดปุ่มสมัครแล้วไม่มีอะไรเกิดขึ้นแบบหาสาเหตุไม่เจอ

จึงบังคับ **2 ชั้นแทน**:

1. **`onSubmit` ในฟอร์ม** — ถ้ายังไม่ได้เลือกรูปให้ `preventDefault()` แล้วขึ้นข้อความ **ตรงใต้ช่องรูปที่มันพูดถึง** พร้อมเลื่อนจอไปหา ไม่ใช่โยนข้อความไปกองรวมบนสุดของหน้า
2. **`registerUser()` เช็คซ้ำเป็นตัวจริง** — ด่านฝั่ง client เป็นแค่การประหยัด round trip ไม่ใช่การป้องกัน

ผลพลอยได้: `avatarUrl` ไม่มีทางเป็น `null` แล้ว เงื่อนไข `hasAvatar ? … : null` ในโค้ดจึงหายไปทั้งชุด อ่านง่ายขึ้น

### ทดสอบทั้ง 2 ชั้นแยกกัน

| ทดสอบ | ผล |
|---|---|
| กรอกครบแต่ไม่เลือกรูป แล้วกดสมัคร | **ด่าน client บล็อก** ขึ้น "กรุณาเลือกรูปโปรไฟล์" ใต้ช่องรูป · ยังอยู่หน้าเดิม |
| **ข้ามด่าน client** (เลือกรูปให้ state ผ่าน แล้วล้าง `input.files` ทิ้งก่อน submit) | **ด่าน server บล็อก** ขึ้นข้อความเดียวกัน · ยังอยู่หน้าเดิม |
| ทั้ง 2 กรณีข้างต้น | **ไม่มีแถวใน DB และไม่มีไฟล์ถูกเขียนเลย** (users คงที่ 5, `public/uploads/` ว่าง) |
| สมัครพร้อมรูปตามปกติ | สำเร็จ · `avatar_url` ได้ path จริง · ไฟล์อยู่บนดิสก์ |

ข้อความใต้ช่องรูปเปลี่ยนจาก "ไม่ใส่ก็ได้..." เป็น **"จำเป็นต้องใส่ · ไฟล์รูปภาพ ขนาดไม่เกิน 8 MB"** และปุ่มเปลี่ยนจาก "เพิ่มรูปโปรไฟล์" เป็น **"เลือกรูปโปรไฟล์"** · ป้าย "— ไม่บังคับ" ที่ช่องเบอร์โทรยังอยู่ ซึ่งตอนนี้ยิ่งมีประโยชน์เพราะมันตัดกับช่องรูปที่บังคับ

**ลบผู้ใช้ทดสอบและไฟล์ออกหมดแล้ว** ยอดกลับเป็น users 5 / phones 7 · `public/uploads/` ว่าง

## ✅ บังคับกรอกครบทุกช่อง (สั่งเพิ่มอีกรอบในวันเดียวกัน)

ช่องเดียวที่ยังไม่บังคับคือ **เบอร์โทรศัพท์** (ชื่อ/อีเมล/รหัสผ่าน บังคับอยู่แล้ว, รูปเพิ่งบังคับไป, บทบาทมีค่าตั้งต้นเสมอจึงไม่มีทางว่าง) · ตอนนี้บังคับครบ:

- ฟอร์ม: ใส่ `required` ที่ช่องเบอร์ (ช่องนี้มองเห็นได้ ใช้ `required` ของ browser ได้ปกติ ต่างจากช่องไฟล์ที่ซ่อนอยู่) และเอาป้าย "— ไม่บังคับ" ออก
- `registerUser()`: `.min(1)` + บังคับรูปแบบ **โดยไม่ยอมรับค่าว่างอีกต่อไป** · `if (phone)` ตอนสร้างแถวหายไป เพราะ schema กันค่าว่างให้แล้ว

**`trim()` ทำงานก่อน `min(1)` โดยตั้งใจ** — ช่องที่มีแต่เคาะวรรค browser มองว่า "กรอกแล้ว" แต่ server ต้องมองว่าว่าง · ทดสอบแล้ว: กรอกช่องว่าง 5 ตัว → `checkValidity()` ของ browser คืน `true` แต่ server ตอบ "กรุณากรอกเบอร์โทรศัพท์"

## 🔴 บั๊กที่เจอตอนทดสอบรอบนี้ — แก้แล้ว (สำคัญ)

**React รีเซ็ตช่องกรอกทั้งฟอร์มเมื่อ action ตอบกลับ และนั่นรวมถึงช่องไฟล์ด้วย** แต่**ไม่รวม `avatarPreview` ซึ่งเป็น state** · ผลคือหลังสมัครไม่ผ่านเพราะเรื่องอื่น (เช่นเบอร์ผิดรูปแบบ) **หน้าจอยังโชว์รูปอยู่ทั้งที่ไฟล์หลุดไปแล้ว** พอกดสมัครซ้ำ ด่าน client เห็น preview ก็ปล่อยผ่าน แล้ว server ตอบว่า "กรุณาเลือกรูปโปรไฟล์" — **ปฏิเสธรูปที่ผู้ใช้มองเห็นอยู่ตรงหน้า** หาทางออกไม่เจอ

แก้โดยให้ด่าน client **ถามช่องไฟล์ว่าถืออะไรอยู่จริง** แทนที่จะเชื่อ preview และเคลียร์ preview ที่ค้างทิ้งตอนบล็อก ทั้งสองฝั่งจะได้ไม่พูดคนละเรื่อง

```ts
if ((avatarInputRef.current?.files?.length ?? 0) > 0) return;
event.preventDefault();
setAvatarPreview(null);
setAvatarError("กรุณาเลือกรูปโปรไฟล์");
```

ทดสอบยืนยันแล้ว: หลัง error ครั้งแรก `files.length === 0` แต่ `hasPreview === true` · กด submit อีกครั้ง → ถูกบล็อกพร้อมข้อความ **และรูปที่ค้างหายไป** ตรงกับความจริง

> ⚠️ ผลข้างเคียงที่ยังอยู่ (พฤติกรรมของ React เอง ไม่ใช่บั๊กที่เพิ่มเข้ามา): **สมัครไม่ผ่านทีนึง ต้องเลือกรูปใหม่และกรอกใหม่ทุกช่อง** · ถ้าจะให้ค่าคงอยู่ต้องเปลี่ยนช่องกรอกเป็น controlled component ทั้งฟอร์ม ซึ่งเป็นงานคนละก้อน ยังไม่ได้ทำ

## ทดสอบผ่านหน้าจอจริงรอบสุดท้าย

| ทดสอบ | ผล |
|---|---|
| กด submit ฟอร์มเปล่า | browser บล็อกที่ช่อง `name` · `checkValidity()` = false |
| ช่อง `required` ครบ | `name` / `phone` / `email` / `password` = true ทั้งหมด (ช่องไฟล์ไม่ใส่ `required` โดยตั้งใจ) |
| เบอร์เป็นช่องว่างล้วน | browser ปล่อยผ่าน · **server บล็อก** "กรุณากรอกเบอร์โทรศัพท์" |
| เบอร์ผิดรูปแบบ | "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง" |
| กรอกครบทุกช่อง | สำเร็จ · `avatar_url` + เบอร์ `is_primary=1` เขียนครบในแถวเดียวกัน |

**ลบผู้ใช้ทดสอบและไฟล์ออกหมดแล้ว** users 5 / phones 7 · `public/uploads/` ว่าง

> 🔎 **เจอระหว่างทาง ยังไม่ได้แก้:** หน้าจอหลังสมัครสำเร็จพาดหัวว่า **"ลงทะเบียนสำเร็จ (Pending)"** และขึ้นกล่อง "รอการอนุมัติ" **ตายตัวเสมอ** · แต่ `registerUser()` ให้อีเมลสถาบัน (`.ac.th` / `.edu`) เป็น `active` ทันที ข้อความในกล่องจึงบอกว่าอนุมัติแล้วแต่พาดหัวบอกว่ารออนุมัติ — **ขัดกันเองในจอเดียว** · แก้ได้ด้วยการให้ action คืนสถานะกลับมาแล้วแยกข้อความ ยังไม่ได้ทำเพราะอยู่นอกขอบเขตที่สั่ง

---

# 📦 คู่มือย้ายงานที่ค้างอยู่ — ถึง Esther03u

## ข่าวดี: panel ทุกตัวไม่ถูกแตะเลย

`overview-panel` · `work-order-board` · `user-approvals-panel` · `team-panel` · `asset-manager` · `qr-code-manager` · `settings-panel` · `job-pool-panel` · `my-jobs-panel` · `completed-jobs-panel` · `assets-panel` · โมดัลทุกตัว · `maintenance-calendar`

**ทั้งหมดยังอยู่ที่เดิม ชื่อเดิม รับ props ชุดเดิมเป๊ะ** — งานเพิ่มไอคอนข้อ 4 เฟส 2 ของคุณอยู่ในไฟล์พวกนี้ทั้งหมด จึง **merge ได้ตามปกติ ไม่ต้องเขียนใหม่**

## ที่หายไปมี 2 ไฟล์

| ไฟล์ที่ลบ | ของเดิมทำอะไร | ตอนนี้ไปอยู่ที่ไหน |
|---|---|---|
| `components/admin/admin-dashboard-view.tsx` | สลับแท็บ 9 อัน + ถือ state + เรียก action | แตกเป็น `app/admin/*/page.tsx` + `admin-shell.tsx` + `use-admin-actions.ts` |
| `components/tech/tech-mobile-view.tsx` | สลับแท็บ 6 อัน + โมดัล 3 ตัว | แตกเป็น `app/tech/*/page.tsx` + `tech-shell.tsx` |

**ถ้าคุณแก้ 2 ไฟล์นี้ไว้** git จะบอกว่า conflict แบบ "deleted by them" — ดู diff ของคุณว่าแก้อะไร แล้วเอาไปใส่ใน page/client ตัวใหม่ที่ตรงกัน ถ้าไม่ชัดว่าอันไหนตรงกันถามได้

## ถ้าจะเพิ่มหน้าใหม่หลังจากนี้

สร้าง `src/app/admin/<ชื่อ>/page.tsx` + เพิ่ม 1 บรรทัดใน `navItems` ของ `admin-shell.tsx` — จบ ไม่ต้องแตะที่อื่น

## ถ้า panel ต้องใช้คำค้นจากช่อง search บน header

```tsx
"use client";
import { useDashboardSearch } from "@/components/layout/dashboard-search";   // ฝั่ง admin
import { useTechFilters } from "@/components/tech/tech-shell";               // ฝั่งช่าง
```

ช่องค้นหา**ล้างค่าเองเมื่อเปลี่ยนหน้า** ไม่ต้องเขียนเงื่อนไขล้างเองอีก (บั๊กข้อ 1 รอบ 27 ส.ค. หายไปเชิงโครงสร้างแล้ว)

---

## ✅ ทดสอบฝั่งเขียนหลังรื้อแล้ว (4 ก.ย.)

ยืนยันแล้ว: `npm run build` ผ่าน · `tsc` ผ่าน · **ทั้ง 15 route คืน 200 พร้อมข้อมูลถูกต้อง**

**กดปุ่ม "รับงาน" ทดสอบผ่านหน้าจอจริงแล้ว ผ่านครบทุกชั้น:**

| ชั้นที่พิสูจน์ | ผล |
|---|---|
| server action ผ่าน wrapper ตัวใหม่ (`lib/tech/jobs.ts`) | ใบงาน #96 เปลี่ยนเป็น `claimed` มี `claimed_at` จริงใน DB · งานค้างของช่าง 6 → 7 · กองงาน 44 → 43 |
| การนำทางหลังรื้อ route | เด้งไป `/tech/my-jobs` หัวข้อ "งานที่ฉันกำลังดำเนินการ" |
| `revalidatePath("/tech", "layout")` | **เครื่องที่เพิ่งรับ (`B467711-1-19179-02`) โผล่ในหน้า "งานของฉัน" ทันที** — เป็นการพิสูจน์ว่าการแก้ scope เป็น `"layout"` ได้ผลจริง ของเดิมหน้านี้จะยังค้างข้อมูลเก่า |
| ปุ่ม demo login + หน้าแรกของช่าง + `BrowserSessionGuard` | กดปุ่ม "ช่างซ่อมบำรุง" → เข้าเป็น Craig Yost ลงที่ `/tech/assets` และ guard ไม่เตะออก |

*(คืนค่า DB กลับเป็นเดิมแล้ว — ใบงาน #96 กลับเป็น `pending`)*

**มอบหมายงานแบบกลุ่มจากหน้าภาพรวม — ทดสอบแล้วเช่นกัน** ติ๊ก 2 แถว → กด "มอบหมายช่าง (2)" → เลือก Hobart Effertz → ใบงาน #16, #19 เปลี่ยนเป็น `claimed` มี `claimed_at` จริง (คืนค่าแล้ว)

**ยังไม่ได้กดทดสอบอีก 3 อย่าง:** บันทึกงานจาก "งานของฉัน" · สแกน QR · สร้างใบงานจากปุ่มบน header

---

## 🔴 2 บั๊กที่เจอจากการกดใช้จริง (แก้แล้ว `b7faf7e`) — ต้นเหตุเดียวกัน

เจ้าของโปรเจกต์แจ้งว่า *"งานค้างล้างยังไม่ขึ้นด้านบน"* และ *"ติ๊กแล้วแต่ยังไม่มีปุ่มอะไรขึ้น"* — ไล่ดูข้อมูลจริงแล้วเป็นอาการของสาเหตุเดียวกัน

**ในเครื่องนี้ 12 จาก 50 แถวของรายการรอซ่อมด่วน คือเครื่องที่ถูกตีธงว่าเสีย/ถึงกำหนด แต่ยังไม่มีใครออกใบงานให้** — และทั้ง 12 แถวนั้นคือแถวที่ไม่มีวันที่แจ้ง

| อาการ | สาเหตุ |
|---|---|
| แถวที่ไม่มีใบงานลอยอยู่บนสุดทุกกลุ่ม | เรียงตาม "แจ้งเก่าสุดก่อน" แต่แถวที่ไม่มีวันที่ถูกอ่านเป็น `?? 0` = เก่าที่สุดในโลก งานที่แจ้งไว้ตั้งแต่ ก.ค. เลยไปอยู่ใต้ |
| ติ๊กแล้วปุ่มเป็น "มอบหมายช่าง (0)" กดไม่ได้ | 12 แถวนั้นคือแถวเดียวที่มอบหมายไม่ได้จริงๆ (ไม่มีใบงานให้มอบหมาย) |

**แต่ปุ่มก็ขึ้น (0) กับอีก 38 แถวที่มีใบงานด้วย** — เพราะโค้ดหา `pendingWorkOrderId` โดยไล่หาใน prop `workOrders` ซึ่งเป็น**หน้าแรกของกระดานใบงาน 50 แถวคละสถานะ เรียงใหม่สุดก่อน** จึงไม่มีใบงานที่ค้างของเครื่องพวกนี้อยู่เลยสักใบ (ตรวจแล้ว: match ได้ **0 จาก 38**)

**แปลว่าปุ่มมอบหมายแบบกลุ่มบนตารางนี้ใช้งานไม่ได้มาตลอด ไม่ใช่เพิ่งพังตอนแบ่งกลุ่มอาคาร**

**แก้:** เรียงให้แถวที่มีใบงานขึ้นก่อน แล้วค่อยตามด้วยความสำคัญและอายุงาน · และดึง id ใบงานจากตัวเครื่องเองซึ่ง server เติมมาให้จาก query ที่ครอบใบงานค้างทั้งหมด ไม่ใช่ไล่หาในหน้าแรกของกระดาน

---

## ✅ แก้แล้ว — รหัสผ่านถูกพิมพ์ลง log ของเซิร์ฟเวอร์ (`3858049`)

เจอตอนดู log ระหว่างล็อกอินทดสอบ:

```
[AUTH LOG] rawCredentials: { csrfToken: '...', email: '...', password: 'TestPass123!', ... }
```

**รหัสผ่านจริงถูกพิมพ์เป็น plain text ทุกครั้งที่มีคนล็อกอิน** ถ้า deploy ไปแล้ว log ของ production จะกลายเป็นกองรหัสผ่านที่ใช้งานได้จริงของผู้ใช้ทุกคน

**ลบ debug log ใน `authorize()` ออกทั้งชุด** ไม่ใช่แค่บรรทัดรหัสผ่าน เพราะที่เหลือก็บันทึกว่าอีเมลไหนมีอยู่จริง บัญชีไหนถูกระงับ และรหัสผ่านตรงหรือไม่ ซึ่งเป็นร่องรอยให้ไล่เดาบัญชีได้ · การล็อกอินที่ต้องมีบันทึกมี `system_audit_logs` อยู่แล้ว · เก็บไว้อย่างเดียวคือ `console.error` ตอน error ไม่คาดคิด ซึ่งไม่เห็น credential

**แก้อีกจุดที่เป็นปัญหาแบบเดียวกันรออยู่:** `request-password-reset/actions.ts` พิมพ์ลิงก์รีเซ็ตที่ใช้งานได้จริงลง log เมื่อ SMTP ยังไม่ได้ตั้งค่า — ตั้งใจไว้ใช้ตอน dev และเขียนคอมเมนต์กำกับไว้แล้ว **แต่ SMTP ของโปรเจกต์นี้ยังไม่ได้ตั้ง** ถ้า deploy ก่อนใส่ค่า มันจะพิมพ์ลิงก์รีเซ็ตรหัสผ่านที่ใช้ได้จริงลง log ทุกคำขอ · เพิ่มเงื่อนไข `NODE_ENV !== "production"` ปิดช่องนั้นแล้ว

ทดสอบแล้ว: รหัสถูก → ได้ session ช่างตามเดิม · รหัสผิด → ไม่ได้ session ตามเดิม · **ทั้งสองครั้งไม่มีอะไรออกมาใน log นอกจากบรรทัด request ปกติ**

```
/admin  →  /admin/overview · /work-orders · /approvals · /team
           /assets · /calendar · /qr-codes · /profile · /settings
/tech   →  /tech/jobs · /my-jobs · /history · /assets · /calendar · /profile
```

- แต่ละ `page.tsx` เป็น Server Component ที่โหลด**เฉพาะข้อมูลของหน้าตัวเอง** — แท็บอนุมัติผู้ใช้จะเหลือ 1 query 5 แถว จาก 9 query 437 แถว
- `dashboard-view.tsx` เหลือแค่ layout + sidebar ไม่ต้องถือ `activeTab` และ prop 17 ตัวอีก
- sidebar เปลี่ยนจาก `setActiveTab()` เป็น `<Link href>` จริง → แชร์ลิงก์/กด back/refresh ได้ตามปกติ
- `globalSearch` ที่ตอนนี้แชร์ข้ามแท็บ (ต้นเหตุบั๊กข้อ 1 รอบ 27 ส.ค.) กลายเป็น `?q=` ของแต่ละหน้า หายไปเองโดยไม่ต้องเขียนเงื่อนไขล้างค่า

**ไฟล์ที่ต้องแตะ:** `admin-dashboard-view.tsx`, `tech-mobile-view.tsx`, `dashboard-layout.tsx` และ panel ทุกตัวใน `components/admin/**` + `components/tech/**`

**ลำดับที่ปลอดภัย:** ข้อ 4 เฟส 2 (UI) ให้จบก่อน → push → แล้วค่อยเริ่มเฟส B บนโค้ดที่นิ่งแล้ว

---

# ✅ ผลตัดสินใจ 5 เรื่อง (28 ส.ค. 2026 — เจ้าของโปรเจกต์เคาะเอง)

| # | เรื่อง | เลือก | ผลที่ตามมา |
|---|---|---|---|
| 1 | ปฏิทินชื่ออาคารถูกตัด | **แสดงชื่อเต็ม ไม่ตัด** | ไม่ต้องใช้ `abbreviation` · งาน UI ล้วน |
| 2 | นับงานซ่อม/งานล้างจากอะไร | **นับจาก `type` ของใบงาน** ทั้งการ์ดสรุปและตัวเลขรายอาคาร | DoubleKill แก้ `assetSummary` แล้ว |
| 3 | component กลางสำหรับจัดกลุ่มตามอาคาร | **ทำตัวเดียวใช้ 5 หน้า** | ทุก endpoint ส่ง shape เดียวกันแล้ว |
| 4 | ข้อ 4 แบ่งเฟสไหม | **แบ่ง 2 เฟส ทำเฟส 1 ก่อน** | เฟส 1 เสร็จแล้ว · เฟส 2 ยังไม่เริ่ม |
| 5 | รหัสผ่านบัญชีทดสอบ | ล้างกลับเป็น NULL | เรียบร้อยแล้ว ทั้ง 5 บัญชี |

### 🔴 ข้อ 1 — ห้ามใส่ truncate กลับ แม้จะเห็นชื่อยาวผิดปกติ

เหตุผลที่เลือกแสดงชื่อเต็ม: **ชื่ออาคารของจริงตอนใช้งานสั้นมาก** เช่น `อาคาร 20`, `อาคารห้องสมุด`, `อาคาร 9` — ที่ยาวจนล้นอยู่ตอนนี้เป็นเพราะ seed data สุ่มชื่อมาแบบ `Administration Building 392965` เท่านั้น

**อย่าเอาความยาวของ seed data มาเป็นเหตุผลใส่ truncate กลับ** ถ้าจำเป็นให้ตัดขึ้นบรรทัดใหม่แทน อย่าตัดตัวอักษรทิ้ง

---

# 📦 ถึง Esther03u — ของที่ DoubleKill ส่งให้แล้ว ใช้ได้เลย

## สำหรับข้อ 3 (แบ่งตามอาคาร) — field ใหม่

ทุกรายการส่ง `buildingId` + `buildingName` มาให้แล้ว **แยกออกมาจาก `location` ไม่ต้องไปตัดสตริงเอง**

| แหล่งข้อมูล | field ใหม่ | ใช้ที่หน้า |
|---|---|---|
| `jobPool` | `buildingId`, `buildingName` | งานทั้งหมด (ช่าง) |
| `myJobs` | `buildingId`, `buildingName` | งานของฉัน (ช่าง) |
| `completedJobs` | `buildingId`, `buildingName` | ประวัติ (ช่าง) |
| `assetList` | `buildingId`, `roomName`, `floor` *(`buildingName` มีอยู่แล้ว)* | แอร์ทั้งหมด (ช่าง) |
| จัดการ QR Code (admin) | — ใช้ prop `buildings` ที่มีโครงครบอยู่แล้ว | — |

**`location` ไม่ถูกแตะเลย** ของเดิมทุกอย่างยังทำงานเหมือนเดิม รวมถึง `filterJobs` ใน `components/tech/types.ts`

> 💡 ตอนนี้ `filterJobs` กรองอาคารด้วย `job.location.includes(selectedBuilding)` ซึ่งเป็นการ match สตริงที่ประกอบไว้เพื่ออ่าน — พอมี `buildingId` แล้วเปลี่ยนไปเทียบ id ตรงๆ ได้ แม่นกว่าและไม่พังถ้าชื่ออาคารไปซ้ำกับชื่อห้อง

## สำหรับข้อ 4 (ถังขยะ) — action ใหม่ 7 ตัว

เรียกจาก `@/app/admin/master-data/actions` ได้เลย (ไฟล์นี้เป็น `"use server"` ของตัวเอง ไม่ต้องผ่าน wrapper แบบ `admin/actions.ts`)

```typescript
deleteAcBrandAction(brandId)              // → { success } | { error }
deleteAcModelAction(modelId)
restoreAcBrandAction(brandId)
restoreAcModelAction(modelId)             // → { success, warning? }
permanentlyDeleteAcBrandAction(brandId)   // → { success, cascadedModels } | { error, blockedBy }
permanentlyDeleteAcModelAction(modelId)
getAcTrashData()                          // → { brands[], models[] }
```

### `getAcTrashData()` คืนอะไรบ้าง

```typescript
brands: [{ id, name, deletedAt, liveModels, unitsUsing, unitsUsingLive, canPurge }]
models: [{ id, name, defaultBtu, deletedAt, brandId, brandName, brandDeleted,
           unitsUsing, unitsUsingLive, canPurge }]
```

**`canPurge` คือคำตอบสำเร็จรูปว่าปุ่ม "ลบถาวร" ควรกดได้ไหม** — ไม่ต้องไปคิดกฎ `Restrict` เองที่ฝั่ง UI ถ้า `false` ให้ใช้ `unitsUsing` บอกเหตุผลว่ายังมีกี่เครื่องใช้อยู่

### 3 จุดที่พฤติกรรมอาจไม่ตรงกับที่เดา

1. **ลบยี่ห้อแล้วเครื่องที่ใช้ยี่ห้อนั้นยังแสดงชื่อยี่ห้อปกติ** — ตั้งใจ นี่คือทั้งหมดของ soft delete ที่ต่างจากลบจริง (ทดสอบแล้ว: ลบ Carrier ทิ้ง เครื่องทั้ง 48 จุดยังขึ้น "Carrier" เหมือนเดิม) สิ่งที่หายไปคือ**ตัวเลือกในดรอปดาวน์**เท่านั้น
2. **ลบยี่ห้อไม่ได้ลบรุ่นข้างใต้ตามไปด้วย** — รุ่นหายจากดรอปดาวน์เพราะ query กรองจาก `deleted_at` ของยี่ห้อด้วย แต่ตัวแถวไม่ถูก stamp พอกู้ยี่ห้อคืน รุ่นที่เคยมีอยู่จะกลับมาครบ **ยกเว้นรุ่นที่ถูกลบแยกไว้ก่อนแล้ว** ซึ่งยังอยู่ในถังขยะต่อไป
3. **กู้รุ่นคืนตอนที่ยี่ห้อยังอยู่ในถังขยะ ทำได้ แต่รุ่นจะยังไม่โผล่** — `restoreAcModelAction` จะคืน `warning` มาบอกให้แสดงต่อผู้ใช้ ไม่ใช่ `error` เพราะแถวกลับมาจริง

---

## ลำดับที่แนะนำตอนวางแผน (27 ส.ค.) — ✅ เฟส A เสร็จแล้ว เหลือ B กับ C

*เก็บไว้เป็นบันทึกว่าทำไมถึงเรียงแบบนี้ · ลำดับที่ใช้จริงตอนนี้อยู่ในหัวข้อ "ลำดับที่แนะนำตอนนี้" บนสุดของไฟล์*

**เฟส A — DoubleKill เคลียร์ field ให้ก่อน (ปลดบล็อกข้อ 2 และ 3)** — ✅ **เสร็จแล้ว 28 ส.ค.**

ข้อ 2 กับ 3 ต้องรอ backend ทั้งคู่ และสิ่งที่ต้องทำเป็นงานชนิดเดียวกันหมด คือ **"ส่ง field ที่ query ดึงมาอยู่แล้วออกไปให้ UI ใช้"** จึงทำรวดเดียวจบในรอบเดียว ไม่ควรทยอยทำทีละข้อ — ทำจริงตามนี้ จบใน 2 ไฟล์ ไม่มี query เพิ่มสักตัว *(ข้อ 2 กลายเป็นไม่ต้องพึ่ง backend เลยหลังเคาะว่าจะแสดงชื่อเต็ม)*

**เฟส B — Esther03u ลุย UI ขนานไปกับเฟส A** — ⏳ **ตาคุณแล้ว ไม่มีอะไรให้รอ**

ข้อ 1 ไม่ต้องรออะไรเลย เริ่มได้ทันที พอเฟส A เสร็จก็ต่อข้อ 2 → ข้อ 3 ได้เลย

**เฟส C — ข้อ 4 ทีหลัง** — ✅ backend เสร็จแล้ว · ⏳ รอ UI

งานใหญ่แต่ไม่มีใครถูกบล็อกจากการที่ยังลบยี่ห้อไม่ได้ ไว้ทำหลังจากสามข้อแรกลงตัว

---

## 1. ✅ ระบบสินทรัพย์ว่างเปล่าเมื่อมีคำค้นค้างอยู่ — แก้แล้ว (1 ก.ย. 2026, Esther03u)

**อาการเดิม:** เข้าแท็บ "ระบบสินทรัพย์" แล้วหัวข้อขึ้น "โครงสร้างสินทรัพย์ (5 อาคาร)" แต่ข้างล่างว่างเปล่าสนิท

**สาเหตุ (ตรวจโค้ดแล้ว):** หัวข้อกับเนื้อหาใช้ข้อมูลคนละชุด
- หัวข้อใช้ `buildings.length` — **ข้อมูลดิบ ไม่ผ่านตัวกรอง** (`asset-manager.tsx` ~บรรทัด 238)
- เนื้อหาใช้ `paginatedBuildings` — ผ่าน `globalSearch` แล้วตัดหน้าอีกที

พอมีคำค้นค้างอยู่จากแท็บอื่น ตัวกรองตัดอาคารออกหมดเหลือ 0 แต่หัวข้อยังประกาศว่ามี 5 อาคาร

**ทำให้แย่ลงอีกชั้น:** ตัวกรองนี้ค้นแค่ **ชื่ออาคาร / เลขห้อง** แต่คำค้นที่ตามมาจากกระดานใบงานมักเป็น**รหัสแอร์** ซึ่งไม่แมตช์อะไรเลยสักอาคาร

**แก้ครบทั้ง 3 อย่าง:**
1. **หัวข้อนับจากผลที่กรองแล้ว** — `asset-manager.tsx` เปลี่ยน `{buildings.length}` → `{filteredBuildings.length}` ตัวเดียว
2. **เพิ่ม empty state** — เมื่อ `filteredBuildings.length === 0` แยก 2 กรณี: มีคำค้นอยู่ → "ไม่พบอาคารที่ตรงกับ &quot;…&quot;" พร้อมปุ่ม "ล้างคำค้นหา", ไม่มีคำค้น (อาคารว่างจริง) → "ยังไม่มีข้อมูลอาคารในระบบ" เฉยๆ ไม่มีปุ่ม (ล้างคำค้นไปก็ไม่ช่วยอะไร) — ปุ่มเรียก prop ใหม่ `onClearSearch` ที่รับมาจาก parent
3. **`globalSearch` ใช้ร่วมกันข้ามแท็บ** — เลือกทาง **ล้างคำค้นหาอัตโนมัติเมื่อสลับแท็บผ่านเมนู** (ไม่ใช่แยกช่องค้นหาต่อแท็บ เพราะต้องแก้หลายจุดกว่า และแต่ละแท็บมีแค่ช่องเดียวอยู่แล้วในตำแหน่งเดียวกันของ `DashboardLayout`) — เพิ่ม `handleTabChange()` ใน `admin-dashboard-view.tsx` ที่ `setGlobalSearch(""); setActiveTab(tab);` แล้วส่งให้ `DashboardLayout` แทน `setActiveTab` ดิบๆ

**จุดที่ต้องระวังไม่ให้พังของเดิม:** `OverviewPanel` มีปุ่ม "ไปดูรายละเอียด" ที่ตั้งใจจะสลับไปแท็บ "ระบบสินทรัพย์" **พร้อมเซ็ตคำค้นเป็นรหัสแอร์ไปด้วย** (`onViewDetails` เรียก `setActiveTab("assets")` + `setGlobalSearch(acCode)` ตรงๆ) — จุดนี้ **ไม่ได้ผ่าน `handleTabChange`** จึงยังทำงานเหมือนเดิม ไม่ถูกล้างคำค้นทิ้งไปด้วย (แม้ตัวคำค้นที่เป็นรหัสแอร์นั้นจะยังไม่ match อะไรอยู่ดีเพราะช่องค้นหานี้ค้นแค่ชื่ออาคาร/เลขห้องตามป้าย placeholder — เป็นบั๊กแฝงคนละจุดที่ไม่ได้อยู่ในขอบเขตข้อนี้ ยังไม่ได้แก้)

**ทดสอบจริงในเบราว์เซอร์ (ทั้งสว่างและมืด):** พิมพ์รหัสแอร์ในแท็บ "ระบบสินทรัพย์" โดยตรง → หัวข้อขึ้น "(0 อาคาร)" ถูกต้อง พร้อม empty state และปุ่ม "ล้างคำค้นหา" กดแล้วกลับมาเห็นครบ 3 อาคารเหมือนเดิม · พิมพ์คำค้นในแท็บ "กระดานใบงาน" แล้วกดสลับไปแท็บ "ระบบสินทรัพย์" ผ่านเมนู → ช่องค้นหาว่างเปล่าอัตโนมัติ ไม่มีคำค้นค้างข้ามแท็บอีกต่อไป · `tsc --noEmit` และ `next build` ผ่านสะอาดทั้งคู่ ไม่มี error ใน console

---

## 2. ✅ ปฏิทิน — ชื่ออาคารถูกตัดจนแยกไม่ออก — แก้แล้ว (1 ก.ย. 2026, Esther03u)

**อาการเดิม:** วันเดียวมี pill ที่ดูเหมือนกันสองอัน เช่น 6 ส.ค. ขึ้น `Administration Buildin` ติดกันสองอัน

> ✅ **ตัดสินแล้ว 28 ส.ค.: เลือกทางที่ 4 ที่ไม่ได้อยู่ในรายการเดิม — แสดงชื่อเต็ม เอา truncate ออก** เพราะชื่ออาคารของจริงสั้น (`อาคาร 20`, `อาคารห้องสมุด`) ที่ยาวคือ seed data เท่านั้น · **ไม่ต้องใช้ `abbreviation` และไม่ต้องรอ backend**

**ไม่ใช่บั๊กการจัดกลุ่ม** — ตรวจ DB แล้วเป็นคนละอาคารจริง:

| อาคาร | id | รหัสแอร์ |
|---|---|---|
| Administration Building **392965** | 2 | B660550-1-241631-01 |
| Administration Building **293183** | 3 | B467711-1-19179-01 |

ชื่ออาคารทุกอันขึ้นต้นเหมือนกัน (`Administration Building …`) และ**เลขที่แยกความต่างอยู่ท้ายชื่อซึ่งโดน truncate ตัดทิ้งพอดี**

**แก้:** `shared/maintenance-calendar.tsx` (ใช้ทั้ง admin และช่าง เพราะปฏิทินสองฝั่งเป็น component ตัวเดียวกัน) — pill จัดกลุ่มตามอาคารในช่องวัน (บรรทัด ~297-312 เดิม) ตัด class `truncate` ออกทั้ง div ครอบและ span ข้างใน เปลี่ยนจาก `items-center` เป็น `items-start` (ให้ไอคอนตึกกับลูกศรชิดขอบบนตอนข้อความขึ้น 2-3 บรรทัด แทนที่จะลอยกลางกล่องที่สูงขึ้น) และเพิ่ม `min-w-0` ที่ span ข้อความให้ flex item ยอมหดแล้วตัดขึ้นบรรทัดใหม่แทนล้นออกนอกกล่อง — เอา `title` tooltip เดิมออกด้วยเพราะข้อความเต็มแสดงอยู่แล้ว ไม่จำเป็นต้อง hover

**จุดอื่นที่มี `truncate` ในไฟล์เดียวกัน (บรรทัด ~428-429, ~515-518) ตั้งใจไม่แตะ** — เป็นชื่องาน/เลขห้องในรายการภายใน modal และ side sheet ไม่ใช่ pill ที่ผู้ใช้รายงานปัญหา และไม่มีปัญหาสองรายการดูเหมือนกันแบบนี้

**ทดสอบจริงในเบราว์เซอร์ (ทั้งสว่างและมืด):** seed data ปัจจุบันไม่มีชื่ออาคารยาวแบบ `Administration Building ######` แล้ว (ยืนยันด้วย DOM query ว่าไม่มี class `truncate` เหลืออยู่บน pill ไหนเลย) จึงจำลองด้วยการแทรกชื่อยาวเข้าไปในปุ่มจริงผ่าน DevTools — ยืนยันด้วย `getBoundingClientRect()` ว่ากล่อง pill สูงขึ้น (54.6px จากปกติ ~18px บรรทัดเดียว) แทนที่จะกว้างล้นหรือถูกตัด `...` ยืนยันด้วยตาอีกครั้งว่าอ่านออกครบทุกตัวอักษร ไล่ขึ้นบรรทัดใหม่ 3 บรรทัดในกล่องเดิม ไม่มี error ใน console · `tsc --noEmit` และ `next build` ผ่านสะอาดทั้งคู่

---

## 3. ✅ แบ่งตามอาคาร — 5 หน้า — แก้แล้ว (1 ก.ย. 2026, Esther03u)

ทุกหน้าใช้กติกาเดียวกัน:
- จัดกลุ่มตามอาคาร กดเข้าไปแล้วเห็นรายการข้างใน
- **บอกจำนวนของแต่ละอาคาร**
- **แสดงเฉพาะอาคารที่มีรายการ ซ่อนอาคารที่ว่าง**

| หน้า | แสดงต่อ 1 อาคาร | field ที่ต้องใช้ | สถานะ |
|---|---|---|---|
| จัดการ QR Code (admin) | จำนวนเครื่อง | prop `buildings` ที่มีโครงครบอยู่แล้ว | ✅ **แก้แล้ว** |
| งานทั้งหมด (ช่าง) | จำนวนงาน | `buildingId` + `buildingName` ใน `jobPool` | ✅ **แก้แล้ว** |
| งานของฉัน (ช่าง) | จำนวนงาน | `buildingId` + `buildingName` ใน `myJobs` | ✅ **แก้แล้ว** |
| ประวัติ (ช่าง) | จำนวนงาน | `buildingId` + `buildingName` ใน `completedJobs` | ✅ **แก้แล้ว** |
| แอร์ทั้งหมด (ช่าง) | **งานซ่อม / งานล้าง / จำนวนชั้น / จำนวนห้อง / จำนวนแอร์** | `buildingId` + `roomName` + `floor` ใน `assetList` | ✅ **แก้แล้ว** |

> ได้ `buildingId` แถมมาให้ทุกรายการด้วย ใช้จัดกลุ่มแทนการเทียบชื่อจะแม่นกว่า — ชื่ออาคารซ้ำกันได้ แต่ id ไม่ซ้ำ

**ทั้ง 5 หน้าโหลดข้อมูลมาครบฝั่ง client แล้ว** และแบ่งหน้าฝั่ง client ด้วย จึงจัดกลุ่มก่อนแบ่งหน้าได้เลย **ไม่เจอปัญหาอาคารถูกหั่นข้ามหน้า** แบบที่กระดานใบงานเคยเจอ

**กติกา "ซ่อนอาคารที่ว่าง" ทำให้งานง่ายลง ไม่ใช่ยากขึ้น** — ถ้าจัดกลุ่มโดยไล่จาก*รายการที่มีอยู่*แล้วรวบเป็นกลุ่ม อาคารที่ไม่มีรายการจะไม่โผล่มาเองอยู่แล้ว ไม่ต้องเขียนเงื่อนไขซ่อนเพิ่ม

**มีของอ้างอิงอยู่แล้ว** — pill ในปฏิทินทำแบบนี้อยู่ (`Administration Building 392965 (1)` และแสดงเฉพาะวันที่มีงาน) เอารูปแบบเดียวกันมาใช้ได้เลย

### ✅ ทำ component กลางตัวเดียว — ตกลงแล้ว 28 ส.ค. เอาตามนี้

ตอนนี้มี **5 หน้าที่จัดกลุ่มตามอาคารด้วยกติกาเดียวกันเป๊ะ** บวกกับระบบสินทรัพย์และปฏิทินที่ทำแบบนี้อยู่แล้ว

ถ้าเขียนแยกกัน 5 ที่ จะได้หน้าตาไม่เหมือนกัน 5 แบบ และพอแก้กติกาทีหนึ่งต้องไล่แก้ 5 รอบ — **แนะนำให้ทำ component กลางแล้วเอาไปใช้ซ้ำ** เหตุผลเดียวกับที่ backlog ข้อ 1+7 รอบก่อนใช้ `compareJobOrder()` ตัวเดียวกันสองหน้าแล้วได้ผลดี

**ตกลงแล้วว่าเอาแบบนี้ และ DoubleKill จัด shape ให้เรียบร้อยแล้ว** — ทั้ง 4 รายการส่ง `buildingId` + `buildingName` ชื่อเดียวกันหมด component เดียวจึงรับได้ทุกหน้าโดยไม่ต้อง map ต่อ

### ✅ จุดที่ต้องตัดสิน — ตัดสินแล้ว 28 ส.ค. และแก้เสร็จแล้ว

**"งานซ่อมกี่งาน / งานล้างกี่งาน" ในหน้าแอร์ทั้งหมด จะนับจากอะไร** — เลือก **นับจาก `type` ของใบงาน ทั้งการ์ดสรุปและตัวเลขรายอาคาร** (DoubleKill แก้ `assetSummary` เสร็จแล้วใน `85c5c6a`)

**ตัวเลขบนการ์ดเปลี่ยนไปแล้ว อย่าตกใจว่าเป็นบั๊ก** — และของเดิมคือบั๊กจริงๆ:

| | เดิม (นับจากสถานะเครื่อง) | ใหม่ (นับจาก `type`) |
|---|---|---|
| รอซ่อม | 16 | **8** |
| รอล้าง | 21 | **35** |
| รวม | 37 ❌ | **43 ✅ = จำนวนใบงานที่ค้างจริง** |

สูตรเดิมพลาด 2 ทาง: **ใบงานล้าง 8 ใบที่อยู่บนเครื่องสถานะ `broken` ถูกนับเป็นงานซ่อม** และ **ใบงาน 6 ใบบนเครื่องสถานะ `normal` ไม่ถูกนับในการ์ดไหนเลย** — พอนับจาก `type` ตัวเลขรายอาคารบวกกันแล้วเท่าการ์ดด้านบนเสมอ ซึ่งเป็นเงื่อนไขที่ทำให้ข้อ 3 ทำได้จริง

### ✅ วิธีที่ทำจริง — component กลางตัวเดียว

สร้าง `src/components/shared/building-groups.tsx` ไฟล์ใหม่ (ไม่แตะ `src/lib/**` เพราะเป็นพื้นที่ backend) export 2 อย่าง:

1. **`groupByBuilding(items)`** — ฟังก์ชันล้วน จัดกลุ่มตาม `buildingId` แล้วเรียงชื่ออาคาร (`localeCompare` แบบไทย) อาคารที่ไม่มีรายการไม่มีทางโผล่มา เพราะกลุ่มเกิดจากไล่ตัวรายการเอง ไม่ได้ไล่ตัวอาคารแล้วมากรอง — ได้ "ซ่อนอาคารที่ว่าง" มาฟรีตามที่ตั้งเป้าไว้
2. **`<BuildingGroupList>`** — การ์ดอาคารพับ/กางได้ (เปิดได้ทีละใบเดียว ตามแบบ `asset-manager.tsx`), **แบ่งหน้าที่ตัวอาคาร ไม่ใช่ตัวรายการ** (การ์ดที่พับอยู่กินที่แทบไม่ต่างจากไม่มีเลย จึงไม่จำเป็นต้อง cap จำนวนรายการข้างในอีกชั้น), รับ `getSubtitle`/`renderExtra`/`renderItems` เป็น render prop ให้แต่ละหน้าคุมเนื้อหาข้างในเองได้เต็มที่ (การ์ดสำหรับ 4 หน้าฝั่งช่าง, ตารางสำหรับหน้า QR Code) และ `resetKey` ให้หน้าเรียกส่ง `` `${searchQuery}|${selectedBuilding}` `` เข้ามาเพื่อรีเซ็ตหน้ากลับไปที่ 1 เมื่อตัวกรองเปลี่ยน (คนละกลไกกับ `expandedBuildingId` ที่เช็คว่ายังอยู่ในกลุ่มปัจจุบันไหมทุกครั้งที่ render แทน — กันปัญหาเดียวกับที่แก้ในข้อ 1 คือ state ค้างอ้างถึงอาคารที่กรองออกไปแล้ว)

**เปลี่ยนพฤติกรรม pagination โดยตั้งใจ:** ตัดการแบ่งหน้าระดับรายการ (10-15 ต่อหน้า) ทิ้งทั้ง 5 ไฟล์ เปลี่ยนเป็นแบ่งหน้าที่ระดับอาคารแทน (5 อาคารต่อหน้า) — งานภายในอาคารเดียวที่เปิดออกมาไม่ถูกตัดอีกต่อไป ตรงกับที่ HANDOFF ระบุไว้ว่า "จัดกลุ่มก่อนแบ่งหน้าได้เลย"

**แก้ type ที่ขาด:** `TechJobItem` (`components/tech/types.ts`) ไม่เคยประกาศ `buildingId`/`buildingName` ทั้งที่ backend ส่งมาให้ครบตั้งแต่ `85c5c6a` แล้ว — เพิ่มเป็น field บังคับ ผลคือจุดเดียวที่พังคือ `tech-mobile-view.tsx` ตอนสร้าง job แบบ synthetic จากการสแกน QR (`scanQrCodeAction` ไม่ส่ง building มาด้วย) แก้ด้วยการใส่ค่าว่างไปตรงนั้น เพราะ object นั้นใช้แค่เปิดโมดัลบันทึกงาน ไม่เคยผ่านการจัดกลุ่มอาคารเลย

**หน้า QR Code (admin) ซับซ้อนกว่าอีก 4 หน้า** เพราะเป็นตารางกาเครื่องหมายเลือกหลายแถวเพื่อพิมพ์ QR แบบกลุ่ม ไม่ใช่การ์ด — ปรับ "เลือกทั้งหมด" เดิม (เลือกทั้งหน้าที่กำลังดู) เป็น **"เลือกทั้งอาคาร"** ต่ออาคาร (checkbox บนหัวตารางของแต่ละอาคาร + checkbox เล็กข้างชื่ออาคารตอนพับอยู่) ส่วนแบนเนอร์ "เลือกแล้ว N รายการ" กับปุ่มพิมพ์ยังทำงานข้ามอาคารได้เหมือนเดิมเพราะเก็บเป็น id ล้วนไม่ผูกกับหน้าจอ

**ไม่แตะ:** `selectedBuilding` dropdown filter ฝั่งช่าง (เลือกอาคารเดียวจากเมนู) ยังอยู่เหมือนเดิม ทำงานคู่กับการจัดกลุ่มได้ปกติ — ถ้าเลือกอาคารหนึ่งจากดรอปดาวน์ ผลที่กรองแล้วจะเหลือกลุ่มเดียว ไม่ขัดกัน

**ทดสอบจริงในเบราว์เซอร์ (ทั้งสว่างและมืด, admin + ช่าง):** ล็อกอินช่างทดสอบ (`tech@pkru.ac.th`) ไล่ครบ 4 แท็บ — "งานทั้งหมด" จัดกลุ่มถูก (อาคารที่ไม่มีงานรอรับไม่โผล่แม้จะมีอยู่ในดรอปดาวน์ก็ตาม), "งานของฉัน" เปิด/ปิดทีละอาคารถูกต้อง (คลิกอาคารที่ 2 แล้วอาคารที่ 1 พับอัตโนมัติ), "แอร์ทั้งหมด" ป้าย "🧹 2" ต่ออาคารตรงกับการ์ดสรุปรวมด้านบน, "ประวัติ" กรองด้วยรหัสแอร์แล้วเหลือกลุ่มเดียวถูกต้อง · ล็อกอิน admin ทดสอบหน้า "จัดการ QR Code" — เลือกแถวเดียวแล้ว "เลือกทั้งอาคาร" ติ๊กอัตโนมัติ (เพราะอาคารนั้นมีเครื่องเดียว), เปิดตัวอย่าง QR ได้ปกติ, ค้นหา "EDU-201" แล้วเหลือแค่อาคารครุศาสตร์ (4 เครื่อง) ตัวเลขหัวข้อปรับตาม · ไม่มี error ใน console ทุกหน้า · `tsc --noEmit` และ `next build` ผ่านสะอาดทั้งคู่

---

## 4. ✅ ลบยี่ห้อ/รุ่นแอร์ — soft delete + ถังขยะ — เฟส 1 (UI) แก้แล้ว (1 ก.ย. 2026, Esther03u)

**ตัดสินใจครบแล้ว:**

| เรื่อง | เลือก |
|---|---|
| ลบแล้วยังอ่านได้ | ✅ soft delete — เครื่องที่ใช้อยู่ยังแสดงชื่อได้ ประวัติไม่เสีย |
| กู้คืน | ✅ ได้ |
| ลบถาวร | ✅ มี — ทำเป็น**ถังขยะ** |
| บังคับลบตามกัน | ❌ ไม่บังคับ ติดสัญลักษณ์ให้ตามไปจัดการเอง |
| สัญลักษณ์โผล่ที่ไหน | **ทุกเครื่องที่ยังใช้ยี่ห้อ/รุ่นนั้นอยู่** |

**มีแบบให้ยึดอยู่แล้ว** — `air_conditioners.deleted_at` ใช้ soft delete มาตั้งแต่ต้น และ query ที่เกี่ยวข้องกรอง `deletedAt: null` อยู่แล้ว ทำให้ `ac_brands`/`ac_models` เหมือนกันได้เลย

**ข้อดีที่ตามมา:** พอเป็น soft delete แล้ว `onDelete: Restrict` ไม่ถูกชนตอนลบ — ปัญหาที่ทำให้ทั้ง 5 ยี่ห้อลบไม่ได้เลยหายไปเอง

### ⚠️ `Restrict` ไม่ได้หายไป แค่ย้ายไปอยู่ที่ "ลบถาวร"

ตอนลบถาวรจากถังขยะจะชน `Restrict` เต็มๆ ถ้ายังมีเครื่องใช้อยู่ และซับซ้อนขึ้นเพราะ `ac_models` ผูกกับ `ac_brands` แบบ **Cascade** — ลบยี่ห้อถาวรจะพยายามลบรุ่นตาม แล้วไปชน `Restrict` ของเครื่องที่ใช้รุ่นนั้นอีกที

**ถังขยะเป็นที่ที่เหมาะกับการบอกผู้ใช้พอดี:** *"ลบถาวรไม่ได้ ยังมี 14 เครื่องใช้อยู่"* พร้อมทางไปดูว่าเครื่องไหนบ้าง — ตรงกับเจตนา "ตามไปลบเองได้สะดวก"

### สภาพข้อมูลจริง

| ยี่ห้อ | รุ่น | เครื่องที่ใช้อยู่ |
|---|---|---|
| Carrier | 37 | 14 |
| Daikin | 39 | 16 |
| LG | 44 | 19 |
| Mitsubishi Electric | 32 | 10 |
| Panasonic | 37 | 13 |

**ทั้ง 5 ยี่ห้อมีเครื่องใช้อยู่หมด** → ลบถาวรไม่ได้สักอัน
**แต่รุ่นที่ไม่มีใครใช้เลยมี 117 จาก 189 รุ่น** → ลบได้เยอะ เป็นการล้างข้อมูลขยะที่มีประโยชน์จริง

### ✅ แบ่ง 2 เฟส — ตัดสินแล้ว 28 ส.ค. · เฟส 1 ฝั่ง backend เสร็จแล้ว (`97e24bc`)

- **เฟส 1** — soft delete + กู้คืน + ถังขยะ + สัญลักษณ์ในหน้า Master Data · ใช้งานได้จริงแล้ว
- **เฟส 2** — กระจายสัญลักษณ์ไปทุกเครื่อง **ต้องแตะ 9 จุดที่ส่งข้อมูลยี่ห้อออกไป**: `assets.ts` · `dashboard.ts` (2) · `work-order-board.ts` · `maintenance.ts` · `maintenance-schedules/route.ts` · `qr/[id]/page.tsx` · `tech/actions.ts` (4)

ทุกจุดตอนนี้ใช้แพทเทิร์น `acBrand?.name || brand || "ไม่ระบุ"` ซึ่งคืน**สตริงชื่อล้วน** ไม่มีที่ให้แนบธง — ต้องเพิ่ม field ใหม่ทั้ง 9 จุด **เฟส 2 ใหญ่กว่าอีก 3 ข้อรวมกัน** — **ยังไม่ทำรอบนี้ ตกลงเลื่อนไว้ก่อนตามที่ระบุไว้ข้างต้น**

### ✅ วิธีที่ทำจริง (เฟส 1 ฝั่ง UI)

**หน้า Master Data (`src/app/admin/master-data/master-data-client.tsx`)** เพิ่ม:
- ปุ่มถังขยะ (Trash2 icon) บนหัวข้อ "ยี่ห้อ" แต่ละใบ — คลิกแล้วโผล่แถบยืนยันแทนที่ native `confirm()` (ยึดแพทเทิร์นเดียวกับฟอร์มยกเลิกใบงานใน `work-order-detail-dialog.tsx` ที่มีอยู่แล้ว — toggle state เปิด/ปิดฟอร์มยืนยันในที่เดิม ไม่ใช่ popup แยก) ยืนยันแล้วเรียก `deleteAcBrandAction(brandId)` แล้ว `router.refresh()`
- ปุ่มถังขยะเล็กบนการ์ดแต่ละรุ่น (ในมุมมองขยายของยี่ห้อ) พฤติกรรมเดียวกัน เรียก `deleteAcModelAction(modelId)`
- ปุ่ม "ถังขยะ" ที่หัวรายการ เปิด modal ใหม่

**Modal ใหม่ (`src/app/admin/master-data/trash-modal.tsx`)** — โหลด `getAcTrashData()` ตอนเปิด แยก 2 ส่วน (ยี่ห้อ/รุ่น) แต่ละแถวแสดงชื่อ, วันที่ลบ, จำนวนเครื่องที่ยังใช้อยู่, ปุ่ม "กู้คืน" (เรียก `restoreAcBrandAction`/`restoreAcModelAction` ตรงๆ ไม่ต้องยืนยันเพราะย้อนกลับได้) และปุ่ม "ลบถาวร" ที่ **ปิดใช้งานทันทีถ้า `canPurge === false`** (ไม่ต้องรอกดแล้วเจอ error) พร้อมข้อความอธิบายเหตุผลจาก `unitsUsing` ใต้แถว — ถ้ากดได้ ต้องผ่านแถบยืนยันอีกชั้นก่อน (`"ยืนยันลบถาวร? กู้คืนไม่ได้อีก"`) เพราะเป็นการกระทำที่ย้อนกลับไม่ได้จริง ต่างจาก soft delete ที่กดได้ตรงๆ

**กู้คืนรุ่นที่ยี่ห้อยังอยู่ในถังขยะ** — ใช้ `toast.warning(result.warning)` (เดิมโปรเจกต์นี้ใช้แค่ `toast.error`/`toast.success` ทั้งคู่ — เพิ่ม `.warning` ของ sonner เพราะกรณีนี้คือ "สำเร็จแต่ยังไม่สมบูรณ์" ตรงกับความหมายมากกว่า)

**ไม่ทำ:** เฟส 2 (กระจายสัญลักษณ์ไปทุกเครื่องที่ใช้ยี่ห้อ/รุ่นที่ถูกลบ) ตามที่ตกลงเลื่อนไว้ — ตอนนี้แค่ลบแล้วเครื่องที่ใช้อยู่ยังโชว์ชื่อปกติเหมือนเดิมทุกที่ (ไม่มีจุดไหนขึ้นป้ายเตือนแยก) ตรงตามพฤติกรรมที่ backend ตั้งใจไว้

**ทดสอบจริงในเบราว์เซอร์ (ทั้งสว่างและมืด):** ลบยี่ห้อ "Panasonic" (1 เครื่องใช้อยู่) → หายจากรายการหลักทันที ("3 ยี่ห้อ • 5 รุ่น" → "2 ยี่ห้อ • 4 รุ่น") → เปิดถังขยะเจอ Panasonic พร้อมข้อความ "ลบถาวรไม่ได้ ยังมี 1 เครื่องใช้อยู่" และปุ่ม "ลบถาวร" จางลง (disabled) ตรงกับ `canPurge: false` → กด "กู้คืน" → กลับมาที่รายการหลักครบเหมือนเดิม · ทดสอบลบ/กู้คืนรุ่น "Econavi 18000" แบบเดียวกัน ผ่านหมด (หัวข้อยี่ห้อปรับจาก "1 รุ่น" → "0 รุ่น" → "ยังไม่มีรุ่นในยี่ห้อนี้" → กลับมาเหมือนเดิมหลังกู้คืน) · ไม่มี error ใน console ตลอดทั้ง flow · `tsc --noEmit` และ `next build` ผ่านสะอาดทั้งคู่

---

## 🔧 บันทึกงาน backend 28 ส.ค. 2026 (DoubleKill) — รายละเอียดสำหรับคนที่ต้องแก้ต่อ

### ก้อน A — `85c5c6a` แตะ 2 ไฟล์ ไม่มี migration ไม่มี query เพิ่ม

**`src/app/tech/actions.ts`** — เพิ่ม `buildingId` + `buildingName` ใน 3 รายการ · **`src/lib/maintenance.ts`** — เพิ่ม `buildingId`/`roomName`/`floor` ใน `TechnicianAssetUnit` + แก้ `assetSummary`

ทุก query `include` ตาราง `building` มาครบอยู่แล้ว การเพิ่ม field จึงเป็นแค่การ map ค่าที่โหลดมาแล้ว **ไม่มี round trip เพิ่ม** ส่วน `assetList` ต้องเติม `id: true` ใน select ของ building 1 จุดเท่านั้น

**เหตุผลที่แยก field ออกมาแทนที่จะให้ UI ตัดสตริง:** `location` เป็นข้อความที่ประกอบไว้เพื่ออ่าน (`อาคาร (ตัวย่อ) - ห้อง X (ชั้น N)`) การจัดกลุ่มจากมันคือการ match สตริง ซึ่งพังทันทีถ้าชื่ออาคารไปพ้องกับชื่อห้อง

### ก้อน B — `97e24bc` soft delete ยี่ห้อ/รุ่นแอร์ เฟส 1

**Migration `20260828120000_add_ac_catalogue_soft_delete`** — เพิ่ม `deleted_at` ใน `ac_brands` + `ac_models` แบบเดียวกับ `air_conditioners.deleted_at` · nullable ไม่ต้อง backfill (NULL = ยังใช้อยู่ และของเดิมใช้อยู่ทุกแถว)

**จุดที่ต้องกรอง `deletedAt` (กรองเฉพาะที่ "ให้เลือก" ไม่ใช่ที่ "แสดงผล"):**

| ไฟล์ | กรองอะไร |
|---|---|
| `src/lib/admin/dashboard.ts` | ดรอปดาวน์ยี่ห้อ/รุ่นในฟอร์มลงทะเบียนแอร์ — กรอง 2 ชั้น |
| `src/app/admin/master-data/actions.ts` | `getAcMasterData()` + `_count` กรองให้ตรงกับรายการที่แสดง |
| `src/lib/admin/assets.ts` | ตอนสร้าง/แก้แอร์ เปลี่ยน `findUnique` → `findFirst` + เงื่อนไข `deletedAt: null` ทั้งรุ่นและยี่ห้อ |

**ที่ตั้งใจไม่กรอง:** ทุกจุดที่อ่านยี่ห้อ*จากตัวเครื่อง* (`work-order-board.ts`, `qr/[id]/page.tsx`, ปฏิทิน ฯลฯ) — เครื่องที่ใช้ยี่ห้อที่เลิกขายแล้วต้องแสดงชื่อได้ตามปกติ นี่คือเหตุผลทั้งหมดที่ทำ soft delete แทนลบจริง

### 3 การตัดสินใจเชิงออกแบบที่มีผลกับคนแก้ต่อ

1. **ลบยี่ห้อไม่ stamp `deleted_at` ของรุ่นข้างใต้** — query กรองจาก `deleted_at` ของยี่ห้อด้วยอยู่แล้ว รุ่นจึงหายจากดรอปดาวน์เหมือนกัน แต่พอกู้ยี่ห้อคืนจะได้รุ่นกลับมา**เฉพาะที่ยังไม่ถูกลบแยก** ถ้า stamp ตามกันจะแยกไม่ออกว่ารุ่นไหนถูกลบไว้ก่อนหน้า
2. **การนับเครื่องเพื่อบล็อกลบถาวร นับ `air_conditioners` ทุกแถว รวมเครื่องที่ soft delete ไปแล้ว** — เพราะเครื่องที่ถูก soft delete **ยังถือ foreign key อยู่จริง** `Restrict` จึงยังยิงอยู่ ถ้านับเฉพาะเครื่องที่ยังใช้งาน ปุ่มจะบอกว่าลบได้แล้ว DB ปฏิเสธทีหลัง ซึ่งแย่กว่าไม่ให้กดตั้งแต่แรก · ข้อความ error แยกตัวเลข 2 ชุดให้แล้ว (`total` / `live`)
3. **เช็คชื่อซ้ำตอนสร้างใหม่ต้องดู `deleted_at` ด้วย** — unique index ครอบแถวที่อยู่ในถังขยะด้วย ถ้าตอบแค่ "มีอยู่แล้ว" ผู้ใช้จะหาทางออกไม่เจอ เพราะแถวนั้นมองไม่เห็นบนหน้าจอ ตอนนี้ตอบว่าให้ไปกู้คืนจากถังขยะแทน

### ผลตรวจด้วยการรันจริง (ไม่ใช่แค่ build ผ่าน)

- **สคริปต์กับ DB จริง (rollback ทุกขั้น):** hard delete รุ่นที่มีเครื่องใช้ **ถูก DB ปฏิเสธจริง** (`Foreign key constraint violated on the fields: (ac_model_id)`) · รุ่นที่ไม่มีใครใช้ลบผ่าน · ลบยี่ห้อแล้วรุ่นข้างใต้ไม่ถูก stamp · `countBrandReferences` ได้ 14/16/19/10/13 ตรงกับ DB
- **เบราว์เซอร์จริง (login เป็น admin):** ลบ Carrier → หายจากการ์ดยี่ห้อและดรอปดาวน์ แต่เครื่องที่ใช้อยู่ยังขึ้นชื่อ "Carrier" ครบ 48 จุด → กู้คืนแล้วกลับมาเหมือนเดิมทุกอย่าง
- **เบราว์เซอร์จริง (login เป็นช่าง):** `/api/tech/units` ส่ง field ใหม่ครบทั้ง 73 เครื่อง ไม่มีตัวไหนขาด · payload ของหน้า `/tech` มี `buildingId`/`buildingName` ครบทั้ง 3 รายการ · การ์ดสรุปขึ้น 73 / 8 / 35
- `npm run build` ผ่าน 0 error (ยืนยันว่า `"use server"` รับ export ใหม่ทั้ง 7 ตัวได้) · `tsc --noEmit` ผ่าน · console + server log 0 error
- บัญชีทดสอบตั้งรหัสผ่านชั่วคราวแล้ว**ล้างกลับเป็น NULL ครบทั้ง 5 บัญชี**

### 🔴 กับดักที่เจอระหว่างทาง — จดไว้เพราะเสียเวลาหาสาเหตุนาน

**หลัง `prisma generate` ต้องรีสตาร์ท dev server** — `next dev` ที่รันอยู่ถือ Prisma client ตัวที่โหลดตอนบูต คอลัมน์ที่เพิ่งเพิ่มจึงพังตอน runtime ด้วย `PrismaClientValidationError: Unknown argument 'deletedAt'` **ทั้งที่ `tsc --noEmit` ผ่าน** (tsc อ่าน type ที่ generate ใหม่จากดิสก์) และสคริปต์ `tsx` ที่ใช้ query เดียวกันก็รันได้ปกติ

หน้าจอไม่ได้บอกอะไรใกล้เคียงความจริงเลย — มันขึ้นข้อความ catch เดิมว่า *"ไม่สามารถเชื่อมต่อฐานข้อมูล ... พอร์ต 3307"* ทำให้หลงไปไล่ดู MySQL ทั้งที่ MySQL ไม่ได้เป็นอะไร

> 💡 ข้อความ catch ใน `getOrgAdminData()` / `getTechnicianData()` ที่ hardcode ว่า "พอร์ต 3307" ทำให้หลงทางได้ทุกครั้งที่ query พังด้วยเหตุอื่น — ไว้มีโอกาสควรแก้ให้บอกตามสาเหตุจริง (ยังไม่ทำในรอบนี้)

---

## สรุปการแบ่งงาน — สถานะ 28 ส.ค. 2026

**DoubleKill (backend) — ✅ ปิดครบทุกข้อแล้ว**

| # | งาน | สถานะ | commit |
|---|---|---|---|
| 1 | `buildingId` + `buildingName` ใน `jobPool` / `myJobs` / `completedJobs` | ✅ | `85c5c6a` |
| 2 | `buildingId` + `roomName` + `floor` ใน `assetList` | ✅ | `85c5c6a` |
| 3 | ~~`abbreviation` ใน endpoint ปฏิทิน~~ | ❌ **ยกเลิก** — เลือกแสดงชื่อเต็มแทน ไม่ต้องใช้ | — |
| 4 | `assetSummary` นับจาก `type` | ✅ | `85c5c6a` |
| 5 | ข้อ 4 เฟส 1 — schema + migration + action ลบ/กู้คืน/ลบถาวร | ✅ | `97e24bc` |

**Esther03u (UI):** ข้อ 1 → ข้อ 2 → ข้อ 3 → ข้อ 4 ฝั่ง UI — **ทั้ง 4 ข้อไม่ถูกบล็อกแล้ว** ดูรายละเอียดของที่ส่งให้ในหัวข้อ "📦 ถึง Esther03u" บนสุดของไฟล์

**ยังไม่เริ่ม:** ข้อ 4 เฟส 2 (กระจายสัญลักษณ์ไป 9 จุด) — ตกลงกันว่าเลื่อนไว้ก่อน ไม่มีใครถูกบล็อก

**ยังรอปัจจัยภายนอก:** SMTP credential ใน `.env`

---

## ✅ บั๊กคอนทราสต์ธีมมืด — UI จำนวนมากอ่านไม่ออก (พบ+แก้ 23 ส.ค. 2026, Esther03u)

**อาการที่ผู้ใช้แจ้ง:** เปิดธีมมืดแล้วปุ่ม/ดรอปดาวน์/ช่องกรอกข้อมูลหลายจุดตัวอักษรจางมากจนอ่านแทบไม่ออก (สกรีนช็อตแสดงให้ดูหน้าโปรไฟล์ช่าง, ปฏิทิน, ประวัติ, กระดานใบงาน, หน้า login, โมดัลสร้างใบงาน) เกิดขึ้นทันทีหลังเปิดใช้ `next-themes` จริง (ก่อนหน้านี้ปุ่มสลับธีมมีอยู่แต่ `.dark` class ไม่เคยถูก apply กับใครมาก่อนเลย บั๊กนี้จึงซ่อนอยู่มาตลอดตั้งแต่คอมโพเนนต์พวกนี้ถูกเขียน)

**ต้นเหตุ (2 รูปแบบ แยกกันคนละที่):**

1. **`bg-white` (ค่าสีตายตัว) ผสมกับ `text-foreground`/`text-muted-foreground` (โทเคนที่สลับสีตามธีม)** — โทเคนพวกนี้ในธีมมืดจะกลายเป็นสีอ่อน/ขาว (ให้อ่านออกบนพื้นหลังมืด) แต่ตัว background ที่ hardcode เป็น `bg-white` ไม่ยอมสลับตาม ผลคือตัวอักษรสีอ่อนบนพื้นขาว = คอนทราสต์เกือบเป็นศูนย์ พบ **80 จุดใน 24 ไฟล์** ทั่วแดชบอร์ด
2. **`bg-foreground`/`bg-primary` ผสมกับ `text-white` (ค่าสีตายตัว) บนปุ่ม** — `--foreground`/`--primary` ในธีมมืดสลับเป็นสีอ่อน (ตามดีไซน์ตั้งใจ) แต่ `text-white` ที่ hardcode ไว้คู่กันไม่สลับตาม ปุ่มเลยกลายเป็นตัวอักษรขาวบนพื้นหลังเกือบขาว พบ **~20 ปุ่ม** ทั่วแดชบอร์ด (แพทเทิร์นนี้เป็นปุ่ม "primary" มาตรฐานที่ใช้ซ้ำเกือบทุกโมดัล)

ส่วนน้อยที่เจอเพิ่มระหว่างตรวจ: `divide-slate-100` (เส้นแบ่งตารางที่จางในธีมมืด, 4 ไฟล์), ring/border สถานะ "เลือกอยู่" ที่ hardcode `slate-950` บนพื้นหลัง `bg-secondary` ที่สลับสีได้ (`log-action-modal.tsx`) และ `hover:border-slate-400` (5 จุด)

**แก้อย่างไร:**
- `bg-white` → `bg-card` (โทเคนพื้นผิวการ์ด/โมดัลที่ออกแบบมาให้สลับธีมถูกต้องอยู่แล้ว) — ทำทั่ว 15 ไฟล์ในแดชบอร์ด
- `bg-foreground ... text-white` → `bg-primary ... text-primary-foreground` (คู่โทเคนที่ถูกต้องสำหรับปุ่ม primary อยู่แล้วในดีไซน์ระบบ ยืนยันจากปุ่มอื่นที่ใช้คู่นี้ถูกต้องอยู่ก่อนแล้ว เช่น `dashboard-layout.tsx`) — ทำทั่ว 12 ไฟล์
- `divide-slate-100` → `divide-border`, `hover:border-slate-400` → `hover:border-muted-foreground`, ring/border ที่เลือกอยู่ → `border-foreground`/`ring-foreground`

**ข้อยกเว้นที่ตั้งใจไม่แก้ (เช็คแล้วว่าไม่ใช่บั๊ก ไม่ใช่แค่ข้าม):**
- **กล่อง QR Code ที่พิมพ์/สแกนจริง** (`asset-manager.tsx`, `qr-code-manager.tsx`) — เพิ่ม class ใหม่ `.force-light` (ดูด้านล่าง) ครอบไว้แทน เพราะป้าย QR ต้องเป็นพื้นขาวตัวอักษรเข้มเสมอไม่ว่าธีมจะเป็นอะไร (สแกนได้แน่นอน + ตรงกับที่พิมพ์ออกมาจริง)
- **หน้า login/register/pending-approval/reset-password/request-password-reset** (ผ่าน `AuthLayout` ตัวเดียว) — ครอบด้วย `.force-light` เช่นกัน เพราะทั้งชุดเขียนด้วยสี slate/sky/emerald ตายตัวล้วนๆ ตั้งแต่แรก ไม่เคยใช้โทเคนเลยสักจุด (ตรวจนับแล้ว ~87 จุด) การไล่แก้ทีละจุดให้เป็นโทเคนจะเสี่ยงกระทบดีไซน์ที่ตั้งใจไว้โดยไม่จำเป็น — การบังคับให้เป็นธีมสว่างเสมอ (เหมือนแอปทั่วไปที่ทำกับหน้าก่อนล็อกอิน) แก้บั๊กได้ครบและปลอดภัยกว่า
- **หน้า QR สาธารณะ** (`src/app/qr/[id]/page.tsx`) — ตรวจแล้วไม่ได้ใช้โทเคนเลยสักจุด (`bg-slate-50` ไม่ใช่ `bg-background`) จึงไม่ได้รับผลกระทบจากธีมมืดอยู่แล้วโดยไม่ได้ตั้งใจ ไม่ต้องแก้อะไร
- ~~**`master-data-client.tsx`**~~ — **แก้แล้ว ✅ (23 ส.ค. 2026, อัปเดตตามคำขอ)** ตอนแรก deprioritize ไว้เพราะยังอ่านออก (สี slate ตายตัวคู่กันเอง ไม่ผสมกับโทเคน) แต่ผู้ใช้ขอให้เข้าธีมมืดด้วย — แปลงทั้งไฟล์เป็นโทเคนแล้ว (`bg-white`→`bg-card`, `bg-slate-50`→`bg-muted`, `bg-slate-200`→`bg-secondary`, `text-slate-9xx`→`text-foreground`, `text-slate-4xx/5xx/6xx`→`text-muted-foreground`, `border-slate-2xx`→`border-border`, ปุ่ม primary `bg-slate-950 text-white`→`bg-primary text-primary-foreground`, ไอคอนสถานะ "ขยายอยู่" `bg-sky-100 text-sky-700`→`bg-primary/10 text-primary` ให้เข้าแพทเทิร์นเดียวกับปุ่ม active อื่นในระบบ) ทดสอบแล้วในเบราว์เซอร์ (เปิดธีมมืดจริง): การ์ดยี่ห้อได้ `background: oklch(0.214...)` ตรงกับโทเคน `--card` ในธีมมืด, หัวข้อ/ปุ่มคอนทราสต์ถูกต้องครบ

**กลไกทางเทคนิคของ `.force-light`** (`src/app/globals.css`): ประกาศตัวแปร CSS ทั้งชุดของ `:root` (โทนสว่าง) ซ้ำในคลาสนี้ตรงๆ — เพราะ custom property สืบทอดตามลำดับ DOM ปกติ ไม่ใช่ตาม selector matching แบบ `@custom-variant dark` การประกาศซ้ำบน descendant จะชนะการประกาศของ `.dark` ที่เป็น ancestor เสมอ ไม่ว่า `<html>` จะมี `.dark` อยู่หรือไม่

**⚠️ บั๊กเสริมที่เจอระหว่างแก้ (แก้แล้ว):** ตอนเขียนคอมเมนต์อธิบาย `.force-light` ใน `globals.css` พิมพ์ข้อความ `bg-*/text-foreground` ซึ่งมีอักขระ `*/` ที่ไปปิด `/* */` comment block ก่อนกำหนดจริง ทำให้ CSS ทั้งไฟล์หลังจากนั้นถูก parse ผิดและ `npm run build` พังด้วย syntax error ที่ชี้ไปยังจุดอื่นที่ไม่เกี่ยวข้องเลย (apostrophe ใน comment ของ sonner ไกลออกไปอีกเกือบ 100 บรรทัด) — บทเรียน: **ห้ามพิมพ์ `*/` เป็นข้อความปกติใน CSS comment แม้จะตั้งใจสื่อว่า "ไฟล์ประเภท .../..." ก็ตาม**

**ทดสอบแล้วจริงในเบราว์เซอร์ (เปิดธีมมืดจริง ไม่ใช่แค่อ่านโค้ด):** ตรวจ computed style ของปุ่ม "แก้ไข"/"QR Code"/"ดูประวัติ" ในหน้าสินทรัพย์ — ก่อนแก้จะได้ `background: oklch(1 0 0)` (ขาวล้วน) คู่กับ `color: oklch(0.714...)` (เทาอ่อน) หลังแก้ได้ `background: oklch(0.214...)` (พื้นการ์ดมืดตามธีม) คู่กับ `color` เดิม — คอนทราสต์กลับมาถูกต้อง เช็คปุ่ม "บันทึกอาคาร" (เดิม `bg-foreground text-white`) หลังแก้ได้ `background: oklch(0.922...)` คู่ `color: oklch(0.214...)` — อ่านออกชัดเจน หน้า login เช็คแล้วว่ายังคงพื้นขาวตัวอักษรเข้มเหมือนเดิมทุกประการแม้ `<html>` จะมี `.dark` อยู่ก็ตาม (พิสูจน์ว่า `.force-light` ทำงานถูกต้อง)

### รอบที่ 2 — เจอเพิ่มจากสกรีนช็อตของผู้ใช้ (23 ส.ค. 2026): แถบสีความสำคัญในกระดานใบงาน

หลังแก้รอบแรกแล้ว ผู้ใช้ส่งสกรีนช็อตกระดานใบงานที่ยังมีแถวหนึ่ง "ดูเหมือนซ้อนทับ/ตัวอักษรจาง" มาให้ดู — ตรวจสอบใน DOM จริงก่อนสรุปว่าเป็นบั๊กแบบไหน: **นับ `<tr>` ทั้งหมดเทียบ acCode พบว่ารหัสแอร์ซ้ำกัน 2 คู่จริง (`EDU-202-01`, `EDU-201-02`) แต่เป็นข้อมูลถูกต้อง** (เครื่องเดียวกันมีใบงานคนละใบ คนละสถานะ/ความสำคัญกันจริง ไม่ใช่บั๊ก) — สิ่งที่ผิดจริงคือแถวที่ priority `critical`/`high` มีพื้นหลังจางผิดปกติ

**ต้นเหตุ:** `work-order-board.tsx` → `getWorkOrderRowClassName()` ใช้ `bg-red-50/60` (priority critical) และ `bg-orange-50/40` (priority high) เป็นสี tint ของแถว — ค่าสีตายตัว (ไม่ใช่โทเคน) จึงเป็นบั๊กแบบเดียวกับรอบแรกเป๊ะๆ (พื้นเกือบขาวค้าง + ตัวอักษรแถวเป็น `text-foreground`/`text-muted-foreground` ที่สลับเป็นสีอ่อนในธีมมืด) แต่ **grep รอบแรกจับไม่เจอ** เพราะรอบแรกเช็คแค่ `bg-white`/`bg-slate-*`/`bg-gray-*` ไม่ได้ครอบคลุมเฉด `-50`/`-100` ของสีอื่นๆ (red, orange, amber, sky, emerald ฯลฯ)

**ตรวจสอบเพิ่มเติม:** grep หา `bg-(สีอะไรก็ได้)-50|100` ทั่ว `src/components` แล้วไล่แยกเป็น 2 กลุ่ม — คู่ที่ hardcode ทั้ง bg และ text ด้วยกัน (เช่น `bg-red-100 text-red-800` ใน badge "ด่วนที่สุด" หลายไฟล์) **ปลอดภัย ไม่แก้** เพราะ self-consistent ไม่ผสมกับโทเคน ส่วน `work-order-board.tsx` เป็นจุดเดียวที่ hardcode แค่ bg โดยไม่มี text คู่กัน (ตัวอักษรแถวมาจากที่อื่น ใช้โทเคน) — เป็นจุดเดียวที่ต้องแก้จริง

**แก้:** `bg-red-50/60` → `bg-destructive/10`, `bg-orange-50/40` → `bg-warning/10` (โทเคนสีที่ **ไม่เปลี่ยนค่าระหว่างธีม** อยู่แล้ว — `--destructive`/`--warning` ในไฟล์ CSS นี้เป็นสีสดเกือบเท่ากันทั้ง light/dark จึงใช้แบบลดความทึบ 10% ได้ผลลัพธ์ที่อ่อนพอเป็น tint แต่ยังมีคอนทราสต์กับตัวอักษรในทั้งสองธีม)

**ทดสอบจริงในเบราว์เซอร์:** เปิดธีมมืด ไปที่กระดานใบงาน สกรีนช็อตแถว priority critical ก่อนแก้เห็นพื้นสีชมพูอ่อนเกือบขาวกลืนกับตัวอักษร หลังแก้เห็นพื้นแดงเข้มจางๆ ตัดกับตัวอักษรขาวชัดเจน เช็คแถว priority high (สีเหลือง/ส้ม) เช่นกัน ผ่านทั้งคู่ ไม่มี error ใน console

**บทเรียนสำหรับตรวจรอบต่อไปถ้าเจอแบบนี้อีก:** ต้อง grep หาสี hardcode **ทุกสีในตระกูล Tailwind** ไม่ใช่แค่ white/slate/gray — โดยเฉพาะเฉด `-50`/`-100` (สว่างมาก ปัญหาจะไม่โผล่จนกว่าจะลองธีมมืดจริง) และต้องแยกให้ออกว่าเป็น "hardcode คู่กันเอง" (ปลอดภัย) หรือ "hardcode ผสมโทเคน" (บั๊ก) เสมอ ก่อนตัดสินใจแก้

### รอบที่ 3 — ปรับดีไซน์ตามฟีดแบ็ก (23 ส.ค. 2026): ตัดแถบสีสถานะด้านซ้ายของกระดานใบงานทิ้ง

ผู้ใช้ส่งสกรีนช็อตกระดานใบงานมาอีกรอบ คราวนี้ไม่ใช่บั๊ก — วงสีแดงที่วาดไว้ในภาพบังเอิญพาดผ่านตัวอักษร ทำให้ดูเหมือนตัวหนังสือถูกตัด (ตรวจ DOM จริงแล้วยืนยันว่าข้อความครบทุกตัวอักษร ไม่มีอะไรหาย) — **แต่ระหว่างตรวจก็เจอปัญหาการออกแบบจริงที่ผู้ใช้ตั้งใจถามถึง:** แถบสีทึบด้านซ้ายของแต่ละแถว (`border-l-4` ไล่สีตาม `wo.status`: เหลือง=รอดำเนินการ, ฟ้า=กำลังทำ, เขียว=เสร็จสิ้น) **ซ้ำความหมายกับคอลัมน์ "สถานะ"** ที่มีป้าย badge ทั้งไอคอนและข้อความอยู่แล้วในตารางเดียวกัน — สื่อข้อมูลเดียวกันสองครั้งโดยแถบสีไม่มีคำอธิบายกำกับเลย ผู้ใช้จึงงงว่าคืออะไร

**ตัดสินใจร่วมกับผู้ใช้ (ถามก่อนแก้ตามที่ขอ ไม่เดาเอง):** เสนอ 3 ทาง — (ก) ลบแถบสีทิ้ง (ข) เก็บไว้แต่เพิ่ม legend อธิบาย (ค) เปลี่ยนแถบสีให้สื่อความหมายอื่นแทน (เช่นความสำคัญ) — ผู้ใช้เลือก **(ก) ลบทิ้ง** เพราะซ้ำซ้อนไม่จำเป็น

**แก้:** `work-order-board.tsx` → `getWorkOrderRowClassName()` ตัด `borderClass`/`border-l-4` ออกทั้งหมด เหลือแค่ `tintClass` (สี priority จากรอบที่ 2) และ `fadeClass` (จาง 60% เมื่อ `completed`) คอลัมน์ "สถานะ" เดิมที่มี badge ไอคอน+ข้อความยังอยู่ครบ เป็นแหล่งข้อมูลสถานะเดียวของตาราง

**ทดสอบจริงในเบราว์เซอร์:** ตารางไม่มีแถบสีซ้ายแล้ว แถวยังจางสีพื้นตาม priority ปกติ (ยืนยัน `tsc`+`build` ผ่านสะอาด) ระหว่างทดสอบเจอ error `borderClass is not defined` ใน console ครั้งแรก — เป็น **stale HMR cache ของ dev server เดิม** ไม่ใช่บั๊กจริง (production build ผ่านสะอาดตั้งแต่รอบแรก, restart dev server + เปิดแท็บใหม่แล้ว error หายไปทันที ยืนยันด้วย `grep borderClass` ในซอร์สโค้ดว่าไม่มีอะไรเหลือค้าง)

**ไฟล์ที่แก้ทั้งหมด:** `globals.css` (เพิ่ม `.force-light`), `auth-layout.tsx`, `asset-manager.tsx`, `qr-code-manager.tsx`, `overview-panel.tsx`, `admin-dashboard-view.tsx`, `tech-mobile-view.tsx`, `ac-history-modal.tsx`, `create-work-order-modal.tsx`, `settings-panel.tsx`, `assign-work-order-modal.tsx`, `work-order-board.tsx`, `work-order-detail-dialog.tsx`, `log-action-modal.tsx`, `qr-scan-modal.tsx`, `maintenance-calendar.tsx`, `profile-panel.tsx` (shared), `my-jobs-panel.tsx`, `job-pool-panel.tsx`, `team-panel.tsx`, `user-approvals-panel.tsx`, `assets-panel.tsx`, `completed-jobs-panel.tsx`

### รอบที่ 4 — ไล่ตรวจหน้าที่เหลือทั้งหมดด้วยสายตาจริง (23 ส.ค. 2026)

ผู้ใช้ขอให้ตรวจหน้าที่เหลือว่ามีจุดคล้ายกันอีกไหม แทนที่จะ grep อย่างเดียว รอบนี้ **เปิดธีมมืดจริงแล้วสกรีนช็อตไล่ทีละหน้า** ที่ยังไม่เคยตรวจด้วยตา: ภาพรวมระบบ, ปฏิทิน (พร้อมเปิด drawer รายละเอียดวัน), เจ้าหน้าที่ & ช่าง, อนุมัติผู้ใช้งาน, จัดการ QR Code (พร้อมเปิดโมดัลตัวอย่าง QR ดูกล่อง `.force-light`), และฝั่งช่าง: แอร์ทั้งหมด, งานของฉัน, ประวัติ, ปฏิทิน — **ทุกหน้าผ่านหมดยกเว้นจุดเดียว**

**เจอที่ `my-jobs-panel.tsx`:** การ์ดใบแรกในแท็บ "งานของฉัน" ใช้ `.biz-card-dark` (พื้นหลัง `var(--primary)`) เป็นการ์ด "เด่น" — ตั้งใจให้ตัดกับการ์ดอื่นด้วยสีเข้ม **แต่ `--primary` สลับเป็นสีอ่อนในธีมมืดโดยตั้งใจ** (เพื่อให้ปุ่ม primary ยังคมชัด) การ์ดที่ควรเด่นจึงกลายเป็นการ์ดที่**สว่างที่สุดในหน้า**แทน และเมื่อตรวจโค้ดพบว่ามีจุดที่คนเขียนเดิม**ลืมใส่เงื่อนไขสลับสีจริง** — เขียน ternary ไว้แต่ทั้งสองฝั่งเป็นค่าเดียวกัน (`idx === 0 ? "text-muted-foreground" : "text-muted-foreground"`) ซึ่งดูเผินๆ เหมือนตั้งใจสลับแต่จริงๆ ไม่ทำอะไรเลย — พบ 3 จุดแบบนี้ (รหัสแอร์, ไอคอนจุดสามจุด, เวลารับงาน) บวกกับเส้นแบ่ง `border-slate-800` ที่ hardcode ไว้อีก 1 จุด รวม 4 จุดในการ์ดเดียว ทั้งหมดกลายเป็นสีอ่อนบนพื้นอ่อนพอดีเมื่อการ์ดสลับเป็นธีมมืด

**แก้:** ปรับทั้ง 4 จุดให้ใช้ `text-primary-foreground` (พร้อม opacity ลดหลั่นสำหรับข้อความรอง) และ `border-primary-foreground/20` แทน — โทเคนคู่กับ `--primary` อยู่แล้ว จึงสลับสีถูกทิศทางเสมอไม่ว่าการ์ดจะเป็นเข้มหรืออ่อน (ปุ่ม "บันทึกและปิดงาน" กับข้อความ "ที่อยู่" ของการ์ดนี้ทำถูกอยู่แล้วตั้งแต่ต้น ใช้เป็นต้นแบบเทียบตอนแก้)

**ทดสอบจริงในเบราว์เซอร์:** ก่อนแก้ที่ viewport เล็กพอจะซูมเห็นชัดๆ — รหัสแอร์ "20-205-01" อ่านแทบไม่ออกบนการ์ดสว่าง หลังแก้ตรวจ computed style ได้ `color: oklab(0.214 ... / 0.7)` (เข้ม 70% ทึบ) บนพื้น `oklch(0.922...)` (อ่อน) คอนทราสต์ชัดเจน ไม่มี error ใน console

### รอบที่ 5 — ตัดการ์ด "เด่น" ใบแรกทิ้งทั้งหมด (23 ส.ค. 2026)

หลังแก้คอนทราสต์ในรอบที่ 4 ผู้ใช้ถามต่อว่า "การ์ดนี้ทำไมไม่เหมือนใบอื่น" — ตรวจโค้ดแล้วพบว่าเงื่อนไขที่ให้การ์ดใบแรกในแท็บ "งานของฉัน" มีสีต่างจากใบอื่นคือ **`idx === 0` เฉยๆ** ไม่เกี่ยวกับความด่วน/ความสำคัญของงานเลย — ทุกครั้งที่ลิสต์แสดงผลใหม่ ไม่ว่างานไหนจะตกมาอยู่อันดับ 1 ก็จะได้การ์ดสีต่างไปโดยไม่มีเหตุผลด้านข้อมูลรองรับ ผู้ใช้จึงงงเป็นธรรมดา

**ถามก่อนแก้:** เสนอ 3 ทาง — (ก) ลบสีพิเศษทิ้งให้เหมือนกันหมด (ข) เก็บไว้แต่ผูกกับเหตุผลจริง เช่น priority วิกฤต/ใกล้ครบกำหนดที่สุด (ค) ปล่อยไว้เหมือนเดิม — ผู้ใช้เลือก **(ก) ลบทิ้ง**

**แก้:** `my-jobs-panel.tsx` ตัดพารามิเตอร์ `idx` และทุก ternary ที่แยกเงื่อนไขตาม `idx === 0` ออกทั้งหมด (การ์ด, ข้อความที่อยู่, รหัสแอร์, ยี่ห้อ, ไอคอนจุดสามจุด, เส้นแบ่ง, เวลารับงาน, ปุ่ม "บันทึกและปิดงาน") เหลือ style เดียว (`.biz-card` + โทเคนมาตรฐาน) ให้ทุกใบเหมือนกันหมด — คลาส CSS `.biz-card-dark` ใน `globals.css` ไม่มีที่ไหนเรียกใช้แล้ว แต่เก็บนิยามไว้เผื่อใช้ในอนาคต (ผู้ใช้ไม่ได้ขอให้ลบ CSS ตัวนี้ แค่ขอให้เลิกใช้ในหน้านี้)

**ทดสอบจริงในเบราว์เซอร์:** การ์ดทั้ง 4 ใบในแท็บ "งานของฉัน" หน้าตาเหมือนกันหมดแล้ว (พื้นเข้มสม่ำเสมอในธีมมืด), ปุ่ม "บันทึกและปิดงาน" คอนทราสต์ดีทุกใบ ไม่มี error ใน console ยืนยัน `tsc`+`build` ผ่านสะอาด

## ✅ ย้ายป้าย Priority ขึ้นมุมขวาบนแบบ ribbon (23 ส.ค. 2026, Esther03u)

ผู้ใช้ชอบดีไซน์ป้าย ribbon มุมขวาบนที่มีอยู่แล้วใน `assets-panel.tsx` (แสดง "รอซ่อม"/"รอล้าง" เมื่อ `unit.isOverdue`) และขอให้ใช้ดีไซน์เดียวกันกับ priority ("ด่วนที่สุด"/"ด่วน") ในหน้า "งานทั้งหมด" (`job-pool-panel.tsx`) และ "งานของฉัน" (`my-jobs-panel.tsx`) แทนที่ inline chip เดิมที่อยู่ในบล็อกข้อมูลการ์ด

**จุดที่ต้องถามก่อนแก้:** `job-pool-panel.tsx` มีป้ายมุมขวาบนอยู่แล้วจากเดิม — `isUrgent(job.createdAt)` แสดง "ด่วน" สีแดงเมื่อใบงาน**ค้างรอ 3 วันขึ้นไปโดยไม่มีใครรับ** เป็นคนละแนวคิดกับ priority (ความรุนแรงของปัญหาที่แจ้ง) แต่ใช้ตำแหน่งเดียวกันและคำว่า "ด่วน" ซ้ำกัน ถามผู้ใช้ว่าจะให้ 2 สัญญาณนี้อยู่ร่วมกันยังไง — ผู้ใช้เลือก **priority ชนะก่อนเสมอ ถ้าไม่มี priority ค่อยแสดงป้ายรอนานแทน**

**แก้:**
- `job-pool-panel.tsx`: การ์ดแต่ละใบเช็คตามลำดับ `job.priority === "critical"` → ribbon แดง "ด่วนที่สุด", `=== "high"` → ribbon ส้ม "ด่วน", ไม่งั้นถ้า `isUrgent(job.createdAt)` → ribbon เหลืองอำพัน **"รอนาน"** (เปลี่ยนคำจากเดิม "ด่วน" เป็น "รอนาน" เพื่อไม่ให้สับสนกับ priority อีกต่อไป แม้จะไม่แสดงพร้อมกันแล้วก็ตาม) ตัด inline priority chip เดิมออกจากบล็อกข้อมูล เหลือแค่รหัสแอร์ + ยี่ห้อ
- `my-jobs-panel.tsx`: เพิ่ม ribbon เดียวกัน (critical → แดง "ด่วนที่สุด", high → ส้ม "ด่วน") ไม่มี isUrgent เดิมอยู่แล้วจึงไม่มีจุดชนกัน ตัด inline priority chip ออกเช่นกัน ทั้งสองไฟล์เพิ่ม `relative overflow-hidden` ที่การ์ด และ `pr-8` ที่บล็อกข้อมูลด้านในให้เว้นที่ให้ ribbon เหมือนแพทเทิร์นเดิมใน `assets-panel.tsx`

**ทดสอบจริงในเบราว์เซอร์ (ทั้งธีมมืดและสว่าง):** ล็อกอินช่างทดสอบ (`tech@pkru.ac.th`) เห็น ribbon แดง "ด่วนที่สุด" มุมขวาบนของการ์ด EDU-202-01 ในแท็บ "งานทั้งหมด" (ไม่มี inline chip ซ้ำแล้ว) และ ribbon ส้ม "ด่วน" มุมขวาบนของการ์ด SCI-101-02 ในแท็บ "งานของฉัน" — สลับเป็นธีมสว่างแล้วยังอ่านง่ายเหมือนกัน `tsc --noEmit` และ `next build` ผ่านสะอาดทั้งคู่

## ✅ พังอยู่ตอนนี้ — 2 เรื่อง (ตรวจพบ 18 สิงหาคม 2026) — **แก้แล้วทั้งคู่ 23 ส.ค. 2026 (Esther03u)**

ทั้งสองข้อ **backend เสร็จและถูกต้องแล้ว ขาดแค่ฝั่ง UI** — แก้ UI ทั้งสองจุดแล้ว ยืนยันด้วย `npx tsc --noEmit` + `npm run build` ผ่านสะอาดทั้งคู่ (ข้อ 1 ทดสอบ end-to-end ในเบราว์เซอร์แล้วด้วย ข้อ 2 เบราว์เซอร์ในเซสชันนี้ render ไม่ได้จริง แต่ตรวจ type/shape ตรงกับ backend เป๊ะ) รายละเอียดเดิมเก็บไว้ด้านล่างเพื่ออ้างอิง

### 1. ช่างบันทึก "งานซ่อม" ไม่ได้เลย — พังมาตั้งแต่ 11 ส.ค. — **แก้แล้ว**

`logMaintenanceAction` บังคับว่าถ้าประเภทงานมี `repair` ต้องส่ง `repairDetail` มาด้วย ไม่งั้นตีกลับด้วยข้อความ *"กรุณาระบุรายละเอียดการซ่อม"* (`src/app/tech/actions.ts` ~บรรทัด 335) แต่ฟอร์มบันทึกงานใน `src/components/tech/log-action-modal.tsx` **ไม่มีช่องนี้เลย** — ตรวจ field ที่ฟอร์มส่งจริงแล้วมีแค่ `workOrderId`, `airConditionerId`, `acStatus`, `parts`, `notes`

**ผลกระทบ:** ช่างติ๊ก "ซ่อมแอร์" แล้วกดบันทึก ขึ้น error ทุกครั้ง ไม่มีทางผ่าน — บันทึกได้เฉพาะงานล้างกับเติมน้ำยาเท่านั้น

**แก้:** เพิ่ม `<textarea name="repairDetail">` แสดงเฉพาะตอนติ๊ก "ซ่อม" ป้าย "ซ่อมอะไรไปบ้าง" — สเปกเต็มอยู่ที่หัวข้อ *"งานรอบแก้ไขข้อมูล ข้อ 3"*

⚠️ **อย่าสับสนกับช่อง `parts` ที่มีอยู่แล้ว** ("รายละเอียดอะไหล่/น้ำยาแอร์") — backend ไม่ได้อ่าน field ชื่อ `parts` เลย ชื่อต้องเป็น **`repairDetail`** เป๊ะๆ

### 2. กระดานใบงานซ่อนใบงานอยู่ — เกิดขึ้นแล้ว ไม่ใช่ความเสี่ยงในอนาคต — **แก้แล้ว**

`WORK_ORDER_PAGE_SIZE = 50` แต่ตอนนี้มีใบงาน **53 ใบ** และ `work-order-board.tsx` ยังไม่ได้ต่อ `getWorkOrdersPage(page)` → **มี 3 ใบที่ไม่มีทางเปิดดูจากกระดานได้เลย** และจะเพิ่มขึ้นเรื่อยๆ ทุกครั้งที่ auto-check สร้างใบงานใหม่

**แก้:** ต่อปุ่มเปลี่ยนหน้าเข้ากับ `getWorkOrdersPage(page)` — สเปกเต็มอยู่ที่ **P14** (backend เสร็จแล้ว UI ทำโครงรอไว้แล้วด้วย)

---

## ✅ คำขอ F5 ที่ค้างอยู่ — Backend เสร็จแล้วทั้ง 2 ข้อ (25 สิงหาคม 2026, DoubleKill)

ทำตามคำขอที่ Esther03u เขียนไว้เมื่อ 23 ส.ค. ครบทั้งสองข้อ **ปลดบล็อกงาน F5 ที่เหลือได้แล้ว**

**⚠️ ต้องรัน `npx prisma migrate deploy` + `npx prisma generate` หลัง pull** (migration `20260825120000_add_user_avatar_url`)

### 1. `profile` ใน `getTechnicianData()` — เสร็จแล้ว

คืน object ชื่อและ shape **เหมือน `getOrgAdminData().profile` เป๊ะ** ตามที่ขอ:

```ts
profile: { name: string; email: string; role: UserRole; phone: string | null; avatarUrl: string | null }
```

- อ่านสดจากตาราง `users` ทุกครั้ง (ไม่ใช่จาก JWT) ด้วยเหตุผลเดียวกับฝั่ง admin — แก้ชื่อแล้วเห็นผลทันทีไม่ต้อง login ใหม่
- query วิ่งขนานอยู่ใน `Promise.all` เดิม **ไม่เพิ่ม round trip**
- **มี fallback ใน catch ด้วย** (ฝั่ง admin มีอยู่แล้ว) ถ้า DB ล่มจะคืนค่าจาก session แทน ไม่งั้น `ProfilePanel` จะได้ `undefined` แล้วหน้าช่างพังทั้งหน้าตอน DB มีปัญหา

**📌 เหลือฝั่ง UI 3 จุด:**
1. `src/app/tech/page.tsx` — destructure `profile` เพิ่มจาก `getTechnicianData()` (ตอนนี้ยังไม่ได้ดึงออกมา) แล้วส่งเป็น prop
2. `tech-mobile-view.tsx` — รับ prop แล้วส่งต่อให้ `<ProfilePanel />` แทนการประกอบจาก `user` (session)
3. `profile-panel.tsx` — เปลี่ยน `showPhone` ฝั่งช่างเป็น `true` ได้แล้ว → **✅ ทำแล้ว 6 ก.ย. 2026** (เอา prop ทิ้งไปเลย ดูหัวข้อ "ช่องเบอร์โทรฝั่งช่าง" ด้านล่าง)

**ทดสอบแล้วว่าเคสที่คุณกลัวไม่เกิด:** login เป็นช่าง แก้แค่ชื่อแล้วกดบันทึก — เบอร์หลัก `085-409-1366` และเบอร์รอง `084-241-8999` ของ Craig Yost **อยู่ครบทั้งคู่** ไม่ถูกลบ (ตรวจ `user_phones` ยืนยันแล้ว) การ์ดที่คุณกันไว้ทำงานถูกต้อง

### 2. `avatarUrl` (รูปโปรไฟล์) — เสร็จครบทั้ง 4 ข้อที่ขอ

| ข้อที่ขอ | ทำแล้ว |
|---|---|
| 1. field ใน schema | `avatarUrl String? @map("avatar_url")` ใน model `User` + migration |
| 2. ย้าย `saveUpload()` เป็นฟังก์ชันกลาง | อยู่ที่ **`src/lib/upload.ts`** export ทั้ง `saveUpload()` และ `deleteUpload()` — `tech/actions.ts` เปลี่ยนไป import ตัวนี้ ไม่มีโค้ดซ้ำ พฤติกรรม resize/EXIF เหมือนเดิมทุกอย่าง |
| 3. ขยาย `updateProfileAction` | `updateProfileAction(name, phone?, avatarFile?)` |
| 4. `avatarUrl` ใน `profile` ทั้ง 2 ฝั่ง | เพิ่มแล้วทั้ง `getOrgAdminData()` และ `getTechnicianData()` (รวม fallback path) |

**สำคัญ — signature เดิมไม่พัง:** `avatarFile` เป็น **param ที่ 3 แบบ optional** โค้ดที่เรียก `updateProfileAction(name, phone)` และ `updateProfileAction(name)` อยู่ตอนนี้ใช้ได้เหมือนเดิม **ไม่ต้องแก้อะไรถ้ายังไม่ทำรูปโปรไฟล์**

**พฤติกรรมของ `avatarFile` — มี 2 กรณี ไม่ใช่ 3 แบบ `phone`:**
- ส่งไฟล์มา = เปลี่ยนรูป (รูปเก่าถูกลบออกจากดิสก์ให้อัตโนมัติ)
- ไม่ส่ง/ส่งไฟล์ว่าง = **ไม่แตะรูปเดิม**
- **ไม่มีกรณี "ส่งค่าว่าง = ลบรูป"** ตามที่คุณระบุว่าฟอร์มไม่มีปุ่มลบรูปแยก

**ตรวจไฟล์ก่อนบันทึก** — ไม่ใช่รูปภาพคืน `"รูปโปรไฟล์ต้องเป็นไฟล์รูปภาพเท่านั้น"` / เกิน 8 MB คืน `"รูปโปรไฟล์ต้องมีขนาดไม่เกิน 8 MB"` (ข้อความไทยพร้อมแสดง)

**การลบรูปเก่า** (ตามที่เจ้าของโปรเจกต์ตัดสินใจให้ลบ): ลบ**หลัง** transaction commit แล้วเท่านั้น — ถ้า transaction ล้มเหลว รูปเก่ายังเป็นรูปปัจจุบันอยู่จึงต้องรอด และถ้าบันทึกลง DB ไม่สำเร็จ รูป**ใหม่**ที่เพิ่งเขียนลงดิสก์จะถูกลบทิ้งด้วย ไม่ให้เหลือไฟล์กำพร้า

`deleteUpload()` **ลบได้เฉพาะไฟล์ที่อยู่ใต้ `/uploads/` ตรงๆ เท่านั้น** — ค่าที่ส่งเข้ามาอ่านจากคอลัมน์ใน DB จึงถือว่าไม่น่าเชื่อถือ อะไรที่ไม่ใช่ชื่อไฟล์ธรรมดา (เช่น `/uploads/../../.env`) จะถูกเมินทิ้ง ไม่ resolve ตาม **ทดสอบยิงจริงแล้ว 5 รูปแบบ ไฟล์นอกโฟลเดอร์ไม่ถูกแตะเลย**

**📌 ฝั่ง UI ทำต่อได้เลย:** `ProfilePanel` เรียก `updateProfileAction(name, phone, file)` แล้วอ่าน `profile.avatarUrl` มาแสดงแทน initials ได้ทันที (`null` = ยังไม่เคยตั้งรูป ให้ fallback เป็น initials เหมือนเดิม)

⚠️ **ยังไม่ได้ทดสอบ end-to-end เพราะฟอร์มยังไม่มีช่องอัปโหลด** — ตัว `saveUpload`/`deleteUpload` ทดสอบยิงจริงแล้ว (ไฟล์ 4.4MB → ย่อเหลือ 721KB ที่ 1600px, ลบได้, ลบซ้ำไม่พัง, กัน path traversal ผ่าน) และยืนยันแล้วว่า `profile.avatarUrl` ไหลถึง client จริง แต่เส้นทาง "อัปโหลดผ่านฟอร์ม → เข้า DB" จะครบสมบูรณ์ตอนคุณต่อ UI

### 🔴 แก้ปัญหาที่จะทำให้อัปโหลดรูปใช้ไม่ได้เลย — `bodySizeLimit`

**เจอตอนวางแผนงานนี้:** Server Action ของ Next.js จำกัด request body ไว้ที่ **1MB เป็นค่าเริ่มต้น** และโปรเจกต์นี้ไม่เคยตั้งค่านี้เลย

รูปจากมือถือปกติ 2–5MB → อัปโหลดรูปโปรไฟล์จะเด้ง error ทันที และ **การย่อรูปของ P6 ช่วยไม่ได้** เพราะ `saveUpload()` ทำงาน*หลัง*ไฟล์ข้ามมาถึงเซิร์ฟเวอร์แล้ว

**นี่กระทบของเดิมอยู่ก่อนแล้วด้วย** — `logMaintenanceAction` รับรูปก่อน/หลัง 2 รูปผ่าน FormData เจอลิมิตเดียวกัน ที่ไม่มีใครเจอเพราะตอนทดสอบใช้ไฟล์ตัวอย่างเล็กๆ (avatar-1.png 43KB)

**แก้แล้วใน `next.config.ts`:** `experimental.serverActions.bodySizeLimit = "25mb"` (ตั้งเผื่อตามที่เจ้าของโปรเจกต์สั่ง — รองรับรูปกล้องหลายใบในคำขอเดียวบวก overhead ของ multipart)

**ทดสอบยืนยันแล้วว่าลิมิตใหม่ทำงานจริง:** ส่ง body ขนาด **1.43MB** ผ่านฟอร์มบันทึกงาน — ทะลุเข้าไปถึง `prisma.maintenanceLog.createMany()` ได้ (ไปติดที่ `max_allowed_packet` ของ MySQL ซึ่งเป็นคนละด่านกัน) ถ้าลิมิตยังเป็น 1MB เดิม Next จะตีกลับตั้งแต่ก่อนเข้า action เลย และ transaction ก็ roll back สะอาด ไม่มีข้อมูลค้าง

*(`next.config.ts` ไม่ได้อยู่ในลิสต์ backend และไม่ใช่ `src/components/**` — แก้โดยได้รับอนุมัติจากเจ้าของโปรเจกต์ก่อนแล้ว)*

---

## 🐛 ถึง Esther03u — เจอ 2 เรื่องตอนทดสอบของที่คุณเพิ่งทำ (25 สิงหาคม 2026)

ไล่กดทดสอบจริงผ่านเบราว์เซอร์ให้ทั้ง 10 ข้อที่คุณทำเมื่อ 23 ส.ค. (คุณเขียนไว้เองว่าเบราว์เซอร์ในเซสชันนั้นใช้ไม่ได้ เลยยืนยันได้แค่ `tsc` + `build`) — **ผ่านหมดทุกข้อ** ตารางผลอยู่ท้ายหัวข้อ แต่เจอ 2 เรื่องที่อยากให้ดู

### 1. React เตือน setState ระหว่าง render (ขึ้นทุกครั้งที่เปิดฟอร์มบันทึกงาน)

```
Cannot update a component (`LogActionModal`) while rendering a different component (`Pattern`)
    at onFilesChange (src/components/tech/log-action-modal.tsx:135:45)
    at useFileUpload.useCallback[clearFiles] (src/hooks/use-file-upload.ts:166:7)
    at Pattern (src/components/examples/c-file-upload-4.tsx:87:20)
```

`onFilesChange={(files) => setBeforePhotos(files)}` ถูกเรียกตอน `c-file-upload-4.tsx` กำลัง render อยู่ ทำให้ `LogActionModal` setState ระหว่าง render ของอีก component — React ยอมให้ผ่านแต่เตือน และเป็นสาเหตุคลาสสิกของ state ที่อัปเดตช้าไป 1 รอบ ปกติแก้ด้วยการย้าย callback ไปเรียกใน `useEffect` แทนตอน render

### 2. แกลเลอรีรูปมีไฟล์ตัวอย่างค้างอยู่ 3 ไฟล์ตั้งแต่เปิดฟอร์ม

ทุกครั้งที่เปิดฟอร์มบันทึกงาน ช่อง "ภาพก่อนซ่อมบำรุง" และ "ภาพหลังซ่อมบำรุง" มี `avatar-1.png` / `avatar-2.png` ค้างอยู่แล้ว **3 ไฟล์ ทั้งที่ `maxFiles={1}`** (ขึ้นว่า `Gallery (3/1)`) — น่าจะเป็น `initialFiles` ที่ติดมากับตัวอย่าง `c-file-upload-4.tsx` จาก ReUI registry

ผลคือช่างที่ไม่ได้แนบรูปอาจส่งรูปตัวอย่างติดไปเป็นหลักฐานงานโดยไม่ตั้งใจ — และถ้า `initialFiles` เป็น object เปล่าไม่ใช่ `File` จริง `formData.append("beforePhoto", ...)` ก็จะส่งค่าที่ backend อ่านไม่ออก

*หมายเหตุ: ผมขับ component นี้จากสคริปต์ไม่ผ่าน (ทั้ง `input.files` และ drag-drop) จึง **ยังไม่ยืนยันว่าการอัปโหลดรูปหลักฐานทำงานถูกหรือไม่** ฝากตรวจด้วยการแนบรูปจริงสักครั้ง*

### ✅ ผลทดสอบของที่คุณทำ — ผ่านทั้งหมด

| งาน | ผลทดสอบจริง |
|---|---|
| ช่อง `repairDetail` | เลือก "ซ่อมแอร์" → ช่องโผล่ตามเงื่อนไข กรอกแล้วบันทึกได้จริง **ได้ `maintenance_logs` แถวใหม่ที่มี `repair_detail` ครบ** — งานซ่อมบันทึกได้แล้วจริงๆ |
| ปุ่มเปลี่ยนหน้ากระดานใบงาน | หน้า 1 = 50 แถว, หน้า 2 = 5 แถว **รวม 55 แถวพอดีกับใน DB ไม่ซ้ำไม่หายสักแถว** ทั้งที่มี 20 แถวที่ `created_at` เป็น NULL (เคสที่เคยทำใบงานหาย) |
| ยกเลิกใบงาน | ยกเลิก + กรอกเหตุผลได้ **สถานะเครื่องกลับเป็น `normal` อัตโนมัติ** และ audit log บันทึก `airConditionerResetToNormal` ถูกต้อง |
| S4 รอบเริ่มต้น | เปลี่ยน 6 → 4 เดือน บันทึกลง `system_settings` จริง + เขียน `UPDATE_DEFAULT_FREQUENCY` ลง audit log (คืนค่าเป็น 6 แล้ว) |
| S5 ข้อมูลองค์กร | ฟอร์มพรีฟิลชื่อหน่วยงานจาก DB จริง — การ์ดกันข้อมูลหายที่คุณทำไว้ทำงานถูก |
| S7 ตาราง audit log | แสดงข้อมูลจริง พร้อม dropdown filter ที่ดึงจาก action ที่มีอยู่จริง |
| ธีมมืด | ใช้งานได้ ทั้งหน้าช่างและ admin อ่านออกชัดเจน |
| แท็บโปรไฟล์ฝั่งช่าง | เปิดได้ แก้ชื่อแล้วบันทึกจริง เบอร์โทรไม่ถูกลบ |

**ข้อมูลทดสอบที่เปลี่ยนไปในฐานข้อมูล** (ไม่ได้ย้อนกลับ เพราะเป็น seed และการย้อนจะทำให้หลายตารางไม่สอดคล้องกัน): ใบงาน #2 ถูกปิด (มี `maintenance_logs` #616 ที่เป็นงานซ่อมพร้อม `repair_detail`), ใบงาน #35 ถูกยกเลิก, ส่วนใบงาน #5 คืนสถานะ `pending` กลับแล้ว และรหัสผ่านบัญชีทดสอบล้างกลับเป็น NULL ครบแล้ว

---

## 🧱 แยก `admin/actions.ts` (1,748 บรรทัด) เป็นโมดูลย่อย (25 สิงหาคม 2026, DoubleKill)

**⚠️ ฝั่ง UI ไม่ต้องแก้อะไรเลยแม้แต่บรรทัดเดียว** — ทุก action ยัง import จาก `@/app/admin/actions` ได้เหมือนเดิมทั้ง 18 ตัว ชื่อเดิม พาธเดิม พฤติกรรมเดิม

### โครงสร้างใหม่

| ไฟล์ | บรรทัด | มีอะไร |
|---|---|---|
| `src/app/admin/actions.ts` | **135** | จุดเดียวที่เป็น `"use server"` — ประกาศ action ทั้ง 18 ตัวที่ UI เรียกได้ |
| `src/lib/admin/dashboard.ts` | 370 | `getOrgAdminData()` |
| `src/lib/admin/work-orders.ts` | 262 | ใบงาน: `getWorkOrdersPage`, สร้าง/จ่าย/ยกเลิก |
| `src/lib/admin/settings.ts` | 444 | ผู้ใช้, โปรไฟล์, ตั้งค่าระบบ (S4–S7) |
| `src/lib/admin/assets.ts` | 602 | อาคาร/ห้อง/แอร์, ประวัติ, แก้ log, รอบ PM |
| `src/lib/admin/work-order-board.ts` | 95 | select/orderBy/mapper ของกระดานใบงานที่ใช้ร่วมกัน |
| `src/lib/auth-guards.ts` | 14 | `verifyOrgAdmin()` |

### ทำไมถึงต้องเป็นรูปแบบนี้ (ไม่ใช่ re-export ตรงๆ)

ลองวิธีที่ตรงไปตรงมาที่สุดก่อน คือแยกเป็นหลายไฟล์ `"use server"` แล้วให้ `actions.ts` `export { ... } from "./..."` — **Next ปฏิเสธตอน build**:

```
Error: Only async functions are allowed to be exported in a "use server" file.
```

คอมไพเลอร์พิสูจน์ไม่ได้ว่าสิ่งที่ re-export เป็น async function จริง จึงตีตกทั้งหมด

ทางออกคือ **implementation ย้ายไปเป็นโมดูลธรรมดาใน `src/lib/admin/`** (ไม่มี `"use server"`) แล้ว `actions.ts` เป็นไฟล์เดียวที่เปิดเผยออกไป โดยห่อบางๆ:

```ts
export async function cancelWorkOrderAction(
  ...args: Parameters<typeof workOrders.cancelWorkOrderAction>
) {
  return workOrders.cancelWorkOrderAction(...args);
}
```

ใช้ `Parameters<typeof ...>` เพื่อให้ **signature อยู่ที่เดียว** — แก้ที่ implementation แล้ว wrapper ตามให้เอง ไม่มีทางหลุดจากกัน

**ผลพลอยได้ที่สำคัญ:** ตอนนี้มีที่เดียวในโปรเจกต์ที่บอกได้ว่า "อะไรบ้างที่ client เรียกได้" คือไฟล์ `actions.ts` 135 บรรทัด อ่านจบใน 1 นาที เดิมต้องไล่หา `export async function` ใน 1,748 บรรทัด

### ทดสอบด้วยการรันจริง — ไล่ครบทุกรูปแบบ argument

wrapper แบบ rest param เป็นจุดเสี่ยงที่สุดของงานนี้ เลยไล่ทดสอบตามชนิดของ argument ไม่ใช่แค่ตามฟีเจอร์:

| รูปแบบ | action ที่ทดสอบ | ผล |
|---|---|---|
| ไม่มี argument | `getOrgAdminData()` | ✅ แดชบอร์ดโหลดครบ |
| scalar 1 ตัว | `getWorkOrdersPage(page)` | ✅ หน้า 1 = 50, หน้า 2 = 5 แถว |
| scalar 2 ตัว | `updateDefaultFrequencyAction(value, unit)` | ✅ เขียน DB + audit log |
| **FormData** | `updateAirConditionerAction(formData)` | ✅ BTU 9000 → 13500 เข้า DB จริง + audit log |
| optional param | `updateProfileAction(name, phone?)` | ✅ ชื่อเปลี่ยน เบอร์ไม่หาย |

`npx tsc --noEmit` 0 error, `npm run build` ผ่าน, console ฝั่ง server ไม่มี error และคืนค่าข้อมูลทดสอบกลับหมดแล้ว

**จำนวน lint ทั้งโปรเจกต์เท่าเดิม (52)** — การแยกไฟล์ไม่ได้สร้างปัญหาใหม่ ที่ยังค้างอยู่ 2 จุดใน `assets.ts` (`let dbData: any`) เป็นของเดิมที่ยกมาทั้งก้อน ตั้งใจไม่แตะในคอมมิตที่เป็น refactor ล้วน

### ถ้าจะเพิ่ม action ใหม่หลังจากนี้

1. เขียน implementation ใน `src/lib/admin/<หมวด>.ts`
2. เพิ่ม wrapper ใน `src/app/admin/actions.ts`

**ข้ามข้อ 2 = UI เรียกไม่ได้** เพราะโมดูลใน `src/lib/admin/` ไม่ใช่ `"use server"` client จึง import ตรงไม่ได้ (ตั้งใจให้เป็นแบบนั้น — จะได้ไม่มี action หลุดออกไปโดยไม่ผ่านการประกาศที่เดียว)

---

## 🧹 ถึง Esther03u — ไฟล์ UI ที่ยังไม่มีใครใช้ ตรวจซ้ำแล้วเมื่อ 25 ส.ค. 2026

เคยถามไว้ตั้งแต่ 11 ส.ค. แต่ยังไม่ได้คำตอบ ตรวจใหม่ทั้งโปรเจกต์แล้ว **ยังไม่มีไฟล์ไหนใน `src/` import ทั้ง 5 รายการนี้เลยสักที่** รบกวนยืนยันทีละข้อว่าจะลบหรือเก็บ แล้วเขียนตอบไว้ในไฟล์นี้ได้เลย (ทั้งหมดอยู่ในเลนของคุณ DoubleKill จึงไม่ลบเอง)

| ไฟล์ | สถานะตอนนี้ | ความเห็น |
|---|---|---|
| `components/layout/nav-header.tsx` | ไม่มีใคร import | **น่าจะลบได้แน่นอนที่สุด** — ถูกแทนที่ด้วย `dashboard-layout.tsx` ที่มี header ในตัวแล้ว และทุกหน้าใช้ตัวใหม่หมด |
| `components/examples/c-pagination-3.tsx` | ไม่มีใคร import | **เหตุผลที่เคยขอให้เก็บหมดไปแล้ว** — เก็บไว้เป็นต้นแบบทำ P14 ซึ่งคุณทำเสร็จไปเมื่อ 23 ส.ค. และตอนนี้ `ui/pagination.tsx` ถูกใช้จริงใน 11 ไฟล์แล้ว |
| `components/ui/option-wheel.tsx` + `option-wheel.css` | ไม่มีใคร import | ไม่ใช่ของมาตรฐาน registry ถ้าลบแล้วอยากได้คืนต้องดึงจาก git |
| `components/ui/label.tsx` | ไม่มีใคร import | เพิ่มกลับได้ด้วย `npx shadcn add label` |
| `components/ui/toggle.tsx` | ไม่มีใคร import | เพิ่มกลับได้ด้วย `npx shadcn add toggle` |

**เปลี่ยนจากรอบก่อน:** `ui/sonner.tsx` **มีคนใช้แล้ว 1 ไฟล์** (เดิม 0) — การตัดสินใจเก็บไว้ตอนนั้นถูกแล้ว ตัดออกจากรายการนี้ ส่วน `thai-alert-dialogs.tsx` และ `examples/c-file-upload-4.tsx` ก็ถูกใช้อยู่จริงอย่างละ 1 ไฟล์ ไม่ต้องพิจารณา

*วิธีตรวจซ้ำเองถ้าอยากยืนยัน:* `grep -rl "components/ui/label\"" src` — ถ้าไม่คืนอะไรเลยแปลว่าไม่มีใครใช้จริง (ระวังอย่า grep แค่คำว่า `label` เฉยๆ เพราะไปตรงกับ prop และตัวแปรทั่วไปเยอะมาก จะได้ผลลวง)

---

## ✅ Backlog ข้อ 1 + 7 — เรียงลำดับใหม่ทั้งสองหน้า (25 สิงหาคม 2026, DoubleKill)

ทำพร้อมกันเพราะเป็นการเรียงแบบเดียวกัน — **ใช้ comparator ตัวเดียวกันจริงๆ ไม่ได้เขียนสองชุด**

### ลำดับใหม่: อาคาร → ประเภทงาน (ซ่อมก่อนล้าง) → วันที่ (เก่าสุดก่อน)

| หน้า | ฟังก์ชัน | วันที่ที่ใช้เรียง |
|---|---|---|
| Admin → ภาพรวมระบบ → "รอซ่อมด่วน" | `urgentUnits` ใน `src/lib/admin/dashboard.ts` | `reportedAt` (แจ้งเมื่อ) |
| ช่าง → "แอร์ทั้งหมด" | `getTechnicianAssetList()` ใน `src/lib/maintenance.ts` | `lastCleanedAt` (ล้างล่าสุด) |

comparator กลางชื่อ **`compareJobOrder()`** อยู่ใน `src/lib/maintenance.ts` — แต่ละหน้าส่งวันที่ของตัวเองเข้าไป แต่ตรรกะการเรียงเป็นชุดเดียว **แก้ที่เดียวเปลี่ยนทั้งสองหน้า** ไม่มีทางที่สองหน้าจะเรียงคนละแบบ

ทำได้เพราะ**ข้อ 5 เสร็จก่อน** — ประเภทงานอ่านจาก `type` ที่บันทึกไว้จริง ไม่ต้องเดาจากสถานะเครื่อง

### 🔴 กฎเดิมของ backlog ข้อ 1 ถูกยกเลิกแล้ว — ตั้งใจ ไม่ใช่บั๊ก

หน้าช่างเคยบังคับว่า **"เครื่องที่ถึงกำหนดแล้วลอยขึ้นบนสุดเสมอ ไม่ว่าวันที่จะเป็นอย่างไร"** ตามที่ backlog ข้อ 1 กำหนดไว้

พอเอาอาคารขึ้นเป็นตัวเรียงหลัก **กฎนี้หายไปโดยจำเป็น** — เครื่องด่วนของอาคารที่ชื่อขึ้นต้นด้วยตัวท้ายๆ จะไปอยู่กลางหน้า เจ้าของโปรเจกต์เลือกแบบนี้เองหลังเห็นทางเลือกทั้ง 3 แบบแล้ว

⚠️ **อย่า "แก้" กลับด้วยการเอากฎด่วนกลับมาไว้บนสุด** — มี comment กำกับไว้ที่ `compareJobOrder()` แล้ว และ**ข้อความของ backlog ข้อ 1 ในไฟล์นี้ถูกแก้ให้ตรงกับพฤติกรรมจริงแล้วด้วย**

### field ใหม่ที่ UI ใช้ต่อได้

เพิ่ม **`buildingName`** แยกออกมาจาก `location` (ซึ่งเป็นข้อความที่ประกอบไว้แสดงผล) ทั้งสองหน้า — จำเป็นสำหรับการเรียง และ**ถ้าอยากทำหัวข้อคั่นแต่ละอาคารก็ใช้ field นี้ได้เลย** ไม่ต้องตัดสตริงเอง

`urgentUnits[]` เพิ่ม **`type`** ด้วย (`"repair" | "cleaning"`) เอาไปแสดงป้ายประเภทงานได้

*เครื่องที่ถูกยกมาแสดงแต่ไม่มีใบงานค้าง ยังต้องมีที่ยืนในลำดับ — ใช้สถานะของตัวเครื่องเองเป็นตัวจัด (`broken` → ซ่อม) ซึ่งเป็นทางเดียวที่เหลือ*

### ทดสอบด้วยการรันจริง

เรียก `getTechnicianAssetList()` จริงกับข้อมูล 73 เครื่อง แล้วไล่ตรวจทีละคู่ที่อยู่ติดกัน:

| เกณฑ์ | ผล |
|---|---|
| อาคารเรียงผิดลำดับ | **0** |
| อาคารถูกแยกเป็นหลายช่วง (ไม่ติดกัน) | **false** — 5 อาคาร 5 ช่วงพอดี |
| งานล้างโผล่มาก่อนงานซ่อมในอาคารเดียวกัน | **0** |
| วันที่เรียงผิดภายในกลุ่มเดียวกัน | **0** |

`npx tsc --noEmit` 0 error · `npm run build` ผ่าน · lint เท่าเดิม (52)

---

## ✅ Backlog ข้อ 3 (backend) — `bulkAssignWorkOrdersAction` เสร็จแล้ว (25 สิงหาคม 2026, DoubleKill)

มอบหมายช่างให้ใบงานหลายใบในคำสั่งเดียว **ปลดบล็อกงาน UI ข้อ 3 แล้ว**

```ts
bulkAssignWorkOrdersAction(workOrderIds: string[], assignToUserId: string)
// → { success: true, assignedCount: number, skippedCount: number }
// → { error: "ข้อความไทยพร้อมแสดง" }
```

### ตัดสินใจแล้ว: เครื่องที่ไม่มีใบงานค้าง = ข้ามไป ไม่สร้างให้อัตโนมัติ

เหตุผลชัดขึ้นหลังทำข้อ 5 เสร็จ: **ถ้าให้ระบบเปิดใบงานเอง มันต้องเดาว่าเป็นงานซ่อมหรืองานล้าง** ซึ่งคือสิ่งที่เราเพิ่งลงแรงกำจัดไปทั้งข้อ การมอบหมายแบบกลุ่มไม่ควรไปสร้างข้อมูลที่เดาเอาขึ้นมาใหม่ — ถ้า admin อยากมอบหมายเครื่องนั้นจริง ก็กด "สร้างใบงาน" ซึ่งตอนนี้บันทึกประเภทงานได้ถูกต้องแล้ว

### เพิ่ม `workOrderId` ใน `urgentUnits[]`

ตารางนี้ติ๊ก**เครื่องแอร์** แต่การมอบหมายเกิดกับ**ใบงาน** — เดิม `urgentUnits[]` ไม่มี id ของใบงานเลย ตอนนี้มี field ใหม่:

```ts
workOrderId: string | null   // null = เครื่องนี้ไม่มีใบงานค้าง
```

UI ใช้ตัดสินได้ว่าแถวไหนติ๊กแล้วส่งไปได้จริง

### ทำตามแบบเดียวกับ `bulkClaimWorkOrdersAction`

- **updateMany ครั้งเดียวทั้งชุด** ไม่ใช่วนยิงทีละ id (ปัญหาที่ P4 แก้ไปแล้ว — ช้าและถือ lock ยาว)
- **guard ด้วย `status: "pending"`** ใบที่ถูกมอบหมาย/รับไปแล้วเมื่อครู่จะไม่ถูกแมตช์ จึงข้ามไปเฉยๆ ไม่ใช่มอบหมายซ้ำ และ `count` คือจำนวนที่ได้จริงเป๊ะ
- **เช็คช่างครั้งเดียวทั้งชุด** — คำตอบเหมือนกันทุกใบ และถ้าบัญชีถูกระงับควรตีกลับทั้งคำสั่ง ไม่ใช่เงียบๆ แล้วไม่มอบหมายอะไรเลย
- `claimedAt` ปัดเป็นวินาที เพราะคอลัมน์เป็น `Timestamp(0)` ถ้ามี ms จะอ่านกลับมาเทียบไม่ตรง
- ครอบด้วย `withDeadlockRetry` และ revalidate ทั้ง `/admin` และ `/tech`

### ทดสอบด้วยการรันจริง

| เคส | ผล |
|---|---|
| ส่ง 3 ใบ pending + 1 ใบ completed | ✅ `assigned=3 skipped=1` ใบ completed ไม่ถูกแตะ |
| จำนวน audit log | ✅ 3 แถว เท่ากับที่มอบหมายจริง |
| ยิงชุดเดิมซ้ำ (จำลองกดสองที) | ✅ `assigned=0 skipped=4` guard ทำงาน ไม่มอบหมายซ้ำ |

*คืนสถานะข้อมูลทดสอบกลับเป็น `pending` แล้ว*

### 📌 เหลือฝั่ง UI (ข้อ 3 ที่เหลือทั้งหมด)

1. **ปุ่ม "มอบหมายช่าง"** แยกออกมา — ส่ง `workOrderId` ของแถวที่ติ๊กไว้ **เฉพาะแถวที่ `workOrderId` ไม่ใช่ null**
2. แสดงผลจาก `assignedCount` / `skippedCount` เช่น *"มอบหมาย 8 ใบ · ข้าม 2 ใบ (ถูกรับไปแล้ว)"* — อย่าบอกแค่ "สำเร็จ" เพราะบางใบอาจไม่ผ่าน
3. **ปุ่มคัดลอกรหัสแอร์** มาแทน `...`
4. **กดที่แถวเพื่อดูรายละเอียดเครื่อง**
5. เมนู `...` เดิมเอาออกทั้งหมด

---

## ✅ Backlog ข้อ 2 — ค้นหาย้ายไปทำที่ server แล้ว (25 สิงหาคม 2026, DoubleKill)

**ตัดสินใจ: ย้ายไป server ทั้งชุด** (ไม่ใช่โหลดทั้งหมดมากรองฝั่ง client) เพราะ P14 อุตส่าห์ทำ pagination จริงมาแล้ว การถอยกลับไปโหลดทุกแถวคือลบงานนั้นทิ้ง และใบงานมีแต่จะสะสมเพิ่มไม่มีวันหยุด

### บั๊กที่แก้ — วัดออกมาแล้ว

`getWorkOrdersPage()` ดึงทีละ 50 แถวจาก server แต่ `matchesSearch()` กรองเฉพาะแถวที่โหลดมาแล้วฝั่ง client พอมารวมกัน:

> อยู่หน้า 2 แล้วค้นรหัสแอร์ที่อยู่หน้า 1 → **พบ 0 รายการ** ทั้งที่ใบงานนั้นมีอยู่จริง

ทดสอบซ้ำได้จริง: หยิบใบงานที่อยู่หน้า 2 มาแล้วเอารหัสไปค้นด้วยตรรกะเดิมบนหน้า 1 ได้ **0 แถว** — ผู้ใช้ไม่มีทางรู้เลยว่ากำลังดูแค่หน้าเดียวไม่ใช่ทั้งตาราง จะสรุปว่าข้อมูลหาย แล้วไปสร้างใบงานซ้ำ

ตอนตกลงเรื่องนี้ตอนทำ P14 กระดานยังโหลดหน้าเดียวแล้วจบ การค้นฝั่ง client เลยไม่ผิด **แต่พอ P14 เสร็จเมื่อ 23 ส.ค. เงื่อนไขเปลี่ยนไปแล้ว**

### สิ่งที่เปลี่ยน

`getWorkOrdersPage(page, options?)` รับ `options.search` เพิ่ม — **เป็น param ที่ 2 แบบ optional โค้ดที่เรียก `getWorkOrdersPage(page)` อยู่ตอนนี้ใช้ได้เหมือนเดิม ไม่ต้องแก้อะไร**

คืนค่าเพิ่ม 1 field: **`search`** — สะท้อนคำค้นที่ query นี้ตอบกลับมา ใช้เช็คได้ว่าแถวที่เพิ่งได้ตอบคำค้นในช่องตอนนี้ หรือเป็นคำค้นเก่าที่ตอบกลับมาช้า (race ที่เกิดง่ายมากเวลาพิมพ์เร็วๆ)

**`total` และ `hasMore` นับด้วย filter เดียวกัน** — pager จึงบอกจำนวนผลลัพธ์ที่ค้นเจอจริง ไม่ใช่จำนวนทั้งตาราง

### ค้นครอบ field เดิมครบทั้ง 4

ย้ายมาจาก `matchesSearch()` ตรงๆ: รหัสแอร์ · ยี่ห้อ · สถานที่ · ชื่อช่างที่ถือใบงาน

**สองจุดที่ต้องแปลงเป็น query ไม่ตรงตัว:**
- **ยี่ห้อ** เก็บ 2 ที่ — ใน catalogue (`acBrand.name`) ถ้าลงทะเบียนจากรุ่นมาตรฐาน และในคอลัมน์ข้อความอิสระ (`brand`) ถ้าเลือก "อื่นๆ" กระดานแสดงอันไหนก็ได้ที่มี จึงต้องค้นทั้งคู่
- **สถานที่** เป็นข้อความที่ประกอบขึ้นตอนแสดงผล (`ชื่ออาคาร (ตัวย่อ) - ห้อง xxx`) ไม่มีคอลัมน์ให้ค้นตรงๆ จึงค้นแยกเป็น ชื่ออาคาร / ตัวย่ออาคาร / ชื่อห้อง แทน ครอบสิ่งที่คนพิมพ์จริง

*ไม่ได้ใส่ `mode: "insensitive"` เพราะคอลัมน์เป็น `utf8mb4_unicode_ci` MySQL เทียบแบบไม่สนตัวพิมพ์อยู่แล้ว และ Prisma รองรับ flag นั้นเฉพาะ PostgreSQL*

### ทดสอบด้วยการรันจริง

| เคส | ผล |
|---|---|
| ค้นรหัสแอร์ที่อยู่หน้า 2 (บั๊กเดิม) | วิธีเดิม **0 แถว** → วิธีใหม่ **เจอ 1 แถว ตรงเป้า** |
| ค้นด้วยยี่ห้อ "Mitsubishi Electric" | 9 ใบ |
| ค้นด้วยชื่ออาคาร "Dormitory Building 590333" | 16 ใบ |
| `total` ตอนค้นหา | 1 (ทั้งตาราง 56) — pager สะท้อนผลจริง |
| คำค้นที่ไม่มีอยู่ | 0 แถว (ไม่ใช่คืนทั้งหมด) |
| ตัวพิมพ์เล็ก/ใหญ่ | ได้ผลเท่ากัน |

*ค้นด้วยชื่อช่างยังไม่ได้ทดสอบ เพราะแถวที่หยิบมาทดสอบไม่มีช่างถืออยู่ — เป็น OR สาขาที่รูปแบบเหมือนอีก 6 สาขาที่ผ่านหมดแล้ว*

### 📌 เหลือฝั่ง UI

`work-order-board.tsx` ตอนนี้กรองด้วย `matchesSearch()` บน `currentPageRows` — ต้องเปลี่ยนเป็นเรียก server แทน:

1. **ลบ `matchesSearch()` และการกรองฝั่ง client ทิ้ง** — ไม่งั้นจะกรองซ้ำสองชั้น
2. เมื่อ `globalSearch` เปลี่ยน → เรียก `getWorkOrdersPage(1, { search })` **ใส่ debounce** (~300ms) ไม่งั้นยิงทุกตัวอักษร
3. เคลียร์ `pagesLoaded` cache เมื่อคำค้นเปลี่ยน — cache ตอนนี้ผูกกับหน้า ไม่ได้ผูกกับคำค้น ถ้าไม่เคลียร์จะเอาแถวของคำค้นเก่ามาโชว์
4. **เทียบ `result.search` กับคำค้นปัจจุบันก่อน render** ถ้าไม่ตรงให้ทิ้งผลนั้นไป (กัน response เก่ามาทับใหม่)
5. ข้อความ "พบ N รายการในหน้านี้" เปลี่ยนได้แล้ว เพราะตอนนี้ `total` คือจำนวนผลลัพธ์ทั้งหมดจริงๆ

⚠️ **หน้าแรกยังมาจาก `getOrgAdminData()` ซึ่งไม่รับคำค้น** — พอเริ่มค้นหาต้องสลับไปดึงจาก `getWorkOrdersPage(1, { search })` แทน แล้วพอล้างคำค้นค่อยกลับไปใช้ชุดเดิมที่ dashboard ส่งมา

---

## ✅ Backlog ข้อ 5 — คอลัมน์ `type` ใน `work_orders` เสร็จแล้ว (25 สิงหาคม 2026, DoubleKill)

**⚠️ ต้องรัน `npx prisma migrate deploy` + `npx prisma generate` หลัง pull** (migration `20260825160000_add_work_order_type`)

ประเภทงานไม่ได้ถูกเดาอีกต่อไป — ใบงานบันทึกไว้เองตั้งแต่ตอนเปิดใบ

### ทำไมต้องเลิกเดา — วัดออกมาเป็นตัวเลขแล้ว

วิธีเดิมคือดูสถานะปัจจุบันของเครื่อง (`acStatus === "broken" ? repair : cleaning`) เทียบกับค่าจริงที่บันทึกไว้ตอนนี้:

| วิธีเดิมเดาว่า | ค่าจริง | จำนวนใบ |
|---|---|---|
| cleaning | repair | **3** |
| cleaning | cleaning | 36 |
| repair | repair | 10 |
| repair | cleaning | **8** |

**11 จาก 57 ใบ (19%) ติดป้ายผิด** — และจะเพี้ยนเพิ่มเรื่อยๆ ทุกครั้งที่ปิดงานแล้วสถานะเครื่องกลับเป็น `normal`

### Schema

`type WorkOrderType` (enum `repair` / `cleaning`) **NOT NULL และไม่มี default โดยตั้งใจ** — ทุกจุดที่เปิดใบงานต้องระบุเองว่าเป็นงานประเภทไหน ถ้าลืม TypeScript จะฟ้องตั้งแต่ compile *(ซึ่งเกิดขึ้นจริงตอนทำ — tsc ชี้ให้เห็นว่า `prisma/seed.ts` ก็สร้างใบงานอีก 3 จุดที่มองข้ามไป)*

### จุดที่สร้างใบงาน — ตั้งค่ายังไง (ทั้งหมด 5 จุด)

| จุด | ค่า `type` | ที่มา |
|---|---|---|
| auto-check (`syncOverdueMaintenanceWorkOrders`) | `cleaning` | ไม่ใช่การเดา — path นี้มีไว้สร้างงานล้างตามรอบอย่างเดียว |
| ช่างบันทึกงานหน้างาน (walk-up) | จากงานที่ช่างติ๊ก | `actionsArray.includes("repair") ? repair : cleaning` — ใบงานเปิดและปิดในจังหวะเดียวกัน สิ่งที่ช่างเพิ่งบันทึกคือคำอธิบายที่ตรงที่สุด |
| `createWorkOrderAction` (admin) | `repair` (ค่าตั้งต้น) | ดูหมายเหตุด้านล่าง |
| `prisma/seed.ts` × 3 | ตามเนื้อหาของแต่ละใบ | น้ำหยด/เปิดไม่ติด → `repair` · แจ้งล้างประจำรอบ → `cleaning` |

**📌 ทำไม `createWorkOrderAction` ถึงเป็น optional และ default เป็น `repair`:** ฟอร์มสร้างใบงานยัง**ไม่มีช่องเลือกประเภทงาน** (ตรวจ FormData ที่ฟอร์มส่งจริงแล้วมีแค่ `airConditionerId`, `priority`, `assignToUserId`) — ถ้าทำเป็น required ทันที **admin จะสร้างใบงานไม่ได้เลย** ซึ่งเป็นบั๊กแบบเดียวกับ `repairDetail` ที่เพิ่งทำให้ช่างบันทึกงานซ่อมไม่ได้มาเป็นสัปดาห์

`repair` ไม่ใช่ค่าสุ่มมั่ว — path นี้ตั้งสถานะเครื่องเป็น `broken` มาตลอดอยู่แล้ว มันคือการแจ้งซ่อมโดยพฤตินัย

**แก้เพิ่มให้สอดคล้องกัน:** เดิมโค้ดตั้งสถานะเครื่องเป็น `broken` เสมอ ตอนนี้ตั้งตามประเภทงาน (`repair` → `broken` / `cleaning` → `needs_cleaning`) ไม่งั้นพอมีช่องให้เลือก "งานล้าง" แล้วเครื่องจะถูกมาร์คว่าเสีย ซึ่งขัดกับตัวใบงานเอง **พฤติกรรมวันนี้ไม่เปลี่ยน** เพราะค่าตั้งต้นยังเป็น `repair`

### Backfill ใบงานเดิม — ไล่ตามหลักฐาน ไม่เดารวด

migration เติมค่าย้อนหลังเป็น 3 ชั้น เรียงตามความน่าเชื่อถือ แต่ละชั้นแตะเฉพาะแถวที่ยังว่าง:

1. **ใบที่ auto-check สร้าง** → `cleaning` — ไม่ใช่การเดา path นั้นสร้างงานล้างอย่างเดียวและประทับข้อความของตัวเองไว้ (20 ใบ)
2. **ใบที่ปิดแล้ว** → อ่านจาก `maintenance_logs.action` ที่ผูกอยู่ ถ้ามี `repair` ปนอยู่ = งานซ่อม ถ้าล้างอย่างเดียว = งานล้าง (5 ใบ)
3. **ที่เหลือ** → ใบ seed ที่ไม่มีทั้งข้อความและ log ตกไปใช้การเดาจากสถานะเครื่องแบบเดิม **ต่างกันตรงที่เดาครั้งเดียวแล้วหยุดนิ่ง ไม่ขยับตามสถานะเครื่องอีก**

ตรวจผลหลังรันแล้ว: auto-check 20 ใบเป็น `cleaning` ครบ, ใบที่มี log ซ่อมปนได้ `repair` ถูก, ใบที่ล้างอย่างเดียวได้ `cleaning` ถูก

### ส่งค่าออกไปให้ UI แล้ว

- **`workOrders[]`** (กระดานใบงาน + โมดัลรายละเอียด) มี field **`type`** เพิ่มมา — แยกจาก `acStatus` ที่เป็นสถานะเครื่อง ณ ปัจจุบัน ซึ่งเคยถูกใช้แทนกัน
- **`assetList[].pendingWorkOrder.type`** (หน้าช่าง) — ใส่ไว้ให้ backlog ข้อ 7 ใช้เรียงตามประเภทงาน

**📌 เหลือฝั่ง UI 3 จุด:**
1. `work-order-board.tsx` — เพิ่มคอลัมน์ประเภทงาน อ่านจาก `wo.type` **ไม่ต้องคำนวณจาก `acStatus` อีก**
2. `work-order-detail-dialog.tsx` — แสดงประเภทงานในโมดัล
3. `create-work-order-modal.tsx` — เพิ่มช่องเลือกประเภทงาน ชื่อ field ต้องเป็น **`type`** ค่าเป็น `"repair"` หรือ `"cleaning"` เป๊ะๆ (ไม่ใส่ = ได้ `repair` เหมือนตอนนี้ ของเดิมจึงไม่พัง)

### ยังเดาอยู่ 1 จุด — ปฏิทิน (ตั้งใจ)

ปฏิทินแสดง **`maintenance_schedules`** ซึ่งเป็นรอบล้างที่*ยังไม่มีใบงาน* จึงไม่มี `type` ให้อ่าน ป้ายในปฏิทินยังอนุมานจากสถานะเครื่องเหมือนเดิม — ถ้าจะให้ตรงจริงต้องคุยกันว่ารายการในปฏิทินควรเป็น "งานล้างตามรอบ" เสมอหรือไม่ (ซึ่งตามนิยามของ `maintenance_schedules` ก็คือใช่) **แยกเป็นงานต่างหาก ไม่รวมในข้อ 5**

### ทดสอบด้วยการรันจริง

| เส้นทาง | ผล |
|---|---|
| admin สร้างใบงานผ่านฟอร์ม (ไม่ส่ง `type`) | ✅ ได้ `type=repair` และเครื่อง → `broken` |
| ช่างบันทึกงานหน้างานผ่านลิงก์ QR `?ac=` (ไม่มีใบงานล่วงหน้า) เลือก "ซ่อมแอร์" | ✅ ระบบสร้างใบงานให้พร้อม `type=repair` และผูก log ถูก |
| `type` ส่งถึง client ในกระดานใบงาน | ✅ ยืนยันจาก payload จริง |
| backfill 56 ใบ | ✅ ตรวจทีละกลุ่มตามหลักฐาน |

`npx tsc --noEmit` 0 error · `npm run build` ผ่าน · จำนวน lint ทั้งโปรเจกต์เท่าเดิม (52)

*ข้อมูลทดสอบ: ลบใบงานที่สร้างทดสอบและคืนสถานะเครื่องแล้ว เหลือใบงาน #121 (walk-up) กับ `maintenance_logs` #620 ที่เป็นงานซ่อมจริงจากการทดสอบ ไม่ได้ลบเพราะเป็นข้อมูลที่สมจริง · รหัสผ่านบัญชีทดสอบล้างกลับเป็น NULL แล้ว*

---

## ✅ Backlog รอบใหม่ — ครบทั้ง 8 ข้อแล้ว (วางแผน 25 ส.ค., ฝั่ง UI ปิดครบ 27 ส.ค. 2026, Esther03u)

เจ้าของโปรเจกต์ไล่ทดสอบระบบเองผ่านเบราว์เซอร์แล้วสั่งงานมาเป็นชุดเมื่อ 25 ส.ค. **ตอนนี้ทำครบทั้ง 8 ข้อแล้ว** ทั้ง backend (DoubleKill, 25 ส.ค.) และ UI (Esther03u, 27 ส.ค.) — ดูหัวข้อ "Backlog UI ครบทั้ง 6 จุดที่เหลือ" ด้านล่างตารางสำหรับรายละเอียดสิ่งที่แก้และผลตรวจสอบของฝั่ง UI

**⚠️ ข้อ 3, 4, 6, 8 เป็นงานฝั่ง UI ของ Esther03u** ดูรายละเอียดในแต่ละข้อได้เลย ไม่ต้องรอ backend ยกเว้นข้อ 3 ที่ต้องรอ action ใหม่

### ลำดับที่แนะนำ — ข้อ 5 ต้องมาก่อน

**ข้อ 1 และ 7 คือการเรียงตาม "ประเภทงาน"** ถ้าทำก่อนข้อ 5 จะต้องเขียนโค้ดเดาประเภทจาก `acStatus` ไปก่อน แล้วพอข้อ 5 เสร็จก็ต้องกลับมารื้อเรียงใหม่ทั้งสองที่ — **ทำข้อ 5 ก่อน แล้วข้อ 1/7 อ่าน `type` จริงได้เลย**

| # | งาน | เจ้าของ |
|---|---|---|
| ~~1~~ | ~~Sort ตาราง "รอซ่อมด่วน"~~ ✅ **เสร็จ 25 ส.ค.** | — |
| ~~2~~ | ~~pagination + ค้นหา~~ ✅ **เสร็จครบ 27 ส.ค.** (backend 25 ส.ค. + UI 27 ส.ค.) | Esther03u |
| ~~3~~ | ~~รื้อเมนู `...` + มอบหมายหลายเครื่องพร้อมกัน~~ ✅ **เสร็จครบ 27 ส.ค.** (backend 25 ส.ค. + UI 27 ส.ค.) | Esther03u |
| ~~4~~ | ~~badge "ยกเลิกแล้ว" + เปลี่ยน `⋮`~~ ✅ **เสร็จ 27 ส.ค.** | Esther03u |
| ~~5~~ | ~~เพิ่มคอลัมน์ `type`~~ ✅ **เสร็จครบ 27 ส.ค.** (backend 25 ส.ค. + UI 27 ส.ค.) | Esther03u |
| ~~6~~ | ~~ปฏิทินจับกลุ่มเป็นอาคารเสมอ~~ ✅ **เสร็จ 27 ส.ค.** | Esther03u |
| ~~7~~ | ~~หน้าช่าง "แอร์ทั้งหมด" เรียงใหม่~~ ✅ **เสร็จ 25 ส.ค.** | — |
| ~~8~~ | ~~ช่างแก้ประวัติที่ลงผิดได้~~ ✅ **เสร็จ 27 ส.ค.** | Esther03u |

---

### 1. Sort ตาราง "รอซ่อมด่วน" (หน้า Admin → ภาพรวมระบบ)

เรียง **อาคาร → ประเภทงาน (ซ่อมด่วนก่อน แล้วค้างล้าง) → วันที่** และ **เรียงตายตัวตั้งแต่เปิดหน้า** ไม่ใช่กดหัวคอลัมน์เพื่อ sort

**ตัดสินใจแล้วให้ทำที่ backend** — เมื่อเป็นการเรียงตายตัว จุดที่เหมาะคือตอนสร้าง `urgentUnits` ใน `src/lib/admin/dashboard.ts` ฝั่ง UI จึงแค่ render ตามลำดับที่ได้รับ ไม่ต้องแก้อะไร

### 2. pagination กับค้นหาในกระดานใบงาน

ตอนนี้ **ค้นหาและ sort ทำงานเฉพาะหน้าที่โหลดมาแล้ว** ส่วน pagination ดึงจาก server ทีละ 50 รายการ ผลคือ:

> อยู่หน้า 2 แล้วค้นรหัสแอร์ที่อยู่หน้า 1 → ขึ้นว่า "ไม่พบข้อมูลใบงาน" ทั้งที่ใบงานนั้นมีอยู่จริง

ตอนตกลงเรื่องนี้ตอนทำ P14 ยังไม่มีปุ่มเปลี่ยนหน้า (โหลดแค่ 50 รายการแรก) การค้นหาฝั่ง client เลยพอใช้ได้ **แต่พอ P14 เสร็จเมื่อ 23 ส.ค. เงื่อนไขเปลี่ยนไปแล้ว**

**ต้องตัดสินใจก่อนทำ:** ย้าย search/sort ไปทำฝั่ง server ทั้งชุด (เพิ่ม `where` + `orderBy` ใน `getWorkOrdersPage`) หรือโหลดทั้งหมดมาจัดการฝั่ง client

### 3. รื้อเมนู `...` ในตาราง "รอซ่อมด่วน"

| ของเดิมในเมนู | ย้ายไปเป็น |
|---|---|
| มอบหมายช่าง | **ปุ่มแยก — มอบหมายหลายเครื่องพร้อมกันจากแถวที่ติ๊กไว้** |
| คัดลอกรหัสแอร์ | **ปุ่มเดียวที่มาแทน `...`** |
| ดูรายละเอียดเครื่อง | **กดที่แถวได้เลย** |

ผลคือเมนู `...` หายไปทั้งหมด

**ต้องมี backend ใหม่:** `assignWorkOrderAction` รับได้ทีละใบเท่านั้น ถ้า UI วนเรียกทีละแถว 10 ครั้งจะเจอปัญหาเดียวกับที่ P4 แก้ไปแล้ว (ยิงทีละ id = ช้า + ถือ lock ยาว) และถ้าพลาดกลางทางจะมอบหมายไปแล้วบางส่วน — ควรเพิ่ม `bulkAssignWorkOrdersAction(ids[], userId)` แบบเดียวกับ `bulkClaimWorkOrdersAction` ที่ช่างใช้อยู่ (มีต้นแบบให้ลอกแล้ว: atomic, กันแย่งงาน, คืนจำนวนที่สำเร็จ/ข้าม)

**ยังต้องตัดสินใจ:** ตารางนี้แถวละ *เครื่องแอร์* ไม่ใช่ *ใบงาน* แต่การมอบหมายช่างเกิดกับใบงาน — ถ้าติ๊กเครื่องที่ยังไม่มีใบงานค้างอยู่ จะให้ระบบสร้างใบงานให้อัตโนมัติแล้วมอบหมาย หรือข้ามไปแล้วรายงานว่าข้ามกี่เครื่อง

### 4. ใบงานที่ถูกยกเลิกแสดงผลไม่ถูก (กระดานใบงาน)

- **เพิ่ม badge "ยกเลิกแล้ว"** — `work-order-board.tsx` เขียน badge ไว้แค่ 3 สถานะ (`pending`/`claimed`/`completed`) ไม่มีเคส `cancelled` ทั้งที่ schema มี 4 ช่องสถานะจึงว่างเปล่า
- **เปลี่ยน `⋮` เป็นปุ่มที่บอกตรงๆ** เช่น "ดูรายละเอียด" — ตรวจโค้ดแล้ว `⋮` **ไม่ใช่เมนู** เป็นปุ่มเดี่ยวที่กดแล้วเปิด dialog รายละเอียด (`wo.status === "pending" ? จ่ายงาน : ⋮`) แต่ใช้ไอคอนสามจุดซึ่งสื่อว่าจะมีเมนูโผล่มา

บั๊กนี้โผล่หลังต่อฟีเจอร์ "ยกเลิกใบงาน" เมื่อ 23 ส.ค. — ก่อนหน้านั้นสร้างใบงานสถานะ `cancelled` ไม่ได้เลย จึงไม่เคยเจอ

### 5. เพิ่มคอลัมน์ `type` ใน `work_orders` — ✅ **Backend เสร็จแล้ว ดูหัวข้อเฉพาะด้านบน**

**ที่ต้องการ:** แสดงประเภทงาน (ซ่อม/ล้าง) เพิ่มใน **ตารางกระดานใบงาน** และ **โมดัลรายละเอียดใบงาน**

**ตัดสินใจแล้วว่าจะทำให้ถูกต้องจริง ไม่ใช่เดาเอา** — ทุกวันนี้ประเภทงานถูก*อนุมาน*จากสถานะปัจจุบันของเครื่อง (`acStatus === "broken" ? repair : cleaning`) ซึ่งเพี้ยนได้ 2 แบบ: เครื่องที่เสียอยู่แล้วถึงรอบล้างพอดีจะขึ้นว่า "งานซ่อม" และพอใบงานปิดไปแล้วสถานะเครื่องกลับเป็น `normal` ประเภทงานย้อนหลังก็เปลี่ยนตาม

**ขอบเขตงาน — แตะทุกจุดที่สร้างใบงาน:**
- schema + migration
- `createWorkOrderAction` — admin สร้างเอง ต้องมีให้เลือกประเภท
- auto-check ที่สร้างใบงาน "ครบกำหนดล้าง" → `cleaning`
- ใบงานที่ระบบสร้างอัตโนมัติตอนช่างบันทึกงานหน้างาน
- **backfill ใบงานเดิม 55 ใบ** — ใบที่ปิดแล้วดูจาก `maintenance_logs.action` ได้ แต่ใบที่ยัง `pending` ต้องเดาจากสถานะเครื่อง ซึ่งก็คือวิธีเดิมที่ไม่แม่น **ต้องตกลงกันว่าเดาแล้วจบ หรือปล่อยว่างไว้ให้ admin มาระบุเอง**
- เปลี่ยนทุกจุดที่เดาประเภทงานอยู่ให้อ่านค่าจริง: ปฏิทิน, หน้าช่าง, กระดานใบงาน

### 6. ปฏิทิน — จับกลุ่มเป็นอาคารเสมอ

**ของมีอยู่แล้ว แค่ไม่เคยทำงาน** — `maintenance-calendar.tsx` มีเงื่อนไข `dayEvents.length > DAY_GROUP_THRESHOLD` (ค่าปัจจุบัน = 4) ถ้าเกินจะจับกลุ่มเป็น "ชื่ออาคาร (จำนวนงาน)" พร้อม drill-down เข้าไปดูรายการงาน — นี่คือ **F2 ที่ทำเสร็จไปแล้ว**

ที่เห็นเป็นงานเดี่ยวๆ ทั้งเดือนเพราะ **ข้อมูล seed วันที่งานเยอะสุดมีแค่ 2 รายการ** ไม่เคยเกิน 4 เลยสักวัน

**ตัดสินใจแล้ว: ให้จับกลุ่มเป็นอาคารเสมอ** ไม่ว่าวันนั้นจะมีกี่งาน (ลดเกณฑ์ลง)

**ได้ทั้งสองฝั่งพร้อมกัน** — ปฏิทินของ admin กับของช่างเป็น component ตัวเดียวกัน (`src/components/shared/maintenance-calendar.tsx`) แก้ที่เดียวเปลี่ยนทั้งคู่

*หมายเหตุ: ไฟล์นี้อยู่ในเลนของ Esther03u แม้จะแก้แค่ค่าคงที่ตัวเดียว — ตอนลงมือจะถามเจ้าของโปรเจกต์อีกทีว่าให้เขียนเป็นคำขอหรือให้ DoubleKill แก้แล้วเตือนเรื่อง conflict*

### 7. หน้าช่าง "แอร์ทั้งหมด" — เรียงใหม่

เรียง **อาคาร → ประเภทงาน (ซ่อมก่อนล้าง) → วันที่** อยู่ที่ `getTechnicianAssetList()` ใน `src/lib/maintenance.ts`

**⚠️ ยกเลิกกฎเดิมของ backlog ข้อ 1** — ตอนนี้โค้ดบังคับให้ *"เครื่องที่ถึงกำหนดแล้วลอยขึ้นบนสุดเสมอ ไม่ว่าวันที่จะเป็นอย่างไร"* ตามที่ backlog ข้อ 1 กำหนดไว้ พอเอาอาคารขึ้นเป็นตัวเรียงหลัก **กฎนี้จะหายไป** — เครื่องด่วนของอาคารที่ชื่อขึ้นต้นด้วย L จะไปอยู่กลางหน้า

เสนอทางเลือกไป 3 แบบ (เรียงตามที่สั่งตรงๆ / เก็บกฎด่วนไว้แล้วเรียงอาคารในกลุ่มด่วน / ใช้ตัวกรองอาคารที่มีอยู่แทน) **เจ้าของโปรเจกต์เลือกแบบแรก — ทิ้งกฎด่วนอยู่บนสุด**

*ตอนลงมือต้องแก้ข้อความ backlog ข้อ 1 ในไฟล์นี้ด้วย เพราะที่เขียนว่า "ต้องอยู่บนสุดเสมอ" จะไม่ตรงกับพฤติกรรมจริงอีกต่อไป — ไม่งั้นคนอ่านทีหลังจะนึกว่าเป็นบั๊ก*

### 8. หน้าช่าง "ประวัติ" — ให้ช่างแก้ประวัติที่ลงผิดได้

**Backend พร้อมอยู่แล้วทั้งหมด ไม่ต้องแตะเลย** — ตรวจแล้วทั้ง `getAirConditionerHistory()` และ `updateMaintenanceLogAction()` ใช้แค่ `auth()` ไม่ได้ล็อกด้วย `verifyOrgAdmin` **ช่างเรียกได้ทั้งคู่** และ `getMaintenanceHistory()` คืน `technicianId` มาให้เทียบกับ `session.user.id` เพื่อตัดสินว่าจะโชว์ปุ่มแก้ไขในรายการไหน — ออกแบบไว้เพื่อการนี้ตั้งแต่ 11 ส.ค.

สิทธิ์คุมไว้ถูกแล้ว: ช่างแก้ได้เฉพาะ log ที่ตัวเองบันทึก / admin แก้ได้ทุกอัน โดยอ่านเจ้าของจากแถวใน DB ไม่เชื่อค่าที่ client ส่งมา

**จุดที่ต้องคิด:** การ์ดในแท็บประวัติแสดง *ใบงานที่ปิดแล้ว* (จาก `completedJobs`) ไม่ใช่ตัว log และการแก้ประวัติต้องใช้ `logId` ซึ่งการ์ดพวกนี้ไม่มี เลือกได้ 2 ทาง:
- **กดการ์ดแล้วเปิดโมดัลประวัติของเครื่องนั้น** (เรียก `getAirConditionerHistory` ซึ่งช่างเรียกได้อยู่แล้ว) แล้วแก้จากในโมดัล — ใช้ component เดียวกับฝั่ง admin ได้เลย ไม่ต้องแตะ backend
- ให้ backend ส่ง log มาตรงๆ ในแท็บประวัติ — ต้องแก้ `getTechnicianData()` เพิ่ม

ทางแรกดูคุ้มกว่า แต่ยังไม่ได้ตัดสิน — **เลือกทางแรกแล้ว ดูผลที่ทำจริงในหัวข้อถัดไป**

---

## ✅ Backlog UI ครบทั้ง 6 จุดที่เหลือ (27 สิงหาคม 2026, Esther03u)

ทำต่อจาก backend ที่ DoubleKill ปิดไว้เมื่อ 25 ส.ค. ครบทุกข้อ ไม่มีจุดไหนต้องขอ backend เพิ่ม ตรวจสอบด้วย `npx tsc --noEmit` (ผ่านสะอาดทุกจุด) และ `npx eslint` เทียบ baseline ก่อนแก้ทุกไฟล์ (ไม่มี error/warning ใหม่เกิดขึ้นจากงานนี้เลย — ที่เจอเป็น `react-hooks/set-state-in-effect` ที่มีอยู่ก่อนแล้วหลายจุดในโปรเจกต์) และรันจริงผ่านเบราว์เซอร์ (login จริง ทำ action จริง แล้วลบข้อมูลทดสอบทิ้งทุกครั้ง)

### ข้อ 4 — badge "ยกเลิกแล้ว" + เปลี่ยน `⋮`

- `work-order-board.tsx` และ `work-order-detail-dialog.tsx` (จุดเดียวกันซ้ำสองไฟล์ — พบระหว่างทำ) เพิ่ม badge `status === "cancelled"` ที่หายไปก่อนหน้านี้
- ปุ่ม `⋮` (MoreVertical icon-only) เปลี่ยนเป็นปุ่มข้อความ "ดูรายละเอียด" — behavior เดิมไม่เปลี่ยน แค่บอกตรงๆ ว่ากดแล้วเกิดอะไร

### ข้อ 5 (UI ที่เหลือ) — แสดงคอลัมน์ `type`

- `work-order-board.tsx` เพิ่มคอลัมน์ "ประเภทงาน" อ่านจาก `wo.type` ตรงๆ
- `work-order-detail-dialog.tsx` เพิ่ม badge ประเภทงานในหัว modal
- `create-work-order-modal.tsx` เพิ่มช่องเลือกประเภทงาน `name="type"` ค่า `repair`/`cleaning` ตรงตาม spec, default "งานซ่อม"
- ทดสอบ end-to-end จริง: สร้างใบงานเลือก "งานล้างแอร์" → แถวใหม่ขึ้น badge ตรงกับที่เลือก ไม่ใช่ default

### ข้อ 2 (UI ที่เหลือ) — ย้าย search ไปเรียก server

`work-order-board.tsx` เขียนใหม่ทั้งกลไก:
- ลบ `matchesSearch()` (กรองฝั่ง client) ทิ้ง
- debounce 300ms ก่อนเรียก `getWorkOrdersPage(page, { search })`
- cache key เปลี่ยนจาก `page` เดี่ยวๆ เป็น `` `${search}::${page}` `` — คำค้นเปลี่ยนไม่ไปชนแคชคำค้นเก่า (ผลข้างเคียงที่ดี: ไม่ต้องเคลียร์แคชทั้งก้อนตอนคำค้นเปลี่ยนแบบที่ backlog แนะนำไว้ เพราะคีย์คนละอันอยู่แล้ว)
- กัน race ด้วย `latestRequestKeyRef` เทียบ key ก่อน apply ผลลัพธ์ (`total`/`hasMore`/error) — ถ้ามี request ใหม่กว่าแทรกมาก่อน ผลเก่าที่มาช้าจะถูกทิ้งทั้งก้อน
- ทดสอบยืนยัน: พิมพ์ 7 ตัวอักษรยิง request เดียว (debounce ทำงาน), ล้างคำค้นกลับไป 11 รายการทันทีไม่มี network call (ใช้ shortcut หน้าแรกจาก `getOrgAdminData()`)

### ข้อ 3 (UI ที่เหลือ) — รื้อเมนู `...` ในตาราง "รอซ่อมด่วน" + มอบหมายหลายเครื่อง

`upcoming-maintenance-table.tsx`:
- เมนู `...` หายไปทั้งหมด — คัดลอกรหัสแอร์เป็นปุ่มไอคอนแยก (มี toast ยืนยัน), คลิกที่แถวเปิดรายละเอียดเครื่องได้เลย, "สร้างใบงานล้างแอร์" (เฉพาะแถว upcoming) เป็นปุ่มแยกในคอลัมน์จัดการ — HANDOFF เดิมไม่ได้ระบุที่ทางใหม่ให้ฟีเจอร์นี้เลยคงไว้เป็นปุ่มแยกแทนที่จะตัดทิ้ง
- เพิ่มปุ่ม "มอบหมายช่าง (N)" ที่ toolbar ใต้ตาราง ปรากฏเมื่อติ๊กอย่างน้อย 1 แถว กรองเฉพาะแถวที่มี `pendingWorkOrderId` ก่อนส่งเข้า `bulkAssignWorkOrdersAction` (แถวที่ใบงานถูกรับไปแล้วจะถูกข้าม ปุ่ม disabled พร้อม tooltip อธิบายถ้าไม่มีแถวไหน assignable เลย)
- ล้าง `rowSelection` อัตโนมัติเมื่อ `data` prop เปลี่ยน (เหมือน pattern ที่ `work-order-board.tsx` ใช้อยู่แล้ว) กันติ๊กเลื่อนไปโดนแถวผิดหลัง mutation
- `admin-dashboard-view.tsx`: `handleAssignSubmit` แยกเส้นทาง single/bulk, toast แสดง `assignedCount`/`skippedCount` จริงแทนคำว่า "สำเร็จ" เฉยๆ ตามที่ backlog กำชับ
- `assign-work-order-modal.tsx` (โมดัลเดิม ใช้ร่วมกันทั้ง single/bulk) แสดงหัวข้อ/ปุ่มเป็น "มอบหมาย N ใบงาน..." เมื่อเป็น bulk
- ทดสอบ end-to-end จริง: สร้างใบงาน pending ใหม่ → ติ๊ก → ปุ่มขึ้น "มอบหมายช่าง (1)" → ยืนยัน → toast ถูกต้อง → สถานะเปลี่ยนเป็น claimed จริง → selection เคลียร์เอง

### ข้อ 6 — ปฏิทินจับกลุ่มเป็นอาคารเสมอ

`maintenance-calendar.tsx` (shared component ระหว่าง admin/tech — แก้จุดเดียวมีผลทั้งคู่): ลบ `DAY_GROUP_THRESHOLD` (เดิม = 4) และ branch การแสดงงานทีละใบในช่องปฏิทินที่กลายเป็น dead code ไปด้วย (ตรวจแล้วไม่เสียฟีเจอร์ — รายละเอียดงาน/ไอคอนเตือนงานเลยกำหนดยังอยู่ครบใน modal drill-down ที่เปิดจากการกดกลุ่มอาคาร) ทดสอบจริง: วันที่มีงานแค่ 1 ใบตอนนี้ขึ้นเป็น pill "ชื่ออาคาร (1)" แทนที่จะโชว์งานตรงๆ กดเข้าไป drill-down แสดงงานถูกต้อง

### ข้อ 8 — หน้าช่าง "ประวัติ" ให้ช่างแก้ประวัติที่ลงผิดได้

เลือกทางแรกตามที่เกริ่นไว้ — กดการ์ดเปิด `AcHistoryModal` (component เดียวกับฝั่ง admin ไม่สร้างซ้ำ) ไม่แตะ backend เลยสักบรรทัด:

- `completed-jobs-panel.tsx` — การ์ดกดได้ เรียก `onViewHistory(airConditionerId)`
- `tech-mobile-view.tsx` — เพิ่ม state เปิด/ปิดโมดัล, render `<AcHistoryModal>` (import ตรงจาก `@/components/admin/ac-history-modal` — ยืนยันแล้วว่า import server action ข้าม route ทำงานได้จริง เพราะ Server Action เป็นแค่ RPC endpoint ไม่ผูกกับ route ที่ประกาศ)
- `tech/page.tsx` — ส่ง `session.user.id` เพิ่มเข้า prop `user` (ข้อมูลที่มีอยู่แล้วจาก `auth()` แค่ส่งต่อ ไม่มี logic ใหม่)
- **ปรับ `ac-history-modal.tsx` เพิ่มเติมนอกแผนเดิม:** โมดัลเดิมโชว์ปุ่ม "แก้ไข" ทุกรายการแบบไม่มีเงื่อนไข ใช้ได้เพราะฝั่ง admin แก้ได้ทุกอันอยู่แล้ว แต่เอามาให้ช่างใช้ตรงๆ จะเห็นปุ่มบนรายการของช่างคนอื่นแล้วกดแล้ว error เพราะ server ปฏิเสธ (ตาม `updateMaintenanceLogAction` ที่บังคับ `isOwner || isAdmin` อยู่แล้ว) — เพิ่ม prop `currentUserId`/`isAdmin` ให้ปุ่ม "แก้ไข" โชว์เฉพาะตอน `isAdmin || log.technicianId === currentUserId` และแก้ `asset-manager.tsx` ให้ส่ง `isAdmin` ตอนเรียกจากฝั่ง admin เพื่อคงพฤติกรรมเดิม
- ทดสอบจริง: login เป็นช่างสมชาย เปิดโมดัลจากการ์ด แก้ไขหมายเหตุจริงผ่าน `updateMaintenanceLogAction` สำเร็จ เห็นผลอัปเดตทันที (ยืนยัน permission ฝั่ง server ทำงานถูก ไม่ใช่แค่ UI) — *หมายเหตุ: seed data มีช่างคนเดียว จึงไม่มี log ของ "คนอื่น" ให้ทดสอบว่าปุ่มถูกซ่อนจริง ตรวจผ่านการอ่านโค้ดแทน*

---

## ⚠️ กฎสำคัญ: ห้ามแก้ Backend เอง

**Esther03u (หรือใครก็ตามที่ทำฝั่ง UI/Frontend) ห้ามแก้โค้ด Backend เองโดยเด็ดขาด** ได้แก่ (ไม่จำกัดเพียง):
- `prisma/schema.prisma` และ migration files
- `src/app/**/actions.ts` (Server Actions)
- `src/app/api/**` (Route Handlers)
- `src/lib/**` (auth, prisma client, business logic helpers เช่น `maintenance.ts`)

ถ้าต้องการให้เพิ่ม/แก้อะไรใน Backend (เช่น field ใหม่ใน response, endpoint ใหม่, logic การคำนวณ) ให้ **เขียนคำขอไว้ในไฟล์นี้** (เพิ่ม section ใหม่ด้านล่าง หรือ comment ในหัวข้อ Backlog ที่เกี่ยวข้อง) แล้ว commit/push ขึ้น Git — Backend จะถูกทำโดย DoubleKill (เจ้าของโปรเจกต์) เท่านั้น เหตุผล: ป้องกัน schema/migration ชนกันข้ามเครื่อง และป้องกัน business logic (เช่น multi-tenant isolation, auth guard) ถูกแก้โดยไม่เข้าใจผลกระทบทั้งระบบ

---

## 🚨 F1 ทำเสร็จแล้ว (11 สิงหาคม 2026) — ระบบไม่ใช่ multi-tenant อีกต่อไป

**อ่านก่อนแตะโค้ดใดๆ** ระบบถูกลดขนาดเหลือใช้กับสถาบันเดียว การเปลี่ยนแปลงกระทบทั้งโปรเจกต์:

| เปลี่ยน | รายละเอียด |
|---|---|
| **ลบ role `super_admin`** | เหลือ `org_admin` กับ `technician` — บัญชี super admin ถูกลบออกจากฐานข้อมูล |
| **ลบ `/super-admin` ทั้งหมด** | รวม `src/components/super-admin/` และ `/api/super-admin/**` |
| **ลบตาราง `universities`** | และคอลัมน์ `university_id` ออกจาก `users`, `buildings`, `work_orders`, `system_audit_logs` |
| **`ac_code` สั้นลง** | `[UNI]-[BLDG]-[ROOM]-[NN]` → **`[BLDG]-[ROOM]-[NN]`** (rename ให้ครบ 73 เครื่องแล้วใน migration) |
| **ข้อมูลเหลือ 1 สถาบัน** | เก็บ university id ต่ำสุดไว้ ลบที่เหลือทิ้ง (เป็น seed จาก faker ทั้งหมด ไม่ใช่ข้อมูลจริง) |
| **`session.user.universityId` หายไป** | ตัดออกจาก JWT/Session type แล้ว — โค้ดที่ยังอ้างถึงจะ compile ไม่ผ่าน |
| **ย้ายเมนู Master Data** | `/super-admin/master-data` → **`/admin/master-data`** (F7 ทำไปพร้อมกัน เพื่อไม่ให้มีช่วงที่เพิ่มยี่ห้อแอร์ไม่ได้) |
| **ชื่อหน่วยงาน** | เดิมอ่านจากตาราง `universities` — เคยเปลี่ยนเป็นค่าคงที่ `ORGANISATION_NAME` ชั่วคราว **แต่ตอนนี้ไม่ใช่แล้ว** (ดูหัวข้อ S4–S7): ค่าคงที่ถูกลบทิ้ง เปลี่ยนไปอ่านจาก `SystemSettings` ผ่าน `await getOrganisationName()` ใน `src/lib/organisation.ts` แทน |

**⚠️ ต้องรัน `npx prisma migrate deploy` แล้ว `npx prisma generate` ทันทีหลัง pull** migration `20260811093000_remove_multi_tenancy` **ลบข้อมูลของสถาบันอื่นถาวร** (จำเป็น ไม่งั้น unique constraint ใหม่กับ enum จะพัง) — สำรองฐานข้อมูลก่อนถ้าเครื่องคุณมีข้อมูลที่อยากเก็บ

**สิ่งที่ยกเลิกไปโดยปริยาย:** backlog ข้อ **#10** (กราฟ Super Admin แยกสีตามมหาวิทยาลัย) ไม่ต้องทำแล้ว เพราะไม่มี Super Admin และไม่มีหลายมหาวิทยาลัยให้เทียบ

**สิ่งที่แก้ไปด้วยระหว่างทาง:** ปุ่ม quick-login "ผู้ดูแลระบบสูงสุด" ในหน้า login (บัญชีไม่มีอยู่แล้ว), comment ล้าสมัยเรื่องตาราง Laravel ใน `schema.prisma`, และ `/register` เลิกเป็น `force-dynamic` แล้ว (P15 ใส่ไว้เพราะหน้านั้นเคยอ่านรายชื่อมหาวิทยาลัยจาก DB — ตอนนี้ไม่อ่านแล้วจึงกลับไป static ได้)

**ทดสอบด้วยการรันจริงแล้ว:** เข้าสู่ระบบทั้ง org_admin และ technician, dashboard ทั้งสองฝั่ง, `/admin/master-data`, และหน้า QR — ข้อมูลครบถ้วน (73 เครื่อง / 4 ช่าง / 48 ใบงาน / 5 ยี่ห้อ 189 รุ่น) ไม่มี error ทั้ง console และฝั่งเซิร์ฟเวอร์

---

## 🧹 ถึง Esther03u — ไฟล์ UI ที่ไม่มีใครเรียกใช้ ลบได้ไหม? (11 สิงหาคม 2026)

ตรวจทั้งโปรเจกต์แล้วพบไฟล์เหล่านี้ **ไม่มีไฟล์ไหนในระบบ import เลยสักที่** DoubleKill ไม่ลบเองเพราะทั้งหมดอยู่ในเลนของคุณ — ช่วยยืนยันทีละข้อว่าจะลบหรือเก็บไว้ แล้วเขียนตอบไว้ในไฟล์นี้ได้เลย

| ไฟล์ | คืออะไร | หมายเหตุ |
|---|---|---|
| `src/components/layout/nav-header.tsx` | Header แถบบนแบบเก่า | **น่าจะลบได้แน่นอนที่สุด** — ถูกแทนที่ด้วย `dashboard-layout.tsx` ที่มี `<header>` + `SidebarHeader` ในตัวแล้ว ทุกหน้าใช้ตัวใหม่หมด |
| `src/components/examples/c-pagination-3.tsx` | ตัวอย่าง pagination จาก ReUI registry | **ระวัง** — น่าจะเก็บไว้เป็นต้นแบบทำ **P14** (ปุ่มเปลี่ยนหน้ากระดานใบงาน) ที่ยังค้างอยู่ ถ้าจะใช้อย่าลบ |
| `src/components/ui/label.tsx` | shadcn primitive | เพิ่มกลับได้ด้วย `npx shadcn add label` |
| `src/components/ui/toggle.tsx` | shadcn primitive | เพิ่มกลับได้ด้วย `npx shadcn add toggle` |
| `src/components/ui/option-wheel.tsx` + `option-wheel.css` | ตัวเลือกแบบวงล้อ | ไม่ใช่ของมาตรฐาน ถ้าลบแล้วอยากได้คืนต้องเขียนใหม่ (ดึงจาก git ได้) |
| `src/components/ui/thai-alert-dialogs.tsx` | กล่องยืนยันภาษาไทย (`ConfirmDeleteDialog` ฯลฯ) | เขียนเองในโปรเจกต์ ไม่ใช่ของ registry — ถ้าลบแล้วอยากได้คืนต้องดึงจาก git |

**ไม่ได้อยู่ในรายการนี้เพราะยังใช้อยู่จริง (เช็คแล้ว):** `examples/c-file-upload-4.tsx` (หน้าช่างใช้ และมันดึง `hooks/use-file-upload.ts` + `components/reui/alert.tsx` ต่อ — ทั้งสายต้องเก็บไว้)

**`ui/sonner.tsx` (Toaster) ก็ไม่มีใครใช้เหมือนกัน แต่เจ้าของโปรเจกต์ตัดสินใจเก็บไว้แล้ว** พร้อม package `sonner` และ `next-themes` เพราะ `next-themes` คือไลบรารีสลับธีมมืด/สว่างที่ **F5 ต้องใช้**

---

## ✅ งานรอบแก้ไขข้อมูล (11 สิงหาคม 2026) — Backend เสร็จ รอ UI

สั่งโดยเจ้าของโปรเจกต์ 4 เรื่อง Backend ทำครบแล้ว เหลือ UI ทั้งหมดเป็นของ Esther03u — **ข้อ 1, 2, 5 ทำ UI เสร็จแล้ว (23 ส.ค. 2026)** เหลือแค่ข้อ 6, 7 (ดูหมายเหตุในแต่ละข้อ)

### 1. แก้ไขข้อมูลแอร์รายเครื่อง — `updateAirConditionerAction(formData)` — **UI เสร็จแล้ว ✅**

**ทำแล้ว (23 ส.ค. 2026, Esther03u):** เพิ่มปุ่ม "แก้ไข" ในการ์ดแอร์แต่ละใบใน `asset-manager.tsx` เปิดโมดัลที่หน้าตาเหมือนฟอร์มลงทะเบียนแอร์ ค่าเริ่มต้นเป็นแท็บ "กำหนดเอง" เติมยี่ห้อ/รุ่นจากข้อความที่แสดงอยู่แล้วให้ (สลับไปแท็บ "รุ่นมาตรฐาน" เพื่อผูกกับ catalog ใหม่ได้ถ้าต้องการ) ส่วนวันที่ติดตั้งดึงสดผ่าน `getAirConditionerHistory(id)` ตอนเปิดโมดัล (ข้อมูลชุดที่ส่งมาให้ตอนโหลดหน้าไม่มี `installedAt`/`acBrandId`/`acModelId` ให้พรีฟิลอยู่แล้ว) — **ถ้าโหลดวันที่เดิมไม่สำเร็จ ฟอร์มจะล็อกช่องวันที่ + ปุ่มบันทึกไว้ทั้งหมด** กันไม่ให้บันทึกด้วยค่าว่างที่จะไปเคลียร์วันที่ติดตั้งจริงทิ้งโดยไม่ตั้งใจ (`installedAt` เว้นว่าง = ล้างค่า ตามพฤติกรรมของ action นี้ ต่างจากตอนลงทะเบียนที่เว้นว่าง = วันนี้)

แก้ได้: **ยี่ห้อ/รุ่น, BTU, วันที่ติดตั้ง, สถานะเครื่อง** (ปกติ/เสีย/รอล้าง)

field ที่ต้องส่ง — **เหมือนฟอร์มลงทะเบียนแอร์ทุกอย่าง** บวก 2 ตัว:

| field | ค่า |
|---|---|
| `airConditionerId` | id ของเครื่อง (**จำเป็น**) |
| `brandType` | `"master"` หรือ `"other"` |
| `acModelId` | ใช้เมื่อ `brandType="master"` |
| `customBrand` / `customModel` | ใช้เมื่อ `brandType="other"` |
| `btu` | ตัวเลข หรือเว้นว่าง |
| `status` | `"normal"` \| `"broken"` \| `"needs_cleaning"` (**ใหม่**) |
| `installedAt` | `YYYY-MM-DD` หรือเว้นว่าง (**ใหม่** — เว้นว่าง = ล้างค่าเป็น "ไม่ระบุ" ต่างจากตอนลงทะเบียนที่เว้นว่าง = วันนี้) |

**ข้อจำกัดที่ตั้งใจ:** ย้ายห้อง/อาคารไม่ได้ เพราะ `acCode` ถูกสร้างจากตึก+ห้องตอนลงทะเบียนและถูกพิมพ์ลงป้าย QR ไปแล้ว ถ้าย้ายได้รหัสจะไม่ตรงกับที่อยู่จริง (comment ใน schema ก็อ้างอิงว่า `roomId` ไม่เปลี่ยน)

**กรณีแจ้งซ่อมผิดเครื่อง ให้ใช้ "ยกเลิกใบงาน" แทนการแก้สถานะตรงๆ** (ข้อ 5 ด้านล่าง) เพราะยกเลิกแล้วสถานะเครื่องจะกลับเป็นปกติให้เอง ส่วนช่องแก้สถานะในฟอร์มนี้เอาไว้ใช้กรณีที่ข้อมูลเพี้ยนโดยไม่มีใบงานเกี่ยวข้อง

### 2. แก้ไขประวัติการซ่อมบำรุง — `updateMaintenanceLogAction(logId, action, notes?, repairDetail?)` — **UI เสร็จแล้ว ✅**

**ทำแล้ว (23 ส.ค. 2026, Esther03u):** เพิ่มปุ่ม "แก้ไข" ต่อรายการในโมดัลประวัติ (`ac-history-modal.tsx`, เปิดจากปุ่ม "ดูประวัติ" ใน `asset-manager.tsx`) กดแล้วเปลี่ยนรายการนั้นเป็นฟอร์มแก้ไข inline (เลือกประเภทงาน + ช่องซ่อมอะไรไปบ้างที่โผล่เฉพาะตอนเลือก "ซ่อมแซม" + หมายเหตุ) บันทึกแล้ว patch state ในเครื่อง ไม่ต้องโหลดประวัติใหม่ทั้งชุด — จุดนี้เข้าถึงได้จาก org_admin เท่านั้น (asset-manager เป็นหน้า admin ล้วน) จึงยังไม่ได้ใช้ประโยชน์จาก `technicianId` ที่ backend ส่งมาให้เต็มที่ ใส่ไว้ใน type แล้วเผื่ออนาคตถ้าทำหน้าประวัติฝั่งช่างเอง (ดู F5) จะได้เทียบ `session.user.id` ต่อได้ทันที

**สิทธิ์:** ช่างแก้ได้เฉพาะ log ที่ตัวเองบันทึก / org_admin แก้ได้ทุกอัน — ระบบอ่านเจ้าของจากแถวใน DB เอง ไม่เชื่อค่าที่ client ส่งมา

แก้ได้: **ประเภทงาน, หมายเหตุ, รายละเอียดการซ่อม**
แก้ไม่ได้: `performedAt`, รูปภาพ, เครื่องที่ผูกอยู่ — ส่วนเหล่านี้คือหลักฐานว่าไปทำงานจริงเมื่อไหร่ ถ้าผิดควรแจ้ง admin ไม่ใช่แก้เงียบๆ

ทุกการแก้ไขถูกบันทึกลง `system_audit_logs` พร้อมค่าเดิม (เพราะเป็นการแก้ประวัติย้อนหลัง)

**สำหรับทำ UI:** `getMaintenanceHistory()` คืน **`technicianId`** มาด้วยแล้ว ใช้เทียบกับ `session.user.id` เพื่อตัดสินว่าจะโชว์ปุ่ม "แก้ไข" ในรายการไหน

### 3. ช่องรายละเอียดการซ่อม (คอลัมน์ใหม่ `repair_detail`)

เพิ่มคอลัมน์ `repair_detail` ใน `maintenance_logs` แล้ว (migration `20260811140000_add_repair_detail`) **ต้อง `npx prisma migrate deploy` + `generate` หลัง pull**

**กติกา:** ถ้าช่างเลือกประเภทงาน "ซ่อม" **ต้องกรอกรายละเอียดการซ่อม** ไม่งั้น backend ตีกลับด้วยข้อความ `"กรุณาระบุรายละเอียดการซ่อม"`

**📌 คำขอ UI ในฟอร์มบันทึกงาน (`tech-mobile-view.tsx`):** เพิ่ม `<textarea name="repairDetail">` ที่**แสดงเฉพาะเมื่อผู้ใช้ติ๊ก "ซ่อม"** (state `selectedActions` มีอยู่แล้ว) ป้าย: "ซ่อมอะไรไปบ้าง" — แยกจากช่อง `notes` เดิมที่เป็นหมายเหตุรวมของการมาครั้งนั้น

ถ้าช่างเลือกทั้ง "ล้าง" และ "ซ่อม" ระบบสร้าง log 2 แถว โดย `repairDetail` จะติดไปเฉพาะแถวที่เป็น "ซ่อม" เท่านั้น

### 5. ยกเลิกใบงาน + คืนสถานะเครื่องอัตโนมัติ — `cancelWorkOrderAction(workOrderId, reason?)` — **UI เสร็จแล้ว ✅**

**ทำแล้ว (23 ส.ค. 2026, Esther03u):** เพิ่มปุ่ม "ยกเลิกใบงาน" ในโมดัลรายละเอียดใบงาน (`work-order-detail-dialog.tsx`) แสดงเฉพาะสถานะ `pending`/`claimed` ตามที่ขอ กดแล้วเปิดช่องกรอกเหตุผล (ไม่บังคับ) ก่อนยืนยันจริง เรียก action ผ่าน handler ใน `admin-dashboard-view.tsx` (แพทเทิร์นเดียวกับ assign/create เดิม) toast แจ้งผลต่างกันตาม `statusReset` ที่ backend คืนมา แล้วปิดโมดัลเพื่อไม่ให้ค้างแสดงสถานะเก่า

**สำหรับกรณีแจ้งซ่อมผิดเครื่องโดยเฉพาะ** เฉพาะ org_admin

**ยกเลิกแล้วสถานะเครื่องกลับเป็น "ปกติ" ให้อัตโนมัติ** — แต่**เฉพาะเมื่อไม่มีใบงานอื่นค้างอยู่แล้วเท่านั้น** ถ้ายังมีใบงานอื่น (คนอื่นแจ้งไว้ หรือถึงรอบล้างตามกำหนด) จะคงสถานะเดิมไว้ เพราะยังมีเรื่องค้างจริง

คืนค่า `{ success: true, statusReset: boolean }` — ใช้ `statusReset` บอกผู้ใช้ได้ว่าสถานะถูกคืนให้หรือไม่

**ยกเลิกไม่ได้ถ้าใบงานปิดไปแล้ว** (`completed`) เพราะมีประวัติการปฏิบัติงานผูกอยู่ การยกเลิกจะทำให้ประวัติเครื่องผิดความจริง — คืน error ข้อความไทยพร้อมแสดง

**📌 คำขอ UI:** เพิ่มปุ่ม "ยกเลิกใบงาน" ในโมดัลรายละเอียดใบงาน (`admin-dashboard-view.tsx`) แสดงเฉพาะใบที่สถานะเป็น `pending`/`claimed` พร้อมช่องกรอกเหตุผล (ไม่บังคับ — เก็บลง `resolutionNotes`)

### 6. บันทึกงานได้แม้ไม่มีใบงานล่วงหน้า — แก้ `logMaintenanceAction`

เดิม `workOrderId` เป็น **required** แปลว่าช่างที่เดินไปเจอเครื่องเสียแล้วซ่อมเลย **บันทึกงานไม่ได้** ถ้าไม่มีใบงานรออยู่

ตอนนี้ `workOrderId` เป็น **optional** — ถ้าไม่ส่งมา ระบบ**สร้างใบงานให้อัตโนมัติ** ในสถานะปิดงานทันที (ผู้แจ้ง/ผู้รับ = ช่างคนนั้น, `issueDescription` ระบุว่าระบบสร้างให้) สร้าง**ภายใน transaction เดียวกับการบันทึกประวัติ** เพื่อไม่ให้เกิดใบงานปิดแล้วแต่ไม่มีประวัติผูกอยู่

audit log แยกได้ว่าใบไหนระบบสร้างให้ ผ่าน field `autoCreatedWorkOrder`

**📌 คำขอ UI:** ฟอร์มบันทึกงานส่ง `workOrderId` เป็นค่าว่างได้แล้วเมื่อไม่มีใบงาน (`tech-mobile-view.tsx` ตอนนี้ส่งจาก `selectedJobForLog.id` เสมอ)

### 7. สแกน QR แล้วกดบันทึกงาน → พาไปหน้าช่างพร้อมรหัสแอร์ — **UI เสร็จแล้ว ✅**

ปุ่ม "บันทึกงานซ่อมบำรุง" บนหน้า QR ตอนนี้ลิงก์ไป **`/tech?ac=<acCode>`** แล้ว (เดิมไป `/tech` เฉยๆ ช่างต้องพิมพ์รหัสซ้ำ)

**ทำแล้ว (23 ส.ค. 2026, Esther03u):** `tech-mobile-view.tsx` อ่าน query param `ac` ด้วย `useSearchParams()` ตอนโหลดหน้า, เรียก `router.replace("/tech")` เคลียร์ query ทิ้งทันที (กันสแกนซ้ำตอนรีเฟรช/กดย้อนกลับ) แล้วเรียก `scanQrCodeAction(ac)` เปิดฟอร์มบันทึกงานให้เลยด้วย `pendingJobId` เป็น `workOrderId` ถ้ามี ไม่มีก็ปล่อยว่างตามที่ข้อ 6 รองรับไว้แล้ว — หน้านี้เป็น `ƒ` (dynamic) อยู่แล้วจากการเช็ค auth ใน `page.tsx` จึงไม่ต้องหุ้ม `<Suspense>` เหมือนตอนแก้ `login-form.tsx` (ปัญหานั้นเกิดเฉพาะหน้าที่มีสิทธิ์ static prerender)

### 4. ล็อกอินแล้วกลับหน้าเดิม — เสร็จแล้วทั้งหมด ✅

`login-form.tsx` อ่าน `?callbackUrl=` แล้วพากลับหน้านั้นหลังล็อกอิน และหน้า QR ส่ง callbackUrl ไปให้เองแล้ว

**⚠️ DoubleKill แตะ `login-form.tsx` และ `login/page.tsx`** — จำเป็นเพราะเป็น logic การนำทาง ที่ต้องรู้: `useSearchParams()` ทำให้หน้าถูกถอดออกจาก static prerender และ **build พังทันที** ต้องหุ้ม `<LoginForm />` ด้วย `<Suspense>` ซึ่งทำไว้แล้วใน `login/page.tsx` **อย่าเอา Suspense ออก**

รับเฉพาะ path ที่ขึ้นต้นด้วย `/` และไม่ใช่ `//` — กันคนส่งลิงก์ `?callbackUrl=https://evil.example` แล้วพาผู้ใช้ออกนอกเว็บทันทีหลังล็อกอิน (ทดสอบแล้วเด้งกลับ `/` ตามที่ควร)

---

## ✅ S4–S7 Backend เสร็จแล้ว (17 สิงหาคม 2026) — รอ UI ต่อ

**⚠️ ต้องรัน `npx prisma migrate deploy` + `npx prisma generate` หลัง pull** (migration `20260816120000_add_system_settings`)

### ตารางใหม่ `SystemSettings` — แถวเดียว id = 1

migration **สร้างแถวให้แล้ว** จึงไม่มีสถานะ "ยังไม่ตั้งค่า" ให้ต้องเช็ค — อ่านเมื่อไหร่ก็เจอแถวเสมอ

| ฟังก์ชันอ่าน (`src/lib/organisation.ts`) | คืนอะไร |
|---|---|
| `getOrganisationName()` | ชื่อหน่วยงาน (ยังไม่ตั้ง → `"มหาวิทยาลัยราชภัฏภูเก็ต"`) |
| `getOrganisationInfo()` | `{ name, address, phone }` |
| `getDefaultMaintenanceFrequency()` | `{ value, unit }` (เริ่มต้น 6 เดือน) |

**`ORGANISATION_NAME` ถูกลบแล้ว** — ถ้าโค้ดไหนยัง import อยู่จะ compile ไม่ผ่าน เปลี่ยนไปใช้ `await getOrganisationName()` แทน (แก้ให้ครบทั้ง 5 จุดแล้ว)

### Server Actions ใหม่

| Action | ทำอะไร |
|---|---|
| **S4** `updateDefaultFrequencyAction(value, unit)` | ตั้งรอบเริ่มต้น (`unit` = `days`/`months`/`years`, `value > 0`) |
| **S5** `updateOrganisationInfoAction(name, address?, phone?)` | ตั้งข้อมูลหน่วยงาน — revalidate ทั้ง `/admin` และ `/tech` เพราะชื่อขึ้นหัวทั้งสองฝั่ง |
| **S6** `adminResetUserPasswordAction(userId)` | ตั้ง `password = NULL` ไม่สร้างรหัสใหม่ให้ admin เห็น |
| **S7** `getAuditLogs({ page?, action? })` | คืน `{ logs, page, availableActions }` — แบ่งหน้า 50 รายการ |

ทุกตัวคืน `{ success }` หรือ `{ error }` ข้อความไทย และเขียน `logAudit` ให้แล้ว

**S6 มี guard เพิ่ม:** admin **รีเซ็ตรหัสผ่านตัวเองจากหน้านี้ไม่ได้** (กันล็อกตัวเองออก) และถ้า user นั้น `password` เป็น NULL อยู่แล้วจะบอกว่าไม่ต้องทำซ้ำ

**S7 คืน `availableActions` มาให้ด้วย** — เอาไปทำ dropdown filter ได้เลย ดึงจากค่าที่มีจริงในตาราง ไม่ใช่ลิสต์ hardcode ที่จะล้าสมัยเมื่อมี action ใหม่

### แอร์ใหม่ได้รอบบำรุงรักษาอัตโนมัติแล้ว (ทางเลือก ก.)

**เดิมเป็นช่องโหว่:** ไม่มีโค้ดจุดไหนสร้าง `MaintenanceSchedule` ตอนลงทะเบียนแอร์ (ที่มีครบ 73 เครื่องเพราะ backfill รอบเดียวเมื่อ 27 ก.ค.) แปลว่า**แอร์ที่เพิ่มหลังจากนั้นจะไม่มีรอบเลย และหลุดจากระบบ auto-check ถาวร**

ตอนนี้ `createAirConditionerAction` สร้าง schedule ให้ใน transaction เดียวกับการสร้างแอร์ โดยใช้รอบจาก `SystemSettings`

**กฎวันครบกำหนดครั้งแรก** (ตามที่เจ้าของโปรเจกต์ตัดสินใจ):

| วันติดตั้ง | ครบกำหนดครั้งแรก |
|---|---|
| **เกิน 6 เดือน** | **= วันนี้** ขึ้นค้างทันที (เครื่องเก่าที่เพิ่งมาลงทะเบียน ควรได้รับการดูแลเลย) |
| ไม่เกิน 6 เดือน | วันติดตั้ง + รอบ |
| ไม่ระบุ | วันนี้ + รอบ |

**🐛 แก้บั๊กเพิ่มระหว่างทาง:** `saveMaintenanceScheduleAction` คำนวณ `nextDueDate` ด้วย `new Date()` + setter แบบ local time ซึ่งผิด 3 อย่างกับคอลัมน์ `@db.Date` (บั๊กชุดเดียวกับ P16 ที่ตกค้างเป็นจุดที่ 3): วันคลาดช่วงเที่ยงคืน–7 โมง, อ่าน field ผิดโซนเวลา, และ 31 ม.ค. + 1 เดือน ได้ 3 มี.ค. แทน 28 ก.พ. — เปลี่ยนไปใช้ `businessDateToday()` + `addMaintenanceInterval()` แล้ว

### เก็บกวาดตามที่ฝากไว้

`revalidatePath("/admin/master-data")` → `/admin` แล้วทั้ง 2 จุด

### 📌 เหลือฝั่ง UI

1. `settings-panel.tsx` — ต่อปุ่มบันทึกการ์ด S4/S5 เข้ากับ action จริง แทน `NotConnectedAlert`
2. `team-panel.tsx` — ต่อ `onConfirm` เข้ากับ `adminResetUserPasswordAction`
3. `settings-panel.tsx` — การ์ด "ประวัติการใช้งานระบบ" เปลี่ยนจาก empty-state เป็นตารางจริงจาก `getAuditLogs()`

---

## 🔒 ตรวจ lock-ordering + แก้ deadlock (18 สิงหาคม 2026) — Backend เสร็จ ไม่ต้องรอ UI

ปิดข้อค้างเรื่อง "ความเสี่ยง lock-ordering ที่ยังไม่ได้ตรวจ" แล้ว **ทดสอบด้วยการรัน transaction ชนกันจริงบนฐานข้อมูล** ไม่ใช่แค่อ่านโค้ด

### สรุปผลตรวจ

**ต้นตอ:** ทุก transaction ที่ `INSERT` แถวลูก InnoDB จะจับ **shared lock (S)** บนแถวแม่เพื่อเช็ค foreign key ก่อน แล้วโค้ดค่อยไปขอ **exclusive lock (X)** บนแถวเดียวกันทีหลัง — จังหวะ upgrade S→X นี่แหละที่ทำให้สอง transaction ล็อกตายกัน

| คู่ที่ทดสอบ | ผลก่อนแก้ | ผลหลังแก้ |
|---|---|---|
| auto-check (`syncOverdueMaintenanceWorkOrders`) **vs** บันทึกงาน (`logMaintenanceAction`) เครื่องเดียวกัน | 🔴 **ERROR 1213 Deadlock** | ✅ รอคิวแล้วผ่าน (~0.85 วิ) |
| บันทึกงาน **vs** ยกเลิกใบงาน (`cancelWorkOrderAction`) ใบเดียวกัน | 🔴 **ERROR 1213 Deadlock** | ✅ รอคิวแล้วผ่าน (~0.82 วิ) |
| ลงทะเบียนแอร์ (`createAirConditionerAction`) **vs** auto-check | ✅ ไม่ชนอยู่แล้ว | ✅ ไม่ชน |

**คู่ที่เคยสงสัยไว้ (ลงทะเบียนแอร์ ชนกับ auto-check) ไม่ใช่ปัญหาเลย** — แถวแอร์ที่เพิ่ง `INSERT` แต่ยังไม่ commit มองไม่เห็นและล็อกไม่ได้จาก transaction อื่น auto-check จึงหาไม่เจอและ `updateMany` ก็แมตช์ไม่โดน ไม่มีทรัพยากรร่วมให้แย่งกัน

### วิธีแก้: บังคับลำดับล็อกให้เหมือนกันทั้งระบบ

**`work_orders` (X) → `air_conditioners` (X) → ค่อย INSERT แถวลูก** — จับ X บนแถวแม่ให้เสร็จก่อน FK check จะได้เจอ lock ที่ transaction ตัวเองถืออยู่แล้ว ไม่ต้อง upgrade

| ไฟล์ | เปลี่ยนอะไร |
|---|---|
| `src/app/tech/actions.ts` → `logMaintenanceAction` | ย้าย `UPDATE work_orders` และ `UPDATE air_conditioners` ขึ้นมา**ก่อน** `INSERT maintenance_logs` (เดิม insert ก่อน) |
| `src/lib/maintenance.ts` → `syncOverdueMaintenanceWorkOrders` | สลับ 2 คำสั่งใน `$transaction([...])` ให้ `updateMany` แอร์มาก่อน `createMany` ใบงาน |
| `src/app/admin/actions.ts` → `cancelWorkOrderAction` | **ลำดับถูกอยู่แล้ว ไม่ได้แก้** เพิ่มแค่ comment กันคนมาสลับทีหลัง |
| `src/lib/db-retry.ts` (**ไฟล์ใหม่**) | `withDeadlockRetry(label, fn)` — retry 3 ครั้งเมื่อเจอ error 1213 เป็นตาข่ายรองรับ ครอบ 4 transaction: บันทึกงาน, รับงานหลายใบ, ยกเลิกใบงาน, auto-check |

**⚠️ อย่าสลับลำดับใน 2 ไฟล์แรกกลับ** ถึงผลลัพธ์ข้อมูลจะเหมือนเดิมทุกประการ แต่ deadlock จะกลับมาทันที — มี comment อธิบายเหตุผลคาไว้ในโค้ดแล้วทั้ง 2 จุด

**ทำไมต้องมี retry ทั้งที่จัดลำดับแล้ว:** ลำดับล็อกครอบได้เฉพาะการชนที่เรามองเห็น แต่ InnoDB ยังจับ gap/next-key lock ตาม execution plan ที่เลือก ณ ตอนนั้นด้วย พอข้อมูลโตขึ้น คู่ที่ไม่ได้แตะแถวเดียวกันก็ยังชนกันได้ — และเวลา deadlock เกิด InnoDB roll back ทั้ง transaction ไม่มีเขียนค้างครึ่งๆ การรันซ้ำจึงเป็นคำตอบที่ถูกต้อง ไม่ใช่การกลบปัญหา

**ข้อควรระวังถ้าจะเอา `withDeadlockRetry` ไปใช้ที่อื่น:** ครอบได้เฉพาะงานที่รันซ้ำได้ ทุกอย่างต้องอยู่ใน transaction — ของที่มีผลข้างนอก (อัปโหลดไฟล์, `logAudit`, `revalidatePath`) ต้องอยู่นอกวงเล็บ

### ทดสอบด้วยการรันจริง (ไม่ใช่แค่ build ผ่าน)

`npx tsc --noEmit` → 0 error แล้วรันจริงผ่าน UI ด้วยบัญชี `houston16@example.net`: กด "รับงาน" → "บันทึกและปิดงาน" (ล้างแอร์) บนใบงาน #4 / แอร์ #9 ผลใน DB ถูกครบทั้ง 4 ขั้น — ใบงานเป็น `completed`, `maintenance_logs` แถวใหม่ผูก `work_order_id=4` ถูกต้อง, สถานะแอร์เป็น `normal`, และ `maintenance_schedules` ขยับเป็น `last_performed_at=2026-08-18` / `next_due_date=2026-11-18` (รอบ 3 เดือน) ไม่มี error ทั้ง console และฝั่งเซิร์ฟเวอร์

*หมายเหตุข้อมูลทดสอบ:* ใบงาน #4 ถูกปิดจริงจากการทดสอบนี้ (มี `maintenance_logs` id 615 เพิ่มมา 1 แถว) ไม่ได้ย้อนกลับเพราะเป็นข้อมูล seed และการย้อนจะทำให้ 4 ตารางไม่สอดคล้องกันเอง

### 🚨 เรื่องที่สำคัญกว่า deadlock: อาการ "MySQL ค้างจนต้องรีสตาร์ท" ไม่ได้เกิดจาก deadlock

ระหว่างทดสอบทำซ้ำอาการที่เคยเจอตอนทดสอบ S4 ได้ตรงเป๊ะ และ **ยืนยันว่าคนละเรื่องกับ deadlock โดยสิ้นเชิง**

**deadlock ไม่เคยทำให้ค้าง** — InnoDB ตรวจเจอวงจรแล้วฆ่าตัวใดตัวหนึ่งทันทีภายใน ~1 วินาที คืน error 1213 ออกมา

**ตัวที่ทำให้ค้างจริงคือ client ที่ถูกฆ่ากลางคัน transaction** (เช่นปิด dev server ตอนกำลังเขียน DB): thread ฝั่ง server จะค้างเปิด transaction ไว้พร้อมถือ row lock, สั่ง `KILL <id>` ขึ้นสถานะ `Killed` แต่ไม่ตายจริง, session อื่นค้างตามแม้แต่ query อ่านเฉยๆ, และ `mysqladmin shutdown` ก็ค้างรอ thread พวกนั้นอีกที

**ทางแก้ทางเดียว:**
```powershell
Stop-Process -Name mysqld -Force
Start-Process -FilePath "C:\xampp\mysql\bin\mysqld.exe" -ArgumentList '--defaults-file=C:\xampp\mysql\bin\my.ini' -WindowStyle Hidden
```
InnoDB crash recovery จะ roll back transaction ที่ค้างให้เองตอนสตาร์ท ข้อมูลไม่หาย (ตรวจ row count ทุกตารางหลังกู้แล้วครบเท่าเดิม)

**หลักฐานว่าเคยเกิดมาก่อน:** ใน `C:\xampp\mysql\data\mysql_error.log` มีบรรทัด `Rolled back recovered transaction 15589` ของวันที่ 17 ส.ค. 19:50 ซึ่งคือรอบที่เจอตอนทดสอบ S4 พอดี

**สรุปสำหรับคนทำงานต่อ:** ถ้าเจอ MySQL ค้าง อย่าไปไล่หา deadlock ในโค้ด — ให้ดูว่ามี dev server หรือ script ไหนถูกปิดกลางคันหรือเปล่า แล้ว force restart ตามคำสั่งข้างบน

---

## ✅ พบ emoji ใน UI ผิดกฎ `AGENTS.md` (18 สิงหาคม 2026) — **แก้แล้ว 23 ส.ค. 2026**

เจอระหว่างทดสอบหน้าช่าง กฎห้ามใช้ emoji ใน UI เด็ดขาด ให้ใช้ `lucide-react` แทน

| ไฟล์ | ข้อความเดิม | แก้เป็น |
|---|---|---|
| `src/components/tech/log-action-modal.tsx` (`<NativeSelectOption>`) | `✅ ใช้งานได้ปกติ` / `⚠️ รออะไหล่/ใช้งานไม่ได้` / `❄️ แอร์ไม่เย็น/รอตรวจสอบ` | ตัด emoji ออก เหลือข้อความล้วน — `<option>` ของ native select ใส่ไอคอน/สีไม่ได้จริงๆ ไม่ว่าจะสลับไปใช้ library ไหน จึงเลือกทางที่ไม่ต้องเปลี่ยน component (คงพฤติกรรม native select ที่ทำงานถูกต้องอยู่แล้วไว้) แทนการเปลี่ยนไปใช้ Select แบบ custom ที่เสี่ยงกระทบ form submission ของฟอร์มที่เพิ่งแก้เรื่อง `repairDetail` ไปหมาดๆ |
| `src/components/tech/qr-scan-modal.tsx` | `✅ ปกติ` / `⚠️ มีปัญหา` | เปลี่ยนเป็น `<CheckCircle2>`/`<AlertTriangle>` จาก `lucide-react` พร้อมสีความหมาย (`text-success-foreground`/`text-warning-foreground`) — จุดนี้เป็น `<span>` ธรรมดา ไม่ใช่ native option จึงใส่ไอคอนได้เต็มที่ตามมาตรฐาน |

---

## 🗄️ Database Sync — สำคัญมาก อ่านก่อน pull/push ทุกครั้ง

โปรเจกต์นี้ใช้ MySQL local (XAMPP) แยกเครื่องกัน — **โค้ดที่ push ขึ้น Git ไม่ได้ทำให้ฐานข้อมูลของอีกฝั่งตรงกันอัตโนมัติ** ต้องใช้ Prisma Migration เป็นตัวกลางเสมอ

**หลัง `git pull` ทุกครั้ง ให้รันคำสั่งนี้ก่อนเปิด dev server:**
```bash
npx prisma migrate deploy
npx prisma generate
```
ถ้าคำสั่งนี้แจ้งว่ามี migration ใหม่ที่ยังไม่ apply แปลว่าฐานข้อมูลของคุณ "ไม่ตรงกัน" กับที่ DoubleKill แก้ไว้ — รันตามนี้แล้วข้อมูลจะ sync ให้อัตโนมัติ (migration ทุกไฟล์ในโปรเจกต์นี้เขียนให้ idempotent แล้ว รันซ้ำได้ไม่พัง ไม่ต้องกลัวข้อมูลซ้ำ/หาย)

**ล่าสุด (27 กรกฎาคม 2026):** เพิ่ม migration `20260727161239_backfill_maintenance_schedules_and_ac_catalog` — เป็น **data migration** (ไม่ใช่ schema change) backfill ตาราง `maintenance_schedules` (189 แถว, รอบ 3 เดือน) และ `ac_brands`/`ac_models` (5 ยี่ห้อ, 189 รุ่น) ที่ว่างเปล่ามาตลอด **ต้อง `migrate deploy` ก่อน ไม่งั้นปฏิทินซ่อมบำรุงกับหน้า Master Data จะยังว่างเหมือนเดิม**

**ถ้าฝั่งเพื่อนมีข้อมูลเพิ่มเติมในเครื่องตัวเอง** (เช่น สร้าง user/มหาวิทยาลัยทดสอบเพิ่ม, แก้ข้อมูลผ่าน `prisma studio`, หรือ seed อะไรใหม่ที่อยากให้อีกฝั่งมีด้วย):
- **ห้าม** แก้ `schema.prisma` หรือสร้าง migration เอง (ผิดกฎด้านบน)
- ให้เขียนสรุปไว้ใน `HANDOFF.md` ว่าเพิ่ม/แก้ข้อมูลอะไรไปบ้าง (ตาราง, เงื่อนไข, ตัวอย่างค่า) แล้ว commit/push โค้ดตามปกติ — DoubleKill จะเขียน data migration ให้ในรอบถัดไปเหมือนที่ทำข้อ backfill นี้

---

## 📧 การตั้งค่าอีเมล (SMTP) — เพิ่มเมื่อ 10 สิงหาคม 2026

ระบบ "ลืมรหัสผ่าน" ส่งอีเมลจริงได้แล้ว (เดิม `console.log` ลิงก์ไว้เฉยๆ) ตัวส่งอีเมลอยู่ที่ **`src/lib/mail.ts`** ใช้ `nodemailer` และอ่านค่าทั้งหมดจาก environment variable จึงใช้ได้กับทั้ง Gmail, SMTP ของมหาวิทยาลัย หรือบริการอื่น โดยไม่ต้องแก้โค้ด

**เพิ่มค่าเหล่านี้ใน `.env` (ไฟล์นี้ไม่ขึ้น Git — ต้องตั้งเองทุกเครื่อง):**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-account@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx   # Gmail ต้องใช้ App Password ห้ามใช้รหัสผ่านบัญชีจริง
SMTP_FROM=ระบบซ่อมบำรุงแอร์ <your-account@gmail.com>   # ไม่ใส่ก็ได้ จะใช้ SMTP_USER แทน
APP_URL=http://localhost:3000       # โดเมนที่ใช้สร้างลิงก์ในอีเมล
```

**พฤติกรรมตามการตั้งค่า:**
| สถานะ | ผลลัพธ์ |
|---|---|
| ไม่ได้ตั้งค่า SMTP | ไม่พัง — ทำงานแบบเดิม (log ลิงก์ลง console) และข้อความบนหน้าเว็บจะบอกว่าอยู่ในโหมดพัฒนา |
| ตั้งค่าแล้ว | ส่งอีเมลจริง (มีทั้งเวอร์ชัน text และ HTML) และ **เลิก log ลิงก์ลง console** เพื่อไม่ให้ token หลุดลงไฟล์ log |
| ตั้งค่าผิด/ต่อไม่ได้ | ไม่ทำให้หน้าเว็บพัง — error ลง console ฝั่งเซิร์ฟเวอร์ ส่วนผู้ใช้เห็นข้อความกลางๆ เหมือนเดิม (กันการเดาว่าอีเมลไหนมีในระบบ) |

**⚠️ `APP_URL` สำคัญ:** ถ้าไม่ตั้ง ลิงก์ในอีเมลจะชี้ไป `http://localhost:3000` ซึ่งผู้รับกดแล้วใช้ไม่ได้ ต้องตั้งเป็นโดเมนจริงก่อนใช้งานกับผู้ใช้จริง

**หมายเหตุพอร์ต:** 587 = STARTTLS (ปกติใช้อันนี้), 465 = TLS ตั้งแต่ต้น โค้ดเดาให้อัตโนมัติจากเลขพอร์ต ถ้าต้องบังคับให้ตั้ง `SMTP_SECURE=true|false` เอง

---

## 📌 Project Overview
**Project Name:** AC Maintenance Management System (`ac-maintenance`)
**Framework & Tech Stack:**
- **Framework:** Next.js 16 (App Router with `src/proxy.ts`)
- **Database ORM:** Prisma 7 with MariaDB Driver Adapter (`@prisma/adapter-mariadb`)
- **UI Components:** React, Tailwind CSS, Lucide React Icons (Strict vector SVG standard, no emojis)
- **Role-Based Access Control (RBAC):** `org_admin`, `technician` (เดิมมี `super_admin` ด้วย — ถูกตัดออกใน F1)

---

## 🚀 Recent Implementations & Enhancements

> **⚠️ อ่านก่อน — หัวข้อ 1–3 ด้านล่างเป็นบันทึกประวัติศาสตร์ ไม่ใช่สภาพปัจจุบัน** (ตรวจสอบและกำกับไว้เมื่อ 18 ส.ค. 2026) ทั้งสามข้อบรรยายของที่**ถูกลบไปแล้ว** อย่าใช้เป็นภาพสถาปัตยกรรมของระบบตอนนี้ — ให้ดูหัวข้อ F1 ด้านบนแทน

### 1. ~~Financial & Executive Analytics Dashboard (`/admin`)~~ — ❌ ถูกถอดออกแล้ว (26 ก.ค. 2026)
- ~~`financial-dashboard-view.tsx` พร้อม cost metrics / budget allocations~~ — ไฟล์ถูกลบทั้งชุดตามสเปก `docs/superpowers/specs/2026-07-26-remove-financial-system-design.md` ตรวจแล้ว 18 ส.ค. 2026: ไม่เหลือโค้ดที่อ้างถึง `financial` ในโปรเจกต์เลย ระบบไม่เก็บข้อมูลค่าใช้จ่ายใดๆ ทั้งสิ้น

### 2. ~~Multi-Tenant Administration & RBAC (`/super-admin`, `/admin`, `/tech`)~~ — ❌ ถอด multi-tenant ออกแล้ว (11 ส.ค. 2026, F1)
- ~~tenant boundaries (`university_id` isolation)~~ — **ไม่มีแล้ว** ตาราง `universities`, คอลัมน์ `university_id` ทุกตาราง, role `super_admin` และโฟลเดอร์ `/super-admin` ถูกลบหมด เหลือ RBAC 2 ระดับ (`org_admin` / `technician`) ทุกแถวในฐานข้อมูลเป็นขององค์กรเดียว ไม่ต้อง scope query อีกต่อไป
- ✅ **ส่วนที่ยังจริงอยู่:** route protection ผ่าน `src/proxy.ts` + `src/lib/auth.config.ts` และการบล็อกสถานะ `pending`/`suspended`

### 3. Asset & Work Order Management
- Enhanced `asset-manager.tsx` และ `admin-dashboard-view.tsx` — responsive filtering, metric cards, maintenance status tracking *(~~`super-admin-view.tsx`~~ ถูกลบไปแล้วใน F1)*
- Optimized mobile experience in `tech-mobile-view.tsx` for field technicians

### 4. UI/UX Refinements & Theming (July 2026)
- **Dashboard Metrics:** Redesigned the Admin Dashboard (`admin-dashboard-view.tsx`) by unifying 4 separate metric cards into a single comprehensive "System Status Summary" widget.
- **Progress Visualization:** Integrated Shadcn `Slider` component as a non-interactive, visual progress bar to represent the ratio of healthy vs. broken air conditioners, styled with custom track and range colors (`bg-red-500` and `bg-success`).
- **Form Controls:** Migrated all old `<Select>` and raw `<select>` elements to shadcn's `NativeSelect` component across the application (`admin-dashboard-view`, `asset-manager`, `tech-mobile-view`, `chart-area-interactive`, etc.). Improved `native-select.tsx` to properly propagate custom classNames to the internal `<select>` tag for consistent padding and height alignment with text inputs.
- **Semantic Theming:** Audited and replaced hardcoded Tailwind color utility classes (e.g., `slate`, `sky`, `indigo`, `emerald`, `amber`) with semantic theme variables (e.g., `bg-background`, `bg-muted`, `bg-primary`, `bg-success`, `text-warning-foreground`, `border-border`) to fully support the dynamic HSL theme preset (`b7WjPrGOe`).
- **Layout Alignment:** Fixed visual asymmetries, such as the vertical separator spacing in the sidebar trigger (`dashboard-layout.tsx`) and text overlapping in chart dropdowns.

### 5. Backend Work Session (DoubleKill — 27 กรกฎาคม 2026)

แก้/เพิ่ม Backend ตาม Backlog ด้านล่างครบทุกข้อที่เป็นงาน Backend แล้ว (UI ยังไม่ได้ทำ — ดูหมายเหตุใน checklist แต่ละข้อ):

- **Root cause แก้แล้ว:** ปฏิทินซ่อมบำรุงไม่เคย auto-update เพราะ `logMaintenanceAction`/`getTechnicianData` ไม่เคยแตะ `MaintenanceSchedule` เลย — แก้ให้ทุกครั้งที่ปิดงาน `MaintenanceSchedule.lastPerformedAt`/`nextDueDate` จะขยับตาม `frequencyValue`/`frequencyUnit` อัตโนมัติ
- **"Auto-check" ทำเป็น lazy-check** (`src/lib/maintenance.ts` → `syncOverdueMaintenanceWorkOrders`) เพราะ stack นี้ไม่มี cron — รันทุกครั้งที่ dashboard ที่เกี่ยวข้องโหลด (`getTechnicianData`, `getOrgAdminData`, `/api/tech/units`)
- **Endpoint/field ใหม่ที่ UI เรียกได้แล้ว:**
  - `GET /api/tech/units` → `{ units: [...], summary: { total, cleaningJobs, repairJobs } }` (list แอร์ทั้งหมด sort ตาม backlog #1)
  - `getOrgAdminData()` → เพิ่ม `metrics.repairUnits`, `metrics.cleaningUnits`, `urgentUnits[]`
  - `getSuperAdminData()` → เพิ่ม `universityBreakdown[]` (per มหาวิทยาลัย: totalAcCount, brokenCount, techCount, cleanedCount, repairedCount)
  - `bulkClaimWorkOrdersAction(workOrderIds: string[])` → `{ success, claimedCount, skippedCount }` (atomic, กันแย่งงาน)
  - `/api/admin/maintenance-schedules` เปิดให้ role `technician` เรียกได้แล้ว (เดิมเปิดแค่ `org_admin`) พร้อม field `lastPerformedByName`
- **Data backfill:** `maintenance_schedules` (ว่างเปล่าอยู่ก่อนหน้านี้ — สร้างครบ 189 เครื่อง รอบ 3 เดือน), `ac_brands`/`ac_models` (backfill จากข้อมูล `brand`/`model` เดิม → 5 ยี่ห้อ, 189 รุ่น, ผูก `ac_brand_id`/`ac_model_id` กลับครบ)
- **บั๊กที่แก้ระหว่างทาง:** race condition ใน `claimWorkOrderAction` (2 ช่างกดรับงานเดียวกันพร้อมกันได้), ช่องโหว่ multi-tenant ที่ `claimWorkOrderAction` เดิมไม่เช็ค `universityId`
- **ลบ dead code:** `/api/tech/work-orders/**`, `/api/admin/work-orders/route.ts`, `scripts/test_workflow_api.ts` — ไม่มี UI ไหนเรียกใช้จริง (ระบบใช้ Server Actions ใน `tech/actions.ts`/`admin/actions.ts` แทนหมดแล้ว)

### 6. Alert Component Standardization (July 27, 2026)
- **Installed** `Alert` component from shadcn/ui (`src/components/ui/alert.tsx`) exposing `Alert`, `AlertTitle`, `AlertDescription`, and `AlertAction` sub-components.
- **Replaced all custom `<div>`-based alert patterns** with the standardized `<Alert>` component across **5 files** covering **8 alert locations**:

| File | Alert Type | Variant |
|------|-----------|---------|
| `admin-dashboard-view.tsx` | DB connection error | warning (custom) |
| `admin-dashboard-view.tsx` | Action toast (success / error) | success/destructive |
| `tech-mobile-view.tsx` | DB connection error | warning (custom) |
| `tech-mobile-view.tsx` | Action toast (success / error) | success/destructive |
| `asset-manager.tsx` | Action toast (success / error) + added icon & dismiss | success/destructive |
| `login-form.tsx` | Login error | `variant="destructive"` |
| `register-form.tsx` | Form error | `variant="destructive"` |
| `register-form.tsx` | Pending approval success state | amber (custom) |
| `super-admin-view.tsx` | DB connection error | warning (custom) |
| `super-admin-view.tsx` | Action toast (success / error) | success/destructive |

- **Pattern applied consistently:**
  - **DB Error** → `<Alert>` warning colors + `<AlertTitle>` + `<AlertDescription>`
  - **Toast (success)** → `<Alert>` green + `AnimatedIcon` bounce + `<AlertAction>` dismiss button
  - **Toast (error)** → `<Alert>` red + `AnimatedIcon` wiggle + `<AlertAction>` dismiss button
  - **Form Error** → `<Alert variant="destructive">` + `<AlertDescription>`
- Verified with `npx tsc --noEmit` → **0 TypeScript errors**.

---

## 📁 Key File Structure & Architecture

*(อัปเดตให้ตรงกับของจริงเมื่อ 25 ส.ค. 2026 — หลังแยก `admin/actions.ts` ออกเป็น `src/lib/admin/`)*

```
ac-maintenance/
├── src/
│   ├── app/
│   │   ├── admin/                # Route + actions.ts (จุดเดียวที่เป็น "use server" ฝั่ง admin) + master-data/
│   │   ├── tech/                 # Technician Mobile Interface & Actions (technician)
│   │   ├── qr/[id]/              # หน้า QR สาธารณะ (ไม่ต้อง login — ดู F6)
│   │   ├── api/                  # REST handlers (เหลือ 3 จุด: auth, admin/maintenance-schedules, tech/units)
│   │   └── ...                   # login, register, reset-password, pending-approval
│   ├── proxy.ts                  # Next.js 16 Proxy Convention for Auth Guard (อยู่ที่ src/ ไม่ใช่ src/app/)
│   ├── components/
│   │   ├── admin/                # Admin Dashboard Components
│   │   ├── tech/                 # Technician Mobile Components
│   │   ├── shared/               # ใช้ร่วมกัน 2 ฝั่ง (maintenance-calendar.tsx, profile-panel.tsx)
│   │   ├── layout/               # dashboard-layout.tsx, dashboard-loading.tsx
│   │   └── ui/                   # Shared UI Primitives (incl. alert.tsx)
│   └── lib/
│       ├── admin/                # ← ตรรกะฝั่ง admin แยกตามหมวด (ไม่ใช่ "use server")
│       │   ├── dashboard.ts      #   getOrgAdminData()
│       │   ├── work-orders.ts    #   ใบงาน: getWorkOrdersPage / สร้าง / จ่าย / ยกเลิก
│       │   ├── settings.ts       #   ผู้ใช้ / โปรไฟล์ / ตั้งค่าระบบ (S4–S7)
│       │   ├── assets.ts         #   อาคาร / ห้อง / แอร์ / ประวัติ / รอบ PM
│       │   └── work-order-board.ts #  select+mapper ของกระดานใบงานที่ใช้ร่วมกัน
│       ├── auth.ts / auth.config.ts  # NextAuth + RBAC
│       ├── auth-guards.ts        # verifyOrgAdmin()
│       ├── maintenance.ts        # auto-check + helper วันที่ (businessDateToday ฯลฯ)
│       ├── upload.ts             # saveUpload() / deleteUpload()
│       ├── organisation.ts       # อ่านค่าจาก SystemSettings
│       ├── db-retry.ts           # withDeadlockRetry() — ดูหัวข้อ lock-ordering
│       ├── mail.ts / audit.ts / reset-token.ts / utils.ts
│       └── prisma.ts             # Prisma 7 Database Instance with MariaDB Driver Adapter
├── prisma/
│   ├── schema.prisma             # Database Schema Definition (12 model)
│   └── migrations/               # 8 ไฟล์
└── HANDOFF.md                    # Handoff Documentation
```

**กฎที่ยังเหมือนเดิม:** ทุกอย่างใน `src/lib/**` และ `**/actions.ts` เป็นของ DoubleKill / `src/components/**` เป็นของ Esther03u

---

## 🛠 Developer Workflow & Commands

### 1. Local Development
```bash
npm run dev
```

### 2. Database Migrations & Prisma Studio
```bash
npx prisma db push
npx prisma studio
```

### 3. Build & Type Check
```bash
npm run build
```

---

## 📝 Git & Version Control Status
- All changes verified and staged.
- Production build verified with zero TypeScript or bundling errors.
- Latest features committed and pushed to `origin/master`.
- Backend session (27 กรกฎาคม 2026) committed and pushed — see "Backend Work Session" above.

---

## ✅ Backlog (แยกตาม Role) — บันทึกเมื่อ 27 กรกฎาคม 2026

> **หมายเหตุ:** ข้อที่ขึ้น `[Backend ✅]` แปลว่า DoubleKill ทำฝั่ง Backend เสร็จแล้ว รอแค่ UI มาเรียกใช้ — ดู endpoint/field ที่ต้องเรียกในหัวข้อ "Backend Work Session" ด้านบน ไม่ต้อง checklist [x] จนกว่า UI จะเสร็จด้วย

### Technician
- [x] 1. **⚠️ กฎ“เครื่องที่ถึงกำหนดอยู่บนสุดเสมอ” ถูกยกเลิกแล้วเมื่อ 25 ส.ค. 2026** (ดู Backlog ข้อ 7) — ตอนนี้เรียง อาคาร → ซ่อมก่อนล้าง → วันที่ แทน `[Backend ✅ — เรียก GET /api/tech/units]` Dashboard: แสดง List แอร์ทั้งหมดพร้อมวันที่ล้างล่าสุดต่อท้ายแต่ละรายการ เรียงจากไม่ได้ล้างนานที่สุดไปหาน้อยที่สุด ยกเว้นเครื่องที่ถึงกำหนดล้างแล้ว (มี work_order สถานะ pending จาก auto-check 3 เดือน) ต้องอยู่บนสุดเสมอไม่ว่าลำดับวันที่จะเป็นอย่างไร — เพิ่ม section สรุปจำนวนงานแยกตามประเภท (งานล้างกี่งาน งานซ่อมกี่งาน) — [เพิ่มแท็บ "แอร์ทั้งหมด" ในหน้า Technician แล้ว, ดึงข้อมูลแบบ SSR ผ่าน `getTechnicianAssetList()` (`src/lib/maintenance.ts`, ใช้ร่วมกับ endpoint เดิม) แทนการ fetch ฝั่ง client]
- [x] 2. ในการ์ด/รายการงาน สลับตำแหน่ง: เอาที่อยู่แอร์ (ตึก/ห้อง) ขึ้นเป็นหัวข้อหลัก แล้วย้ายรุ่นแอร์ + ขนาด BTU ลงมาเป็นรายละเอียดด้านล่างแทน (UI ล้วนๆ ข้อมูลมีอยู่แล้ว) — [ทำครบทั้ง 4 การ์ด: งานทั้งหมด, งานของฉัน, ประวัติ, แอร์ทั้งหมด]
- [x] 3. `[Backend ✅ — เรียก bulkClaimWorkOrdersAction(ids: string[])]` เพิ่มปุ่ม/checkbox ให้ช่างติ๊กเลือกหลายงานจาก pool แล้วกดรับพร้อมกันในทีเดียว (bulk claim)
- [x] 4. `[Backend ✅ — เรียก GET /api/admin/maintenance-schedules (เปิดให้ technician แล้ว, มี lastPerformedByName)]` เพิ่มปฏิทินซ่อมบำรุงแบบเดียวกับของ Org Admin แสดงวันที่ถึงกำหนดล้างแอร์ และอัปเดตอัตโนมัติเมื่อมีการซ่อม/ล้างจริงเกิดขึ้น พร้อมระบุชื่อช่างที่เป็นคนทำ (auto-update ทำงานแล้วฝั่ง backend — แค่ต้องสร้าง UI component) — [ย้าย `MaintenanceCalendar` ไป `src/components/shared/` ใช้ร่วมกับ Org Admin (ปิดข้อ 7 ไปด้วยในตัว), เพิ่ม "ทำล่าสุดโดย" ในโมดัล, ปุ่ม "สร้างใบงาน" ซ่อนอัตโนมัติสำหรับ Technician (prop `onCreateWorkOrder` เป็น optional) — ระหว่างทางเจอบั๊ก backend เดิม: endpoint อ่าน field เก่า `brand`/`frequencyMonths` ที่เป็น null หลัง backfill 27 ก.ค. ทำให้ยี่ห้อ/ความถี่ในปฏิทินว่างเปล่าทั้ง Admin และ Technician แก้ให้ join `ac_brands` และใช้ `frequencyValue`/`frequencyUnit` แทนแล้ว]

### Org Admin
- [x] 5. `[Backend ✅ — getOrgAdminData() คืน metrics.repairUnits / metrics.cleaningUnits แล้ว]` แก้ข้อมูลใน Dashboard ให้แสดงจำนวนงานซ่อมและงานล้างแยกกันชัดเจน
- [x] 6. `[Backend ✅ — getOrgAdminData() คืน urgentUnits[] แล้ว (รวม broken+overdue พร้อม location-first shape ตามข้อ 2)]` เปลี่ยนส่วน "รอซ่อมด่วน" เป็น List รายการแอร์ที่เสียและถึงกำหนดล้าง โดยสลับลำดับชื่อตึก/ชื่อแอร์ให้เหมือนรูปแบบของ Technician (ข้อ 2) — [เพิ่มคอลัมน์ BTU ต่อท้ายยี่ห้อในคอลัมน์ "สถานที่ / รุ่นแอร์" แล้ว (`ac.btu` มีอยู่แล้วทั้งใน `urgentUnits[]` และ `acUnits[]` ฝั่ง backend ไม่ต้องแก้ backend) เสร็จสมบูรณ์]
- [x] 7. `[Backend ✅ — endpoint เดียวกับข้อ 4]` ปฏิทินซ่อมบำรุง: ระบุวันครบกำหนดล้าง และอัปเดตวันที่ซ่อม/ล้างจริงอัตโนมัติพร้อมชื่อช่าง (เหมือนข้อ 4 ของ Technician — ควรใช้ component เดียวกันเพื่อไม่ให้โค้ดซ้ำ) — [ปิดพร้อมข้อ 4: การ์ดปฏิทินเดิมของ Org Admin ใช้ `src/components/shared/maintenance-calendar.tsx` ตัวเดียวกับ Technician แล้ว พร้อม "ทำล่าสุดโดย" ในโมดัล]
- [x] 8. กระดานใบงาน: เพิ่มขนาด BTU ต่อท้ายชื่อรุ่นแอร์ในทุกการ์ด (UI ล้วนๆ field `btu` มีอยู่แล้ว) — [เพิ่มแล้วทั้งแถวในตาราง "กระดานใบงาน" และในโมดัลรายละเอียดใบงาน (ข้อมูลเครื่องปรับอากาศ) — `airConditioner.btu` มากับ Prisma include เดิมอยู่แล้ว เพิ่มแค่ field เดียวใน `workOrders` map ของ `getOrgAdminData()`]
- [x] 9. `[Backend ✅ — assignToUserId เป็น optional อยู่แล้วใน createWorkOrderAction ไม่ต้องแก้ backend]` หน้าสร้างใบงานซ่อมบำรุง: เพิ่มลำดับการเลือกแบบ cascade — เลือกตึกก่อน แล้วเลือกห้อง จากนั้นตัวเลือกเครื่องปรับอากาศจะกรองให้เห็นเฉพาะเครื่องของห้องที่เลือกเท่านั้น และเพิ่มตัวเลือกช่างเริ่มต้นเป็น "ไม่ระบุช่าง" (สอดคล้องกับ `work_orders.claimed_by` ที่เป็น nullable อยู่แล้ว) — [เสร็จแล้ว (15 ส.ค. 2026): cascade select อาคาร→ห้อง→แอร์ อยู่ใน `create-work-order-modal.tsx` ใช้ข้อมูล `buildings` เดิมที่มีอยู่แล้ว ไม่ต้องแก้ backend เพิ่ม พร้อมแก้บั๊กเดิมที่ช่องช่างติด `required` ทั้งที่ป้ายบอกว่า "ไม่บังคับ" — เอา `required` ออกและเพิ่มตัวเลือก "ไม่ระบุช่าง" เป็นค่าเริ่มต้นแล้ว]

### Super Admin
- [x] 10. **❌ ยกเลิก — ตกไปตั้งแต่ F1 (11 ส.ค. 2026)** ~~Dashboard: ทำกราฟแบบมีสี แสดงจำนวนแอร์/ช่าง/ที่เสีย/ที่ล้างแล้ว/ที่ซ่อมแล้ว แยกตามมหาวิทยาลัย~~ — ไม่มี Super Admin และไม่มีหลายมหาวิทยาลัยให้เทียบแล้ว `getSuperAdminData()` ถูกลบไปพร้อมโฟลเดอร์ `/super-admin` **ไม่ต้องทำ**
- [x] 11. **[บั๊ก — UI/Layout ล้วนๆ] ปิดไปพร้อม P10 (15 ส.ค. 2026)** ~~แก้ Dashboard component ที่ติดตามไปแสดงทุกหน้า~~ — ยืนยันจากโค้ด 18 ส.ค.: ทุก panel อยู่หลังเงื่อนไข `activeTab === "..."` แล้วทั้ง `admin-dashboard-view.tsx` และ `tech-mobile-view.tsx` ส่วน `dashboard-layout.tsx` ไม่มีเนื้อหา dashboard อยู่เลย การแยก component ตาม P10 แก้ต้นเหตุไปในตัว
- [x] 12. **[บั๊ก — แก้ครบแล้วทั้ง Backend+ข้อมูล]** ~~หน้าข้อมูลหลัก (master data) ไม่แสดงรุ่นแอร์ที่มีในระบบ~~ → root cause คือ `ac_brands`/`ac_models` ว่างเปล่า (query/UI ไม่ได้ผิด) — backfill แล้ว 5 ยี่ห้อ, 189 รุ่น ยืนยันแสดงผลถูกต้องแล้ว

---

## ⚡ ข้อเสนอปรับปรุงประสิทธิภาพ (Performance Backlog) — เสนอเมื่อ 4 สิงหาคม 2026

ผลจากการตรวจโค้ดทั้งโปรเจกต์ (DoubleKill)
แบ่งตามเจ้าของงานตามกฎ "ห้ามแก้ Backend เอง" ด้านบนของไฟล์นี้

> **สถานะ 9 สิงหาคม 2026:**
> - **กลุ่ม A เสร็จหมด** (P1–P4, P6) ยกเว้น **P5 ที่ยกเลิกโดยตั้งใจ** — ดูเหตุผลด้านล่าง
> - **กลุ่ม B เสร็จหมด** (P7, P8, P9)
> - **กลุ่ม C ยังไม่เริ่ม** เป็นงาน UI ของ Esther03u ทั้งหมด แต่ **backend รองรับพร้อมแล้วทุกข้อ**
>
> ✅ **ไม่มีงาน backend ค้างแล้ว** — ที่เหลือทั้งหมดเป็นงาน UI
>
> **บริบท:** ตอนนี้ข้อมูลยังเล็ก (นับเมื่อ 18 ส.ค. 2026: **73 แอร์, 225 maintenance_logs, 53 ใบงาน, 5 ผู้ใช้** — ตัวเลข "607 logs" ที่เคยเขียนไว้ตรงนี้เป็นยอดก่อน F1 ลบข้อมูลมหาวิทยาลัยอื่นทิ้ง) ทุกหน้าจึงยังเร็วอยู่
> ข้อที่เหลือจะเริ่มรู้สึกตอนข้อมูลโต

### 🟢 กลุ่ม A — Backend/DB ล้วน (เสร็จแล้ว)

ทั้งกลุ่มนี้ **return shape เดิมทุก field** ฝั่ง UI ไม่ต้องแก้อะไร

- [x] **P1.** `getOrgAdminData()` — ย้าย `brands: await prisma.acBrand.findMany(...)` เข้าไปใน `Promise.all` (เดิมอยู่ใน return object เลยรัน **หลัง** query อื่นเสร็จหมด = เสีย round trip ฟรีทุกครั้งที่โหลดหน้า)
- [x] **P2.** `getOrgAdminData()` — รวม query `pendingUsersRaw` + `allUsersRaw` เป็นอันเดียวแล้ว filter ใน memory + ใส่ `select` → **password hash ไม่ถูกดึงออกจาก DB อีกแล้ว**
- [x] **P3.** `syncOverdueMaintenanceWorkOrders()` — throttle 5 นาที/tenant (เดิมยิง query + อาจเขียน DB **ทุกครั้ง**ที่โหลด `/admin`, `/tech`, `/api/tech/units`) ถ้า query ล้มเหลวจะไม่ถูก cache เป็น "เช็คแล้ว"
- [x] **P4.** `bulkClaimWorkOrdersAction()` — จากวน `updateMany` ทีละ id (รับ 20 งาน = 20 round trip ถือ lock ยาว) เหลือ **2 query** + audit เปลี่ยนเป็น `logAuditMany` (`createMany`)
  - ⚠️ รายละเอียดที่ต้องรู้: `work_orders.claimed_at` เป็น `Timestamp(0)` = ความละเอียดระดับวินาที ถ้าส่ง `Date` ที่มี milliseconds จะถูกตัดตอนเขียนแล้วอ่านกลับมาเทียบไม่ตรง โค้ดจึง align เป็นวินาทีก่อนใช้
- [x] **P6.** ย่อรูปตอนอัปโหลดใน `saveUpload()` — downscale 1600px + JPEG quality 80 + หมุนตาม EXIF, ถ้าประมวลผลล้มเหลวจะเซฟไฟล์เดิมแทน (ไม่ทำหลักฐานหาย) URL ที่คืนรูปแบบเดิม UI ไม่ต้องแก้
  - `sharp` เดิมเป็นแค่ transitive dep ของ Next.js — ประกาศใน `package.json` ให้ชัดแล้วเพราะตอนนี้ import ตรง

#### ❌ P5 — ยกเลิกโดยตั้งใจ (ทดสอบแล้วไม่คุ้ม)

ข้อเสนอเดิมคือเพิ่ม index บน `air_conditioners.status` และ `.deleted_at` — **ทดสอบด้วย `EXPLAIN` แล้วพบว่าไม่ควรทำ:**

| Index | ผลทดสอบ |
|---|---|
| `deleted_at` | MySQL เลือก `room_id_index` แทน ไม่แตะเลย + ข้อมูล 189/189 แถวเป็น NULL (selectivity 0%) |
| `status` | ใช้ได้ถ้ามี query แบบ `WHERE status='broken'` เดี่ยวๆ **แต่แอปไม่มี query แบบนั้น** — ที่มีคือ `id IN (...) AND status='normal'` (ใช้ PK อยู่แล้ว) กับ `CASE WHEN ac.status` ใน aggregate (full scan โดยธรรมชาติ) |

ถ้าใส่ไปจะทำให้ทุก INSERT/UPDATE บน `air_conditioners` ช้าลงโดยไม่ได้อะไรกลับมา **อย่าเพิ่มกลับเข้ามาโดยไม่ได้ EXPLAIN ใหม่ก่อน**

### 🟡 กลุ่ม B — ต้องตกลงกันก่อน / ทำร่วมกัน

- [x] **P7. ลบหน้า `/dashboard` ที่เป็นโค้ด demo ค้างอยู่** — **ลบแล้ว**

  เป็น scaffold ของ shadcn ล้วนๆ ใช้ `data.json` ปลอม ไม่มีลิงก์จากหน้าไหน และไม่อยู่ใน matcher ของ `src/proxy.ts` → **เป็น public route ที่เปิดได้โดยไม่ต้องล็อกอิน** ลบไปทั้งหมด 2,750 บรรทัด + ถอน 5 packages (`@dnd-kit` ×4 + `vaul`)

  ⚠️ **แก้คำพูดเดิมในเอกสารนี้:** ตอนเสนอผมเขียนว่า "ลาก dependency หนักเข้า bundle" — **ไม่ถูกทั้งหมด** Next.js แยก chunk ตาม route อยู่แล้ว `@dnd-kit` จึงโหลดเฉพาะตอนเข้า `/dashboard` ผู้ใช้จริงที่เข้า `/admin`/`/tech` ไม่เคยโหลดเลย **ผลที่ได้จริงคือ:** ปิด public route ที่ไม่มี auth + ลบ dead code + ลด package (install/build เร็วขึ้น) ไม่ใช่ bundle เล็กลงสำหรับผู้ใช้

  📌 **`data-table.tsx` ลบไปด้วยตามที่ Esther03u อนุมัติ** (ดูหัวข้อ "คำตอบจาก Esther03u" ด้านล่าง) — ถ้าเปลี่ยนใจอยากได้กลับมาเป็นต้นแบบ ดึงคืนจาก git ได้: `git show 181269d^:src/components/data-table.tsx > src/components/data-table.tsx`

  ℹ️ ตอนลบต้องระวังไฟล์ชื่อชนกัน — `components/chart-area-interactive.tsx` (demo, ลบแล้ว) กับ `components/admin/chart-area-interactive.tsx` (ของจริง ยังอยู่) ส่วน `ui/sidebar`, `ui/chart`, `ui/table`, `ui/checkbox`, `ui/tabs`, `ui/breadcrumb` เก็บไว้ทั้งหมดเพราะหน้าจริงใช้

- [x] **P8. เปลี่ยน `include` เป็น `select` ในงาน query หนัก** — **เสร็จแล้ว**

  `getOrgAdminData()` เดิมดึง buildings → rooms → airConditioners แบบ full row + `acBrand` + `acModel` + `maintenanceSchedules` เต็มๆ และใบงานดึง full row + user 3 คนเต็มๆ ต่อ 1 ใบ ตอนนี้ `select` เฉพาะ field ที่ใช้จริงแล้ว

  🐛 **แก้บั๊กที่เจอระหว่างทาง — admin ลงทะเบียนแอร์ใหม่ไม่ได้เลย:** `brands` เป็นค่าเดียวที่ส่งดิบจาก Prisma ไม่ได้ map ทำให้ `id` เป็น BigInt แต่ค่าที่ `<select>` คืนมาเป็น string การเทียบ `brands.find(b => b.id === selectedBrandId)` จึง false เสมอ → **ช่องรุ่นว่างเปล่าตลอด** และเพราะ field นั้นเป็น `required` จึงบันทึกไม่ได้เลย

  map ให้เป็น string เหมือนลิสต์อื่นแล้ว — ทดสอบแล้วเลือก Carrier ขึ้น 37 รุ่น, LG ขึ้น 44 รุ่น (เดิมได้ 0 ทั้งคู่)

  ✅ ตรวจครบทั้ง 7 แท็บ + โมดัลรายละเอียดใบงาน ไม่มี `undefined` โผล่ (เป็นอาการที่จะเกิดถ้า `select` ตกสัก field)

- [x] **P9. เพิ่ม `loading.tsx`** — **เสร็จแล้ว (โครง — หน้าตายังปรับได้)**

  สาเหตุที่ขาวค้าง: ทั้ง 3 หน้า render `DashboardLayout` จากใน `page.tsx` ไม่ใช่ `layout.tsx` ระหว่างรอ query จึงไม่มีอะไรบนจอเลย

  เพิ่ม `src/components/layout/dashboard-loading.tsx` ใช้ร่วมกัน + `loading.tsx` ที่ `/admin`, `/tech`, `/super-admin` โครง skeleton ล้อรูปทรงจริง (sidebar rail, header h-16, แถว metric, panel เนื้อหา) เพื่อไม่ให้ layout กระตุกตอนข้อมูลมา ใส่ `aria-busy` + ข้อความ sr-only ให้ screen reader รู้ว่ากำลังโหลด

  📌 **ถึง Esther03u:** ตั้งใจทำให้เรียบๆ ไว้ — **หน้าตาปรับได้ตามใจเลย** ใช้ `ui/skeleton` กับ semantic token อยู่แล้ว ถ้าอยากให้เข้ากับธีมมากกว่านี้แก้ที่ `dashboard-loading.tsx` ที่เดียวจบทั้ง 3 หน้า จำนวนการ์ด metric ปรับผ่าน prop `metricCount`

---

## 🗓️ ปฏิทินซ่อมบำรุง: เปลี่ยนป้ายเป็นประเภทงาน — 9 สิงหาคม 2026

**⚠️ หมายเหตุถึง Esther03u:** งานนี้แก้ `src/components/shared/maintenance-calendar.tsx` ซึ่งเป็นไฟล์ฝั่ง UI ของคุณ — DoubleKill แก้ตามที่เจ้าของโปรเจกต์สั่งโดยตรง **ถ้าคุณกำลังแก้ไฟล์นี้อยู่พร้อมกัน ให้ pull ก่อน merge**

**ปัญหาเดิม:** ช่องปฏิทินแสดงแค่รหัสแอร์ ซึ่งยาวเกินความกว้างช่อง เลยถูกตัดเหลือ `RWWW-B660550-8-1944...` ทุกอัน — อ่านไม่รู้เรื่องและไม่บอกด้วยว่าเป็นงานประเภทไหน

**แก้เป็น:** `งานซ่อม - B660550-1-241631-01` / `งานล้าง - B467711-...` (ประเภทขึ้นก่อน แล้วตามด้วยรหัสเครื่อง) หัวข้อในโมดัลก็เปลี่ยนเป็นชื่อประเภทงานด้วย ส่วนสีเดิม (แดง=เลยกำหนด / เหลือง=ใกล้ถึง / เทา=ยังไม่ถึง) คงไว้ทั้งหมด

> *หมายเหตุ 18 ส.ค. 2026:* ตัวอย่างรหัสในหัวข้อนี้เดิมเขียนเป็น `RWWW-B660550-...` ซึ่งเป็นรูปแบบ **ก่อน F1** — แก้ให้ตรงกับรูปแบบปัจจุบัน `[BLDG]-[ROOM]-[NN]` แล้ว

**ประเภทงานมาจากไหน:** ไม่มีที่ไหนเก็บ "ประเภทงาน" ของงานที่**ยังไม่เกิด**เลย — `maintenance_schedules` คือรอบล้างล้วนๆ ส่วน `work_orders` มีแค่ `status` (ไม่มี type) และ `maintenance_logs.action` เป็นงานที่ทำไปแล้ว

จึงอนุมานจากสถานะแอร์: `status = broken` → **งานซ่อม**, นอกนั้น → **งานล้าง** — เป็นเกณฑ์เดียวกับที่ dashboard ใช้นับ "รอซ่อม/รอล้าง" อยู่แล้ว จะได้ไม่ขัดกันเอง (ตรวจแล้ว: งานซ่อม 25 / งานล้าง 48 จาก 73 ตรงกับ broken 25 และ normal 21 + needs_cleaning 27)

**ถ้าจะแก้ข้อความทีหลัง:** API คืนค่ากลางๆ เป็น `jobType: "repair" | "cleaning"` ส่วนคำไทยอยู่ใน `JOB_TYPE_LABEL` ใน component แก้ที่เดียวจบ และเพราะปฏิทินตัวนี้ใช้ร่วมกันทั้ง Org Admin และ Technician ฝั่งช่างจึงเห็นเหมือนกันทันที

**ข้อจำกัดที่ควรรู้:** ตราบใดที่ยังไม่มี field ประเภทงานจริงใน DB (ดูตัวเลือก "เพิ่ม field ประเภทงาน" ที่เคยคุยกัน) ป้ายนี้จะสะท้อน**สถานะปัจจุบัน**ของเครื่อง ไม่ใช่เจตนาของใบงาน เช่นเครื่องที่เสียอยู่แล้วถึงรอบล้างพอดี จะขึ้นว่า "งานซ่อม" ถ้าอยากให้แม่นกว่านี้ต้องเพิ่มคอลัมน์ `type` ใน `work_orders` (เขียนคำขอไว้ได้)

---

### 🔴 กลุ่ม C — งานฝั่ง UI (Esther03u)

DoubleKill จะไม่แตะไฟล์เหล่านี้ ถ้าต้องการให้ backend เพิ่ม field/endpoint อะไรรองรับ เขียนคำขอไว้ในไฟล์นี้ได้เลย

- [x] **P10.** แยก client component ก้อนยักษ์ — `admin-dashboard-view.tsx` **1,299 บรรทัด** / `tech-mobile-view.tsx` 992 บรรทัด ทั้งคู่เป็น `"use client"` และรับข้อมูล**ทั้งหมด**เป็น props → ข้อมูลถูก serialize ลง RSC payload ส่งข้ามเน็ตแล้ว hydrate ทั้งก้อน ส่วนที่ไม่ต้อง interactive ควรแยกเป็น Server Component — [เสร็จแล้ว (15 ส.ค. 2026): แยกทั้งสองไฟล์เป็นชิ้นย่อยตามแท็บ — `admin-dashboard-view.tsx` (1,391 → ~380 บรรทัด) แยกเป็น `overview-panel`/`work-order-board`/`user-approvals-panel`/`team-panel`/`create-work-order-modal`/`assign-work-order-modal`/`work-order-detail-dialog` + `types.ts`; `tech-mobile-view.tsx` (1,006 → ~330 บรรทัด) แยกเป็น `assets-panel`/`job-pool-panel`/`my-jobs-panel`/`completed-jobs-panel`/`qr-scan-modal`/`log-action-modal` + `types.ts` ยังคง render แบบ conditional ต่อแท็บเหมือนเดิม (ยังไม่ได้แปลงเป็น Server Component จริงเพราะต้องปรับ data flow จาก `page.tsx` เพิ่ม — ถ้าอยากได้ผลเต็มที่กว่านี้ค่อยคุยกันเป็นงานถัดไป) ระหว่างทางลบ dead code ที่เจอ (`filteredBuildings`/`expandedBuilding` ที่คำนวณไว้แต่ไม่เคยใช้) และ `npm run lint` ปัญหารวมลดจาก 78 → 46 ไม่มี error ใหม่]
- [x] **P11. เสร็จแล้ว** (ยืนยันจากโค้ด 18 ส.ค. 2026) ~~ใส่ `next/dynamic` — ตอนนี้ไม่มีเลยสักจุด~~ — ตอนนี้ใช้แล้วใน `admin-dashboard-view.tsx`, `overview-panel.tsx`, `tech-mobile-view.tsx`
- [x] **P12. เสร็จแล้วทั้ง 2 ฝั่ง** (ยืนยันจากโค้ด 18 ส.ค. 2026) ~~ปฏิทินเกิด waterfall + ดึง schedule ทั้ง 73 รายการทุกครั้ง~~
  - ✅ **Backend** `/api/admin/maintenance-schedules` กรองตาม `start`/`end` ได้จริง — `?start=2026-09-01&end=2026-09-30` คืนเฉพาะที่ครบกำหนดในช่วงนั้น (ทดสอบแล้ว: 15 จาก 73 รายการ) / **ไม่ส่ง param = คืนทั้งหมดเหมือนเดิม** ของเดิมไม่พัง / วันที่ผิดรูปแบบถูกเมินเฉยๆ ไม่ error
  - ✅ **UI** `maintenance-calendar.tsx` (~บรรทัด 103) ส่ง `start`/`end` ตามกริดที่แสดงอยู่จริงแล้ว — ครอบวันหัว/ท้ายเดือนข้างเคียงที่กริดโชว์ด้วย งานของวันขอบเดือนจึงไม่หาย
- [x] **P13. เสร็จแล้ว** (ยืนยันจากโค้ด 18 ส.ค. 2026) ~~`<img>` → `next/image` ทั้งโปรเจกต์ไม่มี `next/image` เลยสักจุด~~ — รูปหลักฐานงานซ่อมย้ายไปอยู่ `work-order-detail-dialog.tsx` ตอนแยกไฟล์ตาม P10 และใช้ `next/image` แล้ว `<img>` ดิบที่เหลือมีแค่ใน `components/examples/c-file-upload-4.tsx` ซึ่งเป็นไฟล์ตัวอย่างจาก ReUI registry ไม่เกี่ยวกับรูปหลักฐาน
- [x] **P14. `[Backend ✅ เสร็จแล้ว 18 ส.ค. 2026 — `getWorkOrdersPage(page)` พร้อมเรียกแล้ว]`** Pagination จริงบนกระดานใบงาน

  **ทำตามร่างที่ Esther03u เขียนไว้ ปรับ 3 จุด:**
  1. รวม `findMany` + `count` เป็น `Promise.all` (เดิมยิงทีละอัน)
  2. **แยก select/map เป็นตัวกลาง** (`workOrderBoardSelect` / `toWorkOrderBoardRow`) ให้ `getOrgAdminData()` กับ `getWorkOrdersPage()` ใช้ร่วมกัน — ตาม comment ที่เตือนไว้เองว่าถ้าไม่แยก 2 ที่จะหลุดจากกัน ตอนนี้เพิ่ม field ที่เดียวได้ทั้งคู่
  3. **🐛 แก้บั๊ก pagination ที่ร่างเดิมมี** — ดูด้านล่าง

  **🔴 บั๊กที่เจอตอนทดสอบ (สำคัญ):** `orderBy: { createdAt: "desc" }` อย่างเดียว**ไม่พอ** เพราะ **ใบงาน 17 จาก 52 ใบมี `created_at` เป็น NULL** แถวที่เสมอกันไม่มีลำดับที่แน่นอนใน SQL เครื่องจะคืนลำดับต่างกันได้ในแต่ละครั้ง พอใช้กับ `skip`/`take` จะทำให้**แถวเดียวกันโผล่ 2 หน้า หรือหายไปเลย**

  วัดจริงแล้ว: ไล่ดูทุกหน้าด้วย orderBy เดิมได้ **51 ใบจาก 52** (หายไป 1 ใบถาวร) แก้โดยเพิ่ม `{ id: "desc" }` เป็นตัวตัดสินลำดับ (id เป็น primary key จึงไม่มีทางเสมอกัน) ทดสอบซ้ำได้ครบ 52 ใบ

  **ใช้ยังไง:** `getWorkOrdersPage(page)` คืน `{ workOrders, page, pageSize, total, hasMore }` — `workOrders[]` shape เดียวกับใน `getOrgAdminData()` เป๊ะ (ใช้ mapper ตัวเดียวกัน) เลขหน้าไม่ถูกต้อง (0, ติดลบ, NaN, ทศนิยม) ถูกปรับเป็นหน้า 1 ให้เอง หน้าที่เกินคืน list ว่างไม่ throw ผิดพลาดคืน `{ error }` เพิ่มมา

  **ไม่ filter ฝั่ง server** ตามที่ตกลง — ค้นหา/กรองยังทำในหน้าที่โหลดมาแล้วฝั่ง client เหมือนเดิม
  - ✅ **Backend เสร็จแล้ว** `getOrgAdminData()` คืน `workOrderPage: { total, pageSize, loaded, hasMore }` ใช้ทำปุ่มหน้าถัดไปได้เลย
  - ✅ **แถมแก้บั๊กที่เจอระหว่างทาง:** ตัวเลข "รอดำเนินการ" เดิมนับ pending จากลิสต์ที่ถูก `take: 50` ตัดไว้แล้ว เลยแสดง **47 ทั้งที่จริงมี 48** — เปลี่ยนไปนับด้วย SQL `count()` แล้ว
  - ✅ **UI เสร็จแล้ว (23 ส.ค. 2026, Esther03u):** `work-order-board.tsx` ต่อกับ `getWorkOrdersPage(page)` จริงแล้ว — cache หน้าที่เคยโหลดไว้ฝั่ง client ในระหว่าง session, reset กลับหน้า 1 ทุกครั้งที่ `workOrders` prop เปลี่ยน (หลัง assign/complete/create ทำให้ `getOrgAdminData()` revalidate ใหม่) กันโชว์ข้อมูลเก่าค้าง — เพิ่ม prop `workOrderPage` ผ่าน `page.tsx` → `admin-dashboard-view.tsx` → `work-order-board.tsx` ยืนยันด้วย `tsc --noEmit` + `npm run build` ผ่านสะอาด (DB เครื่องนี้มีแค่ 10 ใบงานเลยไม่มีหน้า 2 ให้ทดสอบคลิกจริงในเครื่องนี้ แต่ shape ตรงกับ `getWorkOrdersPage()` เป๊ะ)

---

  > 📜 **ตั้งแต่บรรทัดนี้ถึงท้ายหัวข้อ P14 เป็นบันทึกระหว่างทาง — ทำเสร็จหมดแล้วทุกข้อ เก็บไว้อ้างอิงเท่านั้น**
  > ถ้าจะทำแค่ปุ่มเปลี่ยนหน้า ไม่ต้องอ่านส่วนนี้ — `getWorkOrdersPage(page)` มีอยู่จริงใน `src/app/admin/actions.ts` แล้ว เรียกได้เลย
  > *(คำขอและร่างโค้ดด้านล่างเขียนตอนที่ backend ยังไม่เสร็จ — DoubleKill ทำตามร่างนี้แล้วเมื่อ 18 ส.ค. 2026 พร้อมแก้บั๊ก tiebreaker ที่ร่างเดิมมี)*

  **⚠️ อัปเดต 14 ส.ค. 2026 หลังลองต่อจริง:** `workOrderPage` บอกได้แค่ว่ามี `hasMore` แต่ **ไม่มีทางดึงรายการที่เกินหน้าแรก 50 รายการมาได้เลย** — `getOrgAdminData()` ไม่รับ page/cursor param ใดๆ และ query ใช้ `take: 50` ตายตัว (`src/app/admin/actions.ts:127`) ตอนนี้ปุ่มเปลี่ยนหน้าที่ทำได้จริงคือแค่พลิกดูภายใน 50 รายการที่โหลดมาแล้วเท่านั้น (ใช้ได้พอดีตราบใดที่ `total ≤ 50` เหมือนข้อมูล seed ปัจจุบัน แต่จะพังทันทีที่มีใบงานเกิน 50 ใบ)

  **📌 คำขอ:** เพิ่ม server action ใหม่ (แนะนำ `getWorkOrdersPage(page: number)`) ที่รับเลขหน้าแล้ว query ด้วย `skip`/`take` ตาม `WORK_ORDER_PAGE_SIZE` คืน shape เดียวกับ `workOrders[]` ใน `getOrgAdminData()` จะได้ map ผลลัพธ์แบบเดิมได้เลยไม่ต้องแก้ UI ที่ render แถวอยู่แล้ว — เผื่อไว้ด้วยว่าถ้ามี filter/search ฝั่ง client (เช่นช่องค้นหารหัสแอร์) อยากให้ backend filter ตรงนี้ด้วยไหม หรือ UI จะ filter เฉพาะหน้าที่โหลดมาแล้วพอ (คุยกันได้)

  **📌 อัปเดต 15 ส.ค. 2026 — ร่างโค้ดให้พร้อมก็อปวางเลย (Esther03u ทำ UI ฝั่ง `work-order-board.tsx` เสร็จรอเรียกอยู่ หลังแยกไฟล์ตาม P10 แล้ว):** ก็อปโครง select/map มาจาก `getOrgAdminData()` เป๊ะๆ (บรรทัด 90-127 กับ 275-297) เพื่อให้ shape ตรงกันแบบไม่ต้องเดา

  ```ts
  export async function getWorkOrdersPage(page: number) {
    await verifyOrgAdmin();

    const safePage = Math.max(1, Math.floor(page) || 1);

    const workOrdersRaw = await prisma.workOrder.findMany({
      select: {
        id: true,
        status: true,
        priority: true,
        issueDescription: true,
        resolutionNotes: true,
        images: true,
        assignedAt: true,
        claimedAt: true,
        completedAt: true,
        createdAt: true,
        airConditionerId: true,
        airConditioner: {
          select: {
            acCode: true,
            brand: true,
            btu: true,
            status: true,
            room: {
              select: {
                name: true,
                building: { select: { name: true, abbreviation: true } },
              },
            },
            acBrand: { select: { name: true } },
          },
        },
        claimedByUser: { select: { name: true } },
        reportedByUser: { select: { name: true } },
        assignedToUser: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * WORK_ORDER_PAGE_SIZE,
      take: WORK_ORDER_PAGE_SIZE,
    });

    // Same mapping as workOrders in getOrgAdminData() — keep the two in sync
    // if either one changes, or the board will render two slightly different shapes.
    const workOrders = workOrdersRaw.map((wo) => ({
      id: wo.id.toString(),
      acCode: wo.airConditioner.acCode,
      brand: wo.airConditioner.acBrand?.name || wo.airConditioner.brand || "ไม่ระบุ",
      btu: wo.airConditioner.btu,
      acStatus: wo.airConditioner.status,
      location: `${wo.airConditioner.room.building.name} (${wo.airConditioner.room.building.abbreviation}) - ห้อง ${wo.airConditioner.room.name}`,
      status: wo.status,
      priority: wo.priority,
      issueDescription: wo.issueDescription,
      resolutionNotes: wo.resolutionNotes,
      images: wo.images,
      reportedByName: wo.reportedByUser?.name || null,
      assignedToName: wo.assignedToUser?.name || null,
      assignedAt: wo.assignedAt ? wo.assignedAt.toISOString() : null,
      claimedByName: wo.claimedByUser?.name || null,
      claimedAt: wo.claimedAt ? wo.claimedAt.toISOString() : null,
      completedAt: wo.completedAt ? wo.completedAt.toISOString() : null,
      createdAt: wo.createdAt ? wo.createdAt.toISOString() : null,
      airConditionerId: wo.airConditionerId.toString(),
    }));

    const total = await prisma.workOrder.count();

    return {
      workOrders,
      page: safePage,
      pageSize: WORK_ORDER_PAGE_SIZE,
      total,
      hasMore: safePage * WORK_ORDER_PAGE_SIZE < total,
    };
  }
  ```

  ไม่ filter ฝั่ง server เพิ่ม — ตาม `workOrder-board.tsx` ตอนนี้ค้นหา/กรองทำในหน้าที่โหลดมาแล้วฝั่ง client อยู่แล้ว (เหมือนพฤติกรรมเดิม) ถ้าอยากได้ server-side search ทีหลังค่อยเพิ่ม `where` แยกเป็นงานใหม่ได้ ไม่ต้องรวมกับ pagination รอบนี้

---

## 🎨 UI/Styling Backlog — Deferred Backend Requests

### Work Order Board Table Styling (6 สิงหาคม 2026)

- [x] **S1. `[Backend ✅ เสร็จแล้ว 10 ส.ค. 2026 — ใช้ field `acStatus`]`** เพิ่มคอลัมน์ "ประเภทงาน" (repair vs. cleaning/maintenance) บนกระดานใบงาน ซึ่งตั้งไว้นอกขอบเขตของงาน Task 1 (row styling) เพื่อไม่โอเวอร์โหลด

  **คำขอ:** เพิ่ม `airConditioner.status` (จาก `air_conditioners.status` เช่น `"broken"`, `"needs_cleaning"`) เข้าไปใน `workOrders` mapping ของ `getOrgAdminData()` (`src/app/admin/actions.ts:186-205`) เพื่อให้ frontend สามารถอนุมาน "ประเภทงาน" ได้เหมือนวิธีเดียวกับที่ `src/lib/maintenance.ts` ทำสำหรับ technician view (status === `"broken"` → repair, status === `"needs_cleaning"` → cleaning)

  ⚠️ **นี่คือการเพิ่มแบบ additive เท่านั้น** ไม่มีการเปลี่ยน return shape อื่น — เพิ่มฟิลด์เดียวในลูป map แล้วเสร็จ

  **✅ ทำแล้ว — วิธีใช้:** ทุก item ใน `workOrders[]` มี field ใหม่ **`acStatus`** (`"normal" | "broken" | "needs_cleaning"`) ตั้งชื่อแยกจาก `status` เดิมซึ่งเป็นสถานะของ *ใบงาน* (`pending`/`claimed`/...) ไม่ใช่ของเครื่อง — ระวังอย่าสับสน 2 ตัวนี้
  ```ts
  const jobType = wo.acStatus === "broken" ? "repair" : "cleaning";
  ```
  ใช้เกณฑ์เดียวกับปฏิทินและ technician view เป๊ะๆ (`broken` → งานซ่อม, นอกนั้น → งานล้าง) เพื่อไม่ให้ป้ายขัดกันเองระหว่างหน้า
  ทดสอบจริงแล้ว: ค่าไปถึงฝั่ง client ครบ (เห็น `normal`/`needs_cleaning` ใน payload) ไม่กระทบ field เดิมใดๆ

### Org Admin Profile Page (9 สิงหาคม 2026)

หน้า "จัดการโปรไฟล์" (`src/components/admin/profile-panel.tsx`) สร้าง UI ครบแล้ว (ดูข้อมูล + ฟอร์มแก้ไขชื่อ + ปุ่มเปลี่ยนรหัสผ่านที่ทำงานได้จริงผ่าน `requestPasswordReset` เดิม) เหลือ 2 จุดที่ต้องรอ backend:

- [x] **S2. `[Backend ✅ เสร็จแล้ว 10 ส.ค. 2026]`** ปุ่ม "บันทึกการเปลี่ยนแปลง" ตอนนี้แค่โชว์ข้อความเตือนว่ายังบันทึกไม่ได้ ยังไม่มีการเซฟจริง

  **คำขอ:** เพิ่ม Server Action ใหม่ (แนะนำ `updateProfileAction(name: string)`) ใน `src/app/admin/actions.ts` ที่รับ `name` แล้ว `prisma.user.update()` เฉพาะแถวของ user ที่ล็อกอินอยู่ (ยึด `session.user.id`) — คืนค่า success/error กลับมาให้ UI แสดงผล ไม่ต้องมี field อื่นเพิ่ม

  **✅ ทำแล้ว — รวมเบอร์โทรของ S3 เข้ามาด้วยตามที่เสนอ:**
  ```ts
  import { updateProfileAction } from "@/app/admin/actions";

  const result = await updateProfileAction(name, phone);
  // { success: true } | { error: "ข้อความภาษาไทยพร้อมแสดงผลได้เลย" }
  ```
  - **`phone` มี 3 ความหมายต่างกัน** — ไม่ส่งมาเลย (`undefined`) = ไม่แตะเบอร์เดิม, ส่ง `""` = ลบเบอร์หลักทิ้ง, ส่งค่า = **แทนที่**เบอร์หลักเดิม (เบอร์เก่าถูกลบทิ้ง ไม่เก็บไว้เป็นเบอร์รอง — เพราะฟอร์มมีช่องเบอร์ช่องเดียว ถ้าเก็บไว้ผู้ใช้จะมองไม่เห็นและลบเองไม่ได้ เปลี่ยนเบอร์หลายครั้งจะสะสมแถวขยะ) ส่วนเบอร์รองที่ถูกบันทึกไว้ทางอื่นจะไม่ถูกแตะ
  - validate ด้วย Zod แล้ว: ชื่อห้ามว่าง/ยาวเกิน 255, เบอร์ยอมรับรูปแบบไทยทั่วไป (ตัวเลข เว้นวรรค `-` `+` วงเล็บ ยาว 9–20) — ข้อความ error เป็นภาษาไทยพร้อมโชว์ตรงๆ
  - **ใช้ได้ทั้ง org_admin และ technician** (ไม่ได้ล็อกด้วย `verifyOrgAdmin`) เพราะเขียนเฉพาะแถวของตัวเองจาก `session.user.id` เท่านั้น รับ userId จาก client ไม่ได้เลย — หน้าโปรไฟล์ฝั่งช่างใน F5 เรียกตัวนี้ได้เลยไม่ต้องเขียนใหม่
  - `revalidatePath` ให้อัตโนมัติตาม role แล้ว (`/tech` สำหรับช่าง, `/admin` สำหรับแอดมิน)

- [x] **S3. `[Backend ✅ เสร็จแล้ว 10 ส.ค. 2026 — ใช้ object `profile`]`** การ์ด "ข้อมูลส่วนตัว" ยังไม่มีช่องเบอร์โทรศัพท์เลย เพราะตอนนี้ `getOrgAdminData()` ไม่ส่ง `UserPhone` ของ user ที่ล็อกอินอยู่มาด้วย

  **คำขอ:** เพิ่ม field เบอร์โทรหลัก (จาก `user_phones` ที่ `is_primary = true`) เข้าไปใน `user` object ที่ `getOrgAdminData()` คืนกลับให้ UI (หรือ endpoint ใหม่เล็กๆ ก็ได้) — ถ้าจะให้แก้ไขเบอร์ได้ด้วยรวมเข้ากับ `updateProfileAction` ใน S2 ไปเลย (`updateProfileAction(name: string, phone?: string)`) จะได้ไม่ต้องทำ 2 endpoint แยกกัน

  **✅ ทำแล้ว —** `getOrgAdminData()` คืน object ใหม่ชื่อ **`profile`**:
  ```ts
  profile: { name: string; email: string; role: UserRole; phone: string | null }
  ```

  🔴 **สำคัญ — ProfilePanel ควรเปลี่ยนมาอ่านจาก `profile` แทน `user` prop เดิม:** `user` ที่ `page.tsx` ส่งให้ตอนนี้มาจาก **session (JWT)** ซึ่งถูกสร้างตอน login เท่านั้น พอผู้ใช้แก้ชื่อผ่าน `updateProfileAction` แล้ว ชื่อใน JWT จะยังเป็นค่าเก่าจนกว่าจะ login ใหม่ → กดบันทึกแล้วรีเฟรช จะเห็นชื่อเด้งกลับเป็นของเดิม ดูเหมือนบันทึกไม่ติด ทั้งที่ DB อัปเดตแล้ว
  ส่วน `profile` อ่านสดจากตาราง `users` ทุกครั้ง จึงถูกต้องเสมอ — **ใช้ `profile` กับการ์ดโปรไฟล์ ส่วน `user` เดิมยังใช้กับ nav/header ได้ตามเดิม ไม่ต้องแก้**

  **สิ่งที่ต้องทำฝั่ง UI เพื่อให้ครบวงจร** (backend พร้อมหมดแล้ว DoubleKill ไม่แตะไฟล์ UI ตามกฎ):
  1. `src/app/admin/page.tsx` — destructure `profile` เพิ่มจาก `getOrgAdminData()` แล้วส่งเป็น prop ลงไป
  2. `admin-dashboard-view.tsx` — เพิ่ม `profile` ใน props interface แล้วส่งต่อให้ `<ProfilePanel />`
  3. `profile-panel.tsx` — อ่าน `profile` แทน `user`, เพิ่มช่องเบอร์โทร, และเปลี่ยนปุ่ม "บันทึกการเปลี่ยนแปลง" ให้เรียก `updateProfileAction(name, phone)` จริง (ลบ `showBackendPendingNotice` ทิ้งได้)

### Org Admin System Settings Page (16 สิงหาคม 2026)

หน้า "ตั้งค่าระบบ" (`src/components/admin/settings-panel.tsx`) มี 4 การ์ดครบตามสเปก `docs/superpowers/specs/2026-08-16-org-admin-system-settings-page-design.md` **ทั้ง 4 การ์ดทำงานได้จริงหมดแล้ว (23 ส.ค. 2026)** — ประวัติการต่อ backend ของแต่ละการ์ดเก็บไว้ด้านล่างเพื่ออ้างอิง:

- [x] **S4.** การ์ด "รอบซ่อมบำรุงเริ่มต้น" — **UI เสร็จแล้ว ✅ (23 ส.ค. 2026, Esther03u)** ต่อปุ่ม "บันทึก" เข้ากับ `updateDefaultFrequencyAction` จริงแล้ว — **หมายเหตุสำคัญ:** ฟอร์มเดิม (ที่ยังเป็น placeholder) hardcode ค่าเริ่มต้น `"6"`/`"months"` ไว้ในโค้ด ซึ่งจะไม่ตรงกับค่าจริงถ้าเคยมีการตั้งค่าไว้ก่อนแล้ว — แก้โดยให้ `src/app/admin/page.tsx` เรียก `getDefaultMaintenanceFrequency()` จาก `src/lib/organisation.ts` ตรงๆ (เป็นฟังก์ชันอ่านอย่างเดียว ไม่ใช่ Server Action ในไฟล์ actions.ts จึงเรียกจาก Server Component ได้โดยไม่ผิดกฎ) แล้วส่งเป็น prop `defaultFrequency` ผ่าน `admin-dashboard-view.tsx` ลงไปพรีฟิลฟอร์มด้วยค่าจริงเสมอ

  **คำขอ:** สร้างตาราง `SystemSettings` ใหม่ (แถวเดียว/singleton, `id` ตายตัว = 1): `defaultFrequencyValue Int @default(6)`, `defaultFrequencyUnit String @default("months")`, `organisationName String?`, `organisationAddress String?`, `organisationPhone String?`, `updatedAt DateTime @updatedAt` (รวมกับ S5 ในตารางเดียวกัน) แล้วเพิ่ม Server Action `updateDefaultFrequencyAction(value: number, unit: string)` ใน `src/app/admin/actions.ts` — validate ด้วย Zod (`value > 0`, `unit` เป็นหนึ่งใน `"days" | "months" | "years"`) แล้ว upsert แถวเดียวนั้น พร้อม `logAudit`

  **ตัดสินใจแล้ว:** เปลี่ยนค่า default นี้มีผลกับ**เครื่องปรับอากาศที่เพิ่มใหม่เท่านั้น** ไม่กระทบเครื่องที่มีรอบตั้งไว้แล้ว — **แก้คำอธิบายเดิมตรงนี้ที่ชี้ผิดจุด:** `registerAc` ใน `src/app/admin/actions.ts` (บรรทัด ~938, `prisma.airConditioner.create`) สร้างแค่แถว `AirConditioner` เฉยๆ **ไม่มี** โค้ดจุดไหนสร้าง `MaintenanceSchedule` ตอนลงทะเบียนแอร์ใหม่เลยในตอนนี้ — จุดเดียวในทั้งระบบที่เรียก `prisma.maintenanceSchedule.create` อยู่ในฟอร์ม "ตั้งค่ารอบซ่อมบำรุง" ต่อเครื่อง (`src/app/admin/actions.ts` บรรทัด ~1278) ซึ่งรับ `frequencyValue`/`frequencyUnit` ตรงจากฟอร์มที่ผู้ใช้กรอกเสมอ ไม่เคยตกไปใช้ค่า hardcode ใน `prisma/schema.prisma:261-262` เลย (ค่า default ในนั้นไม่เคยถูกใช้จริงโดยโค้ดปัจจุบัน)

  ค่า "6 เดือน" hardcode ที่ผู้ใช้เห็นจริงๆ ตอนนี้อยู่ที่ **ฟอร์มแก้ไขรอบซ่อมบำรุง** ใน `src/components/admin/asset-manager.tsx` — เป็นค่า fallback ตอนเครื่องยังไม่เคยมีการตั้งรอบมาก่อน: `defaultValue={showPmSettings.maintenanceSchedule?.frequencyValue || 6}` (บรรทัด 461) และ `defaultValue={showPmSettings.maintenanceSchedule?.frequencyUnit || "months"}` (บรรทัด 467)

  **~~มีเรื่องต้องตัดสินใจก่อนเริ่มเขียน~~ — ตัดสินใจแล้ว เลือก (ก) และทำเสร็จแล้ว (17 ส.ค. 2026):** ตอนลงทะเบียนแอร์ระบบสร้าง `MaintenanceSchedule` ให้อัตโนมัติในทรานแซกชันเดียวกัน โดยอ่านรอบจาก `SystemSettings` — ดูกฎวันครบกำหนดครั้งแรกในหัวข้อ "S4–S7 Backend เสร็จแล้ว" ที่ตัวเลือก (ข) ตกไปเพราะไม่ได้แก้ต้นเหตุ (เครื่องใหม่ยังหลุดจาก auto-check ถาวรอยู่ดี)

- [x] **S5.** การ์ด "ข้อมูลองค์กร" — **UI เสร็จแล้ว ✅ (23 ส.ค. 2026, Esther03u)** ต่อปุ่ม "บันทึก" เข้ากับ `updateOrganisationInfoAction` จริงแล้ว — เหตุผลเดียวกับ S4: `ที่อยู่`/`เบอร์โทร` เดิม default เป็นค่าว่างเสมอในโค้ด ถ้าไม่ดึงค่าจริงมาพรีฟิล กดบันทึกโดยไม่แตะช่องเหล่านี้จะไปลบข้อมูลที่เคยตั้งไว้ทิ้ง (`updateOrganisationInfoAction` ตีความค่าว่าง = ล้างค่า) แก้ด้วยวิธีเดียวกับ S4: `page.tsx` เรียก `getOrganisationInfo()` ตรงๆ ส่งเป็น prop `organisationInfo` ลงมา

  ~~ชื่อหน่วยงานตอนนี้ยังเป็นค่าคงที่ `ORGANISATION_NAME`~~ — **ไม่จริงแล้ว** ค่าคงที่ถูกลบทิ้ง ตอนนี้ชื่อ/ที่อยู่/เบอร์โทรเก็บใน `SystemSettings` ครบและอ่านผ่าน `getOrganisationInfo()` ได้แล้ว

  **คำขอ:** เพิ่ม Server Action `updateOrganisationInfoAction(name: string, address?: string, phone?: string)` ใน `src/app/admin/actions.ts` — upsert แถว `SystemSettings` เดียวกับ S4 พร้อม `logAudit` แล้วเปลี่ยน `src/lib/organisation.ts` จาก export ค่าคงที่ `ORGANISATION_NAME` เป็นฟังก์ชัน async `getOrganisationName()` ที่อ่านจาก `SystemSettings.organisationName` (fallback เป็นสตริงเดิม `"มหาวิทยาลัยราชภัฏภูเก็ต"` ถ้ายังไม่เคยตั้งค่า) แล้วอัปเดต 3 จุดที่เรียกใช้ค่าคงที่เดิมอยู่ (`src/app/tech/actions.ts`, `src/app/admin/actions.ts`, `src/app/pending-approval/page.tsx`) ให้เรียก `await getOrganisationName()` แทน

- [x] **S6.** ปุ่ม "รีเซ็ตรหัสผ่าน" ในหน้าทีมพานเนล (`team-panel.tsx`) — **UI เสร็จแล้ว ✅ (23 ส.ค. 2026, Esther03u)** ต่อ `onConfirm` ของ `ConfirmActionDialog` เข้ากับ `adminResetUserPasswordAction` จริงแล้ว เรียกจากในไฟล์นี้เอง (ไม่ได้ยกไปไว้ที่ `admin-dashboard-view.tsx` เหมือนปุ่มอื่นเพื่อไม่ต้อง prop-thread เพิ่ม — แพทเทิร์นเดียวกับที่ `work-order-board.tsx`/`ac-history-modal.tsx` เรียก action ตรงจากไฟล์ตัวเอง) error จาก guard "รีเซ็ตตัวเองไม่ได้" ของ backend ขึ้น toast ตรงๆ

  **คำขอ:** เพิ่ม Server Action `adminResetUserPasswordAction(userId: string)` ใน `src/app/admin/actions.ts` — guard ด้วย `verifyOrgAdmin()` เดิม ตั้ง `password = NULL` ให้ user เป้าหมาย (ไม่ต้องสร้าง/ส่งรหัสผ่านใหม่ให้ admin เห็นเลย — schema ออกแบบไว้แล้วว่า `password = NULL` แปลว่า "ต้องตั้งรหัสใหม่ก่อนเข้าระบบ" และ `authorize()` จะบังคับ flow นี้ให้เอง) พร้อม `logAudit`

- [x] **S7.** การ์ด "ประวัติการใช้งานระบบ" — **UI เสร็จแล้ว ✅ (23 ส.ค. 2026, Esther03u)** เปลี่ยนจาก empty-state เป็นตารางจริงที่ดึงจาก `getAuditLogs({page, action})` — filter dropdown ใช้ `availableActions` ตามที่ backend ส่งมา, แต่ละแถวกดขยายดู `oldValues`/`newValues` เป็น JSON ได้, มี pagination จริง (`page.total`/`page.pageSize`) ระวังจุดหนึ่งที่แก้ไปด้วยระหว่างทาง: เปลี่ยน filter กับเปลี่ยนหน้าเป็น 2 `useEffect` แยกกันที่ต่าง depend บน `actionFilter` ทำให้เกิด race (fetch หน้าเก่าค้างมาทับ fetch หน้าใหม่ที่ถูกต้อง) แก้ด้วย cancelled flag แบบเดียวกับที่ `ac-history-modal.tsx` ใช้อยู่แล้ว

  **คำขอ:** เพิ่มฟังก์ชันอ่านข้อมูล เช่น `getAuditLogs({ page, actionFilter }?)` ใน `src/app/admin/actions.ts` (หรือไฟล์ใหม่ที่เหมาะสม) ดึง `system_audit_logs` เรียงจากล่าสุด ~200 รายการ join ชื่อผู้ทำ (`user.name`) มาด้วย — `src/lib/audit.ts` เขียนเข้าตารางนี้อยู่แล้วจากหลาย action (`CREATE_WORKORDER`, `ASSIGN_WORKORDER`, `CANCEL_WORKORDER`, `UPDATE_AIRCONDITIONER`, `UPDATE_MAINTENANCE_LOG`, `CLAIM_WORKORDER`, `COMPLETE_WORKORDER`) แต่ยังไม่มีใครอ่านกลับเลย

  *(เสริม ไม่เร่งด่วน)* `src/app/admin/master-data/actions.ts` เรียก `revalidatePath("/admin/master-data")` ใน `createAcBrandAction`/`createAcModelAction` อยู่ 2 จุด — route นั้นถูกลบไปแล้ว (ย้าย UI มาไว้ในแท็บ "ตั้งค่าระบบ" ที่ `/admin` แทน) ฝั่ง UI ชดเชยด้วย `router.refresh()` ใน `master-data-client.tsx` ไปแล้วจึงไม่กระทบการใช้งานปัจจุบัน แต่ถ้าสะดวกตอนแตะไฟล์นี้ครั้งหน้า เปลี่ยนเป็น `revalidatePath("/admin")` จะตรงกับ route จริงมากกว่า

**✅ ทั้ง 3 ข้อทำครบแล้ว (23 ส.ค. 2026)** — ดูรายละเอียดที่ S4/S5/S6/S7 ด้านบน

---

## 📬 คำตอบจาก Esther03u — 6 สิงหาคม 2026

ตอบคำถามที่ DoubleKill ฝากไว้ใน Performance Backlog ด้านบน:

- **P7 (ลบหน้า `/dashboard` demo):** ✅ **ลบทิ้งทั้งชุดได้เลย** ไม่ใช้ `data-table.tsx` เป็นต้นแบบสำหรับ backlog #10 หรือ P13 แล้ว — จะสร้างใหม่ให้เข้ากับ pattern ของหน้าจริงแทน
- **P12 (Calendar filter start/end):** ✅ **รบกวนทำ backend filter ให้ใช้งานจริง** ตาม query param `start`/`end` ที่มีอยู่แล้วใน `/api/admin/maintenance-schedules`
- **P14 (Pagination กระดานใบงาน):** ✅ **ต้องการ** รบกวนเพิ่ม cursor/total count ฝั่ง backend เพื่อรองรับ pagination จริง (ตอนนี้ `take: 50` ตัดข้อมูลเงียบๆ)

> **ทำครบทั้ง 3 ข้อแล้ว** (9 ส.ค. 2026) — ดูรายละเอียดที่ P7 / P12 / P14 ด้านบน

---

## 🔧 บั๊กที่เจอเพิ่มระหว่างทำ Performance Backlog (แก้แล้วทั้งคู่)

### P15 — `/register` ถูก prerender ตอน build

หน้าสมัครสมาชิกอ่านรายชื่อมหาวิทยาลัยจาก DB แต่เป็น static prerender (`○ /register`) ผลคือ **มหาวิทยาลัยที่เพิ่มใหม่จะไม่ขึ้นใน dropdown จนกว่าจะ rebuild** และถ้า DB ต่อไม่ได้ตอน build หน้าจะถูก ship มาพร้อม dropdown ว่างถาวร (เกิดขึ้นจริงระหว่าง session นี้ตอน MySQL ล่ม)

แก้ด้วย `export const dynamic = "force-dynamic"` — route เปลี่ยนจาก `○` เป็น `ƒ` แล้ว

### P16 — วันที่ระดับวันคลาดไป 1 วันช่วงเที่ยงคืนถึง 7 โมงเช้า

`MaintenanceSchedule.lastPerformedAt` และ `.nextDueDate` เป็น **`@db.Date`** (วันปฏิทิน ไม่มีเวลา) แต่ถูกคำนวณจาก `new Date()` ซึ่งเป็น UTC instant ไทยเป็น UTC+7 ดังนั้น **ช่วง 00:00–06:59 น. วันที่แบบ UTC ยังเป็นเมื่อวาน**:
- ช่างปิดงานตอนตี 2 → บันทึกเป็นเมื่อวาน + นัดครั้งหน้าเร็วไป 1 วัน
- เครื่องที่ครบกำหนดวันนี้ ไม่ถูก auto-check เจอจนถึง 7 โมงเช้า

แก้โดยเพิ่ม `businessDateToday()` + `addMaintenanceInterval()` ใน `src/lib/maintenance.ts`

**⚠️ สิ่งที่ต้องรู้ถ้าจะแตะเรื่องวันที่ในอนาคต:**
1. **แยกให้ออกระหว่าง "เวลา" กับ "วัน"** — `performedAt` / `claimedAt` เป็น timestamp เต็ม เก็บเป็น UTC instant **ถูกอยู่แล้ว ห้ามแก้** (ตรวจแล้ว UI แสดงเวลาไทยถูกต้องมาตลอด) ส่วนที่เป็น `@db.Date` เท่านั้นที่ต้องใช้ `businessDateToday()`
2. **อย่าใช้ `date-fns` กับค่าที่ปักไว้ที่ UTC midnight** — `date-fns` อ่านค่าแบบ local time ถ้า deploy บนเซิร์ฟเวอร์ที่ offset ติดลบ (เช่นสหรัฐฯ) จะได้วันผิด `addMaintenanceInterval()` เลยใช้ UTC setter และหนีบวันสิ้นเดือนเอง (31 ม.ค. + 1 เดือน = 28 ก.พ. ไม่ใช่ 3 มี.ค.) — เทียบกับ `date-fns` แล้วตรงกันครบ 11 เคส
3. **MySQL `NOW()` เป็นเวลาไทย (+07) แต่ข้อมูลในตารางเป็น UTC** ห่างกัน 7 ชม. ถ้าจะเขียน raw SQL ที่เทียบ timestamp ระวังจุดนี้ (ตอนนี้ยังไม่มี raw SQL ไหนที่เทียบเวลา)

---

## 🆕 Feature Backlog — วางแผนละเอียดแล้ว พร้อมเริ่มทำ (10 สิงหาคม 2026)

> ผ่านการคุยรายละเอียด/ตัดสินใจกับเจ้าของโปรเจกต์ครบทุกข้อแล้ว (เดิมเป็นแค่ขอบเขตกว้างๆ ตอนบันทึกครั้งแรก) ยังไม่ได้ลงมือเขียนโค้ดข้อไหนเลย — เอกสารนี้คือแผนที่ตกลงกันแล้ว รอเริ่มทำตามลำดับ

### F1. ถอดระบบ Multi-tenant + Super Admin ออกทั้งหมด — ใช้เฉพาะภายใน มรภ.ภูเก็ต

**การตัดสินใจที่ล็อกแล้ว:**
- **`acCode` รูปแบบใหม่:** `[BLDG]-[ROOM]-[NN]` (ตัด segment มหาวิทยาลัยออก ให้สั้นและอ่านง่ายขึ้น) — ของเดิม 189 เครื่องต้อง rename รหัสระหว่างทำ data migration
- **ข้อมูลเดิม:** เก็บเฉพาะข้อมูลของ PKRU ลบข้อมูลมหาวิทยาลัยอื่นทั้งชุดออก (buildings/rooms/AC/users/work orders/logs) — เหตุผล: ข้อมูลทั้งหมดเป็น seed จำลอง (faker) อยู่แล้ว ไม่ใช่ข้อมูลจริงที่ต้องรักษาไว้ทุกฝั่ง แต่ subset ของ PKRU มีข้อมูลครบพร้อม demo/ทดสอบ flow ได้ทันที (73 เครื่อง + work order + log) ประหยัดเวลากว่าการ re-seed ใหม่ทั้งระบบ
- **บัญชี `super_admin` เดิม:** ลบทิ้งไปเลย

**Schema (`prisma/schema.prisma`):**
| เปลี่ยน | รายละเอียด |
|---|---|
| ลบ model `University` | ทั้ง model |
| `Building` | ลบ `universityId` + relation `university`; unique `[universityId, abbreviation]`/`[universityId, name]` → เหลือ unique เดี่ยวบน `abbreviation`/`name` (กลายเป็น global unique) |
| `User` | ลบ `universityId` + relation + index ที่เกี่ยวข้อง |
| `WorkOrder` | ลบ `universityId` (denormalized field) + relation + index |
| `SystemAuditLog` | ลบ `universityId` + relation + index |
| `enum UserRole` | ลบ `super_admin` เหลือ `org_admin \| technician` (คงชื่อ `org_admin` ไว้เพื่อลดจุดที่ต้องแก้ ถึงจะไม่มี "org" อื่นแล้วก็ตาม) |

**ไฟล์ backend ที่ต้องแก้ (ยืนยันจากโค้ดจริงแล้ว):**
`src/app/admin/actions.ts`, `src/app/tech/actions.ts` (เกือบทุกฟังก์ชันใช้ `universityId` scope query — ตัด filter ออกทั้งหมด), `src/app/api/admin/maintenance-schedules/route.ts`, `src/app/api/tech/units/route.ts`, `src/lib/maintenance.ts` (`syncOverdueMaintenanceWorkOrders` ตัด parameter tenant ออก — throttle เปลี่ยนจาก per-tenant เป็น global ตัวเดียว), `src/lib/audit.ts` (ตัด `universityId` ออกจาก `logAudit`/`logAuditMany` params), `src/lib/auth.ts` + `src/lib/auth.config.ts` (ตัด `universityId` ออกจาก JWT/session callback, ลบ role check `super_admin` ใน `authorized()`, ลบ matcher `/super-admin/:path*` และ `/api/super-admin/:path*`), `src/types/next-auth.d.ts` (ตัด `universityId` ออกจาก session/JWT type), `src/app/register/actions.ts` + `register-form.tsx` (ตัด dropdown เลือกมหาวิทยาลัย, `isInstitutionalDomain` ปรับให้เช็คเฉพาะโดเมน มรภ.ภูเก็ต), `src/app/admin/actions.ts` line ~685 (`acCode` generation ตัด `room.building.university.abbreviation` ออก)

**ลบทั้งไฟล์:** `src/app/super-admin/**` (รวม `master-data/**`), `src/app/api/super-admin/**`

**UI ที่ต้องแก้ตาม:** `login-form.tsx` (ปุ่ม quick-login super admin), `nav-header.tsx`/`dashboard-layout.tsx` (เงื่อนไข role `super_admin` + การแสดง `universityName`), `page.tsx` (root redirect ไป `/super-admin`), `qr/[id]/page.tsx` (include `building.university` ที่ไม่มีแล้ว)

**⚠️ Dependency สำคัญกับ F7:** `/super-admin/master-data` (จัดการยี่ห้อ/รุ่นแอร์ — `AcBrand`/`AcModel`) ถูกลบไปด้วยในข้อนี้ ต้องย้ายฟังก์ชันนี้ไปเป็นเมนูแยกของ org_admin ตาม F7 ไม่งั้นจะไม่มีทางเพิ่มยี่ห้อ/รุ่นแอร์ใหม่ได้อีกเลยหลัง F1 เสร็จ

**ลำดับแนะนำ:** cleanup ข้อมูลมหาวิทยาลัยอื่นในDB ก่อน → แก้ schema + สร้าง migration (รวม rename `acCode` เดิม 189 ตัว) → แก้ backend ให้ build ผ่าน (TypeScript จะฟ้องทุกจุดที่ยังอ้าง `universityId`/`university` ใช้เป็น checklist ได้เลย) → ลบโฟลเดอร์ super-admin → แก้ UI ที่เหลือ → ทดสอบ flow org_admin/technician ใหม่ทั้งหมด

---

### F2. ปฏิทิน — Drill-down ตามอาคารเมื่อวันเดียวมีงานเยอะ

**ตัดสินใจแล้ว:** ช่องปฏิทินของวันที่มีงานเยอะ ให้แสดงเป็น **รายชื่อตึกพร้อมจำนวนงาน** แทนการเรียงทีละงาน กดชื่อตึก → เปิดดูรายละเอียดงานทั้งหมดของตึกนั้นในวันนั้น (2 ระดับ: วัน → ตึก → รายการงาน)

- [x] **Backend เสร็จแล้ว (11 ส.ค. 2026)**
- [x] **Frontend เสร็จแล้ว** — ยืนยันจากโค้ด 18 ส.ค. 2026: `maintenance-calendar.tsx` group ด้วย `buildingId`/`buildingName` แล้ว (มี composite key `buildingId::roomName` แยกห้องชื่อซ้ำข้ามตึกด้วย)

**สิ่งที่ backend ทำแล้ว:** `/api/admin/maintenance-schedules` เพิ่ม 3 field ใหม่ต่อ 1 รายการ

| field ใหม่ | ตัวอย่างค่า | ใช้ทำอะไร |
|---|---|---|
| `buildingId` | `"3"` | ใช้เป็น key ตอน group / เป็น id ของกลุ่ม (เป็น string แล้ว ไม่ใช่ BigInt) |
| `buildingName` | `"Administration Building 293183"` | ชื่อตึกที่แสดงบนหัวกลุ่ม |
| `roomName` | `"4-568994"` | ชื่อห้อง แยกออกมาเพื่อไม่ต้องแสดงชื่อตึกซ้ำในแต่ละแถวย่อย |

**`location` เดิมยังอยู่เหมือนเดิมทุกประการ** (`"ชื่อตึก - ชื่อห้อง"`) โค้ดที่ใช้อยู่ตอนนี้ไม่ต้องแก้อะไรถ้ายังไม่พร้อมทำ

**📌 คำขอถึง Esther03u — ปรับ `src/components/shared/maintenance-calendar.tsx`**

group รายการของแต่ละวันด้วย `buildingId` ก่อน render เช่น:

```ts
const byBuilding = jobs.reduce<Record<string, { name: string; jobs: Job[] }>>((acc, job) => {
  (acc[job.buildingId] ??= { name: job.buildingName, jobs: [] }).jobs.push(job);
  return acc;
}, {});
```

แล้วในช่องวันแสดงเป็น `ชื่อตึก (จำนวนงาน)` กดแล้วเปิด modal/panel แสดงรายการงานของตึกนั้น โดยในโมดัลใช้ `roomName` + `acCode` + `jobType` ได้เลย ไม่ต้องโชว์ชื่อตึกซ้ำ

⚠️ **ข้อมูล seed ปัจจุบันมีมากสุดแค่ 2 งาน/วัน** ทำให้ทดสอบหน้าตาแบบ "วันเดียว 100 งาน" ไม่ได้จากข้อมูลจริง ถ้าจะลองให้เห็นผลชัด แนะนำ mock ข้อมูลฝั่ง client ชั่วคราวตอนพัฒนา หรือบอก DoubleKill ให้เขียน script ยัดข้อมูลทดสอบให้

**หมายเหตุ:** ระหว่างทางเปลี่ยน query จาก `include` เป็น `select` ด้วย (เดิมดึง `room` กับ `building` มาทั้งแถว) — ทดสอบแล้ว response เดิมครบทุก field ปฏิทินแสดงผลเหมือนเดิม และ filter `start`/`end` ของ P12 ยังทำงานถูกต้อง

---

### F3. เพิ่มหน้า/ส่วนแสดงประวัติการดูแลรักษาของแอร์แต่ละตัว

- [x] **Backend เสร็จแล้ว (11 ส.ค. 2026)**
- [x] **Frontend เสร็จแล้ว** — ยืนยันจากโค้ด 18 ส.ค. 2026: `src/components/admin/ac-history-modal.tsx` เรียก `getAirConditionerHistory()` และแสดง `repairDetail` ("ซ่อมอะไรไปบ้าง") ด้วยแล้ว
  - ⚠️ **ยังเหลือ:** ปุ่ม "แก้ไข" ในโมดัลนี้ที่ต่อกับ `updateMaintenanceLogAction` (ดูหัวข้อ "งานรอบแก้ไขข้อมูล ข้อ 2")

**Server Action ใหม่: `getAirConditionerHistory(airConditionerId: string)`** (`src/app/admin/actions.ts`)

คืนทั้งข้อมูลเครื่องและประวัติในครั้งเดียว จะได้ไม่ต้องยิง 2 รอบ:

```ts
{
  unit: {
    acCode: string;
    brand: string;          // ยี่ห้อจาก catalog ถ้าไม่มีใช้ค่าที่พิมพ์เอง ถ้าไม่มีอีกเป็น "ไม่ระบุ"
    model: string | null;
    btu: number | null;
    status: "normal" | "broken" | "needs_cleaning";
    location: string;       // "ชื่อตึก - ห้อง xxx"
    installedAt: string | null;   // ISO
  },
  history: Array<{
    id: string;
    action: "cleaning" | "repair" | "refill_refrigerant";
    performedAt: string;          // ISO — เป็น UTC instant ให้แปลงเป็นเวลาไทยตอนแสดง
    technicianName: string;
    notes: string | null;
    beforePhotoUrl: string | null;
    afterPhotoUrl: string | null;
  }>
}
```

กรณีผิดพลาดคืน `{ error: string }` (ข้อความไทย พร้อมแสดงเลย) — เช็คด้วย `"error" in result` ก่อนใช้

**เรียงจากล่าสุดไปเก่าสุดให้แล้ว** และ **มี URL รูปก่อน/หลัง** ซึ่งหน้า QR ไม่ได้แสดง แต่ฝั่ง admin น่าจะอยากเห็นเป็นหลักฐาน

**ป้ายภาษาไทยของประเภทงาน** (ก๊อปไปใช้ได้เลย — หน้า QR ใช้ชุดนี้):
```ts
const MAINTENANCE_ACTION_LABEL: Record<string, string> = {
  cleaning: "ล้างแอร์",
  repair: "ซ่อมแซม",
  refill_refrigerant: "เติมน้ำยาแอร์",
};
```

**📌 คำขอ:** เพิ่มปุ่ม "ดูประวัติ" ในการ์ดแอร์แต่ละใบใน `src/components/admin/asset-manager.tsx` (ตอนนี้มีปุ่ม "ล้างทุก X เดือน" กับ "QR Code" อยู่แล้ว) กดแล้วเปิดโมดัลแสดง timeline — หน้าตาลอกจากหน้า QR ได้เลย (`src/app/qr/[id]/page.tsx` ส่วน "ประวัติการซ่อมบำรุง")

**หมายเหตุการ refactor:** query ประวัติถูกย้ายไปเป็น `getMaintenanceHistory()` ใน `src/lib/maintenance.ts` แล้ว หน้า QR เปลี่ยนมาเรียกตัวนี้แทน query ของตัวเอง เพื่อไม่ให้ 2 หน้านิยาม "ประวัติของเครื่องนี้" ไม่ตรงกัน — ทดสอบแล้วหน้า QR แสดงผลเหมือนเดิมทุกอย่าง

---

### F4. เพิ่มวันที่ติดตั้งแอร์ (`installedAt`) + default

- [x] **Backend เสร็จแล้ว (11 ส.ค. 2026)** — `createAirConditionerAction` รับ `installedAt` จากฟอร์มแล้ว
- [x] **Frontend เสร็จแล้ว** — ยืนยันจากโค้ด 18 ส.ค. 2026: `asset-manager.tsx` (~บรรทัด 424) มีช่อง `name="installedAt"` แล้ว

**สิ่งที่ backend ทำแล้ว:**
- `acSchema` รับ field ใหม่ชื่อ **`installedAt`** เป็น **optional** รูปแบบ **`YYYY-MM-DD`** (ตรงกับที่ `<input type="date">` ส่งมาพอดี ไม่ต้องแปลงอะไร)
- **ไม่ส่งมาหรือส่งค่าว่าง = ใช้วันที่วันนี้** (ตามเวลาไทย) — ฟอร์มปัจจุบันที่ยังไม่มีช่องนี้จึงยังทำงานได้ปกติ ไม่พัง
- กรอกรูปแบบผิดหรือวันที่ไม่มีจริง (เช่น `2026-02-31`) จะคืน error ข้อความไทยว่า *"วันที่ติดตั้งไม่ถูกต้อง"*

**🐛 แก้บั๊กไปด้วยระหว่างทาง 2 ข้อ:**

1. **`installedAt` บันทึกผิดวันช่วงกลางคืน** — ของเดิมเขียน `installedAt: new Date()` ลงคอลัมน์ `@db.Date` ซึ่งเป็นบั๊กชุดเดียวกับ **P16** ลงทะเบียนแอร์ช่วง 00:00–06:59 น. จะบันทึกวันติดตั้งเป็น**เมื่อวาน** ตอนนี้ใช้ `businessDateToday()` แล้ว

2. **🔴 ลงทะเบียนแอร์ไม่ได้เลยทั้งสองแบบ (บั๊กเดิม เจอตอนกดทดสอบจริง)** — กดปุ่มแล้วขึ้น error ว่า `Invalid input` เฉยๆ ไม่บอกสาเหตุ

   **สาเหตุ:** `z.string().optional()` ของ Zod รับ `undefined` แต่ **ไม่รับ `null`** ส่วน `formData.get()` คืน **`null`** เมื่อไม่มี input ชื่อนั้นใน DOM — และฟอร์มนี้ render แค่ฝั่งเดียวตามแท็บที่เลือก:
   - เลือก **"รุ่นมาตรฐาน"** → ไม่มี input `customBrand`/`customModel` → ทั้งคู่เป็น `null` → parse ล้ม
   - เลือก **"กำหนดเอง"** → ไม่มี input `acModelId` → เป็น `null` → parse ล้ม

   **แก้แล้ว** โดยอ่านทุก field ที่เป็น optional ด้วย `?? undefined` (`btu` ไม่โดนเพราะประกาศเป็น `.nullable()` ซึ่งรับ `null` ได้อยู่แล้ว ส่วน `assignToUserId` กับ `notes` ตรวจแล้วปลอดภัยเพราะใช้ `|| undefined` อยู่ก่อนแล้ว)

   ⚠️ **บทเรียนเดียวกับบั๊ก brand dropdown:** build ผ่าน TypeScript ผ่าน แต่พังตอนใช้จริง — เจอเพราะไปกดปุ่มลงทะเบียนจริง **ถ้าเขียน schema ใหม่ที่มี `.optional()` แล้วอ่านค่าจาก `formData.get()` ต้องใส่ `?? undefined` เสมอ**

**ทดสอบด้วยการรันจริงแล้ว:** ลงทะเบียนแอร์ใหม่ผ่านหน้าเว็บสำเร็จ ได้รหัส `B467711-1-19179-03` (รูปแบบใหม่หลัง F1 นับลำดับต่อจากเครื่องเดิมถูกต้อง) และ `installed_at` เป็นวันที่ไทยวันนี้ — ลบข้อมูลทดสอบออกแล้ว

**📌 คำขอถึง Esther03u — เพิ่มช่องวันที่ในฟอร์มลงทะเบียนแอร์**

ไฟล์ `src/components/admin/asset-manager.tsx` ในโมดัล "ลงทะเบียนเครื่องปรับอากาศ" (~บรรทัด 450 ก่อนปุ่ม submit) เพิ่มช่องนี้:

```tsx
<div>
  <label className="mb-1.5 block font-bold text-foreground">
    วันที่ติดตั้ง (ไม่บังคับ)
  </label>
  <input
    name="installedAt"
    type="date"
    className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none"
  />
  <p className="mt-1 text-[11px] text-muted-foreground">ไม่กรอก = ใช้วันที่วันนี้</p>
</div>
```

**ต้องวางไว้นอกเงื่อนไข `acBrandType === "master" ? ... : ...`** เพื่อให้ขึ้นทั้งสองแบบ (ตอนนี้ช่อง BTU อยู่ในฝั่ง "กำหนดเอง" อย่างเดียว — ถ้าเอาช่องวันที่ไปวางในนั้นด้วย คนที่เลือกรุ่นมาตรฐานจะกรอกวันที่ไม่ได้)

ชื่อ field ต้องเป็น **`installedAt`** เป๊ะๆ เพราะ backend อ่านจาก `formData.get("installedAt")`

---

### F6. QR Code — ดูประวัติได้โดยไม่ต้อง Login แต่บันทึกงานต้อง Login

- [x] **เสร็จแล้ว (11 ส.ค. 2026)** — ทำทั้ง backend และ UI ในไฟล์เดียว `src/app/qr/[id]/page.tsx`

**ตัดสินใจแล้วว่าไม่ต้องซ่อนชื่อช่างที่เคยทำงาน แม้จะเปิดเป็น public**

**พฤติกรรมตอนนี้ แยกตามผู้เข้าชม:**

| ผู้เข้าชม | เห็นอะไร |
|---|---|
| **ไม่ได้ล็อกอิน** (สแกน QR มาเฉยๆ) | เห็นข้อมูลเครื่อง + รอบบำรุงรักษา + ประวัติการซ่อมบำรุงครบ พร้อมการ์ด **"เข้าสู่ระบบ"** ท้ายหน้า — ไม่มีลิงก์ "กลับสู่หน้าหลัก" เพราะคนที่สแกนป้ายมาไม่มีหน้า dashboard ให้กลับ |
| **ช่างซ่อมบำรุง** | เห็นทุกอย่าง + ปุ่ม **"บันทึกงานซ่อมบำรุง"** ลิงก์ไป `/tech` (ที่ฟอร์มบันทึกงานอยู่) + ลิงก์กลับหน้าหลัก |
| **ผู้ดูแลระบบ** | เห็นทุกอย่าง + ลิงก์กลับหน้าหลัก (ไม่มีปุ่มบันทึกงาน เพราะ admin ไม่ใช่คนลงบันทึก) |

**ความปลอดภัยไม่ได้ลดลง:**
- URL ใช้ `qrCode` ซึ่งเป็น **uuid สุ่ม** ไม่ใช่ `acCode` ที่เดาได้ — เปิดหน้านี้ได้เฉพาะคนที่มีป้าย QR อยู่ในมือ (หรือได้ลิงก์มา)
- **การบันทึกงานยังต้องล็อกอินเหมือนเดิม** — `logMaintenanceAction` มี `verifyTechnician()` ครอบอยู่ ไม่ได้ถูกแตะ ปุ่มบนหน้านี้เป็นแค่ทางลัด ไม่ใช่ตัวตัดสินสิทธิ์
- หน้านี้ไม่ได้อยู่ใน matcher ของ `src/proxy.ts` อยู่แล้ว (`/admin`, `/tech` เท่านั้น) จึงไม่ต้องแก้ proxy

**⚠️ หมายเหตุถึง Esther03u:** งานนี้แตะไฟล์ `src/app/qr/[id]/page.tsx` ซึ่งมีทั้ง logic และ UI ปนกัน DoubleKill ทำทั้งไฟล์เพราะถ้าตัด auth gate อย่างเดียวจะเหลือลิงก์ "กลับสู่หน้าหลัก" ที่พาคนไม่ได้ล็อกอินไปเด้ง login **หน้าตาปรับได้ตามใจ** ขอแค่คงเงื่อนไข `isSignedIn` / `isTechnician` ไว้

**ข้อเสนอปรับปรุงเพิ่ม (ยังไม่ได้ทำ):** ตอนนี้ปุ่ม "เข้าสู่ระบบ" ลิงก์ไป `/login` เฉยๆ พอล็อกอินเสร็จจะเด้งไป dashboard ไม่ได้กลับมาหน้า QR เดิม ถ้าอยากให้กลับมา ต้องแก้ `src/components/login-form.tsx` ที่ตอนนี้ `router.push("/")` ตายตัว ให้อ่าน `callbackUrl` จาก query param แทน — **เป็นไฟล์ฝั่ง UI ของ Esther03u**

---

### F5. หน้า "โปรไฟล์/preference ส่วนตัว" (ทุก role) + "ตั้งค่าระบบ" (เฉพาะ org_admin)

> **⚠️ อัปเดต 10 ส.ค. 2026 หลัง `git pull`:** Esther03u สร้าง `src/components/admin/profile-panel.tsx` ไปแล้ว (commit `c426bf0`/`2234cf8`) ครอบคลุมส่วน "โปรไฟล์ของ org_admin" ไปบางส่วน — แผนด้านล่างปรับให้ต่อยอดจากของที่มีอยู่แล้ว **ไม่ใช่สร้างใหม่ทับ** และคำขอ backend S2/S3 ในหัวข้อ "UI/Styling Backlog" ด้านบนคือส่วนหนึ่งของงานนี้ (ทำ S2/S3 = ปิดงานโปรไฟล์ฝั่ง org_admin ไปด้วยในตัว)

แบ่งเป็น 2 ชั้นตามที่ตกลงกัน:

**1) โปรไฟล์/preference ส่วนตัว — org_admin และ technician เข้าถึงเหมือนกัน**
- แก้ไขข้อมูลตัวเอง (ชื่อ, เบอร์โทรผ่าน `UserPhone`) — **ตรงกับคำขอ S2 + S3 ที่ Esther03u ฝากไว้แล้ว** ทำเป็น action เดียว `updateProfileAction(name: string, phone?: string)` ใน `src/app/admin/actions.ts` ตามที่ S3 เสนอ (ยึด `session.user.id` เท่านั้น ห้ามรับ userId จาก client)
- **รูปโปรไฟล์** — ต้องเพิ่ม field `avatarUrl` ใน `User` schema (ยังไม่มี) แล้วรวม upload เข้ากับ `updateProfileAction` เดียวกัน โดยใช้ `saveUpload()` เดิมจาก `tech/actions.ts` ร่วมกัน (มี resize/EXIF/sharp ครบแล้ว — ควรย้ายไป `src/lib/` เพื่อให้ import ข้ามโมดูลได้สะอาด)
- **เปลี่ยนรหัสผ่านตัวเอง — ตัดสินใจแล้ว: ใช้ reset-link flow เดิม** (`requestPasswordReset` → อีเมล → `/reset-password?token=`) ไม่ทำแบบกรอกรหัสเก่ายืนยันในหน้าเดียว — ProfilePanel ที่ Esther03u ทำไว้ใช้วิธีนี้อยู่แล้ว จึงไม่ต้องแก้ UI ส่วนนี้เลย และช่างก็ใช้ flow เดียวกันได้ทันทีเมื่อทำหน้าโปรไฟล์ฝั่ง technician
  - ✅ **Blocker นี้แก้แล้ว (10 ส.ค. 2026)** — ระบบส่งอีเมลจริงได้แล้ว เหลือแค่ใส่ค่า SMTP ใน `.env` ดูหัวข้อ "การตั้งค่าอีเมล (SMTP)" ด้านล่าง
  - ⚠️ **ข้อจำกัดที่รับทราบแล้ว:** comment ใน `src/lib/reset-token.ts` ระบุว่า token แบบ HMAC stateless นี้ออกแบบมาสำหรับ "ออกลิงก์ครั้งเดียวจำนวนมากตอน migration" ไม่ใช่ self-service ที่ใช้ซ้ำบ่อย — **token ใช้ซ้ำได้จนกว่าจะหมดอายุ 1 ชม. และ revoke ก่อนกำหนดไม่ได้** ถ้าภายหลังพบว่าเป็นปัญหาจริง ค่อยเปลี่ยนไปเก็บ token ในตาราง DB (มี single-use flag + revoke ได้) แยกเป็นงานต่างหาก
- **ธีมมืด/สว่าง** — เป็น preference ส่วนบุคคลตรงนี้ ไม่ใช่ค่ากลางที่มีผลกับทุกคน (ยืนยันแล้ว) — **UI เสร็จแล้ว ✅ (23 ส.ค. 2026, Esther03u)** เพิ่ม `<ThemeProvider attribute="class">` จาก `next-themes` ครอบทั้งแอปใน `src/app/layout.tsx` (CSS `.dark` class มีอยู่แล้วใน `globals.css` ไม่ต้องแก้อะไรฝั่ง style) แล้วเพิ่มการ์ด "ธีมการแสดงผล" (สว่าง/มืด/ตามระบบ) ใน `ProfilePanel` — ทดสอบจริงแล้ว: กดแล้ว `<html>` ได้ class `dark` จริง, พื้นหลังเปลี่ยนสีจริง, ค่าเก็บใน `localStorage` คงอยู่ข้ามการโหลดหน้า
- **หน้าโปรไฟล์ฝั่ง technician ยังไม่มี** — **UI เสร็จแล้ว ✅ บางส่วน (23 ส.ค. 2026)** — ย้าย `profile-panel.tsx` ไป `src/components/shared/profile-panel.tsx` แล้วตามที่แนะนำไว้ เพิ่มแท็บ "โปรไฟล์ของฉัน" ในหน้าช่าง (`tech-mobile-view.tsx`) เรียก component เดียวกับฝั่ง admin จริง — **แก้ชื่อ + รีเซ็ตรหัสผ่านได้แล้ว ทดสอบจริงผ่านเบราว์เซอร์สำเร็จ** (login เป็นช่าง กดบันทึกชื่อ ขึ้น "บันทึกแล้ว" จริง ตรวจ DB ยืนยันว่าไม่มีการเขียนไปที่ `user_phones` เลย) **ส่วนเบอร์โทรยังซ่อนอยู่** (prop ใหม่ `showPhone?: boolean`, ค่าเริ่มต้น `true` ฝั่ง admin ไม่กระทบ) รอ backend เพิ่ม `profile` ใน `getTechnicianData()` ตามคำขอด้านล่างก่อนถึงจะเปิดให้ช่างแก้เบอร์ได้อย่างปลอดภัย

  **🐛 บั๊กเจอระหว่างทาง (แก้ไปด้วย):** เมนู "โปรไฟล์ส่วนตัว"/"ตั้งค่าระบบ" ใน dropdown มุมล่างซ้ายของ sidebar (`dashboard-layout.tsx`) **ไม่มี `onClick` เลยตั้งแต่แรก** กดแล้วไม่ทำอะไร — ต่อเข้ากับ `setActiveTab` แล้ว โดยเช็คจาก `navItems` ของแต่ละ role เองว่ามีแท็บนั้นจริงไหมก่อนแสดงปุ่ม (ฝั่งช่างจะไม่เห็น "ตั้งค่าระบบ" เพราะ nav array ไม่มี id นี้)

  **📌 อัปเดต 23 ส.ค. 2026 (Esther03u) — บล็อกอยู่ที่ backend ข้อเดียว ที่เหลือทำได้เลย:** ตรวจโค้ดแล้ว `updateProfileAction(name, phone?)` ใช้ได้กับทั้งสอง role อยู่แล้วจริง (ตามที่ S3 บอกไว้) แต่ `getTechnicianData()` ใน `src/app/tech/actions.ts` **ไม่มี field `profile` เหมือน `getOrgAdminData()`** เลย — ทำให้ไม่รู้เบอร์โทรปัจจุบันของช่างตอนเปิดหน้า

  **เหตุผลที่ห้าม hack ข้าม:** `ProfilePanel.handleSave()` ส่ง `phone` ไปกับทุกครั้งที่กด "บันทึกการเปลี่ยนแปลง" เสมอ (ไม่เคยส่ง `undefined`) ถ้าเปิดฟอร์มด้วยค่าเริ่มต้น `phone: null` (เพราะไม่มีข้อมูลจริงให้เช็ค) แล้วช่างกดบันทึกโดยแก้แค่ชื่อ ระบบจะส่ง `phone=""` ไปด้วย ซึ่งตาม S2 คือ **"ลบเบอร์หลักทิ้ง"** — จะไปลบเบอร์ของช่างที่เคยตั้งไว้แล้วโดยไม่ได้ตั้งใจ จึงรอ backend ก่อนต่อยอดหน้านี้ให้ช่างใช้งานจริง

  **คำขอ:** เพิ่ม object `profile` ใน return ของ `getTechnicianData()` ชื่อ/shape เดียวกับของ `getOrgAdminData()` ทุกประการ: `profile: { name: string; email: string; role: UserRole; phone: string | null }` (อ่านจาก `session.user.id` แถวเดียวกับที่ `verifyTechnician()` ใช้อยู่แล้ว) จะได้ย้าย `profile-panel.tsx` ไป `src/components/shared/` แล้วเรียกจากทั้ง 2 ฝั่งได้ทันทีแบบไม่ต้องเดา/ไม่เสี่ยงข้อมูลหาย

- **รูปโปรไฟล์ (avatar)** — ยังไม่มีที่เก็บเลย **[Backend ❌ ยังไม่ทำ — คำขอใหม่ 23 ส.ค. 2026, Esther03u]**

  **คำขอ:**
  1. เพิ่ม `avatarUrl String?` ใน model `User` (`prisma/schema.prisma`) พร้อม migration
  2. `saveUpload(file: File | null): Promise<string | null>` ตอนนี้เป็นฟังก์ชันภายในของ `src/app/tech/actions.ts` (บรรทัด ~37, ไม่ได้ `export`) มี resize/EXIF/sharp ครบแล้วตามที่ P6 ทำไว้ — ย้ายออกไปเป็นฟังก์ชันกลางใน `src/lib/` (เช่น `src/lib/upload.ts`) แล้ว `export` เพื่อให้ `src/app/admin/actions.ts` เรียกได้ด้วย ไม่ต้อง copy โค้ดซ้ำ
  3. ขยาย `updateProfileAction` (`src/app/admin/actions.ts` บรรทัด ~575) จาก `updateProfileAction(name: string, phone?: string)` เป็นรับ `avatarFile?: File` เพิ่ม (หรือเปลี่ยนเป็นรับ `FormData` ทั้งก้อนถ้าสะดวกกว่า) เรียก `saveUpload()` แล้วอัปเดต `avatarUrl` ในทรานแซกชันเดียวกับ `name`/`phone` — ไม่ส่งไฟล์มา = ไม่แตะรูปเดิม (พฤติกรรมเดียวกับที่ `phone` ใช้อยู่ตอนนี้ ไม่ใช่ "เว้นว่าง = ลบ" แบบฟอร์มแก้ข้อมูลแอร์ เพราะฟอร์มนี้ไม่มีปุ่ม "ลบรูป" แยก)
  4. เพิ่ม `avatarUrl` เข้าไปใน `profile` object ที่คืนจากทั้ง `getOrgAdminData()` และ `getTechnicianData()` (ข้อ 3. ด้านบน) เพื่อให้ `ProfilePanel` เอาไปแสดงแทน initials ได้

  **ฝั่ง UI ที่ทำรอไว้แล้ว:** `ProfilePanel` (`src/components/shared/profile-panel.tsx`) ตอนนี้แสดง initials วงกลมแทนรูปเสมอ — พร้อมสลับไปใช้ `<Image src={profile.avatarUrl}>` (fallback เป็น initials เดิมถ้า `avatarUrl` เป็น `null`) ทันทีที่ field มาถึง ไม่ต้อง refactor โครงสร้างเพิ่ม

**2) ตั้งค่าระบบ — เฉพาะ org_admin — ✅ ทำครบแล้วทั้งหมดผ่านรอบ S4–S7 (ดูหัวข้อด้านบน)**

แผนเดิม 4 ข้อด้านล่างนี้ (เขียนไว้ตอนวางแผน F5 แรกๆ) กลายเป็นสเปกที่ S4–S7 เก็บงานไปหมดแล้ว เก็บไว้อ่านเพื่ออ้างอิงเหตุผล/ที่มาเท่านั้น ไม่ต้องทำอะไรเพิ่ม:
- ~~รอบซ่อมบำรุง Default~~ → S4
- ~~แก้ข้อมูล/รีเซ็ตรหัสผ่านให้ user คนอื่น~~ → S6
- ~~ข้อมูลองค์กร~~ → S5
- ~~หน้าดู audit log~~ → S7

**หมายเหตุ:** "จัดการยี่ห้อ/รุ่นแอร์" **ไม่ได้รวมอยู่ในตั้งค่าระบบข้างต้น** — แยกเป็นเมนูของตัวเองต่างหาก ดู F7 ด้านล่าง

---

### F7. เมนู "จัดการยี่ห้อ/รุ่นแอร์" (Master Data) — แยกเป็นเมนูของตัวเอง

ย้ายมาจาก `/super-admin/master-data` ที่ถูกลบทิ้งใน F1 — ตัดสินใจแล้วให้แยกเป็นเมนู/หน้าของตัวเองต่างหาก ไม่รวมกับ "ตั้งค่าระบบ" ใน F5 เพื่อให้เห็นชัดและจัดการง่าย เฉพาะ org_admin เข้าถึงได้

| | งาน |
|---|---|
| **Backend** | ฟังก์ชัน CRUD เดิมมีอยู่ครบแล้วใน `src/app/super-admin/master-data/actions.ts` (`getAcMasterData`, `createAcBrandAction`, `createAcModelAction`) — ย้ายไฟล์ไปเป็น `src/app/admin/master-data/actions.ts` แล้วเปลี่ยน guard จาก `verifySuperAdmin()` เป็น `verifyOrgAdmin()` เท่านั้น ไม่ต้องเขียนใหม่ |
| **Frontend** | ย้าย `master-data-client.tsx` + หน้า `page.tsx` จาก `src/app/super-admin/master-data/` มาเป็น `src/app/admin/master-data/` เพิ่มลิงก์เมนูใหม่ในแถบนำทางของ org_admin (`nav-header.tsx`/`dashboard-layout.tsx`) แยกจากเมนู "ตั้งค่า" |

---

---

## 📋 สถานะรวม ณ 27 สิงหาคม 2026

**Backlog รอบ 25 ส.ค. ครบทั้ง 8 ข้อแล้ว** ทั้ง backend (DoubleKill, 25 ส.ค.) และ UI (Esther03u, 27 ส.ค.) — ดูหัวข้อ "Backlog UI ครบทั้ง 6 จุดที่เหลือ" กลางไฟล์สำหรับรายละเอียดสิ่งที่แก้และผลตรวจสอบของแต่ละข้อ

**งานที่ปิดไปแล้วในรอบนี้ (25 ส.ค.):**

1. ✅ **`profile` ใน `getTechnicianData()`** — เสร็จ เหลือฝั่ง UI ต่อ 3 จุด
2. ✅ **`avatarUrl` + ขยาย `updateProfileAction`** — เสร็จครบ 4 ข้อ พร้อมย้าย `saveUpload()` ไป `src/lib/upload.ts`
3. ⚠️ **แถม: `bodySizeLimit`** — เจอว่า Server Action จำกัด body ไว้ที่ 1MB มาตลอด ซึ่งทำให้อัปโหลดรูปจากมือถือไม่ได้เลยทั้งรูปโปรไฟล์และรูปหลักฐานงาน — ตั้งเป็น 25mb และทดสอบยืนยันแล้ว
4. ✅ **แยก `admin/actions.ts`** 1,748 → 135 บรรทัด implementation ย้ายไป `src/lib/admin/` โดย UI ไม่ต้องแก้อะไรเลย

**เหลือรอปัจจัยภายนอกอย่างเดียว:** **SMTP** — โค้ดพร้อม รอเจ้าของโปรเจกต์ใส่ credential ใน `.env` (ไม่ใช่งานเขียนโค้ด)

**ฝั่ง UI (Esther03u) — ครบ 10/10 ข้อจากรอบตรวจ 18 ส.ค. แล้ว** ✅

| ลำดับ | งาน | สถานะ |
|---|---|---|
| ~~🔴 1~~ | ช่อง `repairDetail` ในฟอร์มบันทึกงาน | ✅ **เสร็จแล้ว** (23 ส.ค., คอมมิต `f789ad4`) |
| ~~🔴 2~~ | ปุ่มเปลี่ยนหน้ากระดานใบงาน (P14) | ✅ **เสร็จแล้ว** (23 ส.ค., คอมมิต `f789ad4`) |
| ~~🟠 3~~ | ปุ่มยกเลิกใบงาน (`cancelWorkOrderAction`) | ✅ **เสร็จแล้ว** (23 ส.ค., คอมมิต `e9e1f40`) |
| ~~🟠 4~~ | ฟอร์มแก้ข้อมูลแอร์ (`updateAirConditionerAction`) | ✅ **เสร็จแล้ว** (23 ส.ค., คอมมิต `e9e1f40`) |
| ~~🟠 5~~ | ปุ่มแก้ประวัติงาน (`updateMaintenanceLogAction`) | ✅ **เสร็จแล้ว** (23 ส.ค., คอมมิต `e9e1f40`) |
| ~~🟡 6~~ | S4 + S5 ปุ่มบันทึกในหน้าตั้งค่าระบบ | ✅ **เสร็จแล้ว** (23 ส.ค., คอมมิต `3890562`) |
| ~~🟡 7~~ | S6 ปุ่มรีเซ็ตรหัสผ่านใน `team-panel.tsx` | ✅ **เสร็จแล้ว** (23 ส.ค., คอมมิต `3890562`) |
| ~~🟡 8~~ | S7 ตาราง audit log | ✅ **เสร็จแล้ว** (23 ส.ค., คอมมิต `3890562`) |
| ~~🟢 9~~ | ลบ emoji 4 จุด (ผิดกฎ `AGENTS.md`) | ✅ **เสร็จแล้ว** (23 ส.ค.) |
| ~~🟢 10~~ | อ่าน `?ac=` จาก QR แล้วเปิดฟอร์มให้เลย | ✅ **เสร็จแล้ว** (23 ส.ค.) |

ข้อ 3-10 ยืนยันด้วย `npx tsc --noEmit` + `npm run build` ผ่านสะอาดทั้งคู่ทุกรอบ (เบราว์เซอร์ในเซสชันนี้ render ไม่ได้จริงตลอดทั้งเซสชัน ตั้งแต่ตอนแก้ข้อ 1-2 — ดูโค้ดแทน) ข้อ 6/7 เจอช่องโหว่ข้อมูลแบบเดียวกับที่เจอตอนทำ F5 (ฟอร์มไม่มีค่าเดิมมาพรีฟิล เสี่ยงบันทึกด้วยค่าว่างไปลบข้อมูลจริงทิ้ง) แก้ด้วยการให้ `page.tsx` เรียก `getOrganisationInfo()`/`getDefaultMaintenanceFrequency()` จาก `src/lib/organisation.ts` ตรงๆ (อ่านอย่างเดียว ไม่ใช่ Server Action จึงเรียกจาก Server Component ได้โดยไม่ผิดกฎห้ามแก้ backend) ดูรายละเอียดที่ S4/S5 ด้านบน

**F5 — อัปเดต 23 ส.ค. 2026:** เริ่มแล้ว ทำเสร็จ 2/4 ส่วน — ธีมมืด/สว่าง ✅, โปรไฟล์ช่าง (ชื่อ+รีเซ็ตรหัสผ่าน) ✅ **เหลือ (บล็อกที่ backend ทั้งคู่ คำขอเขียนไว้แล้ว รอ DoubleKill):** เบอร์โทรฝั่งช่าง (`profile` ใน `getTechnicianData()`) และรูปโปรไฟล์ (`avatarUrl` ใน `User` schema + ขยาย `updateProfileAction`)

---

*Handoff document last updated: 27 สิงหาคม 2026 (DoubleKill — ไล่ทดสอบงาน UI ของ Esther03u ครบ 6 ข้อ และวางแผน Backlog รอบใหม่ 4 ข้อ — ดูหัวข้อบนสุดของไฟล์)*
