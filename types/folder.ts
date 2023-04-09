export interface Folder {
  name: string;
  doc_name: string;
  type: FolderType;
}

export type FolderType = 'chat' | 'prompt';
