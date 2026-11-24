// Motion engine for the telescope search. No DOM: it holds three tubes on springs with hard stops,
// so the element, the React adapter and the tests all drive the same code.
//
// Tube 2 is the long one that carries the text field; tubes 1 and 0 are the short collars between it and
// the eyepiece. Each value is how far that tube is pulled out of the one it sits in, in px.

export type Triple = [number, number, number]

export interface EngineOptions {
  /** How far each tube is out when idle. The long tube peeks out so the field reads as a field. */
  rest?: Triple
  /** How far each tube is out when open. */
  max?: Triple
  /** Extra pull on the long tube while the pointer is over the closed telescope. */
  tease?: number
  /** How far the long tube gives (negative = in) while it is pressed, before the pull. */
  press?: number
  reducedMotion?: boolean
  /** Called when a tube knocks against a stop hard enough to hear, with a strength from 0 to 1. */
  onStop?: (strength: number) => void
}

export const OPEN_STIFFNESS = 150
export const CLOSE_STIFFNESS = 170
/** Fraction of critical damping: a touch under 1 keeps the pull lively without wobble. */
export const DAMPING_RATIO = 0.62
/** How much speed a tube keeps when it knocks against a stop. */
export const RESTITUTION = 0.26
/** Slowest knock, in px per second, that still makes a click. */
export const CLICK_SPEED = 40
/** Tubes are driven this far past a stop, so they really knock against it instead of easing up to it. */
export const DRIVE = 5

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

export class TelescopeEngine {
  d: Triple
  v: Triple = [0, 0, 0]
  rest: Triple
  max: Triple
  tease: number
  pressDepth: number
  reducedMotion: boolean
  onStop?: (strength: number) => void
  isOpen = false
  hover = false
  press = false
  /** Which tubes are moving. A pull starts at the long tube; it takes the next one along when it is most of the way. */
  private go: [boolean, boolean, boolean] = [true, true, true]

  constructor(o: EngineOptions = {}) {
    this.rest = o.rest ?? [0, 0, 118]
    this.max = o.max ?? [15, 15, 300]
    this.tease = o.tease ?? 10
    this.pressDepth = o.press ?? -7
    this.reducedMotion = o.reducedMotion ?? false
    this.onStop = o.onStop
    this.d = [...this.rest]
  }

  /** New sizes (after a resize). A settled telescope jumps to the new pose; a moving one carries on towards it. */
  setGeometry(rest: Triple, max: Triple) {
    const wasSettled = this.settled
    this.rest = [...rest]
    this.max = [...max]
    for (let k = 0; k < 3; k++) this.d[k] = Math.min(this.d[k], this.max[k])
    if (wasSettled) this.settle()
  }

  /** Where the spring pulls tube k: past a stop when the tube is headed for one. */
  goal(k: number) {
    if (this.isOpen) return this.max[k] + DRIVE
    if (this.rest[k] === 0) return -DRIVE
    return this.rest[k] + (k === 2 && this.hover ? this.tease : 0) + (k === 2 && this.press ? this.pressDepth : 0)
  }
  /** Where tube k comes to rest: its goal, held by the stops. */
  target(k: number) {
    return Math.max(0, Math.min(this.max[k], this.goal(k)))
  }

  /** 0 at rest, 1 fully out: how far the long tube is along its pull. */
  get progress() {
    const span = this.max[2] - this.rest[2]
    return span ? clamp01((this.d[2] - this.rest[2]) / span) : 1
  }

  /** How far tube k is from rest towards open, 0 to 1. */
  private prog(k: number) {
    const span = this.max[k] - this.rest[k]
    return span ? (this.d[k] - this.rest[k]) / span : 1
  }

  /** Returns false when nothing changed. */
  setOpen(open: boolean) {
    if (open === this.isOpen) return false
    this.isOpen = open
    this.hover = false
    this.press = false
    this.go = [false, false, true]
    if (this.reducedMotion) this.settle()
    return true
  }

  /** Hover and press only move a closed telescope. Returns false when nothing changed. */
  setHover(on: boolean) {
    if (this.isOpen || on === this.hover) return false
    this.hover = on
    this.idleMove()
    return true
  }
  setPress(on: boolean) {
    if (this.isOpen || on === this.press) return false
    this.press = on
    this.idleMove()
    return true
  }
  private idleMove() {
    if (this.reducedMotion) return this.settle()
    // small moves need no chain; a pull or push already under way keeps its order
    if (this.settled) this.go = [true, true, true]
  }

  /** Jump to the target pose with no motion. */
  settle() {
    for (let k = 0; k < 3; k++) {
      this.d[k] = this.target(k)
      this.v[k] = 0
    }
    this.go = [true, true, true]
  }

  get settled() {
    return this.go.every(Boolean) && [0, 1, 2].every((k) => this.d[k] === this.target(k) && this.v[k] === 0)
  }

  /** Advance by dt seconds. Returns true while anything still moves. */
  step(dt: number) {
    dt = Math.min(0.032, Math.max(0, dt))
    if (this.reducedMotion) {
      this.settle()
      return false
    }
    const K = this.isOpen ? OPEN_STIFFNESS : CLOSE_STIFFNESS
    const C = 2 * Math.sqrt(K) * DAMPING_RATIO
    let busy = false
    for (const k of [2, 1, 0]) {
      if (!this.go[k]) continue
      const goal = this.goal(k)
      const target = this.target(k)
      // four substeps keep the hard stops crisp at low frame rates
      const h = dt / 4
      for (let s = 0; s < 4; s++) {
        this.v[k] += (K * (goal - this.d[k]) - C * this.v[k]) * h
        this.d[k] += this.v[k] * h
        // a tube can't run past its ring or back past fully nested: it knocks and rebounds a little
        if (this.d[k] > this.max[k]) {
          if (this.v[k] > CLICK_SPEED) this.onStop?.(Math.min(1, this.v[k] / 900))
          this.d[k] = this.max[k]
          this.v[k] = -this.v[k] * RESTITUTION
        }
        if (this.d[k] < 0) {
          if (this.v[k] < -CLICK_SPEED) this.onStop?.(Math.min(1, -this.v[k] / 900) * 0.8)
          this.d[k] = 0
          this.v[k] = -this.v[k] * RESTITUTION
        }
      }
      if (Math.abs(target - this.d[k]) > 0.15 || Math.abs(this.v[k]) > 2) busy = true
      else {
        this.d[k] = target
        this.v[k] = 0
      }
    }
    // the chain: opening, each tube takes the next when it is most of the way out; closing, when it is nearly home
    if (this.isOpen) {
      if (!this.go[1] && this.prog(2) > 0.9) this.go[1] = true
      if (!this.go[0] && this.prog(1) > 0.6) this.go[0] = true
    } else {
      if (!this.go[1] && this.prog(2) < 0.1) this.go[1] = true
      if (!this.go[0] && this.prog(1) < 0.4) this.go[0] = true
    }
    return busy || !this.go[0] || !this.go[1]
  }
}
