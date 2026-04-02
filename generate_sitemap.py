"""
finq sitemap.xml 자동 생성 스크립트
"""

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_URL = "https://finq.kr"
LASTMOD = "2026-04-02"

# 우선순위 규칙
def get_priority(path):
    if path == "/":
        return "1.0"
    if path.startswith("/simulation/") and path.count("/") == 2:
        return "0.9"
    if path.startswith("/strategy/investor/") and path.count("/") >= 3:
        return "0.8"
    if path.startswith("/strategy/method/") and path.count("/") >= 3:
        return "0.8"
    if path.startswith("/strategy/asset/") and path.count("/") >= 3:
        return "0.8"
    if path.startswith("/insight/") and path.count("/") >= 3:
        return "0.7"
    if path in ["/strategy/", "/simulation/", "/insight/", "/data/"]:
        return "0.7"
    if path in ["/about/", "/privacy/"]:
        return "0.3"
    return "0.6"

# 갱신 주기 규칙
def get_changefreq(path):
    if path == "/":
        return "weekly"
    if path.startswith("/data/"):
        return "daily"
    if path.startswith("/simulation/"):
        return "monthly"
    if path.startswith("/insight/") and path.count("/") >= 3:
        return "monthly"
    return "monthly"

def main():
    paths = []

    for root, dirs, files in os.walk(BASE_DIR):
        # node_modules, .git 등 제외
        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules']]
        for fname in files:
            if fname != "index.html":
                continue
            fpath = os.path.join(root, fname)
            rel = os.path.relpath(fpath, BASE_DIR).replace("\\", "/")
            dir_part = os.path.dirname(rel)
            path = "/" if dir_part == "" else "/" + dir_part.rstrip("/") + "/"
            paths.append(path)

    paths.sort()

    lines = ['<?xml version="1.0" encoding="UTF-8"?>']
    lines.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')

    for path in paths:
        url = BASE_URL + path
        priority = get_priority(path)
        changefreq = get_changefreq(path)
        lines.append(f"""  <url>
    <loc>{url}</loc>
    <lastmod>{LASTMOD}</lastmod>
    <changefreq>{changefreq}</changefreq>
    <priority>{priority}</priority>
  </url>""")

    lines.append('</urlset>')

    output = "\n".join(lines)

    out_path = os.path.join(BASE_DIR, "sitemap.xml")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(output)

    print(f"sitemap.xml 생성 완료: {len(paths)}개 URL")

if __name__ == "__main__":
    main()
