import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { ErrorResponse, type UrlRecord, type AppContext } from "../types";
import { verifyGoogleIdToken, extractTokenFromHeader, generateKvKey } from "../utils/auth";

export class UrlDelete extends OpenAPIRoute {
	schema = {
    tags: ["URLs"],
    summary: "短縮URLを削除",
    description: "指定されたスラグの短縮URLを削除します。認証が必要です。",
    security: [{ BearerAuth: [] }],
		request: {
			params: z.object({
        slug: z.string().min(1).describe("短縮URLのスラグ"),
			}),
		},
		responses: {
      "204": {
        description: "削除成功",
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

      // 所有者チェック
      if (record.studentId !== user.studentId) {
        return c.json(
          { error: "ACCESS_DENIED", message: "このURLを削除する権限がありません" },
          403
        );
      }

      // KVから削除
      await c.env.PRIMARY_KV.delete(kvKey);

      return new Response(null, { status: 204 });
    } catch (error) {
      console.error("URL削除エラー:", error);
      
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
