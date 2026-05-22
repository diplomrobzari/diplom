import { NextRequest, NextResponse } from "next/server";

const BLOCKED_HOSTS = new Set([
  "169.254.169.254",
  "169.254.170.2",
  "100.100.100.200",
  "metadata.google.internal",
  "metadata",
  "instance-data",
]);

const BLOCKED_PATH_PREFIXES = [
  "/latest/meta-data",
  "/latest/user-data",
  "/latest/dynamic",
  "/computeMetadata/v1",
  "/metadata/instance",
  "/openstack/latest/meta_data",
];

const SQLI_PATTERNS = [
  /\bunion\b\s+\bselect\b/i,
  /\bselect\b[\s\S]+\bfrom\b/i,
  /\bfrom\b\s+\bdual\b/i,
  /\butl_inaddr\b/i,
  /\bget_host_name\b/i,
  /\bdbms_pipe\b/i,
  /\bdbms_lock\b/i,
  /\bpg_sleep\b\s*\(/i,
  /\bsleep\b\s*\(/i,
  /\bbenchmark\b\s*\(/i,
  /\bwaitfor\b\s+\bdelay\b/i,
  /\binformation_schema\b/i,
  /\/\*|\*\//i,
];

export function proxy(request: NextRequest) {
  const host = normalizeHost(request.headers.get("host") ?? "");
  const forwardedHost = normalizeHost(request.headers.get("x-forwarded-host") ?? "");
  const pathname = normalizePath(request.nextUrl.pathname);

  if (
    BLOCKED_HOSTS.has(host) ||
    BLOCKED_HOSTS.has(forwardedHost) ||
    BLOCKED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
    hasSqlInjectionPayload(request.nextUrl.searchParams)
  ) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.next();
}

function hasSqlInjectionPayload(searchParams: URLSearchParams): boolean {
  for (const [key, value] of searchParams.entries()) {
    if (matchesSqlInjectionPattern(key) || matchesSqlInjectionPattern(value)) {
      return true;
    }
  }

  return false;
}

function matchesSqlInjectionPattern(value: string): boolean {
  const normalized = normalizePayload(value);
  return SQLI_PATTERNS.some((pattern) => pattern.test(normalized));
}

function normalizePayload(value: string): string {
  let normalized = value.replace(/\+/g, " ");

  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(normalized);
      if (decoded === normalized) {
        break;
      }
      normalized = decoded;
    } catch {
      break;
    }
  }

  return normalized.toLowerCase();
}

function normalizeHost(value: string): string {
  const host = value.split(",")[0]?.trim().toLowerCase() ?? "";

  const bracketMatch = host.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketMatch) {
    return bracketMatch[1];
  }

  if (host.includes(":") && host.indexOf(":") === host.lastIndexOf(":")) {
    return host.replace(/:\d+$/, "");
  }

  return host;
}

function normalizePath(value: string): string {
  try {
    return decodeURIComponent(value).replace(/\/+$/, "").toLowerCase();
  } catch {
    return value.replace(/\/+$/, "").toLowerCase();
  }
}

export const config = {
  matcher: ["/:path*"],
};
