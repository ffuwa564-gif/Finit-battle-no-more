# 再現手順

1. ソース用ブランチ `video/build-research-diary-00` を取得します。
2. Production-Materials.zip をリポジトリのルートへ展開します。`artifacts/build-diary-00`へ既存素材・合成済みの各発話・台本・制作コードが復元されます。VOICEVOXモデルと原曲MP3は含みません。
3. PythonのPillow/numpy/scipy、ffmpeg/ffprobe、Node依存を用意してください。`tools/media-sync/`はソースブランチにあります。
4. `git worktree add --detach /workspace/STILLVEIL-part0-source dec20ebbfb8d139713ffe847ebc48eefe8ff54ca` でver1.10を取り出します。別の場所なら `STILLVEIL_SOURCE` を指定してください。原画を外部リンクで取り出す場合はExternal-Game-Assets.jsonのSHAを必ず照合します。
5. BGM「フィヨルドの澄んだ風」は公式配布元と利用条件を確認して取得し、プロジェクトの `public/audio/fjordnosundakaze.mp3`へ置きます。既存ゲームチェックアウトにも同じ音源が入っています。
6. `python artifacts/build-diary-00/rebase-inputs.py` で展開先の発話パスを付け直します。
7. `python artifacts/build-diary-00/prepare.py` → `mix.py` → `render.py` → `audit.py` → `write-documents.py` の順で実行します。各コマンドには同じディレクトリの接頭辞を付けます。
8. `npx tsx artifacts/build-diary-00/verify.ts`、全体デコード、音量・目視検査も完成ファイルそのものへ実行してください。再書き出し前の検査結果を再利用しません。

物語を変更して再合成する場合は、VOICEVOX CoreのPython環境・OpenJTalk辞書・モデルが別途必要です。`synth.py`のローカルランタイム位置を環境に合わせ、話者3/2/8とライセンスを確認してください。発話キャッシュはテキスト・コード・条件のハッシュで判定します。

`export-data.ts`は作成時の固定1.10チェックアウトを使う参照コードです。別環境では冒頭の絶対importをその固定チェックアウトへ合わせるか、同封のcatalogue.jsonとゲームソースを照合してください。現在のmainから効果を再採取して1.10のデータと混ぜないでください。

この回は戦闘検証・バランス改修を実施していません。新しい勝率・認定データはありません。UI画像は固定1.10の初期セーブの実画面です。既存回の資料・コード・素材を参照しましたが、全動画を視聴分析したという主張ではありません。
