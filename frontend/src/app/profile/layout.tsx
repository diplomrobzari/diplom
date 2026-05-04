import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Личный кабинет",
  description:
    "Управление профилем, объявлениями и участиями в соревнованиях.",
  keywords: ["профиль", "личный кабинет", "управление", "настройки"],
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
