import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const url=process.env.TEST_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
const results=[],errors=[];
async function check(name,fn){await fn();results.push(name);console.log('PASS '+name);}
const screenshot=name=>fileURLToPath(new URL('../test-results/'+name,import.meta.url));
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const external=[];
 page.on('request',r=>{if(!r.url().startsWith(url)&&!r.url().startsWith('data:'))external.push(r.url());});
 await page.goto(url);await page.waitForSelector('html[data-ready="true"]');
 await check('One-screen edition, all nine real portraits loaded, no initial external requests or audio',async()=>{
  assert.equal(await page.locator('.artist-button').count(),9);
  assert.equal(await page.locator('#artist-strip canvas[data-loaded="true"]').count(),9);
  assert.equal(await page.locator('#sculpture').getAttribute('data-loaded'),'true');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),true);
  assert.deepEqual(external,[]);assert.equal(await page.locator('audio').getAttribute('src'),null);
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
 const mobile=await mobileContext.newPage();mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(url);await mobile.waitForSelector('html[data-ready="true"]');
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
 assert.deepEqual(errors,[]);await writeFile(new URL('../test-results/browser-checks.json',import.meta.url),JSON.stringify({checks:results,errors},null,2));console.log(results.length+' browser checks passed.');
 await mobileContext.close();await context.close();
}finally{await browser.close();}
