// Edge gatekeeper: basic auth on the dashboard and its API.
// The public landing page (/) is untouched.
// Env: DASH_USER (default "andreu"), DASH_PASS (required — no pass, no entry).
export const config = {
  matcher: ["/dashboard", "/dashboard.html", "/api/:path*"],
};

export default function middleware(req) {
  const pass = process.env.DASH_PASS || "";
  if (!pass) {
    return new Response("Dashboard locked: set DASH_PASS in Vercel env vars.",
                        { status: 503 });
  }
  const user = process.env.DASH_USER || "andreu";
  const expected = "Basic " + btoa(`${user}:${pass}`);
  const got = req.headers.get("authorization") || "";
  if (got === expected) {
    return; // authenticated — continue to the page/function
  }
  return new Response("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="NanoRevenue Ops"' },
  });
}
