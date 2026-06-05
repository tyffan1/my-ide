import type { ReactNode } from 'react'
import {
  ACCENT_COLORS,
  APP_THEME_LABELS,
  FONT_FAMILIES,
} from './settings/defaults'
import type { AppSettings, AppTheme, CursorBlinking, EditorTheme, SettingsCategory } from './settings/types'

type SettingsViewProps = {
  settings: AppSettings
  category: SettingsCategory
  onCategoryChange: (category: SettingsCategory) => void
  onUpdate: <K extends keyof AppSettings, F extends keyof AppSettings[K]>(
    category: K,
    field: F,
    value: AppSettings[K][F],
  ) => void
  onResetAll: () => void
  onResetCategory: (category: SettingsCategory) => void
}

const categories: { id: SettingsCategory; label: string; description: string }[] = [
  { id: 'editor', label: 'Editor', description: 'Font, tabs, and code editing' },
  { id: 'appearance', label: 'Appearance', description: 'Theme and accent colors' },
  { id: 'workbench', label: 'Workbench', description: 'Layout and panels' },
  { id: 'files', label: 'Files', description: 'Auto save and file handling' },
]

const editorThemes: { id: EditorTheme; label: string }[] = [
  { id: 'vs-dark', label: 'Dark' },
  { id: 'vs-light', label: 'Light' },
  { id: 'hc-black', label: 'High Contrast' },
]

const cursorOptions: { id: CursorBlinking; label: string }[] = [
  { id: 'blink', label: 'Blink' },
  { id: 'smooth', label: 'Smooth' },
  { id: 'phase', label: 'Phase' },
  { id: 'solid', label: 'Solid' },
  { id: 'expand', label: 'Expand' },
]

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="settings-row">
      <div className="settings-row-label">
        <span>{label}</span>
        {description && <small>{description}</small>}
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  )
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      aria-pressed={checked}
      className={`settings-toggle ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span />
    </button>
  )
}

function NumberStepper({
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}) {
  return (
    <div className="settings-stepper">
      <button onClick={() => onChange(Math.max(min, value - step))} type="button">
        −
      </button>
      <strong>
        {value}
        {suffix}
      </strong>
      <button onClick={() => onChange(Math.min(max, value + step))} type="button">
        +
      </button>
    </div>
  )
}

export function SettingsView({
  settings,
  category,
  onCategoryChange,
  onUpdate,
  onResetAll,
  onResetCategory,
}: SettingsViewProps) {
  const activeCategory = categories.find((item) => item.id === category) ?? categories[0]

  return (
    <section className="settings-view">
      <header className="settings-header">
        <div>
          <h1>Settings</h1>
          <p>Customize My IDE appearance and behavior. Changes apply instantly.</p>
        </div>
        <div className="settings-header-actions">
          <button onClick={() => onResetCategory(category)} type="button">
            Reset section
          </button>
          <button onClick={onResetAll} type="button">
            Reset all
          </button>
        </div>
      </header>

      <div className="settings-layout">
        <nav className="settings-nav">
          {categories.map((item) => (
            <button
              className={category === item.id ? 'active' : ''}
              key={item.id}
              onClick={() => onCategoryChange(item.id)}
              type="button"
            >
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </nav>

        <div className="settings-content">
          <h2>{activeCategory.label}</h2>

          {category === 'editor' && (
            <>
              <SettingRow description="Editor text size" label="Font size">
                <NumberStepper
                  max={24}
                  min={11}
                  onChange={(value) => onUpdate('editor', 'fontSize', value)}
                  value={settings.editor.fontSize}
                />
              </SettingRow>

              <SettingRow description="Monospace font stack" label="Font family">
                <select
                  onChange={(event) => onUpdate('editor', 'fontFamily', event.target.value)}
                  value={settings.editor.fontFamily}
                >
                  {FONT_FAMILIES.map((font) => (
                    <option key={font} value={font}>
                      {font.split(',')[0]}
                    </option>
                  ))}
                </select>
              </SettingRow>

              <SettingRow description="Spaces per tab" label="Tab size">
                <NumberStepper
                  max={8}
                  min={2}
                  onChange={(value) => onUpdate('editor', 'tabSize', value)}
                  value={settings.editor.tabSize}
                />
              </SettingRow>

              <SettingRow description="Monaco editor color theme" label="Editor theme">
                <select
                  onChange={(event) =>
                    onUpdate('editor', 'theme', event.target.value as EditorTheme)
                  }
                  value={settings.editor.theme}
                >
                  {editorThemes.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.label}
                    </option>
                  ))}
                </select>
              </SettingRow>

              <SettingRow label="Line numbers">
                <Toggle
                  checked={settings.editor.lineNumbers}
                  onChange={(value) => onUpdate('editor', 'lineNumbers', value)}
                />
              </SettingRow>

              <SettingRow label="Minimap">
                <Toggle
                  checked={settings.editor.minimap}
                  onChange={(value) => onUpdate('editor', 'minimap', value)}
                />
              </SettingRow>

              <SettingRow label="Word wrap">
                <Toggle
                  checked={settings.editor.wordWrap}
                  onChange={(value) => onUpdate('editor', 'wordWrap', value)}
                />
              </SettingRow>

              <SettingRow label="Smooth scrolling">
                <Toggle
                  checked={settings.editor.smoothScrolling}
                  onChange={(value) => onUpdate('editor', 'smoothScrolling', value)}
                />
              </SettingRow>

              <SettingRow label="Bracket pair colorization">
                <Toggle
                  checked={settings.editor.bracketPairColorization}
                  onChange={(value) => onUpdate('editor', 'bracketPairColorization', value)}
                />
              </SettingRow>

              <SettingRow label="Cursor blinking">
                <select
                  onChange={(event) =>
                    onUpdate('editor', 'cursorBlinking', event.target.value as CursorBlinking)
                  }
                  value={settings.editor.cursorBlinking}
                >
                  {cursorOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </SettingRow>
            </>
          )}

          {category === 'appearance' && (
            <>
              <SettingRow description="Application shell theme" label="Color theme">
                <div className="settings-theme-grid">
                  {(Object.keys(APP_THEME_LABELS) as AppTheme[]).map((theme) => (
                    <button
                      className={`settings-theme-card ${settings.appearance.theme === theme ? 'active' : ''}`}
                      key={theme}
                      onClick={() => onUpdate('appearance', 'theme', theme)}
                      type="button"
                    >
                      <span className={`theme-preview theme-preview-${theme}`} />
                      <strong>{APP_THEME_LABELS[theme]}</strong>
                    </button>
                  ))}
                </div>
              </SettingRow>

              <SettingRow description="Status bar, highlights, and accents" label="Accent color">
                <div className="settings-accent-grid">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      aria-label={color.label}
                      className={settings.appearance.accentColor === color.value ? 'active' : ''}
                      key={color.id}
                      onClick={() => onUpdate('appearance', 'accentColor', color.value)}
                      style={{ '--swatch': color.value } as React.CSSProperties & { '--swatch': string }}
                      title={color.label}
                      type="button"
                    />
                  ))}
                </div>
              </SettingRow>
            </>
          )}

          {category === 'workbench' && (
            <>
              <SettingRow description="Explorer sidebar width" label="Sidebar width">
                <NumberStepper
                  max={400}
                  min={200}
                  onChange={(value) => onUpdate('workbench', 'sidebarWidth', value)}
                  suffix="px"
                  value={settings.workbench.sidebarWidth}
                />
              </SettingRow>

              <SettingRow description="Terminal and problems panel" label="Panel height">
                <NumberStepper
                  max={400}
                  min={120}
                  onChange={(value) => onUpdate('workbench', 'panelHeight', value)}
                  suffix="px"
                  value={settings.workbench.panelHeight}
                />
              </SettingRow>

              <SettingRow label="Show bottom panel">
                <Toggle
                  checked={settings.workbench.showBottomPanel}
                  onChange={(value) => onUpdate('workbench', 'showBottomPanel', value)}
                />
              </SettingRow>

              <SettingRow label="Show status bar">
                <Toggle
                  checked={settings.workbench.showStatusBar}
                  onChange={(value) => onUpdate('workbench', 'showStatusBar', value)}
                />
              </SettingRow>
            </>
          )}

          {category === 'files' && (
            <>
              <SettingRow description="Save open files automatically" label="Auto save">
                <Toggle
                  checked={settings.files.autoSave}
                  onChange={(value) => onUpdate('files', 'autoSave', value)}
                />
              </SettingRow>

              <SettingRow description="Delay before auto save runs" label="Auto save delay">
                <NumberStepper
                  max={5000}
                  min={300}
                  onChange={(value) => onUpdate('files', 'autoSaveDelay', value)}
                  step={100}
                  suffix="ms"
                  value={settings.files.autoSaveDelay}
                />
              </SettingRow>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
