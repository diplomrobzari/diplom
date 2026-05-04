"use client";

import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-30 bg-[#7D39EB] text-white py-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[#C6FF33] rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-[#7D39EB]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.346A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                  </svg>
                </div>
                <span className="text-xl font-bold uppercase tracking-wider">НаСтарте</span>
              </div>
              <p className="text-blue-200 text-sm">
                Платформа для организации и участия в соревнованиях
              </p>
            </div>
          <div>
              <h4 className="font-bold uppercase tracking-wide mb-4 text-[#C6FF33]">Навигация</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="text-blue-200 hover:text-[#C6FF33] transition-colors">Главная</Link></li>
                <li><Link href="/competitions" className="text-blue-200 hover:text-[#C6FF33] transition-colors">Объявления</Link></li>
                <li><Link href="/competitions/new" className="text-blue-200 hover:text-[#C6FF33] transition-colors">Создать объявление</Link></li>
              </ul>
            </div>
          <div>
              <h4 className="font-bold uppercase tracking-wide mb-4 text-[#C6FF33]">Аккаунт</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/login" className="text-blue-200 hover:text-[#C6FF33] transition-colors">Вход</Link></li>
                <li><Link href="/register" className="text-blue-200 hover:text-[#C6FF33] transition-colors">Регистрация</Link></li>
                <li><Link href="/profile" className="text-blue-200 hover:text-[#C6FF33] transition-colors">Профиль</Link></li>
              </ul>
            </div>
          <div>
              <h4 className="font-bold uppercase tracking-wide mb-4 text-[#C6FF33]">Контакты</h4>
              <p className="text-blue-200 text-sm">
              Вопросы и предложения присылайте через форму обратной связи в личном кабинете.
            </p>
            </div>
          </div>
        <div className="mt-10 border-t border-white/20 pt-8 flex flex-col md:flex-row items-center justify-center gap-4 text-sm text-blue-200">
          © {currentYear} НаСтарте.ru. Все права защищены.
        </div>
      </div>
    </footer>
  );
}
