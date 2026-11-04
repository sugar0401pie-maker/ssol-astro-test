# 영문 법적 고지 Word 파일(owner 전달) → 페이지 내용(JSON 블록). 손으로 JSON을 고치지 말고 Word를 고친 뒤 다시 만든다.
# 사용: python3 -I scripts/docx_to_legal_blocks.py <원본.docx> <출력.json> [시작 제목]
# 시작 제목(예: "Privacy Policy")을 주면 그 Heading2부터 다음 Heading2 전까지만 담는다(앞의 문서 메모·탭 안내 제외).
import zipfile,re,html,json,sys
z=zipfile.ZipFile(sys.argv[1]); x=z.read('word/document.xml').decode()
body=x[x.index('<w:body>')+8:x.index('</w:body>')]
def runs(p):
  segs=[]
  for r in re.findall(r'<w:r[ >].*?</w:r>',p,re.S):
    t=''.join(re.findall(r'<w:t[^>]*>(.*?)</w:t>',r,re.S))
    if not t: continue
    t=html.unescape(t); b=bool(re.search(r'<w:b(?:\s*/>|\s+w:val="(?:1|true)"\s*/>)',r))
    if segs and segs[-1]['b']==b: segs[-1]['t']+=t
    else: segs.append({'t':t,'b':b})
  return segs
blocks=[]
pos=0
for m in re.finditer(r'<w:tbl>.*?</w:tbl>|<w:p[ >].*?</w:p>|<w:p/>',body,re.S):
  el=m.group(0)
  if el.startswith('<w:tbl>'):
    rows=[]
    for tr in re.findall(r'<w:tr[ >].*?</w:tr>',el,re.S):
      cells=[]
      for tc in re.findall(r'<w:tc>.*?</w:tc>',tr,re.S):
        cells.append(' '.join(''.join(s['t'] for s in runs(p)) for p in re.findall(r'<w:p[ >].*?</w:p>',tc,re.S)).strip())
      rows.append(cells)
    blocks.append({'type':'table','rows':rows}); continue
  sty=re.search(r'<w:pStyle w:val="([^"]+)"',el); sty=sty.group(1) if sty else ''
  segs=runs(el)
  if not segs or not ''.join(s['t'] for s in segs).strip(): continue
  kind={'Heading1':'h1','Heading2':'h2','Heading3':'h3'}.get(sty,'li' if '<w:numPr>' in el else 'p')
  blocks.append({'type':kind,'segs':segs})
start=sys.argv[3] if len(sys.argv)>3 else None
if start:
  txt=lambda b:''.join(x['t'] for x in b.get('segs',[]))
  i=next(i for i,b in enumerate(blocks) if b['type']=='h2' and txt(b).strip()==start)
  j=next((k for k in range(i+1,len(blocks)) if blocks[k]['type'] in('h1','h2')),len(blocks))
  blocks=blocks[i:j]
  # 첫 문단이 'This tab is…' 같은 문서 안내면 뺀다
  if len(blocks)>1 and txt(blocks[1]).startswith('This tab'): del blocks[1]
for b in blocks:
  if b['type']=='table': b['rows']=[r for r in b['rows'] if any(c.strip() for c in r)]
json.dump(blocks,open(sys.argv[2],'w'),ensure_ascii=False,indent=1)
print(len(blocks), [b['type'] for b in blocks].count('table'))
