// API レスポンス型
export interface UrlRecord {
  shortUrl: string;
  originalUrl: string;
  slug: string;
  createdAt: string;
  accessCount: number;
  description?: string;
}

export interface CreateUrlRequest {
  originalUrl: string;
  slug: string;
  description?: string;
}

export interface UrlListResponse {
  urls: UrlRecord[];
  total: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
}

// 認証関連
export interface User {
  email: string;
  name: string;
  picture?: string;
  studentId: string;
}

// Google Identity Services
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfig) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement, config: GoogleButtonConfig) => void;
        };
      };
    };
  }
}

export interface GoogleIdConfig {
  client_id: string;
  callback: (response: CredentialResponse) => void;
  auto_select?: boolean;
}

export interface CredentialResponse {
  credential: string;
  select_by?: string;
}

export interface GoogleButtonConfig {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: string;
  locale?: string;
} 