import { UrlRecord, CreateUrlRequest, UrlListResponse, ErrorResponse } from '../types';

const API_BASE = '/api';

class ApiError extends Error {
  constructor(public status: number, public errorResponse: ErrorResponse) {
    super(errorResponse.message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('idToken');
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData: ErrorResponse = await response.json().catch(() => ({
      error: 'UNKNOWN_ERROR',
      message: 'Unknown error occurred',
    }));
    throw new ApiError(response.status, errorData);
  }

  return response.json();
}

export const api = {
  // URL一覧取得
  getUrls: (): Promise<UrlListResponse> => 
    apiRequest('/urls'),

  // URL作成
  createUrl: (data: CreateUrlRequest): Promise<UrlRecord> =>
    apiRequest('/urls', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // URL取得
  getUrl: (slug: string): Promise<UrlRecord> =>
    apiRequest(`/urls/${slug}`),

  // URL更新
  updateUrl: (slug: string, data: { originalUrl?: string; description?: string }): Promise<UrlRecord> =>
    apiRequest(`/urls/${slug}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // URL削除
  deleteUrl: (slug: string): Promise<void> =>
    apiRequest(`/urls/${slug}`, {
      method: 'DELETE',
    }),
};

export { ApiError }; 