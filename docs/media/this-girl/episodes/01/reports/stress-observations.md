# 高レア能力と敵能力の感度分析

全て凍結したbuildを用い、各条件で再最適化していない。SSR/XRのHP/攻撃/防御を+25/+50%（速度とLS補正は変更しない）、敵HP/攻撃を±10%とした研究摂動。各scenarioに同じ950パネル256行、0%も測定済み。D代替の再最適化比較はないため、将来の永久採用価値や相乗効果の統計認定をしない。

|条件|scenario|C勝利|E勝利|C観測R|E観測R|C-E観測R差|
|---|---|---:|---:|---:|---:|---:|
|ivory-tower-010-T6-F1|zero|256|256|10.129|11.082|-0.953|
|ivory-tower-010-T6-F1|high25|256|256|8.266|8.770|-0.504|
|ivory-tower-010-T6-F1|high50|256|256|7.125|7.133|-0.008|
|ivory-tower-010-T6-F1|enemyMinus10|256|256|9.637|10.141|-0.504|
|ivory-tower-010-T6-F1|enemyPlus10|255|255|13.250|14.395|-1.145|
|ivory-tower-010-T6-F4|zero|255|254|11.078|12.020|-0.941|
|ivory-tower-010-T6-F4|high25|256|256|8.285|8.625|-0.340|
|ivory-tower-010-T6-F4|high50|256|256|7.539|7.688|-0.148|
|ivory-tower-010-T6-F4|enemyMinus10|256|256|9.820|10.543|-0.723|
|ivory-tower-010-T6-F4|enemyPlus10|230|219|18.602|22.145|-3.543|
|kuzuha-awakening-T6-F1|zero|256|256|9.332|9.465|-0.133|
|kuzuha-awakening-T6-F1|high25|256|256|8.844|8.895|-0.051|
|kuzuha-awakening-T6-F1|high50|256|256|8.789|8.789|0.000|
|kuzuha-awakening-T6-F1|enemyMinus10|256|256|9.203|9.262|-0.059|
|kuzuha-awakening-T6-F1|enemyPlus10|256|256|9.516|9.625|-0.109|
|kuzuha-awakening-T6-F4|zero|256|256|9.070|9.070|0.000|
|kuzuha-awakening-T6-F4|high25|256|256|8.074|8.074|0.000|
|kuzuha-awakening-T6-F4|high50|256|256|8.016|8.016|0.000|
|kuzuha-awakening-T6-F4|enemyMinus10|256|256|8.293|8.293|0.000|
|kuzuha-awakening-T6-F4|enemyPlus10|256|256|9.461|9.461|0.000|

差の差を述べる場合は同一950パネルの0%との差を使う。930パネルの主比較と950高レア摂動を直接paired差として扱わない。観測C-E差は高レア出力増で縮小する条件もあり、無限の補完性は保証できない。
