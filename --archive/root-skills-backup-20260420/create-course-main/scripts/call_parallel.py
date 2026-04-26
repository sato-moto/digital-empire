#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Gemini + OpenAI 並列呼び出しスクリプト
Usage:
    python call_parallel.py --prompt <prompt_file> --gemini-output <file> --openai-output <file>
    python call_parallel.py --prompt <prompt_file> --gemini-output <file> --openai-output <file> --merge <f1> <f2> ...
"""
import argparse
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
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


def build_prompt(prompt_path: str, merge_files: list[str] | None) -> str:
    prompt_text = Path(prompt_path).read_text(encoding="utf-8")
    if merge_files:
        merge_parts = []
        for i, fpath in enumerate(merge_files, 1):
            content = Path(fpath).read_text(encoding="utf-8")
            merge_parts.append(f"--- 入力 {i}: {Path(fpath).name} ---\n{content}")
        prompt_text += "\n\n" + "\n\n".join(merge_parts)
    return prompt_text


def call_gemini(prompt_text: str, output_path: str, model: str, max_retries: int) -> dict:
    try:
        from google import genai
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            return {"api": "Gemini", "success": False, "error": "GOOGLE_API_KEY not set"}

        client = genai.Client(api_key=api_key)
        for attempt in range(1, max_retries + 1):
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt_text,
                )
                response_text = response.text
                os.makedirs(Path(output_path).parent, exist_ok=True)
                with open(output_path, "w", encoding="utf-8-sig") as f:
                    f.write(response_text)
                return {"api": "Gemini", "success": True, "chars": len(response_text)}
            except Exception as e:
                print(f"[WARN] Gemini attempt {attempt}/{max_retries} failed: {e}", file=sys.stderr)
                if attempt < max_retries:
                    time.sleep(5 * attempt)
        return {"api": "Gemini", "success": False, "error": f"All {max_retries} attempts failed"}
    except Exception as e:
        return {"api": "Gemini", "success": False, "error": str(e)}


def call_openai(prompt_text: str, output_path: str, model: str, max_retries: int) -> dict:
    try:
        from openai import OpenAI
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return {"api": "OpenAI", "success": False, "error": "OPENAI_API_KEY not set"}

        # OpenRouter経由の場合はbase_urlを設定
        base_url = os.environ.get("OPENAI_BASE_URL")
        client_kwargs = {"api_key": api_key}
        if base_url:
            client_kwargs["base_url"] = base_url
        client = OpenAI(**client_kwargs)
        for attempt in range(1, max_retries + 1):
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt_text}],
                )
                response_text = response.choices[0].message.content
                os.makedirs(Path(output_path).parent, exist_ok=True)
                with open(output_path, "w", encoding="utf-8-sig") as f:
                    f.write(response_text)
                return {"api": "OpenAI", "success": True, "chars": len(response_text)}
            except Exception as e:
                print(f"[WARN] OpenAI attempt {attempt}/{max_retries} failed: {e}", file=sys.stderr)
                if attempt < max_retries:
                    time.sleep(5 * attempt)
        return {"api": "OpenAI", "success": False, "error": f"All {max_retries} attempts failed"}
    except Exception as e:
        return {"api": "OpenAI", "success": False, "error": str(e)}


def main():
    parser = argparse.ArgumentParser(description="Call Gemini + OpenAI in parallel")
    parser.add_argument("--prompt", required=True, help="Path to prompt file")
    parser.add_argument("--gemini-output", required=True, help="Path to Gemini output file")
    parser.add_argument("--openai-output", required=True, help="Path to OpenAI output file")
    parser.add_argument("--merge", nargs="*", help="Additional files to merge into prompt")
    parser.add_argument("--env", default=None, help="Path to .env file")
    parser.add_argument("--gemini-model", default="gemini-3.1-pro-preview", help="Gemini model name")
    parser.add_argument("--openai-model", default="openai/gpt-4o", help="OpenAI model name (OpenRouter format: openai/gpt-4o)")
    parser.add_argument("--max-retries", type=int, default=3, help="Max retries per API")
    args = parser.parse_args()

    load_env(args.env)

    # APIキーの存在チェック（未設定なら即座にエラー停止）
    missing_keys = []
    if not os.environ.get("GOOGLE_API_KEY"):
        missing_keys.append("GOOGLE_API_KEY")
    if not os.environ.get("OPENAI_API_KEY"):
        missing_keys.append("OPENAI_API_KEY")
    if missing_keys:
        print(f"[ERROR] 以下のAPIキーが設定されていません: {', '.join(missing_keys)}", file=sys.stderr)
        print(f"[ERROR] .env ファイルにAPIキーを設定してください（.env.example を参考）", file=sys.stderr)
        sys.exit(1)

    prompt_text = build_prompt(args.prompt, args.merge)

    print(f"[INFO] Starting parallel API calls (Gemini + OpenAI)...", file=sys.stderr)

    results = []
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {
            executor.submit(call_gemini, prompt_text, args.gemini_output, args.gemini_model, args.max_retries): "Gemini",
            executor.submit(call_openai, prompt_text, args.openai_output, args.openai_model, args.max_retries): "OpenAI",
        }
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            if result["success"]:
                print(f"[OK] {result['api']}: {result['chars']} chars", file=sys.stderr)
            else:
                print(f"[ERROR] {result['api']}: {result['error']}", file=sys.stderr)

    # 両方失敗した場合のみ exit 1
    if all(not r["success"] for r in results):
        print("[ERROR] Both API calls failed", file=sys.stderr)
        sys.exit(1)

    failed = [r for r in results if not r["success"]]
    if failed:
        print(f"[WARN] {failed[0]['api']} failed, but continuing with the other result", file=sys.stderr)

    print("[OK] Parallel execution complete", file=sys.stderr)


if __name__ == "__main__":
    main()
