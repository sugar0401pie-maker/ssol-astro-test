import type { Metadata } from "next";
import Intro from "@/components/intro/Intro";

export const metadata: Metadata = { title: "쏠 아스트로 하우스" };

export default function Home() {
  return <Intro />;
}
