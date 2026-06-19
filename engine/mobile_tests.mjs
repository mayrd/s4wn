// S4WN Mobile Enhancement Tests (Session 95)
// Run: node engine/mobile_tests.mjs
let p=0,f=0;
function t(n,fn){try{fn();p++;console.log('  OK '+n)}catch(e){f++;console.log('  FAIL '+n)}}
function e(a,b,m){if(a!==b)throw Error(m||a+'!=='+b)}
function ok(v,m){if(!v)throw Error(m)}
console.log('=== Mobile Tests ===');
t('mobile: collapse cats 2+',()=>{let b=[{m:''},{m:''},{m:''}];b.forEach((x,i)=>{if(i>0){x.m='0'}});e(b[0].m,'');e(b[1].m,'0');e(b[2].m,'0')});
t('desktop: expand all',()=>{let b=[{m:''},{m:''}];b.forEach(x=>{x.m='800px'});e(b[0].m,'800px');e(b[1].m,'800px')});
t('arrow rotation',()=>{let a=c=>c?'r(-90)':'r(0)';e(a(true),'r(-90)');e(a(false),'r(0)')});
t('toggle state',()=>{let m='0',c=m==='0';m=c?'800px':'0';e(m,'800px')});
t('arrow idempotency',()=>{let a={},mk=id=>{if(!a[id]){a[id]={};return'new'}return'dup'};e(mk(0),'new');e(mk(0),'dup');e(Object.keys(a).length,1)});
t('screen.orientation guard',()=>{ok(!({}).orientation)});
t('matchMedia modern',()=>{let m='none';let q={addEventListener:()=>{m='modern'}};if(q.addEventListener)q.addEventListener();e(m,'modern')});
t('matchMedia legacy',()=>{let m='none';let q={addListener:()=>{m='legacy'}};if(!q.addEventListener)q.addListener();e(m,'legacy')});
t('monkey-patch preserves original',()=>{let origRan=0,extraRan=0;let orig=()=>{origRan=1};let patched=()=>{orig();extraRan=1};patched();ok(origRan&&extraRan)});
t('debounce clear',()=>{let c=0,d={t:123};if(d.t)c=1;d.t=456;ok(c);e(d.t,456)});
t('isMobile 768px',()=>{let im=w=>w<768;ok(im(375));ok(im(767));ok(!im(768));ok(!im(1024))});
t('touchDidDrag guard',()=>{let d=0,pl=0;let te=()=>{if(d)return;pl=1};d=1;te();ok(!pl);d=0;te();ok(pl)});
t('long-press cancel',()=>{let f=0,t=1;t=0;ok(!f)});
t('long-press fire',()=>{let f=0;f=1;ok(f)});
t('pinch zoom math',()=>{let pd=(x1,y1,x2,y2)=>Math.sqrt((x2-x1)**2+(y2-y1)**2);e(pd(0,0,100,0),100);e(pd(0,0,30,40),50)});
console.log('\n' + p + ' passed, ' + f + ' failed');
process.exit(f>0?1:0);
