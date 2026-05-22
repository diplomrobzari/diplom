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

export function proxy(request: NextRequest) {
  const host = normalizeHost(request.headers.get("host") ?? "");
  const forwardedHost = normalizeHost(request.headers.get("x-forwarded-host") ?? "");
  const pathname = normalizePath(request.nextUrl.pathname);

  if (
    BLOCKED_HOSTS.has(host) ||
    BLOCKED_HOSTS.has(forwardedHost) ||
    BLOCKED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  ) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.next();
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
