import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { AuthenticatedUser } from '../types';

// Google JWKSエンドポイント
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_JWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

/**
 * Google ID Tokenを検証し、ユーザー情報を取得
 */
export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string
): Promise<AuthenticatedUser> {
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
    });

    const email = payload.email as string;
    const emailVerified = payload.email_verified as boolean;

    if (!email || !emailVerified) {
      throw new Error('メールアドレスが確認されていません');
    }

    // メールアドレスから学籍番号を抽出（@より前の部分）
    const studentId = email.split('@')[0];

    return {
      studentId,
      email,
      domain: email.split('@')[1], // ドメイン部分（参考用）
    };
  } catch (error) {
    throw new Error(`認証に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Authorizationヘッダーからトークンを抽出
 */
export function extractTokenFromHeader(authHeader: string | undefined): string {
  if (!authHeader) {
    throw new Error('認証ヘッダーがありません');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new Error('無効な認証ヘッダー形式です');
  }

  return parts[1];
}

/**
 * KVキーを生成
 */
export function generateKvKey(studentId: string, slug: string): string {
  return `url:${studentId}:${slug}`;
}

/**
 * 学籍番号のプレフィックスキーを生成（一覧取得用）
 */
export function generateUserPrefix(studentId: string): string {
  return `url:${studentId}:`;
} 