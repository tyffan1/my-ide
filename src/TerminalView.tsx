import React, { useEffect, useRef } from 'react'
import { Terminal } from 'xterm'
import 'xterm/css/xterm.css'

export function TerminalView() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<Terminal | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    const term = new Terminal({ cursorBlink: true })
    termRef.current = term

    if (containerRef.current) {
      term.open(containerRef.current)
    }

    let mounted = true

    async function init() {
      const cols = term.cols || 80
      const rows = term.rows || 24

      const result = await window.myIde?.terminal.create(cols, rows)

      if (!mounted || !result) return

      const id = result.id
      sessionIdRef.current = id

      term.onData((data) => {
        window.myIde?.terminal.write(id, data)
      })

      window.myIde?.terminal.onData((payload) => {
        if (payload && payload.id === id) {
          term.write(payload.data)
        }
      })

      window.myIde?.terminal.onExit((payload) => {
        if (payload && payload.id === id) {
          term.write(`\r\nProcess exited (${payload.exitCode})\r\n`)
        }
      })
    }

    void init()

    return () => {
      mounted = false
      const id = sessionIdRef.current

      try {
        term.dispose()
      } catch (e) {
        // ignore
      }

      if (id) {
        window.myIde?.terminal.kill(id)
      }
    }
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#000' }} />
}
