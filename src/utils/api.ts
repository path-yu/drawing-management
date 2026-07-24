const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1';

interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export async function request<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('无法连接到服务器，请确认后端服务已启动（http://localhost:3000）');
  }

  const data = (await response.json()) as ApiResponse<T>;
  return data;
}

export const api = {
  get: <T = any>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T = any>(url: string, body: any) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  put: <T = any>(url: string, body: any) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T = any>(url: string, body?: any) =>
    request<T>(url, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
};
