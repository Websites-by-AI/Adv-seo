import { NextRequest, NextResponse } from "next/server";

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Adv SEO", charset="UTF-8"' },
  });
}

export function proxy(request: NextRequest) {
  const expectedUser = process.env.APP_BASIC_USER;
  const expectedPassword = process.env.APP_BASIC_PASSWORD;
  if (!expectedUser || !expectedPassword) return NextResponse.next();

  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Basic ")) return unauthorized();

  try {
    const decoded = atob(authorization.slice(6));
    const separator = decoded.indexOf(":");
    const user = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    if (separator < 0 || user !== expectedUser || password !== expectedPassword) {
      return unauthorized();
    }
    return NextResponse.next();
  } catch {
    return unauthorized();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
