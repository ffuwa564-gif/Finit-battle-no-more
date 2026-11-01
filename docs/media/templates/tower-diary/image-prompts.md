# 画像生成の見本プロンプト

キャラ名・服装・表情は各回の設定で置き換える。承認済みサムネやPart2の絵を参照画像として渡す。透過の立ち絵と背景付きの挿絵を別に作る。

## 透過の表情差分

> Create a single full-body two-head-tall chibi character sticker for Japanese game commentary. Match the adorable glossy pastel anime style and outfit of the supplied approved reference. Character: [name, hair, distinctive ears/hat, clothes]. Expression: [happy / shocked / deadpan / thinking]. One character only, no text, panels or props covering the face. Entire head, hair tips, ears, hat, hands and shoes fully inside the square canvas with generous empty margins on every side. Never crop the head. Transparent background, clean outline, no shadow outside the character.

透過背景を生成ツールの設定でも有効にする。喜び・驚き・ツッコミ・考え顔など、会話で使う差分だけ用意する。原画で頭が欠けていないか先に確認し、安全域付きcontainで配置する。

## 会話用の挿絵

> Create a wide 16:9 cute pastel illustration for a Japanese game commentary cutaway. Match the supplied approved chibi references. Characters: [cast and faithful outfits]. Scene: [strategy meeting / funny shopping receipt / other story-relevant scene]. Give each character a distinct expression and a clear interaction. Blush pink and cream palette, gentle comedy, detailed cute atmosphere. No text, logos or UI. Every head, hair tip, ear and hat fully inside the image, with generous empty top and side margins. No cropped heads. Leave space for video overlays.

背景付きで生成。全景をcontainで見せ、この場面では左右の立ち絵を隠す。長い文章や数値は絵へ焼き込まず、編集側のテキスト・図で表示する。プロンプト、参照元、原画、使用した差分、権利表記を保存する。
