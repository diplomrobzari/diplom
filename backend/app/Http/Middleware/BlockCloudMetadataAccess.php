<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BlockCloudMetadataAccess
{
    private const BLOCKED_HOSTS = [
        '169.254.169.254',
        '169.254.170.2',
        '100.100.100.200',
        'metadata.google.internal',
        'metadata',
        'instance-data',
    ];

    private const BLOCKED_PATH_PREFIXES = [
        'latest/meta-data',
        'latest/user-data',
        'latest/dynamic',
        'computeMetadata/v1',
        'metadata/instance',
        'openstack/latest/meta_data',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if ($this->hasBlockedHost($request) || $this->hasBlockedMetadataPath($request)) {
            abort(404);
        }

        return $next($request);
    }

    private function hasBlockedHost(Request $request): bool
    {
        foreach (['host', 'x-forwarded-host'] as $header) {
            $host = $this->normalizeHost($request->headers->get($header, ''));
            if ($host !== '' && in_array($host, self::BLOCKED_HOSTS, true)) {
                return true;
            }
        }

        return false;
    }

    private function hasBlockedMetadataPath(Request $request): bool
    {
        $path = trim(strtolower(rawurldecode($request->getPathInfo())), '/');

        foreach (self::BLOCKED_PATH_PREFIXES as $prefix) {
            if ($path === $prefix || str_starts_with($path, $prefix . '/')) {
                return true;
            }
        }

        return false;
    }

    private function normalizeHost(string $host): string
    {
        $host = strtolower(trim(explode(',', $host)[0] ?? ''));

        if (preg_match('/^\[([^\]]+)\](?::\d+)?$/', $host, $matches)) {
            return $matches[1];
        }

        $host = trim($host, " \t\n\r\0\x0B");

        if (str_contains($host, ':') && substr_count($host, ':') === 1) {
            return preg_replace('/:\d+$/', '', $host) ?? $host;
        }

        return $host;
    }
}
