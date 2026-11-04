export type Category = "Личное" | "Учёба" | "Работа" | "Здоровье";

export type Achievement = {
  id: string;
  title: string;
  note: string;
  category: Category;
  date: string;
};

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function apiRequest<T>(password: string, path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) throw new ApiError(0, "API не настроен");
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${password}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new ApiError(response.status, body.error ?? "request_failed");
  return body as T;
}

export async function loadAchievements(password: string) {
  const result = await apiRequest<{ achievements: Achievement[] }>(password, "/api/achievements");
  return result.achievements;
}

export async function createAchievement(password: string, achievement: Achievement) {
  await apiRequest(password, "/api/achievements", {
    method: "POST",
    body: JSON.stringify(achievement),
  });
}

export async function deleteAchievementRemote(password: string, id: string) {
  await apiRequest(password, `/api/achievements/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function importAchievements(password: string, achievements: Achievement[]) {
  await apiRequest(password, "/api/achievements/import", {
    method: "POST",
    body: JSON.stringify({ achievements }),
  });
}
