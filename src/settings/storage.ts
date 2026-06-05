import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from './defaults'
import type { AppSettings } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function mergeSection<T extends Record<string, unknown>>(defaults: T, value: unknown): T {
  if (!isRecord(value)) {
    return defaults
  }

  return { ...defaults, ...value } as T
}

export function mergeSettings(partial: unknown): AppSettings {
  if (!isRecord(partial)) {
    return DEFAULT_SETTINGS
  }

  return {
    editor: mergeSection(DEFAULT_SETTINGS.editor, partial.editor),
    appearance: mergeSection(DEFAULT_SETTINGS.appearance, partial.appearance),
    workbench: mergeSection(DEFAULT_SETTINGS.workbench, partial.workbench),
    files: mergeSection(DEFAULT_SETTINGS.files, partial.files),
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)

    if (!raw) {
      return DEFAULT_SETTINGS
    }

    return mergeSettings(JSON.parse(raw))
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}
