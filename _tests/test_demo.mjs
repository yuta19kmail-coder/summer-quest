/* ============================================================
   おためし版が「本番に さわらない」ことを たしかめる
     🔴 ① クラウド（Firestore / Firebase SDK）に 一度も 行かない
     🔴 ② そうさバーの ボタンが ぜんぶ 動く
     🔴 ③ バックアップJSONを 読んでも クラウドに 書き戻さない
   ============================================================ */
import fs from 'fs';
import { chromium } from 'playwright';

import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, '..', '..', '_demo', 'SUMMER_QUEST_おためし.html');
let ok=0, ng=0;
const t=(n,c,x)=>{ c?(ok++,console.log('  OK  '+n))
                    :(ng++,console.log('  NG  '+n+(x!==undefined?'  '+JSON.stringify(x).slice(0,260):''))); };

const browser = await chromium.launch(process.env.SQ_CHROME ? { executablePath: process.env.SQ_CHROME } : {});
const page = await browser.newPage({ viewport:{width:1360,height:940} });
const errs=[], hits=[];
page.on('pageerror',e=>errs.push(String(e)));
page.on('console',m=>{ if(m.type()==='error' && !/ERR_|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
/* 🔴 クラウドに 行ったら ぜんぶ 記録する */
page.on('request',r=>{ const u=r.url();
  if(/fonts\.(googleapis|gstatic)\.com/.test(u)) return;          /* フォントは クラウドでは ない */
  if(/firebasejs|firestore|googleapis\.com|cloudfunctions\.net|summer-quest-782f5|identitytoolkit/.test(u)) hits.push(u); });

await page.route(/cdn\.jsdelivr\.net.*chart/, r=>r.fulfill({contentType:'application/javascript',
  body: fs.readFileSync(process.env.SQ_CHARTJS || 'node_modules/chart.js/dist/chart.umd.js','utf8')}));
await page.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.fulfill({contentType:'text/css', body:''}));

await page.goto('file://'+FILE.replace(/\\/g,'/'),{waitUntil:'load'});
await page.waitForFunction(()=>typeof window.switchView==='function',{timeout:20000});
await page.waitForTimeout(1200);

console.log('── ① 本番に さわらない ──');
t('🔴 Firebase / Firestore / 関数 に 一度も 行っていない', hits.length===0, hits.slice(0,5));
t('🔴 Store は ローカルのまま', (await page.evaluate(()=>Store.mode))==='local',
  await page.evaluate(()=>Store.mode));
t('🔴 firebase の 設定が 空', await page.evaluate(()=>!(CONFIG.firebase&&CONFIG.firebase.apiKey)));
t('ログインを とばして 入っている', await page.evaluate(()=>!document.getElementById('app').classList.contains('hidden')));
t('親アカで 入っている（設定が 見られる）', (await page.evaluate(()=>ROLE))==='parent');
t('タイトルで おためしと わかる', /おためし版/.test(await page.title()));
t('そうさバーが 出ている', !!(await page.$('#demobar')));

console.log('\n── ② 中身 ──');
const st = await page.evaluate(()=>{ const S=finaleS(); return {
  days:S.days.recorded, rate:S.days.rate, sus:S.fixes.suspectN,
  gold: !!document.getElementById('btnEnd') }; });
t('40日ぶん 入っている', st.days===40, st);
t('金のボタンが 出ている', st.gold, st);
t('わざと しこんだ 単位ちがいが 見つかっている', st.sus>=1, st);

console.log('\n── ③ ボタンが ぜんぶ 動く ──');
t('はじめから サンプルの 手紙が 入っている', await page.evaluate(()=>!!(FINALE&&FINALE.letter)));
t('はじめから おうちの人の メッセージが 入っている',
  await page.evaluate(()=>!!(CONFIG.familyMsg&&CONFIG.familyMsg.text)));
await page.click('#dmLetter');
await page.waitForTimeout(200);
t('入れなおしても 手紙が ある', await page.evaluate(()=>!!(FINALE&&FINALE.letter)));

await page.click('#dmShou'); await page.waitForTimeout(800);
t('🏅 しょうじょうが 出る', await page.evaluate(()=>
  document.querySelectorAll('#view-sheets .sheet.shou').length)===1);

await page.click('#dmKid'); await page.waitForTimeout(1200);
t('📔 本人用が 出る（2まい）', await page.evaluate(()=>
  document.querySelectorAll('#view-sheets .sheet').length)===2);
t('サンプルの 手紙が 紙にも 出る', /行ってらっしゃい/.test(await page.textContent('#view-sheets')));
t('おうちの人の メッセージも 紙に 出る', /おとうさん/.test(await page.textContent('#view-sheets')));
t('🔴 タイルが つぶれていない（本体の .kpi と かぶっていない）', await page.evaluate(()=>{
  const ks=[...document.querySelectorAll('#view-sheets .shkpi')];
  return ks.length>0 && ks.every(k=>getComputedStyle(k).display!=='grid'); }));
t('🔴 ラベルが 切れていない', await page.evaluate(()=>{
  const ls=[...document.querySelectorAll('#view-sheets .shkpi .l')];
  return ls.length>0 && ls.every(el=>el.scrollWidth<=el.clientWidth+1); }));
/* 🚫 手紙を 消すと 空の紙を 出さない */
await page.click('#dmNoLetter'); await page.waitForTimeout(200);
await page.evaluate(()=>{ CONFIG.familyMsg={text:'',from:''}; renderSheets(); });
await page.waitForTimeout(600);
t('🔴 手紙も メッセージも 無いときも 2まいのまま',
  await page.evaluate(()=>document.querySelectorAll('#view-sheets .sheet').length)===2);
await page.click('#dmLetter'); await page.waitForTimeout(200);
await page.evaluate(()=>{ CONFIG.familyMsg=JSON.parse(localStorage.getItem('sq_config')).familyMsg; renderSheets(); });
await page.waitForTimeout(600);

await page.click('#dmPar'); await page.waitForTimeout(1500);
t('📊 親用が 出る（6まい）', await page.evaluate(()=>
  document.querySelectorAll('#view-preport .sheet').length)===6);
t('サンプルの 所見が 出る', /おためしの サンプル文/.test(await page.textContent('#view-preport')));
const pH = await page.evaluate(()=>[...document.querySelectorAll('#view-preport .sheet')]
  .map(el=>({h:el.scrollHeight, flow:el.classList.contains('flow')})));
t('🔴 ぜんぶ A4に おさまっている', pH.every(o=>o.flow||o.h<=1124), pH);
t('🔴 親用でも タイルが つぶれていない', await page.evaluate(()=>{
  const ks=[...document.querySelectorAll('#view-preport .shkpi')];
  return ks.length>0 && ks.every(k=>getComputedStyle(k).display!=='grid'); }));
t('🔴 親用でも ラベルが 切れていない', await page.evaluate(()=>{
  const ls=[...document.querySelectorAll('#view-preport .shkpi .l')];
  return ls.length>0 && ls.every(el=>el.scrollWidth<=el.clientWidth+1); }));

await page.evaluate(()=>switchView('home'));
await page.waitForTimeout(400);
await page.click('#dmEnd');
await page.waitForTimeout(300);
t('▶ エンディングが 走りだす', await page.evaluate(()=>
  document.getElementById('ending').classList.contains('on')));
await page.waitForFunction(()=>document.getElementById('et4') &&
  document.getElementById('et4').classList.contains('in'), {timeout:30000});
t('🔴 40マス うまって さいごまで 行く', await page.evaluate(()=>
  document.querySelectorAll('#ending .cell.done').length)===40);
t('エンディングにも 手紙が 出る', /行ってらっしゃい/.test(await page.textContent('#ending')));
await page.click('#endSkip'); await page.waitForTimeout(200);
t('とじられる', await page.evaluate(()=>!document.getElementById('ending').classList.contains('on')));

console.log('\n── ④ 8/30まで に 切りかえ ──');
await page.click('#dmShort');
await page.waitForTimeout(1600);
t('39日ぶんに なった', (await page.evaluate(()=>Object.keys(REPORTS).length))===39);
t('🔴 金のボタンが 消える', !(await page.$('#btnEnd')));
await page.click('#dmFull');
await page.waitForTimeout(1600);
t('もどすと また 出る', !!(await page.$('#btnEnd')));

console.log('\n── ⑤ 本物の バックアップを 読む ──');
/* 本番の 書き出しと 同じ かたち {config, reports, meta} */
const backup = await page.evaluate(()=>{
  const rep = window.__demoMake(31);                       /* 7/23〜8/22 の 31日 */
  return { config:{ vacStart:'2026-07-21', vacEnd:'2026-08-31',
                    firebase:{apiKey:'ダミー',projectId:'summer-quest-782f5'},   /* ← 切られるか 見る */
                    goals:[{emoji:'📕',name:'らくらくノート',unit:'ページ',total:60}] },
           reports:rep, meta:{} };
});
fs.writeFileSync(path.join(HERE,'_backup.json'), JSON.stringify(backup));
page.on('dialog', d=>d.accept());
await page.setInputFiles('#dmFile', path.join(HERE,'_backup.json'));
await page.waitForTimeout(2200);
t('本物の 記録が 入った（31日）', (await page.evaluate(()=>Object.keys(REPORTS).length))===31);
t('🔴 バックアップの firebase 設定は 切られている',
  await page.evaluate(()=>!(CONFIG.firebase&&CONFIG.firebase.apiKey)));
t('🔴 Store は まだ ローカル', (await page.evaluate(()=>Store.mode))==='local');
t('8/31が 無いので 金のボタンは 出ない', !(await page.$('#btnEnd')));
await page.evaluate(()=>switchView('preport'));
await page.waitForTimeout(1500);
t('本物の 記録でも レポートが 出る', (await page.evaluate(()=>
  document.querySelectorAll('#view-preport .sheet').length))===6);

console.log('\n── ⑥ さいごまで ──');
t('🔴 ここまで 一度も クラウドに 行っていない', hits.length===0, hits.slice(0,5));
t('🔴 JSエラーが 出ていない', errs.length===0, errs.slice(0,4));

console.log(`\n${ok} OK / ${ng} NG`);
await browser.close();
process.exit(ng?1:0);
