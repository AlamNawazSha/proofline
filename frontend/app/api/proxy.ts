import { NextRequest, NextResponse } from "next/server";

export function getBackendUrl(): string {
  const raw = (process.env.API_INTERNAL_URL || "").trim();
  if (!raw) {
    if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
      return "http://127.0.0.1:8000";
    }
    return "";
  }
  let url = raw.replace(/\/+$/, "");
  if (url.endsWith("/api")) {
    url = url.slice(0, -4).replace(/\/+$/, "");
  }
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

export async function proxyApiRequest(
  req: NextRequest,
  subpath: string
): Promise<NextResponse> {
  const backend = getBackendUrl();
  if (!backend) {
    return NextResponse.json(
      {
        ok: false,
        code: "BACKEND_NOT_CONFIGURED",
        detail:
          "Backend API is not connected. In your Vercel Dashboard, go to Settings > Environment Variables, add API_INTERNAL_URL pointing to your deployed backend (e.g. https://your-backend.onrender.com), and redeploy.",
      },
      { status: 503 }
    );
  }

  const cleanSubpath = subpath.replace(/^\/+/, "");
  const targetUrl = new URL(
    cleanSubpath ? `/api/${cleanSubpath}` : "/api",
    backend
  );
  targetUrl.search = req.nextUrl.search;

  const headers = new Headers();
  req.headers.forEach((val, key) => {
    const k = key.toLowerCase();
    if (
      !["host", "connection", "transfer-encoding", "content-length"].includes(k)
    ) {
      headers.set(key, val);
    }
  });

  const body =
    ["GET", "HEAD"].includes(req.method)
      ? undefined
      : await req.arrayBuffer();

  try {
    const upstreamRes = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });

    const responseHeaders = new Headers();
    upstreamRes.headers.forEach((val, key) => {
      responseHeaders.append(key, val);
    });

    const resBody = await upstreamRes.arrayBuffer();
    return new NextResponse(resBody, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        code: "BACKEND_UNREACHABLE",
        detail: `Cannot reach backend at ${backend}. The server may be waking up or offline. (${err.message})`,
      },
      { status: 502 }
    );
  }
}
