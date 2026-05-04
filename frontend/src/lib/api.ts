const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000/api";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const API_REQUEST_TIMEOUT_MS = 20000;

type ApiOptions = {
  method?: string;
  token?: string | null;
  body?: Record<string, unknown> | FormData;
  cache?: RequestCache;
};

export async function apiFetch<T>(
  path: string,
  { method = "GET", token, body, cache }: ApiOptions = {}
): Promise<T> {
  const normalizedMethod = method.toUpperCase();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  // Автоматически используем токен из localStorage, если не передан явно
  const authToken = token !== undefined ? token : getToken();
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  if (!SAFE_METHODS.has(normalizedMethod)) {
    const csrfToken = getCookie("XSRF-TOKEN");
    if (csrfToken) {
      headers["X-XSRF-TOKEN"] = decodeURIComponent(csrfToken);
    }
  }

  let res: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);

  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: normalizedMethod,
      headers,
      body: payload,
      cache: cache ?? (SAFE_METHODS.has(normalizedMethod) ? "default" : "no-store"),
      credentials: "include",
      signal: controller.signal,
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Сервер слишком долго отвечает. Попробуйте ещё раз через несколько секунд.");
    }
    throw new Error("Не удалось подключиться к серверу. Проверьте сеть и повторите попытку.");
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const text = await res.text();
    let message = "Ошибка запроса";
    let errors: Record<string, string[]> | undefined;
    let twoFactorRequired = false;

    try {
      const body = JSON.parse(text) as { message?: string; errors?: Record<string, string[]>; two_factor_required?: boolean };
      if (res.status === 422 && body.errors) {
        errors = body.errors;
        const first = Object.values(body.errors)[0]?.[0];
        message = first || body.message || message;
      } else if (res.status === 429) {
        message = "Слишком много попыток. Подождите минуту и попробуйте снова.";
      } else {
        message = localizeApiMessage(body.message || message, res.status);
      }
      
      // Проверяем флаг двухфакторной аутентификации
      if (body.two_factor_required === true) {
        twoFactorRequired = true;
      }
    } catch {
      if (res.status === 429) {
        message = "Слишком много попыток. Подождите минуту и попробуйте снова.";
      } else {
        message = localizeApiMessage(text || message, res.status);
      }
    }

    if (res.status === 401 && (text.includes("Unauthenticated") || text.includes("Unauthorized") || text.includes("token"))) {
      clearToken();
    }

    const err = new Error(message) as Error & { errors?: Record<string, string[]>; two_factor_required?: boolean };
    err.errors = errors;
    err.two_factor_required = twoFactorRequired;
    throw err;
  }

  return res.json();
}

function localizeApiMessage(message: string, status: number): string {
  const normalized = message.trim();

  const dictionary: Record<string, string> = {
    "Unauthenticated.": "Требуется авторизация.",
    "Unauthorized": "Недостаточно прав для выполнения действия.",
    "Forbidden": "Доступ запрещен.",
    "Not Found": "Запрошенный ресурс не найден.",
    "The given data was invalid.": "Проверьте корректность заполненных данных.",
    "CSRF token mismatch.": "Сессия истекла. Обновите страницу и попробуйте снова.",
    "Too Many Attempts.": "Слишком много попыток. Подождите и попробуйте снова.",
    "Server Error": "Внутренняя ошибка сервера.",
  };

  if (dictionary[normalized]) {
    return dictionary[normalized];
  }

  if (status === 401) return "Требуется авторизация.";
  if (status === 403) return "Недостаточно прав для выполнения действия.";
  if (status === 419) return "Сессия истекла. Обновите страницу и попробуйте снова.";
  if (status === 404) return "Запрошенный ресурс не найден.";
  if (status >= 500) return "Внутренняя ошибка сервера. Попробуйте позже.";

  return normalized || "Ошибка запроса";
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match?.[1] ?? null;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nastrarte_token");
}

export function saveToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("nastrarte_token", token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("nastrarte_token");
}

/** Полный URL для аватарки/файлов из storage (работает при разных портах frontend/backend) */
export function getStorageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const base = API_BASE.replace(/\/api\/?$/, "");
  // Новые пути к аватарам отдаем через API-роут (работает без storage:link)
  if (url.includes("/api/avatars/")) {
    const path = url.replace(/^https?:\/\/[^/]+/, "") || "/api/avatars/";
    return base + (path.startsWith("/") ? path : "/" + path);
  }

  // Старые пути /storage/* перенаправляем на /api/avatars/*
  if (url.includes("/storage/")) {
    const storagePath = url.replace(/^https?:\/\/[^/]+/, "").replace(/^\/storage\//, "");
    if (storagePath.startsWith("avatars/")) {
      return base + "/api/avatars/" + storagePath.split("/").map(encodeURIComponent).join("/");
    }
    const path = url.replace(/^https?:\/\/[^/]+/, "") || "/storage/";
    return base + (path.startsWith("/") ? path : "/" + path);
  }
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return base + (url.startsWith("/") ? url : "/" + url);
}
