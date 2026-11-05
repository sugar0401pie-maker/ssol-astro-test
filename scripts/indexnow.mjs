#!/usr/bin/env node
// IndexNow 제출(owner 2026-11-05) — 운영 배포 빌드가 끝난 뒤(npm postbuild) 한 번 실행된다.
// - VERCEL_ENV가 production이 아니거나 INDEXNOW_KEY가 없으면 아무것도 하지 않는다(프리뷰·로컬 빌드는 건너뜀).
// - 사이트맵(이번 빌드 결과 .next/server/app/sitemap.xml.body, 없으면 운영 주소의 sitemap.xml)에서
//   lastmod가 오늘(한국 날짜)인 주소만 보낸다. 오늘 바뀐 페이지가 없으면 보내지 않는다(같은 주소를 반복해 보내지 않게).
// - 성공(200·202)이든 실패든 종료 코드는 늘 0 — 배포를 실패시키지 않는다. 재시도는 하지 않는다(한 번만 요청).
// 수동 실행: VERCEL_ENV=production INDEXNOW_KEY=<키> node scripts/indexnow.mjs [--all] [--dry-run]
//   --all: lastmod와 상관없이 사이트맵 전체, --dry-run: 보낼 목록만 출력
import { readFileSync, existsSync } from "node:fs";

const SITE_URL = (process.env.SITE_URL || "https://astro.ssolwellnesshouse.com").replace(/\/$/, "");
const KEY = (process.env.INDEXNOW_KEY || "").trim();
const args = new Set(process.argv.slice(2));
// 로그인·결제·결과 등 공개하지 않는 주소(lib/seo.ts DISALLOW_PATHS와 같은 앞부분) — 사이트맵에 없지만 한 번 더 거른다
const BLOCKED = ["/api/", "/results", "/checkout", "/login", "/share/", "/test/"];

function log(msg) {
  console.log(`[indexnow] ${msg}`);
}

async function main() {
  if (process.env.VERCEL_ENV !== "production") return log("운영 배포가 아니라 건너뜀");
  if (!/^[0-9a-f]{32}$/.test(KEY)) return log("INDEXNOW_KEY가 없거나 형식이 달라 건너뜀");

  let xml = "";
  const built = ".next/server/app/sitemap.xml.body";
  if (existsSync(built)) xml = readFileSync(built, "utf8");
  else {
    const r = await fetch(`${SITE_URL}/sitemap.xml`);
    xml = r.ok ? await r.text() : "";
  }
  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    loc: (m[1].match(/<loc>(.*?)<\/loc>/) || [])[1],
    lastmod: (m[1].match(/<lastmod>(.*?)<\/lastmod>/) || [])[1] || "",
  }));
  const host = new URL(SITE_URL).host;
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); // 한국 날짜
  const urls = entries
    .filter((e) => e.loc && new URL(e.loc).host === host && !BLOCKED.some((b) => new URL(e.loc).pathname.startsWith(b)))
    .filter((e) => args.has("--all") || e.lastmod.slice(0, 10) === today)
    .map((e) => e.loc)
    .slice(0, 10000);

  if (urls.length === 0) return log(`오늘(${today}) 바뀐 페이지가 없어 보내지 않음 (사이트맵 ${entries.length}개)`);
  log(`보낼 주소 ${urls.length}개:\n  ${urls.join("\n  ")}`);
  if (args.has("--dry-run")) return;

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key: KEY, keyLocation: `https://${host}/${KEY}.txt`, urlList: urls }),
  });
  if (res.status === 200 || res.status === 202) log(`성공 (${res.status})`);
  else log(`실패 (${res.status}) ${(await res.text()).slice(0, 300)}`);
}

main().catch((e) => log(`오류: ${e?.message || e}`)).finally(() => process.exit(0));
