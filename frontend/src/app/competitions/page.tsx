'use client';

import { useEffect, useRef, useState } from "react";
import { Competition, Category, Tag } from "../../types";
import { apiFetch } from "../../lib/api";
import { CompetitionCard } from "../../components/CompetitionCard";

type Filters = {
  search?: string;
  city?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  category?: string;
  tags?: string[];
  sort?: string;
};

type PaginatedResponse = {
  data: Competition[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
};

const PER_PAGE = 15;

export default function CompetitionsListPage() {
  const [paginated, setPaginated] = useState<PaginatedResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [filters, setFilters] = useState<Filters>({ sort: "newest" });
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prevFiltersRef = useRef<Filters>(filters);

  const fetchData = async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageNum));
      params.set("per_page", String(PER_PAGE));
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            params.set(key, value.join(","));
          }
          return;
        }
        if (value) params.set(key, value);
      });
      const data = await apiFetch<PaginatedResponse>(
        `/competitions?${params.toString()}`
      );
      setPaginated(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiFetch<Category[]>("/categories").then(setCategories);
    apiFetch<Tag[]>("/tags").then(setTags);
  }, []);

  useEffect(() => {
    const filtersChanged =
      JSON.stringify(prevFiltersRef.current) !== JSON.stringify(filters);
    if (filtersChanged) {
      prevFiltersRef.current = filters;
      setPage(1);
      fetchData(1);
    } else {
      fetchData(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const items = paginated?.data ?? [];
  const totalPages = paginated?.last_page ?? 1;
  const currentPage = paginated?.current_page ?? 1;
  const total = paginated?.total ?? 0;
  const from = paginated?.from ?? 0;
  const to = paginated?.to ?? 0;
  const selectedTags = filters.tags ?? [];
  const visibleTagText =
    selectedTags.length === 0
      ? "Любые"
      : `Выбрано: ${selectedTags.length}`;

  const toggleTagFilter = (slug: string) => {
    setFilters((prev) => {
      const current = prev.tags ?? [];
      const next = current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug];

      return {
        ...prev,
        tags: next.length > 0 ? next : undefined,
      };
    });
  };

  return (
    <div className="min-h-full">
      {/* Hero секция */}
      <section className="bg-gradient-to-br from-[#7D39EB] to-black text-white py-20 relative overflow-hidden">
        {/* Декоративные элементы */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-[#C6FF33] rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#C6FF33] rounded-full opacity-10 blur-3xl"></div>

        <div className="mx-auto max-w-7xl px-4 relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-8 h-[2px] bg-[#C6FF33]"></span>
            <span className="text-sm font-medium uppercase tracking-widest text-[#C6FF33]">
              Каталог
            </span>
          </div>
          <h1 className="heading-lg mb-4">
            ВСЕ <span className="text-[#C6FF33]">ОБЪЯВЛЕНИЯ</span>
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl">
            Найдите соревнования по городу, дате и категории
          </p>
        </div>
      </section>

      {/* Фильтры */}
      <section className="bg-white border-b border-gray-200 sticky top-20 z-30 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#7D39EB]">
              Фильтры
            </h2>
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-gray-200 text-[#7D39EB] transition-all hover:border-[#7D39EB] hover:bg-[#7D39EB] hover:text-white"
              aria-label={filtersOpen ? "Скрыть фильтры" : "Показать фильтры"}
              title={filtersOpen ? "Скрыть фильтры" : "Показать фильтры"}
              aria-expanded={filtersOpen}
            >
              <svg
                className={`h-5 w-5 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {filtersOpen && (
            <div className="mt-5 flex flex-col gap-4">
            {/* Первая строка фильтров */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2 block">
                  Поиск по названию
                </label>
                <input
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                  placeholder="Введите название соревнования"
                  value={filters.search || ""}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2 block">
                  Город
                </label>
                <input
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                  placeholder="Москва"
                  value={filters.city || ""}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, city: e.target.value }))
                  }
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2 block">
                  Статус
                </label>
                <select
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                  value={filters.status || ""}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, status: e.target.value || undefined }))
                  }
                >
                  <option value="">Любой</option>
                  <option value="recruiting">Набор участников</option>
                  <option value="closed">Набор завершен</option>
                  <option value="upcoming">Скоро состоится</option>
                  <option value="live">В процессе</option>
                  <option value="finished">Завершено</option>
                </select>
              </div>
            </div>

            {/* Вторая строка фильтров */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2 block">
                  Категория
                </label>
                <select
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                  value={filters.category || ""}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, category: e.target.value || undefined }))
                  }
                >
                  <option value="">Любая</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2 block">
                  Теги
                </label>
                <div className="rounded-xl border-2 border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setTagsOpen((open) => !open)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-gray-700 transition-colors hover:bg-gray-50"
                    aria-expanded={tagsOpen}
                    aria-label={tagsOpen ? "Скрыть теги" : "Показать теги"}
                  >
                    <span className="text-sm font-medium">{visibleTagText}</span>
                    <svg
                      className={`h-5 w-5 shrink-0 text-[#7D39EB] transition-transform ${tagsOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {tagsOpen && (
                    <div className="border-t border-gray-200 px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        {tags.length === 0 && (
                          <span className="px-1 py-2 text-sm text-gray-400">Нет тегов</span>
                        )}
                        {tags.map((tag) => {
                          const active = selectedTags.includes(tag.slug);

                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => toggleTagFilter(tag.slug)}
                              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                                active
                                  ? "bg-[#7D39EB] text-white shadow-sm"
                                  : "bg-gray-100 text-gray-700 hover:bg-[#7D39EB] hover:text-white"
                              }`}
                              aria-pressed={active}
                            >
                              #{tag.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2 block">
                  Сортировка
                </label>
                <select
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                  value={filters.sort || "newest"}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, sort: e.target.value || "newest" }))
                  }
                >
                  <option value="newest">Сначала новые</option>
                  <option value="oldest">Сначала старые</option>
                </select>
              </div>
            </div>

            {/* Третья строка - даты */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2 block">
                  Дата с
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                  value={filters.date_from || ""}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, date_from: e.target.value || undefined }))
                  }
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2 block">
                  Дата до
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                  value={filters.date_to || ""}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, date_to: e.target.value || undefined }))
                  }
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ sort: "newest" })}
                  className="btn-secondary w-full sm:w-auto"
                >
                  Сбросить
                </button>
              </div>
            </div>
            </div>
          )}
        </div>
      </section>

      {/* Контент */}
      <main className="mx-auto max-w-7xl px-4 py-12">
        {error && (
          <div className="mb-8 rounded-2xl bg-red-50 p-4 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="w-16 h-16 border-4 border-[#7D39EB] border-t-[#C6FF33] rounded-full animate-spin"></div>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-200">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Ничего не найдено</h3>
            <p className="text-gray-600">Попробуйте изменить параметры поиска</p>
            <button
              onClick={() => setFilters({ sort: "newest" })}
              className="btn-primary mt-6 px-8 py-3"
            >
              Сбросить фильтры
            </button>
          </div>
        )}

        {!loading && items.length > 0 && (
          <>
            {/* Сетка объявлений */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <CompetitionCard key={item.id} item={item} activeTagSlugs={selectedTags} />
              ))}
            </div>

            {/* Пагинация */}
            {totalPages > 1 && (
              <nav
                className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-4"
                aria-label="Пагинация объявлений"
              >
                <p className="text-sm text-gray-600">
                  Показано <span className="font-semibold text-[#7D39EB]">{from}</span>–
                  <span className="font-semibold text-[#7D39EB]">{to}</span> из{" "}
                  <span className="font-semibold text-[#7D39EB]">{total}</span>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#7D39EB] hover:text-[#7D39EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Назад
                  </button>
                  {(() => {
                    const showPages = 5;
                    let start = Math.max(
                      1,
                      Math.min(
                        currentPage - Math.floor(showPages / 2),
                        totalPages - showPages + 1
                      )
                    );
                    if (totalPages <= showPages) start = 1;
                    const end = Math.min(start + showPages - 1, totalPages);
                    return Array.from(
                      { length: end - start + 1 },
                      (_, i) => start + i
                    ).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                          p === currentPage
                            ? "bg-[#7D39EB] text-white"
                            : "border-2 border-gray-200 text-gray-700 hover:border-[#7D39EB] hover:text-[#7D39EB]"
                        }`}
                      >
                        {p}
                      </button>
                    ));
                  })()}
                  <button
                    type="button"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage >= totalPages}
                    className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#7D39EB] hover:text-[#7D39EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Вперёд →
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </main>
    </div>
  );
}
