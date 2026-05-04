'use client';

import { useEffect, useMemo, useState } from "react";
import { apiFetch, getToken, clearToken, getStorageUrl } from "../../lib/api";
import { Participation, User, Competition, UserAchievement, ProfileCustomizationOptions, Category, Tag, OrganizerReview } from "../../types";
import Link from "next/link";
import { AvatarCropModal } from "../../components/AvatarCropModal";
import { StatusBadge } from "../../components/StatusBadge";
import {
  sortUserAchievements,
  getAchievementBarColor,
  countCompletedTasks,
} from "../../lib/achievements";

type ProfileResponse = User & {
  participations: Participation[];
  competitions?: Competition[];
  user_achievements?: UserAchievement[];
};

type ProfileCompetitionFilters = {
  search: string;
  city: string;
  status: string;
  date_from: string;
  date_to: string;
  category: string;
  tag: string;
  sort: "newest" | "oldest";
  place: string;
};

const COMPETITIONS_PER_PAGE = 5;
const PARTICIPATIONS_PER_PAGE = 5;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [competitionFilters, setCompetitionFilters] = useState<ProfileCompetitionFilters>({
    search: "",
    city: "",
    status: "",
    date_from: "",
    date_to: "",
    category: "",
    tag: "",
    sort: "newest",
    place: "",
  });
  const [competitionPage, setCompetitionPage] = useState(1);
  const [participationFilters, setParticipationFilters] = useState<ProfileCompetitionFilters>({
    search: "",
    city: "",
    status: "",
    date_from: "",
    date_to: "",
    category: "",
    tag: "",
    sort: "newest",
    place: "",
  });
  const [participationPage, setParticipationPage] = useState(1);
  const [editForm, setEditForm] = useState({
    surname: "",
    name: "",
    patronymic: "",
    birth_date: "",
    username: "",
    email: "",
    city: "",
    bio: "",
  });
  const [customization, setCustomization] = useState<ProfileCustomizationOptions | null>(null);
  const [customizationSaving, setCustomizationSaving] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [resetStep, setResetStep] = useState(1);
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [avatarDraft, setAvatarDraft] = useState<{ file: File; url: string } | null>(null);
  const [activeReviewCompetitionId, setActiveReviewCompetitionId] = useState<number | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<number, { rating: number; comment: string }>>({});
  const [reviewSavingCompetitionId, setReviewSavingCompetitionId] = useState<number | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<Record<number, { type: "success" | "error"; message: string }>>({});

  const load = async (refreshStaticData = false) => {
    try {
      const token = getToken();
      if (!token) {
        setError("Нужно войти, чтобы увидеть профиль");
        return;
      }
      const shouldLoadStaticData = refreshStaticData || !customization || categories.length === 0 || tags.length === 0;
      const [data, customData, categoriesData, tagsData] = await Promise.all([
        apiFetch<ProfileResponse>("/profile", { token, cache: "no-store" }),
        shouldLoadStaticData
          ? apiFetch<ProfileCustomizationOptions>("/profile/customization-options", { token })
          : Promise.resolve(customization),
        shouldLoadStaticData ? apiFetch<Category[]>("/categories") : Promise.resolve(categories),
        shouldLoadStaticData ? apiFetch<Tag[]>("/tags") : Promise.resolve(tags),
      ]);
      setProfile(data);
      setEditForm({
        surname: data.surname || "",
        name: data.name || "",
        patronymic: data.patronymic || "",
        birth_date: data.birth_date || "",
        username: data.username || "",
        email: data.email || "",
        city: data.city || "",
        bio: data.bio || "",
      });
      if (customData) {
        setCustomization(customData);
      }
      setCategories(categoriesData);
      setTags(tagsData);
    } catch (e: unknown) {
      const message = getErrorMessage(e, "Ошибка загрузки профиля");
      setError(message);
      if (String(message).includes("авториза")) {
        clearToken();
      }
    }
  };
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setCompetitionPage(1);
  }, [competitionFilters]);

  useEffect(() => {
    setParticipationPage(1);
  }, [participationFilters]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const token = getToken();
      if (!token) return;
      await apiFetch("/profile", { method: "PUT", token, body: editForm });
      await load(true);
      setIsEditing(false);
    } catch (e: unknown) {
      setSaveError(getErrorMessage(e, "Ошибка при сохранении"));
    } finally {
      setSaving(false);
    }
  };
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const nextUrl = URL.createObjectURL(file);
    setAvatarDraft((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev.url);
      }
      return { file, url: nextUrl };
    });
    e.target.value = "";
  };

  const uploadCroppedAvatar = async (blob: Blob) => {
    setUploading(true);
    try {
      const token = getToken();
      if (!token) return;
      const formData = new FormData();
      formData.append("avatar", blob, avatarDraft?.file.name ?? "avatar.jpg");
      await apiFetch("/profile/avatar", { method: "POST", token, body: formData });
      await load();
      if (avatarDraft) {
        URL.revokeObjectURL(avatarDraft.url);
      }
      setAvatarDraft(null);
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Ошибка при загрузке фото"));
    } finally {
      setUploading(false);
    }
  };

  const updateCustomization = async (payload: {
    avatar_frame_key?: string;
    profile_background_key?: string;
  }) => {
    setCustomizationSaving(true);
    try {
      const token = getToken();
      if (!token) return;
      await apiFetch("/profile/customization", {
        method: "PUT",
        token,
        body: payload,
      });
      await load();
    } catch (e: unknown) {
      alert(getErrorMessage(e, "Не удалось сохранить кастомизацию"));
    } finally {
      setCustomizationSaving(false);
    }
  };

  const toggleTwoFactor = async () => {
    setSecurityLoading(true);
    setSecurityMessage(null);
    try {
      const token = getToken();
      if (!token) return;
      const endpoint = profile?.two_factor_enabled
        ? "/profile/two-factor/disable"
        : "/profile/two-factor/enable";
      const response = await apiFetch<{ message: string }>(endpoint, {
        method: "POST",
        token,
      });
      setSecurityMessage(response.message);
      await load();
    } catch (e: unknown) {
      setSecurityMessage(getErrorMessage(e, "Не удалось обновить настройки безопасности"));
    } finally {
      setSecurityLoading(false);
    }
  };

  const sendResetCode = async () => {
    if (!profile?.email) return;
    setResetLoading(true);
    setResetMessage(null);
    try {
      await apiFetch("/auth/password/reset/send", {
        method: "POST",
        body: { email: profile.email },
      });
      setResetStep(2);
      setResetMessage("Код отправлен на вашу почту.");
    } catch (e: unknown) {
      setResetMessage(getErrorMessage(e, "Не удалось отправить код"));
    } finally {
      setResetLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!profile?.email) return;
    setResetLoading(true);
    setResetMessage(null);
    try {
      await apiFetch("/auth/password/reset", {
        method: "POST",
        body: {
          email: profile.email,
          code: resetCode.trim(),
          new_password: resetNewPassword,
        },
      });
      setResetMessage("Пароль успешно обновлён.");
      setResetStep(1);
      setResetCode("");
      setResetNewPassword("");
    } catch (e: unknown) {
      setResetMessage(getErrorMessage(e, "Не удалось сбросить пароль"));
    } finally {
      setResetLoading(false);
    }
  };

  const stats = (() => {
    const list = profile?.participations || [];
    const finished = list.filter((p) => p.status === "finished" && p.place);
    return {
      totalParticipations: list.length,
      firstPlaces: finished.filter((p) => p.place === 1).length,
      topThree: finished.filter((p) => (p.place || 0) <= 3).length,
      bestPlace: finished.length ? Math.min(...finished.map((p) => p.place || 999)) : null,
    };
  })();

  const authoredReviewsByCompetition = useMemo(() => {
    return new Map<number, OrganizerReview>(
      (profile?.reviews_authored ?? []).map((review) => [review.competition_id, review])
    );
  }, [profile?.reviews_authored]);

  const receivedReviews = useMemo(() => profile?.reviews_received ?? [], [profile?.reviews_received]);
  const organizerReviewsCount = profile?.organizer_reviews_count ?? receivedReviews.length;
  const organizerRating = useMemo(() => {
    const rawRating = profile?.organizer_rating_avg as number | string | null | undefined;
    const parsedRating =
      typeof rawRating === "number" ? rawRating : typeof rawRating === "string" ? Number(rawRating) : Number.NaN;

    if (Number.isFinite(parsedRating) && (parsedRating > 0 || receivedReviews.length === 0)) {
      return Number(parsedRating.toFixed(1));
    }

    if (receivedReviews.length === 0) {
      return 0;
    }

    const total = receivedReviews.reduce((sum, review) => sum + review.rating, 0);
    return Number((total / receivedReviews.length).toFixed(1));
  }, [profile?.organizer_rating_avg, receivedReviews]);

  const canLeaveReview = (participation: Participation) => {
    return Boolean(
      participation.competition &&
      participation.competition.status === "finished" &&
      participation.competition.creator &&
      participation.competition.creator.id !== profile?.id
    );
  };

  const openReviewForm = (participation: Participation) => {
    const competitionId = participation.competition?.id;
    if (!competitionId) return;

    const existingReview = authoredReviewsByCompetition.get(competitionId);
    setReviewDrafts((prev) => ({
      ...prev,
      [competitionId]: {
        rating: existingReview?.rating ?? prev[competitionId]?.rating ?? 5,
        comment: existingReview?.comment ?? prev[competitionId]?.comment ?? "",
      },
    }));
    setReviewFeedback((prev) => {
      const next = { ...prev };
      delete next[competitionId];
      return next;
    });
    setActiveReviewCompetitionId(competitionId);
  };

  const submitReview = async (competitionId: number) => {
    const draft = reviewDrafts[competitionId];
    const rating = draft?.rating ?? 0;

    setReviewSavingCompetitionId(competitionId);
    setReviewFeedback((prev) => {
      const next = { ...prev };
      delete next[competitionId];
      return next;
    });

    try {
      const token = getToken();
      if (!token) return;

      await apiFetch(`/competitions/${competitionId}/review`, {
        method: "POST",
        token,
        body: {
          rating,
          comment: draft?.comment?.trim() || "",
        },
      });

      setReviewFeedback((prev) => ({
        ...prev,
        [competitionId]: { type: "success", message: "Отзыв сохранён." },
      }));
      await load();
      setActiveReviewCompetitionId(null);
    } catch (e: unknown) {
      setReviewFeedback((prev) => ({
        ...prev,
        [competitionId]: {
          type: "error",
          message: getErrorMessage(e, "Не удалось сохранить отзыв."),
        },
      }));
    } finally {
      setReviewSavingCompetitionId(null);
    }
  };

  const competitionsWithPlace = useMemo(() => {
    const list = profile?.competitions ?? [];
    const myPlaces = new Map<number, number | null>();
    (profile?.participations ?? []).forEach((p) => {
      if (p.competition?.id) {
        myPlaces.set(p.competition.id, p.place ?? null);
      }
    });

    return list.map((comp) => ({
      comp,
      myPlace: myPlaces.get(comp.id) ?? null,
    }));
  }, [profile?.competitions, profile?.participations]);

  const filteredCompetitions = useMemo(() => {
    const filters = competitionFilters;
    const placeValue = filters.place ? Number(filters.place) : null;

    return competitionsWithPlace
      .filter(({ comp, myPlace }) => {
        if (filters.search && !comp.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.city && !comp.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
        if (filters.status && comp.status !== filters.status) return false;
        if (filters.date_from && new Date(comp.starts_at) < new Date(filters.date_from)) return false;
        if (filters.date_to && new Date(comp.starts_at) > new Date(filters.date_to)) return false;

        if (filters.category) {
          const categorySlug = comp.category?.slug ?? "";
          if (categorySlug !== filters.category) return false;
        }

        if (filters.tag) {
          const hasTag = (comp.tags ?? []).some((tag) => tag.slug === filters.tag);
          if (!hasTag) return false;
        }

        if (placeValue !== null && (!Number.isFinite(placeValue) || myPlace !== placeValue)) return false;
        return true;
      })
      .sort((a, b) => {
        const left = new Date(a.comp.starts_at).getTime();
        const right = new Date(b.comp.starts_at).getTime();
        return filters.sort === "oldest" ? left - right : right - left;
      });
  }, [competitionFilters, competitionsWithPlace]);

  const totalCompetitionPages = Math.max(1, Math.ceil(filteredCompetitions.length / COMPETITIONS_PER_PAGE));
  const safeCompetitionPage = Math.min(competitionPage, totalCompetitionPages);
  const paginatedCompetitions = filteredCompetitions.slice(
    (safeCompetitionPage - 1) * COMPETITIONS_PER_PAGE,
    safeCompetitionPage * COMPETITIONS_PER_PAGE
  );

  const participationsWithCompetition = useMemo(
    () =>
      (profile?.participations ?? []).filter(
        (p): p is Participation & { competition: Competition } => Boolean(p.competition)
      ),
    [profile?.participations]
  );

  const filteredParticipations = useMemo(() => {
    const filters = participationFilters;
    const placeValue = filters.place ? Number(filters.place) : null;

    return participationsWithCompetition
      .filter((p) => {
        const comp = p.competition;
        if (!comp) return false;

        if (filters.search && !comp.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.city && !comp.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
        if (filters.status && comp.status !== filters.status) return false;
        if (filters.date_from && new Date(comp.starts_at) < new Date(filters.date_from)) return false;
        if (filters.date_to && new Date(comp.starts_at) > new Date(filters.date_to)) return false;

        if (filters.category) {
          const categorySlug = comp.category?.slug ?? "";
          if (categorySlug !== filters.category) return false;
        }

        if (filters.tag) {
          const hasTag = (comp.tags ?? []).some((tag) => tag.slug === filters.tag);
          if (!hasTag) return false;
        }

        if (placeValue !== null && (!Number.isFinite(placeValue) || (p.place ?? null) !== placeValue)) return false;
        return true;
      })
      .sort((a, b) => {
        const left = new Date(a.competition?.starts_at ?? "").getTime();
        const right = new Date(b.competition?.starts_at ?? "").getTime();
        return filters.sort === "oldest" ? left - right : right - left;
      });
  }, [participationFilters, participationsWithCompetition]);

  const totalParticipationPages = Math.max(1, Math.ceil(filteredParticipations.length / PARTICIPATIONS_PER_PAGE));
  const safeParticipationPage = Math.min(participationPage, totalParticipationPages);
  const paginatedParticipations = filteredParticipations.slice(
    (safeParticipationPage - 1) * PARTICIPATIONS_PER_PAGE,
    safeParticipationPage * PARTICIPATIONS_PER_PAGE
  );

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center">
          <div className="rounded-xl bg-red-50 p-6 text-red-700 border border-red-200 mb-4">{error}</div>
          <Link href="/login" className="text-[#7D39EB] font-semibold hover:text-[#C6FF33] transition-colors">
            Перейти ко входу →
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#7D39EB] border-t-[#C6FF33] rounded-full animate-spin" />
      </div>
    );
  }

  const selectedFrame = customization?.avatar_frames.find(
    (item) => String(item.key) === String(profile.avatar_frame_key ?? "")
  );
  const selectedBackground = customization?.profile_backgrounds.find(
    (item) => String(item.key) === String(profile.profile_background_key ?? "")
  );
  const fullName =
    profile.surname && profile.name && profile.patronymic
      ? `${profile.surname} ${profile.name} ${profile.patronymic}`
      : profile.name;

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-[#F5F5F5]">
      {selectedBackground && (
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <img
            src={selectedBackground.asset_path}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-contain object-top"
          />
          <div className="absolute inset-0 bg-[#12072b]/45" />
        </div>
      )}
      <section className="relative overflow-hidden text-white pt-12 pb-[13rem]">
        {!selectedBackground && (
          <div className="absolute inset-0 bg-[#7D39EB]" />
        )}
        <div className="mx-auto max-w-7xl px-4">
          <div className="relative z-10 flex items-center gap-2 mb-4">
            <span className="w-8 h-[2px] bg-[#C6FF33]"></span>
            <span className="text-sm font-medium uppercase tracking-widest text-[#C6FF33]">Личный кабинет</span>
          </div>
          <h1 className="relative z-10 heading-lg">Профиль пользователя</h1>
        </div>
      </section>

      <main className="relative z-20 mx-auto max-w-7xl px-4 -mt-[9rem] pb-28">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 sticky top-24">
              <div className="flex items-start gap-4 mb-6">
                <div className="relative h-24 w-24 shrink-0">
                  <div className="absolute inset-[8px] z-10 rounded-full overflow-hidden border-2 border-[#7D39EB]/20 bg-[#7D39EB]">
                    {profile.avatar_url ? (
                      <img
                        src={getStorageUrl(profile.avatar_url) || profile.avatar_url}
                        alt={profile.name}
                        className="block h-full w-full object-cover object-center"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-white text-2xl font-bold">
                        {profile.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {selectedFrame && (
                    <img
                      src={selectedFrame.asset_path}
                      alt={selectedFrame.name}
                      className="pointer-events-none absolute inset-0 z-20 h-full w-full object-contain object-center"
                    />
                  )}
                  {!isEditing && (
                    <label className="absolute -bottom-1 -right-1 z-30 bg-[#C6FF33] text-[#7D39EB] rounded-full p-2 cursor-pointer hover:bg-[#A8E829] transition-colors shadow-lg">
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="hidden" />
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </label>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-[#7D39EB] leading-tight mb-2">{fullName}</h2>
                  <p className="text-xs text-gray-500 mb-3">@{profile.username}</p>
                  {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} className="btn-primary px-4 py-2 text-sm">Редактировать</button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setIsEditing(false)} className="btn-secondary px-4 py-2 text-sm" disabled={saving}>Отмена</button>
                      <button onClick={handleSave} className="btn-primary px-4 py-2 text-sm" disabled={saving}>{saving ? "..." : "OK"}</button>
                    </div>
                  )}
                </div>
              </div>

              {saveError && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{saveError}</div>}

              {!isEditing ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-500 block mb-1">Email:</span>
                    <p className="font-medium text-[#7D39EB]">{profile.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">Имя пользователя:</span>
                    <p className="font-medium text-[#7D39EB]">@{profile.username}</p>
                  </div>
                  {profile.city && (
                    <div>
                      <span className="text-gray-500 block mb-1">Город:</span>
                      <p className="font-medium text-[#7D39EB]">{profile.city}</p>
                    </div>
                  )}
                  {profile.birth_date && (
                    <div>
                      <span className="text-gray-500 block mb-1">Дата рождения:</span>
                      <p className="font-medium text-[#7D39EB]">
                        {new Date(profile.birth_date).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                  )}
                  {profile.bio && (
                    <div>
                      <span className="text-gray-500 block mb-1">О себе:</span>
                      <p className="text-gray-700">{profile.bio}</p>
                    </div>
                  )}
                </div>
              ) : (
                <form className="space-y-3">
                  <input className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-[#7D39EB] focus:outline-none" value={editForm.surname} onChange={(e) => setEditForm({ ...editForm, surname: e.target.value })} placeholder="Фамилия" />
                  <input className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-[#7D39EB] focus:outline-none" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Имя" />
                  <input className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-[#7D39EB] focus:outline-none" value={editForm.patronymic} onChange={(e) => setEditForm({ ...editForm, patronymic: e.target.value })} placeholder="Отчество" />
                  <input type="date" className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-[#7D39EB] focus:outline-none" value={editForm.birth_date} onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })} />
                  <input className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-[#7D39EB] focus:outline-none" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} placeholder="Имя пользователя" />
                  <input type="email" className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-[#7D39EB] focus:outline-none" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email" />
                  <input className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-[#7D39EB] focus:outline-none" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} placeholder="Город" />
                  <textarea rows={3} className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-[#7D39EB] focus:outline-none" value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} placeholder="О себе" />
                </form>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="mb-2 text-sm font-medium uppercase tracking-widest text-gray-500">Рейтинг организатора</p>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-[#7D39EB]">{organizerRating.toFixed(1)}</span>
                <span className="pb-1 text-sm text-gray-500">из 5</span>
              </div>
              <div className="mt-3 flex gap-1 text-xl text-[#C6FF33]">
                {Array.from({ length: 5 }, (_, index) => (
                  <span key={index}>{index < Math.round(organizerRating) ? "★" : "☆"}</span>
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {organizerReviewsCount > 0 ? `${organizerReviewsCount} отзыв(ов)` : "Пока нет отзывов"}
              </p>
              <Link href="/profile/reviews" className="mt-4 inline-flex btn-secondary px-4 py-2 text-sm">
                Посмотреть отзывы
              </Link>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-[#7D39EB] uppercase mb-6">Статистика выступлений</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-3xl font-bold text-[#7D39EB] mb-1">{stats.totalParticipations}</div>
                  <div className="text-xs text-gray-600">Всего участий</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-3xl font-bold text-[#C6FF33] bg-[#7D39EB] rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-1 text-lg">{stats.firstPlaces}</div>
                  <div className="text-xs text-gray-600">Первых места</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-3xl font-bold text-[#7D39EB] mb-1">{stats.topThree}</div>
                  <div className="text-xs text-gray-600">В топ-3</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-3xl font-bold text-[#7D39EB] mb-1">{stats.bestPlace ?? "—"}</div>
                  <div className="text-xs text-gray-600">Лучшее место</div>
                </div>
              </div>
            </div>

            {profile.user_achievements && profile.user_achievements.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-[#7D39EB] uppercase">Достижения</h2>
                  <p className="text-sm text-gray-600">Выполнено: <span className="font-bold text-[#7D39EB]">{countCompletedTasks(profile.user_achievements)}</span></p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {sortUserAchievements(profile.user_achievements).map((ua) => {
                    const a = ua.achievement;
                    if (!a) return null;
                    const threshold = a.threshold || 1;
                    const pct = Math.min(100, (ua.progress / threshold) * 100);
                    const barColor = getAchievementBarColor(a.code ?? "");
                    return (
                      <div key={ua.id} className="rounded-xl border border-gray-100 p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900">{a.name}</span>
                          {ua.level > 0 && <span className="text-xs font-bold text-[#7D39EB] bg-[#C6FF33]/20 px-2 py-1 rounded">Г—{ua.level}</span>}
                        </div>
                        {a.description && <p className="text-xs text-gray-500 mb-2">{a.description}</p>}
                        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-[#7D39EB] uppercase mb-4">Кастомизация профиля</h2>
              <p className="text-sm text-gray-600 mb-4">
                Выполнено достижений: <span className="font-bold text-[#7D39EB]">{customization?.completed_tasks ?? 0}</span>.
                По нечетным числам доступны рамки, по четным — фоны.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Рамка аватара</label>
                  <select
                    hidden
                    aria-hidden="true"
                    className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-[#7D39EB] focus:outline-none"
                    value={profile.avatar_frame_key ?? "none"}
                    disabled={customizationSaving}
                    onChange={(e) => updateCustomization({ avatar_frame_key: e.target.value })}
                  >
                    <option value="none">Без рамки</option>
                    {(customization?.avatar_frames ?? []).map((frame) => (
                      <option key={frame.key} value={frame.key} disabled={!frame.is_unlocked}>
                        {frame.name} {!frame.is_unlocked ? `(нужно: ${frame.required_tasks}, нечетное число)` : ""}
                      </option>
                    ))}
                  </select>
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    <button
                      type="button"
                      onClick={() => updateCustomization({ avatar_frame_key: "none" })}
                      disabled={customizationSaving}
                      className={`rounded-xl border p-2 text-xs font-medium transition-colors ${
                        !profile.avatar_frame_key
                          ? "border-[#7D39EB] bg-[#7D39EB]/10 text-[#7D39EB]"
                          : "border-gray-200 text-gray-600 hover:border-[#7D39EB]"
                      }`}
                    >
                      Без рамки
                    </button>
                    {(customization?.avatar_frames ?? []).map((frame) => (
                      <button
                        key={frame.key}
                        type="button"
                        onClick={() => updateCustomization({ avatar_frame_key: frame.key })}
                        disabled={customizationSaving || !frame.is_unlocked}
                        className={`rounded-xl border p-2 transition-colors ${
                          String(profile.avatar_frame_key ?? "") === String(frame.key)
                            ? "border-[#7D39EB] bg-[#7D39EB]/10"
                            : "border-gray-200 hover:border-[#7D39EB]"
                        } ${!frame.is_unlocked ? "opacity-50" : ""}`}
                        title={frame.name}
                      >
                        <div className="relative mx-auto h-12 w-12">
                          <div className="absolute inset-[6px] rounded-full bg-[#7D39EB]/15" />
                          <img src={frame.asset_path} alt={frame.name} className="absolute inset-0 h-full w-full object-contain" />
                        </div>
                        <span className="mt-2 block truncate text-[11px] text-gray-700">{frame.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Фон профиля</label>
                  <select
                    hidden
                    aria-hidden="true"
                    className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-[#7D39EB] focus:outline-none"
                    value={profile.profile_background_key ?? "none"}
                    disabled={customizationSaving}
                    onChange={(e) => updateCustomization({ profile_background_key: e.target.value })}
                  >
                    <option value="none">Без фона</option>
                    {(customization?.profile_backgrounds ?? []).map((bg) => (
                      <option key={bg.key} value={bg.key} disabled={!bg.is_unlocked}>
                        {bg.name} {!bg.is_unlocked ? `(нужно: ${bg.required_tasks}, четное число)` : ""}
                      </option>
                    ))}
                  </select>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => updateCustomization({ profile_background_key: "none" })}
                      disabled={customizationSaving}
                      className={`rounded-xl border p-2 text-xs font-medium transition-colors ${
                        !profile.profile_background_key
                          ? "border-[#7D39EB] bg-[#7D39EB]/10 text-[#7D39EB]"
                          : "border-gray-200 text-gray-600 hover:border-[#7D39EB]"
                      }`}
                    >
                      Без фона
                    </button>
                    {(customization?.profile_backgrounds ?? []).map((bg) => (
                      <button
                        key={bg.key}
                        type="button"
                        onClick={() => updateCustomization({ profile_background_key: bg.key })}
                        disabled={customizationSaving || !bg.is_unlocked}
                        className={`rounded-xl border p-2 transition-colors ${
                          String(profile.profile_background_key ?? "") === String(bg.key)
                            ? "border-[#7D39EB] bg-[#7D39EB]/10"
                            : "border-gray-200 hover:border-[#7D39EB]"
                        } ${!bg.is_unlocked ? "opacity-50" : ""}`}
                        title={bg.name}
                      >
                        <img src={bg.asset_path} alt={bg.name} className="h-14 w-full rounded-lg object-cover" />
                        <span className="mt-2 block truncate text-[11px] text-gray-700">{bg.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-[#7D39EB] uppercase mb-4">Безопасность</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="mb-2 font-semibold text-gray-900">Двухфакторная аутентификация</h3>
                  <p className="mb-4 text-sm text-gray-600">
                    Статус: <span className="font-semibold text-[#7D39EB]">{profile.two_factor_enabled ? "Включена" : "Выключена"}</span>
                  </p>
                  <button type="button" onClick={toggleTwoFactor} disabled={securityLoading} className="btn-primary">
                    {securityLoading ? "..." : profile.two_factor_enabled ? "Отключить 2FA" : "Включить 2FA"}
                  </button>
                  {securityMessage && <p className="mt-3 text-sm text-gray-600">{securityMessage}</p>}
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="mb-2 font-semibold text-gray-900">Сброс пароля</h3>
                  <p className="mb-4 text-sm text-gray-600">
                    Код будет отправлен на <span className="font-medium text-[#7D39EB]">{profile.email}</span>.
                  </p>
                  {resetStep === 1 ? (
                    <button type="button" onClick={sendResetCode} disabled={resetLoading} className="btn-secondary">
                      {resetLoading ? "Отправка..." : "Получить код"}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="text"
                        maxLength={6}
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="Код из письма"
                        className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-[#7D39EB] focus:outline-none"
                      />
                      <input
                        type="password"
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="Новый пароль"
                        className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-[#7D39EB] focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={resetPassword}
                          disabled={resetLoading || !resetCode.trim() || !resetNewPassword}
                          className="btn-primary"
                        >
                          {resetLoading ? "Сохранение..." : "Сменить пароль"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResetStep(1);
                            setResetCode("");
                            setResetNewPassword("");
                            setResetMessage(null);
                          }}
                          className="btn-secondary"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                  {resetMessage && <p className="mt-3 text-sm text-gray-600">{resetMessage}</p>}
                </div>
              </div>
            </div>

            {profile.competitions && profile.competitions.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-[#7D39EB] uppercase mb-4">Мои объявления</h2>
                <div className="grid gap-4 md:grid-cols-2 mb-6">
                  <input
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                    placeholder="Поиск по названию"
                    value={competitionFilters.search}
                    onChange={(e) => setCompetitionFilters((prev) => ({ ...prev, search: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                    placeholder="Город"
                    value={competitionFilters.city}
                    onChange={(e) => setCompetitionFilters((prev) => ({ ...prev, city: e.target.value }))}
                  />
                  <select
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                    value={competitionFilters.status}
                    onChange={(e) => setCompetitionFilters((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="">Любой статус</option>
                    <option value="recruiting">Набор участников</option>
                    <option value="closed">Набор завершен</option>
                    <option value="upcoming">Скоро стартует</option>
                    <option value="live">В процессе</option>
                    <option value="finished">Завершено</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                    placeholder="Место пользователя"
                    value={competitionFilters.place}
                    onChange={(e) => setCompetitionFilters((prev) => ({ ...prev, place: e.target.value }))}
                  />
                  <select
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                    value={competitionFilters.category}
                    onChange={(e) => setCompetitionFilters((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="">Любая категория</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.slug}>{cat.name}</option>
                    ))}
                  </select>
                  <select
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                    value={competitionFilters.tag}
                    onChange={(e) => setCompetitionFilters((prev) => ({ ...prev, tag: e.target.value }))}
                  >
                    <option value="">Любой тег</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.slug}>{tag.name}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                    value={competitionFilters.date_from}
                    onChange={(e) => setCompetitionFilters((prev) => ({ ...prev, date_from: e.target.value }))}
                  />
                  <input
                    type="date"
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                    value={competitionFilters.date_to}
                    onChange={(e) => setCompetitionFilters((prev) => ({ ...prev, date_to: e.target.value }))}
                  />
                  <select
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                    value={competitionFilters.sort}
                    onChange={(e) => setCompetitionFilters((prev) => ({ ...prev, sort: e.target.value as "newest" | "oldest" }))}
                  >
                    <option value="newest">Сначала новые</option>
                    <option value="oldest">Сначала старые</option>
                  </select>
                </div>
                <div className="mb-4">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      setCompetitionFilters({
                        search: "",
                        city: "",
                        status: "",
                        date_from: "",
                        date_to: "",
                        category: "",
                        tag: "",
                        sort: "newest",
                        place: "",
                      })
                    }
                  >
                    Сбросить фильтры
                  </button>
                </div>
                <div className="space-y-3">
                  {paginatedCompetitions.length === 0 && (
                    <p className="text-gray-500 text-sm">Объявления по фильтрам не найдены.</p>
                  )}
                  {paginatedCompetitions.map(({ comp, myPlace }) => (
                    <div key={comp.id} className="rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <Link href={`/competitions/${comp.id}`} className="font-semibold text-[#7D39EB] hover:text-[#C6FF33] transition-colors">
                          {comp.title}
                        </Link>
                        <StatusBadge status={comp.status} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span>{comp.city}</span>
                        {myPlace ? <span>Место: {myPlace}</span> : <span>Место: —</span>}
                      </div>
                    </div>
                  ))}
                </div>
                {totalCompetitionPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCompetitionPage((p) => Math.max(1, p - 1))}
                      disabled={safeCompetitionPage <= 1}
                      className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#7D39EB] hover:text-[#7D39EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Назад
                    </button>
                    {Array.from({ length: totalCompetitionPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCompetitionPage(p)}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                          p === safeCompetitionPage
                            ? "bg-[#7D39EB] text-white"
                            : "border-2 border-gray-200 text-gray-700 hover:border-[#7D39EB] hover:text-[#7D39EB]"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCompetitionPage((p) => Math.min(totalCompetitionPages, p + 1))}
                      disabled={safeCompetitionPage >= totalCompetitionPages}
                      className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#7D39EB] hover:text-[#7D39EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Вперед →
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-[#7D39EB] uppercase mb-4">Мои участия</h2>
              <div className="grid gap-4 md:grid-cols-2 mb-6">
                <input
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                  placeholder="Поиск по названию"
                  value={participationFilters.search}
                  onChange={(e) => setParticipationFilters((prev) => ({ ...prev, search: e.target.value }))}
                />
                <input
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                  placeholder="Город"
                  value={participationFilters.city}
                  onChange={(e) => setParticipationFilters((prev) => ({ ...prev, city: e.target.value }))}
                />
                <select
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                  value={participationFilters.status}
                  onChange={(e) => setParticipationFilters((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="">Любой статус</option>
                  <option value="recruiting">Набор участников</option>
                  <option value="closed">Набор завершен</option>
                  <option value="upcoming">Скоро стартует</option>
                  <option value="live">В процессе</option>
                  <option value="finished">Завершено</option>
                </select>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                  placeholder="Место пользователя"
                  value={participationFilters.place}
                  onChange={(e) => setParticipationFilters((prev) => ({ ...prev, place: e.target.value }))}
                />
                <select
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                  value={participationFilters.category}
                  onChange={(e) => setParticipationFilters((prev) => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">Любая категория</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
                <select
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                  value={participationFilters.tag}
                  onChange={(e) => setParticipationFilters((prev) => ({ ...prev, tag: e.target.value }))}
                >
                  <option value="">Любой тег</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.slug}>{tag.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                  value={participationFilters.date_from}
                  onChange={(e) => setParticipationFilters((prev) => ({ ...prev, date_from: e.target.value }))}
                />
                <input
                  type="date"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                  value={participationFilters.date_to}
                  onChange={(e) => setParticipationFilters((prev) => ({ ...prev, date_to: e.target.value }))}
                />
                <select
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                  value={participationFilters.sort}
                  onChange={(e) => setParticipationFilters((prev) => ({ ...prev, sort: e.target.value as "newest" | "oldest" }))}
                >
                  <option value="newest">Сначала новые</option>
                  <option value="oldest">Сначала старые</option>
                </select>
              </div>
              <div className="mb-4">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    setParticipationFilters({
                      search: "",
                      city: "",
                      status: "",
                      date_from: "",
                      date_to: "",
                      category: "",
                      tag: "",
                      sort: "newest",
                      place: "",
                    })
                  }
                >
                  Сбросить фильтры
                </button>
              </div>
              <div className="space-y-3">
                {paginatedParticipations.length === 0 && <p className="text-gray-500 text-sm">Участия по фильтрам не найдены.</p>}
                {paginatedParticipations.map((p) =>
                  p.competition ? (
                    <div key={p.id} className="rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <Link href={`/competitions/${p.competition.id}`} className="font-semibold text-[#7D39EB] hover:text-[#C6FF33] transition-colors">
                          {p.competition.title}
                        </Link>
                        <div className="flex items-center gap-2">
                          {p.status === "no_show" && <span className="text-xs text-orange-600 font-medium">Не явился</span>}
                          {p.status === "registered" && <span className="text-xs text-gray-500">Записан</span>}
                          {p.status === "finished" && p.place && <span className="text-xs text-gray-500">{p.place} место</span>}
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span>{p.competition.city}</span>
                        {p.competition.creator?.name && <span>Организатор: {p.competition.creator.name}</span>}
                      </div>
                      {p.result_note && <p className="mt-2 text-sm text-gray-600">{p.result_note}</p>}

                      {canLeaveReview(p) && (
                        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                          {authoredReviewsByCompetition.get(p.competition.id) && activeReviewCompetitionId !== p.competition.id ? (
                            <>
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-[#7D39EB]">Ваш отзыв</p>
                                  <div className="mt-1 flex gap-1 text-base text-[#C6FF33]">
                                    {Array.from({ length: 5 }, (_, index) => (
                                      <span key={index}>{index < (authoredReviewsByCompetition.get(p.competition.id)?.rating ?? 0) ? "★" : "☆"}</span>
                                    ))}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="btn-secondary px-4 py-2 text-sm"
                                  onClick={() => openReviewForm(p)}
                                >
                                  Изменить отзыв
                                </button>
                              </div>
                              {authoredReviewsByCompetition.get(p.competition.id)?.comment && (
                                <p className="mt-3 text-sm text-gray-700">{authoredReviewsByCompetition.get(p.competition.id)?.comment}</p>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-[#7D39EB]">
                                  {authoredReviewsByCompetition.get(p.competition.id) ? "Изменить отзыв" : "Оставить отзыв организатору"}
                                </p>
                                {activeReviewCompetitionId !== p.competition.id && (
                                  <button
                                    type="button"
                                    className="btn-secondary px-4 py-2 text-sm"
                                    onClick={() => openReviewForm(p)}
                                  >
                                    {authoredReviewsByCompetition.get(p.competition.id) ? "Редактировать" : "Оценить"}
                                  </button>
                                )}
                              </div>

                              {activeReviewCompetitionId === p.competition.id && (
                                <div className="mt-4 space-y-4">
                                  <div>
                                    <p className="mb-2 text-xs font-medium uppercase tracking-widest text-gray-500">Оценка</p>
                                    <div className="flex flex-wrap gap-2">
                                      {Array.from({ length: 5 }, (_, index) => {
                                        const starValue = index + 1;
                                        const currentRating = reviewDrafts[p.competition.id]?.rating ?? 5;
                                        return (
                                          <button
                                            key={starValue}
                                            type="button"
                                            className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                                              currentRating >= starValue
                                                ? "bg-[#7D39EB] text-[#C6FF33]"
                                                : "bg-white text-gray-500 border border-gray-200 hover:border-[#7D39EB]"
                                            }`}
                                            onClick={() =>
                                              setReviewDrafts((prev) => ({
                                                ...prev,
                                                [p.competition.id]: {
                                                  rating: starValue,
                                                  comment: prev[p.competition.id]?.comment ?? authoredReviewsByCompetition.get(p.competition.id)?.comment ?? "",
                                                },
                                              }))
                                            }
                                          >
                                            {starValue} ★
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div>
                                    <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-500">
                                      Комментарий
                                    </label>
                                    <textarea
                                      rows={4}
                                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                                      placeholder="Опишите впечатления об организации соревнования"
                                      value={reviewDrafts[p.competition.id]?.comment ?? authoredReviewsByCompetition.get(p.competition.id)?.comment ?? ""}
                                      onChange={(e) =>
                                        setReviewDrafts((prev) => ({
                                          ...prev,
                                          [p.competition.id]: {
                                            rating: prev[p.competition.id]?.rating ?? authoredReviewsByCompetition.get(p.competition.id)?.rating ?? 5,
                                            comment: e.target.value,
                                          },
                                        }))
                                      }
                                    />
                                  </div>

                                  {reviewFeedback[p.competition.id] && (
                                    <div
                                      className={`rounded-lg p-3 text-sm ${
                                        reviewFeedback[p.competition.id]?.type === "success"
                                          ? "bg-green-50 text-green-700"
                                          : "bg-red-50 text-red-700"
                                      }`}
                                    >
                                      {reviewFeedback[p.competition.id]?.message}
                                    </div>
                                  )}

                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      className="btn-primary px-4 py-2 text-sm"
                                      disabled={reviewSavingCompetitionId === p.competition.id}
                                      onClick={() => submitReview(p.competition!.id)}
                                    >
                                      {reviewSavingCompetitionId === p.competition.id ? "Сохранение..." : "Сохранить отзыв"}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-secondary px-4 py-2 text-sm"
                                      disabled={reviewSavingCompetitionId === p.competition.id}
                                      onClick={() => setActiveReviewCompetitionId(null)}
                                    >
                                      Отмена
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null
                )}
              </div>
              {totalParticipationPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setParticipationPage((p) => Math.max(1, p - 1))}
                    disabled={safeParticipationPage <= 1}
                    className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#7D39EB] hover:text-[#7D39EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Назад
                  </button>
                  {Array.from({ length: totalParticipationPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setParticipationPage(p)}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                        p === safeParticipationPage
                          ? "bg-[#7D39EB] text-white"
                          : "border-2 border-gray-200 text-gray-700 hover:border-[#7D39EB] hover:text-[#7D39EB]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setParticipationPage((p) => Math.min(totalParticipationPages, p + 1))}
                    disabled={safeParticipationPage >= totalParticipationPages}
                    className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#7D39EB] hover:text-[#7D39EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Вперед →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      {avatarDraft && (
        <AvatarCropModal
          key={avatarDraft.url}
          imageUrl={avatarDraft.url}
          fileName={avatarDraft.file.name}
          busy={uploading}
          onCancel={() => {
            URL.revokeObjectURL(avatarDraft.url);
            setAvatarDraft(null);
          }}
          onConfirm={uploadCroppedAvatar}
        />
      )}
    </div>
  );
}

