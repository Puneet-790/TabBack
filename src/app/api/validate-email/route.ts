import { NextResponse, type NextRequest } from "next/server";
import { validateEmailForSignup } from "@/lib/email-policy";

export async function POST(request: NextRequest) {
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ allowed: false, error: "Enter a valid email address." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email : "";
  const result = validateEmailForSignup(email);
  if (result.ok) {
    return NextResponse.json({ allowed: true });
  }
  return NextResponse.json({ allowed: false, error: result.error });
}