export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();

  // The old helper bundled the auth check into requireUser(); with the single
  // Supabase helper this repo now keeps, check it here so an unauthenticated
  // caller gets 401 rather than a confusing updateUser() failure.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { password } = await req.json().catch(() => ({ password: undefined }));
  if (!password || String(password).length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const { error } = await supabase.auth.updateUser({ password: String(password) });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
