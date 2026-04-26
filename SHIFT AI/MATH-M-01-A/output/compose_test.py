# -*- coding: utf-8 -*-
# video-composerスキル テスト実行
# レイアウト定数は全てSKILL.mdの確定値を使用

import subprocess
import os

# === パス設定 ===
DEMO_RAW = r"C:\Users\motok\Videos\2026-04-14 16-05-56.mp4"
AVATAR_DIR = r"C:\Users\motok\Downloads\テスト実演アバター"
SKILL_ROOT = r"C:\Users\motok\OneDrive\Desktop\Claude code\SHIFT AI\.claude\skills"
TEMPLATE = os.path.join(SKILL_ROOT, "slide-generator-main", "assets", "temp.png")
OPENING = os.path.join(SKILL_ROOT, "video-composer-main", "assets", "opening.mp4")
OUT_DIR = "test_compose"
os.makedirs(OUT_DIR, exist_ok=True)

# === レイアウト定数（SKILL.md確定値）===
SCREEN_OVERLAY = (184, 56)
SCREEN_SCALE = (1552, 770)
AVATAR_OVERLAY = (200, 865)
AVATAR_SCALE = (180, 180)
TELOP_POS = (1115, 955)

# クロップ（操作画面）
CROP_X, CROP_Y = 0, 120
CROP_W, CROP_H = 1920, 960

# === シーン定義 ===
SCENES = [
    ("avatar_slide1.mp4", None, None, "first"),   # 導入
    ("avatar_slide2.mp4", 0, 25, None),            # 中盤
    ("avatar_slide3.mp4", 25, 63, None),           # 締め
]

# === テロップ（台本フレーズ分割）===
SCRIPTS = [
    [
        "ここでは実際にChatGPTを使って",
        "AIエージェント開発に出てくる\n用語を壁打ちしている画面を見せる",
        "MCP、CLI、Larkなど\n聞き慣れない言葉が並んでいるが",
        "AIに聞けば一つずつ\n噛み砕いて説明してくれる",
    ],
    [
        "画面を見てほしい",
        "「CLIツールって何？」と聞いたら",
        "「コマンドで操作するための\n道具一式」と一言でまとめてくれた",
        "さらに「黒い画面で動かすアプリ\n＝CLIツール」という\n直感的な例えまで出してくれている",
        "難しそうに見える概念でも\n聞き方次第で\nここまでシンプルになる",
    ],
    [
        "EC2やBashといった\n実務寄りの用語も\n同じ流れで壁打ちしている",
        "「なぜEC2が必要か」を聞いたら",
        "「自分のPCだと止まるから」\nという身も蓋もない回答が返ってきた",
        "このレベルまで噛み砕いてくれるのが\nAIの強みだ",
        "わからない用語に出会ったら\nまず聞いてみる",
        "それだけで前に進める",
    ],
]


def get_duration(path):
    r = subprocess.run(["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                       capture_output=True, text=True)
    return float(r.stdout.strip())


def run_ffmpeg(cmd, label=""):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  ERROR ({label}): {r.stderr[-300:]}")
    return r.returncode == 0


def generate_ass(idx, dur, phrases):
    ass_path = os.path.join(OUT_DIR, f"telop_{idx:02d}.ass")
    char_counts = [len(p.replace("\n", "")) for p in phrases]
    total_chars = sum(char_counts)
    lines = [
        "[Script Info]", "ScriptType: v4.00+", "PlayResX: 1920", "PlayResY: 1080", "WrapStyle: 0", "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        "Style: Telop,Noto Sans JP,60,&H00303030,&H000000FF,&H00FFFFFF,&H80000000,-1,0,0,0,100,100,0,0,1,4,2,5,0,0,0,1",
        "", "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    cumulative = 0
    for i, phrase in enumerate(phrases):
        phrase_dur = dur * char_counts[i] / total_chars
        start, end = cumulative, cumulative + phrase_dur
        cumulative = end
        h1, m1, s1 = int(start//3600), int((start%3600)//60), start%60
        h2, m2, s2 = int(end//3600), int((end%3600)//60), end%60
        ass_text = phrase.replace("\n", "\\N")
        lines.append(f"Dialogue: 0,{h1}:{m1:02d}:{s1:05.2f},{h2}:{m2:02d}:{s2:05.2f},Telop,,0,0,0,,{{\\pos({TELOP_POS[0]},{TELOP_POS[1]})}}{ass_text}")
    with open(ass_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return ass_path


# === Phase 1: 素材準備 ===
print("=" * 60)
print("video-composer スキルテスト実行")
print("=" * 60)

print("\n[Phase 1] 操作画面クロップ...")
demo_cropped = os.path.join(OUT_DIR, "demo_cropped.mp4")
run_ffmpeg(["ffmpeg", "-y", "-i", DEMO_RAW,
            "-vf", f"crop={CROP_W}:{CROP_H}:{CROP_X}:{CROP_Y}",
            "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-an", demo_cropped])

freeze_first = os.path.join(OUT_DIR, "freeze_first.jpg")
freeze_last = os.path.join(OUT_DIR, "freeze_last.jpg")
run_ffmpeg(["ffmpeg", "-y", "-i", demo_cropped, "-vf", r"select=eq(n\,0)", "-vframes", "1", "-q:v", "1", freeze_first])
run_ffmpeg(["ffmpeg", "-y", "-sseof", "-0.1", "-i", demo_cropped, "-vframes", "1", "-q:v", "1", freeze_last])

# 操作画面フィットサイズ（アスペクト比維持、高さ770基準）
fit_w = int(SCREEN_SCALE[1] * CROP_W / CROP_H)
fit_w = fit_w if fit_w % 2 == 0 else fit_w + 1
screen_x = 88 + (1744 - fit_w) // 2

print(f"  操作画面スケール: {fit_w}x{SCREEN_SCALE[1]}, overlay=({screen_x}, {SCREEN_OVERLAY[1]})")

# === Phase 2-3: シーン合成 ===
for i, (avatar_file, vstart, vend, freeze_type) in enumerate(SCENES):
    avatar_path = os.path.join(AVATAR_DIR, avatar_file)
    avatar_dur = get_duration(avatar_path)
    seg_out = os.path.join(OUT_DIR, f"seg_{i:02d}.mp4")
    ass_path = generate_ass(i, avatar_dur, SCRIPTS[i])

    if freeze_type == "first":
        print(f"\n[Phase 3] S{i} 導入（フリーズ {avatar_dur:.1f}s）...")
        screen_args = ["-loop", "1", "-t", str(avatar_dur), "-i", freeze_first]
    else:
        vid_dur = vend - vstart
        freeze_dur = max(0, avatar_dur - vid_dur)
        print(f"\n[Phase 3] S{i}（動画{vid_dur}s + フリーズ{freeze_dur:.1f}s = {avatar_dur:.1f}s）...")

        clip = os.path.join(OUT_DIR, f"clip_{i:02d}.mp4")
        run_ffmpeg(["ffmpeg", "-y", "-ss", str(vstart), "-t", str(vid_dur), "-i", demo_cropped,
                    "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-an", clip])

        if freeze_dur > 0.5:
            clip_freeze = os.path.join(OUT_DIR, f"clip_freeze_{i:02d}.jpg")
            run_ffmpeg(["ffmpeg", "-y", "-sseof", "-0.1", "-i", clip, "-vframes", "1", "-q:v", "1", clip_freeze])
            freeze_vid = os.path.join(OUT_DIR, f"freeze_vid_{i:02d}.mp4")
            run_ffmpeg(["ffmpeg", "-y", "-loop", "1", "-t", str(freeze_dur), "-i", clip_freeze,
                        "-vf", "fps=30", "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p", freeze_vid])
            concat_txt = os.path.join(OUT_DIR, f"concat_{i:02d}.txt")
            with open(concat_txt, "w") as f:
                f.write(f"file '{os.path.basename(clip)}'\nfile '{os.path.basename(freeze_vid)}'\n")
            extended = os.path.join(OUT_DIR, f"extended_{i:02d}.mp4")
            run_ffmpeg(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_txt, "-c", "copy", extended])
            screen_args = ["-i", extended]
        else:
            screen_args = ["-ss", str(vstart), "-t", str(avatar_dur), "-i", demo_cropped]

    filter_complex = (
        f"[0:v]fps=30,format=yuv420p[bg];"
        f"[1:v]scale={fit_w}:{SCREEN_SCALE[1]}:flags=lanczos,format=yuv420p[screen];"
        f"[2:v]scale={AVATAR_SCALE[0]}:{AVATAR_SCALE[1]}:flags=lanczos,format=yuv420p[av];"
        f"[bg][screen]overlay={screen_x}:{SCREEN_OVERLAY[1]}[tmp1];"
        f"[tmp1][av]overlay={AVATAR_OVERLAY[0]}:{AVATAR_OVERLAY[1]}[tmp2];"
        f"[tmp2]ass={ass_path.replace(os.sep, '/')}[out]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-t", str(avatar_dur), "-i", TEMPLATE,
        *screen_args, "-i", avatar_path,
        "-filter_complex", filter_complex,
        "-map", "[out]", "-map", "2:a",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-t", str(avatar_dur), seg_out
    ]
    run_ffmpeg(cmd, f"seg_{i}")

    # 音声差し替え（アバター元ファイルから直接）
    tmp = os.path.join(OUT_DIR, f"seg_{i:02d}_tmp.mp4")
    run_ffmpeg(["ffmpeg", "-y", "-i", seg_out, "-i", avatar_path,
                "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy", tmp])
    os.replace(tmp, seg_out)
    print(f"  → {'OK' if os.path.exists(seg_out) else 'FAILED'}")

# === Phase 4: OP + 結合 ===
print("\n[Phase 4] OP + 全セグメント結合...")

# OP再エンコード（音声スペック統一）
op_reenc = os.path.join(OUT_DIR, "op_reenc.mp4")
run_ffmpeg([
    "ffmpeg", "-y", "-i", OPENING, "-t", "4",
    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
    "-vf", "fps=30,scale=1920:1080",
    "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "1",
    "-pix_fmt", "yuv420p", op_reenc
])

concat_final = os.path.join(OUT_DIR, "concat_final.txt")
with open(concat_final, "w") as f:
    f.write(f"file '{os.path.basename(op_reenc)}'\n")
    for i in range(len(SCENES)):
        f.write(f"file 'seg_{i:02d}.mp4'\n")

final_out = "test-final.mp4"
run_ffmpeg([
    "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_final,
    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
    "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "1",
    final_out
], "final")

# === Phase 5: 品質検証 ===
if os.path.exists(final_out):
    dur = get_duration(final_out)
    size_mb = os.path.getsize(final_out) / 1024 / 1024
    print(f"\n[Phase 5] 品質検証...")

    # アバター枠内検証（3ポイント）
    for t in [8, 30, 50]:
        run_ffmpeg([
            "ffmpeg", "-y", "-ss", str(t), "-i", final_out,
            "-vf", "crop=300:280:100:820", "-vframes", "1", "-q:v", "1",
            os.path.join(OUT_DIR, f"verify_avatar_{t}s.jpg")
        ])

    # テロップ検証（3ポイント）
    for t in [8, 30, 50]:
        run_ffmpeg([
            "ffmpeg", "-y", "-ss", str(t), "-i", final_out,
            "-vf", "crop=1500:250:300:830", "-vframes", "1", "-q:v", "1",
            os.path.join(OUT_DIR, f"verify_telop_{t}s.jpg")
        ])

    print(f"\n{'='*60}")
    print(f"[DONE] {final_out}")
    print(f"  尺: {dur:.1f}s ({dur/60:.1f}分)")
    print(f"  サイズ: {size_mb:.1f}MB")
    print(f"  検証画像: {OUT_DIR}/verify_*.jpg")
    print(f"{'='*60}")
else:
    print("\n[FAIL] 合成失敗")
