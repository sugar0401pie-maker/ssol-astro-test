# 영문 정책 Markdown(owner 전달 ssol-astro-en-policies) → 페이지 내용 JSON(lib/legal/en/<slug>.json).
# 손으로 JSON을 고치지 말고 Markdown을 고친 뒤 다시 만든다. 문장은 바꾸지 않는다(굵게 **…**만 굵은 글자로).
# 사용: python3 -I scripts/md_to_legal_blocks.py <정책.md> <출력.json>
import json, re, sys
def segs(t):
    out = []
    for i, part in enumerate(re.split(r"\*\*", t)):
        if part: out.append({"t": part, "b": i % 2 == 1})
    return out or [{"t": t, "b": False}]
lines = open(sys.argv[1], encoding="utf-8").read().splitlines()
blocks, para, table = [], [], None
def flush():
    global para, table
    if para: blocks.append({"type": "p", "segs": segs(" ".join(para))}); para = []
    if table is not None:
        rows = [r for r in table if not all(re.fullmatch(r"\s*:?-{3,}:?\s*", c) for c in r)]
        # 머리 줄이 비어 있으면 '항목: 값' 표(kv), 아니면 첫 줄이 머리
        kv = not any(c.strip() for c in rows[0])
        rows = [r for r in rows if any(c.strip() for c in r)]
        blocks.append({"type": "table", "kv": kv, "rows": rows}); table = None
for ln in lines:
    s = ln.rstrip()
    if s.startswith("|"):
        if para: flush()
        cells = [c.strip().replace("**", "") for c in s.strip().strip("|").split("|")]
        table = (table or []) + [cells]; continue
    if table is not None: flush()
    if not s.strip(): flush(); continue
    m = re.match(r"^(#{1,3})\s+(.*)", s)
    if m:
        flush(); blocks.append({"type": "h2" if len(m.group(1)) == 1 else "h3", "segs": segs(m.group(2))}); continue
    m = re.match(r"^\s*[-*]\s+(.*)", s)
    if m: flush(); blocks.append({"type": "li", "segs": segs(m.group(1))}); continue
    m = re.match(r"^\s*\d+\.\s+(.*)", s)
    if m: flush(); blocks.append({"type": "oli", "segs": segs(m.group(1))}); continue
    para.append(s.strip())
flush()
json.dump(blocks, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(sys.argv[2], len(blocks))
