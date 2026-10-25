import { NextRequest } from "next/server";
import { proxyApiRequest } from "../proxy";

export async function GET(req: NextRequest) {
  return proxyApiRequest(req, "health");
}

export async function HEAD(req: NextRequest) {
  return proxyApiRequest(req, "health");
}
