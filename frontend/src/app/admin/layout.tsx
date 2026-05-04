import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Панель администратора",
  description:
    "Управление платформой: модерация объявлений, пользователи, статистика, теги и категории.",
  keywords: ["админ", "панель управления", "модерация"],
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tabs = [
    { href: "/admin/review", label: "Проверка" },
    { href: "/admin/stats", label: "Статистика" },
    { href: "/admin/users", label: "Пользователи" },
    { href: "/admin/tags-categories", label: "Теги и категории" },
    { href: "/admin/customizations", label: "Кастомизация профиля" },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="rounded-xl border-2 border-[#7D39EB] px-4 py-2 text-sm font-semibold text-[#7D39EB] transition-all hover:bg-[#7D39EB] hover:text-white"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </main>
  );
}
