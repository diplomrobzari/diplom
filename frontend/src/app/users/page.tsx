'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, getStorageUrl } from "../../lib/api";

type TopMetric =
  | "first_places"
  | "second_places"
  | "third_places"
  | "participations"
  | "top_three";

type TopUser = {
  id: number;
  rank: number;
  rank_value: number;
  name: string;
  surname?: string | null;
  patronymic?: string | null;
  username?: string | null;
  city?: string | null;
  avatar_url?: string | null;
  avatar_frame_asset_path?: string | null;
  first_places_count: number;
  second_places_count: number;
  third_places_count: number;
  participations_count: number;
  top_three_count: number;
};

type TopUsersResponse = {
  metric: TopMetric;
  users: TopUser[];
};

const METRICS: {
  value: TopMetric;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    value: "first_places",
    label: "Топ 1 мест",
    shortLabel: "1 места",
    description: "Пользователи с наибольшим числом первых мест",
  },
  {
    value: "second_places",
    label: "2 места",
    shortLabel: "2 места",
    description: "Рейтинг по количеству вторых мест",
  },
  {
    value: "third_places",
    label: "3 места",
    shortLabel: "3 места",
    description: "Рейтинг по количеству третьих мест",
  },
  {
    value: "participations",
    label: "Количество участий",
    shortLabel: "участий",
    description: "Самые активные участники платформы",
  },
  {
    value: "top_three",
    label: "Вхождения в топ 3",
    shortLabel: "топ 3",
    description: "Все попадания на призовые места",
  },
];

function getUserName(user: TopUser): string {
  const parts = [user.surname, user.name, user.patronymic].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : user.name;
}

function getInitial(user: TopUser): string {
  return (user.name || user.username || "?").charAt(0).toUpperCase();
}

export default function UsersTopPage() {
  const [metric, setMetric] = useState<TopMetric>("first_places");
  const [users, setUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeMetric = useMemo(
    () => METRICS.find((item) => item.value === metric) ?? METRICS[0],
    [metric]
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          metric,
          limit: "50",
        });
        const data = await apiFetch<TopUsersResponse>(`/users/top?${params.toString()}`);
        setUsers(data.users ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Не удалось загрузить рейтинг");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [metric]);

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <section className="bg-gradient-to-br from-[#7D39EB] to-black text-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-5 flex items-center gap-2">
            <span className="h-[2px] w-8 bg-[#C6FF33]" />
            <span className="text-sm font-medium uppercase tracking-widest text-[#C6FF33]">
              Рейтинг
            </span>
          </div>
          <h1 className="heading-lg mb-4">
            Топ <span className="text-[#C6FF33]">пользователей</span>
          </h1>
          <p className="max-w-2xl text-lg text-blue-100">
            Сравнивайте участников по победам, призовым местам и активности в объявлениях.
          </p>
        </div>
      </section>

      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#7D39EB]">
              Показатель рейтинга
            </h2>
            <p className="mt-1 text-sm text-gray-500">{activeMetric.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {METRICS.map((item) => {
              const active = item.value === metric;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setMetric(item.value)}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-all ${
                    active
                      ? "bg-[#7D39EB] text-white shadow-lg shadow-[#7D39EB]/20"
                      : "bg-gray-100 text-gray-700 hover:bg-[#7D39EB] hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-10">
        {error && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex h-64 items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#7D39EB] border-t-[#C6FF33]" />
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="rounded-3xl border border-gray-200 bg-white px-6 py-16 text-center">
            <h3 className="mb-2 text-2xl font-bold text-gray-900">Рейтинг пока пуст</h3>
            <p className="text-gray-600">Данные появятся после участия пользователей в соревнованиях.</p>
          </div>
        )}

        {!loading && users.length > 0 && (
          <div className="grid gap-4">
            {users.map((user) => {
              const avatarUrl = getStorageUrl(user.avatar_url);

              return (
                <article
                  key={user.id}
                  className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg lg:grid-cols-[96px_1fr_auto]"
                >
                  <div className="flex items-center gap-4 lg:block">
                    <div className="mb-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#C6FF33] text-lg font-black text-[#7D39EB] lg:mb-3">
                      {user.rank}
                    </div>
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-[#7D39EB]/20 bg-[#7D39EB]">
                      {avatarUrl ? (
                        <div
                          className="h-full w-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${avatarUrl})` }}
                          aria-label={getUserName(user)}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                          {getInitial(user)}
                        </div>
                      )}
                      {user.avatar_frame_asset_path && (
                        <div
                          className="pointer-events-none absolute -inset-1 bg-cover bg-center"
                          style={{
                            backgroundImage: `url(${user.avatar_frame_asset_path})`,
                            WebkitMaskImage: "radial-gradient(circle, transparent 58%, black 61%)",
                            maskImage: "radial-gradient(circle, transparent 58%, black 61%)",
                          }}
                        />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <Link
                      href={`/users/${user.id}`}
                      className="text-xl font-bold text-[#7D39EB] transition-colors hover:text-[#5A29A8]"
                    >
                      {getUserName(user)}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-2 text-sm text-gray-500">
                      {user.username && <span>@{user.username}</span>}
                      {user.city && <span>{user.city}</span>}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                      <div className="rounded-xl bg-[#7D39EB]/10 px-3 py-2">
                        <div className="text-xs text-gray-500">1 места</div>
                        <div className="text-lg font-black text-[#7D39EB]">{user.first_places_count}</div>
                      </div>
                      <div className="rounded-xl bg-gray-100 px-3 py-2">
                        <div className="text-xs text-gray-500">2 места</div>
                        <div className="text-lg font-black text-gray-900">{user.second_places_count}</div>
                      </div>
                      <div className="rounded-xl bg-gray-100 px-3 py-2">
                        <div className="text-xs text-gray-500">3 места</div>
                        <div className="text-lg font-black text-gray-900">{user.third_places_count}</div>
                      </div>
                      <div className="rounded-xl bg-gray-100 px-3 py-2">
                        <div className="text-xs text-gray-500">Участий</div>
                        <div className="text-lg font-black text-gray-900">{user.participations_count}</div>
                      </div>
                      <div className="rounded-xl bg-[#C6FF33]/30 px-3 py-2">
                        <div className="text-xs text-gray-500">Топ 3</div>
                        <div className="text-lg font-black text-[#7D39EB]">{user.top_three_count}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-[#111111] px-5 py-4 text-white lg:min-w-[170px] lg:flex-col lg:items-start lg:justify-center">
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#C6FF33]">
                      {activeMetric.shortLabel}
                    </span>
                    <span className="text-4xl font-black">{user.rank_value}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
