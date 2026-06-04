import { useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  Bell,
  Bug,
  Check,
  ChevronDown,
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

function App() {
  const [files, setFiles] = useState(initialFiles)
  const [openFileIds, setOpenFileIds] = useState(['app', 'main'])
  const [activeFileId, setActiveFileId] = useState('app')
  const [savedContent, setSavedContent] = useState<Record<string, string>>(
    Object.fromEntries(initialFiles.map((file) => [file.id, file.content])),
  )
  const [outputLines, setOutputLines] = useState(initialOutput)
  const [bottomPanel, setBottomPanel] = useState<'terminal' | 'problems'>(
    'terminal',
  )

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

  function openFile(fileId: string) {
    setActiveFileId(fileId)
    setOpenFileIds((ids) => (ids.includes(fileId) ? ids : [...ids, fileId]))
  }

  function closeFile(fileId: string) {
    setOpenFileIds((ids) => {
      const nextIds = ids.filter((id) => id !== fileId)

      if (activeFileId === fileId) {
        setActiveFileId(nextIds.at(-1) ?? files[0].id)
      }

      return nextIds.length > 0 ? nextIds : [files[0].id]
    })
  }

  function updateActiveFile(value: string | undefined) {
    setFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.id === activeFile.id ? { ...file, content: value ?? '' } : file,
      ),
    )
  }

  function saveActiveFile() {
    setSavedContent((content) => ({
      ...content,
      [activeFile.id]: activeFile.content,
    }))
    appendOutput('success', `Saved ${activeFile.path}`)
  }

  function runActiveFile() {
    appendOutput('info', `Running ${activeFile.path}`)
    appendOutput('success', 'Process exited with code 0')
  }

  function appendOutput(kind: OutputLine['kind'], text: string) {
    setOutputLines((lines) => [
      ...lines,
      { id: Date.now() + lines.length, kind, text },
    ])
  }

  return (
    <main className="ide-shell">
      <aside className="activity-bar" aria-label="Primary navigation">
        <button className="activity-button active" type="button" title="Explorer">
          <Files size={21} />
        </button>
        <button className="activity-button" type="button" title="Search">
          <Search size={21} />
        </button>
        <button className="activity-button" type="button" title="Run and debug">
          <Bug size={21} />
        </button>
        <button className="activity-button" type="button" title="Source control">
          <GitBranch size={21} />
        </button>
        <button className="activity-button bottom" type="button" title="Settings">
          <Settings size={21} />
        </button>
      </aside>

      <aside className="sidebar">
        <div className="sidebar-header">
          <span>Explorer</span>
          <button type="button" title="Collapse workspace">
            <ChevronDown size={16} />
          </button>
        </div>

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
      </aside>

      <section className="workbench">
        <header className="titlebar">
          <div className="project-mark">
            <Code2 size={18} />
            <span>My IDE</span>
          </div>
          <div className="command-center">my-ide / {activeFile.path}</div>
          <div className="window-actions">
            <button type="button" title="Split editor">
              <SplitSquareHorizontal size={17} />
            </button>
            <button type="button" title="Notifications">
              <Bell size={17} />
            </button>
          </div>
        </header>

        <div className="tabs">
          {activeOpenFiles.map((file) => (
            <button
              className={`tab ${activeFile.id === file.id ? 'active' : ''}`}
              key={file.id}
              onClick={() => openFile(file.id)}
              type="button"
            >
              <FileCode2 size={14} />
              <span>{file.name}</span>
              {dirtyFileIds.has(file.id) && <i />}
              <span
                className="close-tab"
                onClick={(event) => {
                  event.stopPropagation()
                  closeFile(file.id)
                }}
                role="button"
                tabIndex={0}
                title="Close"
              >
                <X size={13} />
              </span>
            </button>
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

          <div className="editor-pane">
            <Editor
              height="100%"
              language={activeFile.language}
              onChange={updateActiveFile}
              path={activeFile.path}
              theme="vs-dark"
              value={activeFile.content}
              options={{
                fontFamily: 'JetBrains Mono, Consolas, monospace',
                fontSize: 14,
                minimap: { enabled: true },
                padding: { top: 18, bottom: 18 },
                smoothScrolling: true,
                tabSize: 2,
                wordWrap: 'on',
              }}
            />
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
          </div>
          <div className="panel-body">
            {bottomPanel === 'terminal' ? (
              outputLines.map((line) => (
                <div className={`output-line ${line.kind}`} key={line.id}>
                  <span>$</span>
                  <p>{line.text}</p>
                </div>
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
          <span>Ln 1, Col 1</span>
          <span>{dirtyFileIds.size} unsaved</span>
        </footer>
      </section>
    </main>
  )
}

export default App
