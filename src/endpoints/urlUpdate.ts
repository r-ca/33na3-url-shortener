import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { UpdateUrlRequest, UrlResponse, ErrorResponse, type UrlRecord, type AppContext } from "../types";
import { verifyGoogleIdToken, extractTokenFromHeader, generateKvKey } from "../utils/auth";

export class UrlUpdate extends OpenAPIRoute {
  schema = {
    tags: ["URLs"],
    summary: "短縮URLを更新",
    description: "指定されたスラグの短縮URLを更新します。認証が必要です。",
    security: [{ BearerAuth: [] }],
    request: {
      params: z.object({
        slug: z.string().min(1).describe("短縮URLのスラグ"),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateUrlRequest,
          },
        },
      },
    },
    responses: {
      "200": {
        description: "短縮URL更新成功",
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
      "403": {
        description: "アクセス権限なし",
        content: {
          "application/json": {
            schema: ErrorResponse,
          },
        },
      },
      "404": {
        description: "URLが見つからない",
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

      // パラメータ取得
      const data = await this.getValidatedData<typeof this.schema>();
      const { slug } = data.params;
      const { originalUrl, description } = data.body;

      // 既存URLレコード取得
      const kvKey = generateKvKey(user.studentId, slug);
      const recordJson = await c.env.PRIMARY_KV.get(kvKey);

      if (!recordJson) {
        return c.json(
          { error: "URL_NOT_FOUND", message: "指定されたURLが見つかりません" },
          404
        );
      }

      const existingRecord: UrlRecord = JSON.parse(recordJson);

      // 所有者チェック
      if (existingRecord.studentId !== user.studentId) {
        return c.json(
          { error: "ACCESS_DENIED", message: "このURLを更新する権限がありません" },
          403
        );
      }

      // URLの検証（変更される場合）
      if (originalUrl) {
        try {
          new URL(originalUrl);
        } catch {
          return c.json(
            { error: "INVALID_URL", message: "有効なURLを入力してください" },
            400
          );
        }
      }

      // 更新されたレコードを作成
      const updatedRecord: UrlRecord = {
        ...existingRecord,
        ...(originalUrl && { originalUrl }),
        ...(description !== undefined && { description }),
      };

      // KVに保存
      await c.env.PRIMARY_KV.put(kvKey, JSON.stringify(updatedRecord));

      // レスポンス用の短縮URL生成
      const baseUrl = new URL(c.req.url).origin;
      const shortUrl = `${baseUrl}/${updatedRecord.studentId}/${updatedRecord.slug}`;

      return c.json({
        shortUrl,
        originalUrl: updatedRecord.originalUrl,
        slug: updatedRecord.slug,
        createdAt: updatedRecord.createdAt,
        accessCount: updatedRecord.accessCount,
        description: updatedRecord.description,
      });
    } catch (error) {
      console.error("URL更新エラー:", error);
      
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