export default class MockWebSocket extends EventTarget implements WebSocket {
  static instances: MockWebSocket[] = []

  readonly url: string

  onopen: ((this: WebSocket, ev: Event) => void) | null = null
  onmessage: ((this: WebSocket, ev: MessageEvent) => void) | null = null
  onerror: ((this: WebSocket, ev: Event) => void) | null = null
  onclose: ((this: WebSocket, ev: CloseEvent) => void) | null = null

  binaryType: BinaryType = 'blob'
  readonly bufferedAmount: number = 0
  readonly extensions: string = ''
  readonly protocol: string = ''
  readyState: number = 0

  readonly CONNECTING = 0
  readonly OPEN = 1
  readonly CLOSING = 2
  readonly CLOSED = 3

  sentData: any[] = []

  constructor(url: string) {
    super()
    this.url = url
    MockWebSocket.instances.push(this)
  }

  send(data: any) {
    this.sentData.push(data)
  }

  close() {
    this.readyState = this.CLOSED
    const event = new CloseEvent('close')
    this.onclose?.call(this as unknown as WebSocket, event)
    this.dispatchEvent(event)
  }

  triggerOpen() {
    this.readyState = this.OPEN
    const event = new Event('open')
    this.onopen?.call(this as unknown as WebSocket, event)
    this.dispatchEvent(event)
  }

  triggerMessage(data: any) {
    const event = new MessageEvent('message', { data })
    this.onmessage?.call(this as unknown as WebSocket, event)
    this.dispatchEvent(event)
  }

  triggerError() {
    const event = new Event('error')
    this.onerror?.call(this as unknown as WebSocket, event)
    this.dispatchEvent(event)
  }

  triggerClose() {
    this.readyState = this.CLOSED
    const event = new CloseEvent('close')
    this.onclose?.call(this as unknown as WebSocket, event)
    this.dispatchEvent(event)
  }
}
