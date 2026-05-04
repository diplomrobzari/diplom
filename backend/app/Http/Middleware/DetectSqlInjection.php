<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DetectSqlInjection
{
    /**
     * Lightweight SQLi pattern detector for request input.
     * It is not a replacement for parameterized queries, but adds a defense layer.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $payload = array_merge($request->query(), $request->request->all());
        if ($this->containsSqlInjectionPattern($payload)) {
            return response()->json([
                'message' => 'Запрос отклонен системой безопасности.',
            ], 400);
        }

        return $next($request);
    }

    private function containsSqlInjectionPattern(mixed $value): bool
    {
        if (is_array($value)) {
            foreach ($value as $item) {
                if ($this->containsSqlInjectionPattern($item)) {
                    return true;
                }
            }

            return false;
        }

        if (!is_string($value)) {
            return false;
        }

        $normalized = mb_strtolower(trim($value), 'UTF-8');
        if ($normalized === '') {
            return false;
        }

        $patterns = [
            '/\bunion\b\s+\bselect\b/i',
            '/\bselect\b.+\bfrom\b/i',
            '/\binsert\b\s+\binto\b/i',
            '/\bupdate\b.+\bset\b/i',
            '/\bdelete\b\s+\bfrom\b/i',
            '/\bdrop\b\s+\btable\b/i',
            '/\bor\b\s+1\s*=\s*1/i',
            '/\'\s*or\s*\'1\'\s*=\s*\'1/i',
            '/--\s*$/i',
            '/\/\*.*\*\//i',
            '/;\s*(select|insert|update|delete|drop)\b/i',
            '/\b(sleep|benchmark)\s*\(/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $normalized) === 1) {
                return true;
            }
        }

        return false;
    }
}
