import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import Header from "@/components/Header";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://promptops-kappa.vercel.app";
const TITLE = "PromptOps · ZAIan Studio · Ship prompts, not guesses | استوديو زيان";
const DESCRIPTION =
  "PromptOps turns a rough idea into a production prompt: it detects intent, asks only the questions your prompt is missing, then formats the result for ChatGPT, Claude, Copilot or Gemini. Versioned, reusable, and available in your browser. | بروبت أوبس يحوّل فكرة خام إلى موجّه جاهز: يحدد النية، ويسأل فقط عمّا ينقص، ثم ينسّق النتيجة لكل نموذج."

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: TITLE, template: "%s · PromptOps" },
  description: DESCRIPTION,
  applicationName: "PromptOps",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "PromptOps", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
  authors: [{ name: "PromptOps", url: APP_URL }],
  keywords: [
    "PromptOps", "ZAIan Studio", "prompt engineering", "prompt templates",
    "prompt versioning", "ChatGPT prompts", "Claude prompts", "Copilot prompts",
    "Gemini prompts", "AI prompt builder", "bilingual prompt tool",
    "هندسة الموجهات", "استوديو زيان", "موجهات الذكاء الاصطناعي"
  ],

  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: APP_URL,
    siteName: "PromptOps",
    locale: "en_US",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "PromptOps · Ship prompts, not guesses" }]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"]
  },
  robots: { index: true, follow: true },
  alternates: { canonical: APP_URL },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Tajawal:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
        {/* Prevent flash of wrong theme + locale direction */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='mk_theme',v=localStorage.getItem(k);var d=v==='dark'||((v===null||v==='system')&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark');var lk='po_locale',lv=(document.cookie.split('; ').find(function(p){return p.indexOf(lk+'=')===0;})||'').split('=')[1]||localStorage.getItem(lk);if(lv==='ar'){document.documentElement.setAttribute('dir','rtl');document.documentElement.setAttribute('lang','ar');}}catch(e){}})();`
          }}
        />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-xl focus:shadow-lg focus:text-brand-700 focus:font-medium"
        >
          Skip to content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "PromptOps",
              alternateName: ["ZAIan Studio", "استوديو زيان"],
              description: DESCRIPTION,
              url: APP_URL,
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Any",
              countryOfOrigin: { "@type": "Country", name: "United Arab Emirates" },
              inLanguage: ["en", "ar"],
              audience: { "@type": "Audience", audienceType: "Builders shipping AI features" }
            })
          }}
        />
        <I18nProvider>
          <Header />
          {children}
        </I18nProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));}`
          }}
        />
      </body>
    </html>
  );
}
