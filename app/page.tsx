// 임시 첫 화면. 실제 인트로는 디저트 테스트와 같은 화면으로 교체한다(마스터스펙 6-1 화면 1).
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-cream">쏠 점성술 하우스</h1>
      <p className="text-sm text-cream/70">별이 주는 질문, 심리학이 주는 답. 준비 중이에요.</p>
      <p className="mt-8 text-xs text-cream/60">
        점성술은 과학적으로 검증된 예측 도구가 아니며, 이 결과는 자기 성찰을 위한 웰니스 콘텐츠입니다.
        중요한 결정은 현실의 정보와 전문가의 도움을 함께 살펴주세요.
      </p>
    </main>
  );
}
