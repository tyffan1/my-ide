import { useCallback, useEffect, useState } from 'react'
import { applyTheme } from './applyTheme'
import { DEFAULT_SETTINGS } from './defaults'
import { loadSettings, saveSettings } from './storage'
import type { AppSettings, SettingsCategory } from './types'

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [settingsCategory, setSettingsCategory] = useState<SettingsCategory>('editor')

  useEffect(() => {
    applyTheme(settings)
    saveSettings(settings)
  }, [settings])

  const updateSetting = useCallback(<K extends keyof AppSettings, F extends keyof AppSettings[K]>(
    category: K,
    field: F,
    value: AppSettings[K][F],
  ) => {
    setSettings((current) => ({
      ...current,
      [category]: {
        ...current[category],
        [field]: value,
      },
    }))
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [])

  const resetCategory = useCallback((category: SettingsCategory) => {
    setSettings((current) => ({
      ...current,
      [category]: DEFAULT_SETTINGS[category],
    }))
  }, [])

  return {
    settings,
    settingsCategory,
    setSettingsCategory,
    updateSetting,
    resetSettings,
    resetCategory,
  }
}
