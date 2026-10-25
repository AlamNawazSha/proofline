import { NextRequest } from "next/server";
import { proxyApiRequest } from "../proxy";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ path?: string[] }> }
) {
  const params = await props.params;
  const path = (params.path || []).join("/");
  return proxyApiRequest(req, path);
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ path?: string[] }> }
) {
  const params = await props.params;
  const path = (params.path || []).join("/");
  return proxyApiRequest(req, path);
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ path?: string[] }> }
) {
  const params = await props.params;
  const path = (params.path || []).join("/");
  return proxyApiRequest(req, path);
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ path?: string[] }> }
) {
  const params = await props.params;
  const path = (params.path || []).join("/");
  return proxyApiRequest(req, path);
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ path?: string[] }> }
) {
  const params = await props.params;
  const path = (params.path || []).join("/");
  return proxyApiRequest(req, path);
}

export async function HEAD(
  req: NextRequest,
  props: { params: Promise<{ path?: string[] }> }
) {
  const params = await props.params;
  const path = (params.path || []).join("/");
  return proxyApiRequest(req, path);
}
