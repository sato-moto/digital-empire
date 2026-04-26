#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""実務講座 受講者向け PDF 手順書 生成スクリプト

Usage:
    python generate_practice_pdf.py --title "講座タイトル" --steps <steps_json> --output <output.pdf> [--os win|mac] [--meta <meta_json>]

入力:
    --title    講座タイトル（表紙に表示）
    --steps    手順データ（JSON ファイルパス）
                 [{"phase": "Phase 1", "step_num": 1, "operation": "操作内容", "point": "ポイント（任意）", "prompt": "プロンプト（任意）"}, ...]
    --meta     メタ情報（JSON ファイルパス・任意）
                 {"tools": "使用ツール", "duration": "想定所要時間", "output": "完成物", "prep": ["事前準備1", "事前準備2"], "ng": ["NG事項1"], "review": ["振り返り1"]}
    --os       対象OS: win（デフォルト）または mac
    --output   出力PDFファイルパス

Noto Sans JP フォントを埋め込み。フォントは以下の順で探索:
    1. {script_dir}/../fonts/NotoSansJP-Regular.ttf / NotoSansJP-Bold.ttf
    2. C:/Users/*/AppData/Local/Microsoft/Windows/Fonts/
    3. /usr/share/fonts/ (Linux)
    4. ~/Library/Fonts/ (macOS)
"""
import argparse
import json
import os
import sys
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, KeepTogether, HRFlowable,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


# ─── フォント探索 ───────────────────────────────────────

def find_font(name_pattern: str) -> str | None:
    """Noto Sans JP フォントファイルを探索"""
    candidates = []

    # 1. スキル内 fonts ディレクトリ
    script_dir = Path(__file__).resolve().parent
    candidates.append(script_dir.parent / "fonts" / name_pattern)

    # 2. Windows ユーザーフォント
    if sys.platform == "win32":
        local_fonts = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "Windows" / "Fonts"
        candidates.append(local_fonts / name_pattern)
        # システムフォント
        candidates.append(Path("C:/Windows/Fonts") / name_pattern)

    # 3. macOS
    candidates.append(Path.home() / "Library" / "Fonts" / name_pattern)

    # 4. Linux
    for d in ["/usr/share/fonts", "/usr/local/share/fonts"]:
        p = Path(d)
        if p.exists():
            found = list(p.rglob(name_pattern))
            if found:
                return str(found[0])

    for c in candidates:
        if c and c.exists():
            return str(c)
    return None


def register_fonts():
    """Noto Sans JP Regular / Bold を登録"""
    regular = find_font("NotoSansJP-Regular.ttf")
    bold = find_font("NotoSansJP-Bold.ttf")

    if not regular:
        print("[WARN] NotoSansJP-Regular.ttf が見つかりません。デフォルトフォントで生成します。", file=sys.stderr)
        return False

    pdfmetrics.registerFont(TTFont("NotoSansJP", regular))
    if bold:
        pdfmetrics.registerFont(TTFont("NotoSansJP-Bold", bold))
    else:
        pdfmetrics.registerFont(TTFont("NotoSansJP-Bold", regular))

    return True


# ─── スタイル定義 ────────────────────────────────────────

COLOR_PRIMARY = HexColor("#1a1a2e")
COLOR_ACCENT = HexColor("#A51E6D")
COLOR_STEP_BG = HexColor("#E8F4FD")
COLOR_POINT_BG = HexColor("#F5F5F5")
COLOR_PROMPT_BG = HexColor("#F0F0F0")
COLOR_NG_BG = HexColor("#FFF3F3")
COLOR_NG_BORDER = HexColor("#E53935")
COLOR_PHASE_BG = HexColor("#2C3E50")


def build_styles(font_available: bool):
    base_font = "NotoSansJP" if font_available else "Helvetica"
    bold_font = "NotoSansJP-Bold" if font_available else "Helvetica-Bold"

    return {
        "cover_title": ParagraphStyle(
            "CoverTitle", fontName=bold_font, fontSize=22, leading=30,
            textColor=COLOR_PRIMARY, alignment=TA_CENTER, spaceAfter=8*mm,
        ),
        "cover_sub": ParagraphStyle(
            "CoverSub", fontName=base_font, fontSize=13, leading=18,
            textColor=HexColor("#555555"), alignment=TA_CENTER, spaceAfter=4*mm,
        ),
        "cover_meta": ParagraphStyle(
            "CoverMeta", fontName=base_font, fontSize=11, leading=16,
            textColor=HexColor("#333333"), alignment=TA_CENTER,
        ),
        "heading1": ParagraphStyle(
            "H1", fontName=bold_font, fontSize=16, leading=22,
            textColor=COLOR_PRIMARY, spaceBefore=6*mm, spaceAfter=4*mm,
        ),
        "heading2": ParagraphStyle(
            "H2", fontName=bold_font, fontSize=13, leading=18,
            textColor=COLOR_ACCENT, spaceBefore=4*mm, spaceAfter=2*mm,
        ),
        "body": ParagraphStyle(
            "Body", fontName=base_font, fontSize=11, leading=17,
            textColor=black, spaceAfter=2*mm,
        ),
        "step_num": ParagraphStyle(
            "StepNum", fontName=bold_font, fontSize=14, leading=18,
            textColor=COLOR_ACCENT,
        ),
        "step_op": ParagraphStyle(
            "StepOp", fontName=base_font, fontSize=11, leading=17,
            textColor=black,
        ),
        "point": ParagraphStyle(
            "Point", fontName=base_font, fontSize=10, leading=15,
            textColor=HexColor("#555555"),
        ),
        "prompt": ParagraphStyle(
            "Prompt", fontName=base_font, fontSize=10, leading=15,
            textColor=HexColor("#333333"), leftIndent=4*mm, rightIndent=4*mm,
        ),
        "check_item": ParagraphStyle(
            "CheckItem", fontName=base_font, fontSize=11, leading=17,
            textColor=black, leftIndent=6*mm,
        ),
        "ng_item": ParagraphStyle(
            "NGItem", fontName=base_font, fontSize=11, leading=17,
            textColor=COLOR_NG_BORDER, leftIndent=6*mm,
        ),
        "phase_title": ParagraphStyle(
            "PhaseTitle", fontName=bold_font, fontSize=13, leading=18,
            textColor=white,
        ),
    }


# ─── PDF 構築 ───────────────────────────────────────────

def build_cover(story, styles, title: str, os_label: str, meta: dict):
    """表紙ページ"""
    story.append(Spacer(1, 40*mm))
    story.append(Paragraph(title, styles["cover_title"]))
    story.append(Paragraph(f"操作手順ガイド（{os_label}版）", styles["cover_sub"]))
    story.append(Spacer(1, 10*mm))

    if meta:
        info_lines = []
        if meta.get("tools"):
            info_lines.append(f"使用ツール: {meta['tools']}")
        if meta.get("duration"):
            info_lines.append(f"想定所要時間: {meta['duration']}")
        if meta.get("output"):
            info_lines.append(f"完成物: {meta['output']}")
        for line in info_lines:
            story.append(Paragraph(line, styles["cover_meta"]))
            story.append(Spacer(1, 2*mm))

    story.append(PageBreak())


def build_prep(story, styles, meta: dict):
    """事前準備ページ"""
    story.append(Paragraph("事前準備", styles["heading1"]))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_ACCENT))
    story.append(Spacer(1, 4*mm))

    for item in meta.get("prep", []):
        story.append(Paragraph(f"\u25a1  {item}", styles["check_item"]))
        story.append(Spacer(1, 2*mm))

    ng_items = meta.get("ng", [])
    if ng_items:
        story.append(Spacer(1, 4*mm))
        story.append(Paragraph("NG 事項（必ず確認）", styles["heading2"]))

        ng_data = [[Paragraph(f"\u26a0  {ng}", styles["ng_item"])] for ng in ng_items]
        ng_table = Table(ng_data, colWidths=["100%"])
        ng_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), COLOR_NG_BG),
            ("BOX", (0, 0), (-1, -1), 1, COLOR_NG_BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 3*mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3*mm),
            ("LEFTPADDING", (0, 0), (-1, -1), 3*mm),
        ]))
        story.append(ng_table)

    story.append(PageBreak())


def build_phase_header(story, styles, phase_name: str):
    """Phase 区切りバー"""
    data = [[Paragraph(phase_name, styles["phase_title"])]]
    t = Table(data, colWidths=["100%"])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_PHASE_BG),
        ("TOPPADDING", (0, 0), (-1, -1), 3*mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3*mm),
        ("LEFTPADDING", (0, 0), (-1, -1), 4*mm),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(Spacer(1, 4*mm))
    story.append(t)
    story.append(Spacer(1, 4*mm))


def build_step(story, styles, step_num: int, step: dict):
    """1ステップのブロック"""
    elements = []

    # ステップ番号 + 操作内容（背景色付き）
    op_data = [[
        Paragraph(f"Step {step_num}", styles["step_num"]),
        Paragraph(step.get("operation", ""), styles["step_op"]),
    ]]
    op_table = Table(op_data, colWidths=[18*mm, None])
    op_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_STEP_BG),
        ("TOPPADDING", (0, 0), (-1, -1), 3*mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3*mm),
        ("LEFTPADDING", (0, 0), (-1, -1), 3*mm),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    elements.append(op_table)

    # プロンプト（あれば）
    prompt_text = step.get("prompt", "")
    if prompt_text:
        # 改行を <br/> に変換
        prompt_html = prompt_text.replace("\n", "<br/>")
        p_data = [[Paragraph(prompt_html, styles["prompt"])]]
        p_table = Table(p_data, colWidths=["100%"])
        p_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), COLOR_PROMPT_BG),
            ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#CCCCCC")),
            ("TOPPADDING", (0, 0), (-1, -1), 3*mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3*mm),
            ("LEFTPADDING", (0, 0), (-1, -1), 4*mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4*mm),
        ]))
        elements.append(Spacer(1, 1*mm))
        elements.append(p_table)

    # ポイント（あれば）
    point_text = step.get("point", "")
    if point_text:
        point_html = point_text.replace("\n", "<br/>")
        pt_data = [[Paragraph(f"\U0001f4a1 {point_html}", styles["point"])]]
        pt_table = Table(pt_data, colWidths=["100%"])
        pt_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), COLOR_POINT_BG),
            ("TOPPADDING", (0, 0), (-1, -1), 2*mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2*mm),
            ("LEFTPADDING", (0, 0), (-1, -1), 3*mm),
        ]))
        elements.append(Spacer(1, 1*mm))
        elements.append(pt_table)

    elements.append(Spacer(1, 3*mm))
    story.append(KeepTogether(elements))


def build_review(story, styles, meta: dict):
    """振り返りページ"""
    story.append(PageBreak())
    story.append(Paragraph("振り返り", styles["heading1"]))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_ACCENT))
    story.append(Spacer(1, 4*mm))

    for item in meta.get("review", []):
        story.append(Paragraph(f"\u2705  {item}", styles["check_item"]))
        story.append(Spacer(1, 2*mm))


def generate_pdf(title: str, steps: list, output_path: str, os_type: str = "win", meta: dict = None):
    """PDF を生成するメイン関数"""
    meta = meta or {}
    os_label = "Windows" if os_type == "win" else "Mac"

    font_ok = register_fonts()
    styles = build_styles(font_ok)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=20*mm,
        rightMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm,
        title=f"{title} - 操作手順ガイド（{os_label}版）",
        author="create-course",
    )

    story = []

    # 1. 表紙
    build_cover(story, styles, title, os_label, meta)

    # 2. 事前準備
    if meta.get("prep") or meta.get("ng"):
        build_prep(story, styles, meta)

    # 3. 手順（Phase 区切り付き）
    story.append(Paragraph("操作手順", styles["heading1"]))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_ACCENT))
    story.append(Spacer(1, 4*mm))

    current_phase = None
    for i, step in enumerate(steps, 1):
        phase = step.get("phase", "")
        if phase and phase != current_phase:
            build_phase_header(story, styles, phase)
            current_phase = phase
        build_step(story, styles, i, step)

    # 4. 振り返り
    if meta.get("review"):
        build_review(story, styles, meta)

    # ビルド
    doc.build(story)
    print(f"[OK] PDF 生成完了: {output_path} ({os_label}版)", file=sys.stderr)


# ─── CLI ────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="実務講座 受講者向け PDF 手順書を生成")
    parser.add_argument("--title", required=True, help="講座タイトル")
    parser.add_argument("--steps", required=True, help="手順データ JSON ファイルパス")
    parser.add_argument("--output", required=True, help="出力 PDF ファイルパス")
    parser.add_argument("--os", default="win", choices=["win", "mac"], help="対象OS (win/mac)")
    parser.add_argument("--meta", default=None, help="メタ情報 JSON ファイルパス（任意）")

    args = parser.parse_args()

    # 手順データ読み込み
    with open(args.steps, "r", encoding="utf-8") as f:
        steps = json.load(f)

    # メタ情報読み込み
    meta = {}
    if args.meta:
        with open(args.meta, "r", encoding="utf-8") as f:
            meta = json.load(f)

    generate_pdf(args.title, steps, args.output, args.os, meta)


if __name__ == "__main__":
    main()
