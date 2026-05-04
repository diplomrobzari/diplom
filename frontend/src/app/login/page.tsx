'use client';

import { FormEvent, useState } from "react";
import { apiFetch, saveToken } from "../../lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Состояние для сброса пароля
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetStep, setResetStep] = useState(1);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetFieldErrors, setResetFieldErrors] = useState<Record<string, string>>({});
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const errs: Record<string, string> = {};
    const trimmedLogin = login.trim();
    if (!trimmedLogin) errs.login = "Введите email или имя пользователя";
    if (!password) errs.password = "Введите пароль";
    if (showTwoFactor && !twoFactorCode) errs.two_factor_code = "Введите код";
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    
    setLoading(true);
    try {
      const data = await apiFetch<{ token: string; user: any }>("/auth/login", {
        method: "POST",
        body: { login: login.trim(), password, two_factor_code: twoFactorCode || undefined },
      });
      saveToken(data.token);
      window.location.href = "/";
    } catch (e: any) {
      if (e.two_factor_required) {
        setShowTwoFactor(true);
        setError(e.message || "Код отправлен на вашу электронную почту");
      } else {
        setError(e.message || "Ошибка входа");
        const apiErrors = e.errors as Record<string, string[]> | undefined;
        if (apiErrors) {
          const fieldErrs: Record<string, string> = {};
          Object.entries(apiErrors).forEach(([key, msgs]) => {
            if (msgs?.[0]) fieldErrs[key] = msgs[0];
          });
          setFieldErrors(fieldErrs);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetCode = async (e: FormEvent) => {
    e.preventDefault();
    setResetMessage(null);
    const errs: Record<string, string> = {};
    if (!resetEmail.trim()) errs.email = "Введите email";
    setResetFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    
    setResetLoading(true);
    try {
      await apiFetch("/auth/password/reset/send", {
        method: "POST",
        body: { email: resetEmail.trim() },
      });
      setResetStep(2);
      setResetMessage("Код отправлен на ваш email");
    } catch (e: any) {
      setResetMessage(e.message || "Ошибка отправки кода");
      const apiErrors = e.errors as Record<string, string[]> | undefined;
      if (apiErrors) {
        const fieldErrs: Record<string, string> = {};
        Object.entries(apiErrors).forEach(([key, msgs]) => {
          if (msgs?.[0]) fieldErrs[key] = msgs[0];
        });
        setResetFieldErrors(fieldErrs);
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setResetMessage(null);
    const errs: Record<string, string> = {};
    if (!resetCode.trim()) errs.code = "Введите код";
    else if (resetCode.length !== 6) errs.code = "Код должен состоять из 6 цифр";
    if (!resetNewPassword) errs.new_password = "Введите новый пароль";
    else if (resetNewPassword.length < 8) errs.new_password = "Минимум 8 символов";
    else if (!/[A-Z]/.test(resetNewPassword)) errs.new_password = "Должна быть заглавная буква";
    else if (!/[a-z]/.test(resetNewPassword)) errs.new_password = "Должна быть строчная буква";
    else if (!/[0-9]/.test(resetNewPassword)) errs.new_password = "Должна быть цифра";
    setResetFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    
    setResetLoading(true);
    try {
      await apiFetch("/auth/password/reset", {
        method: "POST",
        body: { email: resetEmail.trim(), code: resetCode.trim(), new_password: resetNewPassword },
      });
      setResetMessage("Пароль успешно сброшен! Теперь вы можете войти.");
      setTimeout(() => {
        setShowResetForm(false);
        setResetStep(1);
        setResetEmail("");
        setResetCode("");
        setResetNewPassword("");
      }, 2000);
    } catch (e: any) {
      setResetMessage(e.message || "Ошибка сброса пароля");
      const apiErrors = e.errors as Record<string, string[]> | undefined;
      if (apiErrors) {
        const fieldErrs: Record<string, string> = {};
        Object.entries(apiErrors).forEach(([key, msgs]) => {
          if (msgs?.[0]) fieldErrs[key] = msgs[0];
        });
        setResetFieldErrors(fieldErrs);
      }
    } finally {
      setResetLoading(false);
    }
  };

  if (showResetForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#7D39EB] to-black flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
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
            <h1 className="text-2xl font-bold text-[#7D39EB] mb-6 text-center">Сброс пароля</h1>
            
            {resetMessage && (
              <div className={`mb-6 rounded-xl p-4 text-sm ${resetMessage.includes("успешно") ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {resetMessage}
              </div>
            )}
            
            <form onSubmit={resetStep === 1 ? handleSendResetCode : handleResetPassword} className="space-y-4">
              {resetStep === 1 ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      className={`w-full rounded-xl border-2 ${resetFieldErrors.email ? 'border-red-500' : 'border-gray-200'} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                      type="email"
                      value={resetEmail}
                      onChange={(ev) => { setResetEmail(ev.target.value); setResetFieldErrors((prev) => ({ ...prev, email: '' })); }}
                      placeholder="Введите email"
                    />
                    {resetFieldErrors.email && <p className="mt-1 text-xs text-red-500">{resetFieldErrors.email}</p>}
                  </div>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="btn-primary w-full"
                  >
                    {resetLoading ? "Отправка..." : "Отправить код"}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Код из письма</label>
                    <input
                      className={`w-full rounded-xl border-2 ${resetFieldErrors.code ? 'border-red-500' : 'border-gray-200'} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                      type="text"
                      maxLength={6}
                      value={resetCode}
                      onChange={(ev) => { setResetCode(ev.target.value); setResetFieldErrors((prev) => ({ ...prev, code: '' })); }}
                      placeholder="Введите 6-значный код"
                    />
                    {resetFieldErrors.code && <p className="mt-1 text-xs text-red-500">{resetFieldErrors.code}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Новый пароль</label>
                    <input
                      className={`w-full rounded-xl border-2 ${resetFieldErrors.new_password ? 'border-red-500' : 'border-gray-200'} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                      type="password"
                      value={resetNewPassword}
                      onChange={(ev) => { setResetNewPassword(ev.target.value); setResetFieldErrors((prev) => ({ ...prev, new_password: '' })); }}
                      placeholder="Введите новый пароль"
                    />
                    {resetFieldErrors.new_password && <p className="mt-1 text-xs text-red-500">{resetFieldErrors.new_password}</p>}
                  </div>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="btn-primary w-full"
                  >
                    {resetLoading ? "Сохранение..." : "Сбросить пароль"}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => { setShowResetForm(false); setResetStep(1); setResetEmail(""); setResetCode(""); setResetNewPassword(""); setResetMessage(null); }}
                className="btn-secondary w-full"
              >
                Назад ко входу
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#7D39EB] to-black flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
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
          <h1 className="text-2xl font-bold text-[#7D39EB] mb-6 text-center">Вход в аккаунт</h1>
          
          {error && (
            <div className={`mb-6 rounded-xl p-4 text-sm ${error.includes("двухфакторной") ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email или имя пользователя</label>
              <input
                className={`w-full rounded-xl border-2 ${fieldErrors.login ? 'border-red-500' : 'border-gray-200'} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                type="text"
                value={login}
                onChange={(ev) => { setLogin(ev.target.value); setFieldErrors((prev) => ({ ...prev, login: '' })); }}
                placeholder="Введите email или имя пользователя"
                disabled={showTwoFactor || loading}
              />
              {fieldErrors.login && <p className="mt-1 text-xs text-red-500">{fieldErrors.login}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Пароль</label>
              <input
                className={`w-full rounded-xl border-2 ${fieldErrors.password ? 'border-red-500' : 'border-gray-200'} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                type="password"
                value={password}
                onChange={(ev) => { setPassword(ev.target.value); setFieldErrors((prev) => ({ ...prev, password: '' })); }}
                disabled={showTwoFactor || loading}
              />
              {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>}
            </div>
            
            {showTwoFactor && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Код двухфакторной аутентификации</label>
                <input
                  className={`w-full rounded-xl border-2 ${fieldErrors.two_factor_code ? 'border-red-500' : 'border-gray-200'} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                  type="text"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(ev) => { setTwoFactorCode(ev.target.value); setFieldErrors((prev) => ({ ...prev, two_factor_code: '' })); }}
                  placeholder="Введите 6-значный код"
                  autoFocus
                />
                {fieldErrors.two_factor_code && <p className="mt-1 text-xs text-red-500">{fieldErrors.two_factor_code}</p>}
                <p className="mt-2 text-xs text-gray-500">Код отправлен на вашу электронную почту</p>
              </div>
            )}
            
            {!showTwoFactor && (
              <button
                type="button"
                onClick={() => setShowResetForm(true)}
                className="text-sm text-[#7D39EB] hover:text-[#C6FF33] transition-colors font-medium"
              >
                Забыли пароль?
              </button>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Вход..." : (showTwoFactor ? "Подтвердить" : "Войти")}
            </button>
            
            {showTwoFactor && (
              <button
                type="button"
                onClick={() => { setShowTwoFactor(false); setTwoFactorCode(''); setError(null); }}
                className="btn-secondary w-full"
              >
                Назад
              </button>
            )}
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Нет аккаунта?{" "}
              <Link href="/register" className="text-[#7D39EB] font-semibold hover:text-[#C6FF33] transition-colors">
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
