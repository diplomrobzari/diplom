'use client';

import { FormEvent, useState } from "react";
import { apiFetch, saveToken } from "../../lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CYRILLIC_REGEX = /^[а-яА-ЯёЁ\s\-]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegister(form: Record<string, string>): Record<string, string> {
  const errs: Record<string, string> = {};
  const trim = (s: string) => s.trim();

  if (!trim(form.surname)) errs.surname = "Обязательное поле";
  else if (!CYRILLIC_REGEX.test(form.surname)) errs.surname = "Только кириллица, пробелы и дефис";
  else if (form.surname.length < 2) errs.surname = "Минимум 2 символа";

  if (!trim(form.name)) errs.name = "Обязательное поле";
  else if (!CYRILLIC_REGEX.test(form.name)) errs.name = "Только кириллица, пробелы и дефис";
  else if (form.name.length < 2) errs.name = "Минимум 2 символа";

  if (!trim(form.patronymic)) errs.patronymic = "Обязательное поле";
  else if (!CYRILLIC_REGEX.test(form.patronymic)) errs.patronymic = "Только кириллица, пробелы и дефис";
  else if (form.patronymic.length < 2) errs.patronymic = "Минимум 2 символа";

  if (!trim(form.username)) errs.username = "Обязательное поле";
  else if (!USERNAME_REGEX.test(form.username)) errs.username = "Латинские буквы, цифры и _";
  else if (form.username.length < 3) errs.username = "Минимум 3 символа";
  else if (form.username.length > 255) errs.username = "Максимум 255 символов";

  if (!trim(form.email)) errs.email = "Обязательное поле";
  else if (!EMAIL_REGEX.test(form.email)) errs.email = "Некорректный email";

  if (!trim(form.birth_date)) errs.birth_date = "Обязательное поле";
  else {
    const d = new Date(form.birth_date);
    if (isNaN(d.getTime())) errs.birth_date = "Некорректная дата";
    else if (d >= new Date()) errs.birth_date = "Дата рождения должна быть в прошлом";
  }

  if (!form.password) errs.password = "Обязательное поле";
  else if (form.password.length < 8) errs.password = "Минимум 8 символов";
  else if (!/[A-Z]/.test(form.password)) errs.password = "Нужна заглавная буква";
  else if (!/[a-z]/.test(form.password)) errs.password = "Нужна строчная буква";
  else if (!/[0-9]/.test(form.password)) errs.password = "Нужна цифра";

  if (form.password !== form.passwordConfirm) errs.passwordConfirm = "Пароли не совпадают";

  if (form.city && form.city.length > 255) errs.city = "Максимум 255 символов";

  return errs;
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    surname: "",
    name: "",
    patronymic: "",
    birth_date: "",
    username: "",
    email: "",
    password: "",
    passwordConfirm: "",
    city: "",
    bio: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const errs = validateRegister(form);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const data = await apiFetch<{ token: string }>("/auth/register", {
        method: "POST",
        body: {
          surname: form.surname.trim(),
          name: form.name.trim(),
          patronymic: form.patronymic.trim(),
          birth_date: form.birth_date || undefined,
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          city: form.city.trim() || undefined,
          bio: form.bio.trim() || undefined,
        },
      });
      saveToken(data.token);
      window.location.href = "/";
    } catch (e: any) {
      setError(e.message || "Ошибка регистрации");
      const apiErrors = e.errors as Record<string, string[]> | undefined;
      if (apiErrors) {
        const fieldErrs: Record<string, string> = {};
        Object.entries(apiErrors).forEach(([key, msgs]) => {
          if (msgs?.[0]) fieldErrs[key] = msgs[0];
        });
        setFieldErrors(fieldErrs);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#7D39EB] to-black flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Логотип */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-8 group">
          <div className="w-12 h-12 bg-[#C6FF33] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-7 h-7 text-[#7D39EB]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.346A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
            </svg>
          </div>
          <span className="text-2xl font-bold uppercase tracking-wider text-white">НаСтарте</span>
        </Link>
        
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-[#7D39EB] mb-6 text-center">Регистрация</h1>
          
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700 border border-red-200">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Фамилия <span className="text-red-500">*</span></label>
                <input
                  className={`w-full rounded-xl border-2 ${fieldErrors.surname ? 'border-red-500' : 'border-gray-200'} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                  value={form.surname}
                  onChange={handleChange("surname")}
                  placeholder="Иванов"
                />
                {fieldErrors.surname && <p className="mt-1 text-xs text-red-500">{fieldErrors.surname}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Имя <span className="text-red-500">*</span></label>
                <input
                  className={`w-full rounded-xl border-2 ${fieldErrors.name ? 'border-red-500' : 'border-gray-200'} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                  value={form.name}
                  onChange={handleChange("name")}
                  placeholder="Иван"
                />
                {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Отчество <span className="text-red-500">*</span></label>
                <input
                  className={`w-full rounded-xl border-2 ${fieldErrors.patronymic ? 'border-red-500' : 'border-gray-200'} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                  value={form.patronymic}
                  onChange={handleChange("patronymic")}
                  placeholder="Иванович"
                />
                {fieldErrors.patronymic && <p className="mt-1 text-xs text-red-500">{fieldErrors.patronymic}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Дата рождения <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  className={`w-full rounded-xl border-2 ${fieldErrors.birth_date ? 'border-red-500' : 'border-gray-200'} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                  value={form.birth_date}
                  onChange={handleChange("birth_date")}
                />
                {fieldErrors.birth_date && <p className="mt-1 text-xs text-red-500">{fieldErrors.birth_date}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Город</label>
                <input
                  className={`w-full rounded-xl border-2 ${fieldErrors.city ? 'border-red-500' : 'border-gray-200'} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                  value={form.city}
                  onChange={handleChange("city")}
                  placeholder="Москва"
                />
                {fieldErrors.city && <p className="mt-1 text-xs text-red-500">{fieldErrors.city}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Имя пользователя <span className="text-red-500">*</span></label>
              <input
                className={`w-full rounded-xl border-2 ${fieldErrors.username ? 'border-red-500' : 'border-gray-200'} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                value={form.username}
                onChange={handleChange("username")}
                placeholder="ivanov"
              />
              {fieldErrors.username && <p className="mt-1 text-xs text-red-500">{fieldErrors.username}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                className={`w-full rounded-xl border-2 ${fieldErrors.email ? 'border-red-500' : 'border-gray-200'} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                value={form.email}
                onChange={handleChange("email")}
                placeholder="ivan@example.com"
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Пароль <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  className={`w-full rounded-xl border-2 ${fieldErrors.password ? 'border-red-500' : 'border-gray-200'} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                  value={form.password}
                  onChange={handleChange("password")}
                  placeholder="••••••••"
                />
                {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Подтверждение <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  className={`w-full rounded-xl border-2 ${fieldErrors.passwordConfirm ? 'border-red-500' : 'border-gray-200'} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                  value={form.passwordConfirm}
                  onChange={handleChange("passwordConfirm")}
                  placeholder="••••••••"
                />
                {fieldErrors.passwordConfirm && <p className="mt-1 text-xs text-red-500">{fieldErrors.passwordConfirm}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">О себе</label>
              <textarea
                className={`w-full rounded-xl border-2 ${fieldErrors.bio ? 'border-red-500' : 'border-gray-200'} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                rows={3}
                value={form.bio}
                onChange={handleChange("bio")}
                placeholder="Расскажите немного о себе..."
              />
              {fieldErrors.bio && <p className="mt-1 text-xs text-red-500">{fieldErrors.bio}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Регистрация..." : "Зарегистрироваться"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Уже есть аккаунт?{" "}
              <Link href="/login" className="text-[#7D39EB] font-semibold hover:text-[#C6FF33] transition-colors">
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
