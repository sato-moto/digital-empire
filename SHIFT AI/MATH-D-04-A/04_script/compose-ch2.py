# -*- coding: utf-8 -*-
"""
MATH-D-04-A Ch2 実演動画合成スクリプト
収録映像 × アバター動画 × テンプレート背景 × テロップ → 最終MP4

使い方: python compose-ch2.py
"""

import subprocess
import json
import os
import math

# === パス設定 ===
BASE_DIR = r"C:\Users\motok\OneDrive\Desktop\Claude code\SHIFT AI\MATH-D-04-A"
SCREEN_SRC = r"C:\Users\motok\Videos\2026-04-15 10-27-05.mp4"
AVATAR_DIR = r"C:\Users\motok\Downloads\実演アバター"
TEMPLATE_BG = r"C:\Users\motok\OneDrive\Desktop\Claude code\SHIFT AI\.claude\skills\slide-generator-main\assets\temp.png"
OP_VIDEO = r"C:\Users\motok\OneDrive\Desktop\Claude code\SHIFT AI\.claude\skills\video-composer-main\assets\opening.mp4"
OUTPUT_DIR = os.path.join(BASE_DIR, "04_script", "output")
SCENE_DEF = os.path.join(BASE_DIR, "04_script", "scene-definition.json")

# === レイアウト定数（video-composer仕様準拠） ===
CANVAS_W, CANVAS_H = 1920, 1080
# 操作画面クロップ: y=120から911px高
CROP_Y, CROP_H, CROP_W = 120, 911, 1920
# コンテンツ配置エリア
CONTENT_X, CONTENT_Y = 88, 56
CONTENT_W, CONTENT_H = 1744, 770
# アバター配置
AVATAR_X, AVATAR_Y = 200, 865
AVATAR_W, AVATAR_H = 180, 180
# テロップ配置
TELOP_POS_X, TELOP_POS_Y = 1115, 955

# テロップデータ（15文字以内フレーズ）
TELOP_DATA = [
    # slide1: 導入①
    ["ここからは実演だ。", "座学で見た", "3つのプロンプトを、", "実際のAI画面で",
     "使っているところを", "見てもらう。", "題材は因数分解。", "「因数分解？",
     "それ基礎じゃん」", "と思った人、正解だ。", "あえて高校の", "計算分野で",
     "最も基礎的なものを", "選んでいる。", "大事なのは", "題材の難しさじゃなくて、",
     "AIとの壁打ちの", "「やり方」を", "身につけることだからだ。", "このやり方さえ掴めば、",
     "数列でも三角関数でも、", "AIにどんどん", "深く聞いていける。", "自分のペースで",
     "レベルを上げていけるので、", "まずはこの基礎で", "流れを掴んでほしい。"],
    # slide2: 導入②
    ["では画面を見てほしい。", "Geminiの", "一時チャットを使っている。", "ここに2つの",
     "因数分解がある。", "x²−9 と", "x²−6x+9。", "似た式に見えるけど、",
     "使う公式が違う。", "この「どっちの公式を", "使うか」の判断基準を、",
     "3つのプロンプトで", "見抜いていく。"],
    # slide3: 解法検証①
    ["まず1つ目、", "解法検証プロンプト。", "画面のプロンプトを", "見てほしい。",
     "「壁打ちしたい。", "因数分解で", "どの公式を使うか", "迷っている」と",
     "状況を伝えた上で、", "「x²−9は", "a²−b²の形だから", "和と差の積を",
     "使えばいいと思う。", "この方針で合ってる？」と", "自分の仮説を", "ぶつけている。",
     "ポイントは2つ。", "自分の仮説を", "先に出していること。", "そして方針の確認だけを",
     "聞いていること。", "答えを教えてもらう", "んじゃなくて、", "自分の考えが",
     "合っているかを", "検証させている。"],
    # slide4: 解法検証②
    ["Geminiの返答を", "見てみよう。", "「方針、", "バッチリ合っています」", "と返ってきた。",
     "x²はxの2乗、", "9は3の2乗だから、", "a²−b²の形に", "当てはまる。",
     "和と差の積を使えば", "(x+3)(x−3)で", "一発だ。", "さらにGeminiは",
     "「他の公式との", "見分け方」まで", "補足してくれている。", "項が3つだったら",
     "別の公式を疑え、と。", "これが次の問題への", "伏線になっている。"],
    # slide5: 構造発見①
    ["2問目にいこう。", "x²−6x+9。", "さっきと同じ感覚で", "和と差の積を",
     "使おうとしても、", "うまくいかない。", "ここで2つ目、", "構造発見プロンプトの",
     "出番だ。", "画面を見てほしい。", "「x²−6x+9を", "因数分解したいんだけど、",
     "和と差の積では", "うまくいかない。", "私は何に", "つまずいている？」", "と聞いている。"],
    # slide6: 構造発見②
    ["この「私は何に", "つまずいている？」が、", "ものすごく強力な", "聞き方だ。",
     "普通に「教えて」と", "聞くとAIは", "関係ない情報も含めて", "長々と説明してくる。",
     "でも「どこで", "つまずいている？」", "と聞けば、", "AIは自分の",
     "思考の穴にフォーカスして、", "ピンポイントで", "突いてくれる。"],
    # slide7: 構造発見③
    ["Geminiの返答を", "見てみよう。", "「式の形、", "つまり項の数」と", "「公式」の",
     "ミスマッチだ、と", "核心を突いてくれている。", "x²−9は項が2つ。", "x²−6x+9は",
     "項が3つ。", "和と差の積は", "2項の引き算にしか", "使えない。",
     "3項なら完全平方式を", "疑う。", "そして確認の手順まで", "教えてくれている。",
     "両端がそれぞれ", "2乗になっているか。", "真ん中の項が", "2abになっているか。",
     "実際にチェックすると、", "x²はxの2乗、", "9は3の2乗、", "真ん中の6xは",
     "2×x×3で一致する。", "だからx²−6x+9は", "(x−3)²だ。"],
    # slide8: 構造発見④
    ["たった「何に", "つまずいている？」の", "一言で、", "ここまで構造の違いを",
     "見抜いてくれる。", "この聞き方は", "因数分解に", "限った話じゃない。",
     "数列でも絶対値でも", "三角関数でも、", "「自分がどこで", "詰まっているのか」を",
     "AIに言語化してもらう", "だけで、", "一気に視界が開ける。"],
    # slide9: 型抽出①
    ["2問解いたところで、", "最後の仕上げだ。", "3つ目、", "型抽出プロンプト。",
     "画面を見てほしい。", "「今の2問の", "判断の流れを", "フローチャートに",
     "まとめて。", "次に別の因数分解が", "出てきても", "これを見れば迷わない、",
     "ってレベルで」", "と聞いている。", "2問解いて", "終わりじゃない。",
     "ここで「型」にすることで、", "次に同じ種類の", "問題が出たときに", "迷わなくなる。",
     "これが暗記との", "決定的な違いだ。"],
    # slide10: 型抽出②
    ["Geminiが", "「最強の判断", "フローチャート」を", "作ってくれた。", "見てみよう。",
     "STEP 1、", "まず共通因数がないか", "チェック。", "STEP 2、", "項の数を数える。",
     "2項なら", "「2乗−2乗」の形を", "確認して和と差の積。", "3項なら",
     "両端が2乗かチェックして", "完全平方式。", "それ以外なら",
     "「たして○、かけて△」の", "パターンを探す。", "さらに判断マップとして",
     "表にまとめてくれている。", "項の数、注目ポイント、", "使う公式。", "これが一覧に",
     "なっているだけで、", "次に因数分解を見たとき", "「まず項の数を数える」",
     "という最初の一手が", "固定される。", "迷いが一気に減る。"],
    # slide11: 締め①
    ["ここまでの流れを", "振り返ろう。", "まず自分で", "仮説を立てて、",
     "解法検証で", "方針を確かめた。", "次に構造発見で", "2つの式の",
     "構造の違いを見抜いた。", "特に「私は何に", "つまずいている？」の", "一言で、",
     "AIが思考の穴に", "フォーカスして", "説明してくれた。", "最後に型抽出で、",
     "判断フローチャートを", "作った。"],
    # slide12: 締め②
    ["このサイクルを", "1回やるだけで、", "暗記じゃなくて", "「構造の理解」で",
     "因数分解が", "攻略できるようになった。", "そしてこの実演は", "因数分解という",
     "最も基礎的な題材で", "やったけど、", "やり方は同じだ。", "この座学と実演を",
     "土台にして、", "AIにどんどん", "深く聞いていけば、", "数列も三角関数も",
     "自分のペースで", "攻略していける。", "ぜひ挑戦してほしい。", "次の章では、",
     "今作った「型」を", "NotebookLMに蓄積して、", "いつでも引き出せる",
     "仕組みの作り方を", "見ていく。"],
]


def time_to_ass(seconds):
    """秒数をASS形式のタイムスタンプに変換"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def generate_ass(scene_idx, phrases, duration, output_path):
    """ASSサブタイトルファイルを生成（文字数比例配分）"""
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
        # 文字数に比例した表示時間
        phrase_duration = duration * (len(phrase) / total_chars)
        start = time_to_ass(current_time)
        end = time_to_ass(current_time + phrase_duration)
        # \pos(x,y)でテロップ位置を指定
        line = f"Dialogue: 0,{start},{end},Telop,,0,0,0,,{{\\pos({TELOP_POS_X},{TELOP_POS_Y})}}{phrase}"
        lines.append(line)
        current_time += phrase_duration

    with open(output_path, "w", encoding="utf-8-sig") as f:
        f.write("\n".join(lines))

    return output_path


def build_scene(scene_def, scene_idx, ass_path):
    """1シーンのffmpeg合成コマンドを構築・実行"""
    avatar_path = os.path.join(AVATAR_DIR, scene_def["avatar"])
    avatar_dur = scene_def["avatar_duration"]
    output_path = os.path.join(OUTPUT_DIR, f"scene_{scene_def['id']:02d}.mp4")

    screen_mode = scene_def["screen_mode"]
    screen_start = scene_def.get("screen_start", 0)
    screen_end = scene_def.get("screen_end", 0)

    # 操作画面のアスペクト比維持スケーリング
    fit_h = CONTENT_H  # 770
    fit_w = int(fit_h * CROP_W / CROP_H)  # 1920/911*770 ≈ 1623
    if fit_w % 2 != 0:
        fit_w += 1
    screen_x = CONTENT_X + (CONTENT_W - fit_w) // 2  # 中央配置

    # --- 操作画面の入力フィルタを構築 ---
    if screen_mode == "freeze":
        # フリーズフレーム: 特定時点のフレームを静止画として使用
        freeze_at = scene_def.get("freeze_frame_at", screen_start)
        screen_input = ["-ss", str(freeze_at), "-i", SCREEN_SRC]
        screen_filter = f"[1:v]crop={CROP_W}:{CROP_H}:0:{CROP_Y},scale={fit_w}:{fit_h}:flags=lanczos,loop=-1:1:0,setpts=PTS-STARTPTS,trim=duration={avatar_dur},format=yuv420p[screen]"

    elif screen_mode == "slowdown":
        # 減速: 映像区間を引き伸ばし
        speed = scene_def.get("speed", 0.5)
        screen_input = ["-ss", str(screen_start), "-t", str(screen_end - screen_start), "-i", SCREEN_SRC]
        setpts_val = 1.0 / speed
        screen_filter = f"[1:v]crop={CROP_W}:{CROP_H}:0:{CROP_Y},scale={fit_w}:{fit_h}:flags=lanczos,setpts={setpts_val:.2f}*PTS,trim=duration={avatar_dur},format=yuv420p[screen]"

    elif screen_mode == "freeze_then_slow":
        # フリーズ→ゆっくり再生
        freeze_at = scene_def.get("freeze_frame_at", screen_start)
        freeze_dur = scene_def.get("freeze_duration", 10)
        remaining = avatar_dur - freeze_dur
        screen_input = ["-ss", str(freeze_at), "-i", SCREEN_SRC]
        screen_filter = (
            f"[1:v]crop={CROP_W}:{CROP_H}:0:{CROP_Y},scale={fit_w}:{fit_h}:flags=lanczos,"
            f"loop={int(freeze_dur*30)}:1:0,setpts=PTS-STARTPTS,"
            f"trim=duration={avatar_dur},format=yuv420p[screen]"
        )

    else:  # realtime_with_pause
        # ほぼ等速（アバター尺に合わせて微調整）
        seg_dur = screen_end - screen_start
        if seg_dur > 0:
            speed = seg_dur / avatar_dur
        else:
            speed = 1.0
        setpts_val = 1.0 / speed if speed > 0 else 1.0
        screen_input = ["-ss", str(screen_start), "-t", str(seg_dur), "-i", SCREEN_SRC]
        screen_filter = f"[1:v]crop={CROP_W}:{CROP_H}:0:{CROP_Y},scale={fit_w}:{fit_h}:flags=lanczos,setpts={setpts_val:.2f}*PTS,trim=duration={avatar_dur},format=yuv420p[screen]"

    # --- フィルタグラフ全体 ---
    filter_complex = (
        f"[0:v]fps=30,format=yuv420p[bg];"
        f"{screen_filter};"
        f"[2:v]scale={AVATAR_W}:{AVATAR_H}:flags=lanczos,format=yuva420p[av];"
        f"[bg][screen]overlay={screen_x}:{CONTENT_Y}:shortest=1[tmp1];"
        f"[tmp1][av]overlay={AVATAR_X}:{AVATAR_Y}:shortest=1[tmp2];"
        f"[tmp2]subtitles=filename='{ass_path.replace(chr(92), '/').replace(':', chr(92)+':')}'[out]"
    )

    # --- ffmpegコマンド構築 ---
    cmd = [
        "ffmpeg", "-y",
        # Input 0: テンプレート背景（ループ）
        "-loop", "1", "-framerate", "30", "-i", TEMPLATE_BG,
        # Input 1: 操作画面
        *screen_input,
        # Input 2: アバター動画（映像+音声）
        "-i", avatar_path,
        # フィルタ
        "-filter_complex", filter_complex,
        # 出力マッピング
        "-map", "[out]",
        "-map", "2:a",
        # エンコード設定
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "1",
        "-t", str(avatar_dur),
        "-pix_fmt", "yuv420p",
        output_path
    ]

    return cmd, output_path


def main():
    # 出力ディレクトリ作成
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # シーン定義読み込み
    with open(SCENE_DEF, "r", encoding="utf-8") as f:
        scene_data = json.load(f)

    scenes = scene_data["scenes"]
    scene_outputs = []

    print("=" * 60)
    print("MATH-D-04-A Ch2 実演動画合成")
    print("=" * 60)

    # === 各シーンを合成 ===
    for i, scene in enumerate(scenes):
        scene_id = scene["id"]
        print(f"\n--- Scene {scene_id}: {scene['scene']} ---")

        # ASSファイル生成
        ass_path = os.path.join(OUTPUT_DIR, f"telop_{scene_id:02d}.ass")
        generate_ass(i, TELOP_DATA[i], scene["avatar_duration"], ass_path)
        print(f"  テロップASS生成: {ass_path}")

        # ffmpegコマンド構築
        cmd, output_path = build_scene(scene, i, ass_path)
        print(f"  合成開始: {scene['avatar']} ({scene['avatar_duration']:.1f}s)")

        # 実行
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            print(f"  [ERROR] Scene {scene_id} 合成失敗:")
            print(result.stderr[-500:] if result.stderr else "No error output")
            continue

        print(f"  合成完了: {output_path}")
        scene_outputs.append(output_path)

    # === OP動画の準備（音声フォーマット統一） ===
    print("\n--- OP動画準備 ---")
    op_converted = os.path.join(OUTPUT_DIR, "op_converted.mp4")
    op_cmd = [
        "ffmpeg", "-y",
        "-i", OP_VIDEO,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-r", "30", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "1",
        op_converted
    ]
    result = subprocess.run(op_cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        print(f"  [ERROR] OP変換失敗: {result.stderr[-300:]}")
    else:
        print(f"  OP変換完了: {op_converted}")

    # === 全シーン結合 ===
    print("\n--- 全シーン結合 ---")
    concat_file = os.path.join(OUTPUT_DIR, "concat.txt")
    with open(concat_file, "w", encoding="utf-8") as f:
        # OP
        f.write(f"file '{op_converted}'\n")
        # 各シーン
        for path in scene_outputs:
            f.write(f"file '{path}'\n")

    final_output = os.path.join(BASE_DIR, "04_script", "output", "ch2-demo-final.mp4")
    concat_cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", concat_file,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "1",
        "-pix_fmt", "yuv420p",
        final_output
    ]

    result = subprocess.run(concat_cmd, capture_output=True, text=True, timeout=600)
    if result.returncode != 0:
        print(f"  [ERROR] 結合失敗: {result.stderr[-500:]}")
    else:
        print(f"\n{'=' * 60}")
        print(f"最終出力: {final_output}")
        print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
