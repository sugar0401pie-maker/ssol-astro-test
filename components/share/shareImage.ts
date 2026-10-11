// 공유 이미지(owner 2026-10-11): 내 태양 별자리 그림 하나 + 별자리 이름·소개. 예전 단순판 휠 이미지는 이것으로 바꿨다.
// 한글 글자는 캔버스에 페이지와 같은 Noto Sans KR로 직접 쓴다(owner 요청 2026-10-08). 출생 정보·닉네임은 넣지 않는다.
import { SIGN_SHARE_H, SIGN_SHARE_W, type SignShareText } from "@/lib/share/signShare";

/** 페이지가 쓰는 글꼴(next/font가 만든 Noto Sans KR 이름 + 대체 글꼴). */
function pageFontFamily(): string {
  return getComputedStyle(document.body).fontFamily || "'Noto Sans KR', sans-serif";
}

/**
 * 별자리 공유 이미지(owner 2026-10-11): 그 별자리 그림(1080×1080)을 위에, 아래에 별자리 이름·소개 글자.
 * 그림은 같은 사이트 파일이라 캔버스가 오염되지 않는다(toBlob 가능). 실패하면 null.
 */
export async function composeSignShare(artUrl: string, texts: SignShareText[]): Promise<Blob | null> {
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("그림 불러오기 실패"));
      img.src = artUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = SIGN_SHARE_W;
    canvas.height = SIGN_SHARE_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#0B1E3F";
    ctx.fillRect(0, 0, SIGN_SHARE_W, SIGN_SHARE_H);
    ctx.drawImage(img, 0, 0, SIGN_SHARE_W, SIGN_SHARE_W);
    const family = pageFontFamily();
    await Promise.all(texts.map((t) => document.fonts?.load(`${t.weight} ${t.size}px ${family}`, t.text).catch(() => [])));
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    for (const t of texts) {
      ctx.font = `${t.weight} ${t.size}px ${family}`;
      ctx.fillStyle = t.color;
      ctx.globalAlpha = t.alpha ?? 1;
      ctx.fillText(t.text, SIGN_SHARE_W / 2, t.y);
    }
    ctx.globalAlpha = 1;
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  } catch {
    return null;
  }
}
