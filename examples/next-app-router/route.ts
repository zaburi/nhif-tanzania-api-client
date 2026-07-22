import { NextResponse } from "next/server";
import { createNhifClientFromEnv, type NhifIdentifierType } from "nhif-tanzania-api-client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const identifier = searchParams.get("identifier") || "";
  const identifierType = (searchParams.get("identifierType") || "NationalID") as NhifIdentifierType;

  if (!identifier) {
    return NextResponse.json({ ok: false, error: "identifier is required" }, { status: 400 });
  }

  const nhif = createNhifClientFromEnv(process.env);
  const result = await nhif.authorizeMember(identifier, { identifierType });

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
