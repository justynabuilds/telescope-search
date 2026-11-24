import { TelescopeEngine, type Triple } from "../core/engine.ts"
import { search, highlight, countText, type SearchItem, type SearchHit } from "../core/search.ts"
import { styles } from "../core/styles.ts"

export interface TelescopeSelectDetail {
  index: number
  label: string
  href: string | null
  description: string
}
export interface TelescopeSearchDetail {
  query: string
  results: number
}

const ICON = `<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.6" cy="8.6" r="5.6" stroke="currentColor" stroke-width="1.6"/><path d="M12.8 12.8 17 17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`
const RETURN = `<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M9.5 2.5v3a1.5 1.5 0 0 1-1.5 1.5H2.8M4.6 5.2 2.8 7l1.8 1.8" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/></svg>`

/** Eyepiece width, how much of each nested tube shows (its ring), how far each collar pulls out. */
const BASE = 56
const LIP: Triple = [5, 5, 6]
const COLLAR = 15
/** Gap between the long tube's far end and the text. */
const INSET = 18
/** The sheet starts back under the tube first; the tubes follow while it is still on its way. */
const SHEET_OUT_MS = 150
/** The text swaps while the long tube is moving: the old text fades out by this much of the pull, the new one fades in after. */
const TEXT_SWAP = 0.3

// ---------- sound ----------
// One audio context and one click for the whole page. Starting an AudioContext blocks for a frame or more,
// so it is never made during a pull: it is made just after the visitor's first tap anywhere (browsers only allow
// sound after one), or once the telescope comes to rest. If the very first open is also the first gesture,
// that one pull is silent rather than stuttering.
let audio: { ac: AudioContext; click: AudioBuffer } | null = null
function prepareAudio() {
  if (audio) return audio
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ac = new AC()
    const n = Math.floor(ac.sampleRate * 0.018)
    const click = ac.createBuffer(1, n, ac.sampleRate)
    const ch = click.getChannelData(0)
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4)
    audio = { ac, click }
  } catch {}
  return audio
}
let audioWarmed = false
function warmAudioOnFirstGesture() {
  if (audioWarmed) return
  audioWarmed = true
  const warm = () => {
    removeEventListener("pointerdown", warm, true)
    if (![...instances].some((x) => x.getAttribute("sound") !== "off")) return
    // after the gesture's own frame, and before the click that would open the search
    setTimeout(prepareAudio, 0)
  }
  addEventListener("pointerdown", warm, true)
}

const instances = new Set<TelescopeSearchElement>()
let shortcutsBound = false
function bindShortcuts() {
  if (shortcutsBound) return
  shortcutsBound = true
  document.addEventListener("keydown", (e) => {
    const t = e.composedPath()[0] as HTMLElement | undefined
    const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
    const slash = e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey
    const modK = (e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k"
    if (!slash && !modK) return
    // the first visible search on the page that listens for shortcuts
    const el = [...instances].find((x) => x.getAttribute("shortcut") !== "off" && x.getClientRects().length > 0)
    if (!el) return
    e.preventDefault()
    el.open = true
  })
}

/**
 * <telescope-search>
 *   <a href="/work" data-description="Selected projects">Work</a>
 *   <a href="/pricing" data-keywords="cost price">Pricing</a>
 * </telescope-search>
 *
 * The links are read from the light DOM and searched by label, description and keywords.
 * The field is a telescope: the long tube pulls out first, then the collar rings click into place.
 */
export class TelescopeSearchElement extends HTMLElement {
  static observedAttributes = ["open", "label", "placeholder", "hint", "length", "max-results", "side", "count-text", "empty-text", "empty-hint"]

  private root: ShadowRoot
  private foot: HTMLElement
  private track: HTMLElement
  private segs: HTMLElement[]
  private base: HTMLButtonElement
  private input: HTMLInputElement
  private hintEl: HTMLElement
  private countEl: HTMLElement
  private drop: HTMLElement
  private panel: HTMLElement
  private hl: HTMLElement
  private list: HTMLUListElement
  private measureEl: HTMLElement
  private engine: TelescopeEngine
  private items: SearchItem[] = []
  private hits: SearchHit[] = []
  private active = -1
  private shown = false
  private closing = false
  private closeTimer = 0
  private W = 420
  private hintW = 0
  private countW = 40
  private raf = 0
  private last = 0
  private syncing = false
  private built = false
  private lastPointer = "mouse"
  private motion = matchMedia("(prefers-reduced-motion: reduce)")
  private mo = new MutationObserver(() => this.readItems())
  private ro = new ResizeObserver(() => this.layout())

  constructor() {
    super()
    this.root = this.attachShadow({ mode: "open", delegatesFocus: false })
    this.root.innerHTML = `<style>${styles}</style>
      <div class="foot" part="field">
        <div class="track">
          <div class="seg" data-k="3" part="tube"></div><div class="seg" data-k="2" part="collar"></div><div class="seg" data-k="1" part="collar"></div>
          <button class="base" type="button" part="eyepiece" aria-expanded="false" aria-controls="list">${ICON}</button>
          <input class="input" part="input" type="text" enterkeyhint="go" autocomplete="off" autocapitalize="off" spellcheck="false"
            role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="list" tabindex="-1">
          <span class="hint" part="hint" aria-hidden="true"></span>
          <span class="count" part="count" aria-hidden="true"></span>
        </div>
        <div class="drop"><div class="panel" part="panel"><span class="hl" aria-hidden="true"></span><ul class="list" id="list" role="listbox" part="list"></ul></div></div>
      </div>
      <span class="measure" aria-hidden="true"></span>
      <span class="live" role="status" aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)"></span>`
    const $ = <T extends Element>(s: string) => this.root.querySelector<T>(s)!
    this.foot = $(".foot")
    this.track = $(".track")
    this.segs = [1, 2, 3].map((k) => $<HTMLElement>(`.seg[data-k="${k}"]`))
    this.base = $(".base")
    this.input = $(".input")
    this.hintEl = $(".hint")
    this.countEl = $(".count")
    this.drop = $(".drop")
    this.panel = $(".panel")
    this.hl = $(".hl")
    this.list = $(".list")
    this.measureEl = $(".measure")
    this.engine = new TelescopeEngine({ reducedMotion: this.motion.matches, onStop: (s) => this.knock(s) })

    // the whole closed telescope is the button; the eyepiece also closes it again
    this.track.addEventListener("click", (e) => {
      const t = e.target as Element
      // a click with detail 0 is Enter or Space on the focused eyepiece
      if (t.closest(".base")) this.setOpen(!this.open, true, e.detail === 0 ? "keyboard" : "pointer")
      else if (!this.open && t.closest(".seg")) this.setOpen(true, true, "pointer")
    })
    // pressing pushes the tube in a touch first, like taking hold of it before the pull
    this.track.addEventListener("pointerdown", (e) => {
      this.lastPointer = e.pointerType
      if (!this.open && (e.target as Element).closest(".seg, .base") && this.engine.setPress(true)) this.kick()
    })
    // hover: the tube gives a little, testing the pull
    this.track.addEventListener("pointerover", (e) => {
      if (e.pointerType === "mouse" && !this.closing && (e.target as Element).closest(".seg, .base") && this.engine.setHover(true)) this.kick()
    })
    this.track.addEventListener("pointerout", (e) => {
      const to = e.relatedTarget as Element | null
      if (!to?.closest?.(".seg, .base") && this.engine.setHover(false)) this.kick()
    })
    // keep focus in the field while a row is clicked
    this.panel.addEventListener("pointerdown", (e) => e.preventDefault())
    this.list.addEventListener("pointermove", (e) => {
      const r = (e.target as Element).closest<HTMLElement>(".row")
      if (r?.dataset.i) this.pick(+r.dataset.i)
    })
    this.list.addEventListener("click", (e) => {
      const r = (e.target as Element).closest<HTMLElement>(".row")
      if (r?.dataset.i) this.choose(+r.dataset.i, false)
    })
    this.input.addEventListener("input", () => this.runSearch())
    this.input.addEventListener("keydown", (e) => this.onKey(e))
    this.root.addEventListener("focusout", (e) => {
      const to = (e as FocusEvent).relatedTarget as Node | null
      if (this.open && to && !this.root.contains(to)) this.setOpen(false)
    })
  }

  // ---------- public API ----------

  get open() {
    return this.engine.isOpen && !this.closing
  }
  set open(v: boolean) {
    this.setOpen(Boolean(v))
  }
  toggle(force?: boolean) {
    this.setOpen(force ?? !this.open)
  }
  /** Current tube positions in px and how far the field is pulled out, 0 to 1 (used by the self-test). */
  get pose() {
    return { tubes: [...this.engine.d] as Triple, progress: this.engine.progress, rest: [...this.engine.rest] as Triple, max: [...this.engine.max] as Triple }
  }

  // ---------- lifecycle ----------

  connectedCallback() {
    instances.add(this)
    bindShortcuts()
    warmAudioOnFirstGesture()
    if (!this.built) this.build()
    this.mo.observe(this, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["href", "target", "data-description", "data-keywords"] })
    this.ro.observe(this)
    addEventListener("resize", this.onResize)
    document.addEventListener("pointerdown", this.onOutside, true)
    addEventListener("pointerup", this.onPointerUp, true)
    this.motion.addEventListener?.("change", this.onMotion)
    // the text width decides the idle length; measure again once the web font is in
    document.fonts?.ready.then(() => this.layout())
  }
  disconnectedCallback() {
    instances.delete(this)
    this.mo.disconnect()
    this.ro.disconnect()
    removeEventListener("resize", this.onResize)
    document.removeEventListener("pointerdown", this.onOutside, true)
    removeEventListener("pointerup", this.onPointerUp, true)
    this.motion.removeEventListener?.("change", this.onMotion)
    cancelAnimationFrame(this.raf)
    this.raf = 0
    clearTimeout(this.closeTimer)
  }
  attributeChangedCallback(name: string) {
    if (!this.built) return
    if (name === "open") {
      if (!this.syncing) this.setOpen(this.hasAttribute("open"))
    } else if (name === "count-text" || name === "empty-text" || name === "empty-hint" || name === "max-results") {
      if (this.open) this.runSearch()
    } else this.build()
  }

  // ---------- build and layout ----------

  private attr(name: string, fallback: string) {
    const v = this.getAttribute(name)
    return v == null ? fallback : v
  }
  private num(name: string, fallback: number) {
    const v = parseFloat(this.getAttribute(name) ?? "")
    return Number.isFinite(v) ? v : fallback
  }
  private get side() {
    return this.getAttribute("side") === "right" ? "right" : "left"
  }
  private get label() {
    return this.attr("label", "Search")
  }
  private get placeholderText() {
    return this.attr("placeholder", "Search pages")
  }

  private build() {
    this.built = true
    const label = this.label
    this.base.setAttribute("aria-label", this.open ? "Close search" : label)
    this.input.setAttribute("aria-label", this.placeholderText || label)
    this.input.placeholder = this.open ? this.placeholderText : label
    const hint = this.attr("hint", "/")
    this.hintEl.textContent = hint
    this.hintEl.hidden = !hint
    this.readItems()
    if (this.hasAttribute("open") && !this.engine.isOpen) {
      this.engine.setOpen(true)
      this.engine.settle()
      this.syncAria()
    }
    this.layout()
    requestAnimationFrame(() => this.layout())
  }

  private readItems() {
    this.items = Array.from(this.querySelectorAll<HTMLAnchorElement>(":scope > a")).map((a) => ({
      label: (a.textContent || "").trim(),
      href: a.getAttribute("href"),
      description: a.dataset.description || "",
      keywords: a.dataset.keywords || "",
      target: a.getAttribute("target"),
    }))
    if (this.open && this.input.value) this.runSearch()
  }

  private textWidth(s: string) {
    this.measureEl.textContent = s
    return this.measureEl.getBoundingClientRect().width / (this.zoom || 1)
  }
  /** On a scaled canvas (Framer) rects are scaled; offsetWidth is not. */
  private get zoom() {
    const r = this.foot.getBoundingClientRect().width
    return this.foot.offsetWidth ? r / this.foot.offsetWidth : 1
  }

  private layout() {
    if (!this.built) return
    const edge = this.side === "left" ? "right" : "left"
    const far = edge === "right" ? "left" : "right"
    this.hintW = this.hintEl.hidden ? 0 : this.hintEl.offsetWidth
    const labelW = this.textWidth(this.label)
    // idle, the long tube shows just enough for the label and the key hint
    const rest2 = Math.max(48, Math.ceil(INSET + labelW + 28 + (this.hintW ? this.hintW + 10 : 0) - LIP[2]))
    const footprint = BASE + LIP[0] + LIP[1] + LIP[2] + rest2
    this.foot.style.width = `${footprint}px`
    // open, it reaches the length asked for, or as far as the screen allows
    const host = this.foot.getBoundingClientRect()
    const z = this.zoom || 1
    const room = (edge === "right" ? host.right : innerWidth - host.left) / z - 12
    this.W = Math.round(Math.max(footprint + 120, Math.min(this.num("length", 420), room)))
    const max2 = Math.max(rest2 + 40, this.W - BASE - LIP[0] - LIP[1] - LIP[2] - 2 * COLLAR)
    this.W = BASE + LIP[0] + LIP[1] + LIP[2] + 2 * COLLAR + max2
    this.engine.setGeometry([0, 0, rest2], [COLLAR, COLLAR, max2])
    this.track.style[edge] = "0px"
    this.track.style[far] = ""
    this.track.style.width = `${this.W}px`
    this.base.style[edge] = "0px"
    this.base.style[far] = ""
    this.segs.forEach((s, i) => {
      s.style[edge] = `${(i + 1) * 2}px`
      s.style[far] = ""
    })
    this.drop.style[edge] = "-4px"
    this.drop.style[far] = ""
    this.drop.style.width = `${this.W - 8 + 24}px`
    this.render()
  }

  private onResize = () => this.layout()
  private onMotion = () => {
    this.engine.reducedMotion = this.motion.matches
    this.engine.settle()
    this.render()
  }

  // ---------- behaviour ----------

  /** How it was opened, so closing hands focus back the right way. */
  private openedBy: "pointer" | "keyboard" | "other" = "other"
  /** What had focus before a shortcut or code opened it. */
  private focusBefore: HTMLElement | null = null

  /**
   * `refocus` is true when closing from the keyboard. Focus then goes back where it came from: to the eyepiece
   * (with a ring) only if it was opened from the eyepiece with the keyboard, to whatever had it before a shortcut,
   * and nowhere after a click. Closing with a click elsewhere just lets go of it.
   */
  private setOpen(open: boolean, refocus = true, by: "pointer" | "keyboard" | "other" = "other") {
    if (open === this.open) {
      if (open) this.input.focus({ preventScroll: true })
      return
    }
    this.engine.reducedMotion = this.motion.matches
    if (open) {
      clearTimeout(this.closeTimer)
      if (this.closing) this.closing = false
      else {
        this.openedBy = by
        let a = document.activeElement as HTMLElement | null
        while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement as HTMLElement
        this.focusBefore = a && a !== document.body && !this.root.contains(a) ? a : null
        this.layout() // the field may have moved since the last measure
        this.engine.setOpen(true)
      }
      if (this.motion.matches) this.input.placeholder = this.placeholderText
      this.reflect(true)
      this.input.tabIndex = 0
      this.input.focus({ preventScroll: true })
      this.runSearch()
      this.kick()
    } else {
      this.closing = true
      this.reflect(false)
      this.input.tabIndex = -1
      if (this.root.activeElement === this.input) {
        if (refocus && this.openedBy === "keyboard") this.base.focus({ preventScroll: true })
        else if (refocus && this.focusBefore?.isConnected) this.focusBefore.focus({ preventScroll: true })
        else this.input.blur()
      }
      const wait = this.shown && !this.motion.matches ? SHEET_OUT_MS : 0
      this.showSheet(false)
      this.countEl.style.opacity = "0"
      this.closeTimer = window.setTimeout(() => {
        this.closing = false
        // the typed text fades out and the label fades back in as the tube slides home (see render)
        this.list.replaceChildren()
        this.hits = []
        this.active = -1
        this.engine.setOpen(false)
        this.kick()
        this.render()
      }, wait)
    }
    this.dispatchEvent(new CustomEvent("toggle", { detail: { open }, bubbles: true, composed: true }))
  }

  private reflect(open: boolean) {
    this.syncing = true
    this.toggleAttribute("open", open)
    this.syncing = false
    this.syncAria()
  }
  private syncAria() {
    const open = this.engine.isOpen && !this.closing
    this.base.setAttribute("aria-expanded", String(open))
    this.base.setAttribute("aria-label", open ? "Close search" : this.label)
    this.input.setAttribute("aria-expanded", String(open && this.shown))
  }

  private runSearch() {
    const q = this.input.value
    const limit = Math.max(1, Math.round(this.num("max-results", 5)))
    this.hits = search(this.items, q, limit)
    this.active = this.hits.length ? 0 : -1
    const has = q.trim().length > 0
    this.countEl.textContent = has ? countText(this.attr("count-text", "{n} page|{n} pages|none"), this.hits.length) : ""
    this.countW = this.countEl.offsetWidth || 40
    this.countEl.style.opacity = has ? "1" : "0"
    this.renderRows(q)
    this.render()
    this.dispatchEvent(new CustomEvent<TelescopeSearchDetail>("search", { detail: { query: q, results: this.hits.length }, bubbles: true, composed: true }))
  }

  private renderRows(q: string) {
    if (!q.trim()) {
      this.showSheet(false)
      this.input.removeAttribute("aria-activedescendant")
      return
    }
    const before = new Set([...this.list.children].map((r) => (r as HTMLElement).dataset.key))
    const rows = this.hits.length
      ? this.hits.map((h, i) => {
          const li = this.row(h.item.label, h.item.description, q)
          li.id = `opt-${i}`
          li.setAttribute("role", "option")
          li.dataset.i = String(i)
          li.dataset.key = `${h.index}`
          li.setAttribute("aria-selected", String(i === this.active))
          li.insertAdjacentHTML("beforeend", `<span class="ret">${RETURN}</span>`)
          return li
        })
      : [this.row(this.attr("empty-text", "No page matches “{q}”").replace("{q}", q.trim()), this.attr("empty-hint", "Try a shorter word"), "")]
    if (!this.hits.length) rows[0].setAttribute("aria-disabled", "true")
    this.list.replaceChildren(...rows)
    if (this.active >= 0) this.input.setAttribute("aria-activedescendant", `opt-${this.active}`)
    else this.input.removeAttribute("aria-activedescendant")
    const live = this.root.querySelector(".live")
    if (live) live.textContent = this.countEl.textContent || ""

    const h = this.list.offsetHeight + 12
    const still = this.motion.matches
    if (!this.shown) {
      // first results: the sheet grows down from under the field; each row fades in as the bottom edge reaches it
      void this.panel.offsetHeight
      this.moveHl(true)
      this.showSheet(true)
      this.panel.style.height = `${h}px`
      if (!still) rows.forEach((r) => r.animate([{ opacity: 0, transform: "translateY(-4px)" }, { opacity: 1, transform: "none" }], { duration: 300, delay: 20 + (r.offsetTop / h) * 170, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" }))
    } else {
      this.panel.style.height = `${h}px`
      this.moveHl(false)
      if (!still) rows.forEach((r) => { if (!before.has(r.dataset.key)) r.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease-out" }) })
    }
  }

  private row(title: string, description: string, q: string) {
    const li = document.createElement("li")
    li.className = "row"
    li.setAttribute("part", "row")
    const tx = document.createElement("span")
    tx.className = "tx"
    const line = (cls: string, text: string) => {
      const s = document.createElement("span")
      s.className = cls
      for (const seg of highlight(text, q)) s.append(seg.match ? Object.assign(document.createElement("mark"), { textContent: seg.text }) : seg.text)
      return s
    }
    tx.append(line("t", title), line("d", description))
    li.append(tx)
    return li
  }

  private showSheet(on: boolean) {
    if (!on) this.panel.style.height = ""
    this.shown = on
    this.drop.toggleAttribute("data-shown", on)
    this.input.setAttribute("aria-expanded", String(on && this.open))
  }

  private moveHl(instant: boolean) {
    const r = this.list.children[this.active] as HTMLElement | undefined
    if (!r || this.active < 0) {
      this.hl.style.opacity = "0"
      return
    }
    if (instant) this.hl.style.transition = "none"
    this.hl.style.opacity = "1"
    this.hl.style.transform = `translateY(${r.offsetTop}px)`
    this.hl.style.height = `${r.offsetHeight}px`
    if (instant) {
      void this.hl.offsetHeight
      this.hl.style.transition = ""
    }
  }

  private pick(i: number) {
    if (i === this.active || !this.hits[i]) return
    this.active = i
    ;[...this.list.children].forEach((r, j) => r.setAttribute("aria-selected", String(j === i)))
    this.input.setAttribute("aria-activedescendant", `opt-${i}`)
    this.moveHl(false)
  }

  /** Fires `select`; navigates to the link unless a listener cancelled it. Every pick closes the search. */
  private choose(i: number, fromKeyboard = true) {
    const hit = this.hits[i]
    if (!hit) return
    const { label, href, description, target } = hit.item
    const ok = this.dispatchEvent(new CustomEvent<TelescopeSelectDetail>("select", { detail: { index: hit.index, label, href, description }, bubbles: true, composed: true, cancelable: true }))
    this.setOpen(false, fromKeyboard)
    if (!ok || !href) return
    if (target === "_blank") window.open(href, "_blank", "noopener")
    else if (target === "_top" || target === "_parent") (target === "_top" ? window.top : window.parent)!.location.href = new URL(href, location.href).href
    else location.assign(href)
  }

  private onKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!this.hits.length) return
      e.preventDefault()
      const n = this.hits.length
      this.pick((this.active + (e.key === "ArrowDown" ? 1 : -1) + n) % n)
    } else if (e.key === "Enter") {
      if (this.active >= 0) {
        e.preventDefault()
        this.choose(this.active)
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      e.stopPropagation()
      this.setOpen(false)
    }
  }

  private onOutside = (e: PointerEvent) => {
    if (this.open && !e.composedPath().includes(this)) this.setOpen(false, false)
  }
  private onPointerUp = () => {
    if (this.engine.setPress(false)) this.kick()
  }

  // ---------- sound and touch feedback ----------

  /** A short dry click when a tube knocks against its stop (made, not loaded). */
  private knock(strength: number) {
    if (this.getAttribute("haptics") !== "off" && this.lastPointer === "touch" && strength > 0.2) {
      try { navigator.vibrate?.(6) } catch {}
    }
    if (this.getAttribute("sound") === "off") return
    const a = audio
    if (!a) return
    try {
      const { ac, click } = a
      if (ac.state === "suspended") ac.resume()
      const t = ac.currentTime
      const src = ac.createBufferSource()
      src.buffer = click
      const bp = ac.createBiquadFilter()
      bp.type = "bandpass"
      bp.frequency.value = 3200
      bp.Q.value = 1.4
      const g = ac.createGain()
      g.gain.setValueAtTime(0.11 * strength, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
      src.connect(bp).connect(g).connect(ac.destination)
      src.start(t)
    } catch {}
  }

  // ---------- frame loop ----------

  private kick() {
    if (this.raf) return
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.tick)
  }

  private tick = (now: number) => {
    const busy = this.engine.step((now - this.last) / 1000)
    this.last = now
    this.render()
    this.raf = busy ? requestAnimationFrame(this.tick) : 0
    // at rest, and the visitor has interacted: a safe moment to get the sound ready for next time
    if (!busy && !audio && this.getAttribute("sound") !== "off" && navigator.userActivation?.hasBeenActive !== false) setTimeout(prepareAudio, 0)
  }

  /** Engine values to CSS: tube lengths, and the text, key hint and count riding on the long tube. */
  private render() {
    const d = this.engine.d
    const L0 = BASE
    const L1 = L0 + LIP[0] + d[0]
    const L2 = L1 + LIP[1] + d[1]
    const L3 = L2 + LIP[2] + d[2]
    const W = this.W
    this.segs[0].style.width = `${L1 - 2}px`
    this.segs[1].style.width = `${L2 - 4}px`
    this.segs[2].style.width = `${L3 - 6}px`
    const pn = this.engine.progress
    const open = this.engine.isOpen && !this.closing
    const hintOut = this.hintW ? this.hintW + 10 : 0
    const hintA = Math.max(0, Math.min(1, 1 - pn * (open ? 4 : 2)))
    this.hintEl.style.opacity = String(hintA)
    this.countEl.style.visibility = open && pn > 0.9 ? "visible" : "hidden"
    let left: number, width: number
    if (this.side === "left") {
      // eyepiece on the right: the text starts near the far end; hint, then count, sit by the collars
      left = W - L3 + INSET
      const gap = L2 + 10 + (hintOut + 10) * (1 - pn) + (this.countW + 14) * pn
      width = W - gap - left
      this.hintEl.style.right = `${L2 + 10}px`
      this.countEl.style.right = `${L2 + 12}px`
      this.hintEl.style.left = this.countEl.style.left = ""
    } else {
      // mirrored: the text starts by the collars, the hint and count sit at the far end
      left = L2 + 16
      const end = L3 - 14 - (hintOut + 4) * (1 - pn) - (this.countW + 10) * pn
      width = end - left
      this.hintEl.style.left = `${L3 - 14 - this.hintW}px`
      this.countEl.style.left = `${L3 - 14 - this.countW}px`
      this.hintEl.style.right = this.countEl.style.right = ""
    }
    this.input.style.left = `${left}px`
    this.input.style.width = `${Math.max(0, width)}px`
    this.input.style.opacity = String(this.textOpacity(pn, open))
  }

  /**
   * The text never swaps in place: opening, "Search" fades out as the tube starts and "Search pages" fades in as it
   * travels; closing, the typed words fade out and the label fades back in as the tube comes home.
   */
  private textOpacity(pn: number, open: boolean) {
    const v = this.input
    if (this.motion.matches) {
      if (!open && !this.closing && this.engine.progress === 0) {
        v.value = ""
        v.placeholder = this.label
      }
      return 1
    }
    if (open) {
      if (v.value) return 1
      if (pn >= TEXT_SWAP && v.placeholder !== this.placeholderText) v.placeholder = this.placeholderText
      return Math.min(1, Math.abs(pn - TEXT_SWAP) / TEXT_SWAP)
    }
    if (this.closing || this.engine.isOpen) return 1
    const out = 1 - TEXT_SWAP
    if (pn > out) return v.value || v.placeholder !== this.label ? Math.min(1, (pn - out) / TEXT_SWAP) : 1
    if (v.value || v.placeholder !== this.label) {
      v.value = ""
      v.placeholder = this.label
    }
    return Math.min(1, (out - pn) / TEXT_SWAP)
  }
}
