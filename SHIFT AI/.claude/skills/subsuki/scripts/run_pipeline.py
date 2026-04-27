# -*- coding: utf-8 -*-
"""
run_pipeline.py — サブスキちゃん一気通貫パイプライン

Step 0 : カレントディレクトリを対象プロジェクトとみなし、必要ファイルの存在を確認
Step 1 : テキスト変換（slide-design / script / thumbnail-prompt）
Step 2 : JSON 再生成（slide-generator の parse_excel.py を流用）
Step 3 : 図解PNG 再生成（本スキルの generate_diagrams_teen.js）
Step 4 : サムネ 再生成（thumbnail-designer の generate_thumbnails.py を流用）
Step 5 : PPTX / PDF 再ビルド（slide-generator の build_slides.js を流用）
Step 6 : 完了レポート（サマリー + Before/After テーブル + 成果物パス）

Usage:
  cd SHIFT AI/<講座ID>
  python ../.claude/skills/subsuki/scripts/run_pipeline.py --env <.envパス>
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

# ── パス定数 ────────────────────────────────────────────
SKILL_DIR = Path(__file__).resolve().parent.parent
SKILLS_ROOT = SKILL_DIR.parent  # .claude/skills/
SG_SCRIPTS = SKILLS_ROOT / "slide-generator-main" / "scripts"
TD_SCRIPTS = SKILLS_ROOT / "thumbnail-designer-main" / "scripts"

PARSE_EXCEL = SG_SCRIPTS / "parse_excel.py"
BUILD_SLIDES = SG_SCRIPTS / "build_slides.js"
GEN_DIAGRAMS_TEEN = SKILL_DIR / "scripts" / "generate_diagrams_teen.js"
GEN_THUMBNAILS = TD_SCRIPTS / "generate_thumbnails.py"
TRANSFORM_TEXT = SKILL_DIR / "scripts" / "transform_text.py"


# ── ヘルパ ──────────────────────────────────────────────
def run(cmd, cwd=None, env=None, check=True):
    print(f"\n$ {' '.join(str(c) for c in cmd)}")
    result = subprocess.run(cmd, cwd=cwd, env=env, text=True, encoding="utf-8")
    if check and result.returncode != 0:
        sys.exit(result.returncode)
    return result


def npm_root_global():
    """NODE_PATH のためのグローバル npm ルートを取得"""
    try:
        r = subprocess.run(["npm", "root", "-g"], capture_output=True, text=True, encoding="utf-8", shell=True)
        return r.stdout.strip()
    except Exception:
        return ""


# ── ステップ ────────────────────────────────────────────
def step0_check_project(project_dir: Path):
    print("\n[Step 0] プロジェクト存在確認")
    required = {
        "slide-design.xlsx": project_dir / "slide-design.xlsx",
        "script.xlsx": project_dir / "script.xlsx",
        "output/slides.json": project_dir / "output" / "slides.json",
        "output/diagrams/": project_dir / "output" / "diagrams",
        "output/thumbnail/": project_dir / "output" / "thumbnail",
    }
    missing = [k for k, v in required.items() if not v.exists()]
    if missing:
        print(f"  [ERROR] 以下が見つからない: {missing}")
        print("  → このコマンドは create-course / slide-generator / thumbnail-designer 完了後に実行してください")
        sys.exit(2)
    # 講座ID推定
    project_id = project_dir.name
    print(f"  [OK] 講座ID: {project_id}")
    return project_id


def step1_transform_text(project_dir: Path, out_dir: Path):
    print("\n[Step 1] テキスト変換（Body + 台本 + サムネプロンプト）")
    slide_design = project_dir / "slide-design.xlsx"
    script = project_dir / "script.xlsx"
    thumb_prompt = project_dir / "thumbnail-prompt.txt"
    cmd = [
        sys.executable, str(TRANSFORM_TEXT),
        "--slide-design", str(slide_design),
        "--script", str(script),
        "--output-dir", str(out_dir),
    ]
    if thumb_prompt.exists():
        cmd += ["--thumbnail-prompt", str(thumb_prompt)]
    env = os.environ.copy()
    env["PYTHONUTF8"] = "1"
    run(cmd, env=env)


def step2_parse_excel(out_dir: Path):
    print("\n[Step 2] JSON 再生成")
    src = out_dir / "slide-design.xlsx"
    dst = out_dir / "slides.json"
    env = os.environ.copy()
    env["PYTHONUTF8"] = "1"
    run([sys.executable, str(PARSE_EXCEL), str(src), str(dst)], env=env)


def step3_diagrams(out_dir: Path, env_path: str):
    print("\n[Step 3] 図解PNG 再生成（学校生活テイスト）")
    (out_dir / "diagrams").mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    np_root = npm_root_global()
    if np_root:
        env["NODE_PATH"] = np_root
    cmd = [
        "node", str(GEN_DIAGRAMS_TEEN),
        str(out_dir / "slides.json"),
        str(out_dir / "diagrams") + "/",
        "--env", env_path,
    ]
    run(cmd, env=env)


def step4_thumbnails(out_dir: Path, env_path: str):
    print("\n[Step 4] サムネ 再生成（学校生活テイスト）")
    thumb_prompt = out_dir / "thumbnail-prompt-teen.txt"
    if not thumb_prompt.exists():
        print("  [SKIP] thumbnail-prompt-teen.txt が存在しない。元プロジェクトに thumbnail-prompt.txt がなかった可能性")
        return
    thumb_out = out_dir / "thumbnail"
    thumb_out.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    env["PYTHONUTF8"] = "1"
    cmd = [
        sys.executable, str(GEN_THUMBNAILS),
        "--prompt", str(thumb_prompt),
        "--output", str(thumb_out),
        "--env", env_path,
    ]
    run(cmd, env=env)


def step5_build_slides(out_dir: Path, project_id: str):
    print("\n[Step 5] PPTX / PDF 再ビルド")
    pptx = out_dir / f"{project_id}_teen.pptx"
    pdf = out_dir / f"{project_id}_teen.pdf"
    env = os.environ.copy()
    np_root = npm_root_global()
    if np_root:
        env["NODE_PATH"] = np_root
    cmd = [
        "node", str(BUILD_SLIDES),
        str(out_dir / "slides.json"),
        str(pptx),
        "--diagrams", str(out_dir / "diagrams") + "/",
        "--pdf", str(pdf),
        "--author", "Shifuto",
    ]
    run(cmd, env=env)


def step6_report(out_dir: Path, project_id: str):
    print("\n[Step 6] 完了レポート\n")
    diff_path = out_dir / "diff_report.json"
    if diff_path.exists():
        with diff_path.open("r", encoding="utf-8") as f:
            rep = json.load(f)
        diffs = rep.get("diffs", [])
        total = len(diffs)
        by_field = {}
        for d in diffs:
            by_field[d["field"]] = by_field.get(d["field"], 0) + 1

        print("──── 変換サマリー ────")
        for k, v in by_field.items():
            print(f"  {k}: {v} 箇所")
        print(f"  合計: {total} 箇所\n")

        # Before/After テーブル（先頭20件まで）
        print("──── Before/After（先頭20件） ────")
        print(f"{'スライド':<10}{'領域':<14}{'Before':<20}{'After':<20}")
        for d in diffs[:20]:
            slide = str(d.get("slide", ""))
            field = d.get("field", "")
            before = d.get("before", "")
            after = d.get("after", "")
            print(f"{slide:<10}{field:<14}{before:<20}{after:<20}")

    print("\n──── 成果物パス ────")
    for p in [
        "slide-design.xlsx", "slide-design.csv",
        "script.xlsx", "script.csv",
        "slides.json",
        "thumbnail-prompt-teen.txt",
        "diagrams/",
        "thumbnail/",
        f"{project_id}_teen.pptx",
        f"{project_id}_teen.pdf",
        "diff_report.json",
    ]:
        full = out_dir / p
        mark = "✅" if full.exists() else "—"
        print(f"  {mark} {full}")


# ── メイン ──────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description="サブスキちゃん 一気通貫パイプライン")
    ap.add_argument("--env", required=True, help="GOOGLE_API_KEY を含む .env ファイルのパス")
    ap.add_argument("--project-dir", default=".", help="対象プロジェクトディレクトリ（デフォルト: カレント）")
    args = ap.parse_args()

    project_dir = Path(args.project_dir).resolve()
    project_id = step0_check_project(project_dir)

    out_dir = project_dir / "output_teen"
    out_dir.mkdir(parents=True, exist_ok=True)

    step1_transform_text(project_dir, out_dir)
    step2_parse_excel(out_dir)
    step3_diagrams(out_dir, args.env)
    step4_thumbnails(out_dir, args.env)
    step5_build_slides(out_dir, project_id)
    step6_report(out_dir, project_id)

    print(f"\n✨ マスター、全部完成したよ〜！🎉 → {out_dir}/")


if __name__ == "__main__":
    main()
