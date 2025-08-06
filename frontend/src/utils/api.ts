import { UrlRecord, CreateUrlRequest, UrlListResponse, ErrorResponse } from '../types';

const API_BASE = '/api';

class ApiError extends Error {
  constructor(public status: number, public errorResponse: ErrorResponse) {
    super(errorResponse.message);
    this.name = 'ApiError';
  }

  // エラータイプに応じたユーザーフレンドリーなメッセージを取得
  getUserMessage(): string {
    switch (this.errorResponse.error) {
      case 'SLUG_EXISTS':
      case 'SLUG_ALREADY_EXISTS':
        return 'このスラグは既に使用されています。別のスラグを選択してください。';
      case 'INVALID_URL':
        return '有効なURLを入力してください。';
      case 'INVALID_SLUG':
        return 'スラグは英数字、ハイフン、アンダースコアのみ使用可能です。';
      case 'URL_NOT_FOUND':
        return '指定されたURLが見つかりません。';
      case 'ACCESS_DENIED':
        return 'このURLを操作する権限がありません。';
      case 'AUTHENTICATION_FAILED':
        return 'ログインが必要です。再度ログインしてください。';
      case 'RATE_LIMIT_EXCEEDED':
        return 'リクエストが多すぎます。しばらく待ってから再試行してください。';
      case 'INTERNAL_ERROR':
        return 'サーバーでエラーが発生しました。しばらく待ってから再試行してください。';
      default:
        return this.errorResponse.message || 'エラーが発生しました。';
    }
  }

  // エラータイプの判定
  isValidationError(): boolean {
    return ['INVALID_URL', 'INVALID_SLUG'].includes(this.errorResponse.error);
  }

  isConflictError(): boolean {
    return ['SLUG_EXISTS', 'SLUG_ALREADY_EXISTS'].includes(this.errorResponse.error);
  }

  isAuthError(): boolean {
    return ['AUTHENTICATION_FAILED', 'ACCESS_DENIED'].includes(this.errorResponse.error);
  }

  isNotFoundError(): boolean {
    return this.errorResponse.error === 'URL_NOT_FOUND';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('idToken');
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorData: ErrorResponse;
      
      try {
        errorData = await response.json();
      } catch (parseError) {
        // JSONパースに失敗した場合のフォールバック
        errorData = {
          error: 'PARSE_ERROR',
          message: `サーバーエラー (${response.status}): ${response.statusText}`,
        };
      }
      
      throw new ApiError(response.status, errorData);
    }

    // 204 No Content の場合はJSONパースしない
    if (response.status === 204) {
      return undefined as T;
    }

    // レスポンスボディが空の場合もJSONパースしない
    const contentLength = response.headers.get('content-length');
    if (contentLength === '0') {
      return undefined as T;
    }

    try {
      return await response.json();
    } catch (parseError) {
      throw new ApiError(500, {
        error: 'RESPONSE_PARSE_ERROR',
        message: 'サーバーレスポンスの解析に失敗しました',
      });
    }
  } catch (error) {
    // ネットワークエラーや その他の例外
    if (error instanceof ApiError) {
      throw error;
    }
    
    // ネットワークエラーやその他の予期しないエラー
    throw new ApiError(0, {
      error: 'NETWORK_ERROR',
      message: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
    });
  }
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