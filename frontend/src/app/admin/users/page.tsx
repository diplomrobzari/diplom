'use client';

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, getStorageUrl, getToken } from "../../../lib/api";
import { User } from "../../../types";

type AdminUser = User & {
  competitions_count?: number;
  participations_count?: number;
};

type PaginatedUsers = {
  data: AdminUser[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

const PER_PAGE = 15;

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [search]);

  const loadUsers = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        per_page: String(PER_PAGE),
        page: String(page),
      });
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const [me, response] = await Promise.all([
        apiFetch<User>("/auth/me", { token }),
        apiFetch<PaginatedUsers>(`/admin/users?${params.toString()}`, { token }),
      ]);

      setCurrentUser(me);
      setUsers(response.data ?? []);
      setTotalPages(response.last_page ?? 1);
      setTotal(response.total ?? 0);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки пользователей");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, router]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const runUserAction = async (userId: number, action: "ban" | "unban" | "promote") => {
    const token = getToken();
    if (!token) return;

    const messages = {
      ban: "Заблокировать этого пользователя?",
      unban: "Разблокировать этого пользователя?",
      promote: "Назначить пользователя администратором?",
    };

    if (!confirm(messages[action])) return;

    setProcessing(userId);
    try {
      await apiFetch(`/admin/users/${userId}/${action}`, {
        method: "POST",
        token,
      });
      await loadUsers();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Не удалось выполнить действие");
    } finally {
      setProcessing(null);
    }
  };

  const renderAvatar = (user: AdminUser) => {
    const initial = (user.name || user.username || "?").charAt(0).toUpperCase();
    const avatarUrl = getStorageUrl(user.avatar_url) || user.avatar_url;

    return (
      <Link
        href={`/users/${user.id}`}
        title="Открыть профиль"
        className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#7D39EB]/20 bg-[#7D39EB] text-lg font-bold text-white transition-transform hover:scale-105"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={user.name} className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold uppercase text-[#7D39EB]">Пользователи</h2>
            <p className="mt-1 text-sm text-gray-600">
              Управление аккаунтами, блокировками и назначением администраторов ({total})
            </p>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по имени, логину или email"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-[#7D39EB] lg:max-w-sm"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#7D39EB] border-t-[#C6FF33]" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="font-medium text-gray-600">Пользователи не найдены</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((user) => {
            const isSelf = currentUser?.id === user.id;
            const isAdmin = user.is_admin === true;
            const canBan = !isSelf && !isAdmin;
            const canPromote = !isSelf && !isAdmin;
            const fullName = [user.surname, user.name, user.patronymic].filter(Boolean).join(" ") || user.name;

            return (
              <div key={user.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    {renderAvatar(user)}
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Link
                          href={`/users/${user.id}`}
                          className="font-bold text-[#7D39EB] transition-colors hover:text-[#C6FF33]"
                        >
                          {fullName}
                        </Link>
                        {isSelf && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            Вы
                          </span>
                        )}
                        {isAdmin && (
                          <span className="rounded-full bg-[#C6FF33]/25 px-2.5 py-1 text-xs font-semibold text-[#5A29A8]">
                            Админ
                          </span>
                        )}
                        {user.is_banned && (
                          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                            Забанен
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span>@{user.username || "без логина"}</span>
                        <span>{user.email}</span>
                        {user.city && <span>{user.city}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                        <span>Объявлений: {user.competitions_count ?? 0}</span>
                        <span>Участий: {user.participations_count ?? 0}</span>
                        {user.created_at && (
                          <span>Регистрация: {new Date(user.created_at).toLocaleDateString("ru-RU")}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3 xl:w-[32rem]">
                    <Link href={`/users/${user.id}`} className="btn-secondary px-4 py-2 text-center text-sm">
                      Профиль
                    </Link>
                    {user.is_banned ? (
                      <button
                        type="button"
                        onClick={() => runUserAction(user.id, "unban")}
                        disabled={processing === user.id || isSelf}
                        className="btn-secondary px-4 py-2 text-sm"
                      >
                        Разбанить
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => runUserAction(user.id, "ban")}
                        disabled={processing === user.id || !canBan}
                        className="btn-danger px-4 py-2 text-sm"
                        title={!canBan ? "Нельзя забанить себя или администратора" : undefined}
                      >
                        Забанить
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => runUserAction(user.id, "promote")}
                      disabled={processing === user.id || !canPromote}
                      className="btn-primary px-4 py-2 text-sm"
                      title={!canPromote ? "Пользователь уже админ или это ваш аккаунт" : undefined}
                    >
                      Сделать админом
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#7D39EB] hover:text-[#7D39EB] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Назад
              </button>
              <span className="text-sm font-medium text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#7D39EB] hover:text-[#7D39EB] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Вперед
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
