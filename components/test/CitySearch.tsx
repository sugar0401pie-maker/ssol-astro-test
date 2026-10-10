"use client";

// 해외 출생지 자동완성(프로토타입 .city-wrap 그대로: '도시 검색' 라벨, 크림색 목록, ↑↓·Enter, "선택: 도쿄 (Tokyo) · UTC+9").
// 검색은 우리 서버(/api/cities)에서만 한다 — 외부 지도 API로 입력이 나가지 않는다.
import { useEffect, useRef, useState } from "react";
import { CITY_ATTRIBUTION } from "@/lib/astro/cities";
import { b14, useCopy } from "@/lib/copy/useCopy";

export interface PickedCity {
  id: number;
  label: string;
  name?: string;
  en?: string;
  utc?: string;
}
interface Row extends PickedCity {
  name: string;
  country: string;
  en: string;
  utc: string;
}

export default function CitySearch({ value, onChange, autoFocus }: { value: PickedCity | null; onChange: (c: PickedCity | null) => void; autoFocus?: boolean }) {
  const [query, setQuery] = useState(value?.label ?? "");
  const [results, setResults] = useState<Row[]>([]);
  const [searched, setSearched] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const copy = useCopy();

  // '한국이 아니에요'를 누르면 검색칸으로(프로토타입)
  useEffect(() => {
    if (autoFocus) setTimeout(() => input.current?.focus(), 30);
  }, [autoFocus]);

  useEffect(() => {
    const q = query.trim();
    if (!q || value) return;
    const ctrl = new AbortController();
    // 타이핑이 멈춘 뒤 한 번만 부른다.
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cities?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        setResults(data.results ?? []);
        setActive((data.results ?? []).length ? 0 : -1);
        setSearched(true);
      } catch {
        /* 취소되었거나 네트워크 오류 — 결과를 바꾸지 않는다 */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, value]);

  function pick(c: Row) {
    onChange({ id: c.id, label: c.label, name: c.name, en: c.en, utc: c.utc });
    setQuery(c.label);
    setResults([]);
    setSearched(false);
  }

  const open = !value && query.trim() !== "";
  return (
    <div className="city-wrap">
      <label className="lbl" htmlFor="city-search">
        도시 검색
      </label>
      <input
        ref={input}
        id="city-search"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && results.length > 0}
        aria-controls="city-list"
        aria-activedescendant={open && active >= 0 && results[active] ? `city-opt-${results[active].id}` : undefined}
        placeholder="예: 뉴욕, 도쿄, London"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (value) onChange(null);
          if (!e.target.value.trim()) {
            setResults([]);
            setSearched(false);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault(); // Enter로 폼이 넘어가지 않게
          if (e.nativeEvent.isComposing || !results.length || value) return; // 한글 조합 중 Enter는 고르지 않는다
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length);
          } else if (e.key === "Enter") pick(results[Math.max(0, active)]);
        }}
      />
      {open && (results.length > 0 || searched) && (
        <ul className="city-list" id="city-list" role="listbox" aria-label="도시 목록">
          {results.length > 0 ? (
            results.map((c, i) => (
              <li key={c.id} id={`city-opt-${c.id}`} role="option" aria-selected={i === active} onClick={() => pick(c)}>
                {c.name}, {c.country} <small>({c.en})</small>
              </li>
            ))
          ) : (
            <li>{b14(copy, "ERR_CITY_NONE", "alt", "목록에 없어요. 가장 가까운 큰 도시를 골라 주세요.")}</li>
          )}
        </ul>
      )}
      <p className="city-picked" aria-live="polite">
        {value ? `선택: ${value.name ?? value.label}${value.en ? ` (${value.en})` : ""}${value.utc ? ` · ${value.utc}` : ""}` : ""}
      </p>
      <p className="hint">목록에 없으면 가장 가까운 큰 도시를 골라 주세요. {CITY_ATTRIBUTION}</p>
    </div>
  );
}
