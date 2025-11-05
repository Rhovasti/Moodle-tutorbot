
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
