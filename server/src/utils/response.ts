import { ApiResponse } from '../types';

export function success<T>(data: T = null as any, message: string = 'success'): ApiResponse<T> {
  return { code: 200, message, data };
}

export function fail(message: string = '操作失败', code: number = 400): ApiResponse {
  return { code, message, data: null };
}
