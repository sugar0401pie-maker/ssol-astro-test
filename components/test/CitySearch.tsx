"use client";

// 해외 출생지 자동완성. 검색은 우리 서버(/api/cities)에서만 한다 — 외부 지도 API로 입력이 나가지 않는다.
import { useEffect, useState } from "react";
import { CITY_ATTRIBUTION } from "@/lib/astro/cities";

export interface PickedCity {
  id: number;
  label: string;
}

export default function CitySearch({ value, onChange }: { value: PickedCity | null; onChange: (c: PickedCity | null) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedCity[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const ctrl = new AbortController();
    // 타이핑이 멈춘 뒤 한 번만 부른다.
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cities?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        setResults(data.results ?? []);
        setSearched(true);
      } catch {
        /* 취소되었거나 네트워크 오류 — 결과를 바꾸지 않는다 */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-cream px-3 py-3 text-base text-navy">
        <span>{value.label}</span>
        <button className="text-sm underline" onClick={() => onChange(null)}>
          다시 고르기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        className="w-full rounded-xl bg-cream px-3 py-3 text-base text-navy"
        placeholder="도시 이름 (예: 로스앤젤레스, Tokyo)"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!e.target.value.trim()) {
            setResults([]);
            setSearched(false);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault(); // 조합 중이든 아니든 Enter로 폼이 넘어가지 않게
        }}
        aria-label="태어난 도시 검색"
      />
      {query.trim() && results.length > 0 && (
        <ul className="flex flex-col overflow-hidden rounded-xl border border-cream/30">
          {results.map((c) => (
            <li key={c.id}>
              <button className="w-full px-3 py-2 text-left text-sm text-cream hover:bg-cream/10" onClick={() => onChange(c)}>
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && searched && results.length === 0 && (
        <p className="text-sm text-cream/80">목록에 없는 작은 도시라면, 가장 가까운 큰 도시를 골라주세요.</p>
      )}
      <p className="text-[11px] text-cream/50">{CITY_ATTRIBUTION}</p>
    </div>
  );
}
