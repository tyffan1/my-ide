export function fileIdFromPath(filePath: string) {
  return filePath.replace(/\\/g, '/')
}

export function guessLanguage(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'ts':
    case 'tsx':
      return 'typescript'
    case 'js':
    case 'jsx':
      return 'javascript'
    case 'json':
      return 'json'
    case 'css':
      return 'css'
    case 'html':
      return 'html'
    case 'md':
      return 'markdown'
    default:
      return 'plaintext'
  }
}

export function toWorkspaceFile(file: { path: string; name: string; content: string }) {
  return {
    id: fileIdFromPath(file.path),
    name: file.name,
    path: file.path.replace(/\\/g, '/'),
    language: guessLanguage(file.name),
    content: file.content,
  }
}

export function workspaceLabel(folderPath: string | null, hasNativeDialogs: boolean) {
  if (folderPath) {
    const parts = folderPath.replace(/\\/g, '/').split('/')
    return parts.at(-1) ?? folderPath
  }

  return hasNativeDialogs ? 'My IDE' : 'my-ide'
}

export type FileTreeFile = {
  type: 'file'
  name: string
  path: string
  fileId: string
}

export type FileTreeFolder = {
  type: 'folder'
  name: string
  path: string
  children: FileTreeNode[]
}

export type FileTreeNode = FileTreeFile | FileTreeFolder

function sortTreeNodes(nodes: FileTreeNode[]): FileTreeNode[] {
  return nodes
    .sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === 'folder' ? -1 : 1
      }

      return left.name.localeCompare(right.name)
    })
    .map((node) =>
      node.type === 'folder'
        ? { ...node, children: sortTreeNodes(node.children) }
        : node,
    )
}

export function buildFileTree(
  files: { id: string; name: string; path: string }[],
): FileTreeNode[] {
  const root: FileTreeFolder = { type: 'folder', name: '', path: '', children: [] }

  for (const file of files) {
    const segments = file.path.split('/').filter(Boolean)
    const fileName = segments.pop() ?? file.name
    let current = root

    for (let index = 0; index < segments.length; index += 1) {
      const folderName = segments[index]
      const folderPath = segments.slice(0, index + 1).join('/')
      let folder = current.children.find(
        (child): child is FileTreeFolder =>
          child.type === 'folder' && child.name === folderName,
      )

      if (!folder) {
        folder = { type: 'folder', name: folderName, path: folderPath, children: [] }
        current.children.push(folder)
      }

      current = folder
    }

    current.children.push({
      type: 'file',
      name: fileName,
      path: file.path,
      fileId: file.id,
    })
  }

  return sortTreeNodes(root.children)
}

export function collectFolderPaths(nodes: FileTreeNode[]): string[] {
  const paths: string[] = []

  for (const node of nodes) {
    if (node.type === 'folder') {
      paths.push(node.path)
      paths.push(...collectFolderPaths(node.children))
    }
  }

  return paths
}
