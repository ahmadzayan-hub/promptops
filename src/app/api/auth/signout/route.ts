export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://promptops-kappa.vercel.app";
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", appUrl));
}
