import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Keyboard, { KeyRight, KeyLeft, KeyUp, KeySpace, KeyState } from './Keyboard'

describe('Keyboard class', () => {
  let keyboard: Keyboard
  let state: KeyState

  beforeEach(() => {
    keyboard = new Keyboard()
    state = [false, false, false, false, false]
    keyboard.addEventListeners()
  })

  afterEach(() => {
    keyboard.removeEventListeners()
    keyboard.reset()
  })

  const pressKey = (code: string) => document.dispatchEvent(new KeyboardEvent('keydown', { code }))

  const releaseKey = (code: string) => document.dispatchEvent(new KeyboardEvent('keyup', { code }))

  it('should detect key press and release', () => {
    pressKey('ArrowRight')
    keyboard.read(state)
    expect(state[KeyRight]).toBe(true)

    releaseKey('ArrowRight')
    keyboard.read(state)
    expect(state[KeyRight]).toBe(false)
  })

  it('should handle multiple keys', () => {
    pressKey('KeyA')
    pressKey('Space')
    keyboard.read(state)
    expect(state[KeyLeft]).toBe(true)
    expect(state[KeySpace]).toBe(true)

    releaseKey('KeyA')
    keyboard.read(state)
    expect(state[KeyLeft]).toBe(false)
    expect(state[KeySpace]).toBe(true)
  })

  it('should reset state', () => {
    pressKey('KeyW')
    keyboard.read(state)
    expect(state[KeyUp]).toBe(true)

    keyboard.reset()
    keyboard.read(state)
    expect(state[KeyUp]).toBe(false)
  })

  it('should ignore undefined keys', () => {
    pressKey('KeyZ')
    keyboard.read(state)

    expect(state).toEqual([false, false, false, false, false])
  })

  it('should not add multiple event listeners if already listening', () => {
    const addSpy = vi.spyOn(document, 'addEventListener')

    const keyboard = new Keyboard()

    keyboard.addEventListeners()
    keyboard.addEventListeners() // should do nothing

    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('keyup', expect.any(Function))
    expect(addSpy).toHaveBeenCalledTimes(2)

    addSpy.mockRestore()
  })

  it('should not remove event listeners more than once', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')

    const keyboard = new Keyboard()
    keyboard.addEventListeners()
    keyboard.removeEventListeners() // first removal
    keyboard.removeEventListeners() //  should do nothing

    // Should only remove once per event type
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('keyup', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledTimes(2) // keydown + keyup

    removeSpy.mockRestore()
  })
})
