import type {DungeonDef,NovelPageDef,NovelSceneDef} from '../domain/types';
import type {ReincarnationDefinition} from '../domain/reincarnation';
export const reincarnation:ReincarnationDefinition={endingNodeId:'seven-breakfast',introSceneId:'rebirth-introduction',dungeonIds:Array.from({length:6},(_,i)=>`rebirth-${i+1}`)};
const setups=[
 {name:'裏庭・欠番の温室',boss:'mireille',escort:'liora',hp:7,attack:1.6,description:'障壁と回復を巡る消耗戦。回復役を守り、強化を剥がすか、予告を崩すかを選ぶ。'},
 {name:'白庭・校訂前の記録',boss:'athena',escort:'nox',hp:8,attack:1.76,description:'堅い盾と刺突役の連携。単体火力だけでなく、障壁・弱体・回復の役割配分が問われる。'},
 {name:'花冠院・選外者の階段',boss:'asteria',escort:'tikka',hp:9,attack:1.92,description:'範囲攻撃と妨害を耐える連戦。複数の負傷者を戻し、限られた大技の窓をつかむ。'},
 {name:'綴り蔵・借りられた明日',boss:'vespera',escort:'selene',hp:10,attack:2.08,description:'支援と再生で長期化する戦い。奪灯や妨害、予告の隙を組み合わせて突破する。'},
 {name:'灰鐘・停止印のない夜',boss:'nox',escort:'benzaiten',hp:11,attack:2.24,description:'高い貫通火力への備えが必要。回復だけで受け続けず、障壁・かばう・崩しを連携させる。'},
 {name:'管理中枢・名前の外側',boss:'astraea',escort:'athena',hp:12,attack:2.4,description:'T7装備を含む最終盤の編成に向けた深層。役割を切り替え、複数の予告と連戦の損耗を越える。'},
];
/** These are memories of existing combatants, not new administrators masquerading as recruitable characters. */
export const reincarnationDungeons:DungeonDef[]=setups.map((s,i)=>({id:reincarnation.dungeonIds[i],rebirth:true,kind:'normal',name:s.name,subtitle:'転生裏ルート・超絶難度',description:s.description,artId:i%2?'novel-desire-gate':'novel-awakening-garden',published:true,
 ...(i?{previousDungeonId:reincarnation.dungeonIds[i-1]}:{}),waves:[[{characterId:s.escort}],[{characterId:s.boss,boss:true},{characterId:s.escort}]],
 enemyScale:{hp:s.hp,attack:s.attack,defense:1+i*.08},bossScale:{hp:300+i*35,attack:120},tacticalCommands:true,
 bossStrike:{every:4,power:190+i*8,name:'記録の反照',target:'pilot',windup:{breakPercent:8,weakenedPower:55,recoveryPercent:45}},
 bossLoot:{guaranteed:[{materialId:'palimpsest:common',count:1+i},{materialId:'palimpsest:rare',count:i===5?2:1}]},
 gemLoot:{tier4Chance:.28,tier5Chance:.22,tier6Chance:.12,tier7Chance:i===5?.03:.01},
 bossDialogue:{intro:'記憶は、ここで途切れている。',threshold:'知らなかった過去を、いまの選択で越える。',defeat:'閉じられていた記録が、ひらく。'},
}));
const page=(speaker:string,text:string,backgroundId='novel-awakening-garden'):NovelPageDef=>({speaker,text,backgroundId});
const records:[string,NovelPageDef[]][]=[
 ['戻るのは、時間ではなく',[page('庭園の女','また、あの庭から始めたいのね。けれど、あの子たちを最初の不幸へ戻すのではないわ。'),page('庭園の女','あなたが越えた夜は、あちらに残る。あの食卓も、断ることのできた少女も、なかったことにはしない。'),page('主人公','じゃあ、私が歩くのは……？'),page('庭園の女','私たちが選ばなかった道。その記録の裏側よ。持てるものは持っていらっしゃい。今度は、知っているつもりの顔に会うから。'),page('庭園の女','前の世界で頷いた子が、ここでも頷くとは限らない。思い出を、次のあの子への命令にしないでね。')]],
 ['欠番にも、暮らしがあった',[page('主人公','処分済みの札に、庭の女の封蝋があった。札の裏には、移した先の小さな住所が書かれている。'),page('庭園の女','隠した子はいるわ。でも、この筆跡が救いの証拠になるのは、その子が帰ってきたいと言ったときだけ。'),page('主人公','どの札にも、住所があるわけじゃない。'),page('庭園の女','……間に合わなかった子の分を、成功した数から引くことはできない。名前を残しても、ミナは戻らない。'),page('主人公','私は空白を埋めずに写した。そこに誰かがいたことと、何が分からないままなのかを、一緒に残すために。')]],
 ['整っていない声',[page('イヴラ','古い記録と返答が違う。以前は、それを個体の不整合と呼んだ。','cathedral'),page('主人公','違う気持ちになっただけかもしれない。記録のほうが、間違っていたのかもしれない。','cathedral'),page('イヴラ','どちらも、治療を始める前に尋ねるべきことだった。……手を伸ばす許可を、今から聞く。','cathedral'),page('主人公','同じ顔を見て、同じ子だと決めたのは、管理者だけじゃなかった。前の道を知る私も、同じ間違いをする。','cathedral'),page('イヴラ','この欄は訂正しない。今日、本人が言い直した。そのまま、二つとも残す。','cathedral')]],
 ['選ばれなかった一位',[page('ヴェスパ','上位の個体が増えても、選外は減らなかった。席の数を変えずに、順位だけを上げ続けていたから。','novel-desire-gate'),page('主人公','ノルマを達成すれば、生きていられると思わせたのに。','novel-desire-gate'),page('ヴェスパ','枠を越えた瞬間、達成した値を次の基準にした。……あの子たちは、最後まで努力していた。','novel-desire-gate'),page('主人公','謝ったことは、消した記録の代わりにならない。食事を運ぶことも、責任を免じる取引にはしない。','novel-desire-gate'),page('ヴェスパ','分かっている、と言えば済むと思われるのも、もう嫌なのね。……受取欄を開ける。遺された人が、読めるように。','novel-desire-gate')]],
 ['記憶は、所有の証ではない',[page('墨染シオン','渡された技能が似ていても、ウツシは元の持ち主にはならない。契約に、その当たり前が書かれていなかった。','cathedral'),page('主人公','借りたものを返したあとにも、その子の明日は残る。'),page('墨染シオン','受け渡しの鍵と、暮らしを止める鍵を同じ箱に入れていた。返却を拒めば、生きられなくなる契約だった。','cathedral'),page('主人公','鍵を分ける。渡す人の拒否も、受ける人の拒否も、どちらか片方の正しさで上書きしない。'),page('墨染シオン','契約を持つ私も、役職を失えば消されると思っていた。けれど、その恐怖は、誰かを所有していい理由にはならない。','cathedral')]],
 ['帰還命令の、宛先',[page('黎刃アズハ','道を守るために人手が要る。それは嘘ではない。だが、必要な人数を書いた瞬間、誰に尋ねるかを省いていた。','cathedral'),page('灰鐘リゼ','止める印は私に集まっていた。助けを求める窓口も、止められるのを恐れる相手も、同じ私だった。','cathedral'),page('主人公','相談することが、停止の合図にならないようにしよう。断ったあとに、食事や薬が減らないように。'),page('ザクロ','……あたしの子を守るためなら、他所の管を折っていいと思ってた。折られた先にも、帰る子がいたのに。'),page('主人公','修繕費を送ることと、会いたいと言うことは別だ。拒まれた扉を、救った恩で開けない。')]],
 ['誰のものでもない、明日',[page('主人公','いちばん古い台帳には、勝者の名ではなく「所有者」の欄があった。扉は願いを測るたび、他の少女の未来を、その一人の権限へまとめていた。','novel-desire-gate'),page('庭園の女','叶えることと、支配していいことを、同じ願いとして扱っていたの。扉を作った者が、最初にした取り違えよ。','novel-desire-gate'),page('主人公','私の欄だけが空いていた。無欲だった私は選ばれたのではない。誰を自分の願いに従わせるか、宣言できなかった。','novel-desire-gate'),page('庭園の女','判定が止まった。その短い間に、リオラが帰還路を開けた。私は、こちら側であなたを受け取った。あなたが生き残ったのは、特別な血でも、勝者の証でもないわ。'),page('リオラ','あの合図を聞くと、私はいつも膝をついて命令を待っていた。おまえが何も命じなかったときも、その癖だけが戻った。……今は、立って話せる。'),page('主人公','私たちの沈黙や癖を、許可だと読んだ記録がある。記録と違う今日の気持ちを、不具合にしないことから始めたい。'),page('庭園の女','この仕組みを知りながら、あなたには言わなかった。守るためと言えば、また、私の庭に置いておけると思っていたのね。'),page('主人公','台帳は焼かない。生きるための配給も、失われた子の名前も消さない。ただ、願いを誰かの所有権へ変える欄を、次の世界へ渡さない。'),page('主人公','ここで「みんなの幸せ」を一つに決めれば、私も同じ席に座ってしまう。願いは、その子へ返す。私を選ばない明日も、残す。'),page('庭園の女','届く灯は有限よ。ミナは戻らない。遠い庭には、まだ同じ扉がある。それでも、これ以上の帰り道を一人で所有しないと、約束できる。'),page('主人公','七つの印の外で、少女たちはそれぞれの返事をした。同じ顔でも、同じ名前でも、同じ願いではない。違う明日を話したまま、あの食卓へ帰ろう。')]],
];
export const reincarnationNovels:NovelSceneDef[]=records.map(([title,pages],i)=>({id:i===0?reincarnation.introSceneId:`${reincarnation.dungeonIds[i-1]}-after`,title,trigger:i===0?{kind:'rebirth'}:{kind:'rebirth',dungeonId:reincarnation.dungeonIds[i-1]},pages}));
