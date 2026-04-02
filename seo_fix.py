"""
finq SEO 메타태그 자동 정비 스크립트
- og:title, og:description, og:url, og:type, og:image 누락 시 추가
- canonical 누락 시 추가
- 이미 있는 태그는 건드리지 않음
"""

import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_URL = "https://finq.kr"
OG_IMAGE = "https://finq.kr/og-image.png"

# og:type 판단 규칙
ARTICLE_PATHS = [
    "/insight/",
    "/strategy/investor/",
    "/strategy/method/",
    "/strategy/asset/",
]

def get_og_type(url_path):
    for p in ARTICLE_PATHS:
        # 목록 페이지(depth 1)는 website, 상세 페이지는 article
        if url_path.startswith(p):
            segments = url_path.strip("/").split("/")
            if len(segments) >= 2:
                return "article"
    return "website"

def extract_tag(html, pattern):
    m = re.search(pattern, html, re.IGNORECASE)
    return m.group(1).strip() if m else None

def has_tag(html, tag_pattern):
    return bool(re.search(tag_pattern, html, re.IGNORECASE))

def build_meta_block(url_path, title, description, og_type):
    lines = []

    canonical_url = BASE_URL + url_path
    og_url = canonical_url

    if not title:
        return ""

    desc = description or title

    lines.append(f'<meta property="og:title" content="{title}">')
    lines.append(f'<meta property="og:description" content="{desc}">')
    lines.append(f'<meta property="og:type" content="{og_type}">')
    lines.append(f'<meta property="og:url" content="{og_url}">')
    lines.append(f'<meta property="og:image" content="{OG_IMAGE}">')

    return "\n".join(lines)

def process_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        html = f.read()

    # URL 경로 계산
    rel = os.path.relpath(filepath, BASE_DIR).replace("\\", "/")
    # rel: "index.html" → "/" / "about/index.html" → "/about/"
    dir_part = os.path.dirname(rel)
    if dir_part == "":
        url_path = "/"
    else:
        url_path = "/" + dir_part.rstrip("/") + "/"

    title = extract_tag(html, r'<title>(.*?)</title>')
    description = extract_tag(html, r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']')

    has_og_title = has_tag(html, r'<meta\s+property=["\']og:title["\']')
    has_og_image = has_tag(html, r'<meta\s+property=["\']og:image["\']')
    has_canonical = has_tag(html, r'<link\s+rel=["\']canonical["\']')

    if has_og_title and has_og_image and has_canonical:
        return False  # 이미 완전함

    og_type = get_og_type(url_path)
    canonical_url = BASE_URL + url_path

    insert_lines = []

    # og 블록 통째로 없으면 추가
    if not has_og_title:
        insert_lines.append(build_meta_block(url_path, title, description, og_type))

    # og:image만 없으면 개별 추가
    elif not has_og_image:
        insert_lines.append(f'<meta property="og:image" content="{OG_IMAGE}">')

    # canonical 없으면 추가
    if not has_canonical:
        insert_lines.append(f'<link rel="canonical" href="{canonical_url}">')

    if not insert_lines:
        return False

    insert_block = "\n".join(insert_lines)

    # </head> 바로 앞에 삽입
    new_html = html.replace("</head>", insert_block + "\n</head>", 1)

    if new_html == html:
        return False

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_html)

    return True

def main():
    updated = []
    skipped = []

    for root, dirs, files in os.walk(BASE_DIR):
        # 스크립트 자신이 있는 폴더의 하위 탐색
        for fname in files:
            if fname != "index.html":
                continue
            fpath = os.path.join(root, fname)
            if process_file(fpath):
                rel = os.path.relpath(fpath, BASE_DIR).replace("\\", "/")
                updated.append(rel)
            else:
                rel = os.path.relpath(fpath, BASE_DIR).replace("\\", "/")
                skipped.append(rel)

    print(f"\n[OK] 업데이트: {len(updated)}개")
    for p in sorted(updated):
        print(f"  + {p}")

    print(f"\n[SKIP] 이미 완전함: {len(skipped)}개")
    print("\n완료!")

if __name__ == "__main__":
    main()
