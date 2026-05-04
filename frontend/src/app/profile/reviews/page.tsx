'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, getToken, getStorageUrl } from "../../../lib/api";
import { OrganizerReview, PaginatedOrganizerReviews, User } from "../../../types";

type ReviewsResponse = {
  organizer: User;
  reviews: PaginatedOrganizerReviews;
};

const PER_PAGE = 10;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function ProfileReviewsPage() {
  const [organizer, setOrganizer] = useState<User | null>(null);
  const [reviews, setReviews] = useState<OrganizerReview[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [replySavingId, setReplySavingId] = useState<number | null>(null);
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyFeedback, setReplyFeedback] = useState<Record<number, { type: "success" | "error"; message: string }>>({});

  const loadReviews = async (currentPage: number) => {
    const token = getToken();
    if (!token) {
      throw new Error("Нужно войти, чтобы посмотреть отзывы.");
    }

    const data = await apiFetch<ReviewsResponse>(`/profile/reviews?per_page=${PER_PAGE}&page=${currentPage}`, { token });
    setOrganizer(data.organizer);
    setReviews(data.reviews.data ?? []);
    setLastPage(Math.max(1, data.reviews.last_page ?? 1));
    setReplyDrafts(
      Object.fromEntries((data.reviews.data ?? []).map((review) => [review.id, review.organizer_reply ?? ""]))
    );
    setActiveReplyId(null);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        await loadReviews(page);
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Не удалось загрузить отзывы."));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [page]);

  const submitReply = async (reviewId: number) => {
    setReplySavingId(reviewId);
    setReplyFeedback((prev) => {
      const next = { ...prev };
      delete next[reviewId];
      return next;
    });

    try {
      const token = getToken();
      if (!token) {
        throw new Error("Нужно войти, чтобы ответить на отзыв.");
      }

      await apiFetch(`/profile/reviews/${reviewId}/reply`, {
        method: "POST",
        token,
        body: {
          organizer_reply: replyDrafts[reviewId] ?? "",
        },
      });

      setReplyFeedback((prev) => ({
        ...prev,
        [reviewId]: { type: "success", message: "Ответ сохранён." },
      }));

      await loadReviews(page);
      setActiveReplyId(null);
    } catch (e: unknown) {
      setReplyFeedback((prev) => ({
        ...prev,
        [reviewId]: { type: "error", message: getErrorMessage(e, "Не удалось сохранить ответ.") },
      }));
    } finally {
      setReplySavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <section className="bg-gradient-to-br from-[#7D39EB] to-black py-16 text-white">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-[2px] w-8 bg-[#C6FF33]" />
            <span className="text-sm font-medium uppercase tracking-widest text-[#C6FF33]">Отзывы</span>
          </div>
          <h1 className="heading-lg">Отзывы организатора</h1>
          {organizer && (
            <p className="mt-4 text-lg text-blue-100">
              Средняя оценка: <span className="font-bold text-[#C6FF33]">{(organizer.organizer_rating_avg ?? 0).toFixed(1)}</span>
              {" "}из 5 · {organizer.organizer_reviews_count ?? 0} отзыв(ов)
            </p>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6">
          <Link href="/profile" className="inline-flex btn-secondary px-4 py-2 text-sm">
            ← Назад в профиль
          </Link>
        </div>

        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}

        {loading && (
          <div className="flex h-64 items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#7D39EB] border-t-[#C6FF33]" />
          </div>
        )}

        {!loading && !error && reviews.length === 0 && (
          <div className="rounded-3xl border border-gray-200 bg-white px-6 py-16 text-center">
            <h2 className="mb-2 text-2xl font-bold text-gray-900">Пока нет отзывов</h2>
            <p className="text-gray-600">Отзывы появятся после завершённых соревнований.</p>
          </div>
        )}

        {!loading && !error && reviews.length > 0 && (
          <>
            <div className="space-y-4">
              {reviews.map((review) => {
                const reviewerName =
                  review.reviewer?.surname && review.reviewer?.name
                    ? `${review.reviewer.surname} ${review.reviewer.name}`
                    : review.reviewer?.name || "Участник";
                const avatarUrl = getStorageUrl(review.reviewer?.avatar_url);
                const hasOrganizerReply = Boolean(review.organizer_reply?.trim());
                const isReplyEditorOpen = activeReplyId === review.id;

                return (
                  <article key={review.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-[#7D39EB]/15 bg-[#7D39EB]">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={reviewerName} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg font-bold text-white">
                              {reviewerName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-[#7D39EB]">{reviewerName}</p>
                          <p className="text-sm text-gray-500">
                            {review.competition?.title || "Соревнование"} · {new Date(review.created_at).toLocaleDateString("ru-RU")}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 text-xl text-[#C6FF33]">
                        {Array.from({ length: 5 }, (_, index) => (
                          <span key={index}>{index < review.rating ? "★" : "☆"}</span>
                        ))}
                      </div>
                    </div>

                    {review.comment && <p className="mt-4 text-sm leading-6 text-gray-700">{review.comment}</p>}

                    <div className="mt-4 rounded-xl border border-[#7D39EB]/10 bg-[#7D39EB]/5 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-[#7D39EB]">Ответ организатора</p>
                        {!isReplyEditorOpen && (
                          <button
                            type="button"
                            className="btn-secondary px-3 py-1.5 text-xs"
                            onClick={() => setActiveReplyId(review.id)}
                          >
                            {hasOrganizerReply ? "Изменить ответ" : "Ответить"}
                          </button>
                        )}
                      </div>

                      {hasOrganizerReply && !isReplyEditorOpen && (
                        <div className="mt-3 rounded-lg bg-white/80 p-3">
                          <p className="text-sm leading-6 text-gray-700">{review.organizer_reply}</p>
                          {review.organizer_replied_at && (
                            <p className="mt-2 text-xs text-gray-500">
                              Последний ответ: {new Date(review.organizer_replied_at).toLocaleString("ru-RU")}
                            </p>
                          )}
                        </div>
                      )}

                      {isReplyEditorOpen && (
                        <div className="mt-3">
                          <textarea
                            rows={3}
                            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm text-gray-700 transition-colors focus:border-[#7D39EB] focus:outline-none"
                            placeholder="Напишите ответ участнику"
                            value={replyDrafts[review.id] ?? ""}
                            onChange={(event) =>
                              setReplyDrafts((prev) => ({
                                ...prev,
                                [review.id]: event.target.value,
                              }))
                            }
                          />
                          {review.organizer_replied_at && (
                            <p className="mt-2 text-xs text-gray-500">
                              Последний ответ: {new Date(review.organizer_replied_at).toLocaleString("ru-RU")}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              className="btn-secondary px-3 py-1.5 text-xs"
                              disabled={replySavingId === review.id}
                              onClick={() => {
                                setReplyDrafts((prev) => ({
                                  ...prev,
                                  [review.id]: review.organizer_reply ?? "",
                                }));
                                setActiveReplyId(null);
                              }}
                            >
                              Отмена
                            </button>
                            <button
                              type="button"
                              className="btn-primary px-3 py-1.5 text-xs"
                              disabled={replySavingId === review.id}
                              onClick={() => submitReply(review.id)}
                            >
                              {replySavingId === review.id
                                ? hasOrganizerReply
                                  ? "Изменение..."
                                  : "Сохранение..."
                                : hasOrganizerReply
                                  ? "Изменить ответ"
                                  : "Сохранить ответ"}
                            </button>
                          </div>
                        </div>
                      )}

                      {replyFeedback[review.id] && (
                        <div
                          className={`mt-3 rounded-lg p-3 text-sm ${
                            replyFeedback[review.id]?.type === "success"
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {replyFeedback[review.id]?.message}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {lastPage > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#7D39EB] hover:text-[#7D39EB] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ← Назад
                </button>
                {Array.from({ length: lastPage }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                      pageNumber === page
                        ? "bg-[#7D39EB] text-white"
                        : "border-2 border-gray-200 text-gray-700 hover:border-[#7D39EB] hover:text-[#7D39EB]"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                  disabled={page >= lastPage}
                  className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#7D39EB] hover:text-[#7D39EB] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Вперёд →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
