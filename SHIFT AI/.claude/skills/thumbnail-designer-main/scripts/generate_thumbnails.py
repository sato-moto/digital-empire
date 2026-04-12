#!/usr/bin/env python3
"""
Gemini API (NanoBanana2) を使ってサムネイル画像を2枚同時生成する。

出力:
  - X宣伝用バナー: 1920x1080px
  - コース講座サムネイル: 1000x300px

使い方:
  python generate_thumbnails.py --prompt prompt.txt --output ./output --env .env
"""

import sys
import os
import json
import base64
import argparse
import shutil
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests
from PIL import Image
import io

# --- 設定 ---

DEFAULT_MODEL = "gemini-3-pro-image-preview"
API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
gemini_model = DEFAULT_MODEL

THUMBNAIL_SPECS = {
    "x_banner": {
        "name": "X宣伝用バナー",
        "width": 1920,
        "height": 1080,
        "suffix": "x_banner",
    },
    "course": {
        "name": "コース講座サムネイル",
        "width": 1000,
        "height": 300,
        "suffix": "course_thumbnail",
    },
}

# ロゴ位置の基準値（1920x1080基準）
LOGO_REF = {
    "ref_w": 1920,
    "ref_h": 1080,
    "logo_w": 389,
    "logo_h": 108,
    "margin_x": 72,
    "margin_y": 73,
}

# テキスト描画の基準値（1920px幅基準、画像幅に比例スケール）
TEXT_BASE = {
    "ref_w": 1920,
    "title_size": 120,
    "subtitle_size": 52,
    "margin_x_ratio": 0.06,
    "stroke_ratio": 0.025,
}

# ロゴ位置 → 回避指示テキスト
LOGO_AVOIDANCE = {
    "top-left": "左上の領域（上端の五分の一かつ左端の四分の一）にはテキストやビジュアル要素を配置しないでください。ブランドロゴを後から重ねます。",
    "top-right": "右上の領域（上端の五分の一かつ右端の四分の一）にはテキストやビジュアル要素を配置しないでください。ブランドロゴを後から重ねます。",
    "bottom-left": "左下の領域（下端の五分の一かつ左端の四分の一）にはテキストやビジュアル要素を配置しないでください。ブランドロゴを後から重ねます。",
    "bottom-right": "右下の領域（下端の五分の一かつ右端の四分の一）にはテキストやビジュアル要素を配置しないでください。ブランドロゴを後から重ねます。",
}

# ロゴ位置 → バッジ対角位置
BADGE_OPPOSITE = {
    "top-left": "bottom-right",
    "top-right": "bottom-left",
    "bottom-left": "top-right",
    "bottom-right": "top-left",
}


def _find_noto_font():
    """Noto Sans JP フォントをクロスプラットフォームで探索する"""
    env_path = os.environ.get("THUMBNAIL_FONT_PATH")
    if env_path and os.path.isfile(env_path):
        return env_path

    candidates = []
    if sys.platform == "win32":
        windir = os.environ.get("WINDIR", "C:/Windows")
        localappdata = os.environ.get("LOCALAPPDATA", "")
        candidates += [
            os.path.join(windir, "Fonts", "NotoSansJP-VF.ttf"),
            os.path.join(localappdata, "Microsoft", "Windows", "Fonts", "NotoSansJP-VF.ttf") if localappdata else "",
        ]
    elif sys.platform == "darwin":
        home = os.path.expanduser("~")
        candidates += [
            os.path.join(home, "Library", "Fonts", "NotoSansJP-VF.ttf"),
            "/Library/Fonts/NotoSansJP-VF.ttf",
            "/System/Library/Fonts/NotoSansJP-VF.ttf",
        ]
    else:
        home = os.path.expanduser("~")
        candidates += [
            os.path.join(home, ".local", "share", "fonts", "NotoSansJP-VF.ttf"),
            "/usr/share/fonts/opentype/noto/NotoSansJP-VF.ttf",
            "/usr/share/fonts/truetype/noto/NotoSansJP-VF.ttf",
            "/usr/share/fonts/noto-cjk/NotoSansJP-VF.ttf",
        ]

    for c in candidates:
        if c and os.path.isfile(c):
            return c
    return None


def load_env(env_path):
    """Simple .env loader"""
    env = {}
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                env[key.strip()] = value.strip()
    return env


def generate_image(api_key, prompt, reference_path=None, logo_position="top-left", has_logo=False, no_text=False):
    """Gemini API で画像を1枚生成して返す"""
    url = f"{API_BASE}/{gemini_model}:generateContent"
    headers = {"Content-Type": "application/json"}
    params = {"key": api_key}

    if no_text:
        prefix = (
            "テキストルール: この画像にはテキストを一切含めないでください。"
            "文字・ロゴ・ブランド名・架空の単語は一切画像内に描画しないでください。"
            "背景・ビジュアル要素のみを生成してください。"
            "テキストは後から別途合成します。テキスト配置予定エリアは白文字が読みやすい背景にしてください。"
        )
    else:
        prefix = (
            "テキストルール: 画像内にはプロンプトの「テキスト」セクションに記載された文字だけを表示してください。"
            "それ以外の文字・ロゴ・ブランド名・架空の単語は一切画像内に含めないでください。"
            "同じテキストを複数箇所に表示しないでください。"
        )
    if has_logo:
        avoidance = LOGO_AVOIDANCE.get(logo_position, LOGO_AVOIDANCE["top-left"])
        prefix += f" 配置ルール: {avoidance}"

    parts = []
    if reference_path:
        ref_data = Path(reference_path).read_bytes()
        ref_base64 = base64.b64encode(ref_data).decode("utf-8")
        parts.append({"inlineData": {"mimeType": "image/png", "data": ref_base64}})
        parts.append({"text": f"この画像はデザインスタイルのリファレンスです。色使い・質感・全体的なトーンを参考にしてください。{prefix}\n\n{prompt}"})
    else:
        parts.append({"text": f"{prefix}\n\n{prompt}"})

    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "responseModalities": ["IMAGE", "TEXT"],
        },
    }

    resp = requests.post(url, headers=headers, params=params, json=body, timeout=180)
    resp.raise_for_status()
    result = resp.json()

    text_parts = []
    image_data = None
    mime_type = "image/png"

    for candidate in result.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            if "inlineData" in part:
                image_data = base64.b64decode(part["inlineData"]["data"])
                mime_type = part["inlineData"].get("mimeType", "image/png")
            elif "text" in part:
                text_parts.append(part["text"])

    if image_data is None:
        error_msg = json.dumps(result, ensure_ascii=False, indent=2)[:1000]
        raise ValueError(f"画像データが応答に含まれていません:\n{error_msg}")

    return image_data, mime_type, "\n".join(text_parts)


def resize_image(image_data, width, height):
    """画像を指定サイズにリサイズ（アスペクト比を維持してカバーフィット＋中央クロップ）"""
    img = Image.open(io.BytesIO(image_data))

    src_ratio = img.width / img.height
    dst_ratio = width / height

    if src_ratio > dst_ratio:
        new_h = height
        new_w = int(img.width * (height / img.height))
    else:
        new_w = width
        new_h = int(img.height * (width / img.width))

    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    left = (new_w - width) // 2
    top = (new_h - height) // 2
    img = img.crop((left, top, left + width, top + height))

    output = io.BytesIO()
    img.save(output, format="PNG", optimize=True)
    return output.getvalue()


def _calc_logo_pos(img_w, img_h, position):
    """画像サイズとポジションからロゴの(x, y, w, h)を計算"""
    ref = LOGO_REF
    scale_x = img_w / ref["ref_w"]
    scale_y = img_h / ref["ref_h"]
    logo_w = int(ref["logo_w"] * scale_x)
    logo_h = int(ref["logo_h"] * scale_x)
    mx = int(ref["margin_x"] * scale_x)
    my = int(ref["margin_y"] * scale_y)

    if position == "top-left":
        x, y = mx, my
    elif position == "top-right":
        x, y = img_w - logo_w - mx, my
    elif position == "bottom-left":
        x, y = mx, img_h - logo_h - my
    elif position == "bottom-right":
        x, y = img_w - logo_w - mx, img_h - logo_h - my
    else:
        x, y = mx, my

    return x, y, logo_w, logo_h


def overlay_logo(image_data, logo_path, position="top-left", offset_y=0):
    """ロゴを指定の隅に合成する（1920x1080基準: 389x108px、余白72x73px）"""
    import numpy as np

    img = Image.open(io.BytesIO(image_data)).convert("RGBA")
    logo = Image.open(logo_path).convert("RGBA")

    # ロゴ内の可視領域（alpha > 10）を検出してトリミング
    logo_arr = np.array(logo)
    visible = logo_arr[:, :, 3] > 10
    rows = np.any(visible, axis=1)
    cols = np.any(visible, axis=0)
    vis_top = int(np.where(rows)[0][0])
    vis_left = int(np.where(cols)[0][0])
    vis_bottom = int(np.where(rows)[0][-1]) + 1
    vis_right = int(np.where(cols)[0][-1]) + 1
    logo = logo.crop((vis_left, vis_top, vis_right, vis_bottom))

    x, y, logo_w, logo_h = _calc_logo_pos(img.width, img.height, position)
    y = max(0, y + offset_y)
    logo = logo.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
    img.paste(logo, (x, y), logo)

    output = io.BytesIO()
    img = img.convert("RGB")
    img.save(output, format="PNG", optimize=True)
    return output.getvalue()


def _parse_hex_color(hex_str):
    """'#FF6B4A' → (255, 107, 74)"""
    hex_str = hex_str.lstrip("#")
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))


def overlay_text(image_data, title, subtitle=None, accent_text=None,
                 accent_color=(255, 107, 74), text_color=(255, 255, 255)):
    """講座名・サブタイトルを固定サイズでPIL描画する"""
    from PIL import ImageDraw, ImageFont

    img = Image.open(io.BytesIO(image_data)).convert("RGBA")
    w, h = img.size

    font_path = _find_noto_font()
    scale = w / TEXT_BASE["ref_w"]
    margin_x = int(w * TEXT_BASE["margin_x_ratio"])

    # フォントサイズ算出
    title_size = max(16, int(TEXT_BASE["title_size"] * scale))
    subtitle_size = max(10, int(TEXT_BASE["subtitle_size"] * scale))

    # 講座名フォント (Bold)
    if font_path:
        title_font = ImageFont.truetype(font_path, title_size)
    else:
        title_font = ImageFont.load_default()
    try:
        title_font.set_variation_by_name("Bold")
    except Exception:
        pass

    # 講座名が幅の85%を超える場合は縮小
    draw = ImageDraw.Draw(img)
    max_text_w = int(w * 0.85)
    bbox = draw.textbbox((0, 0), title, font=title_font)
    while bbox[2] - bbox[0] > max_text_w and title_size > 16:
        title_size -= 2
        if font_path:
            title_font = ImageFont.truetype(font_path, title_size)
        else:
            title_font = ImageFont.load_default()
        try:
            title_font.set_variation_by_name("Bold")
        except Exception:
            pass
        bbox = draw.textbbox((0, 0), title, font=title_font)

    title_h = bbox[3] - bbox[1]
    stroke_w = max(1, int(title_size * TEXT_BASE["stroke_ratio"]))

    # サブタイトルフォント (Medium)
    sub_font = None
    sub_h = 0
    gap = 0
    if subtitle:
        if font_path:
            sub_font = ImageFont.truetype(font_path, subtitle_size)
        else:
            sub_font = ImageFont.load_default()
        try:
            sub_font.set_variation_by_name("Medium")
        except Exception:
            pass
        sub_bbox = draw.textbbox((0, 0), subtitle, font=sub_font)
        sub_h = sub_bbox[3] - sub_bbox[1]
        gap = int(subtitle_size * 0.6)

    # 上下中央配置
    total_h = title_h + (gap + sub_h if subtitle else 0)
    start_y = (h - total_h) // 2

    # 半透明オーバーレイ層
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    sub_stroke = max(1, int(subtitle_size * TEXT_BASE["stroke_ratio"]))

    # 講座名描画
    od.text((margin_x, start_y), title, fill=text_color + (255,),
            font=title_font, stroke_width=stroke_w, stroke_fill=(0, 0, 0, 120))

    # サブタイトル描画
    if subtitle and sub_font:
        sub_y = start_y + title_h + gap
        if accent_text and accent_text in subtitle:
            parts = subtitle.split(accent_text, 1)
            cx = margin_x
            # 前半
            if parts[0]:
                od.text((cx, sub_y), parts[0], fill=text_color + (255,),
                        font=sub_font, stroke_width=sub_stroke, stroke_fill=(0, 0, 0, 120))
                bb = od.textbbox((0, 0), parts[0], font=sub_font)
                cx += bb[2] - bb[0]
            # アクセント部分
            od.text((cx, sub_y), accent_text, fill=accent_color + (255,),
                    font=sub_font, stroke_width=sub_stroke, stroke_fill=(0, 0, 0, 120))
            bb = od.textbbox((0, 0), accent_text, font=sub_font)
            cx += bb[2] - bb[0]
            # 後半
            if len(parts) > 1 and parts[1]:
                od.text((cx, sub_y), parts[1], fill=text_color + (255,),
                        font=sub_font, stroke_width=sub_stroke, stroke_fill=(0, 0, 0, 120))
        else:
            od.text((margin_x, sub_y), subtitle, fill=text_color + (255,),
                    font=sub_font, stroke_width=sub_stroke, stroke_fill=(0, 0, 0, 120))

    img = Image.alpha_composite(img, overlay)
    output = io.BytesIO()
    img = img.convert("RGB")
    img.save(output, format="PNG", optimize=True)
    return output.getvalue()


def overlay_badge(image_data, badge_text, position="bottom-right"):
    """講座名バッジを指定の隅に描画する（Noto Sans JP、半透明ダークネイビー角丸背景＋白文字）"""
    from PIL import ImageDraw, ImageFont

    img = Image.open(io.BytesIO(image_data)).convert("RGBA")
    w, h = img.size

    # フォント設定（Noto Sans JP）
    font_path = _find_noto_font()
    scale = w / 1920
    font_size = max(12, int(28 * scale))
    try:
        font = ImageFont.truetype(font_path, font_size) if font_path else ImageFont.load_default()
    except OSError:
        font = ImageFont.load_default()

    # テキストサイズ計測
    temp_draw = ImageDraw.Draw(img)
    bbox = temp_draw.textbbox((0, 0), badge_text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    pad_x = int(16 * scale)
    pad_y = int(8 * scale)
    margin_x = int(w * 0.05)
    margin_y = int(h * 0.05)
    corner_r = int(8 * scale)

    badge_w = text_w + pad_x * 2
    badge_h = text_h + pad_y * 2

    # 位置計算
    if position == "bottom-right":
        badge_x = w - badge_w - margin_x
        badge_y = h - badge_h - margin_y
    elif position == "bottom-left":
        badge_x = margin_x
        badge_y = h - badge_h - margin_y
    elif position == "top-right":
        badge_x = w - badge_w - margin_x
        badge_y = margin_y
    elif position == "top-left":
        badge_x = margin_x
        badge_y = margin_y
    else:
        badge_x = w - badge_w - margin_x
        badge_y = h - badge_h - margin_y

    # 半透明ダークネイビー背景（角丸長方形）
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rounded_rectangle(
        [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h],
        radius=corner_r,
        fill=(15, 23, 42, 200),
    )
    img = Image.alpha_composite(img, overlay)

    # 白文字描画
    draw = ImageDraw.Draw(img)
    text_x = badge_x + pad_x
    text_y = badge_y + pad_y - int(bbox[1])
    draw.text((text_x, text_y), badge_text, fill=(255, 255, 255, 230), font=font)

    output = io.BytesIO()
    img = img.convert("RGB")
    img.save(output, format="PNG", optimize=True)
    return output.getvalue()


def build_prompt_for_spec(base_prompt, spec):
    """各サムネサイズ向けにプロンプトを調整"""
    w, h = spec["width"], spec["height"]
    ratio = f"{w}:{h}"
    aspect = w / h

    size_hint = f"\n\n---\n画像サイズ: {w}x{h}px（アスペクト比 {ratio}）\n用途: {spec['name']}\n"

    if aspect > 2.5:
        size_hint += (
            "これは超ワイド横長バナー形式です。以下を厳守してください:\n"
            "- すべてのテキストを横一列または2行以内に収めること\n"
            "- テキストは画像の上下中央付近に配置し、上端・下端に見切れないこと\n"
            "- 人物は右端に小さく配置するか省略すること\n"
            "- この極端な横長比率で生成してください。正方形や16:9にしないでください。\n"
            "- プロンプトに記載されていない文字・ロゴ・ブランド名・架空の単語は一切含めないこと"
        )
    else:
        size_hint += "このアスペクト比に最適化したレイアウトで生成してください。"

    # テキストサイズ指示（TEXT_BASEから画像幅に比例スケール）
    scale = w / TEXT_BASE["ref_w"]
    title_px = int(TEXT_BASE["title_size"] * scale)
    subtitle_px = int(TEXT_BASE["subtitle_size"] * scale)
    size_hint += (
        f"\n\nテキストサイズ指定（厳守）:\n"
        f"- 講座名のフォントサイズ: 約{title_px}px（太字・ボールド）\n"
        f"- サブタイトルのフォントサイズ: 約{subtitle_px}px（中太・ミディアム）\n"
        f"- 毎回この大きさで統一すること"
    )

    return base_prompt + size_hint


def process_thumbnail(api_key, base_prompt, spec_key, output_dir,
                      reference_path=None, logo_path=None,
                      logo_position="top-left", badge_text=None,
                      regen=False):
    """1つのサムネイルを生成・リサイズ・保存"""
    spec = THUMBNAIL_SPECS[spec_key]

    # 再生成モード: 既存画像を rejected/ に移動
    if regen:
        existing_path = Path(output_dir) / f"{spec['suffix']}.png"
        if existing_path.exists():
            rejected_dir = Path(output_dir) / "rejected"
            rejected_dir.mkdir(parents=True, exist_ok=True)
            rejected_path = rejected_dir / f"{spec['suffix']}_rejected.png"
            shutil.move(str(existing_path), str(rejected_path))
            print(f"  [{spec['name']}] 不合格画像を移動: {rejected_path}", flush=True)

    print(f"  [{spec['name']}] 生成開始...", flush=True)

    prompt = build_prompt_for_spec(base_prompt, spec)
    image_data, mime_type, ai_text = generate_image(
        api_key, prompt, reference_path, logo_position, has_logo=bool(logo_path)
    )

    # リサイズ
    image_data = resize_image(image_data, spec["width"], spec["height"])

    # ロゴ合成
    if logo_path:
        image_data = overlay_logo(image_data, logo_path, logo_position)

    # バッジ合成
    if badge_text:
        if logo_path:
            badge_pos = BADGE_OPPOSITE.get(logo_position, "bottom-right")
        else:
            badge_pos = "bottom-right"
        image_data = overlay_badge(image_data, badge_text, badge_pos)

    # 保存
    filename = f"{spec['suffix']}.png"
    output_path = Path(output_dir) / filename
    output_path.write_bytes(image_data)

    print(f"  [{spec['name']}] 完了: {output_path} ({spec['width']}x{spec['height']}px)", flush=True)

    if ai_text:
        text_path = Path(output_dir) / f"{spec['suffix']}_response.txt"
        text_path.write_text(ai_text, encoding="utf-8")

    return str(output_path)


def main():
    parser = argparse.ArgumentParser(description="Gemini API でサムネイルを2枚同時生成")
    parser.add_argument("--prompt", required=True, help="プロンプトファイルのパス")
    parser.add_argument("--output", required=True, help="出力ディレクトリ")
    parser.add_argument(
        "--env",
        default=None,
        help=".env ファイルのパス",
    )
    parser.add_argument("--api-key", help="Google API Key (直接指定、.env より優先)")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Gemini モデル名 (default: {DEFAULT_MODEL})")
    parser.add_argument("--reference", help="リファレンス画像のパス（スタイル参考用）")
    parser.add_argument(
        "--logo",
        default=None,
        help="ロゴ画像のパス（指定した場合のみロゴを合成）",
    )
    parser.add_argument(
        "--logo-color",
        choices=["original", "black", "white"],
        default=None,
        help="ロゴカラー（original / black / white）。指定すると references/ 内の対応ロゴを自動選択",
    )
    parser.add_argument(
        "--logo-position",
        choices=["top-left", "top-right", "bottom-left", "bottom-right"],
        default="top-left",
        help="ロゴの配置位置 (default: top-left)",
    )
    parser.add_argument("--badge", help="講座名バッジのテキスト（PILで描画、ロゴ対角に配置）")
    parser.add_argument("--regen", action="store_true",
                        help="再生成モード: 既存画像を rejected/ に移動してから再生成")
    parser.add_argument("--logo-only", action="store_true",
                        help="ロゴのみ合成モード: 画像の再生成は行わず既存画像にロゴを合成")
    parser.add_argument("--logo-target",
                        choices=["both", "x_banner", "course"],
                        default="both",
                        help="ロゴ合成対象: both（両方）/ x_banner（X宣伝用のみ）/ course（コース講座のみ）")
    parser.add_argument("--logo-offset-y", type=int, default=0,
                        help="ロゴのY軸オフセット（px）。負の値で上に移動")
    parser.add_argument("--title", help="講座名テキスト（PILで固定サイズ描画）")
    parser.add_argument("--subtitle", help="サブタイトルテキスト（PILで固定サイズ描画）")
    parser.add_argument("--accent-text", help="サブタイトル内で強調するフレーズ")
    parser.add_argument("--accent-color", default="#FF6B4A",
                        help="アクセントカラー hex (default: #FF6B4A)")
    parser.add_argument("--text-color", default="#FFFFFF",
                        help="テキストカラー hex (default: #FFFFFF)")
    parser.add_argument("--text-only", action="store_true",
                        help="テキストのみ合成モード: 既存画像にテキストを合成")
    args = parser.parse_args()

    # モデル上書き
    global gemini_model
    gemini_model = args.model

    # API Key 取得
    api_key = args.api_key or os.environ.get("GOOGLE_API_KEY")
    if not api_key and args.env:
        try:
            env = load_env(args.env)
            api_key = env.get("GOOGLE_API_KEY")
        except FileNotFoundError:
            pass
    if not api_key:
        print("Error: GOOGLE_API_KEY が見つかりません。--api-key, --env, または環境変数で指定してください。", file=sys.stderr)
        sys.exit(1)

    # プロンプト読み込み
    prompt_path = Path(args.prompt)
    if not prompt_path.exists():
        print(f"Error: プロンプトファイルが見つかりません: {prompt_path}", file=sys.stderr)
        sys.exit(1)
    base_prompt = prompt_path.read_text(encoding="utf-8")

    # 出力ディレクトリ作成
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    # リファレンス画像確認
    reference_path = args.reference
    if reference_path and not Path(reference_path).exists():
        print(f"Error: リファレンス画像が見つかりません: {reference_path}", file=sys.stderr)
        sys.exit(1)

    # --logo-color → ロゴパス自動解決（--logo 直接指定より優先度低）
    if args.logo_color and not args.logo:
        script_dir = Path(__file__).resolve().parent.parent
        logo_filenames = {"original": "logo.png", "black": "logo_black.png", "white": "logo_white.png"}
        args.logo = str(script_dir / "references" / logo_filenames[args.logo_color])

    # ロゴ画像確認
    logo_path = args.logo
    if logo_path and not Path(logo_path).exists():
        print(f"Warning: ロゴ画像が見つかりません: {logo_path}（ロゴなしで続行）", file=sys.stderr)
        logo_path = None

    # テキスト色のパース
    text_color = _parse_hex_color(args.text_color) if args.title else (255, 255, 255)
    accent_color = _parse_hex_color(args.accent_color) if args.title else (255, 107, 74)

    # --text-only モード: 既存画像にテキストのみ合成
    if args.text_only:
        if not args.title:
            print("Error: --text-only には --title が必要です。", file=sys.stderr)
            sys.exit(1)
        print(f"テキストのみ合成モード")
        print(f"  講座名: {args.title}")
        if args.subtitle:
            print(f"  サブタイトル: {args.subtitle}")
        if args.accent_text:
            print(f"  アクセント: {args.accent_text} ({args.accent_color})")
        print(f"  出力先: {output_dir}")
        print()
        for spec_key, spec in THUMBNAIL_SPECS.items():
            img_path = Path(output_dir) / f"{spec['suffix']}.png"
            if not img_path.exists():
                print(f"  [{spec['name']}] スキップ: {img_path} が見つかりません", file=sys.stderr)
                continue
            image_data = img_path.read_bytes()
            image_data = overlay_text(image_data, args.title, args.subtitle,
                                      args.accent_text, accent_color, text_color)
            text_path_out = Path(output_dir) / f"{spec['suffix']}_text.png"
            text_path_out.write_bytes(image_data)
            print(f"  [{spec['name']}] テキスト合成完了: {text_path_out}")
        print("\nテキスト合成完了!")
        sys.exit(0)

    # --logo-only モード: 既存画像にロゴのみ合成
    if args.logo_only:
        if not logo_path:
            print("Error: --logo-only には --logo が必要です。", file=sys.stderr)
            sys.exit(1)
        target = args.logo_target
        target_label = {"both": "両方", "x_banner": "X宣伝用のみ", "course": "コース講座のみ"}
        print(f"ロゴのみ合成モード")
        print(f"  ロゴ: {logo_path} ({args.logo_position})")
        print(f"  対象: {target_label.get(target, target)}")
        print(f"  出力先: {output_dir}")
        print()
        for spec_key, spec in THUMBNAIL_SPECS.items():
            if target != "both" and target != spec_key:
                continue
            img_path = Path(output_dir) / f"{spec['suffix']}.png"
            if not img_path.exists():
                print(f"  [{spec['name']}] スキップ: {img_path} が見つかりません", file=sys.stderr)
                continue
            image_data = img_path.read_bytes()
            image_data = overlay_logo(image_data, logo_path, args.logo_position, offset_y=args.logo_offset_y)
            logo_path_out = Path(output_dir) / f"{spec['suffix']}_logo.png"
            logo_path_out.write_bytes(image_data)
            print(f"  [{spec['name']}] ロゴ合成完了: {logo_path_out}")
        print("\nロゴ合成完了!")
        sys.exit(0)

    print(f"サムネイル2枚を同時生成します...")
    print(f"  モデル: {gemini_model}")
    print(f"  出力先: {output_dir}")
    if reference_path:
        print(f"  リファレンス: {reference_path}")
    if logo_path:
        print(f"  ロゴ: {logo_path} ({args.logo_position})")
    if args.badge:
        if logo_path:
            badge_pos = BADGE_OPPOSITE.get(args.logo_position, "bottom-right")
        else:
            badge_pos = "bottom-right"
        print(f"  バッジ: \"{args.badge}\" ({badge_pos})")
    print()

    # 2枚を並列生成
    results = {}
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {
            executor.submit(
                process_thumbnail, api_key, base_prompt, spec_key, output_dir,
                reference_path, logo_path, args.logo_position, args.badge,
                args.regen
            ): spec_key
            for spec_key in THUMBNAIL_SPECS
        }
        for future in as_completed(futures):
            spec_key = futures[future]
            try:
                path = future.result()
                results[spec_key] = path
            except Exception as e:
                print(f"  [{THUMBNAIL_SPECS[spec_key]['name']}] エラー: {e}", file=sys.stderr)
                results[spec_key] = None

    # 結果サマリ
    print()
    print("--- 生成結果 ---")
    for spec_key in THUMBNAIL_SPECS:
        spec = THUMBNAIL_SPECS[spec_key]
        path = results.get(spec_key)
        status = path if path else "失敗"
        print(f"  {spec['name']} ({spec['width']}x{spec['height']}): {status}")

    if all(results.values()):
        print("\n全て成功!")
    else:
        print("\n一部失敗があります。", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
