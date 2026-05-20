'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, getToken } from "../../lib/api";
import { PaginatedNotifications, SiteNotification } from "../../types";

const PER_PAGE = 20;
const POLL_INTERVAL = 30000;

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<SiteNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleIds = useMemo(() => items.map((item) => item.id), [items]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));

  const loadNotifications = useCallback(async (pageNumber: number) => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await apiFetch<PaginatedNotifications>(
        `/notifications?per_page=${PER_PAGE}&page=${pageNumber}`,
        { token }
      );
      setItems(response.data ?? []);
      setPage(response.current_page ?? 1);
      setTotalPages(response.last_page ?? 1);
      setError(null);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Ошибка загрузки уведомлений");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadNotifications(page);
  }, [loadNotifications, page]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => visibleIds.includes(id)));
  }, [visibleIds]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible" && selectedIds.length === 0) {
        void loadNotifications(page);
      }
    }, POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [loadNotifications, page, selectedIds.length]);

  const markRead = async (notificationId: number) => {
    const token = getToken();
    if (!token) return;

    try {
      await apiFetch(`/notifications/${notificationId}/read`, {
        method: "POST",
        token,
      });
      setItems((current) =>
        current.map((item) =>
          item.id === notificationId
            ? { ...item, read_at: new Date().toISOString() }
            : item
        )
      );
    } catch {
      // Интерфейс не должен дергаться, если временно не удалось отметить уведомление.
    }
  };

  const handleMarkAllRead = async () => {
    const token = getToken();
    if (!token) return;

    setMarkingAll(true);
    try {
      await apiFetch("/notifications/read-all", {
        method: "POST",
        token,
      });
      setItems((current) =>
        current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() }))
      );
    } catch (markError: unknown) {
      setError(markError instanceof Error ? markError.message : "Не удалось отметить уведомления");
    } finally {
      setMarkingAll(false);
    }
  };

  const toggleSelected = (notificationId: number) => {
    setSelectedIds((current) =>
      current.includes(notificationId)
        ? current.filter((id) => id !== notificationId)
        : [...current, notificationId]
    );
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds(allVisibleSelected ? [] : visibleIds);
  };

  const handleDeleteSelected = async () => {
    const token = getToken();
    if (!token || selectedIds.length === 0) return;

    setDeletingSelected(true);
    try {
      await apiFetch("/notifications", {
        method: "DELETE",
        token,
        body: { ids: selectedIds },
      });

      const nextPage = selectedIds.length >= items.length && page > 1 ? page - 1 : page;
      setSelectedIds([]);

      if (nextPage !== page) {
        setPage(nextPage);
      } else {
        await loadNotifications(page);
      }
    } catch (deleteError: unknown) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить уведомления");
    } finally {
      setDeletingSelected(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F5F5F5]">
      <section className="bg-gradient-to-br from-[#7D39EB] to-black py-16 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-[2px] w-8 bg-[#C6FF33]"></span>
            <span className="text-sm font-medium uppercase tracking-widest text-[#C6FF33]">
              Центр событий
            </span>
          </div>
          <h1 className="heading-lg mb-3 break-words">Уведомления</h1>
          <p className="max-w-2xl text-blue-100">
            Здесь собраны все системные сообщения. Новые уведомления автоматически подгружаются без перезагрузки страницы.
          </p>
        </div>
      </section>

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="break-words text-xl font-bold text-[#7D39EB]">Лента уведомлений</h2>
              <p className="mt-1 text-sm text-gray-600">
                Непрочитанные уведомления подсвечиваются и доступны из шапки сайта.
              </p>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-auto">
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                disabled={items.length === 0 || deletingSelected}
                className="btn-secondary min-w-0 px-4 py-3 text-sm"
              >
                {allVisibleSelected ? "Снять выбор" : "Выбрать все"}
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={deletingSelected || selectedIds.length === 0}
                className="btn-danger min-w-0 px-4 py-3 text-sm"
              >
                {deletingSelected ? "Удаление..." : `Удалить (${selectedIds.length})`}
              </button>
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll || items.length === 0}
                className="btn-secondary min-w-0 px-4 py-3 text-sm"
              >
                {markingAll ? "..." : "Прочитать все"}
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex h-64 items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#7D39EB] border-t-[#C6FF33]"></div>
          </div>
        )}

        {error && !loading && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {!loading && items.length === 0 && !error && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <p className="text-lg font-semibold text-gray-700">Уведомлений пока нет</p>
            <p className="mt-2 text-sm text-gray-500">
              Когда система отправит вам сообщение, оно появится здесь и на вашей почте.
            </p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="space-y-4">
            {items.map((item) => {
              const competitionId = typeof item.data?.competition_id === "number" ? item.data.competition_id : null;
              const isSelected = selectedSet.has(item.id);

              return (
                <article
                  key={item.id}
                  className={`w-full overflow-hidden rounded-2xl border p-4 shadow-sm transition-colors sm:p-5 ${
                    item.read_at
                      ? "border-gray-200 bg-white"
                      : "border-[#C6FF33] bg-[#F7FFD6]"
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <label className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(item.id)}
                          className="h-5 w-5 rounded border-gray-300 accent-[#7D39EB]"
                          aria-label={`Выбрать уведомление: ${item.title}`}
                        />
                      </label>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="min-w-0 break-words text-lg font-semibold text-[#7D39EB]">{item.title}</h3>
                          {!item.read_at && (
                            <span className="shrink-0 rounded-full bg-[#7D39EB] px-2.5 py-1 text-xs font-semibold text-white">
                              Новое
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-line break-words text-sm text-gray-700">{item.message}</p>
                        <p className="mt-3 text-xs text-gray-500">
                          {new Date(item.created_at).toLocaleString("ru-RU")}
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full min-w-0 flex-col gap-2 md:w-auto md:shrink-0">
                      {competitionId && (
                        <Link href={`/competitions/${competitionId}`} className="btn-secondary min-w-0 text-center text-sm">
                          К объявлению
                        </Link>
                      )}
                      {!item.read_at && (
                        <button
                          type="button"
                          onClick={() => void markRead(item.id)}
                          className="btn-primary min-w-0 text-sm"
                        >
                          Прочитано
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}

            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
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
      </main>
    </div>
  );
}
