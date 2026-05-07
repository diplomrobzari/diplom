'use client';

import { FormEvent, useEffect, useRef, useState } from "react";
import { apiFetch, getToken } from "../../../lib/api";
import { Category, Tag } from "../../../types";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

export default function NewCompetitionPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const searchControlRef = useRef<any>(null);
  const [citySuggestions, setCitySuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [citySearchLoading, setCitySearchLoading] = useState(false);
  const citySearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const extractCityName = (geoObject: any, fallback = "") => {
    if (!geoObject) return fallback;

    const localities = geoObject.getLocalities?.();
    if (Array.isArray(localities) && localities[0]) {
      return localities[0];
    }

    const directName = geoObject.properties?.get?.("name");
    const text = geoObject.properties?.get?.("text");
    const description = geoObject.properties?.get?.("description");
    const metaData = geoObject.properties?.get?.("metaDataProperty");
    const geocoderMetaData = metaData?.GeocoderMetaData;
    const components = geocoderMetaData?.Address?.Components || [];
    const addressDetails = geocoderMetaData?.AddressDetails?.Country;

    const localityComponent = components.find((component: any) => component?.kind === "locality");
    const localityFromDetails =
      addressDetails?.AdministrativeArea?.Locality?.LocalityName ||
      addressDetails?.AdministrativeArea?.SubAdministrativeArea?.Locality?.LocalityName ||
      addressDetails?.AdministrativeArea?.SubAdministrativeArea?.DependentLocality?.DependentLocalityName ||
      addressDetails?.AdministrativeArea?.DependentLocality?.DependentLocalityName ||
      "";

    return (
      localityComponent?.name ||
      localityFromDetails ||
      directName ||
      description ||
      text ||
      fallback
    );
  };

  useEffect(() => {
    apiFetch<Category[]>("/categories").then(setCategories);
    apiFetch<Tag[]>("/tags").then(setTags);

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
        if (!cancelled) {
          setMapLoaded(true);
          setMapError(null);
        }
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

      if (!cancelled) {
        setMapLoaded(true);
        setMapError(null);
      }
    };

    loadMaps().catch((err: unknown) => {
      console.error("[Yandex Maps] Ошибка загрузки:", err);
      if (!cancelled) {
        setMapError("Не удалось загрузить карту. Проверьте интернет или ключ Yandex Maps API.");
      }
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
        zoom: 10,
        controls: ['zoomControl', 'fullscreenControl', 'typeSelector'],
      });
      mapInstanceRef.current = map;

      try {
        const searchControl = new w.ymaps.control.SearchControl({
          options: {
            provider: 'yandex#search',
            float: 'none',
            position: { top: 10, left: 60 },
            noPlacemark: true,
          },
        });

        searchControl.events.add('resultselect', (e: any) => {
          const index = e.get('index');
          searchControl.getResult(index).then((res: any) => {
            const firstGeoObject = res.geoObjects.get(0);
            if (firstGeoObject) {
              const coords = firstGeoObject.geometry.getCoordinates();
              const bounds = firstGeoObject.properties.get('boundedBy');
              const name = firstGeoObject.properties.get('name');
              
              if (coords && Array.isArray(coords) && coords.length === 2) {
                const lat = coords[0];
                const lng = coords[1];
                
                w.ymaps.geocode([lat, lng], { results: 1 })
                  .then((geoRes: any) => {
                    const geoObject = geoRes.geoObjects.get(0);
                    const cityName = extractCityName(geoObject, name);
                    return cityName;
                  })
                  .catch(() => name)
                  .then((cityName: string) => {
                    setForm((p) => ({
                      ...p,
                      city: cityName,
                      latitude: lat.toString(),
                      longitude: lng.toString(),
                    }));
                  });

                if (!markerRef.current) {
                  markerRef.current = new w.ymaps.Placemark([lat, lng], {}, {
                    preset: 'islands#blueDotIcon',
                  });
                  map.geoObjects.add(markerRef.current);
                } else {
                  markerRef.current.geometry.setCoordinates([lat, lng]);
                }
                
                if (bounds) {
                  map.setBounds(bounds, { checkZoomRange: true });
                } else {
                  map.setCenter([lat, lng], 10);
                }
              }
            }
          });
        });

        map.controls.add(searchControl);
        searchControlRef.current = searchControl;
      } catch (err) {
        console.log('Поиск недоступен. Убедитесь, что API-ключ активирован.');
      }

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

        w.ymaps.geocode([lat, lng], { results: 1 })
          .then((geoRes: any) => {
            const geoObject = geoRes.geoObjects.get(0);
            if (geoObject) {
              const city = extractCityName(geoObject, "");
              
              setForm((p) => ({
                ...p,
                city: city || p.city,
                latitude: lat.toString(),
                longitude: lng.toString(),
              }));
            } else {
              setForm((p) => ({
                ...p,
                latitude: lat.toString(),
                longitude: lng.toString(),
              }));
            }
          })
          .catch(() => {
            setForm((p) => ({
              ...p,
              latitude: lat.toString(),
              longitude: lng.toString(),
            }));
          });

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
  }, [mapLoaded]);

  useEffect(() => {
    if (!form.city || form.city.length < 2) {
      setCitySuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (citySearchTimeoutRef.current) {
      clearTimeout(citySearchTimeoutRef.current);
    }

    citySearchTimeoutRef.current = setTimeout(() => {
      const w = window as any;
      if (!w.ymaps || !w.ymaps.suggest) {
        return;
      }

      setCitySearchLoading(true);
      
      w.ymaps.suggest(form.city).then((suggestions: any[]) => {
        const cities = suggestions
          .filter((s: any) => s.type !== 'street')
          .slice(0, 5);
        setCitySuggestions(cities);
        setShowSuggestions(cities.length > 0);
        setCitySearchLoading(false);
      }).catch(() => {
        setCitySearchLoading(false);
      });
    }, 500);

    return () => {
      if (citySearchTimeoutRef.current) {
        clearTimeout(citySearchTimeoutRef.current);
      }
    };
  }, [form.city]);

  const handleSelectSuggestion = (suggestion: any) => {
    const w = window as any;
    if (!w.ymaps || !w.ymaps.geocode) return;

    w.ymaps.geocode(suggestion.value || suggestion.displayName, { results: 1 })
      .then((res: any) => {
        const firstGeoObject = res.geoObjects.get(0);
        if (firstGeoObject) {
          const coords = firstGeoObject.geometry.getCoordinates();
          const bounds = firstGeoObject.properties.get('boundedBy');
          const name = extractCityName(firstGeoObject, suggestion.displayName || suggestion.value);
          
          if (coords && Array.isArray(coords) && coords.length === 2) {
            const lat = coords[0];
            const lng = coords[1];
            
            setForm((p) => ({
              ...p,
              city: name || suggestion.displayName || suggestion.value,
              latitude: lat.toString(),
              longitude: lng.toString(),
            }));

            if (mapInstanceRef.current) {
              if (!markerRef.current) {
                markerRef.current = new w.ymaps.Placemark([lat, lng], {}, {
                  preset: 'islands#blueDotIcon',
                });
                mapInstanceRef.current.geoObjects.add(markerRef.current);
              } else {
                markerRef.current.geometry.setCoordinates([lat, lng]);
              }
              
              if (bounds) {
                mapInstanceRef.current.setBounds(bounds, { checkZoomRange: true });
              } else {
                mapInstanceRef.current.setCenter([lat, lng], 10);
              }
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setShowSuggestions(false);
        setCitySuggestions([]);
      });
  };

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

      await apiFetch("/competitions", {
        method: "POST",
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
      router.push("/");
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

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Hero секция */}
      <section className="bg-[#7D39EB] text-white py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-[2px] bg-[#C6FF33]"></span>
            <span className="text-sm font-medium uppercase tracking-widest text-[#C6FF33]">
              Создание
            </span>
          </div>
          <h1 className="heading-lg">
            НОВОЕ <span className="text-[#C6FF33]">ОБЪЯВЛЕНИЕ</span>
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
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">Город <span className="text-red-500">*</span></label>
                <input
                  className={`w-full rounded-xl border-2 ${fieldErrors.city ? "border-red-500" : "border-gray-200"} px-4 py-3 text-gray-700 focus:border-[#7D39EB] focus:outline-none transition-colors`}
                  value={form.city}
                  onChange={(e) => { 
                    setForm((p) => ({ ...p, city: e.target.value })); 
                    setFieldErrors((prev) => ({ ...prev, city: "" }));
                    setShowSuggestions(true);
                  }}
                  onFocus={() => citySuggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Введите название города"
                />
                {citySearchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin h-4 w-4 text-[#7D39EB]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
                {fieldErrors.city && <p className="mt-1 text-xs text-red-500">{fieldErrors.city}</p>}
                
                {showSuggestions && citySuggestions.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border-2 border-[#7D39EB] rounded-xl shadow-lg max-h-60 overflow-auto">
                    {citySuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="w-full text-left px-4 py-3 hover:bg-[#F5F5F5] text-sm text-gray-700 transition-colors"
                      >
                        <span className="font-medium">{suggestion.displayName || suggestion.value}</span>
                        {suggestion.type && (
                          <span className="text-xs text-gray-500 ml-2">({suggestion.type})</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
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
                Введите город для автозаполнения координат, используйте поиск на карте или кликните по карте.
              </p>
              <div className="h-64 w-full rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-50">
                <div ref={mapRef} className="h-full w-full" />
              </div>
              {mapError && <p className="text-xs text-red-500 mt-2">{mapError}</p>}
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

          {/* Кнопка отправки */}
          <div className="flex gap-4">
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              Отправить на модерацию
            </button>
            <Link
              href="/"
              className="btn-secondary"
            >
              Отмена
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
