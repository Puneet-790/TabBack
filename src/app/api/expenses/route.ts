import { NextResponse, type NextRequest } from "next/server";
import {
  EXPENSE_PAGE_SIZE,
  fetchExpensesPage,
  parseFilters,
  parseOffset,
} from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const source = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = parseFilters(source);
  const offset = parseOffset(request.nextUrl.searchParams.get("offset"));

  try {
    const page = await fetchExpensesPage(supabase, user.id, filters, offset, EXPENSE_PAGE_SIZE);
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: "could not load expenses" }, { status: 500 });
  }
}