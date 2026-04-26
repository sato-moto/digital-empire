# -*- coding: utf-8 -*-
"""
テロップ修正版: xlsxの正しいセリフでASS再生成→全シーン再合成→再結合
"""
import openpyxl, re, json, subprocess, os, sys

BASE_DIR = r"C:\Users\motok\OneDrive\Desktop\Claude code\SHIFT AI\MATH-D-04-A"
SCREEN_SRC = r"C:\Users\motok\Videos\2026-04-15 10-27-05.mp4"
AVATAR_DIR = r"C:\Users\motok\Downloads\実演アバター"
TEMPLATE_BG = r"C:\Users\motok\OneDrive\Desktop\Claude code\SHIFT AI\.claude\skills\slide-generator-main\assets\temp.png"
OUTPUT_DIR = os.path.join(BASE_DIR, "04_script", "output")
SCENE_DEF = os.path.join(BASE_DIR, "04_script", "scene-definition.json")
TEMP_ASS_DIR = r"C:\Users\motok\Videos"

# レイアウト定数
CROP_Y, CROP_H, CROP_W = 120, 911, 1920
CONTENT_X, CONTENT_Y, CONTENT_W, CONTENT_H = 88, 56, 1744, 770
AVATAR_X, AVATAR_Y, AVATAR_W, AVATAR_H = 200, 865, 180, 180
TELOP_POS_X, TELOP_POS_Y = 1115, 955

# スクリーンフィット計算
fit_h = CONTENT_H
fit_w = int(fit_h * CROP_W / CROP_H)
if fit_w % 2 != 0:
    fit_w += 1
screen_x = CONTENT_X + (CONTENT_W - fit_w) // 2


def split_phrases(text, max_len=15):
    """句読点ベースで15文字以内に分割"""
    segments = re.split(r"(?<=[。、])", text)
    phrases = []
    for seg in segments:
        seg = seg.strip()
        if not seg:
            continue
        if len(seg) <= max_len:
            phrases.append(seg)
        else:
            while len(seg) > max_len:
                cut = max_len
                for pos in range(min(max_len, len(seg)) - 1, max(max_len - 6, 0), -1):
                    if seg[pos] in "てではがをにのと、。":
                        cut = pos + 1
                        break
                phrases.append(seg[:cut])
                seg = seg[cut:].strip()
            if seg:
                phrases.append(seg)
    return phrases


def time_to_ass(seconds):
    """秒数をASS形式タイムスタンプに変換"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def generate_ass(phrases, duration, output_path):
    """ASSサブタイトルファイルを生成"""
    total_chars = sum(len(p) for p in phrases)
    header = """[Script Info]
Title: MATH-D-04-A Ch2 Telop
ScriptType: v4.00+
WrapStyle: 0
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Telop,Noto Sans JP,60,&H00303030,&H000000FF,&H00FFFFFF,&H80000000,-1,0,1,4,2,5,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = [header]
    current_time = 0.0
    for phrase in phrases:
        phrase_duration = duration * (len(phrase) / total_chars)
        start = time_to_ass(current_time)
        end = time_to_ass(current_time + phrase_duration)
        pos_tag = "{" + f"\\pos({TELOP_POS_X},{TELOP_POS_Y})" + "}"
        line = f"Dialogue: 0,{start},{end},Telop,,0,0,0,,{pos_tag}{phrase}"
        lines.append(line)
        current_time += phrase_duration
    with open(output_path, "w", encoding="utf-8-sig") as f:
        f.write("\n".join(lines))


def build_screen_filter(scene, avatar_dur):
    """シーン定義からスクリーンフィルタとinputを構築"""
    screen_mode = scene["screen_mode"]
    screen_start = scene.get("screen_start", 0)
    screen_end = scene.get("screen_end", 0)

    base_filter = f"crop={CROP_W}:{CROP_H}:0:{CROP_Y},scale={fit_w}:{fit_h}:flags=lanczos"

    if screen_mode == "freeze":
        freeze_at = scene.get("freeze_frame_at", screen_start)
        si = ["-ss", str(freeze_at), "-i", SCREEN_SRC]
        sf = f"[1:v]{base_filter},loop=-1:1:0,setpts=PTS-STARTPTS,trim=duration={avatar_dur},format=yuv420p[screen]"
    elif screen_mode == "slowdown":
        speed = scene.get("speed", 0.5)
        si = ["-ss", str(screen_start), "-t", str(screen_end - screen_start), "-i", SCREEN_SRC]
        setpts = 1.0 / speed
        sf = f"[1:v]{base_filter},setpts={setpts:.2f}*PTS,trim=duration={avatar_dur},format=yuv420p[screen]"
    elif screen_mode == "freeze_then_slow":
        freeze_at = scene.get("freeze_frame_at", screen_start)
        si = ["-ss", str(freeze_at), "-i", SCREEN_SRC]
        sf = f"[1:v]{base_filter},loop={int(avatar_dur * 30)}:1:0,setpts=PTS-STARTPTS,trim=duration={avatar_dur},format=yuv420p[screen]"
    else:  # realtime_with_pause
        seg_dur = screen_end - screen_start
        speed = seg_dur / avatar_dur if seg_dur > 0 and avatar_dur > 0 else 1.0
        setpts = 1.0 / speed if speed > 0 else 1.0
        si = ["-ss", str(screen_start), "-t", str(seg_dur), "-i", SCREEN_SRC]
        sf = f"[1:v]{base_filter},setpts={setpts:.2f}*PTS,trim=duration={avatar_dur},format=yuv420p[screen]"

    return si, sf


def main():
    # xlsxからセリフ読み込み
    wb = openpyxl.load_workbook(os.path.join(BASE_DIR, "04_script", "script-ch2-demo.xlsx"))
    ws = wb.active
    telop_data = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        telop_data.append(split_phrases(str(row[2])))

    # シーン定義読み込み
    with open(SCENE_DEF, "r", encoding="utf-8") as f:
        scenes = json.load(f)["scenes"]

    print("=" * 50)
    print("テロップ修正版 全シーン再合成")
    print("=" * 50)

    scene_outputs = []
    for i, scene in enumerate(scenes):
        sid = scene["id"]
        avatar_path = os.path.join(AVATAR_DIR, scene["avatar"])
        avatar_dur = scene["avatar_duration"]

        # ASS生成（スペースなしパスに配置）
        ass_path = os.path.join(TEMP_ASS_DIR, f"telop_{sid:02d}.ass")
        generate_ass(telop_data[i], avatar_dur, ass_path)
        ass_escaped = ass_path.replace("\\", "/").replace(":", "\\:")

        # スクリーンフィルタ構築
        screen_input, screen_filter = build_screen_filter(scene, avatar_dur)

        # フィルタグラフ
        fc = (
            f"[0:v]fps=30,format=yuv420p[bg];"
            f"{screen_filter};"
            f"[2:v]scale={AVATAR_W}:{AVATAR_H}:flags=lanczos,format=yuva420p[av];"
            f"[bg][screen]overlay={screen_x}:{CONTENT_Y}:shortest=1[tmp1];"
            f"[tmp1][av]overlay={AVATAR_X}:{AVATAR_Y}:shortest=1[tmp2];"
            f"[tmp2]subtitles=filename='{ass_escaped}'[out]"
        )

        output_path = os.path.join(OUTPUT_DIR, f"scene_{sid:02d}.mp4")
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1", "-framerate", "30", "-i", TEMPLATE_BG,
            *screen_input,
            "-i", avatar_path,
            "-filter_complex", fc,
            "-map", "[out]", "-map", "2:a",
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "1",
            "-t", str(avatar_dur), "-pix_fmt", "yuv420p",
            output_path,
        ]

        print(f"Scene {sid}: {scene['scene']} ({avatar_dur:.1f}s)...", end=" ")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode == 0:
            print("OK")
            scene_outputs.append(output_path)
        else:
            err_lines = result.stderr.strip().split("\n")
            print(f"FAIL: {err_lines[-1] if err_lines else 'unknown'}")
            continue

    # 再結合（OP 4秒版 + 全シーン）
    print(f"\n結合中... ({len(scene_outputs)} scenes)")
    concat_file = os.path.join(OUTPUT_DIR, "concat.txt")
    with open(concat_file, "w", encoding="utf-8") as f:
        f.write(f"file '{os.path.join(OUTPUT_DIR, 'op_converted.mp4')}'\n")
        for p in scene_outputs:
            f.write(f"file '{p}'\n")

    final_output = os.path.join(OUTPUT_DIR, "ch2-demo-final.mp4")
    result = subprocess.run(
        [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_file,
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "1",
            "-pix_fmt", "yuv420p", final_output,
        ],
        capture_output=True, text=True, timeout=600,
    )

    if result.returncode == 0:
        # 最終ファイル情報
        size = os.path.getsize(final_output)
        print(f"\n完了: {final_output}")
        print(f"サイズ: {size / 1024 / 1024:.1f} MB")
    else:
        print(f"結合失敗: {result.stderr[-300:]}")


if __name__ == "__main__":
    main()
