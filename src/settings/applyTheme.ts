import type { AppSettings } from './types'

const THEME_VARS: Record<
  AppSettings['appearance']['theme'],
  Record<string, string>
> = {
  dark: {
    '--bg': '#10131a',
    '--surface': '#171b24',
    '--surface-2': '#1b1f29',
    '--surface-3': '#222733',
    '--menubar': '#141820',
    '--text': '#d7dde8',
    '--muted': '#8d97aa',
    '--border': '#2a303d',
  },
  carbon: {
    '--bg': '#0d0d0d',
    '--surface': '#141414',
    '--surface-2': '#1a1a1a',
    '--surface-3': '#242424',
    '--menubar': '#111111',
    '--text': '#e0e0e0',
    '--muted': '#9a9a9a',
    '--border': '#2e2e2e',
  },
  midnight: {
    '--bg': '#0a0e1a',
    '--surface': '#111827',
    '--surface-2': '#151d2e',
    '--surface-3': '#1c2740',
    '--menubar': '#0d1220',
    '--text': '#d8e2f0',
    '--muted': '#8494ad',
    '--border': '#243049',
  },
  light: {
    '--bg': '#f3f3f3',
    '--surface': '#ffffff',
    '--surface-2': '#f8f8f8',
    '--surface-3': '#ececec',
    '--menubar': '#e8e8e8',
    '--text': '#1f2328',
    '--muted': '#656d76',
    '--border': '#d0d7de',
  },
}

export function applyTheme(settings: AppSettings) {
  const root = document.documentElement
  const themeVars = THEME_VARS[settings.appearance.theme]

  for (const [key, value] of Object.entries(themeVars)) {
    root.style.setProperty(key, value)
  }

  root.style.setProperty('--accent', settings.appearance.accentColor)
  root.style.setProperty('--sidebar-width', `${settings.workbench.sidebarWidth}px`)
  root.style.setProperty('--panel-height', `${settings.workbench.panelHeight}px`)
  root.dataset.theme = settings.appearance.theme
}
