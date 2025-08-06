import { DateTime, Str } from "chanfana";
import type { Context } from "hono";
import { z } from "zod";

export type AppContext = Context<{ Bindings: Env }>;

// 短縮URLレコード
export const UrlRecord = z.object({
  originalUrl: Str({ example: "https://github.com/example/repo" }),
  slug: Str({ example: "github" }),
  studentId: Str({ example: "2024001" }),
  createdAt: DateTime(),
  lastAccessed: DateTime({ required: false }),
  accessCount: z.number().default(0),
  description: Str({ required: false, example: "GitHub repository" }),
});

export type UrlRecord = z.infer<typeof UrlRecord>;

// 短縮URL作成リクエスト
export const CreateUrlRequest = z.object({
  originalUrl: Str({ example: "https://github.com/example/repo" }),
  slug: Str({ example: "github" }),
  description: Str({ required: false, example: "GitHub repository" }),
});

export type CreateUrlRequest = z.infer<typeof CreateUrlRequest>;

// 短縮URL更新リクエスト
export const UpdateUrlRequest = z.object({
  originalUrl: Str({ required: false, example: "https://github.com/example/repo" }),
  description: Str({ required: false, example: "GitHub repository" }),
});

export type UpdateUrlRequest = z.infer<typeof UpdateUrlRequest>;

// レスポンス用
export const UrlResponse = z.object({
  shortUrl: Str({ example: "https://short.example.com/2024001/github" }),
  originalUrl: Str({ example: "https://github.com/example/repo" }),
  slug: Str({ example: "github" }),
  createdAt: DateTime(),
  accessCount: z.number(),
	description: Str({ required: false }),
});

export type UrlResponse = z.infer<typeof UrlResponse>;

// エラーレスポンス
export const ErrorResponse = z.object({
  error: Str(),
  message: Str(),
});

export type ErrorResponse = z.infer<typeof ErrorResponse>;

// 認証済みユーザー情報
export interface AuthenticatedUser {
  studentId: string;
  email: string;
  domain: string;
}
