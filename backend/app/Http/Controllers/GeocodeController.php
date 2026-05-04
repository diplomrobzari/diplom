<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class GeocodeController extends Controller
{
    /**
     * Прокси для Яндекс.Геокодера — поиск координат по адресу/городу.
     * API ключ: https://developer.tech.yandex.ru/services/
     */
    public function search(Request $request)
    {
        $validated = $request->validate([
            'query' => ['required', 'string', 'min:2', 'max:255'],
        ]);

        $query = trim($validated['query']);
        if (strlen($query) < 2) {
            return response()->json([
                'error' => 'Введите минимум 2 символа для поиска',
            ], 422);
        }

        $apiKey = config('services.yandex.geocoder_key');
        if (!$apiKey) {
            return response()->json([
                'error' => 'Геокодер не настроен. Добавьте YANDEX_GEOCODER_API_KEY в .env',
            ], 503);
        }

        $url = 'https://geocode-maps.yandex.ru/1.x/?' . http_build_query([
            'apikey' => $apiKey,
            'geocode' => $query,
            'format' => 'json',
        ]);

        $response = Http::timeout(5)->get($url);

        if (!$response->successful()) {
            return response()->json([
                'error' => 'Сервис геокодирования временно недоступен',
            ], 502);
        }

        $data = $response->json();
        $collection = $data['response']['GeoObjectCollection'] ?? [];
        $members = $collection['featureMember'] ?? [];

        if (empty($members)) {
            return response()->json([
                'results' => [],
                'message' => 'Ничего не найдено',
            ]);
        }

        $results = [];
        foreach (array_slice($members, 0, 5) as $item) {
            $geo = $item['GeoObject'] ?? [];
            $pos = $geo['Point']['pos'] ?? '';
            if ($pos) {
                $parts = explode(' ', trim($pos), 2);
                $lng = (float) ($parts[0] ?? 0);
                $lat = (float) ($parts[1] ?? 0);
                $meta = $geo['metaDataProperty']['GeocoderMetaData'] ?? [];
                $results[] = [
                    'address' => $meta['text'] ?? $geo['name'] ?? '',
                    'name' => $geo['name'] ?? '',
                    'latitude' => $lat,
                    'longitude' => $lng,
                ];
            }
        }

        return response()->json(['results' => $results]);
    }
}
