"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearToken, getStorageUrl, getToken } from "../lib/api";
import { User } from "../types";

type UnreadNotificationsResponse = {
  count: number;
};

type CachedSessionUser = User & { is_admin?: boolean };

const USER_CACHE_KEY = "nastrarte_user_cache";
const USER_CACHE_TTL = 5 * 60 * 1000;
const UNREAD_POLL_INTERVAL = 30000;

export function Header() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  const readCachedUser = (): CachedSessionUser | null => {
    if (typeof window === "undefined") return null;

    try {
      const raw = localStorage.getItem(USER_CACHE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as { user?: CachedSessionUser; cachedAt?: number };
      if (!parsed.user || typeof parsed.cachedAt !== "number") {
        return null;
      }

      if (Date.now() - parsed.cachedAt > USER_CACHE_TTL) {
        return null;
      }

      return parsed.user;
    } catch {
      return null;
    }
  };

  const writeCachedUser = (nextUser: CachedSessionUser | null) => {
    if (typeof window === "undefined") return;

    if (!nextUser) {
      localStorage.removeItem(USER_CACHE_KEY);
      return;
    }

    localStorage.setItem(
      USER_CACHE_KEY,
      JSON.stringify({
        user: nextUser,
        cachedAt: Date.now(),
      })
    );
  };

  const loadUser = useCallback(async (authToken: string) => {
    const userData = await apiFetch<User & { is_admin?: boolean }>("/auth/me", {
      token: authToken,
      cache: "no-store",
    });
    writeCachedUser(userData);
    setUser(userData);
  }, []);

  const loadUnreadCount = useCallback(async (authToken: string) => {
    try {
      const response = await apiFetch<UnreadNotificationsResponse>("/notifications/unread-count", {
        token: authToken,
      });
      setUnreadCount(response.count ?? 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    let pollId: ReturnType<typeof setInterval> | null = null;

    const syncSession = async (forceUserRefresh = false) => {
      const currentToken = getToken();
      setToken(currentToken);

      if (!currentToken) {
        setUser(null);
        setUnreadCount(0);
        writeCachedUser(null);
        return;
      }

      const cachedUser = forceUserRefresh ? null : readCachedUser();
      if (cachedUser) {
        setUser(cachedUser);
      }

      try {
        if (!cachedUser || forceUserRefresh) {
          await loadUser(currentToken);
        } else {
          void loadUser(currentToken).catch((error: unknown) => {
            const message = error instanceof Error ? error.message : "";
            if (message.includes("Р°РІС‚РѕСЂРёР·Р°") || message.includes("Unauthenticated") || message.includes("Unauthorized")) {
              clearToken();
              setToken(null);
              setUser(null);
              setUnreadCount(0);
              writeCachedUser(null);
            }
          });
        }
        await loadUnreadCount(currentToken);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("авториза") || message.includes("Unauthenticated") || message.includes("Unauthorized")) {
          clearToken();
          setToken(null);
          setUser(null);
          setUnreadCount(0);
          writeCachedUser(null);
        }
      }
    };

    void syncSession(false);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "nastrarte_token") {
        void syncSession(true);
      }
    };

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        void syncSession(false);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", handleFocus);

    pollId = setInterval(() => {
      const currentToken = getToken();
      if (currentToken && document.visibilityState === "visible") {
        void loadUnreadCount(currentToken);
      }
    }, UNREAD_POLL_INTERVAL);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleFocus);
      if (pollId) {
        clearInterval(pollId);
      }
    };
  }, [loadUnreadCount, loadUser]);

  const handleLogout = async () => {
    try {
      const authToken = getToken();
      if (authToken) {
        await apiFetch("/auth/logout", { method: "POST", token: authToken });
      }
    } catch {
      // Ignore logout transport errors and clear local session anyway.
    }

    clearToken();
    writeCachedUser(null);
    setToken(null);
    setUser(null);
    setUnreadCount(0);
    router.push("/");
  };

  const notificationsBadge = unreadCount > 0 && (
    <span className="absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-[#C6FF33] px-1.5 py-0.5 text-[10px] font-bold text-[#7D39EB]">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
  const profileAvatarUrl = getStorageUrl(user?.avatar_url);

  return (
    <header className="sticky top-0 z-50 bg-[#7D39EB] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C6FF33] transition-transform group-hover:scale-110">
              <svg className="h-6 w-6 text-[#7D39EB]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.346A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
              </svg>
            </div>
            <span className="text-xl font-bold uppercase tracking-wider transition-colors group-hover:text-[#C6FF33]">
              НаСтарте
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/competitions" className="text-sm font-medium uppercase tracking-wide transition-colors hover:text-[#C6FF33]">
              Объявления
            </Link>
            <Link href="/users" className="text-sm font-medium uppercase tracking-wide transition-colors hover:text-[#C6FF33]">
              Рейтинг
            </Link>
            {token && (
              <Link href="/competitions/new" className="text-sm font-medium uppercase tracking-wide transition-colors hover:text-[#C6FF33]">
                Создать
              </Link>
            )}
            {token && (
              <Link href="/notifications" className="relative text-sm font-medium uppercase tracking-wide transition-colors hover:text-[#C6FF33]">
                Уведомления
                {notificationsBadge}
              </Link>
            )}
            {token && user?.is_admin && (
              <Link href="/admin" className="text-sm font-medium uppercase tracking-wide transition-colors hover:text-[#C6FF33]">
                Админ
              </Link>
            )}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            {token ? (
              <>
                <Link href="/profile" className="flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 transition-colors hover:border-[#C6FF33]">
                  <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-[#C6FF33] text-xs font-bold text-[#7D39EB]">
                    {profileAvatarUrl ? (
                      <img src={profileAvatarUrl} alt={user?.name || "Профиль"} className="h-full w-full object-cover" />
                    ) : (
                      user?.name?.[0]?.toUpperCase() || "U"
                    )}
                  </div>
                  <span className="text-sm font-medium">{user?.name || "Профиль"}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="cursor-pointer rounded-full bg-[#C6FF33] px-6 py-2 text-sm font-semibold uppercase tracking-wide text-[#7D39EB] transition-all hover:shadow-lg hover:shadow-[#C6FF33]/30"
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full border border-white/50 px-6 py-2 text-sm font-medium uppercase tracking-wide transition-all hover:border-[#C6FF33] hover:text-[#C6FF33]"
                >
                  Войти
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-[#C6FF33] px-6 py-2 text-sm font-semibold uppercase tracking-wide text-[#7D39EB] transition-all hover:shadow-lg hover:shadow-[#C6FF33]/30"
                >
                  Регистрация
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="rounded-lg p-2 transition-colors hover:bg-white/10 md:hidden"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/20 py-4 md:hidden">
            <nav className="flex flex-col gap-4">
              <Link href="/competitions" className="py-2 text-sm font-medium uppercase tracking-wide transition-colors hover:text-[#C6FF33]">
                Объявления
              </Link>
              <Link href="/users" className="py-2 text-sm font-medium uppercase tracking-wide transition-colors hover:text-[#C6FF33]">
                Рейтинг
              </Link>
              {token && (
                <>
                  <Link href="/competitions/new" className="py-2 text-sm font-medium uppercase tracking-wide transition-colors hover:text-[#C6FF33]">
                    Создать объявление
                  </Link>
                  <Link href="/notifications" className="py-2 text-sm font-medium uppercase tracking-wide transition-colors hover:text-[#C6FF33]">
                    Уведомления {unreadCount > 0 ? `(${unreadCount})` : ""}
                  </Link>
                  <Link href="/profile" className="py-2 text-sm font-medium uppercase tracking-wide transition-colors hover:text-[#C6FF33]">
                    Профиль
                  </Link>
                  {user?.is_admin && (
                    <Link href="/admin" className="py-2 text-sm font-medium uppercase tracking-wide transition-colors hover:text-[#C6FF33]">
                      Панель админа
                    </Link>
                  )}
                </>
              )}
              {token ? (
                <button
                  onClick={handleLogout}
                  className="py-2 text-left text-sm font-medium uppercase tracking-wide text-red-400 transition-colors hover:text-red-300"
                >
                  Выйти
                </button>
              ) : (
                <>
                  <Link href="/login" className="py-2 text-sm font-medium uppercase tracking-wide transition-colors hover:text-[#C6FF33]">
                    Войти
                  </Link>
                  <Link href="/register" className="py-2 text-sm font-medium uppercase tracking-wide text-[#C6FF33]">
                    Регистрация
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
