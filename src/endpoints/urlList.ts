import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { UrlResponse, ErrorResponse, type UrlRecord, type AppContext } from "../types";
import { verifyGoogleIdToken, extractTokenFromHeader, generateUserPrefix } from "../utils/auth";

export class UrlList extends OpenAPIRoute {
  schema = {
    tags: ["URLs"],
    summary: "短縮URL一覧を取得",
    description: "認証ユーザーの短縮URL一覧を取得します。",
    security: [{ BearerAuth: [] }],
    responses: {
      "200": {
        description: "短縮URL一覧取得成功",
        content: {
          "application/json": {
            schema: z.object({
              urls: z.array(UrlResponse),
              total: z.number(),
            }),
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
    },
  };

  async handle(c: AppContext) {
    try {
      // 認証
      const authHeader = c.req.header("Authorization");
      const idToken = extractTokenFromHeader(authHeader);
      const user = await verifyGoogleIdToken(idToken, c.env.GOOGLE_CLIENT_ID);

      // ユーザーの短縮URL一覧を取得
      const prefix = generateUserPrefix(user.studentId);
      const kvList = await c.env.PRIMARY_KV.list({ prefix });

      const urls: UrlResponse[] = [];
      const baseUrl = new URL(c.req.url).origin;

      // 各URLレコードを取得して変換
      for (const key of kvList.keys) {
        const recordJson = await c.env.PRIMARY_KV.get(key.name);
        if (recordJson) {
          const record: UrlRecord = JSON.parse(recordJson);
          urls.push({
            shortUrl: `${baseUrl}/${record.studentId}/${record.slug}`,
            originalUrl: record.originalUrl,
            slug: record.slug,
            createdAt: record.createdAt,
            accessCount: record.accessCount,
            description: record.description,
          });
        }
      }

      // 作成日時の降順でソート
      urls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return c.json({
        urls,
        total: urls.length,
      });
    } catch (error) {
      console.error("URL一覧取得エラー:", error);
      
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
