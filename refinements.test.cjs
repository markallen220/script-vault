const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
const html=fs.readFileSync(__dirname+'/index.html','utf8');const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const ctx=vm.createContext({Date,console});vm.runInContext(code.slice(code.indexOf('/* ---------- bounded practice'),code.indexOf('/* ---------- add / edit script')),ctx);
test('streak expires after a missed local day and spans calendar boundaries',()=>{
  ctx.now=new Date(2026,0,1,1);ctx.st={last:'2025-12-31',count:4};assert.equal(vm.runInContext('currentStreak(st,now)',ctx),4);
  ctx.st.last='2025-12-30';assert.equal(vm.runInContext('currentStreak(st,now)',ctx),0);
  ctx.st.last='2026-01-01';assert.equal(vm.runInContext('currentStreak(st,now)',ctx),4);
  ctx.now=new Date(2026,8,16,23,45);assert.equal(vm.runInContext('localDay(now)',ctx),'2026-09-16');
});
test('practice prioritizes low ratings then oldest practice without mutating the library',()=>{
  ctx.items=[{id:'confident',mastery:5},{id:'recent',mastery:1,lastPracticed:'2026-09-16'},{id:'untried',mastery:1}];
  assert.equal(vm.runInContext('rankPractice(items).map(x=>x.id).join(",")',ctx),'untried,recent,confident');assert.equal(ctx.items[0].id,'confident');
});
test('content revisions and restoring preserve identity, progress, and custom metadata',()=>{
  ctx.s={id:'stable',title:'Original',text:'Original script',mastery:4,lastPracticed:'2026-09-16',custom:'keep'};
  vm.runInContext('saveScriptRevision(s,{title:"Changed",text:"New script"})',ctx);
  assert.equal(ctx.s.revisions[0].content.text,'Original script');assert.equal(ctx.s.mastery,4);
  vm.runInContext('saveScriptRevision(s,scriptContent(s.revisions.at(-1).content))',ctx);
  assert.equal(ctx.s.text,'Original script');assert.equal(ctx.s.id,'stable');assert.equal(ctx.s.custom,'keep');assert.equal(ctx.s.lastPracticed,'2026-09-16');
  vm.runInContext('for(let i=0;i<15;i++)saveScriptRevision(s,{text:String(i)})',ctx);assert.equal(ctx.s.revisions.length,10);
});
test('recording guard blocks navigation while requesting, recording, or saving',()=>{
  const start=code.indexOf('function recordingNavigationAllowed()');const end=code.indexOf("document.addEventListener('click'",start);
  const c=vm.createContext({recordingPending:true,mediaRecorder:null,toast:()=>{}});vm.runInContext(code.slice(start,end),c);
  assert.equal(vm.runInContext('recordingNavigationAllowed()',c),false);c.recordingPending=false;c.mediaRecorder={state:'inactive'};assert.equal(vm.runInContext('recordingNavigationAllowed()',c),false);c.mediaRecorder=null;assert.equal(vm.runInContext('recordingNavigationAllowed()',c),true);
});
test('ratings synchronize the stored practice flags in both directions',()=>{
  const c=vm.createContext({save:()=>{},updateStats:()=>{},LS:{scripts:'scripts'},scripts:[],s:{mastery:5,worksWell:true,needsPractice:false}});
  vm.runInContext(code.slice(code.indexOf('function setMastery'),code.indexOf('function renderRateDots')),c);
  vm.runInContext('setMastery(s,2)',c);assert.equal(c.s.needsPractice,true);assert.equal(c.s.worksWell,false);
  vm.runInContext('setMastery(s,4)',c);assert.equal(c.s.needsPractice,false);assert.equal(c.s.worksWell,true);
});
test('revealing an ambush answer does not log practice; explicit rating does',()=>{
  const nodes={};const node=()=>({classList:{add(){}},style:{}});let practiced=0,callback;
  const c=vm.createContext({scripts:[{id:'s',category:'Objection Handler',text:'Answer',title:'Example'}],recordingNavigationAllowed:()=>true,esc:x=>x,styleScriptText:x=>x,openOverlay:()=>{},$:id=>nodes[id]??=node(),renderRateDots:(id,s,cb)=>{callback=cb;},setMastery:()=>{},markPracticed:()=>practiced++,toast:()=>{}});
  vm.runInContext(code.slice(code.indexOf('function openAmbush'),code.indexOf('/* ---------- My Takes')),c);vm.runInContext('openAmbush()',c);
  nodes['#ambReveal'].onclick();assert.equal(practiced,0);callback(3);assert.equal(practiced,1);
});
test('new practice and revision metadata remain within the existing backup format',async()=>{
  const crypto=require('node:crypto').webcrypto;
  const c=vm.createContext({crypto,TextEncoder,Blob,structuredClone,Uint8Array,atob,btoa});const start=code.indexOf('const VaultBackup =');const end=code.indexOf('let backupBusy =');vm.runInContext(code.slice(start,end),c);
  c.data={scripts:[{id:'stable',title:'Original',text:'Text',category:'Call Flow',callStage:'Opening',revisions:[{savedAt:'2026-09-16T10:00:00Z',content:{title:'Older',text:'Old'}}]}],scores:[{kind:'practice-session',id:'session',day:'2026-09-16',attempts:[{scriptId:'stable',rating:3,note:'Pause longer'}]}],streak:{last:'2026-09-16',count:1},takes:[]};
  const result=await vm.runInContext('VaultBackup.encode(data)',c);assert.equal(result.data.scores[0].attempts[0].note,'Pause longer');assert.equal(result.data.scripts[0].revisions[0].content.text,'Old');
});
