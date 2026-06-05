export type EditorTheme = 'vs-dark' | 'vs-light' | 'hc-black'

export type AppTheme = 'dark' | 'carbon' | 'midnight' | 'light'

export type CursorBlinking = 'blink' | 'smooth' | 'phase' | 'solid' | 'expand'

export type EditorSettings = {
  fontSize: number
  fontFamily: string
  tabSize: number
  minimap: boolean
  wordWrap: boolean
  lineNumbers: boolean
  smoothScrolling: boolean
  cursorBlinking: CursorBlinking
  bracketPairColorization: boolean
  theme: EditorTheme
}

export type AppearanceSettings = {
  theme: AppTheme
  accentColor: string
}

export type WorkbenchSettings = {
  sidebarWidth: number
  panelHeight: number
  showStatusBar: boolean
  showBottomPanel: boolean
}

export type FilesSettings = {
  autoSave: boolean
  autoSaveDelay: number
}

export type AppSettings = {
  editor: EditorSettings
  appearance: AppearanceSettings
  workbench: WorkbenchSettings
  files: FilesSettings
}

export type SettingsCategory = 'editor' | 'appearance' | 'workbench' | 'files'
