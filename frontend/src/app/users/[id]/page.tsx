'use client';

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, getStorageUrl } from "../../../lib/api";
import {
  Category,
  Competition,
  Participation,
  Tag,
  User,
  UserAchievement,
} from "../../../types";
import { StatusBadge } from "../../../components/StatusBadge";
import {
  countCompletedTasks,
  getAchievementBarColor,
  sortUserAchievements,
} from "../../../lib/achievements";

type UserProfileResponse = User & {
  competitions?: Competition[];
  participations?: Participation[];
  user_achievements?: UserAchievement[];
};

type ProfileCompetitionFilters = {
  search: string;
  city: string;
  status: string;
  date_from: string;
  date_to: string;
  category: string;
  tag: string;
  sort: "newest" | "oldest";
  place: string;
};

const COMPETITIONS_PER_PAGE = 5;
const PARTICIPATIONS_PER_PAGE = 5;

export default function UserProfilePage() {
  const params = useParams();
  const userId = params?.id as string | undefined;
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [competitionFilters, setCompetitionFilters] = useState<ProfileCompetitionFilters>({
    search: "",
    city: "",
    status: "",
    date_from: "",
    date_to: "",
    category: "",
    tag: "",
    sort: "newest",
    place: "",
  });
  const [competitionPage, setCompetitionPage] = useState(1);
  const [participationFilters, setParticipationFilters] = useState<ProfileCompetitionFilters>({
    search: "",
    city: "",
    status: "",
    date_from: "",
    date_to: "",
    category: "",
    tag: "",
    sort: "newest",
    place: "",
  });
  const [participationPage, setParticipationPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      if (!userId || userId === "undefined" || userId === "null") {
        setError("Неверный ID пользователя");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [data, categoriesData, tagsData] = await Promise.all([
          apiFetch<UserProfileResponse>(`/users/${userId}`),
          apiFetch<Category[]>("/categories"),
          apiFetch<Tag[]>("/tags"),
        ]);
        setProfile(data);
        setCategories(categoriesData);
        setTags(tagsData);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Пользователь не найден");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      void load();
    }
  }, [userId]);

  useEffect(() => {
    setCompetitionPage(1);
  }, [competitionFilters]);

  useEffect(() => {
    setParticipationPage(1);
  }, [participationFilters]);

  const competitionsWithPlace = useMemo(() => {
    const list = profile?.competitions ?? [];
    const myPlaces = new Map<number, number | null>();

    (profile?.participations ?? []).forEach((participation) => {
      if (participation.competition?.id) {
        myPlaces.set(participation.competition.id, participation.place ?? null);
      }
    });

    return list.map((comp) => ({
      comp,
      myPlace: myPlaces.get(comp.id) ?? null,
    }));
  }, [profile?.competitions, profile?.participations]);

  const filteredCompetitions = useMemo(() => {
    const filters = competitionFilters;
    const placeValue = filters.place ? Number(filters.place) : null;

    return competitionsWithPlace
      .filter(({ comp, myPlace }) => {
        if (filters.search && !comp.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.city && !comp.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
        if (filters.status && comp.status !== filters.status) return false;
        if (filters.date_from && new Date(comp.starts_at) < new Date(filters.date_from)) return false;
        if (filters.date_to && new Date(comp.starts_at) > new Date(filters.date_to)) return false;

        if (filters.category) {
          const categorySlug = comp.category?.slug ?? "";
          if (categorySlug !== filters.category) return false;
        }

        if (filters.tag) {
          const hasTag = (comp.tags ?? []).some((tag) => tag.slug === filters.tag);
          if (!hasTag) return false;
        }

        if (placeValue !== null && (!Number.isFinite(placeValue) || myPlace !== placeValue)) return false;
        return true;
      })
      .sort((a, b) => {
        const left = new Date(a.comp.starts_at).getTime();
        const right = new Date(b.comp.starts_at).getTime();
        return filters.sort === "oldest" ? left - right : right - left;
      });
  }, [competitionFilters, competitionsWithPlace]);

  const totalCompetitionPages = Math.max(1, Math.ceil(filteredCompetitions.length / COMPETITIONS_PER_PAGE));
  const safeCompetitionPage = Math.min(competitionPage, totalCompetitionPages);
  const paginatedCompetitions = filteredCompetitions.slice(
    (safeCompetitionPage - 1) * COMPETITIONS_PER_PAGE,
    safeCompetitionPage * COMPETITIONS_PER_PAGE
  );

  const participationsWithCompetition = useMemo(
    () => (profile?.participations ?? []).filter((participation) => Boolean(participation.competition)),
    [profile?.participations]
  );

  const filteredParticipations = useMemo(() => {
    const filters = participationFilters;
    const placeValue = filters.place ? Number(filters.place) : null;

    return participationsWithCompetition
      .filter((participation) => {
        const comp = participation.competition;
        if (!comp) return false;

        if (filters.search && !comp.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.city && !comp.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
        if (filters.status && comp.status !== filters.status) return false;
        if (filters.date_from && new Date(comp.starts_at) < new Date(filters.date_from)) return false;
        if (filters.date_to && new Date(comp.starts_at) > new Date(filters.date_to)) return false;

        if (filters.category) {
          const categorySlug = comp.category?.slug ?? "";
          if (categorySlug !== filters.category) return false;
        }

        if (filters.tag) {
          const hasTag = (comp.tags ?? []).some((tag) => tag.slug === filters.tag);
          if (!hasTag) return false;
        }

        if (placeValue !== null && (!Number.isFinite(placeValue) || (participation.place ?? null) !== placeValue)) return false;
        return true;
      })
      .sort((a, b) => {
        const left = new Date(a.competition?.starts_at ?? "").getTime();
        const right = new Date(b.competition?.starts_at ?? "").getTime();
        return filters.sort === "oldest" ? left - right : right - left;
      });
  }, [participationFilters, participationsWithCompetition]);

  const totalParticipationPages = Math.max(1, Math.ceil(filteredParticipations.length / PARTICIPATIONS_PER_PAGE));
  const safeParticipationPage = Math.min(participationPage, totalParticipationPages);
  const paginatedParticipations = filteredParticipations.slice(
    (safeParticipationPage - 1) * PARTICIPATIONS_PER_PAGE,
    safeParticipationPage * PARTICIPATIONS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#7D39EB] border-t-[#C6FF33] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error || "Пользователь не найден"}
          </div>
          <Link href="/" className="font-semibold text-[#7D39EB] transition-colors hover:text-[#C6FF33]">
            Вернуться на главную →
          </Link>
        </div>
      </div>
    );
  }

  const stats = (() => {
    const list = profile.participations || [];
    const finished = list.filter((participation) => participation.status === "finished" && participation.place);
    return {
      totalParticipations: list.length,
      firstPlaces: finished.filter((participation) => participation.place === 1).length,
      topThree: finished.filter((participation) => (participation.place || 0) <= 3).length,
      bestPlace: finished.length ? Math.min(...finished.map((participation) => participation.place || 999)) : null,
    };
  })();

  const selectedFrameAsset = profile.avatar_frame_asset_path || undefined;
  const selectedBackgroundAsset = profile.profile_background_asset_path || undefined;
  const organizerRating = profile.organizer_rating_avg ?? 0;
  const organizerReviewsCount = profile.organizer_reviews_count ?? 0;
  const receivedReviews = profile.reviews_received ?? [];
  const fullName =
    profile.surname && profile.name && profile.patronymic
      ? `${profile.surname} ${profile.name} ${profile.patronymic}`
      : profile.name;

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-[#F5F5F5]">
      {selectedBackgroundAsset && (
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <img
            src={selectedBackgroundAsset}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-contain object-top"
          />
          <div className="absolute inset-0 bg-[#12072b]/45" />
        </div>
      )}

      <section className="relative overflow-hidden text-white pt-12 pb-[13rem]">
        {!selectedBackgroundAsset && <div className="absolute inset-0 bg-[#7D39EB]" />}
        <div className="mx-auto max-w-7xl px-4">
          <div className="relative z-10 mb-4 flex items-center gap-2">
            <span className="h-[2px] w-8 bg-[#C6FF33]" />
            <span className="text-sm font-medium uppercase tracking-widest text-[#C6FF33]">Профиль участника</span>
          </div>
          <h1 className="relative z-10 heading-lg">Профиль пользователя</h1>
        </div>
      </section>

      <main className="relative z-20 mx-auto max-w-7xl px-4 -mt-[9rem] pb-28">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-start gap-4">
                <div className="relative h-24 w-24 shrink-0">
                  <div className="absolute inset-[8px] z-10 overflow-hidden rounded-full border-2 border-[#7D39EB]/20 bg-[#7D39EB]">
                    {profile.avatar_url ? (
                      <img
                        src={getStorageUrl(profile.avatar_url) || profile.avatar_url}
                        alt={profile.name}
                        className="block h-full w-full object-cover object-center"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                        {profile.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {selectedFrameAsset && (
                    <img
                      src={selectedFrameAsset}
                      alt="Рамка профиля"
                      className="pointer-events-none absolute inset-0 z-20 h-full w-full object-contain object-center"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="mb-2 text-lg font-bold leading-tight text-[#7D39EB]">{fullName}</h2>
                  <p className="mb-3 text-xs text-gray-500">@{profile.username}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                {profile.email && (
                  <div>
                    <span className="mb-1 block text-gray-500">Email:</span>
                    <p className="font-medium text-[#7D39EB]">{profile.email}</p>
                  </div>
                )}
                <div>
                  <span className="mb-1 block text-gray-500">Имя пользователя:</span>
                  <p className="font-medium text-[#7D39EB]">@{profile.username}</p>
                </div>
                {profile.city && (
                  <div>
                    <span className="mb-1 block text-gray-500">Город:</span>
                    <p className="font-medium text-[#7D39EB]">{profile.city}</p>
                  </div>
                )}
                {profile.birth_date && (
                  <div>
                    <span className="mb-1 block text-gray-500">Дата рождения:</span>
                    <p className="font-medium text-[#7D39EB]">{new Date(profile.birth_date).toLocaleDateString("ru-RU")}</p>
                  </div>
                )}
              </div>

              {profile.bio && (
                <div className="mt-3 text-sm">
                  <span className="mb-1 block text-gray-500">О себе:</span>
                  <p className="text-gray-700">{profile.bio}</p>
                </div>
              )}
              <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="mb-2 text-sm font-medium uppercase tracking-widest text-gray-500">Рейтинг организатора</p>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-bold text-[#7D39EB]">{organizerRating.toFixed(1)}</span>
                  <span className="pb-1 text-sm text-gray-500">из 5</span>
                </div>
                <div className="mt-3 flex gap-1 text-xl text-[#C6FF33]">
                  {Array.from({ length: 5 }, (_, index) => (
                    <span key={index}>{index < Math.round(organizerRating) ? "★" : "☆"}</span>
                  ))}
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {organizerReviewsCount > 0 ? `${organizerReviewsCount} отзыв(ов)` : "Пока нет отзывов"}
                </p>
                <Link href={`/users/${profile.id}/reviews`} className="mt-4 inline-flex btn-secondary px-4 py-2 text-sm">
                  Посмотреть отзывы
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-8 lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-[#7D39EB] uppercase mb-6">Статистика выступлений</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-3xl font-bold text-[#7D39EB] mb-1">{stats.totalParticipations}</div>
                  <div className="text-xs text-gray-600">Всего участий</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-3xl font-bold text-[#C6FF33] bg-[#7D39EB] rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-1 text-lg">
                    {stats.firstPlaces}
                  </div>
                  <div className="text-xs text-gray-600">Первых места</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-3xl font-bold text-[#7D39EB] mb-1">{stats.topThree}</div>
                  <div className="text-xs text-gray-600">В топ-3</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-3xl font-bold text-[#7D39EB] mb-1">{stats.bestPlace ?? "—"}</div>
                  <div className="text-xs text-gray-600">Лучшее место</div>
                </div>
              </div>
            </div>

            {profile.user_achievements && profile.user_achievements.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-bold uppercase text-[#7D39EB]">Достижения</h2>
                  <p className="text-sm text-gray-600">
                    Выполнено: <span className="font-bold text-[#7D39EB]">{countCompletedTasks(profile.user_achievements)}</span>
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {sortUserAchievements(profile.user_achievements).map((achievement) => {
                    const base = achievement.achievement;
                    if (!base) return null;

                    const threshold = base.threshold || 1;
                    const progressPercent = Math.min(100, (achievement.progress / threshold) * 100);
                    const totalEarned = achievement.level * threshold + achievement.progress;
                    const barColor = getAchievementBarColor(base.code ?? "");

                    return (
                      <div key={achievement.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-semibold text-gray-900">{base.name}</span>
                          {achievement.level > 0 && (
                            <span className="rounded bg-[#C6FF33]/20 px-2 py-1 text-xs font-bold text-[#7D39EB]">
                              Г-{achievement.level}
                            </span>
                          )}
                        </div>
                        {base.description && <p className="mb-2 text-xs text-gray-500">{base.description}</p>}
                        <div className="mb-2 text-xs text-gray-600">
                          {totalEarned} / {threshold}
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${progressPercent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div id="organizer-reviews" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm scroll-mt-28">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold uppercase text-[#7D39EB]">Отзывы об организаторе</h2>
                  <p className="mt-1 text-sm text-gray-500">Оценки и комментарии от участников завершённых соревнований.</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#7D39EB]">{organizerRating.toFixed(1)}</p>
                  <p className="text-sm text-gray-500">{organizerReviewsCount} отзыв(ов)</p>
                </div>
              </div>
              {receivedReviews.length === 0 ? (
                <p className="text-sm text-gray-500">Пока никто не оставил отзывы.</p>
              ) : (
                <div className="space-y-4">
                  {receivedReviews.map((review) => (
                    <div key={review.id} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#7D39EB]">
                            {review.reviewer?.surname && review.reviewer?.name
                              ? `${review.reviewer.surname} ${review.reviewer.name}`
                              : review.reviewer?.name || "Участник"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {review.competition?.title || "Соревнование"} · {new Date(review.created_at).toLocaleDateString("ru-RU")}
                          </p>
                        </div>
                        <div className="flex gap-1 text-lg text-[#C6FF33]">
                          {Array.from({ length: 5 }, (_, index) => (
                            <span key={index}>{index < review.rating ? "★" : "☆"}</span>
                          ))}
                        </div>
                      </div>
                      {review.comment && <p className="mt-3 text-sm leading-6 text-gray-700">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {profile.competitions && profile.competitions.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-bold uppercase text-[#7D39EB]">Объявления</h2>
                <div className="mb-6 grid gap-4 md:grid-cols-2">
                  <input
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 transition-colors focus:border-[#7D39EB] focus:outline-none"
                    placeholder="Поиск по названию"
                    value={competitionFilters.search}
                    onChange={(e) => setCompetitionFilters((prev) => ({ ...prev, search: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 transition-colors focus:border-[#7D39EB] focus:outline-none"
                    placeholder="Город"
                    value={competitionFilters.city}
                    onChange={(e) => setCompetitionFilters((prev) => ({ ...prev, city: e.target.value }))}
                  />
                  <select
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 transition-colors focus:border-[#7D39EB] focus:outline-none"
                    value={competitionFilters.status}
                    onChange={(e) => setCompetitionFilters((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="">Любой статус</option>
                    <option value="recruiting">Набор участников</option>
                    <option value="closed">Набор завершен</option>
                    <option value="upcoming">Скоро стартует</option>
                    <option value="live">В процессе</option>
                    <option value="finished">Завершено</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 transition-colors focus:border-[#7D39EB] focus:outline-none"
                    placeholder="Место пользователя"
                    value={competitionFilters.place}
                    onChange={(e) => setCompetitionFilters((prev) => ({ ...prev, place: e.target.value }))}
                  />
                  <select
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 transition-colors focus:border-[#7D39EB] focus:outline-none"
                    value={competitionFilters.category}
                    onChange={(e) => setCompetitionFilters((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="">Любая категория</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 transition-colors focus:border-[#7D39EB] focus:outline-none"
                    value={competitionFilters.tag}
                    onChange={(e) => setCompetitionFilters((prev) => ({ ...prev, tag: e.target.value }))}
                  >
                    <option value="">Любой тег</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.slug}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 transition-colors focus:border-[#7D39EB] focus:outline-none"
                    value={competitionFilters.date_from}
                    onChange={(e) => setCompetitionFilters((prev) => ({ ...prev, date_from: e.target.value }))}
                  />
                  <input
                    type="date"
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 transition-colors focus:border-[#7D39EB] focus:outline-none"
                    value={competitionFilters.date_to}
                    onChange={(e) => setCompetitionFilters((prev) => ({ ...prev, date_to: e.target.value }))}
                  />
                  <select
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 transition-colors focus:border-[#7D39EB] focus:outline-none"
                    value={competitionFilters.sort}
                    onChange={(e) => setCompetitionFilters((prev) => ({ ...prev, sort: e.target.value as "newest" | "oldest" }))}
                  >
                    <option value="newest">Сначала новые</option>
                    <option value="oldest">Сначала старые</option>
                  </select>
                </div>
                <div className="mb-4">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      setCompetitionFilters({
                        search: "",
                        city: "",
                        status: "",
                        date_from: "",
                        date_to: "",
                        category: "",
                        tag: "",
                        sort: "newest",
                        place: "",
                      })
                    }
                  >
                    Сбросить фильтры
                  </button>
                </div>
                <div className="space-y-3">
                  {paginatedCompetitions.length === 0 && (
                    <p className="text-sm text-gray-500">Объявления по фильтрам не найдены.</p>
                  )}
                  {paginatedCompetitions.map(({ comp, myPlace }) => (
                    <div key={comp.id} className="rounded-xl border border-gray-200 p-4 transition-shadow hover:shadow-md">
                      <div className="flex items-center justify-between">
                        <Link href={`/competitions/${comp.id}`} className="font-semibold text-[#7D39EB] transition-colors hover:text-[#C6FF33]">
                          {comp.title}
                        </Link>
                        <StatusBadge status={comp.status} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span>{comp.city}</span>
                        {myPlace ? <span>Место: {myPlace}</span> : <span>Место: —</span>}
                      </div>
                    </div>
                  ))}
                </div>
                {totalCompetitionPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCompetitionPage((current) => Math.max(1, current - 1))}
                      disabled={safeCompetitionPage <= 1}
                      className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#7D39EB] hover:text-[#7D39EB] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ← Назад
                    </button>
                    {Array.from({ length: totalCompetitionPages }, (_, index) => index + 1).map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setCompetitionPage(pageNumber)}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                          pageNumber === safeCompetitionPage
                            ? "bg-[#7D39EB] text-white"
                            : "border-2 border-gray-200 text-gray-700 hover:border-[#7D39EB] hover:text-[#7D39EB]"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCompetitionPage((current) => Math.min(totalCompetitionPages, current + 1))}
                      disabled={safeCompetitionPage >= totalCompetitionPages}
                      className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#7D39EB] hover:text-[#7D39EB] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Вперед →
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold uppercase text-[#7D39EB]">Участия</h2>
              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <input
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 transition-colors focus:border-[#7D39EB] focus:outline-none"
                  placeholder="Поиск по названию"
                  value={participationFilters.search}
                  onChange={(e) => setParticipationFilters((prev) => ({ ...prev, search: e.target.value }))}
                />
                <input
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 transition-colors focus:border-[#7D39EB] focus:outline-none"
                  placeholder="Город"
                  value={participationFilters.city}
                  onChange={(e) => setParticipationFilters((prev) => ({ ...prev, city: e.target.value }))}
                />
                <select
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 transition-colors focus:border-[#7D39EB] focus:outline-none"
                  value={participationFilters.status}
                  onChange={(e) => setParticipationFilters((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="">Любой статус</option>
                  <option value="recruiting">Набор участников</option>
                  <option value="closed">Набор завершен</option>
                  <option value="upcoming">Скоро стартует</option>
                  <option value="live">В процессе</option>
                  <option value="finished">Завершено</option>
                </select>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 transition-colors focus:border-[#7D39EB] focus:outline-none"
                  placeholder="Место пользователя"
                  value={participationFilters.place}
                  onChange={(e) => setParticipationFilters((prev) => ({ ...prev, place: e.target.value }))}
                />
                <select
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 transition-colors focus:border-[#7D39EB] focus:outline-none"
                  value={participationFilters.category}
                  onChange={(e) => setParticipationFilters((prev) => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">Любая категория</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 transition-colors focus:border-[#7D39EB] focus:outline-none"
                  value={participationFilters.tag}
                  onChange={(e) => setParticipationFilters((prev) => ({ ...prev, tag: e.target.value }))}
                >
                  <option value="">Любой тег</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.slug}>
                      {tag.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 transition-colors focus:border-[#7D39EB] focus:outline-none"
                  value={participationFilters.date_from}
                  onChange={(e) => setParticipationFilters((prev) => ({ ...prev, date_from: e.target.value }))}
                />
                <input
                  type="date"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 transition-colors focus:border-[#7D39EB] focus:outline-none"
                  value={participationFilters.date_to}
                  onChange={(e) => setParticipationFilters((prev) => ({ ...prev, date_to: e.target.value }))}
                />
                <select
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 transition-colors focus:border-[#7D39EB] focus:outline-none"
                  value={participationFilters.sort}
                  onChange={(e) => setParticipationFilters((prev) => ({ ...prev, sort: e.target.value as "newest" | "oldest" }))}
                >
                  <option value="newest">Сначала новые</option>
                  <option value="oldest">Сначала старые</option>
                </select>
              </div>
              <div className="mb-4">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    setParticipationFilters({
                      search: "",
                      city: "",
                      status: "",
                      date_from: "",
                      date_to: "",
                      category: "",
                      tag: "",
                      sort: "newest",
                      place: "",
                    })
                  }
                >
                  Сбросить фильтры
                </button>
              </div>
              <div className="space-y-3">
                {paginatedParticipations.length === 0 && (
                  <p className="text-sm text-gray-500">Участия по фильтрам не найдены.</p>
                )}
                {paginatedParticipations.map((participation) =>
                  participation.competition ? (
                    <div key={participation.id} className="rounded-xl border border-gray-200 p-4 transition-shadow hover:shadow-md">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/competitions/${participation.competition.id}`}
                          className="font-semibold text-[#7D39EB] transition-colors hover:text-[#C6FF33]"
                        >
                          {participation.competition.title}
                        </Link>
                        <div className="flex items-center gap-2">
                          {participation.status === "no_show" && <span className="text-xs font-medium text-orange-600">Не явился</span>}
                          {participation.status === "registered" && <span className="text-xs text-gray-500">Записан</span>}
                          {participation.status === "finished" && participation.place && (
                            <span className="text-xs text-gray-500">{participation.place} место</span>
                          )}
                        </div>
                      </div>
                      {participation.competition.city && (
                        <p className="mt-1 text-xs text-gray-500">{participation.competition.city}</p>
                      )}
                      {participation.status === "finished" && (
                        <>
                          {participation.place && <p className="mt-1 text-xs text-gray-600">Место: {participation.place}</p>}
                          {participation.score && <p className="text-xs text-gray-600">Баллы: {participation.score}</p>}
                          {participation.result_note && <p className="mt-1 text-xs text-gray-600">{participation.result_note}</p>}
                        </>
                      )}
                    </div>
                  ) : null
                )}
              </div>
              {totalParticipationPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setParticipationPage((current) => Math.max(1, current - 1))}
                    disabled={safeParticipationPage <= 1}
                    className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#7D39EB] hover:text-[#7D39EB] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ← Назад
                  </button>
                  {Array.from({ length: totalParticipationPages }, (_, index) => index + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setParticipationPage(pageNumber)}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                        pageNumber === safeParticipationPage
                          ? "bg-[#7D39EB] text-white"
                          : "border-2 border-gray-200 text-gray-700 hover:border-[#7D39EB] hover:text-[#7D39EB]"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setParticipationPage((current) => Math.min(totalParticipationPages, current + 1))}
                    disabled={safeParticipationPage >= totalParticipationPages}
                    className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#7D39EB] hover:text-[#7D39EB] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Вперед →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
