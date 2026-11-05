import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // IndexNow 키 파일(/<32자 키>.txt) — 키는 환경변수 INDEXNOW_KEY라 파일을 두지 않고 라우트가 돌려준다(lib/indexnow.ts).
    // 32자 16진수 이름만 잡으므로 robots.txt·llms.txt 같은 다른 .txt와 겹치지 않는다.
    return [{ source: "/:key([0-9a-f]{32}).txt", destination: "/api/indexnow-key/:key" }];
  },
};

export default nextConfig;
