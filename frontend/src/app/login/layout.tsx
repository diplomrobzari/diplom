import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Вход в личный кабинет",
  description:
    "Войдите в личный кабинет для управления объявлениями, участия в соревнованиях и просмотра результатов.",
  keywords: ["вход", "личный кабинет", "авторизация", "логин"],
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
