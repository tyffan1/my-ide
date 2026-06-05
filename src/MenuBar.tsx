import { useEffect, useRef, useState } from 'react'

type MenuId = 'file' | 'edit' | 'view' | 'window'

type MenuItem =
  | { type: 'separator' }
  | {
      type: 'item'
      label: string
      shortcut?: string
      disabled?: boolean
      checked?: boolean
      action?: () => void
    }

type MenuBarActions = {
  openFile: () => void
  openFolder: () => void
  save: () => void
  saveAll: () => void
  closeEditor: () => void
  closeAllEditors: () => void
  quickOpen: () => void
  undo: () => void
  redo: () => void
  cut: () => void
  copy: () => void
  paste: () => void
  find: () => void
  toggleSidebar: () => void
  toggleSplit: () => void
  focusTerminal: () => void
  showExplorer: () => void
  showSearch: () => void
  showSettings: () => void
  exit?: () => void
  newWindow?: () => void
  minimize?: () => void
  toggleMaximize?: () => void
  closeWindow?: () => void
}

type MenuBarState = {
  canSave: boolean
  canCloseEditor: boolean
  isSplitEditor: boolean
  isSidebarCollapsed: boolean
  hasNativeShell: boolean
}

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)

const modKey = isMac ? '⌘' : 'Ctrl'
const altKey = isMac ? '⌥' : 'Alt'

function buildMenus(actions: MenuBarActions, state: MenuBarState): Record<MenuId, MenuItem[]> {
  return {
    file: [
      { type: 'item', label: 'Open File...', shortcut: `${modKey}+O`, action: actions.openFile },
      { type: 'item', label: 'Open Folder...', action: actions.openFolder },
      { type: 'separator' },
      {
        type: 'item',
        label: 'Save',
        shortcut: `${modKey}+S`,
        disabled: !state.canSave,
        action: actions.save,
      },
      { type: 'item', label: 'Save All', action: actions.saveAll },
      { type: 'separator' },
      {
        type: 'item',
        label: 'Close Editor',
        shortcut: `${modKey}+W`,
        disabled: !state.canCloseEditor,
        action: actions.closeEditor,
      },
      { type: 'item', label: 'Close All Editors', action: actions.closeAllEditors },
      ...(state.hasNativeShell && actions.exit
        ? ([
            { type: 'separator' as const },
            {
              type: 'item' as const,
              label: 'Exit',
              shortcut: isMac ? `${modKey}+Q` : `${altKey}+F4`,
              action: actions.exit,
            },
          ] as MenuItem[])
        : []),
    ],
    edit: [
      { type: 'item', label: 'Undo', shortcut: `${modKey}+Z`, action: actions.undo },
      { type: 'item', label: 'Redo', shortcut: `${modKey}+Y`, action: actions.redo },
      { type: 'separator' },
      { type: 'item', label: 'Cut', shortcut: `${modKey}+X`, action: actions.cut },
      { type: 'item', label: 'Copy', shortcut: `${modKey}+C`, action: actions.copy },
      { type: 'item', label: 'Paste', shortcut: `${modKey}+V`, action: actions.paste },
      { type: 'separator' },
      { type: 'item', label: 'Find', shortcut: `${modKey}+F`, action: actions.find },
    ],
    view: [
      { type: 'item', label: 'Quick Open...', shortcut: `${modKey}+P`, action: actions.quickOpen },
      { type: 'separator' },
      { type: 'item', label: 'Explorer', action: actions.showExplorer },
      { type: 'item', label: 'Search', action: actions.showSearch },
      { type: 'item', label: 'Settings', shortcut: `${modKey}+,`, action: actions.showSettings },
      { type: 'separator' },
      {
        type: 'item',
        label: 'Toggle Sidebar',
        shortcut: `${modKey}+B`,
        checked: !state.isSidebarCollapsed,
        action: actions.toggleSidebar,
      },
      {
        type: 'item',
        label: 'Split Editor',
        checked: state.isSplitEditor,
        action: actions.toggleSplit,
      },
      { type: 'item', label: 'Terminal', action: actions.focusTerminal },
    ],
    window: [
      ...(state.hasNativeShell && actions.newWindow
        ? [{ type: 'item' as const, label: 'New Window', action: actions.newWindow }]
        : []),
      ...(state.hasNativeShell && (actions.minimize || actions.toggleMaximize || actions.closeWindow)
        ? ([{ type: 'separator' as const }] as MenuItem[])
        : []),
      ...(state.hasNativeShell && actions.minimize
        ? [{ type: 'item' as const, label: 'Minimize', action: actions.minimize }]
        : []),
      ...(state.hasNativeShell && actions.toggleMaximize
        ? [{ type: 'item' as const, label: 'Zoom', action: actions.toggleMaximize }]
        : []),
      ...(state.hasNativeShell && actions.closeWindow
        ? [{ type: 'item' as const, label: 'Close Window', action: actions.closeWindow }]
        : []),
      ...(!state.hasNativeShell
        ? [{ type: 'item' as const, label: 'Window controls are available in Electron', disabled: true }]
        : []),
    ],
  }
}

const menuLabels: Record<MenuId, string> = {
  file: 'File',
  edit: 'Edit',
  view: 'View',
  window: 'Window',
}

type MenuBarProps = {
  actions: MenuBarActions
  state: MenuBarState
  onMenuOpenChange?: (isOpen: boolean) => void
}

export function MenuBar({ actions, state, onMenuOpenChange }: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null)
  const menubarRef = useRef<HTMLElement>(null)
  const menus = buildMenus(actions, state)

  useEffect(() => {
    onMenuOpenChange?.(openMenu !== null)
  }, [onMenuOpenChange, openMenu])

  useEffect(() => {
    if (!openMenu) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menubarRef.current?.contains(event.target as Node)) {
        setOpenMenu(null)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenMenu(null)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openMenu])

  function handleMenuClick(menuId: MenuId) {
    setOpenMenu((current) => (current === menuId ? null : menuId))
  }

  function runItem(item: MenuItem) {
    if (item.type !== 'item' || item.disabled || !item.action) {
      return
    }

    item.action()
    setOpenMenu(null)
  }

  return (
    <nav aria-label="Application menu" className="menubar" ref={menubarRef}>
      {(Object.keys(menuLabels) as MenuId[]).map((menuId) => (
        <div className="menubar-group" key={menuId}>
          <button
            aria-expanded={openMenu === menuId}
            aria-haspopup="menu"
            className={`menubar-trigger ${openMenu === menuId ? 'active' : ''}`}
            onClick={() => handleMenuClick(menuId)}
            type="button"
          >
            {menuLabels[menuId]}
          </button>
          {openMenu === menuId && (
            <div className="menubar-dropdown" role="menu">
              {menus[menuId].map((item, index) =>
                item.type === 'separator' ? (
                  <div className="menubar-separator" key={`${menuId}-sep-${index}`} role="separator" />
                ) : (
                  <button
                    className={`menubar-item ${item.checked ? 'checked' : ''}`}
                    disabled={item.disabled}
                    key={item.label}
                    onClick={() => runItem(item)}
                    role="menuitem"
                    type="button"
                  >
                    <span>{item.label}</span>
                    {item.shortcut && <kbd>{item.shortcut}</kbd>}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}
