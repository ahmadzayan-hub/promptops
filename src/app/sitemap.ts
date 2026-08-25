import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://promptops-kappa.vercel.app";

/**
 * Only routes that exist.
 *
 * This previously advertised nine marketing pages (/features, /pricing,
 * /how-it-works, /for-students, /faq, /contact, /privacy, /terms) that
 * belonged to the app grafted into this repo. None of them are here, so the
 * sitemap was handing search engines a list of 404s.
 *
 * The authenticated screens — /studio, /templates, /history — are omitted on
 * purpose: they are behind sign-in and have nothing to index.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`,       lastModified: now, priority: 1,   changeFrequency: "weekly" },
    { url: `${BASE}/login`,  lastModified: now, priority: 0.5, changeFrequency: "yearly" },
    { url: `${BASE}/signup`, lastModified: now, priority: 0.6, changeFrequency: "yearly" }
  ];
}
