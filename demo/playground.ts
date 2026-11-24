import "../src/element/index.ts"
import type { TelescopeSelectDetail, TelescopeSearchDetail } from "../src/element/index.ts"

/* ---------------- state ---------------- */

type Page = { label: string; href: string; description: string }
const examplePages = (): Page[] => [
  { label: "Work", href: "/work", description: "Selected projects, 2023 to now" },
  { label: "Services", href: "/services", description: "Websites designed and built in Framer" },
  { label: "Pricing", href: "/pricing", description: "Three fixed packages, from €2,400" },
  { label: "About", href: "/about", description: "Who builds your site and how" },
  { label: "Journal", href: "/journal", description: "Notes on design and building" },
  { label: "Why I build in Framer", href: "/journal/framer", description: "Journal · 6 min read" },
  { label: "FAQ", href: "/faq", description: "Ownership, hosting, timelines" },
  { label: "Contact", href: "/contact", description: "Start a project, reply within a day" },
]
const initial = () => ({
  label: "Search",
  placeholder: "Search pages",
  hint: "/",
  pages: examplePages(),
  countText: "{n} page|{n} pages|none",
  emptyText: "No page matches “{q}”",
  emptyHint: "Try a shorter word",
  tube: "",
  ring: "",
  text: "",
  muted: "",
  font: "Same as my site",
  side: "left",
  length: 420,
  maxResults: 5,
  shortcut: true,
  sound: true,
  haptics: true,
  open: false,
  device: "full",
})
const S = initial()
type Key = keyof typeof S
const MAX_PAGES = 30
const FONT_LINKS: Record<string, string> = {
  Geist: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500&display=swap",
  Inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap",
  "Instrument Sans": "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500&display=swap",
}
/** Where the built script is served, so pasted HTML works anywhere. */
const SCRIPT_URL = "https://telescope-search.vercel.app/telescope-search.iife.js"

const DEFAULT_COLOURS: Record<string, string> = { tube: "#FFFFFF", ring: "#DFE1E6", text: "#141415", muted: "#8E8E95" }
const COLOUR_VARS: Record<string, string> = { tube: "--ts-tube", ring: "--ts-ring", text: "--ts-text", muted: "--ts-muted" }
const FONTS: Record<string, string> = {
  "Same as my site": "",
  Geist: '"Geist", ui-sans-serif, system-ui, sans-serif',
  Inter: '"Inter", ui-sans-serif, system-ui, sans-serif',
  "Instrument Sans": '"Instrument Sans", ui-sans-serif, system-ui, sans-serif',
  System: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
}

/* ---------------- panel schema ---------------- */

type Base = { k: Key; label: string; hint?: string | (() => string); when?: () => boolean }
type Ctl = Base & (
  | { type: "text"; max?: number }
  | { type: "slider"; min: number; max: number; step?: number; unit: string }
  | { type: "select"; options: () => [string, string][] }
  | { type: "segment"; options: [string, string][] }
  | { type: "toggle" }
  | { type: "colour" }
  | { type: "pages" }
)

const SCHEMA: [string, Ctl[]][] = [
  ["Content", [
    { k: "label", label: "Closed text", type: "text", hint: "What the field says before it opens." },
    { k: "placeholder", label: "Open text", type: "text", hint: "Placeholder once it is pulled out." },
    { k: "hint", label: "Key hint", type: "text", max: 4, hint: "Shown on the closed field. Leave empty to hide it." },
    { k: "pages", label: "Pages", type: "pages" },
  ]],
  ["Messages", [
    { k: "countText", label: "Count", type: "text", max: 60, hint: "One, many and none, split by |. {n} is the number." },
    { k: "emptyText", label: "No match", type: "text", max: 60, hint: "{q} is what the visitor typed." },
    { k: "emptyHint", label: "No match tip", type: "text", max: 60 },
  ]],
  ["Colours", [
    { k: "tube", label: "Tubes", type: "colour", hint: "Shading, rims and the results sheet are mixed from it." },
    { k: "ring", label: "Rings", type: "colour" },
    { k: "text", label: "Text", type: "colour" },
    { k: "muted", label: "Soft text", type: "colour", hint: "Placeholder, key hint, count and descriptions." },
    { k: "font", label: "Font", type: "select", options: () => Object.keys(FONTS).map((f) => [f, f]), hint: "Same as my site uses the font around the search." },
  ]],
  ["Telescope", [
    { k: "side", label: "Pulls out to", type: "segment", options: [["left", "Left"], ["right", "Right"]], hint: "Left for a field on the right of the nav." },
    { k: "length", label: "Open length", type: "slider", min: 300, max: 560, step: 10, unit: "px", hint: "Shortens itself when the screen is too narrow." },
    { k: "maxResults", label: "Results", type: "slider", min: 3, max: 8, unit: "" },
  ]],
  ["Behaviour", [
    { k: "shortcut", label: "Shortcuts", type: "toggle", hint: "/ and ⌘K or Ctrl+K open the search." },
    { k: "sound", label: "Click sound", type: "toggle" },
    { k: "haptics", label: "Vibration", type: "toggle", hint: "A tiny tap on phones when a ring clicks." },
  ]],
  ["Preview", [
    { k: "open", label: "Search open", type: "toggle" },
    { k: "device", label: "Screen", type: "segment", options: [["full", "Desktop"], ["768", "Tablet"], ["390", "Phone"]] },
  ]],
]

/* ---------------- build panel ---------------- */

const panel = document.getElementById("panel")!
const pv = document.getElementById("pv")!
const frame = document.getElementById("frame")!
const ts = document.getElementById("ts") as HTMLElementTagNameMap["telescope-search"]
const refresh: (() => void)[] = []
let uid = 0

function set<K extends Key>(k: K, v: (typeof S)[K]) {
  S[k] = v
  refreshAll()
  apply()
}
function refreshAll() { refresh.forEach((f) => f()) }
function fillTrack(r: HTMLInputElement) {
  const p = ((+r.value - +r.min) / (+r.max - +r.min)) * 100
  r.style.setProperty("--p", `${Math.max(0, Math.min(100, p))}%`)
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)

const head = document.createElement("div")
head.className = "panel-head"
head.innerHTML = `<span>Properties</span><button type="button" class="reset">Reset all</button>`
head.querySelector("button")!.addEventListener("click", () => { Object.assign(S, initial()); refreshAll(); apply() })
panel.appendChild(head)

for (const [title, ctls] of SCHEMA) {
  const sec = document.createElement("section")
  sec.className = "sec"
  sec.innerHTML = `<h2>${title}</h2>`
  for (const c of ctls) {
    const row = document.createElement("div")
    row.className = "row"
    const id = `c${++uid}`
    const lab = `<label for="${id}">${c.label}</label>`
    const k = c.k
    let update: () => void = () => {}

    if (c.type === "text") {
      row.innerHTML = `${lab}<div class="ctl"><div class="fx"><input id="${id}" type="text" maxlength="${c.max ?? 24}"></div></div>`
      const i = row.querySelector("input")!
      update = () => { if (document.activeElement !== i) i.value = String(S[k]) }
      i.addEventListener("input", () => set(k, i.value as never))
    } else if (c.type === "slider") {
      row.innerHTML = `${lab}<div class="ctl"><div class="sl"><input type="range" id="${id}" min="${c.min}" max="${c.max}" step="${c.step ?? 1}"><output></output></div></div>`
      const r = row.querySelector("input")!, out = row.querySelector("output")!
      update = () => { r.value = String(S[k]); out.textContent = `${S[k]}${c.unit ? ` ${c.unit}` : ""}`; fillTrack(r) }
      r.addEventListener("input", () => set(k, +r.value as never))
    } else if (c.type === "select") {
      row.innerHTML = `${lab}<div class="ctl"><select class="in" id="${id}">${c.options().map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("")}</select></div>`
      const s = row.querySelector("select")!
      update = () => { s.value = String(S[k]) }
      s.addEventListener("change", () => set(k, s.value as never))
    } else if (c.type === "segment") {
      row.innerHTML = `<span class="lab">${c.label}</span><div class="ctl"><div class="seg" role="group" aria-label="${c.label}">${c.options.map(([v, l]) => `<button type="button" data-v="${v}">${l}</button>`).join("")}</div></div>`
      const bs = [...row.querySelectorAll("button")]
      update = () => bs.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === S[k])))
      bs.forEach((b) => b.addEventListener("click", () => set(k, b.dataset.v as never)))
    } else if (c.type === "toggle") {
      row.innerHTML = `<span class="lab" id="${id}">${c.label}</span><div class="ctl"><button type="button" class="tog" role="switch" aria-labelledby="${id}"></button></div>`
      const b = row.querySelector("button")!
      update = () => b.setAttribute("aria-checked", String(!!S[k]))
      b.addEventListener("click", () => set(k, !S[k] as never))
    } else if (c.type === "colour") {
      row.innerHTML = `${lab}<div class="ctl"><div class="fx col"><span class="sw"><input type="color" aria-label="${c.label} colour"></span><input id="${id}" spellcheck="false" maxlength="7"><button type="button" class="x" aria-label="Back to the default colour">×</button></div></div>`
      const [pick, hex] = row.querySelectorAll("input")
      const sw = row.querySelector<HTMLElement>(".sw")!, x = row.querySelector<HTMLButtonElement>(".x")!
      update = () => {
        const v = String(S[k])
        pick.value = v || DEFAULT_COLOURS[k]
        sw.style.background = pick.value
        hex.placeholder = "Default"
        if (document.activeElement !== hex) hex.value = v.toUpperCase()
        x.hidden = !v
      }
      pick.addEventListener("input", () => set(k, pick.value as never))
      hex.addEventListener("input", () => { const v = hex.value.trim(); if (!v || /^#?[0-9a-f]{6}$/i.test(v)) set(k, (v && !v.startsWith("#") ? `#${v}` : v) as never) })
      x.addEventListener("click", () => set(k, "" as never))
    } else if (c.type === "pages") {
      row.classList.add("stack")
      row.innerHTML = `<span class="lab">${c.label}</span><div class="ctl"><div class="links"></div><div class="links-foot"><button type="button" class="add">+ Add a page</button><span><button type="button" class="mini" data-a="ex">Example</button></span></div><p class="hint">Everything the visitor can find. The description shows under the title and is searched too.</p></div>`
      const box = row.querySelector<HTMLElement>(".links")!
      const add = row.querySelector<HTMLButtonElement>(".add")!
      const draw = () => {
        box.innerHTML = `<div class="link-head"><span>Title</span><span>Goes to</span></div>` + S.pages.map((l, i) => `
          <div class="link-row" data-i="${i}">
            <input aria-label="Page ${i + 1} title" value="${esc(l.label)}" data-f="label" maxlength="40">
            <input aria-label="Page ${i + 1} address" value="${esc(l.href)}" data-f="href" spellcheck="false" placeholder="/page">
            <button type="button" class="x" aria-label="Remove page ${i + 1}"${S.pages.length <= 1 ? " hidden" : ""}>×</button>
            <input class="desc" aria-label="Page ${i + 1} description" value="${esc(l.description)}" data-f="description" maxlength="60" placeholder="Description (optional)">
          </div>`).join("")
        add.disabled = S.pages.length >= MAX_PAGES
      }
      update = () => { if (!box.contains(document.activeElement)) draw() }
      box.addEventListener("input", (e) => {
        const el = e.target as HTMLInputElement, i = +el.closest<HTMLElement>(".link-row")!.dataset.i!
        S.pages = S.pages.map((l, j) => (j === i ? { ...l, [el.dataset.f!]: el.value } : l))
        apply()
      })
      box.addEventListener("click", (e) => {
        const x = (e.target as Element).closest(".x"); if (!x) return
        const i = +x.closest<HTMLElement>(".link-row")!.dataset.i!
        set("pages", S.pages.filter((_, j) => j !== i))
      })
      add.addEventListener("click", () => {
        set("pages", [...S.pages, { label: "New page", href: "/new-page", description: "" }])
        box.querySelector<HTMLInputElement>(".link-row:last-child input")?.select()
      })
      row.querySelector('[data-a="ex"]')!.addEventListener("click", () => set("pages", examplePages()))
    }

    if (c.hint) {
      const h = document.createElement("p")
      h.className = "hint"
      row.querySelector(".ctl")!.appendChild(h)
      const prev = update
      update = () => { prev(); const t = typeof c.hint === "function" ? c.hint() : c.hint!; h.textContent = t; h.hidden = !t }
    }
    const inner = update
    refresh.push(() => { row.hidden = c.when ? !c.when() : false; inner() })
    sec.appendChild(row)
  }
  panel.appendChild(sec)
}

/* ---------------- apply to the component ---------------- */

const livePages = () => S.pages.filter((l) => l.label.trim())
const D = initial()

function attrs(): [string, string][] {
  const a: [string, string][] = []
  if (S.label !== D.label) a.push(["label", S.label])
  if (S.placeholder !== D.placeholder) a.push(["placeholder", S.placeholder])
  if (S.hint !== D.hint) a.push(["hint", S.hint])
  if (S.side !== D.side) a.push(["side", S.side])
  if (S.length !== D.length) a.push(["length", String(S.length)])
  if (S.maxResults !== D.maxResults) a.push(["max-results", String(S.maxResults)])
  if (S.countText !== D.countText) a.push(["count-text", S.countText])
  if (S.emptyText !== D.emptyText) a.push(["empty-text", S.emptyText])
  if (S.emptyHint !== D.emptyHint) a.push(["empty-hint", S.emptyHint])
  if (!S.shortcut) a.push(["shortcut", "off"])
  if (!S.sound) a.push(["sound", "off"])
  if (!S.haptics) a.push(["haptics", "off"])
  return a
}
function styles(): [string, string][] {
  const s: [string, string][] = []
  for (const k of ["tube", "ring", "text", "muted"] as const) if (S[k]) s.push([COLOUR_VARS[k], S[k]])
  if (FONTS[S.font]) s.push(["--ts-font", FONTS[S.font]])
  return s
}

const KNOWN = ["label", "placeholder", "hint", "side", "length", "max-results", "count-text", "empty-text", "empty-hint", "shortcut", "sound", "haptics"]
let applying = false
let lastPages = ""

function apply() {
  applying = true
  pv.classList.toggle("mirror", S.side === "right")
  const want = new Map(attrs())
  for (const k of KNOWN) {
    const v = want.get(k)
    if (v == null) { if (ts.hasAttribute(k)) ts.removeAttribute(k) }
    else if (ts.getAttribute(k) !== v) ts.setAttribute(k, v)
  }
  ts.removeAttribute("style")
  for (const [p, v] of styles()) ts.style.setProperty(p, v)
  const sig = JSON.stringify(livePages())
  if (sig !== lastPages) {
    lastPages = sig
    ts.replaceChildren(...livePages().map((l) => {
      const a = Object.assign(document.createElement("a"), { href: l.href || "#", textContent: l.label })
      if (l.description) a.dataset.description = l.description
      return a
    }))
  }
  frame.style.width = S.device === "full" ? "100%" : `${S.device}px`
  if (ts.open !== S.open) ts.open = S.open
  applying = false
  renderCode()
}

/* ---------------- code + events ---------------- */

let tab: "html" | "react" = "html"
const codeEl = document.getElementById("code")!
const escHTML = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!)

function code(): string {
  const a = attrs(), st = styles()
  const pages = livePages()
  if (tab === "html") {
    const at = a.map(([k, v]) => ` ${k}="${esc(v)}"`).join("")
    const style = st.length ? ` style="${st.map(([p, v]) => `${p}: ${v.replace(/"/g, "'")}`).join("; ")}"` : ""
    // ready to paste anywhere, including a Framer or Webflow embed: the script is served from the live demo,
    // the wrapper keeps the field in its corner with room for the pull and the results, and target="_top" makes
    // links open the real page when the embed sits in its own frame (on a normal page it behaves like a plain link)
    const corner = S.side === "right" ? "flex-start" : "flex-end"
    const pad = S.side === "right" ? "8px 0 0 8px" : "8px 8px 0 0"
    // an embed is a blank page, so it can't inherit the site's font: load the chosen one, or use the system sans
    const fontLink = FONT_LINKS[S.font] ? [`<link rel="stylesheet" href="${FONT_LINKS[S.font]}">`] : []
    const family = FONTS[S.font] || FONTS.System
    return [
      ...fontLink,
      `<script src="${SCRIPT_URL}"></script>`,
      ``,
      `<!-- In an embed, give it room to open: about ${S.length + 24} × 380 -->`,
      `<div style="display: flex; justify-content: ${corner}; padding: ${pad}; font-family: ${family.replace(/"/g, "'")}">`,
      `  <telescope-search${at}${style}>`,
      ...pages.map((l) => `    <a href="${esc(l.href)}" target="_top"${l.description ? ` data-description="${esc(l.description)}"` : ""}>${escHTML(l.label)}</a>`),
      `  </telescope-search>`,
      `</div>`,
    ].join("\n")
  }
  const item = (l: Page) => `{ label: ${JSON.stringify(l.label)}, href: ${JSON.stringify(l.href)}${l.description ? `, description: ${JSON.stringify(l.description)}` : ""} }`
  const p: string[] = [`items={[\n${pages.map((l) => `    ${item(l)},`).join("\n")}\n  ]}`]
  if (S.label !== D.label) p.push(`label=${JSON.stringify(S.label)}`)
  if (S.placeholder !== D.placeholder) p.push(`placeholder=${JSON.stringify(S.placeholder)}`)
  if (S.hint !== D.hint) p.push(`hint=${JSON.stringify(S.hint)}`)
  if (S.side !== D.side) p.push(`side="right"`)
  if (S.length !== D.length) p.push(`length={${S.length}}`)
  if (S.maxResults !== D.maxResults) p.push(`maxResults={${S.maxResults}}`)
  if (S.countText !== D.countText) p.push(`countText=${JSON.stringify(S.countText)}`)
  if (S.emptyText !== D.emptyText) p.push(`emptyText=${JSON.stringify(S.emptyText)}`)
  if (S.emptyHint !== D.emptyHint) p.push(`emptyHint=${JSON.stringify(S.emptyHint)}`)
  if (!S.shortcut) p.push(`shortcut={false}`)
  if (!S.sound) p.push(`sound={false}`)
  if (!S.haptics) p.push(`haptics={false}`)
  if (st.length) p.push(`style={{ ${st.map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(", ")} }}`)
  p.push(`onSelect={(page) => console.log(page)}`)
  return `import { TelescopeSearch } from "@justbuilt/telescope-search/react"\n\n<TelescopeSearch\n${p.map((x) => "  " + x).join("\n")}\n/>`
}
function renderCode() {
  codeEl.innerHTML = escHTML(code()).replace(/(&lt;\/?[\w-]+|\/?&gt;)/g, '<span class="a">$1</span>')
}

const tabs = [...document.querySelectorAll<HTMLButtonElement>("#code-tabs button")]
tabs.forEach((b) => b.addEventListener("click", () => {
  tab = b.dataset.tab as typeof tab
  tabs.forEach((x) => x.setAttribute("aria-selected", String(x === b)))
  renderCode()
}))

const copyBtn = document.getElementById("copy")!
copyBtn.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(code()); copyBtn.textContent = "Copied" }
  catch {
    const r = document.createRange(); r.selectNodeContents(codeEl)
    const sel = getSelection(); sel?.removeAllRanges(); sel?.addRange(r)
    copyBtn.textContent = "Selected"
  }
  copyBtn.classList.add("done")
  setTimeout(() => { copyBtn.textContent = "Copy"; copyBtn.classList.remove("done") }, 1600)
})

const evList = document.getElementById("events")!
function logEvent(type: string, text: string) {
  evList.querySelector(".empty")?.remove()
  const li = document.createElement("li")
  li.innerHTML = `<b>${type}</b><span>${escHTML(text)}</span>`
  evList.prepend(li)
  while (evList.children.length > 20) evList.lastElementChild!.remove()
}

// Two-way, like Framer's property panel: opening or closing in the preview updates the toggle.
ts.addEventListener("toggle", (e) => {
  const open = (e as unknown as CustomEvent<{ open: boolean }>).detail.open
  logEvent("toggle", open ? "open" : "closed")
  if (applying) return
  S.open = open
  refreshAll()
})
let searchTimer = 0
ts.addEventListener("search", (e) => {
  const d = (e as CustomEvent<TelescopeSearchDetail>).detail
  clearTimeout(searchTimer)
  // log once typing pauses, not on every key
  searchTimer = window.setTimeout(() => { if (d.query) logEvent("search", `“${d.query}” · ${d.results}`) }, 400)
})
ts.addEventListener("select", (e) => {
  const d = (e as CustomEvent<TelescopeSelectDetail>).detail
  logEvent("select", `${d.index} · ${d.label} · ${d.href ?? "no link"}`)
  e.preventDefault() // the playground never navigates away
})

const wOut = document.getElementById("stage-w")!
new ResizeObserver(() => { wOut.textContent = `${Math.round(frame.getBoundingClientRect().width)} px` }).observe(frame)

refreshAll()
apply()
