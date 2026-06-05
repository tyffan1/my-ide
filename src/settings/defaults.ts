import type { AppSettings, AppTheme } from './types'

export const SETTINGS_STORAGE_KEY = 'my-ide-settings-v1'

export const FONT_FAMILIES = [
  'JetBrains Mono, Consolas, monospace',
  'Cascadia Code, Consolas, monospace',
  'Fira Code, Consolas, monospace',
  'Consolas, monospace',
  'Monaco, monospace',
] as const

export const ACCENT_COLORS = [
  { id: 'blue', label: 'Blue', value: '#4ea1ff' },
  { id: 'purple', label: 'Purple', value: '#a371f7' },
  { id: 'green', label: 'Green', value: '#3fb950' },
  { id: 'orange', label: 'Orange', value: '#f0883e' },
  { id: 'pink', label: 'Pink', value: '#f778ba' },
  { id: 'red', label: 'Red', value: '#f85149' },
] as const

export const APP_THEME_LABELS: Record<AppTheme, string> = {
  dark: 'Dark',
  carbon: 'Carbon',
  midnight: 'Midnight',
  light: 'Light',
}

export const DEFAULT_SETTINGS: AppSettings = {
  editor: {
    fontSize: 14,
    fontFamily: FONT_FAMILIES[0],
    tabSize: 2,
    minimap: true,
    wordWrap: true,
    lineNumbers: true,
    smoothScrolling: true,
    cursorBlinking: 'blink',
    bracketPairColorization: true,
    theme: 'vs-dark',
  },
  appearance: {
    theme: 'dark',
    accentColor: ACCENT_COLORS[0].value,
  },
  workbench: {
    sidebarWidth: 260,
    panelHeight: 170,
    showStatusBar: true,
    showBottomPanel: true,
  },
  files: {
    autoSave: false,
    autoSaveDelay: 900,
  },
}
