import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { UrlResponse, ErrorResponse, type UrlRecord, type AppContext } from "../types";
import { verifyGoogleIdToken, extractTokenFromHeader, generateKvKey } from "../utils/auth";

export class UrlGet extends OpenAPIRoute {
	schema = {
    tags: ["URLs"],
    summary: "短縮URLを取得",
    description: "指定されたスラグの短縮URLを取得します。認証が必要です。",
    security: [{ BearerAuth: [] }],
		request: {
			params: z.object({
        slug: z.string().min(1).describe("短縮URLのスラグ"),
			}),
		},
		responses: {
			"200": {
        description: "短縮URL取得成功",
        content: {
          "application/json": {
            schema: UrlResponse,
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

      // URLレコード取得
      const kvKey = generateKvKey(user.studentId, slug);
      const recordJson = await c.env.PRIMARY_KV.get(kvKey);

      if (!recordJson) {
        return c.json(
          { error: "URL_NOT_FOUND", message: "指定されたURLが見つかりません" },
          404
        );
      }

      const record: UrlRecord = JSON.parse(recordJson);

      // 所有者チェック（念のため）
      if (record.studentId !== user.studentId) {
        return c.json(
          { error: "ACCESS_DENIED", message: "このURLにアクセスする権限がありません" },
          403
        );
      }

      // レスポンス用の短縮URL生成
      const baseUrl = new URL(c.req.url).origin;
      const shortUrl = `${baseUrl}/${record.studentId}/${record.slug}`;

      return c.json({
        shortUrl,
        originalUrl: record.originalUrl,
        slug: record.slug,
        createdAt: record.createdAt,
        accessCount: record.accessCount,
        description: record.description,
      });
    } catch (error) {
      console.error("URL取得エラー:", error);
      
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
