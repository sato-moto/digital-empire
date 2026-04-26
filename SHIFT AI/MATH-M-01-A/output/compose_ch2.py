# -*- coding: utf-8 -*-
# Ch2 動画合成スクリプト
# 画面録画 + アバターPiP合成

import subprocess
import os
import sys

# パス設定
demo = "ch2-demo-trimmed.mp4"
avatar_dir = r"C:\Users\motok\Downloads\実演アバター"
out_dir = "ch2_segments"
os.makedirs(out_dir, exist_ok=True)

def get_duration(path):
    """動画の尺を取得"""
    r = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True, text=True
    )
    return float(r.stdout.strip())

def run_ffmpeg(cmd):
    """ffmpeg実行（エラー時は表示）"""
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  ERROR: {r.stderr[-500:]}")
    return r.returncode == 0

# シーン定義: (avatar_file, video_start_sec, video_end_sec, freeze_type)
scenes = [
    ("avatar_slide1.mp4", None, None, "first"),  # 導入: 冒頭フリーズ
    ("avatar_slide2.mp4", 0, 10, None),           # S1
    ("avatar_slide3.mp4", 10, 30, None),          # S2
    ("avatar_slide4.mp4", 30, 50, None),          # S3
    ("avatar_slide5.mp4", 50, 70, None),          # S4
    ("avatar_slide6.mp4", 70, 97, None),          # S5
    ("avatar_slide7.mp4", None, None, "last"),    # 締め: 末尾フリーズ
]

# アバターのオーバーレイ位置（左下）
# スライドの枠位置に合わせる: x=30, y=690 (1855x920の中)
AV_X = 30
AV_Y = 690
AV_SIZE = 200

# Step 1: 冒頭・末尾のフリーズフレームを事前抽出
print("[PREP] 冒頭フレーム抽出...")
run_ffmpeg(["ffmpeg", "-y", "-i", demo, "-vf", "select=eq(n\\,0)", "-vframes", "1", "-q:v", "1", "freeze_first.jpg"])

print("[PREP] 末尾フレーム抽出...")
run_ffmpeg(["ffmpeg", "-y", "-sseof", "-0.1", "-i", demo, "-vframes", "1", "-q:v", "1", "freeze_last.jpg"])

# Step 2: 各セグメント生成
for i, (avatar_file, vstart, vend, freeze_type) in enumerate(scenes):
    avatar_path = os.path.join(avatar_dir, avatar_file)
    avatar_dur = get_duration(avatar_path)
    seg_out = os.path.join(out_dir, f"seg_{i:02d}.mp4")

    overlay_filter = (
        f"[0:v]fps=25,scale=1856:920:flags=lanczos,format=yuv420p[bg];"
        f"[1:v]scale={AV_SIZE}:{AV_SIZE}:flags=lanczos,format=yuv420p[av];"
        f"[bg][av]overlay={AV_X}:{AV_Y}[out]"
    )

    if freeze_type == "first":
        # 冒頭フリーズ + アバター
        print(f"[{i}] 導入（冒頭フリーズ {avatar_dur:.1f}s）...")
        run_ffmpeg([
            "ffmpeg", "-y",
            "-loop", "1", "-t", str(avatar_dur), "-i", "freeze_first.jpg",
            "-i", avatar_path,
            "-filter_complex", overlay_filter,
            "-map", "[out]", "-map", "1:a",
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "aac", "-b:a", "128k",
            "-shortest",
            seg_out
        ])

    elif freeze_type == "last":
        # 末尾フリーズ + アバター
        print(f"[{i}] 締め（末尾フリーズ {avatar_dur:.1f}s）...")
        run_ffmpeg([
            "ffmpeg", "-y",
            "-loop", "1", "-t", str(avatar_dur), "-i", "freeze_last.jpg",
            "-i", avatar_path,
            "-filter_complex", overlay_filter,
            "-map", "[out]", "-map", "1:a",
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "aac", "-b:a", "128k",
            "-shortest",
            seg_out
        ])

    else:
        # 動画区間 + フリーズ引き延ばし + アバター
        vid_dur = vend - vstart
        freeze_dur = max(0, avatar_dur - vid_dur)

        print(f"[{i}] S{i}（動画{vid_dur}s + フリーズ{freeze_dur:.1f}s = {avatar_dur:.1f}s）...")

        if freeze_dur > 0.5:
            # 動画区間切り出し
            clip_path = os.path.join(out_dir, f"clip_{i:02d}.mp4")
            run_ffmpeg([
                "ffmpeg", "-y", "-ss", str(vstart), "-t", str(vid_dur), "-i", demo,
                "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-an",
                "-pix_fmt", "yuv420p",
                clip_path
            ])

            # 末尾フレーム抽出
            freeze_jpg = os.path.join(out_dir, f"freeze_{i:02d}.jpg")
            run_ffmpeg([
                "ffmpeg", "-y", "-sseof", "-0.1", "-i", clip_path,
                "-vframes", "1", "-q:v", "1", freeze_jpg
            ])

            # フリーズ動画作成
            freeze_mp4 = os.path.join(out_dir, f"freeze_{i:02d}.mp4")
            run_ffmpeg([
                "ffmpeg", "-y", "-loop", "1", "-t", str(freeze_dur),
                "-i", freeze_jpg,
                "-vf", "fps=25",
                "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                "-pix_fmt", "yuv420p",
                freeze_mp4
            ])

            # concat（動画+フリーズ）
            concat_txt = os.path.join(out_dir, f"concat_{i:02d}.txt")
            with open(concat_txt, "w") as f:
                f.write(f"file 'clip_{i:02d}.mp4'\n")
                f.write(f"file 'freeze_{i:02d}.mp4'\n")

            extended_path = os.path.join(out_dir, f"extended_{i:02d}.mp4")
            run_ffmpeg([
                "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", concat_txt,
                "-c", "copy",
                extended_path
            ])

            # アバターオーバーレイ
            run_ffmpeg([
                "ffmpeg", "-y",
                "-i", extended_path,
                "-i", avatar_path,
                "-filter_complex", overlay_filter,
                "-map", "[out]", "-map", "1:a",
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "aac", "-b:a", "128k",
                "-t", str(avatar_dur),
                "-pix_fmt", "yuv420p",
                seg_out
            ])
        else:
            # フリーズ不要（動画区間 >= アバター尺）
            run_ffmpeg([
                "ffmpeg", "-y",
                "-ss", str(vstart), "-t", str(avatar_dur), "-i", demo,
                "-i", avatar_path,
                "-filter_complex", overlay_filter,
                "-map", "[out]", "-map", "1:a",
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "aac", "-b:a", "128k",
                "-shortest",
                seg_out
            ])

# Step 3: 全セグメント結合
print()
print("[FINAL] 全セグメント結合...")
concat_final = os.path.join(out_dir, "concat_final.txt")
with open(concat_final, "w") as f:
    for i in range(len(scenes)):
        f.write(f"file 'seg_{i:02d}.mp4'\n")

final_out = "ch2-final.mp4"
run_ffmpeg([
    "ffmpeg", "-y", "-f", "concat", "-safe", "0",
    "-i", concat_final,
    "-c", "copy",
    final_out
])

if os.path.exists(final_out):
    dur = get_duration(final_out)
    size_mb = os.path.getsize(final_out) / 1024 / 1024
    print(f"\n[DONE] {final_out}")
    print(f"  尺: {dur:.1f}s ({dur/60:.1f}分)")
    print(f"  サイズ: {size_mb:.1f}MB")
else:
    print("\n[FAIL] 合成失敗")
