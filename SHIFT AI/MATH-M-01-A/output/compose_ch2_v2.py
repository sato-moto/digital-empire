# -*- coding: utf-8 -*-
# Ch2 動画合成スクリプト v2
# 見本動画の解析結果に基づく正しいアプローチ:
# 1. スライドテンプレート + 操作画面 → ベース映像
# 2. アバターを左下枠内にオーバーレイ
# 3. テロップを下部バー中央に表示（大きめ太字、即切り替え）

import subprocess
import os
import json

# === パス設定 ===
DEMO_RAW = r"C:\Users\motok\Videos\2026-04-13 09-12-07.mp4"
AVATAR_DIR = r"C:\Users\motok\Downloads\実演アバター"
TEMPLATE = r"C:\Users\motok\OneDrive\Desktop\Claude code\SHIFT AI\.claude\skills\slide-generator-main\assets\temp.png"
OUT_DIR = "ch2_v2"
os.makedirs(OUT_DIR, exist_ok=True)

# === レイアウト定数（1920x1080テンプレート基準）===
# コンテンツエリア（操作画面の配置先）
# 見本動画から: スライドのメインエリアいっぱいに表示
CONTENT_X = 88
CONTENT_Y = 56
CONTENT_W = 1744
CONTENT_H = 770

# アバター枠（左下の白枠内）
AV_X = 175
AV_Y = 870
AV_W = 135
AV_H = 135

# テロップ（下部バー内、アバター右端〜右端の中央）
# 見本動画から: 大きめフォント、中央揃え、1行表示
TELOP_CENTER_X = 1050  # (310 + 1790) / 2 ≈ アバター右端〜右端の中央
TELOP_CENTER_Y = 940   # バーの垂直中央やや上

# 操作画面のクロップ（ブラウザUI除去）
CROP_X = 0
CROP_Y = 120
CROP_W = 1855
CROP_H = 920

# === シーン定義 ===
# (avatar_file, demo_start_sec, demo_end_sec, freeze_type)
SCENES = [
    ("avatar_slide1.mp4", None, None, "first"),   # 導入
    ("avatar_slide2.mp4", 0, 10, None),           # S1
    ("avatar_slide3.mp4", 10, 30, None),          # S2
    ("avatar_slide4.mp4", 30, 50, None),          # S3
    ("avatar_slide5.mp4", 50, 70, None),          # S4
    ("avatar_slide6.mp4", 70, 97, None),          # S5
    ("avatar_slide7.mp4", None, None, "last"),    # 締め
]

# === テロップ（台本からフレーズ分割）===
# 見本動画のテロップは短いフレーズで即切り替え
SCRIPTS = [
    # Scene 0: 導入
    [
        "ここからは実演だ",
        "前の章で学んだ\n3つのプロンプトパターンを",
        "実際にGeminiで使っている\n画面を見せる",
        "テーマは\n「マイナス×マイナスは\nなぜプラスになるのか」",
        "暗記で済ませている人が\n最も多い計算ルールの一つだ",
        "これをAIにどう聞けば\n仕組みが引き出せるのか",
        "リアルなやり取りを\n見てほしい",
    ],
    # Scene 1: 壁打ち開始 P1
    [
        "まず最初に\n「数学について壁打ちさせて」と\nGeminiに声をかけている",
        "Geminiは\n「何でも聞いていいよ」と返してきた",
        "ここで投げたのが\n「マイナスの数字同士を掛け算すると\nなぜプラスになるの？？」だ",
        "これがパターン1",
        "「なぜ？」を直球で聞いている",
        "答えだけを求めるのではなく\n仕組みを聞いている点に注目してほしい",
    ],
    # Scene 2: P1回答確認
    [
        "Geminiは複数の角度から\n仕組みを説明してくれた",
        "借金の例え\n数直線の向き\n時間の巻き戻し",
        "1回のプロンプトで\nこれだけ出てくる",
        "ただ ここで大事なのは\n「全部わかった」で終わらないことだ",
        "借金の例えはよく使われるけど\n中学生にはピンとこないこともある",
        "だから次のプロンプトを投げる",
    ],
    # Scene 3: P2実行
    [
        "ここでパターン2を使った",
        "「借金以外のたとえ話を出して」\nこれだけだ",
        "自分がわかりにくかった説明を伝えて\n別の角度をリクエストしている",
        "Geminiは「ビデオの再生」と\n「キャラクターの動き」で\n説明し直してくれた",
        "「後ろ向きに歩いている人の映像を\n巻き戻すと\n前に歩いているように見える」",
        "これは直感的にわかりやすい\nパターン2の力だ",
        "角度を変えるだけで\n刺さる説明が見つかる",
    ],
    # Scene 4: P2深掘り→P3
    [
        "もう一段 パターン2で\n「中学生にもわかるように\n簡単に説明して」と聞き直した",
        "Geminiはトランプと\n動画の巻き戻しに絞って\nさらにシンプルにしてくれた",
        "ここまで読んで\n「あ つまりこういうことか」と\n自分なりの理解が浮かんだ",
        "そこで出したのがパターン3だ",
        "「つまりマイナスを掛けるということは\n真逆の方向に向いて進む\nということ？」",
        "自分の理解をぶつけて\n合っているかAIに検証してもらっている",
    ],
    # Scene 5: P3検証+完了
    [
        "Geminiは「大正解」と返した",
        "さらに数直線を使って\n自分の理解が正しいことを\n視覚的に検証してくれている",
        "ここでもう一度\n自分の言葉で確認を入れた",
        "「マイナスの逆方向に進むから\nプラスになるということ？」",
        "Geminiは「その通り」と返し\n「マイナスを掛ける＝\n今の状態をひっくり返す」とまとめた",
        "これで壁打ち完了だ",
        "パターン1で仕組みを聞き\nパターン2で角度を変え\nパターン3で自分の理解を検証した",
        "この流れで\n「マイナス×マイナス＝プラス」の\n仕組みが自分のものになった",
        "暗記じゃなくて理解だ",
    ],
    # Scene 6: 締め
    [
        "今のやり取り\n全部で2分もかかっていない",
        "たった2分で\n暗記していただけのルールが",
        "「なるほど そういう仕組みか」に\n変わった",
        "これが3つの\nプロンプトパターンの力だ",
        "でも一つ問題がある",
        "今のやり取り\nどこに残っている？",
        "Geminiの履歴を探せば\n見つかるかもしれないけど\n整理されてはいない",
        "テスト前に\n「あのとき納得した説明\nどこだっけ」と探し回ることになる",
        "次の章では\nこの問題を解決する方法を見せる",
    ],
]


def get_duration(path):
    r = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True, text=True
    )
    return float(r.stdout.strip())


def run_ffmpeg(cmd, label=""):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  ERROR ({label}): {r.stderr[-300:]}")
    return r.returncode == 0


def generate_ass(scene_idx, avatar_dur, phrases):
    """テロップ用ASSファイルを生成"""
    ass_path = os.path.join(OUT_DIR, f"telop_{scene_idx:02d}.ass")

    # フレーズごとに文字数比例で時間配分（発話タイミングに近づける）
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
    # 中央揃え(Alignment=8=top-center相対)、大きめフォント、ダークグレー
    lines.append("Style: Telop,Noto Sans JP,80,&H00333333,&H000000FF,&H00333333,&H00000000,-1,0,0,0,100,100,1,0,1,2,0,5,310,90,0,1")
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
        start_str = f"{h1}:{m1:02d}:{s1:05.2f}"
        end_str = f"{h2}:{m2:02d}:{s2:05.2f}"
        # \pos()でバー中央に配置、\Nで改行
        ass_text = phrase.replace("\n", "\\N")
        lines.append(f"Dialogue: 0,{start_str},{end_str},Telop,,0,0,0,,{{\\pos({TELOP_CENTER_X},{TELOP_CENTER_Y})}}{ass_text}")

    with open(ass_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return ass_path


# === メイン処理 ===
print("=" * 60)
print("Ch2 動画合成 v2 - スライドテンプレート埋め込み方式")
print("=" * 60)

# Step 0: 操作画面のクロップ済み動画を準備
print("\n[PREP] 操作画面クロップ...")
demo_cropped = os.path.join(OUT_DIR, "demo_cropped.mp4")
run_ffmpeg([
    "ffmpeg", "-y", "-i", DEMO_RAW,
    "-vf", f"crop={CROP_W}:{CROP_H}:{CROP_X}:{CROP_Y}",
    "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-an",
    demo_cropped
], "crop")

# 冒頭・末尾フリーズフレーム
print("[PREP] フリーズフレーム抽出...")
freeze_first = os.path.join(OUT_DIR, "freeze_first.jpg")
freeze_last = os.path.join(OUT_DIR, "freeze_last.jpg")
run_ffmpeg(["ffmpeg", "-y", "-i", demo_cropped, "-vf", r"select=eq(n\,0)", "-vframes", "1", "-q:v", "1", freeze_first])
run_ffmpeg(["ffmpeg", "-y", "-sseof", "-0.1", "-i", demo_cropped, "-vframes", "1", "-q:v", "1", freeze_last])

# Step 1: 各シーン合成
for i, (avatar_file, vstart, vend, freeze_type) in enumerate(SCENES):
    avatar_path = os.path.join(AVATAR_DIR, avatar_file)
    avatar_dur = get_duration(avatar_path)
    seg_out = os.path.join(OUT_DIR, f"seg_{i:02d}.mp4")

    # テロップASS生成
    ass_path = generate_ass(i, avatar_dur, SCRIPTS[i])

    if freeze_type == "first":
        # 冒頭フリーズ
        print(f"\n[{i}] 導入（フリーズ {avatar_dur:.1f}s）...")
        screen_input = f"-loop 1 -t {avatar_dur} -i {freeze_first}"
        screen_args = ["-loop", "1", "-t", str(avatar_dur), "-i", freeze_first]
    elif freeze_type == "last":
        # 末尾フリーズ
        print(f"\n[{i}] 締め（フリーズ {avatar_dur:.1f}s）...")
        screen_args = ["-loop", "1", "-t", str(avatar_dur), "-i", freeze_last]
    else:
        # 動画区間 + フリーズ引き延ばし
        vid_dur = vend - vstart
        freeze_dur = max(0, avatar_dur - vid_dur)
        print(f"\n[{i}] S{i}（動画{vid_dur}s + フリーズ{freeze_dur:.1f}s = {avatar_dur:.1f}s）...")

        # 動画区間切り出し
        clip = os.path.join(OUT_DIR, f"clip_{i:02d}.mp4")
        run_ffmpeg([
            "ffmpeg", "-y", "-ss", str(vstart), "-t", str(vid_dur), "-i", demo_cropped,
            "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-an", clip
        ], f"clip_{i}")

        if freeze_dur > 0.5:
            # 末尾フリーズ追加
            clip_freeze = os.path.join(OUT_DIR, f"clip_freeze_{i:02d}.jpg")
            run_ffmpeg(["ffmpeg", "-y", "-sseof", "-0.1", "-i", clip, "-vframes", "1", "-q:v", "1", clip_freeze])

            freeze_vid = os.path.join(OUT_DIR, f"freeze_vid_{i:02d}.mp4")
            run_ffmpeg([
                "ffmpeg", "-y", "-loop", "1", "-t", str(freeze_dur), "-i", clip_freeze,
                "-vf", "fps=30", "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                "-pix_fmt", "yuv420p", freeze_vid
            ])

            concat_txt = os.path.join(OUT_DIR, f"concat_{i:02d}.txt")
            with open(concat_txt, "w") as f:
                f.write(f"file '{os.path.basename(clip)}'\nfile '{os.path.basename(freeze_vid)}'\n")

            extended = os.path.join(OUT_DIR, f"extended_{i:02d}.mp4")
            run_ffmpeg([
                "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_txt,
                "-c", "copy", extended
            ], f"concat_{i}")

            screen_args = ["-i", extended]
        else:
            screen_args = ["-ss", str(vstart), "-t", str(avatar_dur), "-i", demo_cropped]

    # 操作画面のアスペクト比を維持してコンテンツエリアにフィット
    # 元: 1855x920 → コンテンツ: 1744x770
    # 高さ基準: 770 → 幅 = 770 * (1855/920) = 1552
    fit_w = int(CONTENT_H * CROP_W / CROP_H)
    fit_w = fit_w if fit_w % 2 == 0 else fit_w + 1  # 偶数化
    screen_x = CONTENT_X + (CONTENT_W - fit_w) // 2  # 中央配置

    # 合成フィルター: テンプレート + 操作画面 + アバター + テロップ
    filter_complex = (
        f"[0:v]fps=30,format=yuv420p[bg];"
        f"[1:v]scale={fit_w}:{CONTENT_H}:flags=lanczos,format=yuv420p[screen];"
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

    run_ffmpeg(cmd, f"compose_{i}")

    if os.path.exists(seg_out):
        print(f"  → {seg_out} OK")
    else:
        print(f"  → FAILED")

# Step 2: 全セグメント結合
print("\n[FINAL] 全セグメント結合...")
concat_final = os.path.join(OUT_DIR, "concat_final.txt")
with open(concat_final, "w") as f:
    for i in range(len(SCENES)):
        f.write(f"file 'seg_{i:02d}.mp4'\n")

final_out = "ch2-final-v2.mp4"
run_ffmpeg([
    "ffmpeg", "-y", "-f", "concat", "-safe", "0",
    "-i", concat_final, "-c", "copy", final_out
], "final_concat")

if os.path.exists(final_out):
    dur = get_duration(final_out)
    size_mb = os.path.getsize(final_out) / 1024 / 1024
    print(f"\n{'='*60}")
    print(f"[DONE] {final_out}")
    print(f"  尺: {dur:.1f}s ({dur/60:.1f}分)")
    print(f"  サイズ: {size_mb:.1f}MB")
    print(f"{'='*60}")
else:
    print("\n[FAIL] 合成失敗")
