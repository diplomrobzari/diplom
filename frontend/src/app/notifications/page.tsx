'use client';

import { useCallback, useEffect, useState } from "react";
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
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadNotifications(page);
      }
    }, POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [loadNotifications, page]);

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
      // Keep UI stable even if read marker fails temporarily.
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

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <section className="bg-gradient-to-br from-[#7D39EB] to-black text-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-[2px] bg-[#C6FF33]"></span>
            <span className="text-sm font-medium uppercase tracking-widest text-[#C6FF33]">
              Центр событий
            </span>
          </div>
          <h1 className="heading-lg mb-3">УВЕДОМЛЕНИЯ</h1>
          <p className="text-blue-100 max-w-2xl">
            Здесь собраны все системные сообщения. Новые уведомления автоматически подгружаются без перезагрузки страницы.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#7D39EB]">Лента уведомлений</h2>
            <p className="mt-1 text-sm text-gray-600">
              Непрочитанные уведомления подсвечиваются и доступны из шапки сайта.
            </p>
          </div>
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markingAll || items.length === 0}
            className="btn-secondary w-full sm:w-auto"
          >
            {markingAll ? "..." : "Прочитать все"}
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="w-16 h-16 border-4 border-[#7D39EB] border-t-[#C6FF33] rounded-full animate-spin"></div>
          </div>
        )}

        {error && !loading && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {!loading && items.length === 0 && !error && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
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

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-5 shadow-sm transition-colors ${
                    item.read_at
                      ? "border-gray-200 bg-white"
                      : "border-[#C6FF33] bg-[#F7FFD6]"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-[#7D39EB]">{item.title}</h3>
                        {!item.read_at && (
                          <span className="rounded-full bg-[#7D39EB] px-2.5 py-1 text-xs font-semibold text-white">
                            Новое
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-line text-sm text-gray-700">{item.message}</p>
                      <p className="mt-3 text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleString("ru-RU")}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      {competitionId && (
                        <Link href={`/competitions/${competitionId}`} className="btn-secondary px-4 py-2 text-sm">
                          К объявлению
                        </Link>
                      )}
                      {!item.read_at && (
                        <button
                          type="button"
                          onClick={() => void markRead(item.id)}
                          className="btn-primary px-4 py-2 text-sm"
                        >
                          Прочитано
                        </button>
                      )}
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
      </main>
    </div>
  );
}
