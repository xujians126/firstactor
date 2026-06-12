import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { registry } from "./actors";

const app = new Hono();

app.all("/api/rivet/*", (c) => registry.handler(c.req.raw));

app.use("/*", serveStatic({ root: "./public" }));

app.get("/health", (c) => c.text("OK"));

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port });
console.log(`Server running on http://localhost:${port}`);
