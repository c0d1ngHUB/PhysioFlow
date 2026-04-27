import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationInfo;
}

export function getPaginationParams(req: Request): PaginationParams {
  const rawPage = req.query.page;
  const rawLimit = req.query.limit;

  const page = Math.max(1, typeof rawPage === 'string' ? parseInt(rawPage, 10) || 1 : 1);
  const limit = Math.max(1, Math.min(100, typeof rawLimit === 'string' ? parseInt(rawLimit, 10) || 20 : 20));

  return { page, limit };
}

export function createPaginationInfo(total: number, page: number, limit: number): PaginationInfo {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export function paginatedResponse<T>(data: T[], total: number, page: number, limit: number): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination: createPaginationInfo(total, page, limit),
  };
}
