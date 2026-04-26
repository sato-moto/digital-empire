# -*- coding: utf-8 -*-
# seg_01〜seg_06をseg_00と同じテロップ仕様で再生成
# テロップ: 60pt, #303030, 縁取り4px #FFFFFF, 影あり, Alignment=5, \pos(1115,955)

import subprocess
import os

AVATAR_DIR = r"C:\Users\motok\Downloads\実演アバター"
TEMPLATE = r"C:\Users\motok\OneDrive\Desktop\Claude code\SHIFT AI\.claude\skills\slide-generator-main\assets\temp.png"
OUT_DIR = "ch2_v3"
DEMO_CROPPED = os.path.join(OUT_DIR, "demo_cropped.mp4")

AV_X, AV_Y, AV_W, AV_H = 200, 865, 180, 180
CONTENT_Y = 56
fit_w = 1552
screen_x = 184

SCENES = [
    # (idx, avatar, vstart, vend, freeze_type)
    (1, "avatar_slide2.mp4", 0, 10, None),
    (2, "avatar_slide3.mp4", 10, 30, None),
    (3, "avatar_slide4.mp4", 30, 50, None),
    (4, "avatar_slide5.mp4", 50, 70, None),
    (5, "avatar_slide6.mp4", 70, 97, None),
    (6, "avatar_slide7.mp4", None, None, "last"),
]

SCRIPTS = [
    # S2
    [
        "まず最初に\n「数学について壁打ちさせて」と\nジェミニに声をかけている",
        "ジェミニは\n「何でも聞いていいよ」と返してきた",
        "ここで投げたのが\n「マイナスの数字同士を掛け算すると\nなぜプラスになるの？？」だ",
        "これがパターン1",
        "「なぜ？」を直球で聞いている",
        "答えだけを求めるのではなく\n仕組みを聞いている点に注目してほしい",
    ],
    # S3
    [
        "ジェミニは複数の角度から\n仕組みを説明してくれた",
        "借金の例え\n数直線の向き\n時間の巻き戻し",
        "1回のプロンプトで\nこれだけ出てくる",
        "ただ ここで大事なのは\n「全部わかった」で終わらないことだ",
        "借金の例えはよく使われるけど\n中学生にはピンとこないこともある",
        "だから次のプロンプトを投げる",
    ],
    # S4
    [
        "ここで「借金以外の\nたとえ話を出して。」と質問してみる",
        "自分がわかりにくかった説明を伝えて\n別の角度をリクエストしている",
        "ジェミニは「ビデオの再生」と\n「キャラクターの動き」で\n説明し直してくれた",
        "「後ろ向きに歩いている人の映像を\n巻き戻すと\n前に歩いているように見える」",
        "これは直感的にわかりやすい",
        "角度を変えるだけで\n刺さる説明が見つかる",
    ],
    # S5
    [
        "もう一段\n「中学生にもわかるように\n簡単に説明して」と聞き直した",
        "ジェミニはトランプと\n動画の巻き戻しに絞って\nさらにシンプルにしてくれた",
        "ここまで読んで\n「あ つまりこういうことか」と\n自分なりの理解が浮かんだ",
        "「つまりマイナスを掛けるということは\n真逆の方向に向いて進む\nということ？」と聞いてみる",
        "自分の理解をぶつけて\n合っているかAIに検証してもらっている",
    ],
    # S6
    [
        "ジェミニは「大正解」と返した",
        "さらに数直線を使って\n自分の理解が正しいことを\n視覚的に検証してくれている",
        "ここでもう一度\n自分の言葉で確認を入れた",
        "「マイナスの逆方向に進むから\nプラスになるということ？」",
        "ジェミニは「その通り」と返し\n「マイナスを掛ける＝\n今の状態をひっくり返す」とまとめた",
        "これで壁打ち完了だ",
        "「なぜ？」で仕組みを聞き\n角度を変えた質問と\n自分の理解を検証した",
        "この流れで\n「マイナス×マイナス＝プラス」の\n仕組みが自分のものになった",
        "暗記だとその場限りの記憶だが\n理解することで\nさらにその先の学習に繋げることができる",
    ],
    # S7
    [
        "今のやり取り\nほとんど時間はかかっていない",
        "たったそれだけで\n暗記していただけのルールが",
        "「なるほど そういう仕組みか」に\n変わった",
        "これが3つの\nプロンプトパターンの力だ",
        "でも一つ問題がある",
        "今のやり取り\nどこに残っている？",
        "このチャット欄の履歴を見返せば\n見つかるかもしれないけど\n整理されてはいない",
        "テスト前に\n「あのとき納得した説明\nどこだっけ」と探し回ることになる",
        "次の章では\nこの問題を解決する方法を見せる",
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


def generate_ass(scene_idx, avatar_dur, phrases):
    ass_path = os.path.join(OUT_DIR, f"telop_{scene_idx:02d}.ass")
    char_counts = [len(p.replace("\n", "")) for p in phrases]
    total_chars = sum(char_counts)
    lines = []
    lines.append("[Script Info]")
    lines.append("ScriptType: v4.00+")
    lines.append("PlayResX: 1920")
    lines.append("PlayResY: 1080")
    lines.append("WrapStyle: 0")
    lines.append("")
    lines.append("[V4+ Styles]")
    lines.append("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding")
    lines.append("Style: Telop,Noto Sans JP,60,&H00303030,&H000000FF,&H00FFFFFF,&H80000000,-1,0,0,0,100,100,0,0,1,4,2,5,0,0,0,1")
    lines.append("")
    lines.append("[Events]")
    lines.append("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text")
    cumulative = 0
    for i, phrase in enumerate(phrases):
        phrase_dur = avatar_dur * char_counts[i] / total_chars
        start = cumulative
        end = cumulative + phrase_dur
        cumulative = end
        h1, m1, s1 = int(start // 3600), int((start % 3600) // 60), start % 60
        h2, m2, s2 = int(end // 3600), int((end % 3600) // 60), end % 60
        ass_text = phrase.replace("\n", "\\N")
        lines.append(f"Dialogue: 0,{h1}:{m1:02d}:{s1:05.2f},{h2}:{m2:02d}:{s2:05.2f},Telop,,0,0,0,,{{\\pos(1115,955)}}{ass_text}")
    with open(ass_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return ass_path


# メイン
for scene_data, script in zip(SCENES, SCRIPTS):
    idx, avatar_file, vstart, vend, freeze_type = scene_data
    avatar_path = os.path.join(AVATAR_DIR, avatar_file)
    avatar_dur = get_duration(avatar_path)
    seg_out = os.path.join(OUT_DIR, f"seg_{idx:02d}.mp4")
    ass_path = generate_ass(idx, avatar_dur, script)

    if freeze_type == "last":
        print(f"[{idx}] 締め（フリーズ {avatar_dur:.1f}s）...")
        screen_args = ["-loop", "1", "-t", str(avatar_dur), "-i", os.path.join(OUT_DIR, "freeze_last.jpg")]
    else:
        vid_dur = vend - vstart
        freeze_dur = max(0, avatar_dur - vid_dur)
        print(f"[{idx}] S{idx}（動画{vid_dur}s + フリーズ{freeze_dur:.1f}s = {avatar_dur:.1f}s）...")

        clip = os.path.join(OUT_DIR, f"clip_{idx:02d}.mp4")
        run_ffmpeg(["ffmpeg", "-y", "-ss", str(vstart), "-t", str(vid_dur), "-i", DEMO_CROPPED,
                    "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-an", clip])

        if freeze_dur > 0.5:
            clip_freeze = os.path.join(OUT_DIR, f"clip_freeze_{idx:02d}.jpg")
            run_ffmpeg(["ffmpeg", "-y", "-sseof", "-0.1", "-i", clip, "-vframes", "1", "-q:v", "1", clip_freeze])
            freeze_vid = os.path.join(OUT_DIR, f"freeze_vid_{idx:02d}.mp4")
            run_ffmpeg(["ffmpeg", "-y", "-loop", "1", "-t", str(freeze_dur), "-i", clip_freeze,
                        "-vf", "fps=30", "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p", freeze_vid])
            concat_txt = os.path.join(OUT_DIR, f"concat_{idx:02d}.txt")
            with open(concat_txt, "w") as f:
                f.write(f"file '{os.path.basename(clip)}'\nfile '{os.path.basename(freeze_vid)}'\n")
            extended = os.path.join(OUT_DIR, f"extended_{idx:02d}.mp4")
            run_ffmpeg(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_txt, "-c", "copy", extended])
            screen_args = ["-i", extended]
        else:
            screen_args = ["-ss", str(vstart), "-t", str(avatar_dur), "-i", DEMO_CROPPED]

    filter_complex = (
        f"[0:v]fps=30,format=yuv420p[bg];"
        f"[1:v]scale={fit_w}:770:flags=lanczos,format=yuv420p[screen];"
        f"[2:v]scale={AV_W}:{AV_H}:flags=lanczos,format=yuv420p[av];"
        f"[bg][screen]overlay={screen_x}:{CONTENT_Y}[tmp1];"
        f"[tmp1][av]overlay={AV_X}:{AV_Y}[tmp2];"
        f"[tmp2]ass={ass_path.replace(os.sep, '/')}[out]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-t", str(avatar_dur), "-i", TEMPLATE,
        *screen_args,
        "-i", avatar_path,
        "-filter_complex", filter_complex,
        "-map", "[out]", "-map", "2:a",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-t", str(avatar_dur),
        seg_out
    ]
    run_ffmpeg(cmd, f"seg_{idx}")
    print(f"  → {'OK' if os.path.exists(seg_out) else 'FAILED'}")

print("\n全セグメント完了")
