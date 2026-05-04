import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Создать объявление о соревновании",
  description:
    "Создайте объявление о соревновании за минуты. Публикация мероприятий, управление участниками и фиксация результатов в одной платформе.",
  keywords: [
    "создать соревнование",
    "публикация объявления",
    "организация мероприятий",
    "спортивные события",
  ],
  robots: {
    index: false,
    follow: false,
  },
};

export default function NewCompetitionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
