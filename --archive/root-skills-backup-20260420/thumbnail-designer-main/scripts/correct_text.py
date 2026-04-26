#!/usr/bin/env python3
"""
Gemini API を使って生成画像内のテキストを修正する。

元画像 + 修正指示テキストを送信し、テキストだけ書き換えた画像を取得する。
修正前の画像は *_before_fix.png としてバックアップされる。

使い方:
  python correct_text.py --image x_banner.png --instruction "修正指示" --output x_banner.png --env .env
"""

import sys
import os
import json
import base64
import argparse
from pathlib import Path

import requests
from PIL import Image
import io

DEFAULT_MODEL = "gemini-3-pro-image-preview"
API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


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


def correct_image_text(api_key, image_path, instruction, model=DEFAULT_MODEL):
    """画像 + 修正指示を Gemini API に送信し、修正後の画像を返す"""
    image_data = Path(image_path).read_bytes()
    image_base64 = base64.b64encode(image_data).decode("utf-8")

    # 画像の MIME タイプを判定
    img = Image.open(io.BytesIO(image_data))
    mime_map = {"PNG": "image/png", "JPEG": "image/jpeg", "WEBP": "image/webp"}
    src_mime = mime_map.get(img.format, "image/png")

    url = f"{API_BASE}/{model}:generateContent"
    headers = {"Content-Type": "application/json"}
    params = {"key": api_key}
    body = {
        "contents": [
            {
                "parts": [
                    {"inlineData": {"mimeType": src_mime, "data": image_base64}},
                    {"text": instruction},
                ]
            }
        ],
        "generationConfig": {
            "responseModalities": ["IMAGE", "TEXT"],
        },
    }

    print(f"  修正リクエスト送信中... (model: {model})", flush=True)
    resp = requests.post(url, headers=headers, params=params, json=body, timeout=180)
    resp.raise_for_status()
    result = resp.json()

    # レスポンスから画像を抽出
    text_parts = []
    result_image = None
    result_mime = "image/png"

    for candidate in result.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            if "inlineData" in part:
                result_image = base64.b64decode(part["inlineData"]["data"])
                result_mime = part["inlineData"].get("mimeType", "image/png")
            elif "text" in part:
                text_parts.append(part["text"])

    if result_image is None:
        error_msg = json.dumps(result, ensure_ascii=False, indent=2)[:1000]
        raise ValueError(f"修正画像が応答に含まれていません:\n{error_msg}")

    return result_image, result_mime, "\n".join(text_parts)


def resize_to_match(image_data, target_width, target_height):
    """修正後の画像を元のサイズに合わせる"""
    img = Image.open(io.BytesIO(image_data))
    if img.width == target_width and img.height == target_height:
        return image_data

    # カバーフィット + 中央クロップ
    src_ratio = img.width / img.height
    dst_ratio = target_width / target_height

    if src_ratio > dst_ratio:
        new_h = target_height
        new_w = int(img.width * (target_height / img.height))
    else:
        new_w = target_width
        new_h = int(img.height * (target_width / img.width))

    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    left = (new_w - target_width) // 2
    top = (new_h - target_height) // 2
    img = img.crop((left, top, left + target_width, top + target_height))

    output = io.BytesIO()
    img.save(output, format="PNG", optimize=True)
    return output.getvalue()


def main():
    parser = argparse.ArgumentParser(description="Gemini API で画像内テキストを修正")
    parser.add_argument("--image", required=True, help="修正対象の画像パス")
    parser.add_argument("--instruction", required=True, help="修正指示テキスト（直接指定またはファイルパス）")
    parser.add_argument("--output", required=True, help="出力ファイルパス")
    parser.add_argument(
        "--env",
        default=None,
        help=".env ファイルのパス",
    )
    parser.add_argument("--api-key", help="Google API Key")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Gemini モデル名 (default: {DEFAULT_MODEL})")
    args = parser.parse_args()

    # API Key
    api_key = args.api_key or os.environ.get("GOOGLE_API_KEY")
    if not api_key and args.env:
        try:
            env = load_env(args.env)
            api_key = env.get("GOOGLE_API_KEY")
        except FileNotFoundError:
            pass
    if not api_key:
        print("Error: GOOGLE_API_KEY が見つかりません。", file=sys.stderr)
        sys.exit(1)

    # 画像確認
    image_path = Path(args.image)
    if not image_path.exists():
        print(f"Error: 画像ファイルが見つかりません: {image_path}", file=sys.stderr)
        sys.exit(1)

    # 元画像のサイズを取得
    original_img = Image.open(image_path)
    orig_w, orig_h = original_img.size
    original_img.close()

    # 修正指示（ファイルパスならファイルから読み込み）
    instruction_path = Path(args.instruction)
    if instruction_path.exists() and instruction_path.is_file():
        instruction = instruction_path.read_text(encoding="utf-8")
    else:
        instruction = args.instruction

    # バックアップ
    output_path = Path(args.output)
    if output_path.exists() and output_path.resolve() == image_path.resolve():
        backup_name = image_path.stem + "_before_fix" + image_path.suffix
        backup_path = image_path.parent / backup_name
        if not backup_path.exists():
            import shutil
            shutil.copy2(image_path, backup_path)
            print(f"  バックアップ: {backup_path}", flush=True)

    # 修正実行
    result_data, result_mime, ai_text = correct_image_text(
        api_key, str(image_path), instruction, args.model
    )

    # 元サイズに合わせる
    result_data = resize_to_match(result_data, orig_w, orig_h)

    # 保存
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(result_data)
    print(f"  修正完了: {output_path} ({orig_w}x{orig_h}px)", flush=True)

    if ai_text:
        text_path = output_path.parent / (output_path.stem + "_fix_response.txt")
        text_path.write_text(ai_text, encoding="utf-8")
        print(f"  テキスト応答: {text_path}", flush=True)


if __name__ == "__main__":
    main()
