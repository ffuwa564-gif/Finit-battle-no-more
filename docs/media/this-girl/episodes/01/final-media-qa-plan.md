# 完成映像QAの事前仕様（完成MP4生成前）

研究の確認乱数・数学source・検定族は変更しない。本書は編集後の映像同期を測る仕様であり、研究の成功判定とは別。

- 同じ最終MP4 SHAに対して全decode・30fps実PTS・48kHz・Chromium/WebKit各3seekを検証する。
- 各game cutはrendererが明示した紙とのfade区間を両端から除き、残った可視区間を3等分して開始/中間/末尾を測る。除外frame数・理由・測定範囲を報告する。fadeを隠すために測定窓を事後選択しない。
- sourceだけで最大活動量の9連続frameを決める。活動量>0.4、2つ以上の異なる状態を要求する。動き軽減では2状態の明瞭なedgeでも時刻を同定できるため、単なる4unique数だけへ依存しない。
- 最終映像との最良対応はRMSE≤12・絶対lag≤80ms。加えて探索内の**すべての80ms外候補**の最小RMSEがbestより1gray pixel以上悪いことを要求する。静止plateauや反復画像で位置が曖昧ならFAIL。別の窓へ乗り換えてPASSにしない。
- 各game cutの開始/中間/末尾の実ゲーム音、声3点、音楽3点をそれぞれ独立原音から再構築した参照で照合。最終音を参照生成へ使わない。80ms、game NCC≥0.65、voice/music NCC≥0.72は維持。
- 元収録は別に、全calibration label、native graph mixed PCMとOS音声の同期、元PCMの共通window内bit一致、packet clock連続性を確認する。字幕・図・頭部・研究版表示・認定表示は実frameの目視で検証する。

この仕様はroot/criticが完成動画を見る前に協議したもの。完成ファイルが未生成のため、本書自体は合格報告ではない。
