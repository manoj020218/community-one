import { Response } from 'express';
import { ApiResponse, PaginatedResult } from '../types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200
): void {
  const response: ApiResponse<T> = { success: true, data, message };
  res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T, message: string = 'Created'): void {
  sendSuccess(res, data, message, 201);
}

export function sendPaginated<T>(
  res: Response,
  result: PaginatedResult<T>,
  message: string = 'Success'
): void {
  const response: ApiResponse<PaginatedResult<T>> = {
    success: true,
    data: result,
    message,
  };
  res.status(200).json(response);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode: number = 500,
  details?: Record<string, any>
): void {
  const response: ApiResponse = {
    success: false,
    error: { code, message, details },
  };
  res.status(statusCode).json(response);
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function parsePagination(query: any): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
