import { describe, it, expect, vi, beforeEach, afterAll, afterEach } from 'vitest'
import Connection from './Connection'
import MockWebSocket from './testhelpers/MockWebSocket'

describe('Connection', () => {
  const originalWebSocket = globalThis.WebSocket
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    MockWebSocket.instances.length = 0
    vi.clearAllMocks()
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket
    globalThis.fetch = originalFetch
  })

  afterEach(() => {
    MockWebSocket.instances.length = 0
  })

  afterAll(() => {
    globalThis.WebSocket = originalWebSocket
    globalThis.fetch = originalFetch
  })

  it('should set protocol to "s:" when secure is true', () => {
    const conn = new Connection('example.com', 42, true)
    expect(conn.protocol).toBe('s:')
    expect(conn.endpoint).toBe('example.com')
    expect(conn.loop).toBe(42)
  })

  it('should send correct byte format', async () => {
    const conn = new Connection('localhost', 0, false)
    const mockInfo = [1, 2, 3, 4]
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockInfo)
    })

    await conn.onfetch(await fetch(''))

    const ws = MockWebSocket.instances[0]
    ws.triggerOpen()

    conn.send(1023, 17)

    const sent = ws.sentData[0]
    expect(sent).toBeInstanceOf(Uint8Array)
    expect(sent.length).toBe(2)

    const tick = ((sent[0] & 0b11100000) << 3) | sent[1]
    const keys = sent[0] & 0b00011111

    expect(tick).toBe(1023)
    expect(keys).toBe(17)
  })

  it('should throw if tick too big', async () => {
    const conn = new Connection('x', 0, false)
    const mockInfo = [1, 2, 3, 4]
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockInfo)
    })

    await conn.onfetch(await fetch(''))

    const ws = MockWebSocket.instances[0]
    ws.triggerOpen()

    expect(() => conn.send(3000, 0)).toThrow('tick too big')
  })

  it('should call onopen after websocket opens', async () => {
    const conn = new Connection('host', 1, false)
    const info = [1, 2, 3, 4] as [number, number, number, number]

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(info)
    })
    globalThis.fetch = fetchMock

    const onopenSpy = vi.fn()
    conn.onopen = onopenSpy

    await conn.onfetch(await fetchMock())

    const ws = MockWebSocket.instances[0]
    expect(ws).toBeDefined()
    ws.triggerOpen()

    expect(onopenSpy).toHaveBeenCalledWith(info)
  })

  it('should reject onfetch if response is not OK', async () => {
    const conn = new Connection('host', 1, false)

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn()
    })
    globalThis.fetch = fetchMock

    await expect(conn.onfetch(await fetch(''))).rejects.toBe('HTTP 503')
  })

  it('should handle fetch error', async () => {
    const conn = new Connection('host', 1, false)
    const errSpy = vi.fn()
    conn.onerror = errSpy

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail'))

    conn.open()
    await new Promise(resolve => setTimeout(resolve, 0)) // wait microtask

    expect(errSpy).toHaveBeenCalledWith(expect.any(Error))
  })

  it('should dispose and null out handlers', async () => {
    const conn = new Connection('x', 1, false)
    const mockInfo = [1, 2, 3, 4]
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockInfo)
    })

    await conn.onfetch(await fetch(''))

    const ws = MockWebSocket.instances[0]
    ws.triggerOpen()

    conn.dispose()

    expect(ws.onopen).toBeNull()
    expect(ws.onmessage).toBeNull()
    expect(ws.onerror).toBeNull()
    expect(ws.onclose).toBeNull()
    expect(conn.onopen).toBeNull()
    expect(conn.onmessage).toBeNull()
    expect(conn.onerror).toBeNull()
    expect(conn.onclose).toBeNull()
  })

  it('should do nothing in onfetch if disposed', async () => {
    const conn = new Connection('host', 1, false)

    const info = [1, 2, 3, 4]
    const response = {
      ok: true,
      json: () => Promise.resolve(info)
    }

    conn.dispose()

    const wsSpy = vi.spyOn(globalThis, 'WebSocket')

    const result = conn.onfetch(response as Response)

    expect(result).toBeUndefined()
    expect(wsSpy).not.toHaveBeenCalled()

    wsSpy.mockRestore()
  })

  it('should trigger onclose when closed', async () => {
    const conn = new Connection('host', 1, false)
    const info = [1, 2, 3, 4]
    const onclose = vi.fn()
    conn.onclose = onclose

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(info)
    })

    await conn.onfetch(await fetch(''))

    conn.close()

    expect(onclose).toHaveBeenCalled()
  })

  it('should call onerror with "unexpected socket error" when socket errors', async () => {
    const conn = new Connection('host', 1, false)
    const info = [1, 2, 3, 4]

    const onerror = vi.fn()
    conn.onerror = onerror

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(info)
    })

    await conn.onfetch(await fetch(''))

    const ws = MockWebSocket.instances[0]
    expect(ws).toBeDefined()

    ws.triggerError()

    expect(onerror).toHaveBeenCalledWith(expect.any(Error))
    expect(onerror.mock.calls[0][0].message).toBe('unexpected socket error')
  })

  it('should do nothing if disposed after res.json resolves', async () => {
    const conn = new Connection('host', 1, false)
    const info = [1, 2, 3, 4]
    const jsonSpy = vi.fn().mockResolvedValue(info)

    const response = {
      ok: true,
      json: jsonSpy
    }

    const wsSpy = vi.spyOn(globalThis, 'WebSocket')

    const fetchPromise = conn.onfetch(response as unknown as Response)

    // Dispose AFTER fetch starts, BEFORE json resolves
    conn.dispose()

    await fetchPromise

    expect(wsSpy).not.toHaveBeenCalled() // WebSocket was not constructed
  })

  it('should do nothing in open() if already disposed', () => {
    const conn = new Connection('host', 1, false)

    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy

    conn.dispose()
    conn.open()

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('should do nothing in fetch.catch if disposed during fetch', async () => {
    const conn = new Connection('host', 123, false)
    const errorSpy = vi.fn()
    conn.onerror = errorSpy

    let rejectFetch!: (err: Error) => void
    const fetchPromise = new Promise((_res, rej) => {
      rejectFetch = rej
    })

    globalThis.fetch = vi.fn().mockImplementation(() => fetchPromise)

    conn.open()

    // Dispose before the fetch error propagates
    conn.dispose()

    // Reject the fetsch to trigger the .catch() inside open()
    rejectFetch(new Error('network fail'))

    // Wait a microtask so .catch runs
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(errorSpy).not.toHaveBeenCalled()
  })
})
