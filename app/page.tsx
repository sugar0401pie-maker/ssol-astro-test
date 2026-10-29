import { SEO_TITLE } from "@/lib/seo";
import type { Metadata } from "next";
import Intro from "@/components/intro/Intro";

// 검색 결과에 보이는 첫 화면 제목(lib/seo.ts)
export const metadata: Metadata = { title: SEO_TITLE };

export default function Home() {
  return <Intro />;
}
