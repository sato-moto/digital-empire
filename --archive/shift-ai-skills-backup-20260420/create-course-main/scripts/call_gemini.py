#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Gemini API 呼び出しスクリプト（google.genai 版）
Usage:
    python call_gemini.py --prompt <prompt_file> --output <output_file>
    python call_gemini.py --prompt <prompt_file> --output <output_file> --merge <f1> <f2> ...
"""
import argparse
import os
import sys
import time
from pathlib import Path


def load_env(env_path: str | None = None):
    paths = [
        env_path,
        Path(__file__).resolve().parent.parent / ".env",
        Path.cwd() / ".env",
    ]
    for p in paths:
        if p and Path(p).exists():
            with open(p, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip())
            return
    print("[WARN] .env not found", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description="Call Gemini API")
    parser.add_argument("--prompt", required=True, help="Path to prompt file")
    parser.add_argument("--output", required=True, help="Path to output file")
    parser.add_argument("--merge", nargs="*", help="Additional files to merge into prompt")
    parser.add_argument("--env", default=None, help="Path to .env file")
    parser.add_argument("--model", default="gemini-3.1-pro-preview", help="Model name")
    parser.add_argument("--max-retries", type=int, default=3, help="Max retries")
    args = parser.parse_args()

    load_env(args.env)

    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("[ERROR] GOOGLE_API_KEY が設定されていません。.env ファイルにAPIキーを設定してください（.env.example を参考）", file=sys.stderr)
        sys.exit(1)

    from google import genai

    client = genai.Client(api_key=api_key)

    # プロンプト読み込み
    prompt_text = Path(args.prompt).read_text(encoding="utf-8")

    # --merge: 追加ファイルの内容をプロンプトに結合
    if args.merge:
        merge_parts = []
        for i, fpath in enumerate(args.merge, 1):
            content = Path(fpath).read_text(encoding="utf-8")
            merge_parts.append(f"--- 入力 {i}: {Path(fpath).name} ---\n{content}")
        prompt_text += "\n\n" + "\n\n".join(merge_parts)

    # API 呼び出し（リトライ付き）
    response_text = None

    for attempt in range(1, args.max_retries + 1):
        try:
            response = client.models.generate_content(
                model=args.model,
                contents=prompt_text,
            )
            response_text = response.text
            break
        except Exception as e:
            print(f"[WARN] Attempt {attempt}/{args.max_retries} failed: {e}", file=sys.stderr)
            if attempt < args.max_retries:
                time.sleep(5 * attempt)
            else:
                print(f"[ERROR] All {args.max_retries} attempts failed", file=sys.stderr)
                sys.exit(1)

    # 出力（UTF-8 BOM）
    os.makedirs(Path(args.output).parent, exist_ok=True)
    with open(args.output, "w", encoding="utf-8-sig") as f:
        f.write(response_text)

    print(f"[OK] Output saved to {args.output} ({len(response_text)} chars)")


if __name__ == "__main__":
    main()
