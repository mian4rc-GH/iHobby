import { NextResponse } from "next/server";
import { deleteLocalSession, localSessionCookieName } from "@/lib/server/local-auth";

export async function POST(request: Request) {
  const token = request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${localSessionCookieName}=`))
    ?.slice(localSessionCookieName.length + 1);
  await deleteLocalSession(token);

  const response = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  response.cookies.delete(localSessionCookieName);
  response.cookies.delete("ihw_demo_account");
  response.cookies.delete("ihw_demo_role");
  return response;
}
