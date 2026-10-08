"use client";

// 테스트 화면은 브라우저에서만 그린다: 카카오·네이버 로그인에서 돌아왔을 때 sessionStorage의 진행 상태로
// 첫 화면을 정하는데, 서버에서 미리 그리면 그 상태를 알 수 없어 화면이 어긋나기 때문.
import dynamic from "next/dynamic";

const TestFlow = dynamic(() => import("@/components/test/TestFlow"), { ssr: false });

export default function TestClient() {
  return <TestFlow />;
}
