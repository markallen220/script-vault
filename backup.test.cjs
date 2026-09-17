const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const html = fs.readFileSync(__dirname + '/index.html','utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const core = code.slice(code.indexOf('const VaultBackup ='), code.indexOf('/* ---------- Browser storage adapter ---------- */'));
const api = vm.runInNewContext(core + '\nVaultBackup', {
  crypto:webcrypto, TextEncoder, Blob, Uint8Array, structuredClone, atob, btoa
});
const clone = x => structuredClone(x);
function snapshot(label='Original') {
  return {scripts:[{id:'flow-expired',title:label+' "quoted" <title>',text:'Line one\n[Pause]\n你好',category:'Call Flow',callStage:'Opening',mastery:3,needsPractice:true,worksWell:false,lastPracticed:'2026-09-16',customNote:'preserve me'}],
    scores:[{score:3,date:1789550000000}],streak:{last:'2026-09-16',count:9},
    takes:[{id:'t_1',scriptId:'flow-expired',date:1789550000000,blob:new Blob([Uint8Array.from([0,1,2,127,128,255])],{type:'audio/webm;codecs=opus'})}]};
}
function adapter(initial) {
  let saved=clone(initial), journal=null, writeCount=0, failWrite=0, failJournal=false, persistentFailure=false, corruptReadback=false, crash=false;
  return {
    async read(){return clone(saved);},
    async write(next){
      writeCount++;
      // Model localStorage having succeeded while the IDB transaction fails.
      saved.scripts=clone(next.scripts); saved.scores=clone(next.scores);
      if (writeCount===failWrite || persistentFailure || crash) throw Error('simulated storage failure');
      saved=clone(next);
      if(corruptReadback && writeCount===1) saved.takes=[];
    },
    async journalRead(){return clone(journal);},
    async journalWrite(value){if(failJournal)throw Error('journal unavailable');journal=clone(value);},
    async journalClear(){journal=null;},
    set(options){({failWrite=failWrite,failJournal=failJournal,persistentFailure=persistentFailure,corruptReadback=corruptReadback,crash=crash}=options);},
    get writes(){return writeCount;}
  };
}
async function equalSnapshots(actual,expected) {
  assert.equal((await api.encode(actual)).sha256,(await api.encode(expected)).sha256);
}
test('complete round trip preserves script metadata, progress, audio bytes, MIME and relationships',async()=>{
  const original=snapshot(); const backup=await api.parse(JSON.stringify(await api.encode(original)));
  const restored=api.decode(backup); await equalSnapshots(restored,original);
  assert.deepEqual(new Uint8Array(await restored.takes[0].blob.arrayBuffer()),new Uint8Array(await original.takes[0].blob.arrayBuffer()));
  assert.equal(restored.takes[0].blob.type,original.takes[0].blob.type);
  assert.equal(restored.scripts[0].customNote,'preserve me');
});
test('empty vault and recordings for deleted scripts are preserved',async()=>{
  const empty={scripts:[],scores:[],streak:{last:null,count:0},takes:[]};
  await equalSnapshots(api.decode(await api.encode(empty)),empty);
  const orphan=snapshot();orphan.scripts=[];await equalSnapshots(api.decode(await api.encode(orphan)),orphan);
});
test('large audio validates without regular expression stack overflow',async()=>{
  const s=snapshot();s.takes[0].blob=new Blob([new Uint8Array(3*1024*1024)],{type:'audio/webm'});
  const envelope=await api.encode(s);await api.parse(JSON.stringify(envelope));
});
test('corrupted, foreign and future-version files are rejected',async()=>{
  await assert.rejects(api.parse('{broken'),/valid JSON/);
  await assert.rejects(api.parse('{}'),/VAULT backup/);
  const good=await api.encode(snapshot());
  const future=clone(good);future.version=2;await assert.rejects(api.validate(future),/version/);
  const damaged=clone(good);damaged.data.takes[0].audio='AA==';await assert.rejects(api.validate(damaged),/verification failed/);
});
test('invalid IDs, duplicate IDs, unsafe object keys and invalid field types fail before writes',async()=>{
  const changes=[
    d=>d.scripts.push(clone(d.scripts[0])),
    d=>d.takes.push(clone(d.takes[0])),
    d=>d.scripts[0].id='x" onclick="bad',
    d=>d.scripts[0].mastery=6,
    d=>d.scripts[0].text=null,
    d=>d.scripts[0].lastPracticed='2026-02-30',
    d=>d.streak.count=-1,
    d=>d.takes[0].audio='not base64!',
    d=>d.takes[0].audio='AB==',
    d=>d.takes[0].type='text/html',
    d=>Object.defineProperty(d.scripts[0],'__proto__',{value:{polluted:true},enumerable:true})
  ];
  for(const mutate of changes){
    const envelope=await api.encode(snapshot());mutate(envelope.data);envelope.sha256=await api.digest(envelope.data);
    const storage=adapter(snapshot());await assert.rejects(api.restore(storage,envelope,'unused'));assert.equal(storage.writes,0);assert.equal(await storage.journalRead(),null);
  }
});
test('restore replaces all collections and verifies the resulting state',async()=>{
  const before=snapshot(),after=snapshot('Restored');after.takes=[];after.scores=[];after.streak.count=1;
  const store=adapter(before);await api.restore(store,await api.encode(after),(await api.encode(before)).sha256);
  await equalSnapshots(await store.read(),after);assert.equal(await store.journalRead(),null);
});
test('stale preview cannot replace a newer saved vault',async()=>{
  const original=snapshot(), store=adapter(snapshot('Edited in another tab'));
  await assert.rejects(api.restore(store,await api.encode(snapshot('Incoming')),(await api.encode(original)).sha256),/changed after the preview/);
  assert.equal(store.writes,0);assert.equal(await store.journalRead(),null);
});
test('journal failure prevents all application-data writes',async()=>{
  const before=snapshot(),store=adapter(before);store.set({failJournal:true});
  await assert.rejects(api.restore(store,await api.encode(snapshot('Incoming')),(await api.encode(before)).sha256),/journal unavailable/);
  assert.equal(store.writes,0);await equalSnapshots(await store.read(),before);
});
test('partial write failure rolls both storage collections back',async()=>{
  const before=snapshot(),store=adapter(before);store.set({failWrite:1});
  await assert.rejects(api.restore(store,await api.encode(snapshot('Incoming')),(await api.encode(before)).sha256),/previous saved data was restored/);
  await equalSnapshots(await store.read(),before);assert.equal(await store.journalRead(),null);
});
test('readback mismatch triggers rollback rather than reporting success',async()=>{
  const before=snapshot(),store=adapter(before);store.set({corruptReadback:true});
  await assert.rejects(api.restore(store,await api.encode(snapshot('Incoming')),(await api.encode(before)).sha256),/previous saved data was restored/);
  await equalSnapshots(await store.read(),before);
});
test('failed rollback retains recovery journal and succeeds after storage becomes available',async()=>{
  const before=snapshot(),store=adapter(before);store.set({persistentFailure:true});
  await assert.rejects(api.restore(store,await api.encode(snapshot('Incoming')),(await api.encode(before)).sha256),e=>e.recoveryRequired===true);
  assert.ok(await store.journalRead());store.set({persistentFailure:false});
  assert.equal(await api.recover(store),true);await equalSnapshots(await store.read(),before);assert.equal(await store.journalRead(),null);
});
test('startup restores an interrupted partial import',async()=>{
  const before=snapshot(),store=adapter(before);await store.journalWrite(await api.encode(before));
  store.set({crash:true});await assert.rejects(store.write(snapshot('Half-written')));store.set({crash:false});
  assert.equal(await api.recover(store),true);await equalSnapshots(await store.read(),before);
  assert.equal(await api.recover(store),false);
});
test('pending recovery prevents a second restore overwriting the journal',async()=>{
  const before=snapshot(),store=adapter(before),pending=await api.encode(before);await store.journalWrite(pending);
  await assert.rejects(api.restore(store,await api.encode(snapshot('Incoming')),pending.sha256),/earlier restore/);
  assert.equal(store.writes,0);assert.equal((await store.journalRead()).sha256,pending.sha256);
});
test('corrupted recovery journal is retained without modifying saved data',async()=>{
  const before=snapshot(),store=adapter(before),pending=await api.encode(before);pending.sha256='bad';await store.journalWrite(pending);
  await assert.rejects(api.recover(store),/verification failed/);assert.equal(store.writes,0);assert.ok(await store.journalRead());
});
test('original scripts, styling and existing navigation remain in development copy',()=>{
  const hash = value => require('node:crypto').createHash('sha256').update(value).digest('hex');
  const seed = code.slice(code.indexOf('const SEED'),code.indexOf('const CATEGORIES'));
  assert.equal(hash(seed), 'c33fbe9e90e48edc963b2e8cbf6132d9e705f25af672788544baf3402d51a70a');
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.equal(hash(css.slice(0,css.indexOf('.backup-tools'))), '9f061a586095f65148c3716dac51820526a1f9967578afa05caab657c2fbf2fe');
  for(const screen of ['browse','flow','drill','obj','search']) assert.ok(html.includes(`data-screen="${screen}"`));
  new vm.Script(code);
  assert.equal((html.match(/id="backupBtn"/g)||[]).length,1);
});
function storageAdapterContext() {
  let tx,closed=false;
  const database={close(){closed=true;},transaction(){tx={objectStore:()=>({}),abort(){this.onabort?.();}};return tx;}};
  const indexedDB={open(){const request={result:database};queueMicrotask(()=>request.onsuccess());return request;}};
  const section=code.slice(code.indexOf('let backupBusy ='),code.indexOf('/* ---------- Backup / Restore interface ---------- */'));
  const ctx=vm.createContext({indexedDB,setTimeout,clearTimeout,LS:{},localStorage:{},scripts:[]});
  vm.runInContext(section,ctx);
  return {ctx,get transaction(){return tx;},get closed(){return closed;}};
}
test('IndexedDB wrapper waits for transaction commit, not request success',async()=>{
  const harness=storageAdapterContext();let resolved=false;
  const pending=vm.runInContext("vaultTransaction('test','takes','readwrite',(store,done)=>done('result'))",harness.ctx).then(value=>{resolved=true;return value;});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(resolved,false);
  harness.transaction.oncomplete();assert.equal(await pending,'result');assert.equal(harness.closed,true);
});
test('IndexedDB wrapper rejects an aborted transaction and closes its connection',async()=>{
  const harness=storageAdapterContext();
  const pending=vm.runInContext("vaultTransaction('test','takes','readwrite',()=>{})",harness.ctx);
  const rejected=assert.rejects(pending,/could not finish saving/);
  await new Promise(resolve=>setImmediate(resolve));harness.transaction.onabort();await rejected;assert.equal(harness.closed,true);
});
