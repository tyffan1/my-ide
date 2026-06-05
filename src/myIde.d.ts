export type OpenedFilePayload = {
  path: string
  name: string
  content: string
}

export type OpenedFolderPayload = {
  folderPath: string
  files: OpenedFilePayload[]
}

export type MyIdeApi = {
  platform: string
  openFile: () => Promise<OpenedFilePayload | null>
  openFolder: () => Promise<OpenedFolderPayload | null>
  quit: () => Promise<void>
  minimize: () => Promise<void>
  toggleMaximize: () => Promise<void>
  closeWindow: () => Promise<void>
  newWindow: () => Promise<void>
}

declare global {
  interface Window {
    myIde?: MyIdeApi
  }
}

export {}
