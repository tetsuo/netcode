import Connection from './Connection'
import Keyboard, { KeyState, KeyRight, KeyLeft, KeyDown, KeyUp, KeySpace } from './Keyboard'
import Loop from './Loop'
import Ring from './Ring'
import Client, { ConnectionState, ActionType } from './Client'

const Key = { Right: KeyRight, Left: KeyLeft, Down: KeyDown, Up: KeyUp, Space: KeySpace }

export { Connection, Keyboard, KeyState, Key, Loop, Ring, Client, ConnectionState, ActionType }
