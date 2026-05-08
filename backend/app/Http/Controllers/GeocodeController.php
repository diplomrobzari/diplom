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
        if ($members === null) {
            return $this->yandexUnavailableResponse();
        }

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
            $fallback = $this->requestNominatimReverse($lat, $lng);
            if ($fallback) {
                return response()->json($fallback);
            }

            return response()->json([
                'error' => 'Геокодер не настроен. Добавьте YANDEX_GEOCODER_API_KEY в .env',
            ], 503);
        }

        $members = $this->requestYandex($apiKey, "{$lng},{$lat}", 'locality', 1, 'longlat');

        if (empty($members)) {
            $members = $this->requestYandex($apiKey, "{$lng},{$lat}", null, 1, 'longlat');
        }

        if (empty($members)) {
            $fallback = $this->requestNominatimReverse($lat, $lng);
            if ($fallback) {
                return response()->json($fallback);
            }

            return response()->json([
                'city' => null,
                'address' => null,
                'message' => 'Населенный пункт по координатам не найден',
            ]);
        }

        $geo = $members[0]['GeoObject'] ?? [];
        $meta = $geo['metaDataProperty']['GeocoderMetaData'] ?? [];
        $city = $this->extractLocality($meta, $geo);

        if ($this->isAdministrativeName($city)) {
            $fallback = $this->requestNominatimReverse($lat, $lng);
            if ($fallback && !$this->isAdministrativeName($fallback['city'] ?? null)) {
                return response()->json($fallback);
            }
        }

        return response()->json([
            'city' => $city,
            'address' => $meta['text'] ?? $geo['name'] ?? null,
            'name' => $geo['name'] ?? null,
            'latitude' => $lat,
            'longitude' => $lng,
        ]);
    }

    private function requestYandex(string $apiKey, string $geocode, ?string $kind = null, int $results = 5, ?string $sco = null): ?array
    {
        $params = [
            'apikey' => $apiKey,
            'geocode' => $geocode,
            'format' => 'json',
            'lang' => 'ru_RU',
            'results' => $results,
        ];

        if ($kind) {
            $params['kind'] = $kind;
        }

        if ($sco) {
            $params['sco'] = $sco;
        }

        $response = Http::timeout(5)->get('https://geocode-maps.yandex.ru/1.x/', $params);

        if (!$response->successful()) {
            return null;
        }

        $data = $response->json();

        if (isset($data['error']) || isset($data['message'])) {
            return null;
        }

        return $data['response']['GeoObjectCollection']['featureMember'] ?? [];
    }

    private function requestNominatimReverse(float $lat, float $lng): ?array
    {
        foreach ([18, 16, 14, 12, 10] as $zoom) {
            $response = Http::withHeaders([
                'User-Agent' => config('app.name', 'Nastarte') . '/1.0',
            ])->timeout(5)->get('https://nominatim.openstreetmap.org/reverse', [
                'format' => 'jsonv2',
                'lat' => $lat,
                'lon' => $lng,
                'accept-language' => 'ru',
                'addressdetails' => 1,
                'zoom' => $zoom,
            ]);

            if (!$response->successful()) {
                continue;
            }

            $result = $this->nominatimResultFromResponse($response->json(), $lat, $lng);
            if ($result && !$this->isAdministrativeName($result['city'] ?? null)) {
                return $result;
            }
        }

        return null;
    }

    private function nominatimResultFromResponse(array $data, float $lat, float $lng): ?array
    {
        $address = $data['address'] ?? [];
        $city = $this->firstNonEmpty([
            $address['village'] ?? null,
            $address['hamlet'] ?? null,
            $address['isolated_dwelling'] ?? null,
            $address['locality'] ?? null,
            $this->specificNameFromAddressText($data['display_name'] ?? null),
            $address['town'] ?? null,
            $address['city'] ?? null,
            $address['municipality'] ?? null,
            $address['county'] ?? null,
        ]);

        if (!$city) {
            return null;
        }

        return [
            'city' => $city,
            'address' => $data['display_name'] ?? null,
            'name' => $city,
            'latitude' => $lat,
            'longitude' => $lng,
            'source' => 'nominatim',
        ];
    }

    private function yandexUnavailableResponse()
    {
        return response()->json([
            'error' => 'Яндекс Геокодер не вернул данные. Проверьте, что ключ в YANDEX_GEOCODER_API_KEY активен для HTTP Геокодера и разрешен для этого сервера.',
        ], 502);
    }

    private function extractLocality(array $meta, array $geo): ?string
    {
        $components = $meta['Address']['Components'] ?? [];
        $componentName = fn (string $kind) => $this->componentName($components, $kind);

        $country = $meta['AddressDetails']['Country'] ?? [];
        $adminArea = $country['AdministrativeArea'] ?? [];
        $subArea = $adminArea['SubAdministrativeArea'] ?? [];
        $geoName = $geo['name'] ?? null;
        $localityCandidates = [
            $componentName('locality'),
            $adminArea['Locality']['LocalityName'] ?? null,
            $subArea['Locality']['LocalityName'] ?? null,
            $subArea['DependentLocality']['DependentLocalityName'] ?? null,
            $adminArea['DependentLocality']['DependentLocalityName'] ?? null,
        ];

        $specific = $this->firstNonEmpty([
            ...array_filter($localityCandidates, fn ($name) => !$this->isAdministrativeName($name)),
            $this->specificNameFromAddressText($meta['text'] ?? null),
            !$this->isAdministrativeName($geoName) ? $geoName : null,
        ]);

        if ($specific) {
            return $specific;
        }

        return $this->firstNonEmpty([
            ...$localityCandidates,
            $componentName('province'),
            $componentName('area'),
            $geoName,
        ]);
    }

    private function componentName(array $components, string $kind): ?string
    {
        foreach ($components as $component) {
            if (($component['kind'] ?? null) === $kind && !empty($component['name'])) {
                return $component['name'];
            }
        }

        return null;
    }

    private function firstNonEmpty(array $values): ?string
    {
        foreach ($values as $value) {
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }

        return null;
    }

    private function specificNameFromAddressText(?string $addressText): ?string
    {
        if (!$addressText) {
            return null;
        }

        $parts = array_reverse(array_map('trim', explode(',', $addressText)));
        foreach ($parts as $part) {
            if (
                $part === ''
                || $this->isPostalCodeOrNumber($part)
                || $this->isStreetOrHouseName($part)
                || $this->isAdministrativeName($part)
                || $this->isBroadRegionName($part)
            ) {
                continue;
            }

            return $this->normalizeSettlementName($part);
        }

        return null;
    }

    private function isAdministrativeName(?string $name): bool
    {
        if (!$name) {
            return false;
        }

        return (bool) preg_match('/(округ|район|область|край|республика|муниципал)/ui', $name);
    }

    private function isBroadRegionName(string $name): bool
    {
        return (bool) preg_match('/^(россия|рф|russia)$/ui', trim($name));
    }

    private function isPostalCodeOrNumber(string $name): bool
    {
        return (bool) preg_match('/^\d{3,}(-\d+)?$/u', trim($name));
    }

    private function isStreetOrHouseName(string $name): bool
    {
        return (bool) preg_match('/(^\d+[а-яa-z]?([\/-]\d+[а-яa-z]?)?$|улица|ул\.|проспект|пр-кт|переулок|пер\.|проезд|шоссе|бульвар|набережная|площадь|тупик|аллея|линия|квартал|микрорайон|дом|д\.|строение|стр\.|корпус|к\.|владение|road|street|avenue|lane|drive|highway)/ui', trim($name));
    }

    private function normalizeSettlementName(string $name): string
    {
        return trim(preg_replace('/^(село|деревня|пос[её]лок|пос\.|пгт|город|г\.|хутор|станица)\s+/ui', '', $name) ?? $name);
    }
}
