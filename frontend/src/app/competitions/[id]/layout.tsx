import type { Metadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
};

// Динамические мета-теги для страницы соревнования
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  return {
    title: `Соревнование #${id}`,
    description:
      "Подробная информация о соревновании: описание, дата проведения, адрес, участники. Регистрация на соревнование онлайн.",
    openGraph: {
      title: `Соревнование #${id} | НаСтарте.ru`,
      description: "Подробная информация о соревновании и регистрация онлайн",
      type: "article",
    },
  };
}

export default function CompetitionItemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
