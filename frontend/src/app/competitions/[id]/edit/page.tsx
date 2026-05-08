'use client';

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, getToken } from "../../../../lib/api";
import { Category, Tag, Competition } from "../../../../types";

function validateCompetition(form: Record<string, string | number>): Record<string, string> {
  const errs: Record<string, string> = {};
  const trim = (s: string) => String(s || "").trim();

  if (!trim(form.title as string)) errs.title = "Обязательное поле";
  else if ((form.title as string).length > 255) errs.title = "Максимум 255 символов";

  if (form.description && (form.description as string).length > 5000) errs.description = "Максимум 5000 символов";

  if (!trim(form.city as string)) errs.city = "Обязательное поле";
  else if ((form.city as string).length > 255) errs.city = "Максимум 255 символов";

  if (form.address && (form.address as string).length > 500) errs.address = "Максимум 500 символов";

  const lat = form.latitude ? parseFloat(String(form.latitude)) : NaN;
  const lng = form.longitude ? parseFloat(String(form.longitude)) : NaN;
  if (form.latitude && (isNaN(lat) || lat < -90 || lat > 90)) errs.latitude = "Широта от -90 до 90";
  if (form.longitude && (isNaN(lng) || lng < -180 || lng > 180)) errs.longitude = "Долгота от -180 до 180";

  if (!trim(form.starts_at as string)) errs.starts_at = "Укажите дату начала";
  else if (new Date(form.starts_at as string).getTime() < Date.now() - 60000) {
    errs.starts_at = "Дата начала должна быть в будущем";
  }

  if (form.ends_at && trim(form.ends_at as string)) {
    const start = new Date(form.starts_at as string).getTime();
    const end = new Date(form.ends_at as string).getTime();
    if (end <= start) errs.ends_at = "Дата окончания должна быть после начала";
  }

  const maxP = Number(form.max_participants) || 0;
  if (maxP < 0) errs.max_participants = "Минимум 0";

  if (form.custom_category && (form.custom_category as string).length > 255) {
    errs.custom_category = "Максимум 255 символов";
  }

  return errs;
}

export default function EditCompetitionPage() {
  const params = useParams();
  const router = useRouter();
  const competitionId = params?.id as string | undefined;
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    description: "",
    city: "",
    address: "",
    latitude: "",
    longitude: "",
    starts_at: "",
    ends_at: "",
    max_participants: 0,
    category_id: "",
    custom_category: "",
  });
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const normalizeCityName = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";

  const firstCityCandidate = (...values: unknown[]) => {
    for (const value of values) {
      const normalized = normalizeCityName(value);
      if (normalized) return normalized;
    }

    return "";
  };

  const isAdministrativeName = (value: unknown) =>
    /(округ|район|область|край|республика|муниципал)/i.test(normalizeCityName(value));

  const displayNameFirstPart = (value: unknown) => {
    const normalized = normalizeCityName(value);
    if (!normalized) return "";

    const firstPart = normalized.split(",")[0]?.trim() || "";
    return !isAdministrativeName(firstPart) ? firstPart : "";
  };

  const extractCityName = (geoObject: any, fallback = "") => {
    if (!geoObject) return fallback;

    const localities = geoObject.getLocalities?.();
    const localityFromGetter = Array.isArray(localities) ? firstCityCandidate(...localities) : "";
    if (localityFromGetter) {
      return localityFromGetter;
    }

    const administrativeAreas = geoObject.getAdministrativeAreas?.();
    const directName = geoObject.properties?.get?.("name");
    const text = geoObject.properties?.get?.("text");
    const description = geoObject.properties?.get?.("description");
    const addressLine = geoObject.getAddressLine?.();
    const metaData = geoObject.properties?.get?.("metaDataProperty");
    const geocoderMetaData = metaData?.GeocoderMetaData;
    const components = geocoderMetaData?.Address?.Components || [];
    const addressDetails = geocoderMetaData?.AddressDetails?.Country;

    const componentName = (kind: string) =>
      components.find((component: any) => component?.kind === kind)?.name;

    const localityFromDetails =
      addressDetails?.AdministrativeArea?.Locality?.LocalityName ||
      addressDetails?.AdministrativeArea?.SubAdministrativeArea?.Locality?.LocalityName ||
      addressDetails?.AdministrativeArea?.SubAdministrativeArea?.DependentLocality?.DependentLocalityName ||
      addressDetails?.AdministrativeArea?.DependentLocality?.DependentLocalityName ||
      "";

    return firstCityCandidate(
      componentName("locality"),
      localityFromDetails,
      !isAdministrativeName(directName) ? directName : "",
      displayNameFirstPart(addressLine),
      displayNameFirstPart(text),
      !isAdministrativeName(administrativeAreas?.[0]) ? administrativeAreas?.[0] : "",
      !isAdministrativeName(description) ? description : "",
      componentName("province"),
      componentName("area"),
      directName,
      text,
      fallback
    );
  };

  const getFirstGeoObject = (geoResult: any) =>
    geoResult?.geoObjects?.get?.(0) ??
    geoResult?.geoObjects?.toArray?.()?.[0] ??
    null;

  const resolveCityNameFromCoordsApi = async (lat: number, lng: number) => {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
    });
    const response = await apiFetch<{ city?: string | null }>(`/geocode?${params.toString()}`);

    return normalizeCityName(response.city);
  };

  const resolveCityNameByCoords = async (ymaps: any, lat: number, lng: number, fallback = "") => {
    try {
      const city = await resolveCityNameFromCoordsApi(lat, lng);
      if (city) return city;
    } catch {
      // If server-side reverse geocoding is unavailable, try the browser map API.
    }

    const attempts = [
      { request: [lat, lng], options: { results: 1, kind: "locality" } },
      { request: [lat, lng], options: { results: 1 } },
      { request: `${lng},${lat}`, options: { results: 1, kind: "locality" } },
      { request: `${lng},${lat}`, options: { results: 1 } },
    ];

    if (typeof ymaps?.geocode === "function") {
      for (const { request, options } of attempts) {
        try {
          const geoResult = await ymaps.geocode(request, options);
          const geoObject = getFirstGeoObject(geoResult);
          const city = extractCityName(geoObject, fallback);

          if (city.trim()) {
            return city.trim();
          }
        } catch {
          // Try the next geocoding strategy.
        }
      }
    }

    return fallback.trim();
  };

  const applyMapPoint = (lat: number, lng: number, city = "") => {
    const normalizedCity = normalizeCityName(city);

    setForm((p) => ({
      ...p,
      city: normalizedCity || p.city,
      latitude: lat.toString(),
      longitude: lng.toString(),
    }));

    if (normalizedCity) {
      setFieldErrors((prev) => ({ ...prev, city: "" }));
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [cats, tgs, comp] = await Promise.all([
          apiFetch<Category[]>("/categories"),
          apiFetch<Tag[]>("/tags"),
          apiFetch<Competition>(`/competitions/${competitionId}`, { token: getToken() }),
        ]);
        setCategories(cats);
        setTags(tgs);

        if (comp.status === 'live' || comp.status === 'finished') {
          setError("Нельзя редактировать объявление, которое находится в статусе «В процессе» или «Завершено»");
          return;
        }

        const formatDate = (date: string) => {
          const d = new Date(date);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        setForm({
          title: comp.title,
          description: comp.description || "",
          city: comp.city,
          address: comp.address || "",
          latitude: comp.latitude?.toString() || "",
          longitude: comp.longitude?.toString() || "",
          starts_at: formatDate(comp.starts_at),
          ends_at: comp.ends_at ? formatDate(comp.ends_at) : "",
          max_participants: comp.max_participants,
          category_id: comp.category?.id.toString() || "",
          custom_category: comp.custom_category || "",
        });
        setSelectedTags(comp.tags?.map((t) => t.name) || []);
      } catch (e: any) {
        setError(e.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    };
    if (competitionId) {
      load();
    }
  }, [competitionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as any;
    let cancelled = false;

    const waitForYmapsReady = (timeoutMs = 12000) =>
      new Promise<void>((resolve, reject) => {
        const started = Date.now();
        const poll = () => {
          if (cancelled) return;
          if (w.ymaps) {
            w.ymaps.ready(() => resolve());
            return;
          }
          if (Date.now() - started > timeoutMs) {
            reject(new Error("Yandex Maps API did not initialize in time"));
            return;
          }
          setTimeout(poll, 100);
        };
        poll();
      });

    const injectScript = (src: string, marker: string) =>
      new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[data-yandex-maps="${marker}"]`);
        if (existing) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.dataset.yandexMaps = marker;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });

    const loadMaps = async () => {
      if (w.ymaps) {
        await waitForYmapsReady();
        if (!cancelled) setMapLoaded(true);
        return;
      }

      const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY || "1120422d-4dd2-412a-ac0b-56b3bbf0ac10";
      const withKey = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
      const withoutKey = "https://api-maps.yandex.ru/2.1/?lang=ru_RU";

      try {
        await injectScript(withKey, "with-key");
        await waitForYmapsReady();
      } catch (firstError) {
        console.warn("[Yandex Maps] Primary load failed, retrying without key", firstError);
        await injectScript(withoutKey, "no-key-fallback");
        await waitForYmapsReady();
      }

      if (!cancelled) setMapLoaded(true);
    };

    loadMaps().catch((err: unknown) => {
      console.error("[Yandex Maps] Ошибка загрузки:", err);
    });

    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!mapLoaded) return;
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return;

    const w = window as any;
    if (!w.ymaps) return;

    w.ymaps.ready(() => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const initialCenter =
        form.latitude && form.longitude
          ? [Number(form.latitude), Number(form.longitude)]
          : [55.7558, 37.6176];

      const map = new w.ymaps.Map(mapRef.current, {
        center: initialCenter,
        zoom: form.latitude && form.longitude ? 13 : 10,
      });
      mapInstanceRef.current = map;

      if (form.latitude && form.longitude) {
        markerRef.current = new w.ymaps.Placemark(initialCenter, {}, {
          preset: 'islands#blueDotIcon',
        });
        map.geoObjects.add(markerRef.current);
      }

      map.events.add("click", (e: any) => {
        const coords = e.get("coords");
        if (!coords || !Array.isArray(coords) || coords.length < 2) return;

        const lat = coords[0];
        const lng = coords[1];
        if (typeof lat !== "number" || typeof lng !== "number") return;

        applyMapPoint(lat, lng);
        resolveCityNameByCoords(w.ymaps, lat, lng)
          .then((city) => {
            if (city) applyMapPoint(lat, lng, city);
          })
          .catch(() => {});

        if (!markerRef.current) {
          markerRef.current = new w.ymaps.Placemark([lat, lng], {}, {
            preset: 'islands#blueDotIcon',
          });
          map.geoObjects.add(markerRef.current);
        } else {
          markerRef.current.geometry.setCoordinates([lat, lng]);
        }
      });
    });
  }, [mapLoaded, form.latitude, form.longitude]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const errs = validateCompetition({ ...form, max_participants: form.max_participants });
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      // Получаем название выбранной категории
      const selectedCategory = categories.find(cat => cat.id.toString() === form.category_id);
      const categoryName = selectedCategory?.name || null;

      await apiFetch(`/competitions/${competitionId}`, {
        method: "PUT",
        token: getToken(),
        body: {
          ...form,
          category_id: form.category_id || undefined,
          category_name: categoryName,
          custom_category: form.custom_category || undefined,
          max_participants: Number(form.max_participants),
          address: form.address || undefined,
          latitude: form.latitude ? Number(form.latitude) : undefined,
          longitude: form.longitude ? Number(form.longitude) : undefined,
          tags: selectedTags,
          tag_names: selectedTags,
        },
      });
      router.push(`/competitions/${competitionId}`);
    } catch (e: any) {
      setError(e.message);
      setFieldErrors({});
    }
  };

  const toggleTag = (slug: string) => {
    setSelectedTags((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5]">
        <section className="bg-[#7D39EB] text-white py-12">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-[2px] bg-[#C6FF33]"></span>
              <span className="text-sm font-medium uppercase tracking-widest text-[#C6FF33]">
                Загрузка
              </span>
            </div>
            <h1 className="heading-lg">
              <span className="text-[#C6FF33]">ОБНОВЛЕНИЕ</span> ДАННЫХ
            </h1>
          </div>
        </section>
        <main className="mx-auto max-w-4xl px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="w-16 h-16 border-4 border-[#7D39EB] border-t-[#C6FF33] rounded-full animate-spin"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error && !form.title) {
    return (
      <div className="min-h-screen bg-[#F5F5F5]">
        <section className="bg-[#7D39EB] text-white py-12">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-[2px] bg-[#C6FF33]"></span>
              <span className="text-sm font-medium uppercase tracking-widest text-[#C6FF33]">
                Ошибка
              </span>
            </div>
            <h1 className="heading-lg">
              <span className="text-[#C6FF33]">ДОСТУП</span> ЗАПРЕЩЁН
            </h1>
          </div>
        </section>
        <main className="mx-auto max-w-4xl px-4 py-8">
          <div className="rounded-xl bg-red-50 p-6 text-red-700 border border-red-200">
            <p className="text-lg font-semibold mb-2">Ошибка доступа</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="mt-4 inline-flex items-center gap-2 text-[#7D39EB] font-semibold hover:underline"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Вернуться назад
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Hero секция */}
      <section className="bg-[#7D39EB] text-white py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-[2px] bg-[#C6FF33]"></span>
            <span className="text-sm font-medium uppercase tracking-widest text-[#C6FF33]">
              Редактирование
            </span>
          </div>
          <h1 className="heading-lg">
            ИЗМЕНИТЬ <span className="text-[#C6FF33]">ОБЪЯВЛЕНИЕ</span>
          </h1>
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Основная информация */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-[#7D39EB] mb-4 uppercase">Основная информация</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Заголовок <span className="text-red-500">*</span></label>
                <input
                  className={`w-full rounded-xl border-2 ${fieldErrors.title ? "border-red-500" : "border-gray-200"} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                  value={form.title}
                  onChange={(e) => { setForm((p) => ({ ...p, title: e.target.value })); setFieldErrors((prev) => ({ ...prev, title: "" })); }}
                  placeholder="Название соревнования"
                />
                {fieldErrors.title && <p className="mt-1 text-xs text-red-500">{fieldErrors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Описание</label>
                <textarea
                  className={`w-full rounded-xl border-2 ${fieldErrors.description ? "border-red-500" : "border-gray-200"} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                  rows={4}
                  value={form.description}
                  onChange={(e) => { setForm((p) => ({ ...p, description: e.target.value })); setFieldErrors((prev) => ({ ...prev, description: "" })); }}
                  placeholder="Опишите соревнование"
                />
                {fieldErrors.description && <p className="mt-1 text-xs text-red-500">{fieldErrors.description}</p>}
              </div>
            </div>
          </div>

          {/* Место и время */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-[#7D39EB] mb-4 uppercase">Место и время</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Город <span className="text-red-500">*</span></label>
                <input
                  className={`w-full rounded-xl border-2 ${fieldErrors.city ? "border-red-500" : "border-gray-200"} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                  value={form.city}
                  onChange={(e) => { setForm((p) => ({ ...p, city: e.target.value })); setFieldErrors((prev) => ({ ...prev, city: "" })); }}
                  placeholder="Введите название города"
                />
                {fieldErrors.city && <p className="mt-1 text-xs text-red-500">{fieldErrors.city}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Мест</label>
                <input
                  type="number"
                  min={0}
                  className={`w-full rounded-xl border-2 ${fieldErrors.max_participants ? "border-red-500" : "border-gray-200"} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                  value={form.max_participants}
                  onChange={(e) => { setForm((p) => ({ ...p, max_participants: Number(e.target.value) || 0 })); setFieldErrors((prev) => ({ ...prev, max_participants: "" })); }}
                />
                {fieldErrors.max_participants && <p className="mt-1 text-xs text-red-500">{fieldErrors.max_participants}</p>}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Место на карте</label>
              <p className="text-xs text-gray-500 mb-3">
                Кликните по карте, чтобы поставить метку. Координаты сохранятся вместе с объявлением.
              </p>
              <div className="h-64 w-full rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-50">
                <div ref={mapRef} className="h-full w-full" />
              </div>
              {form.latitude && form.longitude && (
                <p className="text-xs text-gray-500 mt-2">
                  Выбрано: широта {form.latitude}, долгота {form.longitude}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Дата начала <span className="text-red-500">*</span></label>
                <input
                  type="datetime-local"
                  className={`w-full rounded-xl border-2 ${fieldErrors.starts_at ? "border-red-500" : "border-gray-200"} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                  value={form.starts_at}
                  onChange={(e) => { setForm((p) => ({ ...p, starts_at: e.target.value })); setFieldErrors((prev) => ({ ...prev, starts_at: "", ends_at: "" })); }}
                />
                {fieldErrors.starts_at && <p className="mt-1 text-xs text-red-500">{fieldErrors.starts_at}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Дата окончания</label>
                <input
                  type="datetime-local"
                  className={`w-full rounded-xl border-2 ${fieldErrors.ends_at ? "border-red-500" : "border-gray-200"} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                  value={form.ends_at}
                  onChange={(e) => { setForm((p) => ({ ...p, ends_at: e.target.value })); setFieldErrors((prev) => ({ ...prev, ends_at: "" })); }}
                />
                {fieldErrors.ends_at && <p className="mt-1 text-xs text-red-500">{fieldErrors.ends_at}</p>}
              </div>
            </div>
          </div>

          {/* Категория */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-[#7D39EB] mb-4 uppercase">Категория</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Категория (из списка)</label>
                <select
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors"
                  value={form.category_id}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, category_id: e.target.value }))
                  }
                >
                  <option value="">Не выбрана</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Своя категория</label>
                <input
                  className={`w-full rounded-xl border-2 ${fieldErrors.custom_category ? "border-red-500" : "border-gray-200"} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                  value={form.custom_category}
                  onChange={(e) => { setForm((p) => ({ ...p, custom_category: e.target.value })); setFieldErrors((prev) => ({ ...prev, custom_category: "" })); }}
                  placeholder="Например, роллер-биатлон"
                />
                {fieldErrors.custom_category && <p className="mt-1 text-xs text-red-500">{fieldErrors.custom_category}</p>}
              </div>
            </div>
          </div>

          {/* Теги */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-[#7D39EB] mb-4 uppercase">Теги</h2>

            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const active = selectedTags.includes(tag.name);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.name)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      active
                        ? "bg-[#7D39EB] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-[#7D39EB] hover:text-white"
                    }`}
                  >
                    #{tag.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-4">
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              Сохранить изменения
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
            >
              Отмена
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
