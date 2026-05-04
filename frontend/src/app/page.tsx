'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { Competition } from "../types";
import { apiFetch, getToken } from "../lib/api";
import { CompetitionCard } from "../components/CompetitionCard";
import { CarouselSlider } from "../components/CarouselSlider";

type PaginatedResponse = {
  data: Competition[];
};

const SERVICES = [
  {
    title: "Публикация объявлений",
    description: "Создавайте объявления о соревнованиях за минуты",
    color: "bg-[#7D39EB]",
  },
  {
    title: "Управление участниками",
    description: "Контролируйте записи и списки участников",
    color: "bg-black",
  },
  {
    title: "Результаты и достижения",
    description: "Фиксируйте места и достижения спортсменов",
    color: "bg-[#7D39EB]",
  },
];

export default function WelcomePage() {
  const [items, setItems] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Проверяем авторизацию
    setIsAuthenticated(!!getToken());
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch<PaginatedResponse>(
          "/competitions?per_page=6&sort=newest&page=1"
        );
        setItems(data.data ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-full">
      {/* Hero секция в стиле дизайна */}
      <section className="relative bg-[#7D39EB] text-white overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:py-32 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 bg-[#C6FF33] rounded-full animate-pulse"></div>
                <span className="text-sm font-medium uppercase tracking-widest text-[#C6FF33]">
                  Любительская платформа
                </span>
              </div>

              <h1 className="heading-lg mb-6">
                <span className="text-[#C6FF33]">СОРЕВНОВАНИЯ</span>
                <br />
                <span>РЯДОМ С ВАМИ</span>
              </h1>

              <p className="text-lg text-blue-100 mb-8 max-w-xl">
                Публикуйте объявления о мероприятиях, набирайте участников
                и ведите результаты в одной платформе
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/competitions/new"
                  className="inline-flex items-center gap-2 bg-[#7D39EB] text-white px-8 py-4 rounded-full font-bold uppercase tracking-wide hover:bg-[#5A29A8] transition-all hover:-translate-y-1 shadow-lg shadow-[#7D39EB]/30"
                >
                  Создать объявление
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/competitions"
                  className="inline-flex items-center gap-2 border-2 border-white px-8 py-4 rounded-full font-bold uppercase tracking-wide hover:bg-white hover:text-[#7D39EB] transition-all"
                >
                  Все объявления
                </Link>
              </div>
            </div>

            {/* Правая сторона - описание платформы */}
            <div className="hidden lg:block">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-[#C6FF33] mb-4 uppercase">НаСтарте — это</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#C6FF33] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-[#7D39EB]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-blue-100 text-sm">Единая платформа для организации спортивных соревнований</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#C6FF33] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-[#7D39EB]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-blue-100 text-sm">Удобный поиск мероприятий по вашему городу</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#C6FF33] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-[#7D39EB]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-blue-100 text-sm">Простая запись на соревнования в один клик</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#C6FF33] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-[#7D39EB]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-blue-100 text-sm">Учёт результатов и система достижений для спортсменов</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Неоновая полоса */}
        <div className="h-4 bg-[#C6FF33]"></div>
      </section>

      {/* Секция услуг */}
      <section className="bg-[#111111] text-white py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="w-8 h-[2px] bg-[#C6FF33]"></span>
              <span className="text-sm font-medium uppercase tracking-widest text-[#C6FF33]">
                Что мы предлагаем
              </span>
              <span className="w-8 h-[2px] bg-[#C6FF33]"></span>
            </div>
            <h2 className="heading-md">
              СОЗДАЁМ ДЛЯ УДОБНЫХ
              <br />
              <span className="text-[#C6FF33]">И ЭМОЦИОНАЛЬНЫХ ВЗАИМОДЕЙСТВИЙ</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {SERVICES.map((service, index) => (
              <div
                key={index}
                className={`${service.color} rounded-2xl p-8 hover:-translate-y-2 transition-transform duration-300`}
              >
                <h3 className="text-xl font-bold mb-3 uppercase text-white">{service.title}</h3>
                <p className="text-gray-300">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Секция "О нас" */}
      <section className="bg-[#F5F5F5] py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 bg-[#C6FF33] rounded-full"></div>
                <span className="text-sm font-medium uppercase tracking-widest text-gray-600">
                  О платформе
                </span>
              </div>

              <h2 className="heading-md mb-6 text-[#7D39EB]">
                КРЕАТИВНОСТЬ
                <br />
                <span className="text-[#C6FF33] bg-[#7D39EB] px-4">ВСТРЕЧАЕТ</span>
                <br />
                СТРАТЕГИЮ
              </h2>

              <p className="text-gray-600 mb-6">
                Платформа «НаСтарте» — современное решение для спортивного сообщества.
                Мы объединяем организаторов и участников, предоставляя удобные инструменты
                для управления соревнованиями.
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#C6FF33] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-[#7D39EB]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Быстрая публикация объявлений о соревнованиях</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#C6FF33] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-[#7D39EB]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Удобное управление участниками и заявками</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#C6FF33] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-[#7D39EB]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Автоматическое формирование результатов</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#C6FF33] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-[#7D39EB]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Поиск соревнований по вашему городу</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#C6FF33] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-[#7D39EB]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Система достижений для спортсменов</span>
                </div>
              </div>
            </div>

            {/* Карусель с фотографиями соревнований */}
            <div className="relative">
              <CarouselSlider />
            </div>
          </div>
        </div>
      </section>

      {/* Последние объявления */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-8 h-[2px] bg-[#C6FF33]"></span>
                <span className="text-sm font-medium uppercase tracking-widest text-gray-600">
                  Актуальное
                </span>
              </div>
              <h2 className="heading-md text-[#7D39EB]">ПОСЛЕДНИЕ ОБЪЯВЛЕНИЯ</h2>
            </div>
            <Link
              href="/competitions"
              className="hidden sm:inline-flex items-center gap-2 bg-[#7D39EB] text-white px-6 py-3 rounded-full font-semibold uppercase tracking-wide hover:bg-[#5A29A8] transition-all"
            >
              Все объявления
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="w-16 h-16 border-4 border-[#7D39EB] border-t-[#C6FF33] rounded-full animate-spin"></div>
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="text-center py-20 bg-gray-50 rounded-3xl">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-gray-600 text-lg">Пока нет объявлений</p>
            </div>
          )}

          {!loading && items.length > 0 && (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <CompetitionCard key={item.id} item={item} />
                ))}
              </div>

              <div className="mt-12 text-center sm:hidden">
                <Link
                  href="/competitions"
                  className="inline-flex items-center gap-2 bg-[#7D39EB] text-white px-8 py-4 rounded-full font-semibold uppercase tracking-wide hover:bg-[#5A29A8] transition-all"
                >
                  Все объявления
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA секция - показываем только неавторизованным пользователям */}
      {!isAuthenticated && (
        <section className="bg-gradient-to-r from-[#7D39EB] to-black text-white py-20">
          <div className="mx-auto max-w-7xl px-4 text-center">
            <h2 className="heading-lg mb-6">
              ГОТОВЫ <span className="text-[#C6FF33]">НАЧАТЬ</span>?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Создайте своё первое объявление за 5 минут и начните привлекать участников
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-[#7D39EB] text-white px-10 py-5 rounded-full font-bold uppercase tracking-wide hover:bg-[#5A29A8] transition-all hover:-translate-y-1 shadow-lg shadow-[#7D39EB]/30"
              >
                Зарегистрироваться
              </Link>
              <Link
                href="/competitions"
                className="inline-flex items-center gap-2 border-2 border-white px-10 py-5 rounded-full font-bold uppercase tracking-wide hover:bg-white hover:text-[#7D39EB] transition-all"
              >
                Смотреть соревнования
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
