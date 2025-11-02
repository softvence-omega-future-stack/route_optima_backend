import { Response } from 'express';
import { HttpStatus } from '@nestjs/common';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T | null;
  meta?: Record<string, any> | null;
}
export const sendResponse = <T>(
  statusCode: HttpStatus,
  success: boolean,
  message: string,
  data: T | null = null,
  meta: Record<string, any> | null = null,
  res?: Response,
): ApiResponse<T> | Response<ApiResponse<T>> => {
  const payload: ApiResponse<T> = {
    success,
    message,
  };

  if (data !== null) payload.data = data;
  if (meta !== null) payload.meta = meta;

  if (res) {
    return res.status(statusCode).json(payload);
  }

  return payload;
};