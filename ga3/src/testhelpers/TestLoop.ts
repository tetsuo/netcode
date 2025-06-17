import { vi } from 'vitest'
import Loop from '../Loop'

export default class TestLoop extends Loop {
  updateSpy = vi.fn()
  renderSpy = vi.fn()

  start(): void {
    super.start()
  }

  stop(): void {
    super.stop()
  }

  reset(): void {
    super.reset()
  }

  tick(): void {
    super.tick()
  }

  public callIntervalTick(): void {
    this.intervalTick()
  }

  protected _update(t: number, d: number): void {
    this.updateSpy(t, d)
  }

  protected _render(t: number, dt: number, u: number): void {
    this.renderSpy(t, dt, u)
  }
}
