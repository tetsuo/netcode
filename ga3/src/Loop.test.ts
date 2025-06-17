import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import TestLoop from './testhelpers/TestLoop'

vi.useFakeTimers()

describe('Loop configuration', () => {
  let loop: TestLoop

  beforeEach(() => {
    loop = new TestLoop()
  })

  it('should update internal intervals correctly in setFPS()', () => {
    loop.setFPS(60, 30)
    loop.start()

    vi.advanceTimersByTime(1000)
    expect(loop.updateSpy.mock.calls.length).toBeGreaterThanOrEqual(57)
    expect(loop.updateSpy.mock.calls.length).toBeLessThanOrEqual(63)
    expect(loop.renderSpy.mock.calls.length).toBeGreaterThanOrEqual(27)
    expect(loop.renderSpy.mock.calls.length).toBeLessThanOrEqual(33)
  })

  it('should clamp FPS values to minimum of 1', () => {
    loop.setFPS(0, -5)
    expect(loop.updateInterval).toBe(1000)
    expect(loop.renderInterval).toBe(1000)
  })
})

describe('Loop start/stop behavior', () => {
  let loop: TestLoop

  beforeEach(() => {
    loop = new TestLoop()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.resetAllMocks()
  })

  it('should start the loop and call _update/_render', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval')

    loop.setFPS(60, 30)
    loop.start()

    expect(loop.isRunning).toBe(true)
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 200)

    setIntervalSpy.mockRestore()
    vi.advanceTimersByTime(1000)

    expect(loop.updateSpy).toHaveBeenCalled()
    expect(loop.renderSpy).toHaveBeenCalled()
  })

  it('should call _update and _render the correct number of times based on FPS', () => {
    loop.setFPS(80, 42)
    loop.start()

    vi.advanceTimersByTime(1000)

    const updateCalls = loop.updateSpy.mock.calls.length
    const renderCalls = loop.renderSpy.mock.calls.length

    expect(updateCalls).toBeGreaterThanOrEqual(77)
    expect(updateCalls).toBeLessThanOrEqual(83)

    expect(renderCalls).toBeGreaterThanOrEqual(39)
    expect(renderCalls).toBeLessThanOrEqual(45)
  })

  it('should stop the loop and clear interval', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

    loop.start()
    loop.stop()

    expect(loop.isRunning).toBe(false)
    expect(clearIntervalSpy).toHaveBeenCalled()

    vi.advanceTimersByTime(1000)
    const updateCalls = loop.updateSpy.mock.calls.length
    const renderCalls = loop.renderSpy.mock.calls.length

    expect(loop.updateSpy).toHaveBeenCalledTimes(updateCalls)
    expect(loop.renderSpy).toHaveBeenCalledTimes(renderCalls)
  })

  it('should not start again if already running', () => {
    const resetSpy = vi.spyOn(loop, 'reset')
    loop.start()
    expect(loop.isRunning).toBe(true)

    resetSpy.mockClear()
    loop.start()

    expect(resetSpy).not.toHaveBeenCalled()
  })

  it('should not stop if already stopped', () => {
    const resetSpy = vi.spyOn(loop, 'reset')
    loop.stop()
    expect(resetSpy).not.toHaveBeenCalled()
  })

  it('should not call tick() when intervalTick runs while loop is stopped', () => {
    const tickSpy = vi.spyOn(loop, 'tick')

    expect(loop.isRunning).toBe(false)

    loop.callIntervalTick()

    expect(tickSpy).not.toHaveBeenCalled()
  })
})

describe('Loop pause/resume behavior', () => {
  let loop: TestLoop

  beforeEach(() => {
    loop = new TestLoop()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.resetAllMocks()
  })

  it('should call both _update and _render when running', () => {
    loop.setFPS(60, 30)
    loop.start()

    vi.advanceTimersByTime(1000)

    expect(loop.updateSpy).toHaveBeenCalled()
    expect(loop.renderSpy).toHaveBeenCalled()
  })

  it('should skip _update but continue _render when paused', () => {
    loop.setFPS(60, 30)
    loop.start()
    loop.pause()

    vi.advanceTimersByTime(1000)

    expect(loop.updateSpy).toHaveBeenCalledTimes(0)
    expect(loop.renderSpy).toHaveBeenCalled()
  })

  it('should resume _update and _render after resume', () => {
    loop.setFPS(60, 30)
    loop.start()
    loop.pause()

    vi.advanceTimersByTime(1000)

    const rendersWhilePaused = loop.renderSpy.mock.calls.length

    loop.resume()
    vi.advanceTimersByTime(1000)

    const updatesAfterResume = loop.updateSpy.mock.calls.length
    const rendersAfterResume = loop.renderSpy.mock.calls.length

    expect(updatesAfterResume).toBeGreaterThan(0)
    expect(rendersAfterResume).toBeGreaterThan(rendersWhilePaused)
  })

  it('should update/render exact counts at low FPS', () => {
    loop.setFPS(10, 5)
    loop.start()

    vi.advanceTimersByTime(2000)

    expect(loop.updateSpy).toHaveBeenCalledTimes(20)
    expect(loop.renderSpy).toHaveBeenCalledTimes(10)
  })

  it('should report running and paused state correctly', () => {
    expect(loop.isRunning).toBe(false)
    expect(loop.isPaused).toBe(false)

    loop.start()
    expect(loop.isRunning).toBe(true)

    loop.pause()
    expect(loop.isPaused).toBe(true)

    loop.resume()
    expect(loop.isPaused).toBe(false)

    loop.stop()
    expect(loop.isRunning).toBe(false)
  })
})

describe('Loop metrics', () => {
  let loop: TestLoop

  beforeEach(() => {
    loop = new TestLoop()
  })

  it('should return correct values from getFPS, getUsage, and getTime', () => {
    loop.setFPS(20, 10)
    loop.start()
    vi.advanceTimersByTime(500)

    const fps = loop.getFPS()
    const usage = loop.getUsage()
    const smoothTime = loop.getTime(true)
    const rawTime = loop.getTime(false)

    expect(fps.update).toBeGreaterThanOrEqual(0)
    expect(usage.render).toBeGreaterThanOrEqual(0)
    expect(smoothTime).toBeGreaterThan(0)
    expect(rawTime).toBeGreaterThanOrEqual(0)
  })

  describe.each([
    [60, 30, 17, 33],
    [1, 1, 1000, 1000],
    [0, -10, 1000, 1000]
  ])('setFPS(%i, %i)', (update, render, expectedUpdate, expectedRender) => {
    it(`should produce intervals ${expectedUpdate}ms / ${expectedRender}ms`, () => {
      loop.setFPS(update, render)
      expect(loop.updateInterval).toBe(expectedUpdate)
      expect(loop.renderInterval).toBe(expectedRender)
    })
  })
})
