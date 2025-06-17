import Keyboard from './Keyboard'
import Ring from './Ring'
import Loop from './Loop'
import Connection from './Connection'

export const enum ConnectionState {
  Idle = 0,
  Opening = 1,
  Opened = 2,
  Closing = 3
}

export const enum ActionType {
  Join = 0,
  Part = 1
}

type Action = { type: ActionType; loopId?: number }

export default class Client extends Loop {
  private static readonly ACTION_QUEUE_SIZE = 16

  private readonly endpoint: string
  private readonly tlsEnabled: boolean

  private readonly actionsPending = new Ring<Action>(Client.ACTION_QUEUE_SIZE)
  private readonly keyboard: Keyboard = new Keyboard()

  private connection: Connection | null = null
  private connectionState: ConnectionState = ConnectionState.Idle

  private loopId = -1
  private keyState: number = 0
  private targetTick: number = 1 << 11

  constructor(endpoint: string, tlsEnabled: boolean) {
    super()
    this.endpoint = endpoint
    while (this.endpoint.endsWith('/')) {
      this.endpoint = this.endpoint.slice(0, -1)
    }
    this.tlsEnabled = tlsEnabled
  }

  getLoopId(): number {
    return this.loopId
  }

  part(): void {
    console.log('client 🟡 queued: part')
    this.actionsPending.put({ type: ActionType.Part })
    this._processNextAction()
  }

  join(loopId: number): void {
    if (!Number.isInteger(loopId)) {
      return
    }
    console.log(`client 🟡 queued: join #${loopId}`)
    this.actionsPending.put({ type: ActionType.Join, loopId })
    this._processNextAction()
  }

  protected _join(loopId: number, tickRate: number, logicRate: number, syncRate: number, randomSeed: number): void {
    console.log(
      `client 🟢 executed: join #${loopId} (tr=${tickRate} lr=${logicRate} sr=${syncRate} seed=${randomSeed})`
    )
  }

  protected _part(loopId: number, e: CloseEvent): void {
    console.log(`client 🔴 executed: part #${loopId} (ok=${e.wasClean} code=${e.code})`)
  }

  protected _message(e: MessageEvent): void {
    console.log('client 💬 data:', new Uint8Array(e.data).toString())
  }

  protected _update(t: number, d: number): void {
    // console.log('client _UPDATE', t, d)
    if (t >= this.targetTick) {
      this.targetTick = this.targetTick << 1
    }
    if (this.keyboard.state !== this.keyState) {
      this.keyState = this.keyboard.state
      printTimeWithMilliseconds('Sending tick: ' + t)

      this.connection!.send(2048 - (this.targetTick - t), this.keyboard.state)
    }
    return
  }

  private onopen = ([randomSeed, tickRate, logicRate, syncRate]: [number, number, number, number]): void => {
    this.connectionState = ConnectionState.Opened
    this._join(this.loopId, tickRate, logicRate, syncRate, randomSeed)
    this.keyboard.reset()
    this.keyboard.addEventListeners()
    super.setFPS(tickRate, 30)
    super.start()
    this._processNextAction()
  }

  private ondata = (e: MessageEvent): void => {
    this._message(e)
  }

  private onerror = (err: Error): void => {
    console.warn(`client ❌ error: ${err.message}`)
    this.disposeConnection()
  }

  private onclose = (e: CloseEvent): void => {
    this._part(this.loopId, e)
    this.disposeConnection()
  }

  private disposeConnection(): void {
    console.log('client 💎 resetting...')
    super.stop()
    this.connectionState = ConnectionState.Idle
    if (this.connection) {
      this.connection.dispose()
    }
    this.connection = null
    this.keyboard.removeEventListeners()
    this.keyState = 0
    this.targetTick = 1 << 11
    this._processNextAction()
  }

  private _processNextAction(): void {
    while (true) {
      if (this.actionsPending.isEmpty()) {
        return
      }

      const nextAction = this.actionsPending.peek()
      if (!nextAction) {
        return
      }

      let processed = false

      if (nextAction.type === ActionType.Join && nextAction.loopId !== undefined) {
        switch (this.connectionState) {
          case ConnectionState.Idle:
            this.actionsPending.get() // remove the join action
            console.log(`client 📡 connecting to #${nextAction.loopId}...`)
            this.connectionState = ConnectionState.Opening
            this.loopId = nextAction.loopId
            this.connection = new Connection(this.endpoint, nextAction.loopId, this.tlsEnabled)
            this.connection.onopen = this.onopen
            this.connection.onmessage = this.ondata
            this.connection.onerror = this.onerror
            this.connection.onclose = this.onclose
            this.connection.open()
            processed = true
            break

          case ConnectionState.Opened:
            // Already connected; switch room
            console.log(`client 🔄 switching to #${nextAction.loopId}...`)
            this.actionsPending.get() // remove the join action
            // Enqueue a part action first, then re-enqueue this join
            this.actionsPending.put({ type: ActionType.Part })
            this.actionsPending.put({ type: ActionType.Join, loopId: nextAction.loopId })
            processed = true
            break

          case ConnectionState.Opening:
            console.log('client ⏳ waiting for connection to finish opening...')
            return

          case ConnectionState.Closing:
            console.log('client ⏳ waiting for connection to finish closing...')
            return
        }
      } else if (nextAction.type === ActionType.Part) {
        switch (this.connectionState) {
          case ConnectionState.Opened:
            this.actionsPending.get() // remove the part action

            // Stop the loop; no-op if not running
            this.keyboard.removeEventListeners()
            super.stop()

            console.log('client ⚠️ closing connection...')
            this.connectionState = ConnectionState.Closing
            this.connection?.close()
            processed = true
            break

          case ConnectionState.Idle:
            this.actionsPending.get() // remove the part action
            this.disposeConnection()
            processed = true
            break

          case ConnectionState.Opening:
            console.log('client ⏳ waiting for connection to finish opening before leaving...')
            return

          case ConnectionState.Closing:
            console.log('client ⏳ already closing, will wait...')
            return
        }
      }

      if (!processed) {
        return
      }
    }
  }
}

function printTimeWithMilliseconds(msg: string) {
  const now = new Date()
  const milliseconds = now.getMilliseconds().toString().padStart(3, '0')
  const timeString = now.toLocaleTimeString('en-US', { hour12: false }) + '.' + milliseconds
  console.log(`${timeString} ${msg}`)
}
