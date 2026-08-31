import json, sys
raw = open(sys.argv[1], 'r', errors='replace').read()
start = raw.find('{')
if start < 0:
    sys.exit(0)
try:
    d = json.loads(raw[start:])
except Exception:
    sys.exit(0)
rs = d.get('results') or []
for r in rs:
    try:
        w = int(str(r.get('original_width', '0')).replace('px', '') or 0)
        h = int(str(r.get('original_height', '0')).replace('px', '') or 0)
    except Exception:
        w = h = 0
    if w >= 500 and w >= h:
        print(r['original_url'])
        sys.exit(0)
if rs:
    print(rs[0]['original_url'])
