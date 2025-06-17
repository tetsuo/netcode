export default class Connection {
  private _endpoint: string
  private _protocol: string
  private _loop: number = -1

  private sock: WebSocket | null = null
  private disposed: boolean = false
  private info: [number, number, number, number] | null = null

  private input: Uint8Array = new Uint8Array(2)

  onclose: ((ev: CloseEvent) => void) | null = null
  onerror: ((err: Error) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onopen: ((info: [number, number, number, number]) => void) | null = null

  constructor(endpoint: string, loop: number, secure: boolean) {
    if (secure) {
      this._protocol = 's:'
    } else {
      this._protocol = ':'
    }
    this._endpoint = endpoint
    this._loop = loop
  }

  private _onopen = (): void => {
    // eslint-disable-next-line no-console
    console.log(`conn 🟢 joined loop #${this._loop}`)

    if (this.onopen !== null && this.info !== null) {
      this.onopen(this.info)
      this.info = null
    }
  }

  private _onerror = (): void => {
    // eslint-disable-next-line no-console
    console.log(`conn ❌ failed to join loop #${this._loop}`)

    if (this.onerror !== null) {
      this.onerror(new Error('unexpected socket error'))
    }
  }

  private _onclose = (e: CloseEvent): void => {
    // eslint-disable-next-line no-console
    console.log(`conn 🔴 left loop #${this._loop}`)

    if (this.onclose !== null) {
      this.onclose(e)
    }
  }

  send(tick: number, keys: number): void {
    if (tick >= 2048) {
      throw new Error('tick too big')
    }

    // Pre-mask keys to ensure only lower 5 bits are used
    keys &= 31
    const f = tick >> 8 // Extract top 3 bits
    this.input[0] = keys | (f << 5)
    this.input[1] = tick & 255
    this.sock!.send(this.input)
  }

  close(): void {
    if (this.sock !== null) {
      this.sock.close()
    }
  }

  onfetch = (res: Response): Promise<void> | void => {
    if (this.disposed) {
      return
    }
    if (!res.ok) {
      return Promise.reject(`HTTP ${res.status}`)
    }
    return res.json().then(info => {
      if (this.disposed) {
        return
      }

      // eslint-disable-next-line no-console
      console.log(`conn 🔌 joining loop #${this._loop}`)

      const url = `ws${this._protocol}//${this._endpoint}/g/${this._loop}`
      this.sock = new WebSocket(url)
      this.sock.binaryType = 'arraybuffer'
      this.info = info
      this.sock.onopen = this._onopen
      this.sock.onmessage = this.onmessage
      this.sock.onerror = this._onerror
      this.sock.onclose = this._onclose
    })
  }

  open(): void {
    if (this.disposed) {
      return
    }

    const url = `http${this._protocol}//${this._endpoint}/i/${this._loop}`

    // eslint-disable-next-line no-console
    console.log(`conn 📡 fetching info for loop #${this._loop}`)

    fetch(url)
      .then(this.onfetch)
      .catch(err => {
        if (this.disposed) {
          return
        }
        if (this.onerror !== null) {
          this.onerror(new Error(`fetch: ${err.message} (url=${url})`))
        }
      })
  }

  dispose(): void {
    this.disposed = true
    if (this.sock) {
      this.sock.onopen = null
      this.sock.onmessage = null
      this.sock.onerror = null
      this.sock.onclose = null
    }
    this.onopen = null
    this.onmessage = null
    this.onerror = null
    this.onclose = null
    this.sock = null
    this._endpoint = ''
    this._protocol = ''
    this._loop = -1
    this.info = null

    // eslint-disable-next-line no-console
    console.log(`conn ☠️ disposed`)
  }

  get protocol(): string {
    return this._protocol
  }

  get endpoint(): string {
    return this._endpoint
  }

  get loop(): number {
    return this._loop
  }
}
