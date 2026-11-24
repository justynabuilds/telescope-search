import { test } from "node:test"
import assert from "node:assert/strict"
import { TelescopeEngine } from "../src/core/engine.ts"

const FRAME = 1 / 60
const run = (e: TelescopeEngine, seconds: number, each?: () => void) => {
  for (let t = 0; t < seconds; t += FRAME) {
    e.step(FRAME)
    each?.()
  }
}
const make = (o = {}) => new TelescopeEngine({ rest: [0, 0, 118], max: [15, 15, 300], ...o })

test("idle, only the long tube is out, by its rest length", () => {
  const e = make()
  assert.deepEqual(e.d, [0, 0, 118])
  assert.equal(e.progress, 0)
  assert.ok(e.settled)
})

test("opening pulls every tube to its stop and settles there", () => {
  const e = make()
  e.setOpen(true)
  run(e, 2)
  assert.deepEqual(e.d, [15, 15, 300])
  assert.equal(e.progress, 1)
  assert.ok(e.settled)
})

test("opening is a chain: the long tube first, the collars only once it is most of the way", () => {
  const e = make()
  e.setOpen(true)
  let collarStartedAt = -1
  run(e, 2, () => {
    if (collarStartedAt < 0 && e.d[1] > 0.01) collarStartedAt = e.progress
  })
  assert.ok(collarStartedAt > 0.85, `collar started at ${collarStartedAt}`)
})

test("hard stops: no tube ever runs past its ring or below fully nested", () => {
  const e = make()
  let over = 0
  let under = 0
  const watch = () => e.d.forEach((x, k) => { over = Math.max(over, x - e.max[k]); under = Math.min(under, x) })
  e.setOpen(true)
  run(e, 2, watch)
  e.setOpen(false)
  run(e, 2, watch)
  assert.equal(over, 0)
  assert.equal(under, 0)
})

test("each stop knocks with a click, collars included", () => {
  const knocks: number[] = []
  const e = make({ onStop: (s: number) => knocks.push(s) })
  e.setOpen(true)
  run(e, 2)
  assert.ok(knocks.length >= 3, `${knocks.length} knocks`)
  assert.ok(knocks.every((s) => s > 0 && s <= 1))
})

test("closing goes back to the idle pose, collars after the long tube", () => {
  const e = make()
  e.setOpen(true)
  run(e, 2)
  e.setOpen(false)
  let tubeHomeFirst = true
  run(e, 2.5, () => {
    if (e.d[1] < 15 - 0.01 && e.progress > 0.1) tubeHomeFirst = false
  })
  assert.ok(tubeHomeFirst)
  assert.deepEqual(e.d, [0, 0, 118])
  assert.ok(e.settled)
})

test("hover pulls the closed tube a little; press pushes it in", () => {
  const e = make()
  e.setHover(true)
  run(e, 1)
  assert.equal(e.d[2], 128)
  e.setPress(true)
  run(e, 1)
  assert.equal(e.d[2], 121)
  e.setPress(false)
  e.setHover(false)
  run(e, 1)
  assert.equal(e.d[2], 118)
})

test("hover and press do nothing while open", () => {
  const e = make()
  e.setOpen(true)
  run(e, 2)
  assert.equal(e.setHover(true), false)
  assert.equal(e.setPress(true), false)
  run(e, 0.5)
  assert.deepEqual(e.d, [15, 15, 300])
})

test("reduced motion jumps straight to the pose", () => {
  const e = make({ reducedMotion: true })
  e.setOpen(true)
  assert.deepEqual(e.d, [15, 15, 300])
  assert.equal(e.step(FRAME), false)
  e.setOpen(false)
  assert.deepEqual(e.d, [0, 0, 118])
})

test("new geometry: a settled telescope takes the new pose at once", () => {
  const e = make()
  e.setOpen(true)
  run(e, 2)
  e.setGeometry([0, 0, 100], [15, 15, 200])
  assert.deepEqual(e.d, [15, 15, 200])
  assert.ok(e.settled)
})

test("a long frame is capped, so a stall never throws a tube through its stop", () => {
  const e = make()
  e.setOpen(true)
  e.step(5)
  assert.ok(e.d[2] <= 300 && e.d[2] > 118)
})
