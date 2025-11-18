
export interface User {
  username: string;
}

export enum MessageAuthor {
  USER = 'user',
  MODEL = 'model',
}

export interface ChatMessage {
  author: MessageAuthor;
  text: string;
}

// File Search related types
export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
  retrievedContext?: {
    uri?: string;
    title?: string;
  };
}

export interface QueryResult {
  text: string;
  groundingChunks: GroundingChunk[];
}

export interface ExampleQuestion {
  product?: string;
  questions: string[];
}

export interface RagStore {
  name: string;
  displayName?: string;
  createTime?: string;
  updateTime?: string;
}

export interface FileUploadOperation {
  name: string;
  done: boolean;
  error?: any;
  metadata?: any;
}
