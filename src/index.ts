import { fromHono } from "chanfana";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { UrlCreate } from "./endpoints/urlCreate";
import { UrlDelete } from "./endpoints/urlDelete";
import { UrlGet } from "./endpoints/urlGet";
import { UrlList } from "./endpoints/urlList";
import { UrlUpdate } from "./endpoints/urlUpdate";
import { generateKvKey } from "./utils/auth";
import { type UrlRecord } from "./types";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// CORS設定
app.use("*", cors({
  origin: [
    "https://url.33na3.work", 
    "http://localhost:3000", 
    "http://localhost:5173"
  ], // 本番 + 開発用
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Setup OpenAPI registry
const openapi = fromHono(app, {
  docs_url: "/docs",
});

// API エンドポイント登録
openapi.get("/api/urls", UrlList);
openapi.post("/api/urls", UrlCreate);
openapi.get("/api/urls/:slug", UrlGet);
openapi.put("/api/urls/:slug", UrlUpdate);
openapi.delete("/api/urls/:slug", UrlDelete);

// 短縮URL リダイレクト処理
app.get("/:studentId/:slug", async (c) => {
  try {
    const { studentId, slug } = c.req.param();
    
    // URLレコード取得
    const kvKey = generateKvKey(studentId, slug);
    const recordJson = await c.env.PRIMARY_KV.get(kvKey);
    
    if (!recordJson) {
      return c.text("短縮URLが見つかりません", 404);
    }
    
    const record: UrlRecord = JSON.parse(recordJson);
    
    // アクセス数を更新
    const updatedRecord: UrlRecord = {
      ...record,
      accessCount: record.accessCount + 1,
      lastAccessed: new Date().toISOString(),
    };
    
    // 非同期でアクセス数を更新（リダイレクトを遅延させない）
    c.executionCtx.waitUntil(
      c.env.PRIMARY_KV.put(kvKey, JSON.stringify(updatedRecord))
    );
    
    // リダイレクト
    return c.redirect(record.originalUrl, 302);
  } catch (error) {
    console.error("リダイレクトエラー:", error);
    return c.text("エラーが発生しました", 500);
  }
});

// ヘルスチェック
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// Static assets (フロントエンド) を提供
app.get("*", async (c) => {
  const url = new URL(c.req.url);
  
  // API パスは除外
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/docs")) {
    return c.notFound();
  }
  
  // 短縮URL形式のチェック（/{studentId}/{slug}）
  const pathSegments = url.pathname.split('/').filter(Boolean);
  if (pathSegments.length === 2) {
    // これは短縮URLなので、上で定義したリダイレクト処理に任せる
    return c.notFound();
  }
  
  try {
    // Static asset を返す
    return await c.env.ASSETS.fetch(c.req.raw);
  } catch {
    // ファイルが見つからない場合は index.html を返す（SPA対応）
    try {
      const indexRequest = new Request(new URL("/index.html", c.req.url), c.req.raw);
      return await c.env.ASSETS.fetch(indexRequest);
    } catch {
      return c.text("Frontend not found", 404);
    }
  }
});

// Export the Hono app
export default app;
