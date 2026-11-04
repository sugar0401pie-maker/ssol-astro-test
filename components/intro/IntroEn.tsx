"use client";

// 영문 첫 화면((나) 영문 전용, owner 2026-11-04). 배경 그림·배치는 한국어 첫 화면과 같고(useIntroSlideshow),
// 글은 패키지 20_영문번역 DATA04 onboarding_copy.1_intro 그대로. 한국어 첫 화면(Intro.tsx)을 고쳐도
// 이 화면은 따라 바뀌지 않는다 — 한국어 첫 화면을 고칠 때마다 영문판에도 필요한지 owner에게 묻는다.
// 참여자 수는 한국어판과 같은 실제 숫자(PARTICIPANTS)를 쓴다.
import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics/track";
import SiteFooterEn from "@/components/SiteFooterEn";
import AuthFooterLink from "@/components/auth/AuthFooterLink";
import { getRealSession } from "@/lib/supabase/browser";
import { PARTICIPANTS, introSrc, useIntroSlideshow } from "./Intro";

export default function IntroEn() {
  const [loggedIn, setLoggedIn] = useState(false);
  const layers = useIntroSlideshow();

  useEffect(() => {
    void getRealSession().then((s) => setLoggedIn(!!s));
    track("intro_view", { from: "en" }, "intro_view");
  }, []);

  return (
    <div lang="en">
      <section className="screen on" id="scr-intro" aria-labelledby="intro-title">
        <div className="intro-bg" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- 2초마다 바뀌는 배경이라 미리 불러 둔 원본을 쓴다 */}
          <img src={introSrc(layers.a)} alt="" fetchPriority="high" className={layers.showA ? "show" : ""} />
          {layers.b !== null && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={introSrc(layers.b)} alt="" className={layers.showA ? "" : "show"} />
          )}
        </div>
        <p className="sr-only">An illustration of zodiac friends gathered under the night sky</p>
        <div className="intro-overlay">
          <div className="logo-row">
            <svg width="38" height="10" viewBox="188 510 878 234" aria-hidden="true">
              <path fill="#FDF6E9" d="M188 673C290 668 362 600 367 510H451C460 610 530 668 615 668C700 668 775 610 784 510H868C873 600 964 668 1066 673V744C960 744 870 705 826 641C780 705 700 744 615 744C530 744 450 705 407 641C365 705 290 744 188 744Z" />
            </svg>
            SSOL WELLNESS HOUSE
          </div>
          <h1 id="intro-title">SSOL Astro House</h1>
          <p className="count">✨ {PARTICIPANTS.toLocaleString("en-US")} people have already taken the test</p>
          <div className="intro-btns">
            <Link href="/en/start" className="btn block">
              Start the test
            </Link>
            <Link href={loggedIn ? "/en/results" : "/en/login?next=/en/results"} className="btn block ghost">
              See my results
            </Link>
          </div>
        </div>
      </section>
      <div className="intro-foot">
        <AuthFooterLink lang="en" />
        <SiteFooterEn />
      </div>
    </div>
  );
}
