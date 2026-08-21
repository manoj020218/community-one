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

// Cap raised from 100 to 500: real paginated table views (Residents, Flats, ...) pass small
// explicit limits (20-30) and are unaffected, but ~15 dropdown-population calls across the
// frontend ask for `?limit=200` to list "every flat/resident for this society" in one shot —
// the old cap silently truncated those to 100 regardless of what was requested, so any society
// with 100+ flats had residents/flats past the 100th (in whichever sort order) simply missing
// from Add Resident / Record Payment / lease / SAMA flat and resident pickers, with no error.
export function parsePagination(query: any): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
