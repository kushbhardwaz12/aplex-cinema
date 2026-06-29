export interface MovieLinks {
  quality620?: string;
  quality720?: string;
  quality1080?: string;
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  genres: string[];
  links: MovieLinks;
  createdAt: string;
  updatedAt?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
