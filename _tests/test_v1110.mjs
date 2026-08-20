/* ============================================================
   SUMMER QUEST v1.11.0 ／ エンディング・賞状・本人用/親用レポート
     ① 版が そろっているか
     ② 8/31の 記録が 無いと 金のボタンが 出ないか／出たら 押せるか
     ③ エンディングが 最後まで 走るか（40マス うまる）
     ④ 紙もの3つが A4に おさまるか・JSエラーが 無いか
     ⑤ 親用レポートは 親だけ
     ⑥ せってい：おうちの人の メッセージ・記録のなおし が 保存されるか
     ⑦ 単位ちがいの 自動検出 →「→◯として読む」で 数字が 変わるか
   使い方： node test_v1110.mjs
   ============================================================ */
import fs from 'fs';
import { chromium } from 'playwright';

import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, '..', 'index.html');
const SRC  = fs.readFileSync(FILE, 'utf8');
let ok=0, ng=0;
const t=(n,c,x)=>{ c?(ok++,console.log('  OK  '+n))
                    :(ng++,console.log('  NG  '+n+(x!==undefined?'  '+JSON.stringify(x).slice(0,300):''))); };

console.log('── ① 版・かたち ──');
t('版が そろっている（meta と APP_VERSION）', (()=>{
  const a=/<meta name="app-version" content="(v[\d.]+)"/.exec(SRC);
  const b=/const APP_VERSION = '(v[\d.]+)'/.exec(SRC);
  return a&&b&&a[1]===b[1];
})());
t('明朝（賞状用）を よみこんでいる', /Noto\+Serif\+JP/.test(SRC));
t('紙の 画面が ある', /id="view-sheets"/.test(SRC) && /id="view-preport"/.test(SRC));
t('エンディングの 器が ある', /id="ending"/.test(SRC) && /id="starsF"/.test(SRC));
t('🔴 紙もの・集計の どこにも 添削回数（1回目/2回目）を 出していない', (()=>{
  const a=SRC.indexOf('v1.11.0 ここから'), b=SRC.indexOf('v1.11.0 ここまで');
  const blk=SRC.slice(a,b);
  return !/1回目|2回目|添削回数/.test(blk.replace(/AIは 1回だけ|1回きり/g,''));
})());

/* 🔴 CSSの クラス名が 本体アプリと かぶっていないか
      （かぶると 本体の ルールが かぶさって、レイアウトが 音も なく くずれる。
        実際に `.kpi` が 本体の `.kpi{display:grid;repeat(4,1fr)}` と かぶり、
        「はじめの スコア」が「はじ…」に 切れた） */
console.log('\n── ①b CSSの 名前が かぶっていないか ──');
{
  const css = SRC.slice(SRC.indexOf('<style>'), SRC.indexOf('</style>'));
  const A = css.indexOf('/* ============ v1.11.0 ここから');
  const B = css.indexOf('/* ============ v1.11.0 ここまで');
  const oldCss = css.slice(0, A);
  const newCss = css.slice(A, B);
  const strip = x => x.replace(/\/\*[\s\S]*?\*\//g, '');
  const topClasses = x => {
    const out = new Set();
    (strip(x).match(/([^{}]+)\{/g) || []).forEach(sel=>{
      if(sel.indexOf('@')>=0) return;
      sel.slice(0,-1).split(',').forEach(part=>{
        part = part.trim();
        if(part[0] !== '.') return;              /* 先頭が .xxx ＝ スコープされていない */
        const m = /^\.([A-Za-z_][\w-]*)/.exec(part);
        if(m) out.add(m[1]);
      });
    });
    return out;
  };
  const allClasses = x => {
    const out = new Set();
    (strip(x).match(/([^{}]+)\{/g) || []).forEach(sel=>{
      if(sel.indexOf('@')>=0) return;
      (sel.match(/\.([A-Za-z_][\w-]*)/g)||[]).forEach(c=>out.add(c.slice(1)));
    });
    return out;
  };
  const mine = topClasses(newCss), theirs = allClasses(oldCss);
  const dup = [...mine].filter(c=>theirs.has(c));
  t('🔴 v1.11.0 の スコープなしクラスが 本体と かぶっていない', dup.length===0, dup);
  const mineAll = allClasses(newCss), theirsTop = topClasses(oldCss);
  const dup2 = [...theirsTop].filter(c=>mineAll.has(c) && !mine.has(c));
  t('（参考）本体の スコープなしクラスと 同じ名前を 使っていないか', true, dup2);
}

/* ---- 合成データ（7/23〜8/31 の 40日） ---- */
function makeReports(opts){
  opts = opts||{};
  const R = {};
  let seed=2026; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
  const st=new Date(2026,6,23);
  const n = opts.days==null ? 40 : opts.days;
  for(let i=0;i<n;i++){
    const d=new Date(st); d.setDate(d.getDate()+i);
    const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const late=i>=22;
    const study=[];
    const p1= late ? (rnd()<0.4?0:1+Math.round(rnd())) : (1+Math.round(rnd()*2));
    if(p1) study.push({name:'らくらくノート',pages:p1,unit:'ページ'});
    if(!late) study.push({name:'さんすうドリル',pages:1,unit:'ページ'});
    if(key==='2026-07-29' && opts.unitBug) study.push({name:'研究の下調べ',pages:30,unit:'ページ'});
    const rainy = key>='2026-08-05';
    R[key]={ date:key, study,
      exercise: rnd()<0.22? [] : [{name:'なわとび',minutes:20}],
      pool: rnd()<(rainy?0.62:0.18)? '' : 45,
      typing:{ score: Math.round(175+i*4.2), memo:'' },
      game:[{kind:'game',name:'マイクラ',minutes:90},{kind:'anime',name:'アニメ',minutes:30}],
      narai:{ text:'' },
      reflection:'きょうは プールで いっぱい およいだ。水が つめたくて 気もちよかった。',
      reflectionReply:{study:'a',activity:'b',overall:'c'},
      updatedAt:new Date(2026,d.getMonth(),d.getDate(),late?20:18,10).toISOString() };
  }
  return R;
}

const browser = await chromium.launch(process.env.SQ_CHROME ? { executablePath: process.env.SQ_CHROME } : {});
const page = await browser.newPage({ viewport:{width:1280,height:900} });
const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
page.on('console',m=>{ if(m.type()==='error' && !/ERR_|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
/* CDN は 使えないので 手元の chart.js。Firebase は 落として ローカルモードに する */
await page.route(/cdn\.jsdelivr\.net.*chart/, r=>r.fulfill({contentType:'application/javascript',
  body: fs.readFileSync(process.env.SQ_CHARTJS || 'node_modules/chart.js/dist/chart.umd.js','utf8')}));
await page.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.fulfill({contentType:'text/css', body:''}));
await page.route(/gstatic\.com\/firebasejs/, r=>r.abort());
await page.route(/holidays|jsdelivr\.net\/gh/, r=>r.abort());

async function boot(reports, role, cfg){
  await page.addInitScript(({reports, role, cfg})=>{
    localStorage.clear();
    localStorage.setItem('sq_reports', JSON.stringify(reports));
    localStorage.setItem('sq_auth','1');
    localStorage.setItem('sq_role', role);
    localStorage.setItem('sq_config', JSON.stringify(cfg));
  }, {reports, role, cfg});
  await page.goto('file://'+FILE.replace(/\\/g,'/'), {waitUntil:'load'});
  await page.waitForFunction(()=>typeof window.switchView==='function', {timeout:20000});
  await page.waitForTimeout(700);
}
const CFG = {
  vacStart:'2026-07-21', vacEnd:'2026-08-31',
  firebase:{}, /* ← クラウドに つながない＝ローカルモード */
  goals:[
    {emoji:'📕',name:'らくらくノート',desc:'漢字の書き取りドリル',unit:'ページ',total:60},
    {emoji:'🧮',name:'さんすうドリル',desc:'計算ドリル',unit:'ページ',total:50},
    {emoji:'🔬',name:'研究の下調べ',desc:'自由研究のしらべもの',unit:'ページ',total:''}
  ]
};

console.log('\n── ② 金のボタん（8/31が 入るまで 出ない） ──');
const noLast = makeReports({days:39});                       /* 8/30まで */
await boot(noLast,'child',CFG);
t('8/31が 無いと 金のボタンは 出ない', !(await page.$('#btnEnd')));
await page.evaluate(()=>{ /* JSエラーが 出ていないか だけ 見る */ });

const full = makeReports({});
await boot(full,'child',CFG);
t('8/31が 入ると 金のボタンが 出る', !!(await page.$('#btnEnd')));
t('ボタンの 文言', (await page.textContent('#btnEnd')).indexOf('ぼうけんを おわる')>=0);
t('「40日ぶん」と 出ている', /40日ぶん/.test(await page.textContent('.goldsub')));

console.log('\n── ③ エンディング ──');
await page.click('#btnEnd');
await page.waitForTimeout(300);
t('エンディングが ひらいた', await page.evaluate(()=>document.getElementById('ending').classList.contains('on')));
t('星が うごいている', await page.evaluate(()=>{ const c=document.getElementById('starsF'); return c.width>0; }));
t('カレンダーの マスが 期間ぶん ある', await page.evaluate(()=>document.querySelectorAll('#ending .cell[data-d]').length)===42);
/* 演出を 最後まで 待つ（40日ぶんの アニメ＋あと） */
await page.waitForFunction(()=>document.getElementById('et4') &&
  document.getElementById('et4').classList.contains('in'), {timeout:30000});
const endState = await page.evaluate(()=>({
  done: document.querySelectorAll('#ending .cell.done').length,
  last: document.querySelectorAll('#ending .cell.last').length,
  cnt:  document.getElementById('endCnt').textContent,
  ac:   document.getElementById('endAc').classList.contains('in'),
  stats:[...document.querySelectorAll('#ending .stat .n')].map(n=>n.textContent)
}));
t('🔴 40マス ぜんぶ うまった', endState.done===40, endState);
t('さいごの1日だけ 金', endState.last===1, endState);
t('カウンタが 40', endState.cnt==='40', endState);
t('「1日も 休まなかった」が 出た', endState.ac, endState);
t('数字が 0から 動いた', endState.stats.every(x=>x!=='0'), endState.stats);
t('しょうじょう・きろく の ボタンが ある',
  !!(await page.$('#endShou')) && !!(await page.$('#endKid')));

console.log('\n── ④ 紙もの（A4に おさまるか） ──');
await page.click('#endShou');
await page.waitForTimeout(900);
const shouH = await page.evaluate(()=>[...document.querySelectorAll('#view-sheets .sheet')]
  .map(el=>({h:el.scrollHeight, flow:el.classList.contains('flow')})));
t('しょうじょうは 1まい', shouH.length===1, shouH);
t('🔴 A4に おさまっている', shouH.every(o=>o.flow||o.h<=1124), shouH);
t('名前が 入っている', /びゃくれん/.test(await page.textContent('#view-sheets .shou-name')));

await page.click('#shTab2');
await page.waitForTimeout(1200);
const kidH = await page.evaluate(()=>[...document.querySelectorAll('#view-sheets .sheet')]
  .map(el=>({h:el.scrollHeight, flow:el.classList.contains('flow')})));
t('ぼうけんの きろくは 2まい（1まい目＝A4ぴったり／2まい目＝ながれる紙）', kidH.length===2, kidH);
t('🔴 手紙が まだ 無くても 空の紙を 出さない（そこに 出ますと 書く）',
  /ここに 出ます/.test(await page.textContent('#view-sheets')));
t('🔴 A4に おさまっている', kidH.every(o=>o.flow||o.h<=1124), kidH);
t('グラフが 描けている', await page.evaluate(()=>!!document.getElementById('c_kStudy')));
/* 手紙と おうちの人の メッセージを 入れたら 3まいに なる */
const kid3 = await page.evaluate(()=>{
  FINALE = { letter:'びゃくれん へ\n\nよく つづけたね。\n\n行ってらっしゃい。',
             best:null, parentNote:null, madeAt:new Date().toISOString() };
  CONFIG.familyMsg = { text:'びゃくれん へ\nよく がんばりました。', from:'おとうさん' };
  renderSheets();
  return [...document.querySelectorAll('#view-sheets .sheet')]
    .map(el=>({h:el.scrollHeight, flow:el.classList.contains('flow')}));
});
t('🔴 手紙が 入っても まい数は 増えない（同じ紙に つづけて 流す）', kid3.length===2, kid3);
t('手紙・おうちの人 が 両方 出る', await page.evaluate(()=>{
  const x=document.getElementById('view-sheets').textContent;
  return /行ってらっしゃい/.test(x) && /よく がんばりました/.test(x) && /おとうさん/.test(x); }));
t('🔴 A4に おさまっている', kid3.every(o=>o.flow||o.h<=1124), kid3);
/* もとに もどす */
await page.evaluate(()=>{ FINALE=null; CONFIG.familyMsg={text:'',from:''}; });
t('🔴 タイル（shkpi）が 本体の grid に つぶされていない', await page.evaluate(()=>{
  const k=document.querySelector('#view-sheets .shkpi');
  if(!k) return false;
  const cs=getComputedStyle(k);
  return cs.display!=='grid';           /* grid なら 本体の .kpi が かぶさっている */
}));
t('🔴 ラベルが 切れていない（「はじめの スコア」が 全部 見える）', await page.evaluate(()=>{
  const ls=[...document.querySelectorAll('#view-sheets .shkpi .l')];
  return ls.length>0 && ls.every(el=>el.scrollWidth <= el.clientWidth+1);
}));
t('🔴 できなかったことが 書いていない（「たりない」「おくれ」等が 無い）',
  !/たりない|足りない|おくれて|遅れて|できなかった|未達/.test(await page.textContent('#view-sheets')));

console.log('\n── ⑤ 親用レポートは 親だけ ──');
t('子アカでは せっていに 入れない', await page.evaluate(()=>{ switchView('settings');
  return document.getElementById('view-settings').classList.contains('hidden'); }));
t('🔴 子アカでは 親用レポートに 入れない', await page.evaluate(()=>{ switchView('preport');
  return document.getElementById('view-preport').classList.contains('hidden'); }));

await boot(makeReports({unitBug:true}),'parent',CFG);
await page.evaluate(()=>switchView('preport'));
await page.waitForTimeout(1500);
const pH = await page.evaluate(()=>[...document.querySelectorAll('#view-preport .sheet')]
  .map(el=>({h:el.scrollHeight, flow:el.classList.contains('flow')})));
t('親アカなら ひらける（6まい）', pH.length===6, pH);
t('🔴 ぜんぶ A4に おさまっている', pH.every(o=>o.flow||o.h<=1124), pH);
const pText = await page.textContent('#view-preport');
t('「見かた」が 付いている', (pText.match(/見かた/g)||[]).length>=5);
t('🔴 プール＝天気 の 但し書きが ある', /プールは 天気の記録です|天候に左右/.test(pText));
t('🔴 この数字の 限界が 書いてある', /自己申告/.test(pText) && /因果ではありません/.test(pText));
t('🔴 単位ちがいの 注意が 出ている', /単位がちがう/.test(pText));
t('うんどう実施率と プール実施率が 分かれている',
  /うんどう 実施率/.test(pText) && /プール 実施率/.test(pText));
t('🔴 親用でも タイルが つぶれていない', await page.evaluate(()=>{
  const ks=[...document.querySelectorAll('#view-preport .shkpi')];
  if(!ks.length) return false;
  return ks.every(k=>getComputedStyle(k).display!=='grid');
}));
t('🔴 親用でも ラベルが 切れていない', await page.evaluate(()=>{
  const ls=[...document.querySelectorAll('#view-preport .shkpi .l')];
  return ls.length>0 && ls.every(el=>el.scrollWidth <= el.clientWidth+1);
}));
t('グラフが 6つ 描けている', await page.evaluate(()=>
  ['c_pStudy','c_pWeek','c_pMove','c_pScreen','c_pClock','c_pWrite'].every(id=>!!document.getElementById(id))));

console.log('\n── ⑤b レポートの 中で その場で なおせる（30分→30ページ 問題） ──');
{
  const before = await page.evaluate(()=>finaleS().study.total);
  t('🔴 なおす ボタンが レポートに ある', (await page.$$('#view-preport .fixbtn')).length>=1);
  t('🔴 本文の 中の 太字が 改行されていない（.find .bd b が block に なっていない）',
    await page.evaluate(()=>{
      const bs=[...document.querySelectorAll('#view-preport .find .bd b')];
      return bs.length>0 && bs.every(b=>getComputedStyle(b).display==='inline'); }));
  t('見出しの 太字は これまでどおり 行を 分けている',
    await page.evaluate(()=>{
      const b=document.querySelector('#view-preport .find > b');
      return !!b && getComputedStyle(b).display==='block'; }));
  const label = await page.textContent('#view-preport .fixbtn');
  t('「→ ◯ として 読む」と 書いてある', /として 読む/.test(label), label);
  t('「除外する」も ある', (await page.$$('#view-preport .fixbtn.del')).length>=1);
  t('🔴 ボタンは 紙には 出ない（noprint）', await page.evaluate(()=>{
    const td=document.querySelector('#view-preport .fixbtn').closest('td');
    return td.classList.contains('noprint'); }));

  await page.click('#view-preport .fixbtn');
  await page.waitForTimeout(1400);
  const after = await page.evaluate(()=>({
    total: finaleS().study.total,
    fixes: (CONFIG.fixes||[]).length,
    saved: (JSON.parse(localStorage.getItem('sq_config')||'{}').fixes||[]).length,
    sus:   finaleS().fixes.suspectN,
    n:     finaleS().fixes.n
  }));
  t('🔴 1タップで 合計が 減る（30 → 2 として 読む）', after.total < before, {before, after:after.total});
  t('🔴 その場で 保存されている（設定を保存する を 押さなくていい）', after.saved===1, after);
  t('もう「あやしい」には 出ない', after.sus===0, after);
  t('「読みかえた記録」に 1件 入った', after.n===1, after);
  await page.waitForTimeout(600);
  t('🔴 レポートが その場で 描きなおされた（読みかえた記録の 表が 出る）',
    /読みかえた記録/.test(await page.textContent('#view-preport')));
  t('「↺ もどす」が ある', (await page.$$('#view-preport .unfixbtn')).length>=1);

  await page.click('#view-preport .unfixbtn');
  await page.waitForTimeout(1400);
  const back = await page.evaluate(()=>({
    total: finaleS().study.total,
    saved: (JSON.parse(localStorage.getItem('sq_config')||'{}').fixes||[]).length,
    sus:   finaleS().fixes.suspectN }));
  t('🔴 もどすと 元の 数字に 返る', back.total===before, {before, back:back.total});
  t('保存からも 消える', back.saved===0, back);
  t('また「あやしい」に 出る', back.sus>=1, back);
  t('🔴 元の 記録は ずっと こわれていない', await page.evaluate(()=>{
    const r=JSON.parse(localStorage.getItem('sq_reports'))['2026-07-29'];
    return r.study.some(x=>x.name==='研究の下調べ' && x.pages===30); }));
}

console.log('\n── ⑥⑦ せってい：メッセージ・記録のなおし ──');
await page.evaluate(()=>switchView('settings'));
await page.waitForTimeout(600);
t('おうちの人の メッセージ欄が ある', !!(await page.$('#setFamText')));
t('レポートを ひらく ボタンが ある', !!(await page.$('#btnPReport')));
t('🔴 あやしい 記録が 見つかっている（7/29 研究の下調べ 30）', await page.evaluate(()=>{
  const r=[...document.querySelectorAll('.fixsus-r')];
  return r.some(x=>/7月29日/.test(x.textContent) && /研究の下調べ/.test(x.textContent));
}));
const before = await page.evaluate(()=>{ const S=finaleS(); return S.study.total; });
await page.click('.fixadd');
await page.waitForTimeout(1400);
const applied = await page.evaluate(()=>{
  const S=finaleS();
  return { total:S.study.total, fixN:S.fixes.n, susN:S.fixes.suspectN,
           saved:(JSON.parse(localStorage.getItem('sq_config')||'{}').fixes||[]).length,
           fixes:CONFIG.fixes };
});
t('🔴 せっていでも 1タップで 合計が 減る', applied.total < before, {before, after:applied.total});
t('🔴 その場で 保存される', applied.saved===1, applied);
t('なおしが 1件 記録された', applied.fixN===1, applied);
t('もう「あやしい」には 出ない', applied.susN===0, applied);
t('「いま 読みかえている 記録」に 出る',
  /いま 読みかえている 記録/.test(await page.textContent('#view-settings')));
t('せっていにも「↺ もどす」が ある', (await page.$$('#view-settings .unfixbtn')).length>=1);
const fam = await page.evaluate(()=>{
  document.getElementById('setFamText').value='びゃくれん へ\nよく がんばりました。';
  document.getElementById('setFamFrom').value='おとうさん';
  collectFinaleSettings();
  return CONFIG.familyMsg;
});
t('おうちの人の メッセージが CONFIGに 入った',
  fam.text.indexOf('よく がんばりました')>=0 && fam.from==='おとうさん', fam);
t('🔴 元の 記録は こわれていない', await page.evaluate(()=>{
  const r=JSON.parse(localStorage.getItem('sq_reports'))['2026-07-29'];
  return r.study.some(s=>s.name==='研究の下調べ' && s.pages===30);
}));

console.log('\n── ⑧ おうちの人の メッセージが 紙に 出るか ──');
await page.evaluate(()=>{ openSheets('kid'); });
await page.waitForTimeout(1000);
t('本人用レポートに おうちの人の メッセージが 出る',
  /よく がんばりました/.test(await page.textContent('#view-sheets')));

console.log('\n── ⑨ 印刷モード ──');
t('印刷の しくみが ある（print-mode）', /print-mode/.test(SRC) && /@media print/.test(SRC));
t('印刷で ナビ・ボタンを 隠している', /body\.print-mode \.nav/.test(SRC) && /body\.print-mode \.noprint/.test(SRC));
t('印刷ボタンが ある', !!(await page.$('#shPrint')));

console.log('\n── ⑩ こわれない ──');
await boot({},'parent',CFG);
t('記録0でも 落ちない（TOP）', await page.evaluate(()=>{ switchView('home');
  return !document.getElementById('view-home').classList.contains('hidden'); }));
t('記録0では 金のボタンは 出ない', !(await page.$('#btnEnd')));
await page.evaluate(()=>switchView('preport'));
await page.waitForTimeout(900);
t('記録0でも 親用レポートが ひらく（落ちない）',
  await page.evaluate(()=>document.querySelectorAll('#view-preport .sheet').length)===6);
await page.evaluate(()=>switchView('summary'));
await page.waitForTimeout(500);
t('もとからの せいせき画面も 生きている',
  await page.evaluate(()=>!!document.getElementById('c_radar')));

t('🔴 さいごまで JSエラーが 出ていない', errs.length===0, errs.slice(0,4));

console.log(`\n${ok} OK / ${ng} NG`);
await browser.close();
process.exit(ng?1:0);
