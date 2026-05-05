import Link from "next/link";
import { useState } from "react";
import { Competition } from "../types";
import { StatusBadge } from "./StatusBadge";

type Props = {
  item: Competition;
  activeTagSlugs?: string[];
};

export function CompetitionCard({ item, activeTagSlugs = [] }: Props) {
  const [showMap, setShowMap] = useState(false);

  const hasCoords = item.latitude != null && item.longitude != null;
  const matchedTags = item.tags?.filter((tag) => activeTagSlugs.includes(tag.slug)) ?? [];
  const otherTags = item.tags?.filter((tag) => !activeTagSlugs.includes(tag.slug)) ?? [];
  const visibleTags = item.tags?.length
    ? [...matchedTags, ...otherTags].slice(0, Math.max(3, matchedTags.length))
    : (item.tag_names ?? []).slice(0, 3).map((name) => ({ id: name, name, slug: name }));
  const getTagFilterHref = (slug: string) => `/competitions?tags=${encodeURIComponent(slug)}`;

  return (
    <div className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-[#7D39EB] transition-colors group-hover:text-[#5A29A8]">
            <Link href={`/competitions/${item.id}`}>{item.title}</Link>
          </h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 6a1 1 0 110 2 1 1 0 010-2zm0 4a1 1 0 110 2 1 1 0 010-2z"
                clipRule="evenodd"
              />
            </svg>
            {item.city}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <p className="mb-4 flex-1 line-clamp-2 text-sm text-gray-600">{item.description}</p>

      <div className="mb-4 flex flex-wrap gap-2 text-xs font-medium">
        <span className="flex items-center gap-1 rounded-lg bg-[#7D39EB]/10 px-3 py-1.5 text-[#7D39EB]">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
              clipRule="evenodd"
            />
          </svg>
          <span
            title={`Дата начала: ${new Date(item.starts_at).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}`}
          >
            {new Date(item.starts_at).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
            })}
          </span>
        </span>
        <span className="flex items-center gap-1 rounded-lg bg-[#C6FF33]/20 px-3 py-1.5 text-[#7D39EB]">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
          </svg>
          <span
            title={`Участников: ${item.current_participants} из ${
              item.max_participants || "неограниченно"
            }`}
          >
            {item.current_participants}/{item.max_participants || "∞"}
          </span>
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {item.custom_category && (
          <span
            className="rounded-lg bg-[#7D39EB] px-3 py-1 text-xs font-medium text-white"
            title={`Категория: ${item.custom_category}`}
          >
            {item.custom_category}
          </span>
        )}
        {item.category_name && !item.custom_category && (
          <span
            className="rounded-lg bg-[#7D39EB] px-3 py-1 text-xs font-medium text-white"
            title={`Категория: ${item.category_name}`}
          >
            {item.category_name}
          </span>
        )}
        {item.category && !item.category_name && !item.custom_category && (
          <span
            className="rounded-lg bg-[#7D39EB] px-3 py-1 text-xs font-medium text-white"
            title={`Категория: ${item.category.name}`}
          >
            {item.category.name}
          </span>
        )}
        {visibleTags.map((tag) => (
          <Link
            key={tag.id}
            href={getTagFilterHref(tag.slug)}
            className={`rounded-lg px-3 py-1 text-xs ${
              activeTagSlugs.includes(tag.slug)
                ? "bg-[#C6FF33]/30 font-semibold text-[#5A29A8]"
                : "bg-gray-100 text-gray-600 hover:bg-[#7D39EB] hover:text-white"
            }`}
            title={`Тег: ${tag.name}`}
          >
            #{tag.name}
          </Link>
        ))}
      </div>

      {hasCoords && (
        <div className="mt-auto">
          <button
            type="button"
            onClick={() => setShowMap((prev) => !prev)}
            className="flex items-center gap-1 text-xs font-medium text-[#7D39EB] transition-colors hover:text-[#C6FF33]"
            aria-label={showMap ? "Скрыть карту" : "Показать карту места проведения"}
            title={showMap ? "Скрыть карту" : "Показать на карте"}
          >
            {showMap ? (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Скрыть карту
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                На карте
              </>
            )}
          </button>
          {showMap && (
            <div className="mt-3 h-40 w-full overflow-hidden rounded-xl border-2 border-gray-200">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                title={`Карта места проведения: ${item.city}`}
                aria-label={`Карта места проведения соревнования ${item.title} в городе ${item.city}`}
                src={`https://yandex.ru/map-widget/v1/?ll=${item.longitude},${item.latitude}&z=14&l=map&pt=${item.longitude},${item.latitude}`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
