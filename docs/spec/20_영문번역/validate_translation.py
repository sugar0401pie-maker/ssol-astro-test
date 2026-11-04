"""Usage: python3 -I validate.py chunks/chunk_XX.json out/chunk_XX.json
Checks every row has output, tokens/code preserved, edge whitespace kept, no ** added."""
import json, re, sys

src = json.load(open(sys.argv[1]))
out = json.load(open(sys.argv[2]))
TOK = re.compile(r"\{\{[^{}]+\}\}|\{[^{}]+\}|\$\{[^}]*\}")
TAG = re.compile(r"<[^>]+>")
CODE = re.compile(r"esc\(|\+|\\|`")
problems = []
for it in src:
    k = it["key"]
    if k not in out:
        problems.append((k, "missing")); continue
    o = out[k]
    if not isinstance(o, dict) or "en" not in o:
        problems.append((k, "bad format")); continue
    new, old = o["en"], it["en"]
    if sorted(TOK.findall(new)) != sorted(TOK.findall(old)):
        problems.append((k, f"tokens differ: {TOK.findall(old)} -> {TOK.findall(new)}"))
    # HTML tags: compare tag skeleton without attribute text that may contain words (aria-label etc.)
    def skel(s): return [re.sub(r'"[^"]*"', '""', t) for t in TAG.findall(s)]
    if skel(new) != skel(old):
        problems.append((k, "html tags differ"))
    for ch in ["esc(", "+", "${", "\\", "`", "|"]:
        if old.count(ch) != new.count(ch) and ch != "+":
            problems.append((k, f"code char count differs: {ch!r}"))
    if "+" in old and "esc(" in old and old.count("+") != new.count("+"):
        problems.append((k, "'+' count differs in code row"))
    if old[:1].isspace() != new[:1].isspace() or old[-1:].isspace() != new[-1:].isspace():
        problems.append((k, "edge whitespace differs"))
    if "**" in new and "**" not in old:
        problems.append((k, "added **"))
    if not new.strip():
        problems.append((k, "empty"))
extra = set(out) - {i["key"] for i in src}
if extra:
    problems.append(("-", f"extra keys: {list(extra)[:5]}"))
changed = sum(1 for k in out if out[k].get("status") == "changed")
print(f"rows {len(src)} | out {len(out)} | changed {changed} | problems {len(problems)}")
for p in problems[:60]:
    print("  ", p)
