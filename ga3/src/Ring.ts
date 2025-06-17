export default class Ring<T> {
  private size: number
  private mask: number
  private buffer: (T | null)[]
  private head: number
  private tail: number

  constructor(size: number) {
    this.size = nextPowerOfTwo(size)
    this.mask = this.size - 1
    this.buffer = new Array(this.size).fill(null)
    this.head = 0
    this.tail = 0
  }

  put(value: T) {
    this.buffer[this.head & this.mask] = value
    this.head++
  }

  get(): T | null {
    if (this.isEmpty()) {
      return null
    }
    const value = this.buffer[this.tail & this.mask]
    this.buffer[this.tail & this.mask] = null // Clear the slot
    this.tail++
    return value
  }

  peek(): T | null {
    if (this.isEmpty()) {
      return null
    }
    return this.buffer[this.tail & this.mask] // Just read; don't move tail
  }

  isEmpty(): boolean {
    return this.tail === this.head
  }

  clear() {
    this.head = this.tail = 0
    this.buffer.fill(null)
  }

  // Helpers:

  toArray(): T[] {
    const result: T[] = []
    const count = this.length
    for (let i = 0; i < count; i++) {
      const index = (this.tail + i) & this.mask
      const value = this.buffer[index]
      if (value !== null) {
        result.push(value)
      }
    }
    return result
  }

  get length(): number {
    return this.head - this.tail
  }
}

function nextPowerOfTwo(n: number): number {
  return n > 1 ? 1 << (32 - Math.clz32(n - 1)) : 1
}
