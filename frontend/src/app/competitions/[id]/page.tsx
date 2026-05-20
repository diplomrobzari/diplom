'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, getToken, getStorageUrl } from "../../../lib/api";
import { Competition, Participation } from "../../../types";
import { StatusBadge } from "../../../components/StatusBadge";

type ParticipantResultDraft = {
  score: string;
  result_note: string;
  no_show: boolean;
  disqualified: boolean;
};

export default function CompetitionPage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<Competition | null>(null);
  const [participants, setParticipants] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [currentUser, setCurrentUser] = useState<{ id: number; is_admin?: boolean } | null>(null);
  const [showResultsForm, setShowResultsForm] = useState(false);
  const [results, setResults] = useState<Record<number, ParticipantResultDraft>>({});
  const [savingResults, setSavingResults] = useState(false);

  const competitionId = params?.id as string | undefined;

  const isRegistered = currentUser
    ? participants.some((p) => p.user?.id === currentUser.id && p.status === "registered")
    : false;

  const isCreator = currentUser && item ? item.creator?.id === currentUser.id : false;
  const isAdmin = currentUser?.is_admin === true;
  const visibleTags = item?.tags?.length
    ? item.tags
    : (item?.tag_names ?? []).map((name) => ({ id: name, name, slug: name }));

  const getTagFilterHref = (slug: string) => `/competitions?tags=${encodeURIComponent(slug)}`;

  const openResultsForm = () => {
    const existingResults: Record<number, ParticipantResultDraft> = {};

    participants.forEach((p) => {
      if (p.user?.id && p.status !== "withdrawn") {
        existingResults[p.user.id] = {
          score: p.score?.toString() || "",
          result_note: p.result_note || "",
          no_show: p.status === "no_show",
          disqualified: p.status === "disqualified",
        };
      }
    });

    setResults(existingResults);
    setShowResultsForm(true);
  };

  const updateParticipantResult = (
    userId: number,
    updater: (current: ParticipantResultDraft) => ParticipantResultDraft
  ) => {
    setResults((prev) => {
      const current = prev[userId] ?? {
        score: "",
        result_note: "",
        no_show: false,
        disqualified: false,
      };

      return {
        ...prev,
        [userId]: updater(current),
      };
    });
  };

  const getErrorMessage = (error: unknown, fallback: string) => {
    return error instanceof Error && error.message ? error.message : fallback;
  };

  useEffect(() => {
    const load = async () => {
      if (!competitionId || competitionId === "undefined" || competitionId === "null") {
        setMessage("Неверный ID объявления");
        setMessageType("error");
        setItem(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setMessage(null);

      try {
        const token = getToken();

        const [userData, data, list] = await Promise.all([
          token
            ? apiFetch<{ id: number; is_admin?: boolean }>("/auth/me", { token }).catch(() => null)
            : Promise.resolve(null),
          apiFetch<Competition>(`/competitions/${competitionId}`, { token, cache: "no-store" }),
          apiFetch<Participation[]>(`/competitions/${competitionId}/participants`, { token, cache: "no-store" }).catch(() => []),
        ]);

        setCurrentUser(userData);
        setItem(data);
        setParticipants(list);
      } catch (e: unknown) {
        setMessage(getErrorMessage(e, "Объявление не найдено"));
        setMessageType("error");
        setItem(null);
      } finally {
        setLoading(false);
      }
    };

    if (competitionId) {
      load();
    }
  }, [competitionId]);

  const reloadCompetitionState = async () => {
    const token = getToken();
    const [data, list] = await Promise.all([
      apiFetch<Competition>(`/competitions/${competitionId}`, { token, cache: "no-store" }),
      apiFetch<Participation[]>(`/competitions/${competitionId}/participants`, { token, cache: "no-store" }),
    ]);
    setItem(data);
    setParticipants(list);
  };

  const handleRegister = async () => {
    if (!competitionId || !currentUser) return;

    try {
      await apiFetch(`/competitions/${competitionId}/register`, {
        method: "POST",
        token: getToken(),
      });
      setMessage("Вы успешно записались");
      setMessageType("success");
      await reloadCompetitionState();
    } catch (e: unknown) {
      setMessage(getErrorMessage(e, "Ошибка при записи"));
      setMessageType("error");
    }
  };

  const handleUnregister = async () => {
    if (!competitionId || !currentUser) return;

    try {
      await apiFetch(`/competitions/${competitionId}/unregister`, {
        method: "POST",
        token: getToken(),
      });
      setMessage("Вы отписались от соревнования");
      setMessageType("success");
      await reloadCompetitionState();
    } catch (e: unknown) {
      setMessage(getErrorMessage(e, "Ошибка при отписке"));
      setMessageType("error");
    }
  };

  const handleRemoveParticipant = async (userId: number) => {
    if (!competitionId) return;
    if (!confirm("Удалить участника?")) return;

    try {
      await apiFetch(`/competitions/${competitionId}/participants/${userId}`, {
        method: "DELETE",
        token: getToken(),
      });
      setMessage("Участник удален");
      setMessageType("success");
      await reloadCompetitionState();
    } catch (e: unknown) {
      setMessage(getErrorMessage(e, "Ошибка при удалении"));
      setMessageType("error");
    }
  };

  const handleSaveResults = async () => {
    if (!competitionId) return;

    setSavingResults(true);

    try {
      const resultsArray = Object.entries(results).map(([userId, data]) => ({
        user_id: Number(userId),
        score: data.score === "" ? null : data.score,
        result_note: data.result_note,
        no_show: data.no_show,
        disqualified: data.disqualified,
      }));

      await apiFetch(`/competitions/${competitionId}/results`, {
        method: "POST",
        token: getToken(),
        body: { results: resultsArray },
      });

      setMessage("Результаты сохранены");
      setMessageType("success");
      setShowResultsForm(false);
      setResults({});
      await reloadCompetitionState();
    } catch (e: unknown) {
      setMessage(getErrorMessage(e, "Ошибка при сохранении"));
      setMessageType("error");
    } finally {
      setSavingResults(false);
    }
  };

  const handleFinishCompetition = async () => {
    if (!competitionId) return;
    if (!confirm("Вы уверены, что хотите завершить это соревнование? Участники больше не смогут записаться.")) return;

    try {
      await apiFetch(`/competitions/${competitionId}/finish`, {
        method: "POST",
        token: getToken(),
      });
      setMessage("Соревнование завершено");
      setMessageType("success");
      await reloadCompetitionState();
    } catch (e: unknown) {
      setMessage(getErrorMessage(e, "Ошибка при завершении"));
      setMessageType("error");
    }
  };

  const handleDeleteCompetition = async () => {
    if (!competitionId) return;
    if (!confirm("Вы уверены, что хотите удалить это объявление? Это действие нельзя отменить.")) return;

    try {
      await apiFetch(`/competitions/${competitionId}`, {
        method: "DELETE",
        token: getToken(),
      });
      setMessage("Объявление удалено");
      setMessageType("success");
      setTimeout(() => router.push("/competitions"), 1000);
    } catch (e: unknown) {
      setMessage(getErrorMessage(e, "Ошибка при удалении"));
      setMessageType("error");
    }
  };

  const handleSubmitForReview = async () => {
    if (!competitionId) return;

    try {
      await apiFetch(`/competitions/${competitionId}/submit-for-review`, {
        method: "POST",
        token: getToken(),
      });
      setMessage("Объявление повторно отправлено на модерацию");
      setMessageType("success");
      await reloadCompetitionState();
    } catch (e: unknown) {
      setMessage(getErrorMessage(e, "Ошибка при повторной отправке на модерацию"));
      setMessageType("error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#7D39EB] border-t-[#C6FF33] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Объявление не найдено</h1>
          <p className="text-gray-600 mb-4">{message}</p>
          <Link
            href="/competitions"
            className="inline-block px-6 py-3 bg-[#7D39EB] text-white rounded-xl font-semibold hover:bg-[#5A29A8] transition-colors"
          >
            К списку объявлений
          </Link>
        </div>
      </div>
    );
  }

  const registeredParticipants = participants.filter((p) => p.status === "registered");
  const finishedParticipants = participants.filter(
    (p) => p.status === "finished" || p.status === "no_show" || p.status === "disqualified"
  );
  const totalParticipants = participants.filter((p) => p.status !== "withdrawn").length;
  const occupiedSlots =
    registeredParticipants.length + finishedParticipants.filter((p) => p.status === "finished").length;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F5F5F5]">
      <section className="bg-gradient-to-br from-[#7D39EB] to-black text-white py-16 relative overflow-hidden">
        <div className="absolute top-10 left-10 w-32 h-32 bg-[#C6FF33] rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#C6FF33] rounded-full opacity-10 blur-3xl"></div>

        <div className="mx-auto max-w-7xl px-4 relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Link
              href="/competitions"
              className="text-sm text-blue-200 hover:text-[#C6FF33] transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Назад к списку
            </Link>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <StatusBadge status={item.status} />
                {item.category_name && (
                  <span className="px-3 py-1 bg-[#C6FF33]/20 text-[#C6FF33] rounded-full text-sm font-medium">
                    {item.category_name}
                  </span>
                )}
                {item.category && !item.category_name && (
                  <span className="px-3 py-1 bg-[#C6FF33]/20 text-[#C6FF33] rounded-full text-sm font-medium">
                    {item.category.name}
                  </span>
                )}
              </div>
              <h1 className="heading-lg mb-2 break-words">{item.title}</h1>
              <p className="flex min-w-0 items-center gap-2 break-words text-lg text-blue-100">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 6a1 1 0 110 2 1 1 0 010-2zm0 4a1 1 0 110 2 1 1 0 010-2z"
                    clipRule="evenodd"
                  />
                </svg>
                {item.city}
              </p>
            </div>

            {item.creator?.avatar_url && (
              <img
                src={getStorageUrl(item.creator.avatar_url) || item.creator.avatar_url}
                alt={`Аватар организатора: ${item.creator.name}`}
                title={item.creator.name}
                className="h-16 w-16 shrink-0 rounded-full border-4 border-[#C6FF33]/30"
                loading="lazy"
              />
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl overflow-hidden px-4 py-8">
        {message && (
          <div
            className={`mb-6 rounded-xl p-4 ${
              messageType === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid min-w-0 gap-8 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-[#7D39EB] uppercase mb-4">О соревновании</h2>
              <p className="whitespace-pre-line break-words text-gray-700">{item.description}</p>

              {item.moderation_comment && (isCreator || isAdmin) && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Комментарий модератора
                  </p>
                  <p className="mt-2 whitespace-pre-line break-words text-sm text-amber-900">{item.moderation_comment}</p>
                </div>
              )}

              {visibleTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {visibleTags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={getTagFilterHref(tag.slug)}
                      className="max-w-full break-words rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-[#7D39EB] hover:text-white"
                      title={`Показать объявления с тегом: ${tag.name}`}
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-[#7D39EB] uppercase mb-4">Детали</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex min-w-0 items-center gap-3 rounded-xl bg-gray-50 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7D39EB]">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 uppercase">Дата начала</p>
                    <p className="break-words font-semibold text-[#7D39EB]">
                      {new Date(item.starts_at).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {item.ends_at && (
                  <div className="flex min-w-0 items-center gap-3 rounded-xl bg-gray-50 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7D39EB]">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 uppercase">Дата окончания</p>
                      <p className="break-words font-semibold text-[#7D39EB]">
                        {new Date(item.ends_at).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex min-w-0 items-center gap-3 rounded-xl bg-gray-50 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7D39EB]">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 uppercase">Участники</p>
                    <p className="break-words font-semibold text-[#7D39EB]">
                      {occupiedSlots} / {item.max_participants || "∞"}
                    </p>
                  </div>
                </div>

                {item.address && (
                  <div className="flex min-w-0 items-center gap-3 rounded-xl bg-gray-50 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7D39EB]">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 6a1 1 0 110 2 1 1 0 010-2zm0 4a1 1 0 110 2 1 1 0 010-2z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 uppercase">Адрес</p>
                      <p className="break-words font-semibold text-[#7D39EB]">{item.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {item.latitude != null && item.longitude != null && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-[#7D39EB] uppercase mb-4">Место на карте</h2>
                <div className="h-72 w-full rounded-xl border-2 border-gray-200 overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Карта места проведения: ${item.title}`}
                    aria-label={`Карта места проведения соревнования ${item.title} в городе ${item.city}`}
                    src={`https://yandex.ru/map-widget/v1/?ll=${item.longitude},${item.latitude}&z=14&l=map&pt=${item.longitude},${item.latitude}`}
                  />
                </div>
              </div>
            )}

            {totalParticipants > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-[#7D39EB] uppercase mb-4">Участники</h2>

                <div className="mb-6">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase">
                      Все участники ({totalParticipants})
                    </h3>
                    {isCreator &&
                      (item.status === "live" ||
                        item.status === "finished" ||
                        item.status === "upcoming" ||
                        item.status === "recruiting") &&
                      !showResultsForm && (
                        <button onClick={openResultsForm} className="btn-primary w-full sm:w-auto">
                          {item.status === "finished" ? "Изменить результаты" : "Внести результаты"}
                        </button>
                      )}
                  </div>

                  {showResultsForm && isCreator && (
                    <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <h4 className="mb-3 text-sm font-semibold text-gray-700">Результаты участников</h4>
                      <div className="mb-4 space-y-3">
                        {participants
                          .filter((p) => p.status !== "withdrawn" && p.user?.id)
                          .map((p) => {
                            const userId = p.user?.id || 0;
                            const participantResult = results[userId] ?? {
                              score: "",
                              result_note: "",
                              no_show: false,
                              disqualified: false,
                            };

                            return (
                              <div key={userId} className="rounded-xl bg-white p-3">
                                <p className="mb-2 font-medium text-gray-700">@{p.user?.username}</p>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Баллы"
                                  value={participantResult.score}
                                  onChange={(e) =>
                                    updateParticipantResult(userId, (current) => ({
                                      ...current,
                                      score: e.target.value,
                                    }))
                                  }
                                  className="mb-2 w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm"
                                />
                                <input
                                  type="text"
                                  placeholder="Комментарий"
                                  value={participantResult.result_note}
                                  onChange={(e) =>
                                    updateParticipantResult(userId, (current) => ({
                                      ...current,
                                      result_note: e.target.value,
                                    }))
                                  }
                                  className="mb-3 w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm"
                                />
                                <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                                  <label className="flex items-center gap-2 text-sm text-gray-600">
                                    <input
                                      type="checkbox"
                                      checked={participantResult.no_show}
                                      onChange={(e) =>
                                        updateParticipantResult(userId, (current) => ({
                                          ...current,
                                          no_show: e.target.checked,
                                          disqualified: e.target.checked ? false : current.disqualified,
                                        }))
                                      }
                                      className="rounded border-gray-300"
                                    />
                                    Не явился
                                  </label>
                                  <label className="flex items-center gap-2 text-sm text-gray-600">
                                    <input
                                      type="checkbox"
                                      checked={participantResult.disqualified}
                                      onChange={(e) =>
                                        updateParticipantResult(userId, (current) => ({
                                          ...current,
                                          disqualified: e.target.checked,
                                          no_show: e.target.checked ? false : current.no_show,
                                        }))
                                      }
                                      className="rounded border-gray-300"
                                    />
                                    Дисквалифия
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          onClick={handleSaveResults}
                          disabled={savingResults}
                          className="btn-primary min-w-0 flex-1"
                        >
                          {savingResults ? "..." : "Сохранить"}
                        </button>
                        <button
                          onClick={() => {
                            setShowResultsForm(false);
                            setResults({});
                          }}
                          className="btn-secondary min-w-0 px-4 py-3"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {participants
                      .filter((p) => p.status !== "withdrawn" && p.user?.id)
                      .sort((a, b) => {
                        if (a.place && b.place) return a.place - b.place;
                        if (a.place) return -1;
                        if (b.place) return 1;
                        if (a.status === "registered" && (b.status === "no_show" || b.status === "disqualified")) return -1;
                        if ((a.status === "no_show" || a.status === "disqualified") && b.status === "registered") return 1;
                        return 0;
                      })
                      .map((p, index) => {
                        const hasPlace = !!p.place && p.status === "finished";
                        const isNoShow = p.status === "no_show";
                        const isDisqualified = p.status === "disqualified";
                        const isTopThree = hasPlace && (p.place || 0) <= 3;

                        const getPlaceColors = (place: number | null) => {
                          if (place === 1) return { bg: "bg-[#FFD700]", text: "text-[#B8860B]" };
                          if (place === 2) return { bg: "bg-[#C0C0C0]", text: "text-[#696969]" };
                          if (place === 3) return { bg: "bg-[#CD7F32]", text: "text-[#8B4513]" };
                          return { bg: "bg-gray-200", text: "text-gray-600" };
                        };

                        const placeColors =
                          hasPlace && p.place !== null && p.place !== undefined
                            ? getPlaceColors(p.place)
                            : { bg: "bg-gray-200", text: "text-gray-400" };

                        return (
                          <Link
                            key={p.id}
                            href={`/users/${p.user?.id}`}
                            className={`flex min-w-0 flex-col gap-3 rounded-xl p-4 transition-opacity hover:opacity-90 sm:flex-row sm:items-center sm:justify-between ${
                              isTopThree ? "bg-gradient-to-r from-[#C6FF33]/20 to-transparent" : "bg-gray-50"
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              {hasPlace ? (
                                <div
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${placeColors.bg} ${placeColors.text}`}
                                >
                                  {p.place}
                                </div>
                              ) : isNoShow ? (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-200 font-bold text-orange-700">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </div>
                              ) : isDisqualified ? (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-200 font-bold text-red-700">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.536-10.95a1 1 0 10-1.414-1.414L10 8.586 7.879 6.465a1 1 0 10-1.414 1.414L8.586 10l-2.121 2.121a1 1 0 101.414 1.414L10 11.414l2.121 2.121a1 1 0 001.414-1.414L11.414 10l2.122-2.121z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </div>
                              ) : (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 font-bold text-gray-400">
                                  {index + 1}
                                </div>
                              )}

                              <div className="flex min-w-0 items-center gap-3">
                                {p.user?.avatar_url ? (
                                  <img
                                    src={getStorageUrl(p.user.avatar_url) || p.user.avatar_url}
                                    alt={`Аватар: ${p.user.name || p.user.username}`}
                                    title={p.user.name || p.user.username || "Участник"}
                                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7D39EB] font-bold text-white">
                                    {p.user?.name?.[0]?.toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <span className="block break-words font-medium text-gray-700">
                                    @{p.user?.username || p.user?.name}
                                  </span>
                                  <span className="break-words text-xs text-gray-500">{p.user?.name}</span>
                                </div>
                              </div>
                            </div>

                            <div className="min-w-0 text-left sm:text-right">
                              {isNoShow && <span className="text-xs text-orange-600 font-medium">Не явился</span>}
                              {isDisqualified && (
                                <span className="text-xs text-red-600 font-medium">Дисквалифицирован</span>
                              )}
                              {!isNoShow && !isDisqualified && p.status === "registered" && (
                                <span className="text-xs text-gray-500">Записан</span>
                              )}
                              {!isNoShow && !isDisqualified && p.status === "finished" && (
                                <>
                                  {p.score && (
                                    <p className="text-sm text-gray-600">
                                      Баллы: <span className="font-semibold text-[#7D39EB]">{p.score}</span>
                                    </p>
                                  )}
                                      {p.result_note && <p className="break-words text-xs text-gray-500">{p.result_note}</p>}
                                  {!p.place && !p.score && (
                                    <span className="text-xs text-gray-500">Без результата</span>
                                  )}
                                </>
                              )}
                            </div>

                            {(isCreator || isAdmin) && p.status === "registered" && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleRemoveParticipant(p.user?.id || 0);
                                }}
                                className="btn-danger-sm w-full text-sm sm:ml-4 sm:w-auto"
                              >
                                Удалить
                              </button>
                            )}
                          </Link>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-6">
            {isAdmin && !isCreator && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200">
                  Администратор
                </h3>
                <button onClick={handleDeleteCompetition} className="btn-danger w-full">
                  Удалить объявление
                </button>
              </div>
            )}

            {isCreator && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200">
                  Организатор
                </h3>

                {item.status === "pending_review" && (
                  <p className="mb-4 text-sm text-gray-600">Объявление на модерации</p>
                )}

                {item.status === "needs_revision" && (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-800">Объявление ждёт доработки</p>
                    <p className="mt-1 text-sm text-amber-700">
                      Внесите изменения и отправьте объявление на повторную модерацию для проверки администратором.
                    </p>
                  </div>
                )}

                <div className="space-y-3 mb-4">
                  {item.status !== "live" && item.status !== "finished" && (
                    <Link
                      href={`/competitions/${competitionId}/edit`}
                      className="btn-secondary w-full text-center"
                    >
                      Редактировать
                    </Link>
                  )}

                  {item.status === "needs_revision" && (
                    <button onClick={handleSubmitForReview} className="btn-primary w-full">
                      Отправить на модерацию
                    </button>
                  )}

                  {(isAdmin || (item.status !== "live" && item.status !== "finished")) && (
                    <button onClick={handleDeleteCompetition} className="btn-danger w-full">
                      Удалить объявление
                    </button>
                  )}

                  {(!item.ends_at || new Date(item.ends_at) > new Date()) &&
                    (item.status === "live" || item.status === "closed" || item.status === "recruiting") && (
                      <button onClick={handleFinishCompetition} className="btn-primary w-full">
                        Завершить соревнование
                      </button>
                    )}
                </div>

                <div className="pt-4 mt-4 border-t border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Участие</h4>
                  {item.status !== "pending_review" &&
                    item.status !== "needs_revision" &&
                    (isRegistered ? (
                      <div>
                        <p className="text-sm text-green-700 bg-green-50 p-3 rounded-xl mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Вы записаны
                        </p>
                        {item.status !== "finished" && (
                          <button onClick={handleUnregister} className="btn-danger w-full">
                            Отписаться
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={handleRegister}
                        disabled={
                          item.status === "finished" ||
                          (occupiedSlots >= item.max_participants && item.max_participants > 0)
                        }
                        className="btn-primary w-full"
                      >
                        {item.status === "finished"
                          ? "Соревнование завершено"
                          : occupiedSlots >= item.max_participants && item.max_participants > 0
                            ? "Мест нет"
                            : "Записаться"}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {!isCreator && !isAdmin && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200">
                  Участие
                </h3>
                {item.status === "pending_review" || item.status === "needs_revision" ? (
                  <p className="text-sm text-gray-600">
                    Запись откроется после прохождения модерации.
                  </p>
                ) : isRegistered ? (
                  <div>
                    <p className="text-sm text-green-700 bg-green-50 p-3 rounded-xl mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Вы записаны
                    </p>
                    {item.status !== "finished" && (
                      <button onClick={handleUnregister} className="btn-danger w-full">
                        Отписаться
                      </button>
                    )}
                  </div>
                ) : !currentUser ? (
                  <p className="rounded-xl bg-[#7D39EB]/10 p-3 text-sm font-medium text-[#7D39EB]">
                    Чтобы записаться нужно зарегистрироваться или войти в аккаунт
                  </p>
                ) : (
                  <button
                    onClick={handleRegister}
                    disabled={item.status === "finished" || (occupiedSlots >= item.max_participants && item.max_participants > 0)}
                    className="btn-primary w-full"
                  >
                    {item.status === "finished"
                      ? "Соревнование завершено"
                      : occupiedSlots >= item.max_participants && item.max_participants > 0
                        ? "Мест нет"
                        : "Записаться"}
                  </button>
                )}
              </div>
            )}

            {item.creator && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4">Организатор</h3>
                <Link href={`/users/${item.creator.id}`} className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80">
                  {item.creator.avatar_url ? (
                    <img
                      src={getStorageUrl(item.creator.avatar_url) || item.creator.avatar_url}
                      alt={`Аватар организатора: ${item.creator.name}`}
                      title={item.creator.name}
                      className="h-12 w-12 shrink-0 rounded-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#7D39EB] font-bold text-white">
                      {item.creator.name[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-gray-900">@{item.creator.username}</p>
                    <p className="break-words text-sm text-gray-500">{item.creator.name}</p>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
