import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { CreateUrlRequest, UrlResponse, ErrorResponse, type UrlRecord, type AppContext } from "../types";
import { verifyGoogleIdToken, extractTokenFromHeader, generateKvKey } from "../utils/auth";

export class UrlCreate extends OpenAPIRoute {
  schema = {
    tags: ["URLs"],
    summary: "短縮URLを作成",
    description: "新しい短縮URLを作成します。認証が必要です。",
    security: [{ BearerAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateUrlRequest,
          },
        },
      },
    },
    responses: {
      "201": {
        description: "短縮URL作成成功",
        content: {
          "application/json": {
            schema: UrlResponse,
          },
        },
      },
      "400": {
        description: "リクエストエラー",
        content: {
          "application/json": {
            schema: ErrorResponse,
          },
        },
      },
      "401": {
        description: "認証エラー",
        content: {
          "application/json": {
            schema: ErrorResponse,
          },
        },
      },
      "409": {
        description: "スラグが既に存在",
        content: {
          "application/json": {
            schema: ErrorResponse,
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    try {
      // 認証
      const authHeader = c.req.header("Authorization");
      const idToken = extractTokenFromHeader(authHeader);
      const user = await verifyGoogleIdToken(idToken, c.env.GOOGLE_CLIENT_ID);

      // リクエストボディの検証
      const data = await this.getValidatedData<typeof this.schema>();
      const { originalUrl, slug, description } = data.body;

      // URLの基本的な検証
      try {
        new URL(originalUrl);
      } catch {
        return c.json(
          { error: "INVALID_URL", message: "有効なURLを入力してください" },
          400
        );
      }

      // スラグの検証
      if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
        return c.json(
          { error: "INVALID_SLUG", message: "スラグは英数字、ハイフン、アンダースコアのみ使用可能です" },
          400
        );
      }

      // 既存チェック
      const kvKey = generateKvKey(user.studentId, slug);
      const existing = await c.env.PRIMARY_KV.get(kvKey);
      if (existing) {
        return c.json(
          { error: "SLUG_EXISTS", message: "このスラグは既に使用されています" },
          409
        );
      }

      // URLレコード作成
      const urlRecord: UrlRecord = {
        originalUrl,
        slug,
        studentId: user.studentId,
        createdAt: new Date().toISOString(),
        accessCount: 0,
        description,
      };

      // KVに保存
      await c.env.PRIMARY_KV.put(kvKey, JSON.stringify(urlRecord));

      // レスポンス用の短縮URL生成
      const baseUrl = new URL(c.req.url).origin;
      const shortUrl = `${baseUrl}/${user.studentId}/${slug}`;

      return c.json(
        {
          shortUrl,
          originalUrl,
          slug,
          createdAt: urlRecord.createdAt,
          accessCount: 0,
          description,
        },
        201
      );
    } catch (error) {
      console.error("URL作成エラー:", error);
      
      if (error instanceof Error && error.message.includes("認証")) {
        return c.json(
          { error: "AUTHENTICATION_FAILED", message: error.message },
          401
        );
      }

      return c.json(
        { error: "INTERNAL_ERROR", message: "内部エラーが発生しました" },
        500
      );
    }
  }
}
