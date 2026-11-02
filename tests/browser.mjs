import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const url=(process.env.TEST_URL||'http://127.0.0.1:4173').replace(/\/+$/,'');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
const results=[],errors=[];
async function check(name,fn){await fn();results.push(name);console.log('PASS '+name);}
const screenshot=name=>fileURLToPath(new URL('../test-results/'+name,import.meta.url));
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const external=[];
 page.on('request',r=>{if(!r.url().startsWith(url)&&!r.url().startsWith('data:'))external.push(r.url());});
 await page.goto(url+'/');await page.waitForSelector('html[data-ready="true"]');
 await check('One-screen edition, all nine real portraits loaded, no initial external requests or audio',async()=>{
  assert.equal(await page.locator('.artist-button').count(),9);
  assert.equal(await page.locator('#artist-strip canvas[data-loaded="true"]').count(),9);
  assert.equal(await page.locator('#sculpture').getAttribute('data-loaded'),'true');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),true);
  assert.deepEqual(external,[]);assert.equal(await page.locator('audio').getAttribute('src'),null);
 });
 await check('Artwork occupies roughly half the desktop height and its knob has a visible prompt',async()=>{
  const box=await page.locator('#sculpture').boundingBox();
  assert.ok(box.height>=480&&box.height<=600,JSON.stringify(box));
  assert.ok(box.width>=720,JSON.stringify(box));
  assert.match(await page.locator('#knob-hint').textContent(),/Twist the knob/);
  assert.equal(await page.locator('#time-dial').getAttribute('aria-describedby'),'knob-hint');
 });
 await check('Hand dial captures drag outside its bounds and updates the visible festival time',async()=>{
  const box=await page.locator('#time-dial').boundingBox();const x=box.x+box.width/2,y=box.y+box.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+160,y-110,{steps:12});await page.mouse.up();
  assert.equal(await page.locator('#time-dial').getAttribute('aria-valuenow'),'1080');
  assert.equal(await page.locator('#scene-clock').textContent(),'08:00');
  assert.equal(await page.locator('html').getAttribute('data-phase'),'dawn');
  assert.equal(await page.locator('#journey-time').inputValue(),'1080');
 });
 await check('Dial, time range and keyboard remain synchronised',async()=>{
  await page.locator('#time-dial').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#journey-time').inputValue(),'15');
  await page.locator('#journey-time').focus();await page.keyboard.press('End');assert.equal(await page.locator('#time-dial').getAttribute('aria-valuenow'),'1080');
  await page.keyboard.press('Home');assert.equal(await page.locator('html').getAttribute('data-phase'),'afternoon');
 });
 await check('All nine portraits and the sculpture match each theme without fetching new images',async()=>{
  const imageRequests=[];const record=request=>{if(request.resourceType()==='image')imageRequests.push(request.url());};
  page.on('request',record);
  const palettes=[];
  for(const [value,phase] of [[0,'afternoon'],[180,'twilight'],[600,'night'],[990,'dawn']]){
   await page.locator('#journey-time').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},value);
   const result=await page.evaluate(()=>{
    const style=getComputedStyle(document.documentElement),rgb=token=>style.getPropertyValue(token).trim().slice(1).match(/../g).map(hex=>parseInt(hex,16)).join(',');
    const portraits=[...document.querySelectorAll('#artist-strip canvas')].map(canvas=>{
     const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();
     for(let i=0;i<pixels.length;i+=4)colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`);
     return {phase:canvas.dataset.phase,colors:[...colors].sort()};
    });
    const canvas=document.querySelector('#sculpture'),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let sculpture;for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]){sculpture=`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`;break;}
    return {expected:[rgb('--ink'),'0,0,0'].sort(),ink:rgb('--ink'),portraits,sculpture};
   });
   for(const portrait of result.portraits){assert.equal(portrait.phase,phase);assert.deepEqual(portrait.colors,result.expected);}
   assert.equal(result.sculpture,result.ink);palettes.push(result.ink);
  }
  assert.equal(new Set(palettes).size,4);assert.deepEqual(imageRequests,[]);page.off('request',record);
  await page.locator('#time-dial').focus();await page.keyboard.press('Home');
 });
 await check('ASCII and dither are distinct renderings of the same artwork',async()=>{
  const before=await page.locator('#sculpture').evaluate(c=>c.toDataURL());await page.locator('#art-mode').click();
  assert.equal(await page.locator('#sculpture').getAttribute('data-mode'),'ascii');
  assert.notEqual(await page.locator('#sculpture').evaluate(c=>c.toDataURL()),before);
  await page.locator('#art-mode').click();assert.equal(await page.locator('#sculpture').getAttribute('data-mode'),'dither');
 });
 await check('Programme opens with 17 encounters and keyboard expands a set',async()=>{
  await page.locator('[data-panel="programme"]').click();assert.equal(await page.locator('.event').count(),17);
  await page.locator('#event-solo summary').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#event-solo').evaluate(e=>e.open),true);
  await page.locator('#event-search').fill('Between Leaf');assert.equal(await page.locator('.event').count(),1);assert.equal(await page.locator('#event-solo').evaluate(e=>e.open),true);
  await page.locator('#reset-filters').click();assert.equal(await page.locator('.event').count(),17);
 });
 await check('Live filter, expand/collapse and empty search state work',async()=>{
  await page.locator('[data-filter="performance"]').click();assert.equal(await page.locator('.event').count(),7);
  await page.locator('#expand-all').click();assert.equal(await page.locator('.event[open]').count(),7);
  await page.locator('#expand-all').click();assert.equal(await page.locator('.event[open]').count(),0);
  await page.locator('#event-search').fill('not a real festival set');assert.equal(await page.locator('.empty').count(),1);
  await page.locator('#reset-filters').click();
 });
 await check('Saved journey persists after reload',async()=>{
  await page.locator('#event-solo summary').click();await page.locator('[data-save="solo"]').click();
  await page.reload();await page.waitForSelector('html[data-ready="true"]');await page.locator('[data-panel="programme"]').click();
  await page.locator('[data-filter="saved"]').click();assert.equal(await page.locator('.event').count(),1);assert.equal(await page.locator('.event').getAttribute('id'),'event-solo');
  await page.locator('#reset-filters').click();await page.keyboard.press('Escape');
 });
 // Recording failures are deliberate fixtures here; the fallback remains usable.
 await page.route('https://p.scdn.co/**',r=>r.abort());await page.route('https://bandcamp.com/**',r=>r.abort());
 await check('Portrait selection requests the correct recording and opens a credited profile',async()=>{
  await page.locator('.artist-button[data-artist="adotj"]').click();
  assert.equal(await page.locator('#panel-title').textContent(),'adotj');
  assert.equal(await page.locator('#track-name').textContent(),'Epipremnum Aureum');
  assert.match(await page.locator('audio').getAttribute('src'),/^https:\/\/p.scdn.co/);
  await page.waitForSelector('.profile-portrait[data-loaded="true"]');
  assert.match(await page.locator('.profile small').textContent(),/Spotify/);
 });
 await check('An open artist profile follows time colours and keeps its dither pattern',async()=>{
  const result=await page.evaluate(()=>{
   const profile=document.querySelector('.profile-portrait'),read=()=>profile.getContext('2d').getImageData(0,0,profile.width,profile.height).data;
   const range=document.querySelector('#journey-time'),before=read();range.value=990;range.dispatchEvent(new Event('input',{bubbles:true}));
   const after=read(),ink=getComputedStyle(document.documentElement).getPropertyValue('--ink').trim().slice(1).match(/../g).map(hex=>parseInt(hex,16));
   let changed=false,samePattern=true;
   for(let i=0;i<before.length;i+=4){
    if(before[i]!==after[i])changed=true;
    if((before[i]>100)!==(after[i]===ink[0]))samePattern=false;
   }
   const phase=profile.dataset.phase;range.value=0;range.dispatchEvent(new Event('input',{bubbles:true}));
   return {changed,samePattern,phase};
  });
  assert.deepEqual(result,{changed:true,samePattern:true,phase:'dawn'});
 });
 await check('Artist programme link includes all separate collaborations and solo',async()=>{
  await page.locator('[data-find-artist="adotj"]').click();
  for(const id of ['roots','solo','dawn'])assert.equal(await page.locator('#event-'+id).count(),1);
  await page.locator('[data-filter="performance"]').click();assert.equal(await page.locator('.event').count(),3);
  await page.keyboard.press('Escape');
 });
 await check('Profile close restores focus while music persists; player close stops media',async()=>{
  assert.equal(await page.locator('.artist-button[data-artist="adotj"]').evaluate(e=>e===document.activeElement),true);
  assert.equal(await page.locator('#floating-player').isVisible(),true);
  await page.locator('#player-expand').click();
  assert.equal(await page.locator('#player-drawer').isVisible(),await page.locator('#player-expand').getAttribute('aria-expanded')==='true');
  await page.locator('#player-close').click();assert.equal(await page.locator('audio').getAttribute('src'),null);
  assert.equal(await page.locator('#floating-player').isVisible(),false);
 });
 await check('Bandcamp uses real controls; switching artist removes its previous recording',async()=>{
  await page.locator('.artist-button[data-artist="manganiyar"]').click();
  assert.match(await page.locator('#persistent-embed iframe').getAttribute('src'),/album=1805014959/);
  assert.equal(await page.locator('#music-toggle').isVisible(),false);assert.match(await page.locator('.profile small').textContent(),/unconfirmed/);
  await page.keyboard.press('Escape');await page.locator('.artist-button[data-artist="wild"]').click();
  assert.equal(await page.locator('#persistent-embed iframe').count(),0);assert.equal(await page.locator('#track-name').textContent(),'Quiet Voices of the Ether');
  await page.keyboard.press('Escape');await page.locator('#player-close').click();
 });
 await check('Listening room preserves Garson and separates the radio from the artist catalogue',async()=>{
  await page.locator('[data-panel="listening"]').click();assert.match(await page.locator('#record-detail').textContent(),/Plantasia/);
  await page.locator('[data-record="plantland"]').click();assert.match(await page.locator('#record-detail').textContent(),/founded by Masterplants Orchestra/);
  await page.locator('[data-record="tom"]').click();assert.match(await page.locator('#record-detail').textContent(),/not confirmed/);
  await page.keyboard.press('Escape');
 });
 await check('All five map spaces work, space links filter the schedule and regional map loads on request',async()=>{
  await page.locator('[data-panel="place"]').click();assert.equal(await page.locator('[data-space]').count(),5);
  for(const id of ['grove','nursery','library','table','camp']){await page.locator(`[data-space="${id}"]`).click();assert.equal(await page.locator(`[data-space="${id}"]`).getAttribute('aria-pressed'),'true');}
  await page.locator('[data-space="library"]').click();await page.locator('[data-space-events="library"]').click();assert.equal(await page.locator('.event').count(),1);
  await page.locator('[data-panel="place"]').click();assert.equal(await page.locator('#regional-map iframe').count(),0);
  await page.route('https://maps.google.com/**',r=>r.abort());await page.locator('#load-map').click();assert.match(await page.locator('#regional-map iframe').getAttribute('src'),/Dandeli/);
  await page.keyboard.press('Escape');
 });
 await check('Note remains 917 words, citations open their sources and booklet downloads',async()=>{
  await page.locator('[data-panel="note"]').click();assert.equal((await page.locator('.programme-note').innerText()).trim().split(/\s+/).length,917);
  await page.locator('.programme-note [data-reference]').first().click();assert.equal(await page.locator('#panel-title').textContent(),'Sources & credits');
  assert.equal(await page.locator('.sources-list li').count(),36);const response=await page.request.get(url+'/assets/Bio-synthetic-booklet.docx');assert.equal(response.status(),200);
  await page.keyboard.press('Escape');
 });
 await check('Desktop and open panel accessibility checks pass without runtime errors',async()=>{
  const scans=[];for(const mode of ['poster','note']){if(mode==='note')await page.locator('[data-panel="note"]').click();const audit=await new AxeBuilder({page}).analyze();scans.push({mode,violations:audit.violations});assert.deepEqual(audit.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)})),[]);if(mode==='note')await page.keyboard.press('Escape');}
  await writeFile(new URL('../test-results/axe-desktop.json',import.meta.url),JSON.stringify(scans,null,2));assert.deepEqual(errors,[]);
  await page.screenshot({path:screenshot('desktop.png')});
 });
 const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const mobile=await mobileContext.newPage();mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(url+'/');await mobile.waitForSelector('html[data-ready="true"]');
 await check('Mobile remains one screen, portrait strip scrolls and every artist is reachable',async()=>{
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1),true);
  const before=await mobile.locator('#artist-strip').evaluate(e=>e.scrollLeft);await mobile.locator('#artists-next').tap();assert.ok(await mobile.locator('#artist-strip').evaluate(e=>e.scrollLeft)>before);
  await mobile.locator('.artist-button[data-artist="biosis"]').scrollIntoViewIfNeeded();const last=await mobile.locator('.artist-button[data-artist="biosis"]').boundingBox(),strip=await mobile.locator('#artist-strip').boundingBox();assert.ok(last.x>=strip.x-1&&last.x+last.width<=strip.x+strip.width+1);
 });
 await check('Touch on the hand dial changes time, and panel close remains reachable',async()=>{
  await mobile.locator('#time-dial').tap();assert.equal(await mobile.locator('#journey-time').inputValue(),'180');
  await mobile.locator('[data-panel="programme"]').tap();assert.equal(await mobile.locator('.event').count(),17);await mobile.locator('#panel-close').tap();assert.equal(await mobile.locator('#info-panel').isVisible(),false);
  const audit=await new AxeBuilder({page:mobile}).analyze();await writeFile(new URL('../test-results/axe-mobile.json',import.meta.url),JSON.stringify(audit.violations,null,2));assert.deepEqual(audit.violations.map(v=>v.id),[]);
  await mobile.screenshot({path:screenshot('mobile.png')});
 });
 await check('Tablet, small-phone and landscape layouts fit without distortion or overflow',async()=>{
  const layout=await context.newPage();
  for(const [width,height] of [[1440,900],[1280,720],[768,1024],[390,844],[360,640],[844,390]]){
   await layout.setViewportSize({width,height});await layout.goto(url+'/');await layout.waitForSelector('html[data-ready="true"]');
   const bounds=await layout.evaluate(()=>{const art=document.querySelector('#sculpture').getBoundingClientRect();return{width:innerWidth,height:innerHeight,pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,ratio:art.width/art.height};});
   assert.ok(bounds.pageWidth<=width,JSON.stringify(bounds));assert.ok(bounds.pageHeight<=height+1,JSON.stringify(bounds));assert.ok(Math.abs(bounds.ratio-1.5)<.002,JSON.stringify(bounds));
   await layout.locator('[data-panel="programme"]').click();assert.equal(await layout.locator('.event').count(),17);await layout.locator('#panel-close').click();
  }
  await layout.close();
 });
 await check('Collapsed music player leaves the footer usable',async()=>{
  await page.locator('.artist-button[data-artist="adotj"]').click();await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.querySelector('#preview-audio').error!==null);
  if(await page.locator('#player-drawer').isVisible())await page.locator('#player-expand').click();
  const footer=await page.locator('.footer').boundingBox(),player=await page.locator('#floating-player').boundingBox();
  assert.ok(footer.y+footer.height<=player.y,JSON.stringify({footer,player}));await page.locator('#player-close').click();
 });
 const skyContext=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
 const sky=await skyContext.newPage();sky.on('pageerror',e=>errors.push(e.message));
 await sky.goto(url+'/');await sky.waitForSelector('html[data-ready="true"]');
 await check('Large time jumps blend through intermediate colours and moving gradients',async()=>{
  await sky.screenshot({path:screenshot('sky-afternoon.png')});
  const result=await sky.evaluate(async()=>{
   const root=document.documentElement,range=document.querySelector('#journey-time');
   const snapshot=()=>{
    const style=getComputedStyle(root),canvas=document.querySelector('[data-portrait]'),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let portrait;for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]){portrait=[pixels[i],pixels[i+1],pixels[i+2]].map(n=>n.toString(16).padStart(2,'0')).join('');break;}
    return {bg:style.getPropertyValue('--bg').trim(),ink:style.getPropertyValue('--ink').trim(),portrait:'#'+portrait,gradient:getComputedStyle(document.body).backgroundImage};
   };
   const before=snapshot();range.value=1080;range.dispatchEvent(new Event('input',{bubbles:true}));const immediate=snapshot(),samples=[];
   const started=performance.now();let last=started;
   await new Promise(resolve=>{function sample(now){if(now-last>=65){last=now;samples.push(snapshot());}if(now-started<380)requestAnimationFrame(sample);else resolve();}requestAnimationFrame(sample);});
   return {before,immediate,samples};
  });
  assert.equal(result.immediate.bg,result.before.bg);
  assert.ok(new Set(result.samples.map(s=>s.bg)).size>=3,JSON.stringify(result));
  assert.ok(new Set(result.samples.map(s=>s.gradient)).size>=3);
  for(const sample of result.samples){assert.equal(sample.portrait,sample.ink);assert.notEqual(sample.bg,'#303923');}
  await sky.waitForFunction(()=>document.documentElement.dataset.themeMoving==='false');
  assert.equal(await sky.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()),'#303923');
  await sky.screenshot({path:screenshot('sky-sunrise.png')});
 });
 await check('Reversing the dial retargets from the displayed colours without snapping',async()=>{
  const result=await sky.evaluate(async()=>{
   const range=document.querySelector('#journey-time'),bg=()=>getComputedStyle(document.documentElement).getPropertyValue('--bg');
   range.value=0;range.dispatchEvent(new Event('input',{bubbles:true}));
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const before=bg();range.value=600;range.dispatchEvent(new Event('input',{bubbles:true}));return {before,after:bg()};
  });
  assert.equal(result.before,result.after);
  await sky.waitForFunction(()=>document.documentElement.dataset.themeMoving==='false');
  assert.equal(await sky.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()),'#070e0d');
 });
 await check('Reduced motion cancels an active sweep; colours still vary within a single phase',async()=>{
  await sky.locator('#journey-time').evaluate(el=>{el.value=1080;el.dispatchEvent(new Event('input',{bubbles:true}));});
  await sky.emulateMedia({reducedMotion:'reduce'});
  await sky.waitForFunction(()=>document.documentElement.dataset.themeMoving==='false');
  assert.equal(await sky.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()),'#303923');
  const result=await sky.evaluate(()=>{
   const range=document.querySelector('#journey-time'),bg=()=>getComputedStyle(document.documentElement).getPropertyValue('--bg');
   range.value=0;range.dispatchEvent(new Event('input',{bubbles:true}));const before=bg();
   range.value=120;range.dispatchEvent(new Event('input',{bubbles:true}));
   return {before,after:bg(),phase:document.documentElement.dataset.phase,moving:document.documentElement.dataset.themeMoving,transform:getComputedStyle(document.querySelector('#art-object')).transform};
  });
  assert.notEqual(result.before,result.after);assert.equal(result.phase,'afternoon');assert.equal(result.moving,'false');assert.equal(result.transform,'none');
 });
 await skyContext.close();
 assert.deepEqual(errors,[]);await writeFile(new URL('../test-results/browser-checks.json',import.meta.url),JSON.stringify({checks:results,errors},null,2));console.log(results.length+' browser checks passed.');
 await mobileContext.close();await context.close();
}finally{await browser.close();}
