export default class Loop {
  static readonly DEFAULT_UPDATE_FPS: number = 30
  static readonly DEFAULT_RENDER_FPS: number = 30

  static readonly PERFORMANCE_SAMPLE_RATE_MS: number = 200
  static readonly MAX_CATCHUP_MS: number = 2000

  private updateFPS: number = Loop.DEFAULT_UPDATE_FPS
  private renderFPS: number = Loop.DEFAULT_RENDER_FPS

  private _updateInterval: number = 1000 / Loop.DEFAULT_UPDATE_FPS
  private _renderInterval: number = 1000 / Loop.DEFAULT_RENDER_FPS
  private tickInterval: number = Math.max(this._updateInterval, this._renderInterval)

  private lastSampleTime: number = 0
  private lastFrameTime: number = 0
  private lastTickTime: number = 0

  private isTicking: boolean = false
  private pauseCounter: number = 0

  private updateFrameCount: number = 0
  private renderFrameCount: number = 0
  private elapsedUpdateTime: number = 0
  private elapsedRenderTime: number = 0
  private updateTime: number = 0
  private renderTime: number = 0

  private currentFPS: { update: number; render: number } = { update: 0, render: 0 }
  private currentUsage: { update: number; render: number } = { update: 0, render: 0 }

  private metrics: {
    usage: { update: number[]; render: number[] }
    fps: { update: number[]; render: number[] }
  } = { usage: { update: [], render: [] }, fps: { update: [], render: [] } }

  private metricsIndex: number = 0
  private metricsWindowSize: number = 5
  private smoothingFactor: number = 1
  private samplingInterval: number | null = null

  constructor() {
    for (let i = 0; i < this.metricsWindowSize; i++) {
      this.metrics.usage.update.push(0)
      this.metrics.usage.render.push(0)
      this.metrics.fps.update.push(this.updateFPS)
      this.metrics.fps.render.push(this.renderFPS)
    }
    this.setFPS(this.updateFPS, this.renderFPS)
  }

  protected reset(): void {
    this.lastFrameTime = 0
    this.lastTickTime = 0
    this.tickInterval = 0

    this.isTicking = false
    this.pauseCounter = 0

    this.updateFrameCount = 0
    this.updateTime = 0
    this.elapsedUpdateTime = 0

    this.renderFrameCount = 0
    this.renderTime = 0
    this.elapsedRenderTime = 0

    this.currentFPS.update = 0
    this.currentFPS.render = 0
    this.currentUsage.update = 0
    this.currentUsage.render = 0

    this.metrics = {
      usage: { update: [], render: [] },
      fps: { update: [], render: [] }
    }
    for (let i = 0; i < this.metricsWindowSize; i++) {
      this.metrics.usage.update.push(0)
      this.metrics.usage.render.push(0)
      this.metrics.fps.update.push(this.updateFPS)
      this.metrics.fps.render.push(this.renderFPS)
    }
    this.metricsIndex = 0

    console.log('loop 💎 reset')
  }

  private calculateRollingAverage(average: number[], value: number): number {
    average[this.metricsIndex % this.metricsWindowSize] = value
    let sum = 0
    for (let i = 0; i < this.metricsWindowSize; i++) {
      sum += average[i]
    }
    return Math.round((sum / this.metricsWindowSize) * this.smoothingFactor * 100) / 100
  }

  protected tick(): void {
    const now = performance.now()
    const timeDiff = now - this.lastTickTime
    this.lastTickTime = now

    if (this.pauseCounter === 0) {
      const cappedTimeDiff = Math.min(timeDiff, Loop.MAX_CATCHUP_MS)
      this.elapsedUpdateTime += cappedTimeDiff
      this.elapsedRenderTime += cappedTimeDiff
    }

    const updateStart = performance.now()
    while (this.updateTime < this.elapsedUpdateTime) {
      this._update(this.updateTime, this._updateInterval)
      this.updateTime += this._updateInterval
      this.updateFrameCount++
    }

    const renderStart = performance.now()
    const updateTimeUsed = renderStart - updateStart

    const oldRenderTime = this.renderTime
    while (this.renderTime < this.elapsedRenderTime) {
      this.renderTime += this._renderInterval
    }

    if (this.renderTime > oldRenderTime || this.pauseCounter !== 0) {
      const deltaTime = this.renderTime - this.updateTime
      this._render(this.elapsedUpdateTime, deltaTime, deltaTime / this._updateInterval)
      this.renderFrameCount++
    }
    const renderTimeUsed = performance.now() - renderStart

    this.currentUsage.update = this.calculateRollingAverage(
      this.metrics.usage.update,
      updateTimeUsed / this._updateInterval
    )

    this.currentUsage.render = this.calculateRollingAverage(
      this.metrics.usage.render,
      renderTimeUsed / this._renderInterval
    )

    this.metricsIndex = (this.metricsIndex + 1) % this.metricsWindowSize
  }

  protected frameTick = (): void => {
    if (!this.isTicking) {
      return
    }
    this.lastFrameTime = performance.now()
    this.tick()
    window.requestAnimationFrame(this.frameTick)
  }

  protected intervalTick = (): void => {
    if (!this.isTicking) {
      return
    }
    if (performance.now() - this.lastFrameTime > this.tickInterval) {
      this.tick()
    }
    this.smoothingFactor = Math.min(
      1,
      Loop.PERFORMANCE_SAMPLE_RATE_MS / Math.max(performance.now() - this.lastSampleTime, 0.1)
    )

    this.currentFPS.update = this.calculateRollingAverage(
      this.metrics.fps.update,
      this.updateFrameCount * this.metricsWindowSize
    )

    this.currentFPS.render = this.calculateRollingAverage(
      this.metrics.fps.render,
      this.renderFrameCount * this.metricsWindowSize
    )

    this.updateFrameCount = 0
    this.renderFrameCount = 0

    this.lastSampleTime = performance.now()
  }

  /* c8 ignore next */
  protected _update(t: number, d: number): void {}

  /* c8 ignore next */
  protected _render(t: number, dt: number, u: number): void {}

  get isRunning(): boolean {
    return this.isTicking
  }

  get isPaused(): boolean {
    return this.pauseCounter > 0
  }

  setFPS(updateFPS: number, renderFPS: number): void {
    if (updateFPS < 1) {
      updateFPS = 1
    }
    if (renderFPS < 1) {
      renderFPS = 1
    }
    this.updateFPS = updateFPS
    this.renderFPS = renderFPS
    this._updateInterval = Math.ceil(1000 / updateFPS)
    this._renderInterval = Math.floor(1000 / renderFPS)
    this.tickInterval = Math.max(this._updateInterval, this._renderInterval)

    console.log(`loop ⏳ fps reset u=${updateFPS} r=${renderFPS}`)
  }

  getFPS(): { update: number; render: number } {
    return this.currentFPS
  }

  getUsage(): { update: number; render: number } {
    return this.currentUsage
  }

  getTime(smooth: boolean = true): number {
    return smooth ? this.elapsedUpdateTime : this.updateTime
  }

  protected start(): void {
    if (this.isTicking) {
      return
    }

    this.isTicking = true

    const now = performance.now()

    this.lastSampleTime = now
    this.samplingInterval = window.setInterval(this.intervalTick, Loop.PERFORMANCE_SAMPLE_RATE_MS)

    this.reset()
    this.isTicking = true

    this.lastTickTime = now
    this.lastFrameTime = now

    console.log(`loop 🟢 started`)

    this.frameTick()
    this.intervalTick()
  }

  protected stop(): void {
    if (!this.isTicking) {
      return
    }

    if (this.samplingInterval !== null) {
      window.clearInterval(this.samplingInterval)
      this.samplingInterval = null
    }

    this.isTicking = false

    console.log('loop 🔴 stopped')

    this.reset()
  }

  get updateInterval(): number {
    return this._updateInterval
  }

  get renderInterval(): number {
    return this._renderInterval
  }

  pause(): void {
    this.pauseCounter++
    console.log(`loop 🟡 paused`)
  }

  resume(): void {
    this.pauseCounter = Math.max(this.pauseCounter - 1, 0)
    console.log(`loop 🔵 resuming`)
  }
}
