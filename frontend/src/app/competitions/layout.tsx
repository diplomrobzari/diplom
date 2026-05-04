import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Все объявления о соревнованиях",
  description:
    "Каталог спортивных соревнований и мероприятий. Найдите соревнования по городу, дате и категории. Регистрация на соревнования онлайн.",
  keywords: [
    "соревнования",
    "спорт",
    "мероприятия",
    "каталог соревнований",
    "регистрация на соревнования",
    "спортивные события",
    "турниры",
    "чемпионаты",
  ],
  openGraph: {
    title: "Все объявления о соревнованиях | НаСтарте.ru",
    description:
      "Каталог спортивных соревнований и мероприятий. Найдите соревнования по городу, дате и категории.",
    type: "website",
  },
};

export default function CompetitionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
