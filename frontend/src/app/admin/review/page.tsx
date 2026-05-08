'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "../../../components/StatusBadge";
import { apiFetch, getToken } from "../../../lib/api";
import { Competition } from "../../../types";

const ITEMS_PER_PAGE = 15;

export default function AdminReviewPage() {
  const router = useRouter();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [revisionTarget, setRevisionTarget] = useState<Competition | null>(null);
  const [revisionComment, setRevisionComment] = useState("");

  const loadData = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const pendingData = await apiFetch<Competition[]>("/competitions/pending", { token });
      setCompetitions(pendingData);
      setError(null);
      setPage((current) => {
        const maxPage = Math.max(1, Math.ceil(pendingData.length / ITEMS_PER_PAGE));
        return Math.min(current, maxPage);
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки объявлений");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (competitionId: number) => {
    try {
      setProcessing(competitionId);
      const token = getToken();
      if (!token) return;

      await apiFetch(`/competitions/${competitionId}/approve`, {
        method: "POST",
        token,
      });

      await loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка при одобрении объявления");
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (competitionId: number) => {
    if (!confirm("Удалить это объявление?")) return;

    try {
      setProcessing(competitionId);
      const token = getToken();
      if (!token) return;

      await apiFetch(`/competitions/${competitionId}`, {
        method: "DELETE",
        token,
      });

      await loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка при удалении объявления");
    } finally {
      setProcessing(null);
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionTarget) return;

    const trimmedComment = revisionComment.trim();
    if (trimmedComment.length < 5) {
      alert("Укажите причину доработки не короче 5 символов.");
      return;
    }

    try {
      setProcessing(revisionTarget.id);
      const token = getToken();
      if (!token) return;

      await apiFetch(`/competitions/${revisionTarget.id}/request-revision`, {
        method: "POST",
        token,
        body: { comment: trimmedComment },
      });

      setRevisionTarget(null);
      setRevisionComment("");
      await loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка при отправке объявления на доработку");
    } finally {
      setProcessing(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(competitions.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visibleCompetitions = useMemo(
    () => competitions.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE),
    [competitions, safePage]
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#7D39EB] border-t-[#C6FF33]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold uppercase text-[#7D39EB]">Проверка объявлений</h2>
        <p className="mt-1 text-sm text-gray-600">
          Объявления, ожидающие модерации или доработки ({competitions.length})
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {competitions.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-200">
            <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-medium text-gray-600">Нет объявлений на проверке</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleCompetitions.map((comp) => {
            const isRevisionState = comp.status === "needs_revision";

            return (
              <div key={comp.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-bold text-[#7D39EB]">{comp.title}</h3>
                      <StatusBadge status={comp.status} />
                    </div>

                    <p className="mb-3 text-sm text-gray-600">{comp.description}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>{comp.city}</span>
                      <span>{new Date(comp.starts_at).toLocaleDateString("ru-RU")}</span>
                      <span>
                        {comp.current_participants}/{comp.max_participants || "∞"}
                      </span>
                      <span>Создатель: @{comp.creator?.username || comp.creator?.name}</span>
                    </div>

                    {comp.moderation_comment && (
                      <div className="mt-4 rounded-xl border border-[#7D39EB]/30 bg-[#7D39EB]/10 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#7D39EB]">
                          Комментарий к доработке
                        </p>
                        <p className="mt-2 whitespace-pre-line text-sm text-[#4C1D95]">
                          {comp.moderation_comment}
                        </p>
                      </div>
                    )}

                    {isRevisionState && (
                      <p className="mt-4 text-sm text-gray-500">
                        Пока организатор не отправит исправленное объявление повторно на модерацию, доступен только просмотр и удаление.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2 xl:w-80 xl:grid-cols-2">
                    <Link
                      href={`/competitions/${comp.id}`}
                      target="_blank"
                      className="btn-secondary inline-flex h-[52px] items-center justify-center px-4 py-2 text-center text-sm"
                    >
                      Просмотр
                    </Link>

                    {!isRevisionState ? (
                      <>
                        <button
                          onClick={() => handleApprove(comp.id)}
                          disabled={processing === comp.id}
                          className="btn-primary inline-flex h-[52px] items-center justify-center px-4 py-2 text-sm"
                        >
                          {processing === comp.id ? "..." : "Одобрить"}
                        </button>
                        <button
                          onClick={() => {
                            setRevisionTarget(comp);
                            setRevisionComment(comp.moderation_comment || "");
                          }}
                          disabled={processing === comp.id}
                          className="btn-secondary inline-flex h-[52px] items-center justify-center whitespace-nowrap px-4 py-2 text-sm"
                        >
                          На доработку
                        </button>
                        <button
                          onClick={() => handleDelete(comp.id)}
                          disabled={processing === comp.id}
                          className="btn-danger inline-flex h-[52px] items-center justify-center px-4 py-2 text-sm"
                        >
                          Удалить
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleDelete(comp.id)}
                        disabled={processing === comp.id}
                        className="btn-danger inline-flex h-[52px] items-center justify-center px-4 py-2 text-sm"
                      >
                        Удалить
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
                disabled={safePage <= 1}
                className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#7D39EB] hover:text-[#7D39EB] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Назад
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    pageNumber === safePage
                      ? "bg-[#7D39EB] text-white"
                      : "border-2 border-gray-200 text-gray-700 hover:border-[#7D39EB] hover:text-[#7D39EB]"
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage >= totalPages}
                className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#7D39EB] hover:text-[#7D39EB] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Вперёд
              </button>
            </div>
          )}
        </div>
      )}

      {revisionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-[#7D39EB]">Отправить на доработку</h3>
            <p className="mt-2 text-sm text-gray-600">
              Укажите, что нужно исправить в объявлении «{revisionTarget.title}».
            </p>

            <textarea
              value={revisionComment}
              onChange={(event) => setRevisionComment(event.target.value)}
              rows={6}
              className="mt-4 w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-[#7D39EB]"
              placeholder="Например: уточните правила участия, исправьте дату окончания или добавьте точный адрес."
            />

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setRevisionTarget(null);
                  setRevisionComment("");
                }}
                className="btn-secondary px-5 py-3"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleRequestRevision}
                disabled={processing === revisionTarget.id}
                className="btn-primary px-5 py-3"
              >
                {processing === revisionTarget.id ? "..." : "Отправить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
