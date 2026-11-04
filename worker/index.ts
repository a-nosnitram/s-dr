interface Env {
  DB: D1Database;
  APP_PASSWORD: string;
  ALLOWED_ORIGIN: string;
}

type AchievementInput = {
  id: string;
  title: string;
  note: string;
  category: "Личное" | "Учёба" | "Работа" | "Здоровье";
  date: string;
};

const categories = new Set(["Личное", "Учёба", "Работа", "Здоровье"]);

function corsHeaders(request: Request, env: Env) {
  const origin = request.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin === env.ALLOWED_ORIGIN ? origin : env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(request: Request, env: Env, data: unknown, status = 200) {
  return Response.json(data, { status, headers: corsHeaders(request, env) });
}

async function secureEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

async function isAuthorized(request: Request, env: Env) {
  if (!env.APP_PASSWORD) return false;
  const authorization = request.headers.get("Authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  return secureEqual(supplied, env.APP_PASSWORD);
}

function validateAchievement(value: unknown): AchievementInput | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== "string" || item.id.length < 1 || item.id.length > 120 ||
    typeof item.title !== "string" || item.title.trim().length < 1 || item.title.length > 80 ||
    typeof item.note !== "string" || item.note.length > 180 ||
    typeof item.category !== "string" || !categories.has(item.category) ||
    typeof item.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)
  ) return null;
  return item as AchievementInput;
}

function insertStatement(env: Env, item: AchievementInput) {
  return env.DB.prepare(
    `INSERT INTO achievements (id, title, note, category, date)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(id) DO NOTHING`,
  ).bind(item.id, item.title.trim(), item.note.trim(), item.category, item.date);
}

async function handleApi(request: Request, env: Env) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  const origin = request.headers.get("Origin");
  if (origin && origin !== env.ALLOWED_ORIGIN) return json(request, env, { error: "origin_not_allowed" }, 403);
  if (!(await isAuthorized(request, env))) return json(request, env, { error: "unauthorized" }, 401);

  if (url.pathname === "/api/achievements" && request.method === "GET") {
    const result = await env.DB.prepare(
      "SELECT id, title, note, category, date FROM achievements ORDER BY date DESC, created_at DESC",
    ).all();
    return json(request, env, { achievements: result.results });
  }

  if (url.pathname === "/api/achievements" && request.method === "POST") {
    const item = validateAchievement(await request.json().catch(() => null));
    if (!item) return json(request, env, { error: "invalid_achievement" }, 400);
    const result = await insertStatement(env, item).run();
    if (!result.meta.changes) return json(request, env, { error: "already_exists" }, 409);
    return json(request, env, { achievement: item }, 201);
  }

  if (url.pathname === "/api/achievements/import" && request.method === "POST") {
    const body = await request.json().catch(() => null) as { achievements?: unknown[] } | null;
    if (!body?.achievements || body.achievements.length > 500) return json(request, env, { error: "invalid_import" }, 400);
    const items = body.achievements.map(validateAchievement);
    if (items.some((item) => item === null)) return json(request, env, { error: "invalid_import" }, 400);
    if (items.length) await env.DB.batch(items.map((item) => insertStatement(env, item!)));
    return json(request, env, { imported: items.length });
  }

  if (url.pathname.startsWith("/api/achievements/") && request.method === "DELETE") {
    const id = decodeURIComponent(url.pathname.slice("/api/achievements/".length));
    if (!id || id.length > 120) return json(request, env, { error: "invalid_id" }, 400);
    await env.DB.prepare("DELETE FROM achievements WHERE id = ?1").bind(id).run();
    return json(request, env, { deleted: true });
  }

  return json(request, env, { error: "not_found" }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleApi(request, env);
    } catch (error) {
      console.error("API error", error instanceof Error ? error.message : "unknown");
      return json(request, env, { error: "server_error" }, 500);
    }
  },
};
