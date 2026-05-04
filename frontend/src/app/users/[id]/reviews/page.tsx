'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, getStorageUrl } from "../../../../lib/api";
import { OrganizerReview, PaginatedOrganizerReviews, User } from "../../../../types";

type ReviewsResponse = {
  organizer: User;
  reviews: PaginatedOrganizerReviews;
};

const PER_PAGE = 10;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function UserReviewsPage() {
  const params = useParams();
  const userId = params?.id as string | undefined;
  const [organizer, setOrganizer] = useState<User | null>(null);
  const [reviews, setReviews] = useState<OrganizerReview[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;

      setLoading(true);
      setError(null);

      try {
        const data = await apiFetch<ReviewsResponse>(`/users/${userId}/reviews?per_page=${PER_PAGE}&page=${page}`);
        setOrganizer(data.organizer);
        setReviews(data.reviews.data ?? []);
        setLastPage(Math.max(1, data.reviews.last_page ?? 1));
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Не удалось загрузить отзывы."));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [page, userId]);

  const organizerName =
    organizer?.surname && organizer?.name
      ? `${organizer.surname} ${organizer.name}`
      : organizer?.name || "Организатор";

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
              {organizerName} · <span className="font-bold text-[#C6FF33]">{(organizer.organizer_rating_avg ?? 0).toFixed(1)}</span>
              {" "}из 5 · {organizer.organizer_reviews_count ?? 0} отзыв(ов)
            </p>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6">
          <Link href={organizer ? `/users/${organizer.id}` : "/users"} className="inline-flex btn-secondary px-4 py-2 text-sm">
            ← Назад
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

                    {review.organizer_reply && (
                      <div className="mt-4 rounded-xl border border-[#7D39EB]/10 bg-[#7D39EB]/5 p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#7D39EB]">Ответ организатора</p>
                        <p className="text-sm leading-6 text-gray-700">{review.organizer_reply}</p>
                        {review.organizer_replied_at && (
                          <p className="mt-2 text-xs text-gray-500">
                            {new Date(review.organizer_replied_at).toLocaleString("ru-RU")}
                          </p>
                        )}
                      </div>
                    )}
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
