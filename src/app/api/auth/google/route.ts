export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${appUrl}/api/auth/callback` },
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`);
  }

  return NextResponse.redirect(data.url);
}
