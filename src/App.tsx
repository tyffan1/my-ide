import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import type { editor as MonacoEditor } from 'monaco-editor'
import {
  Bell,
  Bug,
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  FileCode2,
  Files,
  GitBranch,
  PanelBottom,
  Play,
  Search,
  Settings,
  SplitSquareHorizontal,
  Terminal,
  X,
} from 'lucide-react'
import './App.css'

type WorkspaceFile = {
  id: string
  name: string
  path: string
  language: string
  content: string
}

type OutputLine = {
  id: number
  kind: 'info' | 'success' | 'warning'
  text: string
}

type ActivityView = 'explorer' | 'search' | 'run' | 'source' | 'settings'
type BottomPanel = 'terminal' | 'problems'
type CursorPosition = {
  line: number
  column: number
}

const initialFiles: WorkspaceFile[] = [
  {
    id: 'app',
    name: 'App.tsx',
    path: 'src/App.tsx',
    language: 'typescript',
    content: `import { createApp } from './runtime'

const app = createApp({
  name: 'My IDE',
  theme: 'dark',
})

app.command('workbench.openFile', async () => {
  console.log('Opening a file...')
})

app.start()
`,
  },
  {
    id: 'main',
    name: 'main.ts',
    path: 'src/main.ts',
    language: 'typescript',
    content: `export function boot() {
  const root = document.querySelector('#root')

  if (!root) {
    throw new Error('Root element was not found')
  }

  root.textContent = 'IDE shell mounted'
}
`,
  },
  {
    id: 'settings',
    name: 'settings.json',
    path: '.my-ide/settings.json',
    language: 'json',
    content: `{
  "editor.fontSize": 14,
  "editor.tabSize": 2,
  "workbench.colorTheme": "Carbon"
}
`,
  },
]

const initialOutput: OutputLine[] = [
  { id: 1, kind: 'info', text: 'My IDE dev session started' },
  { id: 2, kind: 'success', text: 'Renderer is connected to Electron' },
]

const activityLabels: Record<ActivityView, string> = {
  explorer: 'Explorer',
  search: 'Search',
  run: 'Run and Debug',
  source: 'Source Control',
  settings: 'Settings',
}

function App() {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
  const [files, setFiles] = useState(initialFiles)
  const [openFileIds, setOpenFileIds] = useState(['app', 'main'])
  const [activeFileId, setActiveFileId] = useState('app')
  const [savedContent, setSavedContent] = useState<Record<string, string>>(
    Object.fromEntries(initialFiles.map((file) => [file.id, file.content])),
  )
  const [outputLines, setOutputLines] = useState(initialOutput)
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>('terminal')
  const [activeView, setActiveView] = useState<ActivityView>('explorer')
  const [searchQuery, setSearchQuery] = useState('')
  const [quickOpenQuery, setQuickOpenQuery] = useState('')
  const [isQuickOpenVisible, setIsQuickOpenVisible] = useState(false)
  const [isNotificationsVisible, setIsNotificationsVisible] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSplitEditor, setIsSplitEditor] = useState(false)
  const [isMinimapEnabled, setIsMinimapEnabled] = useState(true)
  const [isWordWrapEnabled, setIsWordWrapEnabled] = useState(true)
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false)
  const [fontSize, setFontSize] = useState(14)
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
    line: 1,
    column: 1,
  })

  const activeFile = files.find((file) => file.id === activeFileId) ?? files[0]
  const activeOpenFiles = openFileIds
    .map((id) => files.find((file) => file.id === id))
    .filter(Boolean) as WorkspaceFile[]

  const dirtyFileIds = useMemo(
    () =>
      new Set(
        files
          .filter((file) => file.content !== savedContent[file.id])
          .map((file) => file.id),
      ),
    [files, savedContent],
  )

  const dirtyFiles = useMemo(
    () => files.filter((file) => dirtyFileIds.has(file.id)),
    [dirtyFileIds, files],
  )

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      return files
    }

    return files.filter((file) =>
      [file.name, file.path, file.content].some((value) =>
        value.toLowerCase().includes(query),
      ),
    )
  }, [files, searchQuery])

  const quickOpenFiles = useMemo(() => {
    const query = quickOpenQuery.trim().toLowerCase()

    if (!query) {
      return files
    }

    return files.filter((file) =>
      [file.name, file.path].some((value) => value.toLowerCase().includes(query)),
    )
  }, [files, quickOpenQuery])

  const notifications = useMemo(() => {
    const messages = [
      `${openFileIds.length} tabs open`,
      isSplitEditor ? 'Split editor enabled' : 'Single editor mode',
      isAutoSaveEnabled ? 'Auto save is on' : 'Auto save is off',
    ]

    if (dirtyFiles.length > 0) {
      messages.unshift(`${dirtyFiles.length} unsaved file(s)`)
    }

    return messages
  }, [dirtyFiles.length, isAutoSaveEnabled, isSplitEditor, openFileIds.length])

  const appendOutput = useCallback((kind: OutputLine['kind'], text: string) => {
    setOutputLines((lines) => [
      ...lines,
      { id: Date.now() + lines.length, kind, text },
    ])
  }, [])

  const openFile = useCallback(
    (fileId: string) => {
      const file = files.find((candidate) => candidate.id === fileId)

      if (!file) {
        return
      }

      setActiveFileId(fileId)
      setOpenFileIds((ids) => (ids.includes(fileId) ? ids : [...ids, fileId]))
      setIsQuickOpenVisible(false)
      setQuickOpenQuery('')
      appendOutput('info', `Opened ${file.path}`)
    },
    [appendOutput, files],
  )

  const closeFile = useCallback(
    (fileId: string) => {
      setOpenFileIds((ids) => {
        const nextIds = ids.filter((id) => id !== fileId)

        if (activeFileId === fileId) {
          setActiveFileId(nextIds.at(-1) ?? files[0].id)
        }

        return nextIds.length > 0 ? nextIds : [files[0].id]
      })
    },
    [activeFileId, files],
  )

  const updateActiveFile = useCallback(
    (value: string | undefined) => {
      setFiles((currentFiles) =>
        currentFiles.map((file) =>
          file.id === activeFile.id ? { ...file, content: value ?? '' } : file,
        ),
      )
    },
    [activeFile.id],
  )

  const saveActiveFile = useCallback(() => {
    setSavedContent((content) => ({
      ...content,
      [activeFile.id]: activeFile.content,
    }))
    appendOutput('success', `Saved ${activeFile.path}`)
  }, [activeFile.content, activeFile.id, activeFile.path, appendOutput])

  const saveAllFiles = useCallback(() => {
    setSavedContent(Object.fromEntries(files.map((file) => [file.id, file.content])))
    appendOutput('success', `Saved ${dirtyFiles.length} changed file(s)`)
  }, [appendOutput, dirtyFiles.length, files])

  const runActiveFile = useCallback(() => {
    setBottomPanel('terminal')
    appendOutput('info', `Running ${activeFile.path}`)
    appendOutput('success', 'Process exited with code 0')
  }, [activeFile.path, appendOutput])

  const showProblems = useCallback(() => {
    setBottomPanel('problems')
    appendOutput('warning', 'Problems panel focused')
  }, [appendOutput])

  const toggleSplitEditor = useCallback(() => {
    setIsSplitEditor((isEnabled) => {
      appendOutput('info', isEnabled ? 'Split editor disabled' : 'Split editor enabled')
      return !isEnabled
    })
  }, [appendOutput])

  const clearTerminal = useCallback(() => {
    setOutputLines([])
  }, [])

  const openQuickOpen = useCallback(() => {
    setIsQuickOpenVisible(true)
    setIsNotificationsVisible(false)
  }, [])

  const handleEditorMount = useCallback(
    (editorInstance: MonacoEditor.IStandaloneCodeEditor) => {
      editorRef.current = editorInstance
      editorInstance.onDidChangeCursorPosition((event) => {
        setCursorPosition({
          line: event.position.lineNumber,
          column: event.position.column,
        })
      })
    },
    [],
  )

  useEffect(() => {
    editorRef.current?.focus()
  }, [activeFileId])

  useEffect(() => {
    if (!isAutoSaveEnabled || dirtyFiles.length === 0) {
      return
    }

    const timerId = window.setTimeout(() => {
      setSavedContent(Object.fromEntries(files.map((file) => [file.id, file.content])))
      appendOutput('success', 'Auto saved workspace')
    }, 900)

    return () => window.clearTimeout(timerId)
  }, [appendOutput, dirtyFiles.length, files, isAutoSaveEnabled])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isCommand = event.metaKey || event.ctrlKey

      if (event.key === 'Escape') {
        setIsQuickOpenVisible(false)
        setIsNotificationsVisible(false)
        return
      }

      if (!isCommand) {
        return
      }

      const key = event.key.toLowerCase()

      if (key === 's') {
        event.preventDefault()
        saveActiveFile()
      }

      if (key === 'enter') {
        event.preventDefault()
        runActiveFile()
      }

      if (key === 'p') {
        event.preventDefault()
        openQuickOpen()
      }

      if (key === 'b') {
        event.preventDefault()
        setIsSidebarCollapsed((isCollapsed) => !isCollapsed)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openQuickOpen, runActiveFile, saveActiveFile])

  function selectActivity(view: ActivityView) {
    setActiveView(view)
    setIsSidebarCollapsed(false)
  }

  function renderSidebarContent() {
    if (activeView === 'search') {
      return (
        <section className="sidebar-panel">
          <label className="field-label" htmlFor="workspace-search">
            Search workspace
          </label>
          <input
            id="workspace-search"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="File name or content"
            type="search"
            value={searchQuery}
          />
          <div className="result-count">{searchResults.length} result(s)</div>
          <div className="file-list">
            {searchResults.map((file) => (
              <button
                className={`file-item ${activeFile.id === file.id ? 'active' : ''}`}
                key={file.id}
                onClick={() => openFile(file.id)}
                type="button"
              >
                <FileCode2 size={16} />
                <span>{file.path}</span>
                {dirtyFileIds.has(file.id) && <i aria-label="Unsaved" />}
              </button>
            ))}
          </div>
        </section>
      )
    }

    if (activeView === 'run') {
      return (
        <section className="sidebar-panel">
          <button className="primary-action" onClick={runActiveFile} type="button">
            <Play size={16} />
            Run current file
          </button>
          <button className="secondary-action" onClick={showProblems} type="button">
            <PanelBottom size={16} />
            Focus problems
          </button>
          <div className="panel-card">
            <span>Current target</span>
            <strong>{activeFile.path}</strong>
          </div>
        </section>
      )
    }

    if (activeView === 'source') {
      return (
        <section className="sidebar-panel">
          <button
            className="primary-action"
            disabled={dirtyFiles.length === 0}
            onClick={saveAllFiles}
            type="button"
          >
            <Check size={16} />
            Save all changes
          </button>
          <div className="result-count">{dirtyFiles.length} changed file(s)</div>
          <div className="file-list">
            {(dirtyFiles.length > 0 ? dirtyFiles : files).map((file) => (
              <button
                className={`file-item ${activeFile.id === file.id ? 'active' : ''}`}
                key={file.id}
                onClick={() => openFile(file.id)}
                type="button"
              >
                <GitBranch size={16} />
                <span>{file.path}</span>
                {dirtyFileIds.has(file.id) && <i aria-label="Unsaved" />}
              </button>
            ))}
          </div>
        </section>
      )
    }

    if (activeView === 'settings') {
      return (
        <section className="sidebar-panel">
          <label className="setting-row">
            <span>Minimap</span>
            <input
              checked={isMinimapEnabled}
              onChange={(event) => setIsMinimapEnabled(event.target.checked)}
              type="checkbox"
            />
          </label>
          <label className="setting-row">
            <span>Word wrap</span>
            <input
              checked={isWordWrapEnabled}
              onChange={(event) => setIsWordWrapEnabled(event.target.checked)}
              type="checkbox"
            />
          </label>
          <label className="setting-row">
            <span>Auto save</span>
            <input
              checked={isAutoSaveEnabled}
              onChange={(event) => setIsAutoSaveEnabled(event.target.checked)}
              type="checkbox"
            />
          </label>
          <div className="stepper-row">
            <span>Font size</span>
            <div>
              <button
                onClick={() => setFontSize((size) => Math.max(11, size - 1))}
                type="button"
              >
                −
              </button>
              <strong>{fontSize}</strong>
              <button
                onClick={() => setFontSize((size) => Math.min(20, size + 1))}
                type="button"
              >
                +
              </button>
            </div>
          </div>
        </section>
      )
    }

    return (
      <section className="workspace">
        <div className="workspace-title">MY-IDE</div>
        <div className="file-list">
          {files.map((file) => (
            <button
              className={`file-item ${activeFile.id === file.id ? 'active' : ''}`}
              key={file.id}
              onClick={() => openFile(file.id)}
              type="button"
            >
              <FileCode2 size={16} />
              <span>{file.name}</span>
              {dirtyFileIds.has(file.id) && <i aria-label="Unsaved" />}
            </button>
          ))}
        </div>
      </section>
    )
  }

  return (
    <main className={`ide-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="activity-bar" aria-label="Primary navigation">
        <button
          className={`activity-button ${activeView === 'explorer' ? 'active' : ''}`}
          onClick={() => selectActivity('explorer')}
          type="button"
          title="Explorer"
        >
          <Files size={21} />
        </button>
        <button
          className={`activity-button ${activeView === 'search' ? 'active' : ''}`}
          onClick={() => selectActivity('search')}
          type="button"
          title="Search"
        >
          <Search size={21} />
        </button>
        <button
          className={`activity-button ${activeView === 'run' ? 'active' : ''}`}
          onClick={() => selectActivity('run')}
          type="button"
          title="Run and debug"
        >
          <Bug size={21} />
        </button>
        <button
          className={`activity-button ${activeView === 'source' ? 'active' : ''}`}
          onClick={() => selectActivity('source')}
          type="button"
          title="Source control"
        >
          <GitBranch size={21} />
        </button>
        <button
          className={`activity-button bottom ${activeView === 'settings' ? 'active' : ''}`}
          onClick={() => selectActivity('settings')}
          type="button"
          title="Settings"
        >
          <Settings size={21} />
        </button>
      </aside>

      <aside className="sidebar">
        <div className="sidebar-header">
          <span>{activityLabels[activeView]}</span>
          <button
            onClick={() => setIsSidebarCollapsed(true)}
            type="button"
            title="Collapse workspace"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        {renderSidebarContent()}
      </aside>

      <section className="workbench">
        <header className="titlebar">
          <button
            className="project-mark"
            onClick={() => setIsSidebarCollapsed((isCollapsed) => !isCollapsed)}
            type="button"
            title="Toggle sidebar"
          >
            <Code2 size={18} />
            <span>My IDE</span>
          </button>
          <button className="command-center" onClick={openQuickOpen} type="button">
            my-ide / {activeFile.path}
          </button>
          <div className="window-actions">
            <button
              className={isSplitEditor ? 'active' : ''}
              onClick={toggleSplitEditor}
              type="button"
              title="Split editor"
            >
              <SplitSquareHorizontal size={17} />
            </button>
            <button
              className={isNotificationsVisible ? 'active' : ''}
              onClick={() => setIsNotificationsVisible((isVisible) => !isVisible)}
              type="button"
              title="Notifications"
            >
              <Bell size={17} />
              {dirtyFiles.length > 0 && <i />}
            </button>
          </div>
          {isNotificationsVisible && (
            <div className="notifications-popover">
              <div className="popover-header">
                <strong>Notifications</strong>
                <button
                  onClick={() => setIsNotificationsVisible(false)}
                  type="button"
                  title="Close notifications"
                >
                  <X size={14} />
                </button>
              </div>
              {notifications.map((message) => (
                <div className="notification-item" key={message}>
                  {message}
                </div>
              ))}
            </div>
          )}
        </header>

        <div className="tabs">
          {activeOpenFiles.map((file) => (
            <div
              className={`tab ${activeFile.id === file.id ? 'active' : ''}`}
              key={file.id}
            >
              <button
                className="tab-main"
                onClick={() => openFile(file.id)}
                type="button"
              >
                <FileCode2 size={14} />
                <span>{file.name}</span>
                {dirtyFileIds.has(file.id) && <i />}
              </button>
              <button
                className="close-tab"
                onClick={() => closeFile(file.id)}
                type="button"
                title="Close"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="editor-layout">
          <div className="editor-toolbar">
            <div>
              <span>{activeFile.path}</span>
              {dirtyFileIds.has(activeFile.id) && <strong>Unsaved</strong>}
            </div>
            <div className="editor-actions">
              <button onClick={saveActiveFile} type="button" title="Save">
                <Check size={16} />
                Save
              </button>
              <button onClick={runActiveFile} type="button" title="Run file">
                <Play size={16} />
                Run
              </button>
            </div>
          </div>

          <div className={`editor-pane ${isSplitEditor ? 'split' : ''}`}>
            <Editor
              height="100%"
              language={activeFile.language}
              onChange={updateActiveFile}
              onMount={handleEditorMount}
              path={activeFile.path}
              theme="vs-dark"
              value={activeFile.content}
              options={{
                fontFamily: 'JetBrains Mono, Consolas, monospace',
                fontSize,
                minimap: { enabled: isMinimapEnabled },
                padding: { top: 18, bottom: 18 },
                smoothScrolling: true,
                tabSize: 2,
                wordWrap: isWordWrapEnabled ? 'on' : 'off',
              }}
            />
            {isSplitEditor && (
              <Editor
                height="100%"
                language={activeFile.language}
                path={`${activeFile.path}:preview`}
                theme="vs-dark"
                value={activeFile.content}
                options={{
                  fontFamily: 'JetBrains Mono, Consolas, monospace',
                  fontSize,
                  minimap: { enabled: false },
                  padding: { top: 18, bottom: 18 },
                  readOnly: true,
                  smoothScrolling: true,
                  tabSize: 2,
                  wordWrap: isWordWrapEnabled ? 'on' : 'off',
                }}
              />
            )}
          </div>
        </div>

        <section className="panel">
          <div className="panel-tabs">
            <button
              className={bottomPanel === 'terminal' ? 'active' : ''}
              onClick={() => setBottomPanel('terminal')}
              type="button"
            >
              <Terminal size={15} />
              Terminal
            </button>
            <button
              className={bottomPanel === 'problems' ? 'active' : ''}
              onClick={() => setBottomPanel('problems')}
              type="button"
            >
              <PanelBottom size={15} />
              Problems
            </button>
            <button className="panel-action" onClick={clearTerminal} type="button">
              <X size={14} />
              Clear
            </button>
          </div>
          <div className="panel-body">
            {bottomPanel === 'terminal' ? (
              outputLines.length > 0 ? (
                outputLines.map((line) => (
                  <div className={`output-line ${line.kind}`} key={line.id}>
                    <span>$</span>
                    <p>{line.text}</p>
                  </div>
                ))
              ) : (
                <div className="empty-state">Terminal output is clear.</div>
              )
            ) : dirtyFiles.length > 0 ? (
              dirtyFiles.map((file) => (
                <button
                  className="problem-row"
                  key={file.id}
                  onClick={() => openFile(file.id)}
                  type="button"
                >
                  <span>warning</span>
                  <p>{file.path} has unsaved changes.</p>
                </button>
              ))
            ) : (
              <div className="empty-state">No problems found in workspace.</div>
            )}
          </div>
        </section>

        <footer className="statusbar">
          <span>
            <GitBranch size={14} />
            main
          </span>
          <span>{activeFile.language}</span>
          <span>
            Ln {cursorPosition.line}, Col {cursorPosition.column}
          </span>
          <span>{dirtyFileIds.size} unsaved</span>
        </footer>
      </section>

      {isSidebarCollapsed && (
        <button
          className="sidebar-restore"
          onClick={() => setIsSidebarCollapsed(false)}
          type="button"
          title="Restore sidebar"
        >
          <ChevronUp size={16} />
        </button>
      )}

      {isQuickOpenVisible && (
        <div className="quick-open" role="dialog" aria-modal="true">
          <div className="quick-open-card">
            <div className="quick-open-header">
              <Search size={17} />
              <input
                autoFocus
                onChange={(event) => setQuickOpenQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && quickOpenFiles[0]) {
                    openFile(quickOpenFiles[0].id)
                  }
                }}
                placeholder="Open file"
                value={quickOpenQuery}
              />
              <button
                onClick={() => setIsQuickOpenVisible(false)}
                type="button"
                title="Close quick open"
              >
                <X size={15} />
              </button>
            </div>
            <div className="quick-open-results">
              {quickOpenFiles.map((file) => (
                <button
                  className={activeFile.id === file.id ? 'active' : ''}
                  key={file.id}
                  onClick={() => openFile(file.id)}
                  type="button"
                >
                  <FileCode2 size={15} />
                  <span>{file.name}</span>
                  <small>{file.path}</small>
                </button>
              ))}
            </div>
            <div className="quick-open-shortcuts">
              <span>⌘P open</span>
              <span>⌘S save</span>
              <span>⌘↵ run</span>
              <span>⌘B sidebar</span>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default App
