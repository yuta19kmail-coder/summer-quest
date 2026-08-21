/* 集計エンジンを 合成データで たしかめる */
import fs from 'fs';

const src = fs.readFileSync('/tmp/sq/engine.js','utf8');

/* index.html 側にある 道具を そろえる（本物と同じ実装） */
const prelude = `
function ymd(d){ const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),da=String(d.getDate()).padStart(2,'0'); return y+'-'+m+'-'+da; }
function parseYmd(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function diffDays(a,b){ return Math.round((parseYmd(a)-parseYmd(b))/86400000); }
const WEEK=['にち','げつ','か','すい','もく','きん','ど'];
function toArr(v){ return Array.isArray(v)?v:(v&&typeof v==='object'?[v]:[]); }
const exArr=r=>toArr(r&&r.exercise);
const gameArr=r=>toArr(r&&r.game);
const isAnimeRow=x=>!!(x&&x.kind==='anime');
const playArr=r=>gameArr(r).filter(x=>!isAnimeRow(x));
const animeArr=r=>gameArr(r).filter(isAnimeRow);
const sumMin=a=>a.reduce((s,x)=>s+(Number(x.minutes)||0),0);
const poolMin=r=>Number(r&&r.pool)||0;
`;

const F = new Function(prelude + src + '\nreturn {finaleStats, finaleFindings, fnCorr, fnMA, fnSlope, fnMed};')();

/* ---- 合成データ：7/23〜8/31 の 40日、抜けなし ---- */
const CONFIG = {
  vacStart:'2026-07-21', vacEnd:'2026-08-31',
  goals:[
    {emoji:'📕',name:'らくらくノート',desc:'漢字の書き取りドリル',unit:'ページ',total:60},
    {emoji:'🧮',name:'さんすうドリル',desc:'計算ドリル',unit:'ページ',total:50},
    {emoji:'📗',name:'読書かんそう文',desc:'',unit:'まい',total:3}
  ]
};
const WORDS=['きょうは プールで いっぱい およいだ。','たのしかった。','あさから かんじの れんしゅうを した。むずかしかったけど できた。',
  '弟と 公園で 走った。とても 気もちよかった。','マイクラで エリトラを つかって 空を とんだ。うまく なった。',
  'さんすうの ドリルが むずかしかった。でも さいごまで やった。','おじいちゃんの 家に 行った。西瓜を 食べた。'];
function rnd(seed){ let s=seed; return ()=>{ s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff; }; }
const R = rnd(42);
const REPORTS = {};
const start=new Date(2026,6,23);
for(let i=0;i<40;i++){
  const d=new Date(start); d.setDate(d.getDate()+i);
  const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const late = i>=20;                                  /* 後半は 失速させる */
  const p1 = late ? (R()<0.35?0:Math.round(R()*2)) : (1+Math.round(R()*2));
  const p2 = late ? (R()<0.5?0:1) : (1+Math.round(R()*1.5));
  const study=[];
  if(p1) study.push({name:'らくらくノート',pages:p1,unit:'ページ'});
  if(p2) study.push({name:'さんすうドリル',pages:p2,unit:'ページ'});
  if(i%13===5) study.push({name:'読書かんそう文',pages:1,unit:'まい'});
  const hour = 17 + (late? 2.5:0) + R()*2;             /* 後半は 記録が 遅くなる */
  const txt = WORDS[Math.floor(R()*WORDS.length)] + (i>25 ? '' : (R()<0.4? WORDS[Math.floor(R()*WORDS.length)] : ''));
  REPORTS[key]={
    date:key,
    study,
    exercise: R()<0.25? [] : [{name:'なわとび',minutes:[10,20,30][Math.floor(R()*3)]}],
    pool: R()<0.2? '' : [30,45,60][Math.floor(R()*3)],
    typing:{ score: R()<0.15? '' : Math.round(180+i*4+R()*40), memo:'' },
    game: [{kind:'game',name:'マイクラ',minutes:[60,90,120,150][Math.floor(R()*4)]},
           ...(R()<0.5?[{kind:'anime',name:'アニメ',minutes:[30,60][Math.floor(R()*2)]}]:[])],
    narai:{ text: (d.getDay()===2)?'そろばん':'' },
    reflection: txt,
    reflectionReply:{study:'a',activity:'b',overall:'c'},
    updatedAt: new Date(d.getFullYear(),d.getMonth(),d.getDate(),Math.floor(hour),Math.round((hour%1)*60)).toISOString()
  };
}

const S = F.finaleStats(REPORTS, CONFIG);

let ok=0, ng=0;
const t=(n,c,x)=>{ c?(ok++,console.log('  OK  '+n)):(ng++,console.log('  NG  '+n+(x!==undefined?'  '+JSON.stringify(x).slice(0,300):''))); };

console.log('── 期間と 継続 ──');
t('夏休みぜんぶで 42日', S.range.totalDays===42, S.range.totalDays);
t('記録は 40日', S.days.recorded===40, S.days);
t('🔴 はじめる前の 2日は 抜けに 数えない', S.days.missingN===0 && S.days.beforeStart===2, S.days);
t('記録率 100%', S.days.rate===100, S.days.rate);
t('連続 40日', S.days.streakMax===40 && S.days.streakNow===40, S.days);
t('はじめの日・さいごの日', S.days.first==='2026-07-23' && S.days.last==='2026-08-31', [S.days.first,S.days.last]);

console.log('\n── 勉強 ──');
t('日ごとの列は 42こ（カレンダー用）', S.study.daily.length===42, S.study.daily.length);
t('記録が無い日は null', S.study.daily[0]===null && S.study.daily[1]===null && S.study.daily[2]!==null);
t('合計は 日ごとの 和と 合う',
  S.study.total === S.study.daily.reduce((a,b)=>a+(b||0),0), S.study.total);
t('つみあげの さいごが 合計', S.study.cum[41]===S.study.total, [S.study.cum[41],S.study.total]);
t('🔴 後半の 失速を 見つけている', S.study.cmp.pct<0, S.study.cmp);
t('ならし(7日)の 長さが そろう', S.study.ma7.length===42);

console.log('\n── やること別 ──');
const g1=S.study.byName.find(g=>g.name==='らくらくノート');
t('らくらくノートが ある', !!g1);
t('目標総数を ひろっている', g1.goalTotal===60, g1&&{t:g1.goalTotal});
t('達成率が 出る', typeof g1.pct==='number', g1&&g1.pct);
t('残りが 出る', g1.left===Math.max(0,60-g1.done), g1&&{left:g1.left,done:g1.done});
t('前半→後半の ペースが 出る', g1.pace.first>0 && g1.pace.pct!=null, g1&&g1.pace);
t('単位を ひろっている', g1.unit==='ページ', g1&&g1.unit);
t('日ごとの 合計が done と 合う', g1.done===g1.daily.reduce((a,b)=>a+(b||0),0));
t('多い順に ならんでいる', S.study.byName[0].done>=S.study.byName[1].done);

console.log('\n── タイピング ──');
t('自己ベストが 出る', S.typing.best>=S.typing.first, S.typing);
t('のび率が 出る', S.typing.gainPct>0, S.typing.gainPct);
t('かたむきが プラス（右肩上がり）', S.typing.slope>0, S.typing.slope);
t('記録した日だけ 数えている', S.typing.count===S.typing.daily.filter(v=>v!=null).length);

console.log('\n── からだ ──');
t('うごいた日の 割合が 0〜100', S.move.activeRate>=0 && S.move.activeRate<=100, S.move.activeRate);
t('プールの 合計が 出る', S.move.poolMin>0, S.move.poolMin);
t('いちばん長い 「うごかない」連続', typeof S.move.longestGap==='number', S.move.longestGap);

console.log('\n── 画面の時間 ──');
t('ゲームと アニメが 分かれている', S.screen.gameMin>0 && S.screen.animeMin>0, {g:S.screen.gameMin,a:S.screen.animeMin});
t('合計＝ゲーム＋アニメ', S.screen.total===S.screen.gameMin+S.screen.animeMin);
t('多い日／少ない日の 比べが 出る', S.screen.split && S.screen.split.hiN>0 && S.screen.split.loN>0, S.screen.split);
t('相関は r と n を 返す', S.screen.corrStudy===null || (typeof S.screen.corrStudy.r==='number'), S.screen.corrStudy);

console.log('\n── 作文 ──');
t('書いた日が 数えられる', S.writing.days>0, S.writing.days);
t('合計文字数', S.writing.totalChars>0, S.writing.totalChars);
t('いちばん長い日の 日づけが 出る', /^\d{4}-\d{2}-\d{2}$/.test(S.writing.maxDate), S.writing.maxDate);
t('使った漢字の 種類', S.writing.kanjiKinds>0, S.writing.kanjiKinds);
t('前半・後半の 漢字の種類', typeof S.writing.kanjiFirst==='number' && typeof S.writing.kanjiSecond==='number');
t('上位5つが 出る', S.writing.top5.length>0 && S.writing.top5[0].chars>=S.writing.top5[S.writing.top5.length-1].chars, S.writing.top5.map(o=>o.chars));
t('一文の 平均の長さ', S.writing.sentAvg>0, S.writing.sentAvg);

console.log('\n── 記録した時刻 ──');
t('中央値が 出る', S.clock.median>0, S.clock.median);
t('🔴 後半のほうが 遅い（合成データの とおり）', S.clock.second>S.clock.first, {f:S.clock.first,s:S.clock.second});
t('24こずつの ヒストグラム', S.clock.hist.length===24 && S.clock.hist.reduce((a,b)=>a+b,0)===40, S.clock.hist);

console.log('\n── 曜日 ──');
t('7つ ある', S.weekday.length===7);
t('全部の 日数を 合わせると 記録日数', S.weekday.reduce((a,w)=>a+w.n,0)===40);

console.log('\n── 気づき ──');
t('気づきが 出ている', S.findings.length>=4, S.findings.length);
t('ほめる／気になる が 混ざっている',
  S.findings.some(f=>f.level==='good') && S.findings.some(f=>f.level==='watch'),
  S.findings.map(f=>f.level));
t('🔴 すべての 気づきに 見出しと 本文が ある',
  S.findings.every(f=>f.title && f.body), S.findings.filter(f=>!f.title||!f.body));
t('🔴 「1回目・2回目」の 話が どこにも 出ていない',
  !JSON.stringify(S).includes('1回目') && !JSON.stringify(S).includes('2回目'));

console.log('\n── 単位ちがい（7/29に 30分を 30ページと 入れた） ──');
const REP2 = JSON.parse(JSON.stringify(REPORTS));
REP2['2026-07-29'].study = [{name:'らくらくノート',pages:30,unit:'ページ'}];
const S2 = F.finaleStats(REP2, CONFIG);
t('🔴 あやしい記録を 見つけた', S2.fixes.suspectN>=1, S2.fixes.suspects);
const sus = S2.fixes.suspects[0];
t('日づけが 合っている', sus && sus.date==='2026-07-29', sus);
t('やることの 名前が 合っている', sus && sus.name==='らくらくノート', sus);
t('ふだんの 量（中央値）を 出している', sus && sus.median>0 && sus.median<10, sus);
t('くらべた 相手が わかる（own / all）', sus && (sus.basis==='own'||sus.basis==='all'), sus);
t('言いかえの 候補を 出している', sus && sus.suggest>=1 && sus.suggest<=5, sus);
t('🔴 かってには 直していない（合計に 30が 入ったまま）',
  S2.study.daily[8]===30, {v:S2.study.daily[8]});
t('気づきに「単位がちがうかも」が 出る',
  S2.findings.some(f=>f.title.indexOf('単位がちがう')>=0), S2.findings.map(f=>f.title));

const CFG3 = Object.assign({}, CONFIG, {fixes:[{d:'2026-07-29', n:'らくらくノート', v:2, note:'30分を ページに 読みかえ'}]});
const S3 = F.finaleStats(REP2, CFG3);
t('🔴 なおしを あてると 集計が 変わる', S3.study.daily[8]===2, {v:S3.study.daily[8]});
t('なおした ことを 記録している', S3.fixes.n===1 && S3.fixes.applied[0].from===30 && S3.fixes.applied[0].to===2, S3.fixes.applied);
t('もう「あやしい」には 出さない', S3.fixes.suspectN===0, S3.fixes.suspects);
t('気づきに「読みかえた」が 出る', S3.findings.some(f=>f.title.indexOf('読みかえた')>=0), S3.findings.map(f=>f.title));
t('🔴 元の記録は こわれていない', REP2['2026-07-29'].study[0].pages===30);
t('合計が なおしの ぶんだけ 減る', S3.study.total === S2.study.total - 28, {a:S2.study.total,b:S3.study.total});
const CFG4 = Object.assign({}, CONFIG, {fixes:[{d:'2026-07-29', n:'らくらくノート', v:null, note:'除外'}]});
const S4 = F.finaleStats(REP2, CFG4);
t('v が null なら 集計から 外れる', S4.study.daily[8]===0, {v:S4.study.daily[8]});

/* 1日しか 出てこない やること（自由研究の 下調べ）でも 見つかるか */
const REP2b = JSON.parse(JSON.stringify(REPORTS));
REP2b['2026-07-29'].study = REP2b['2026-07-29'].study.concat([{name:'研究の下調べ',pages:30,unit:'ページ'}]);
const S2b = F.finaleStats(REP2b, CONFIG);
t('🔴 1日しか ない やることでも 見つかる（ほかと くらべる）',
  S2b.fixes.suspects.some(x=>x.name==='研究の下調べ' && x.date==='2026-07-29'), S2b.fixes.suspects);
t('その ばあいは basis が all', (S2b.fixes.suspects.find(x=>x.name==='研究の下調べ')||{}).basis==='all',
  S2b.fixes.suspects.find(x=>x.name==='研究の下調べ'));

console.log('\n── プールは 天気（運動不足と 読ませない） ──');
t('うんどうだけの 実施率が ある', typeof S.move.exRate==='number' && S.move.exRate>=0, S.move.exRate);
t('プールだけの 実施率が ある', typeof S.move.poolRate==='number', S.move.poolRate);
t('うんどうだけの 連続0日も 数えている', typeof S.move.exGap==='number', S.move.exGap);
t('月ごとの プールが 出る', Array.isArray(S.move.poolByMonth) && S.move.poolByMonth.length>=2, S.move.poolByMonth);
t('🔴 からだの 気づきに 天候の 但し書きが 入る',
  S.findings.filter(f=>/体を動か|動かす時間/.test(f.title)).every(f=>/天候に左右/.test(f.how)),
  S.findings.filter(f=>/体を動か|動かす時間/.test(f.title)).map(f=>f.how));

/* 8月だけ 雨つづきで プールが 落ちた ばあい */
const REP5 = JSON.parse(JSON.stringify(REPORTS));
Object.keys(REP5).forEach(k=>{ if(k>='2026-08-01') REP5[k].pool=''; });
const S5 = F.finaleStats(REP5, CONFIG);
t('8月の プール率が 0 に なる',
  S5.move.poolByMonth.find(m=>m.month==='2026-08').rate===0, S5.move.poolByMonth);
t('🔴 「プールの日数は 月で 大きく変わった」が 出る',
  S5.findings.some(f=>f.title.indexOf('プールの日数')>=0), S5.findings.map(f=>f.title));
t('🔴 その説明が「本人の意欲ではない」と 言っている',
  S5.findings.filter(f=>f.title.indexOf('プールの日数')>=0).every(f=>/意欲では なく 天候|意欲ではなく 天候/.test(f.how)),
  S5.findings.filter(f=>f.title.indexOf('プールの日数')>=0).map(f=>f.how));

console.log('\n── からっぽでも こわれない ──');
const E = F.finaleStats({}, CONFIG);
t('記録0でも 落ちない', E.days.recorded===0 && Array.isArray(E.findings), E.days);
const O = F.finaleStats({'2026-08-01':{date:'2026-08-01',study:[],reflection:''}}, CONFIG);
t('1日だけでも 落ちない', O.days.recorded===1, O.days);

console.log('\n── 気づきの 中身（目で見る） ──');
S.findings.forEach(f=>console.log(`  [${f.level}] ${f.title}\n      ${f.body}\n      ↳ ${f.how}`));

console.log(`\n${ok} OK / ${ng} NG`);
process.exit(ng?1:0);
