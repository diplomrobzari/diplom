<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SanitizeInput
{
    public function handle(Request $request, Closure $next): Response
    {
        $sanitized = $this->sanitizeValue($request->all());
        $request->merge($sanitized);

        return $next($request);
    }

    private function sanitizeValue(mixed $value): mixed
    {
        if (is_array($value)) {
            foreach ($value as $key => $item) {
                $value[$key] = $this->sanitizeValue($item);
            }

            return $value;
        }

        if (is_string($value)) {
            $value = trim($value);
            // Basic stored-XSS mitigation for user text fields.
            $value = strip_tags($value);
            // Remove obvious javascript URI vectors if they were entered as plain text.
            $value = preg_replace('/javascript\s*:/i', '', $value) ?? $value;
            $value = preg_replace('/data\s*:\s*text\/html/i', '', $value) ?? $value;
            return $value;
        }

        return $value;
    }
}
