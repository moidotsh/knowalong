// shared/types/api.ts
// Generic API response shapes. No domain types — consumers add their own
// (workout, product, etc.) in their own shared/types/ files. This file is
// the load-bearing D6 type separation: repository-normalized types are the
// only shape allowed in UI code (audit-testing-types T1).

export interface ApiResponse<T> {
  data: T;
  error?: never;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  data?: never;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
}

export interface MutationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type ID = string;

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface SoftDeletable extends Timestamps {
  deletedAt: string | null;
}
