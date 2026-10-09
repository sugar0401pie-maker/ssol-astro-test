import type { Metadata } from "next";
import Intro from "@/components/intro/Intro";

export const metadata: Metadata = { title: "쏠 점성술 하우스" };

export default function Home() {
  return <Intro />;
}
