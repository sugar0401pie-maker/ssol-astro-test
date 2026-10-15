"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution/client";

/** 사이트에 들어온 첫 화면에서 유입 경로를 한 번 기록한다(화면에는 아무것도 그리지 않음). */
export default function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
