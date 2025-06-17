export type KeyState = [
  boolean, // Right
  boolean, // Left
  boolean, // Down
  boolean, // Up
  boolean // Space
]

export const KeyRight = 0
export const KeyLeft = 1
export const KeyDown = 2
export const KeyUp = 3
export const KeySpace = 4

export default class Keyboard {
  private static readonly KEYS: { [key: string]: number } = {
    ArrowRight: 0,
    KeyD: 0,
    ArrowLeft: 1,
    KeyA: 1,
    ArrowDown: 2,
    KeyS: 2,
    ArrowUp: 3,
    KeyW: 3,
    Space: 4
  }

  private isListening: boolean = false

  state: number = 0

  private keyEventHandler(isPressed: boolean) {
    return (event: KeyboardEvent) => {
      const b = Keyboard.KEYS[event.code]
      if (b === undefined) {
        return
      }
      if (isPressed) {
        this.state |= 1 << b
      } else {
        this.state &= ~(1 << b)
      }
    }
  }

  private handleKeyDown = this.keyEventHandler(true)

  private handleKeyUp = this.keyEventHandler(false)

  addEventListeners(): void {
    if (this.isListening) {
      return
    }
    this.isListening = true
    document.addEventListener('keydown', this.handleKeyDown)
    document.addEventListener('keyup', this.handleKeyUp)
    // eslint-disable-next-line no-console
    console.log(`kb 🟢 started`)
  }

  removeEventListeners(): void {
    if (!this.isListening) {
      return
    }
    this.isListening = false
    document.removeEventListener('keydown', this.handleKeyDown)
    document.removeEventListener('keyup', this.handleKeyUp)
    // eslint-disable-next-line no-console
    console.log(`kb 🔴 stopped`)
  }

  read(b: KeyState): void {
    b[0] = (this.state & (1 << 0)) !== 0 // Right
    b[1] = (this.state & (1 << 1)) !== 0 // Left
    b[2] = (this.state & (1 << 2)) !== 0 // Down
    b[3] = (this.state & (1 << 3)) !== 0 // Up
    b[4] = (this.state & (1 << 4)) !== 0 // Space
  }

  reset(): void {
    this.state = 0
    // eslint-disable-next-line no-console
    console.log('kb 💎 reset')
  }
}
