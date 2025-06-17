import { describe, it, expect, beforeEach } from 'vitest'
import Ring from './Ring' // adjust path as needed

describe('Ring buffer', () => {
  let ring: Ring<number>

  beforeEach(() => {
    ring = new Ring(3) // rounded up to 4
  })

  it('should round size to next power of two', () => {
    const r = new Ring(3)
    r.put(1)
    r.put(2)
    r.put(3)
    r.put(4) // should wrap

    expect(r.get()).toBe(1)
    expect(r.get()).toBe(2)
    expect(r.get()).toBe(3)
    expect(r.get()).toBe(4)
    expect(r.get()).toBeNull()
  })

  it('should put and get values in FIFO order', () => {
    ring.put(10)
    ring.put(20)
    expect(ring.get()).toBe(10)
    expect(ring.get()).toBe(20)
    expect(ring.get()).toBeNull()
  })

  it('should support peek without removing', () => {
    ring.put(42)
    expect(ring.peek()).toBe(42)
    expect(ring.peek()).toBe(42)
    expect(ring.get()).toBe(42)
    expect(ring.peek()).toBeNull()
  })

  it('should wrap around and overwrite old values when full', () => {
    for (let i = 0; i < 8; i++) {
      ring.put(i)
    }

    // Only last 4 values should be in the ring
    expect(ring.get()).toBe(4)
    expect(ring.get()).toBe(5)
    expect(ring.get()).toBe(6)
    expect(ring.get()).toBe(7)
    expect(ring.get()).toBeNull()
  })

  it('should report empty correctly', () => {
    expect(ring.isEmpty()).toBe(true)
    ring.put(1)
    expect(ring.isEmpty()).toBe(false)
    ring.get()
    expect(ring.isEmpty()).toBe(true)
  })

  it('should clear the buffer', () => {
    ring.put(1)
    ring.put(2)
    ring.clear()
    expect(ring.isEmpty()).toBe(true)
    expect(ring.get()).toBeNull()
  })

  it('should behave correctly when size = 1', () => {
    const single = new Ring<number>(1)
    expect(single.isEmpty()).toBe(true)

    single.put(100)
    expect(single.isEmpty()).toBe(false)
    expect(single.peek()).toBe(100)
    expect(single.get()).toBe(100)

    expect(single.get()).toBeNull()

    single.put(200)
    single.put(300)
    expect(single.get()).toBe(300)
    expect(single.get()).toBeNull()
  })
})
