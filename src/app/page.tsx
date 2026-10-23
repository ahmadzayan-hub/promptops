import type { Metadata } from "next";
import PromptComposer from "@/components/PromptComposer";
export const metadata: Metadata = { title: "Your thought, a clearer prompt" };
export default function HomePage() { return <PromptComposer />; }
