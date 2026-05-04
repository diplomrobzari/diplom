import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Регистрация нового пользователя",
  description:
    "Зарегистрируйтесь на платформе НаСтарте.ru для создания объявлений о соревнованиях и участия в них.",
  keywords: ["регистрация", "новый пользователь", "создать аккаунт", "signup"],
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
