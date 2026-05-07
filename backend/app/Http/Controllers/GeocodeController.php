<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class GeocodeController extends Controller
{
    public function search(Request $request)
    {
        $validated = $request->validate([
            'query' => ['nullable', 'string', 'min:2', 'max:255'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $lat = $validated['lat'] ?? $validated['latitude'] ?? null;
        $lng = $validated['lng'] ?? $validated['longitude'] ?? null;

        if ($lat !== null && $lng !== null) {
            return $this->reverse((float) $lat, (float) $lng);
        }

        $query = trim($validated['query'] ?? '');
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

        $members = $this->requestYandex($apiKey, $query);
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
            if (!$pos) {
                continue;
            }

            $parts = explode(' ', trim($pos), 2);
            $lng = (float) ($parts[0] ?? 0);
            $lat = (float) ($parts[1] ?? 0);
            $meta = $geo['metaDataProperty']['GeocoderMetaData'] ?? [];

            $results[] = [
                'address' => $meta['text'] ?? $geo['name'] ?? '',
                'name' => $geo['name'] ?? '',
                'city' => $this->extractLocality($meta, $geo),
                'latitude' => $lat,
                'longitude' => $lng,
            ];
        }

        return response()->json(['results' => $results]);
    }

    private function reverse(float $lat, float $lng)
    {
        $apiKey = config('services.yandex.geocoder_key');
        if (!$apiKey) {
            return response()->json([
                'error' => 'Геокодер не настроен. Добавьте YANDEX_GEOCODER_API_KEY в .env',
            ], 503);
        }

        $members = $this->requestYandex($apiKey, "{$lng},{$lat}", 'locality', 1);
        if (empty($members)) {
            $members = $this->requestYandex($apiKey, "{$lng},{$lat}", null, 1);
        }

        if (empty($members)) {
            return response()->json([
                'city' => null,
                'address' => null,
                'message' => 'Населенный пункт по координатам не найден',
            ]);
        }

        $geo = $members[0]['GeoObject'] ?? [];
        $meta = $geo['metaDataProperty']['GeocoderMetaData'] ?? [];

        return response()->json([
            'city' => $this->extractLocality($meta, $geo),
            'address' => $meta['text'] ?? $geo['name'] ?? null,
            'name' => $geo['name'] ?? null,
            'latitude' => $lat,
            'longitude' => $lng,
        ]);
    }

    private function requestYandex(string $apiKey, string $geocode, ?string $kind = null, int $results = 5): array
    {
        $params = [
            'apikey' => $apiKey,
            'geocode' => $geocode,
            'format' => 'json',
            'results' => $results,
        ];

        if ($kind) {
            $params['kind'] = $kind;
        }

        $response = Http::timeout(5)->get('https://geocode-maps.yandex.ru/1.x/', $params);

        if (!$response->successful()) {
            return [];
        }

        $data = $response->json();

        return $data['response']['GeoObjectCollection']['featureMember'] ?? [];
    }

    private function extractLocality(array $meta, array $geo): ?string
    {
        $components = $meta['Address']['Components'] ?? [];
        foreach (['locality', 'province', 'area'] as $kind) {
            foreach ($components as $component) {
                if (($component['kind'] ?? null) === $kind && !empty($component['name'])) {
                    return $component['name'];
                }
            }
        }

        $country = $meta['AddressDetails']['Country'] ?? [];
        $adminArea = $country['AdministrativeArea'] ?? [];
        $subArea = $adminArea['SubAdministrativeArea'] ?? [];

        return $adminArea['Locality']['LocalityName']
            ?? $subArea['Locality']['LocalityName']
            ?? $subArea['DependentLocality']['DependentLocalityName']
            ?? $adminArea['DependentLocality']['DependentLocalityName']
            ?? $geo['name']
            ?? null;
    }
}
