// Interaction self-test in a real browser, real frames. Open /demo/selftest.html; results print on the page.
import "../src/element/index.ts"
import type { TelescopeSelectDetail } from "../src/element/index.ts"

const ts = document.querySelector("telescope-search")!
const root = ts.shadowRoot!
const $ = <T extends Element>(s: string) => root.querySelector<T>(s)!
const base = $<HTMLButtonElement>(".base")
const input = $<HTMLInputElement>(".input")
const tube = $<HTMLElement>('.seg[data-k="3"]')
const rows = () => Array.from(root.querySelectorAll<HTMLElement>(".row"))
const out = document.getElementById("out")!
const results: string[] = []
let failed = 0

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const frames = (ms: number, each: () => void) =>
  new Promise<void>((done) => {
    const end = performance.now() + ms
    const f = () => {
      each()
      performance.now() < end ? requestAnimationFrame(f) : done()
    }
    requestAnimationFrame(f)
  })
const type = (text: string) => {
  input.value = text
  input.dispatchEvent(new Event("input", { bubbles: true }))
}
const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, composed: true }))
function check(name: string, ok: boolean, info = "") {
  if (!ok) failed++
  results.push(`${ok ? "pass" : "FAIL"}  ${name}${info ? `  (${info})` : ""}`)
}

async function run() {
  await document.fonts?.ready
  await wait(300)
  const rest = ts.pose
  check("idle: the field peeks out, collars nested", rest.progress === 0 && rest.tubes[0] === 0 && rest.tubes[1] === 0 && rest.tubes[2] === rest.rest[2] && rest.rest[2] > 60, `rest ${rest.rest[2]}px`)
  check("idle: the label shows on the field", input.placeholder === "Search" && getComputedStyle(input).opacity === "1")
  const fieldBox = ts.getBoundingClientRect()
  check("idle: the element takes only the closed size in the layout", fieldBox.width < 240 && fieldBox.height === 48, `${Math.round(fieldBox.width)} × ${Math.round(fieldBox.height)}`)

  tube.dispatchEvent(new PointerEvent("pointerover", { pointerType: "mouse", bubbles: true }))
  await wait(700)
  check("hover pulls the tube out a little", Math.abs(ts.pose.tubes[2] - (rest.rest[2] + 10)) < 0.01, `${ts.pose.tubes[2].toFixed(2)}px`)
  tube.dispatchEvent(new PointerEvent("pointerout", { pointerType: "mouse", bubbles: true, relatedTarget: document.body }))
  await wait(700)
  check("hover off returns it", ts.pose.tubes[2] === rest.rest[2])

  let collarAt = -1
  let over = 0
  tube.click()
  await frames(1500, () => {
    const p = ts.pose
    if (collarAt < 0 && p.tubes[1] > 0.01) collarAt = p.progress
    p.tubes.forEach((x, k) => (over = Math.max(over, x - p.max[k])))
  })
  check("opens on click", ts.open && ts.hasAttribute("open") && ts.pose.progress === 1)
  check("collars only follow once the field is most of the way out", collarAt > 0.85, `collar started at ${collarAt.toFixed(2)}`)
  check("no tube runs past its stop", over === 0)
  check("opening focuses the field", root.activeElement === input)
  const open = ts.getBoundingClientRect()
  const track = $<HTMLElement>(".track").getBoundingClientRect()
  check("opens to the left of the eyepiece", track.right === open.right && track.width > open.width + 150, `${Math.round(track.width)}px`)

  type("jo")
  await wait(600)
  check("matches show on the sheet, best first", rows().length === 2 && rows()[0].textContent!.startsWith("Journal"), rows().map((r) => r.textContent).join(" / "))
  check("the count rides on the field", $(".count").textContent === "2 pages")
  check("first result is picked", rows()[0].getAttribute("aria-selected") === "true" && input.getAttribute("aria-activedescendant") === "opt-0")
  key(input, "ArrowDown")
  check("arrow down moves the pick", rows()[1].getAttribute("aria-selected") === "true")
  type("cost")
  await wait(400)
  check("keywords find a page", rows().length === 1 && rows()[0].textContent!.startsWith("Pricing"))
  type("zzz")
  await wait(400)
  check("no match says so", rows().length === 1 && rows()[0].getAttribute("aria-disabled") === "true" && $(".count").textContent === "none")

  type("fra")
  await wait(400)
  let picked: TelescopeSelectDetail | null = null
  const onSelect = (e: Event) => {
    picked = (e as CustomEvent<TelescopeSelectDetail>).detail
    e.preventDefault()
  }
  ts.addEventListener("select", onSelect)
  key(input, "Enter")
  ts.removeEventListener("select", onSelect)
  check("enter fires select", (picked as TelescopeSelectDetail | null)?.label === "Why I build in Framer" && (picked as TelescopeSelectDetail | null)?.index === 3)
  check("cancelled select keeps the page", location.hash === "")
  await wait(1800)
  check("a pick closes it back to the idle pose", !ts.open && ts.pose.tubes.every((x, k) => x === ts.pose.rest[k]) && input.value === "")

  ts.open = true
  await wait(1200)
  type("wo")
  await wait(400)
  const cancel = (e: Event) => e.preventDefault()
  ts.addEventListener("select", cancel)
  rows()[0].click()
  ts.removeEventListener("select", cancel)
  check("a mouse pick closes without a focus ring on the eyepiece", !ts.open && root.activeElement !== base)
  await wait(1800)

  document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true }))
  await wait(200)
  check("/ opens it from anywhere on the page", ts.open)
  key(input, "Escape")
  check("escape after / closes without a focus ring on the eyepiece", !ts.open && root.activeElement !== base)
  await wait(1500)

  base.focus()
  base.click() // a click with detail 0, like Enter on the focused eyepiece
  await wait(300)
  check("enter on the eyepiece opens it", ts.open)
  key(input, "Escape")
  check("escape then hands focus back to the eyepiece", !ts.open && root.activeElement === base)
  base.blur()
  await wait(1500)

  document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))
  await wait(200)
  check("⌘K opens it", ts.open)
  document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }))
  check("click outside closes", !ts.open)
  await wait(1500)

  ts.setAttribute("side", "right")
  document.querySelector("header")!.style.justifyContent = "flex-start"
  ts.open = true
  await wait(1500)
  const tr = $<HTMLElement>(".track").getBoundingClientRect(), host = ts.getBoundingClientRect()
  check("side=right pulls out to the right", Math.abs(tr.left - host.left) < 0.5 && tr.right > host.right + 150)
  ts.open = false
  await wait(1500)
  ts.removeAttribute("side")
  document.querySelector("header")!.style.justifyContent = ""

  out.textContent = `${results.join("\n")}\n\n${failed ? `${failed} failed` : `all ${results.length} passed`}`
  document.body.dataset.done = failed ? "fail" : "pass"
}
run()
