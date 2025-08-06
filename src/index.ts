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

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors({
  origin: [
    "https://url.33na3.work", 
    "http://localhost:3000", 
    "http://localhost:5173"
  ],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

const openapi = fromHono(app, {
  docs_url: "/docs",
});

openapi.get("/api/urls", UrlList);
openapi.post("/api/urls", UrlCreate);
openapi.get("/api/urls/:slug", UrlGet);
openapi.put("/api/urls/:slug", UrlUpdate);
openapi.delete("/api/urls/:slug", UrlDelete);

app.get("/:studentId/:slug", async (c) => {
  try {
    const { studentId, slug } = c.req.param();
    
    const kvKey = generateKvKey(studentId, slug);
    const recordJson = await c.env.PRIMARY_KV.get(kvKey);
    
    if (!recordJson) {
      return c.text("短縮URLが見つかりません", 404);
    }
    
    const record: UrlRecord = JSON.parse(recordJson);
    
    const updatedRecord: UrlRecord = {
      ...record,
      accessCount: record.accessCount + 1,
      lastAccessed: new Date().toISOString(),
    };
    
    c.executionCtx.waitUntil(
      c.env.PRIMARY_KV.put(kvKey, JSON.stringify(updatedRecord))
    );
    
    return c.redirect(record.originalUrl, 302);
  } catch (error) {
    console.error("リダイレクトエラー:", error);
    return c.text("エラーが発生しました", 500);
  }
});

app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));
app.get("*", async (c) => {
  const url = new URL(c.req.url);
  
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/docs")) {
    return c.notFound();
  }
  
  const pathSegments = url.pathname.split('/').filter(Boolean);
  if (pathSegments.length === 2) {
    return c.notFound();
  }
  
  try {
    return await c.env.ASSETS.fetch(c.req.raw);
  } catch {
    try {
      const indexRequest = new Request(new URL("/index.html", c.req.url), c.req.raw);
      return await c.env.ASSETS.fetch(indexRequest);
    } catch {
      return c.text("Frontend not found", 404);
    }
  }
});
export default app;
