/**
 * Cognita full walkthrough — teacher flow + student flow
 * Run: node playwright-test.mjs   (web :3000 and api :8000 must be running)
 */
import { chromium } from "playwright"

const BASE = "http://localhost:3000"
const TEACHER = { email: "teacher@cognita.test", password: "password123" }
const STUDENT = { email: "alice@cognita.test", password: "password123" }

let shotIndex = 0
async function shot(page, name) {
  const file = `walkthrough-${String(++shotIndex).padStart(2, "0")}-${name}.png`
  await page.screenshot({ path: file, fullPage: true })
  console.log(`  📸 ${file}`)
  return file
}

async function login(page, creds) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 })
  await page.fill('input[type="email"]', creds.email)
  await page.fill('input[type="password"]', creds.password)
  await page.click('button[type="submit"]')
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 })
  await page.waitForTimeout(1500)
}

async function signOut(page) {
  // Find logout button in sidebar (desktop)
  const logoutBtn = page.locator('[aria-label="Sign out"]').first()
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click()
  } else {
    // Fallback: navigate to login
    await page.goto(`${BASE}/api/auth/signout`, { waitUntil: "domcontentloaded" })
    const btn = page.locator('button[type="submit"]')
    if (await btn.isVisible()) await btn.click()
  }
  await page.waitForURL((u) => u.pathname.startsWith("/login"), { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(1000)
}

const errors = []

const run = async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 120 })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  page.on("pageerror", (e) => errors.push(String(e)))

  // ─── 1. Landing page ──────────────────────────────────────────────────────
  console.log("\n── Landing page ──")
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 })
  await page.waitForTimeout(1500) // let GSAP animations run
  await shot(page, "landing")
  console.log("  title:", await page.title())

  // ─── 2. Register page ─────────────────────────────────────────────────────
  console.log("\n── Register page ──")
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle", timeout: 60000 })
  await shot(page, "register")

  // ─── 3. Teacher login ─────────────────────────────────────────────────────
  console.log("\n── Teacher login ──")
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 })
  await shot(page, "login")
  await login(page, TEACHER)
  console.log("  landed:", page.url())

  // ─── 4. Teacher dashboard ─────────────────────────────────────────────────
  console.log("\n── Teacher dashboard ──")
  await page.waitForSelector("text=Welcome back", { timeout: 10000 }).catch(() => {})
  await shot(page, "teacher-dashboard")

  // ─── 5. My Assessments ────────────────────────────────────────────────────
  console.log("\n── My Assessments ──")
  await page.click('a[href="/assessments"]')
  await page.waitForTimeout(2000)
  await shot(page, "teacher-assessments-list")

  // ─── 6. Open the Biology assessment ──────────────────────────────────────
  console.log("\n── Biology assessment detail ──")
  // Grab the href of the first "Open" link so we can navigate directly
  const openLink = page.locator('a:has-text("Open")').first()
  const assessmentHref = await openLink.getAttribute("href").catch(() => null)
  console.log("  assessment href:", assessmentHref)
  if (assessmentHref) {
    await page.goto(`${BASE}${assessmentHref}`, { waitUntil: "networkidle", timeout: 30000 })
  } else {
    await openLink.click()
    await page.waitForURL((u) => u.pathname.startsWith("/assessments/") && !u.pathname.endsWith("/assessments"), { timeout: 15000 }).catch(() => {})
  }
  await page.waitForTimeout(3000)
  await shot(page, "teacher-assessment-detail")

  // ─── 7. Toggle answer key ────────────────────────────────────────────────
  console.log("\n── Toggle answer key ──")
  const toggleBtn = page.locator('button:has-text("Show Answers")').first()
  if (await toggleBtn.isVisible()) {
    await toggleBtn.click()
    await page.waitForTimeout(1500)
    await shot(page, "teacher-answer-key")
  } else {
    console.log("  (answer toggle not visible — scrolling into view)")
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)
    await shot(page, "teacher-assessment-scrolled")
  }

  // ─── 8. Analytics ─────────────────────────────────────────────────────────
  console.log("\n── Analytics ──")
  await page.click('a[href="/analytics"]')
  await page.waitForTimeout(2000)
  await shot(page, "teacher-analytics")

  // ─── 9. Create assessment form (Step 1) ───────────────────────────────────
  console.log("\n── Create assessment ──")
  await page.click('a[href="/create"]')
  await page.waitForTimeout(1500)
  await shot(page, "create-step1-blank")

  // Fill in Step 1
  await page.fill('input[id="title"]', "Physics Mid-Term — Laws of Motion")
  await page.fill('input[id="subject"]', "Physics")
  await page.fill('input[id="topic"]', "Newton's Laws of Motion")
  await page.selectOption('select[id="gradeLevel"]', "Grade 11")
  await page.fill('input[id="dueDate"]', "2026-08-15")
  await page.waitForTimeout(500)
  await shot(page, "create-step1-filled")

  // Advance to Step 2
  await page.click('button:has-text("Configure Sections")')
  await page.waitForTimeout(1000)
  await shot(page, "create-step2-sections")

  // Go back to assessments rather than submitting (avoid actual LLM call in walkthrough)
  await page.click('button:has-text("General Details")')
  await page.waitForTimeout(500)

  // ─── 10. Documents / Library (teacher) ───────────────────────────────────
  console.log("\n── Documents library (teacher) ──")
  await page.click('a[href="/library"]')
  await page.waitForTimeout(2000)
  await shot(page, "teacher-library")

  // ─── 11. Sign out → Student login ────────────────────────────────────────
  console.log("\n── Sign out ──")
  await signOut(page)
  await shot(page, "after-signout-login")

  console.log("\n── Student login ──")
  await login(page, STUDENT)
  console.log("  landed:", page.url())

  // ─── 12. Student dashboard ───────────────────────────────────────────────
  console.log("\n── Student dashboard ──")
  await page.waitForSelector("text=Welcome back", { timeout: 10000 }).catch(() => {})
  await shot(page, "student-dashboard")

  // ─── 13. Library (upload docs) ───────────────────────────────────────────
  console.log("\n── Student library ──")
  await page.click('a[href="/library"]')
  await page.waitForTimeout(2000)
  await shot(page, "student-library")

  // ─── 14. Study aids ───────────────────────────────────────────────────────
  console.log("\n── Study aids ──")
  await page.click('a[href="/study"]')
  await page.waitForTimeout(2000)
  await shot(page, "student-study")

  // ─── 15. Assessments (student view) — find the Biology one ───────────────
  console.log("\n── Student assessments ──")
  await page.click('a[href="/assessments"]')
  await page.waitForTimeout(2000)
  await shot(page, "student-assessments")

  // ─── 16. View Alice's graded result ──────────────────────────────────────
  console.log("\n── Alice's graded result ──")
  const viewBtn = page.locator('a:has-text("View")').first()
  if (await viewBtn.isVisible()) {
    await viewBtn.click()
    await page.waitForTimeout(2500)
    await shot(page, "student-result-graded")

    // Scroll to see per-question feedback
    await page.evaluate(() => window.scrollBy(0, 600))
    await page.waitForTimeout(500)
    await shot(page, "student-result-feedback")
  } else {
    console.log("  (no submission to view yet)")
  }

  // ─── 17. Progress page ───────────────────────────────────────────────────
  console.log("\n── Progress page ──")
  await page.click('a[href="/progress"]').catch(() => {})
  await page.waitForTimeout(2000)
  await shot(page, "student-progress")

  // ─── Done ──────────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────────")
  console.log(`Page errors: ${errors.length ? errors.join("; ") : "none"}`)
  console.log(`Screenshots saved: ${shotIndex} files  (walkthrough-NN-name.png)`)

  await page.waitForTimeout(2000)
  await browser.close()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
