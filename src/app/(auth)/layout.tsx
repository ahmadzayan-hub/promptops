import Link from "next/link";
import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";
import { FadeUp, PageEnter } from "@/components/motion/Motion";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-teal-900 flex flex-col">
      {/* Header */}
      <div className="p-6">
        <FadeUp>
          <Link href="/" className="inline-flex items-center gap-2.5 text-white font-bold text-lg">
            <GraduationCap size={24} />
            PromptOps <span className="text-white/50 font-normal text-sm">· استوديو زيان</span>
          </Link>
        </FadeUp>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <PageEnter className="w-full max-w-md">
          {children}
        </PageEnter>
      </div>

      {/* Footer */}
      <div className="p-6 text-center text-xs text-white/40">
        © {new Date().getFullYear()} PromptOps · ZAIan Studio. Operated from UAE.
        {" · "}
        <Link href="/privacy" className="hover:text-white/70 transition">Privacy</Link>
        {" · "}
        <Link href="/terms" className="hover:text-white/70 transition">Terms</Link>
      </div>
    </div>
  );
}
