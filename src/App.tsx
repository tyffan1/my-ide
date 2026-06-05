import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import type { editor as MonacoEditor } from 'monaco-editor'
import {
  Bell,
  Bug,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Folder,
  Code2,
  FileCode2,
  Files,
  FolderOpen,
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
import { MenuBar } from './MenuBar'
import { SettingsView } from './SettingsView'
import { useSettings } from './settings/useSettings'
import type { SettingsCategory } from './settings/types'
import {
  buildFileTree,
  collectFolderPaths,
  toWorkspaceFile,
  workspaceLabel,
  type FileTreeNode,
} from './workspaceUtils'

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

const initialOutput: OutputLine[] = [
  { id: 1, kind: 'info', text: 'My IDE session started' },
]

const activityLabels: Record<ActivityView, string> = {
  explorer: 'Explorer',
  search: 'Search',
  run: 'Run and Debug',
  source: 'Source Control',
  settings: 'Settings',
}

const settingsCategoryLabels: Record<SettingsCategory, string> = {
  editor: 'Editor',
  appearance: 'Appearance',
  workbench: 'Workbench',
  files: 'Files',
}

function App() {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
  const {
    settings,
    settingsCategory,
    setSettingsCategory,
    updateSetting,
    resetSettings,
    resetCategory,
  } = useSettings()
  const [files, setFiles] = useState<WorkspaceFile[]>([])
  const [openFileIds, setOpenFileIds] = useState<string[]>([])
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [workspaceFolder, setWorkspaceFolder] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set())
  const [savedContent, setSavedContent] = useState<Record<string, string>>({})
  const [outputLines, setOutputLines] = useState(initialOutput)
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>('terminal')
  const [activeView, setActiveView] = useState<ActivityView>('explorer')
  const [searchQuery, setSearchQuery] = useState('')
  const [quickOpenQuery, setQuickOpenQuery] = useState('')
  const [isQuickOpenVisible, setIsQuickOpenVisible] = useState(false)
  const [isNotificationsVisible, setIsNotificationsVisible] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSplitEditor, setIsSplitEditor] = useState(false)
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
    line: 1,
    column: 1,
  })

  const hasNativeDialogs = Boolean(window.myIde?.openFile && window.myIde?.openFolder)
  const hasNativeShell = Boolean(window.myIde)
  const activeFile = activeFileId
    ? files.find((file) => file.id === activeFileId) ?? null
    : null
  const activeOpenFiles = openFileIds
    .map((id) => files.find((file) => file.id === id))
    .filter(Boolean) as WorkspaceFile[]
  const hasOpenFiles = activeOpenFiles.length > 0
  const isSettingsOpen = activeView === 'settings'
  const workspaceName = workspaceLabel(workspaceFolder, hasNativeDialogs)

  const editorOptions = useMemo(
    () => ({
      fontFamily: settings.editor.fontFamily,
      fontSize: settings.editor.fontSize,
      minimap: { enabled: settings.editor.minimap },
      lineNumbers: settings.editor.lineNumbers ? ('on' as const) : ('off' as const),
      padding: { top: 18, bottom: 18 },
      smoothScrolling: settings.editor.smoothScrolling,
      tabSize: settings.editor.tabSize,
      wordWrap: settings.editor.wordWrap ? ('on' as const) : ('off' as const),
      cursorBlinking: settings.editor.cursorBlinking,
      bracketPairColorization: { enabled: settings.editor.bracketPairColorization },
    }),
    [settings.editor],
  )

  const workbenchClassName = [
    'workbench',
    hasOpenFiles && !isSettingsOpen ? '' : 'no-editor-tabs',
  ]
    .filter(Boolean)
    .join(' ')

  const workbenchGridRows = useMemo(() => {
    const rows = ['42px']

    if (hasOpenFiles && !isSettingsOpen) {
      rows.push('36px')
    }

    rows.push('minmax(0, 1fr)')

    if (settings.workbench.showBottomPanel) {
      rows.push(`${settings.workbench.panelHeight}px`)
    }

    if (settings.workbench.showStatusBar) {
      rows.push('24px')
    }

    return rows.join(' ')
  }, [
    hasOpenFiles,
    isSettingsOpen,
    settings.workbench.panelHeight,
    settings.workbench.showBottomPanel,
    settings.workbench.showStatusBar,
  ])

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

  const fileTree = useMemo(() => buildFileTree(files), [files])

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
      settings.files.autoSave ? 'Auto save is on' : 'Auto save is off',
    ]

    if (dirtyFiles.length > 0) {
      messages.unshift(`${dirtyFiles.length} unsaved file(s)`)
    }

    return messages
  }, [dirtyFiles.length, isSplitEditor, openFileIds.length, settings.files.autoSave])

  const appendOutput = useCallback((kind: OutputLine['kind'], text: string) => {
    setOutputLines((lines) => [
      ...lines,
      { id: Date.now() + lines.length, kind, text },
    ])
  }, [])

  const addWorkspaceFile = useCallback(
    (file: { path: string; name: string; content: string }) => {
      const workspaceFile = toWorkspaceFile(file)

      setFiles((currentFiles) => {
        const existingIndex = currentFiles.findIndex(
          (candidate) => candidate.id === workspaceFile.id,
        )

        if (existingIndex === -1) {
          return [...currentFiles, workspaceFile].sort((left, right) =>
            left.path.localeCompare(right.path),
          )
        }

        return currentFiles.map((candidate) =>
          candidate.id === workspaceFile.id ? workspaceFile : candidate,
        )
      })

      setSavedContent((content) => ({
        ...content,
        [workspaceFile.id]: workspaceFile.content,
      }))

      return workspaceFile.id
    },
    [],
  )

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
          setActiveFileId(nextIds.at(-1) ?? null)
        }

        return nextIds
      })
    },
    [activeFileId],
  )

  const closeAllFiles = useCallback(() => {
    setOpenFileIds([])
    setActiveFileId(null)
    appendOutput('info', 'Closed all editors')
  }, [appendOutput])

  const openQuickOpen = useCallback(() => {
    setIsQuickOpenVisible(true)
    setIsNotificationsVisible(false)
  }, [])

  const openFileDialog = useCallback(async () => {
    if (!window.myIde?.openFile) {
      openQuickOpen()
      return
    }

    const result = await window.myIde.openFile()

    if (!result) {
      return
    }

    const fileId = addWorkspaceFile(result)
    setActiveFileId(fileId)
    setOpenFileIds((ids) => (ids.includes(fileId) ? ids : [...ids, fileId]))
    setIsQuickOpenVisible(false)
    setQuickOpenQuery('')
    appendOutput('info', `Opened ${result.path}`)
  }, [addWorkspaceFile, appendOutput, openQuickOpen])

  const openFolderDialog = useCallback(async () => {
    if (!window.myIde?.openFolder) {
      appendOutput('warning', 'Open Folder is available in the Electron app')
      setActiveView('explorer')
      setIsSidebarCollapsed(false)
      return
    }

    const result = await window.myIde.openFolder()

    if (!result) {
      return
    }

    const nextFiles = result.files.map((file) => toWorkspaceFile(file))
    const tree = buildFileTree(nextFiles)

    setWorkspaceFolder(result.folderPath)
    setFiles(nextFiles)
    setSavedContent(
      Object.fromEntries(nextFiles.map((file) => [file.id, file.content])),
    )
    setExpandedFolders(new Set(collectFolderPaths(tree)))
    setOpenFileIds([])
    setActiveFileId(null)
    setActiveView('explorer')
    setIsSidebarCollapsed(false)
    appendOutput('success', `Opened folder: ${result.folderPath}`)
  }, [appendOutput])

  const updateActiveFile = useCallback(
    (value: string | undefined) => {
      if (!activeFileId) {
        return
      }

      setFiles((currentFiles) =>
        currentFiles.map((file) =>
          file.id === activeFileId ? { ...file, content: value ?? '' } : file,
        ),
      )
    },
    [activeFileId],
  )

  const saveActiveFile = useCallback(() => {
    if (!activeFile) {
      return
    }

    setSavedContent((content) => ({
      ...content,
      [activeFile.id]: activeFile.content,
    }))
    appendOutput('success', `Saved ${activeFile.path}`)
  }, [activeFile, appendOutput])

  const saveAllFiles = useCallback(() => {
    setSavedContent(Object.fromEntries(files.map((file) => [file.id, file.content])))
    appendOutput('success', `Saved ${dirtyFiles.length} changed file(s)`)
  }, [appendOutput, dirtyFiles.length, files])

  const runActiveFile = useCallback(() => {
    if (!activeFile) {
      appendOutput('warning', 'No file is open')
      return
    }

    setBottomPanel('terminal')
    appendOutput('info', `Running ${activeFile.path}`)
    appendOutput('success', 'Process exited with code 0')
  }, [activeFile, appendOutput])

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

  const runEditorCommand = useCallback((commandId: string) => {
    const editor = editorRef.current

    if (!editor) {
      return false
    }

    const action = editor.getAction(commandId)

    if (!action?.isSupported()) {
      return false
    }

    void action.run()
    return true
  }, [])

  const focusTerminal = useCallback(() => {
    setBottomPanel('terminal')
  }, [])

  const menuActions = useMemo(
    () => ({
      openFile: () => void openFileDialog(),
      openFolder: () => void openFolderDialog(),
      save: saveActiveFile,
      saveAll: saveAllFiles,
      closeEditor: () => {
        if (activeFileId) {
          closeFile(activeFileId)
        }
      },
      closeAllEditors: closeAllFiles,
      quickOpen: openQuickOpen,
      undo: () => runEditorCommand('editor.action.undo'),
      redo: () => runEditorCommand('editor.action.redo'),
      cut: () => runEditorCommand('editor.action.clipboardCutAction'),
      copy: () => runEditorCommand('editor.action.clipboardCopyAction'),
      paste: () => runEditorCommand('editor.action.clipboardPasteAction'),
      find: () => runEditorCommand('actions.find'),
      toggleSidebar: () => setIsSidebarCollapsed((isCollapsed) => !isCollapsed),
      toggleSplit: toggleSplitEditor,
      focusTerminal,
      showExplorer: () => {
        setActiveView('explorer')
        setIsSidebarCollapsed(false)
      },
      showSearch: () => {
        setActiveView('search')
        setIsSidebarCollapsed(false)
      },
      showSettings: () => {
        setActiveView('settings')
        setIsSidebarCollapsed(false)
      },
      exit: hasNativeShell ? () => void window.myIde?.quit() : undefined,
      newWindow: hasNativeShell ? () => void window.myIde?.newWindow() : undefined,
      minimize: hasNativeShell ? () => void window.myIde?.minimize() : undefined,
      toggleMaximize: hasNativeShell ? () => void window.myIde?.toggleMaximize() : undefined,
      closeWindow: hasNativeShell ? () => void window.myIde?.closeWindow() : undefined,
    }),
    [
      activeFileId,
      closeAllFiles,
      closeFile,
      focusTerminal,
      hasNativeShell,
      openFileDialog,
      openFolderDialog,
      openQuickOpen,
      runEditorCommand,
      saveActiveFile,
      saveAllFiles,
      toggleSplitEditor,
    ],
  )

  const menuState = useMemo(
    () => ({
      canSave: Boolean(activeFile),
      canCloseEditor: Boolean(activeFileId),
      isSplitEditor,
      isSidebarCollapsed,
      hasNativeShell,
    }),
    [activeFile, activeFileId, hasNativeShell, isSidebarCollapsed, isSplitEditor],
  )

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
    if (activeFileId) {
      editorRef.current?.focus()
    }
  }, [activeFileId])

  useEffect(() => {
    if (!settings.files.autoSave || dirtyFiles.length === 0) {
      return
    }

    const timerId = window.setTimeout(() => {
      setSavedContent(Object.fromEntries(files.map((file) => [file.id, file.content])))
      appendOutput('success', 'Auto saved workspace')
    }, settings.files.autoSaveDelay)

    return () => window.clearTimeout(timerId)
  }, [
    appendOutput,
    dirtyFiles.length,
    files,
    settings.files.autoSave,
    settings.files.autoSaveDelay,
  ])

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

      if (key === 'o') {
        event.preventDefault()
        void openFileDialog()
      }

      if (key === 'w') {
        event.preventDefault()
        if (activeFileId) {
          closeFile(activeFileId)
        }
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

      if (key === ',') {
        event.preventDefault()
        setActiveView('settings')
        setIsSidebarCollapsed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeFileId, closeFile, openFileDialog, openQuickOpen, runActiveFile, saveActiveFile])

  const toggleFolderExpanded = useCallback((folderPath: string) => {
    setExpandedFolders((current) => {
      const next = new Set(current)

      if (next.has(folderPath)) {
        next.delete(folderPath)
      } else {
        next.add(folderPath)
      }

      return next
    })
  }, [])

  function selectActivity(view: ActivityView) {
    setActiveView(view)
    setIsSidebarCollapsed(false)
  }

  function renderFileTree(nodes: FileTreeNode[], depth = 0) {
    return nodes.map((node) => {
      if (node.type === 'folder') {
        const isExpanded = expandedFolders.has(node.path)

        return (
          <div className="tree-folder" key={node.path || `folder-${node.name}`}>
            <button
              className="tree-row folder-row"
              onClick={() => toggleFolderExpanded(node.path)}
              style={{ paddingLeft: `${8 + depth * 14}px` }}
              type="button"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Folder size={16} />
              <span>{node.name}</span>
            </button>
            {isExpanded && (
              <div className="tree-children">{renderFileTree(node.children, depth + 1)}</div>
            )}
          </div>
        )
      }

      return (
        <button
          className={`file-item tree-file ${activeFile?.id === node.fileId ? 'active' : ''}`}
          key={node.fileId}
          onClick={() => openFile(node.fileId)}
          style={{ paddingLeft: `${22 + depth * 14}px` }}
          type="button"
        >
          <FileCode2 size={16} />
          <span>{node.name}</span>
          {dirtyFileIds.has(node.fileId) && <i aria-label="Unsaved" />}
        </button>
      )
    })
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
                className={`file-item ${activeFile?.id === file.id ? 'active' : ''}`}
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
          <button className="primary-action" disabled={!activeFile} onClick={runActiveFile} type="button">
            <Play size={16} />
            Run current file
          </button>
          <button className="secondary-action" onClick={showProblems} type="button">
            <PanelBottom size={16} />
            Focus problems
          </button>
          <div className="panel-card">
            <span>Current target</span>
            <strong>{activeFile?.path ?? 'No file open'}</strong>
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
                className={`file-item ${activeFile?.id === file.id ? 'active' : ''}`}
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
        <section className="sidebar-panel settings-sidebar">
          <div className="settings-sidebar-intro">
            Open the settings editor to customize My IDE.
          </div>
          <div className="settings-sidebar-nav">
            {(Object.keys(settingsCategoryLabels) as SettingsCategory[]).map((category) => (
              <button
                className={settingsCategory === category ? 'active' : ''}
                key={category}
                onClick={() => setSettingsCategory(category)}
                type="button"
              >
                {settingsCategoryLabels[category]}
              </button>
            ))}
          </div>
        </section>
      )
    }

    return (
      <section className="workspace">
        <div className="workspace-title">{workspaceName.toUpperCase()}</div>
        {workspaceFolder && (
          <div className="workspace-actions">
            <button onClick={() => void openFolderDialog()} type="button">
              <FolderOpen size={14} />
              Change folder
            </button>
          </div>
        )}
        <div className="file-list file-tree">
          {files.length > 0 ? (
            renderFileTree(fileTree)
          ) : (
            <div className="explorer-empty">
              <p>No folder opened</p>
              <button onClick={() => void openFolderDialog()} type="button">
                <FolderOpen size={14} />
                Open Folder
              </button>
            </div>
          )}
        </div>
      </section>
    )
  }

  return (
    <main className={`ide-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <MenuBar actions={menuActions} state={menuState} />

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

      <section className={workbenchClassName} style={{ gridTemplateRows: workbenchGridRows }}>
        <header className="titlebar">
          <button
            className="project-mark"
            onClick={() => setIsSidebarCollapsed((isCollapsed) => !isCollapsed)}
            type="button"
            title="Toggle sidebar"
          >
            <Code2 size={18} />
            <span>{workspaceName}</span>
          </button>
          <button className="command-center" onClick={openQuickOpen} type="button">
            {activeFile ? `${workspaceName} / ${activeFile.path}` : workspaceName}
          </button>
          <div className="window-actions">
            <button
              disabled={!activeFile}
              onClick={saveActiveFile}
              type="button"
              title="Save (Ctrl+S)"
            >
              <Check size={17} />
            </button>
            <button
              disabled={!activeFile}
              onClick={runActiveFile}
              type="button"
              title="Run (Ctrl+Enter)"
            >
              <Play size={17} />
            </button>
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
              {dirtyFiles.length > 0 && <i aria-label="Unsaved changes" />}
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

        {hasOpenFiles && (
          <div className="tabs">
            {activeOpenFiles.map((file) => (
              <div
                className={`tab ${activeFile?.id === file.id ? 'active' : ''}`}
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
            <button
              className="close-all-tabs"
              onClick={closeAllFiles}
              type="button"
              title="Close all editors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="editor-layout">
          {isSettingsOpen ? (
            <SettingsView
              category={settingsCategory}
              onCategoryChange={setSettingsCategory}
              onResetAll={resetSettings}
              onResetCategory={resetCategory}
              onUpdate={updateSetting}
              settings={settings}
            />
          ) : hasOpenFiles && activeFile ? (
            <div className={`editor-pane ${isSplitEditor ? 'split' : ''}`}>
              <Editor
                height="100%"
                language={activeFile.language}
                onChange={updateActiveFile}
                onMount={handleEditorMount}
                path={activeFile.path}
                theme={settings.editor.theme}
                value={activeFile.content}
                options={editorOptions}
              />
              {isSplitEditor && (
                <Editor
                  height="100%"
                  language={activeFile.language}
                  path={`${activeFile.path}:preview`}
                  theme={settings.editor.theme}
                  value={activeFile.content}
                  options={{
                    ...editorOptions,
                    minimap: { enabled: false },
                    readOnly: true,
                  }}
                />
              )}
            </div>
          ) : (
            <section className="welcome-screen">
              <div className="welcome-content">
                <Code2 className="welcome-logo" size={72} strokeWidth={1.5} />
                <h1>My IDE</h1>
                <p>Open a folder or file to start editing.</p>
                <div className="welcome-actions">
                  <button onClick={() => void openFolderDialog()} type="button">
                    <FolderOpen size={18} />
                    Open Folder
                  </button>
                  <button onClick={() => void openFileDialog()} type="button">
                    <FileCode2 size={18} />
                    Open File
                  </button>
                  <button onClick={openQuickOpen} type="button">
                    <Search size={18} />
                    Quick Open
                  </button>
                </div>
                <div className="welcome-shortcuts">
                  <span>Ctrl+O open file</span>
                  <span>Ctrl+P quick open</span>
                  <span>Ctrl+W close tab</span>
                  <span>Ctrl+S save</span>
                </div>
              </div>
            </section>
          )}
        </div>

        {settings.workbench.showBottomPanel && (
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
        )}

        {settings.workbench.showStatusBar && (
        <footer className="statusbar">
          <span>
            <GitBranch size={14} />
            main
          </span>
          <span>{activeFile?.language ?? 'Plain Text'}</span>
          <span>
            {activeFile
              ? `Ln ${cursorPosition.line}, Col ${cursorPosition.column}`
              : 'No editor open'}
          </span>
          <span>{dirtyFileIds.size} unsaved</span>
        </footer>
        )}
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
                  className={activeFile?.id === file.id ? 'active' : ''}
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
