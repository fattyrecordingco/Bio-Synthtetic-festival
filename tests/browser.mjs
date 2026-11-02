import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const url=process.env.TEST_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
const results=[];
async function check(name,fn){await fn();results.push(name);console.log('PASS '+name);}
try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];const externalRequests=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(!request.url().startsWith(url)&&!request.url().startsWith('data:'))externalRequests.push(request.url());});
  await page.goto(url);await page.locator('.event').first().waitFor();
  await check('Local assets, 17 encounters, 9 profiles, no external requests on arrival',async()=>{
    assert.equal(await page.locator('.event').count(),17);assert.equal(await page.locator('#artist-roster button').count(),9);
    assert.equal(externalRequests.length,0);assert.equal(await page.locator('#preview-audio').getAttribute('src'),null);
    assert.equal(await page.locator('#floating-player').isVisible(),false);
  });
  await check('Keyboard expands schedule and preserves open rows during search',async()=>{
    await page.locator('#event-solo summary').focus();await page.keyboard.press('Enter');
    assert.equal(await page.locator('#event-solo').getAttribute('open'),'');
    await page.locator('#search').fill('Between Leaf');assert.equal(await page.locator('.event').count(),1);
    assert.equal(await page.locator('#event-solo').getAttribute('open'),'');
    await page.locator('#reset').click();assert.equal(await page.locator('.event').count(),17);
  });
  await check('Saved journey survives reload and can be filtered',async()=>{
    await page.locator('#event-solo summary').click();
    if(!await page.locator('#event-solo').evaluate(el=>el.open))await page.locator('#event-solo summary').click();
    await page.locator('[data-save="solo"]').click();assert.equal(await page.locator('#saved-count').textContent(),'1');
    await page.reload();await page.locator('.event').first().waitFor();
    await page.locator('[data-filter="saved"]').click();assert.equal(await page.locator('.event').count(),1);
    assert.equal(await page.locator('.event').getAttribute('id'),'event-solo');await page.locator('#reset').click();
  });
  await check('Filters, empty state, expand and collapse',async()=>{
    await page.locator('[data-filter="performance"]').click();assert.equal(await page.locator('.event').count(),7);
    await page.locator('#expand-all').click();assert.equal(await page.locator('.event[open]').count(),7);
    await page.locator('#expand-all').click();assert.equal(await page.locator('.event[open]').count(),0);
    await page.locator('#search').fill('no such festival artist');assert.equal(await page.locator('.empty').count(),1);
    await page.locator('#reset').click();
  });
  await check('Time control works with keyboard and reduced motion',async()=>{
    await page.locator('#journey-time').focus();await page.keyboard.press('End');
    assert.match(await page.locator('#time-output').textContent(),/08:00/);
    assert.equal(await page.locator('#journey').getAttribute('data-scene'),'dawn');
    await page.keyboard.press('Home');assert.equal(await page.locator('#journey').getAttribute('data-scene'),'afternoon');
    await page.locator('[data-phase="night"]').click();assert.match(await page.locator('#time-output').textContent(),/20:30/);
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');
  });
  await check('ASCII knobs alter artwork without creating audio',async()=>{
    const before=await page.locator('#ascii-art').textContent();
    await page.locator('#art-light').focus();await page.keyboard.press('End');
    assert.notEqual(await page.locator('#ascii-art').textContent(),before);
    assert.equal(await page.locator('#preview-audio').getAttribute('src'),null);
  });
  await check('Space selection filters programme and regional map is opt-in',async()=>{
    await page.locator('[data-space="library"]').click();assert.match(await page.locator('#space-panel').textContent(),/Leaf Library/);
    await page.locator('[data-space-events="library"]').click();assert.equal(await page.locator('.event').count(),1);
    await page.locator('#reset').click();
    assert.equal(await page.locator('#regional-map iframe').count(),0);
    await page.route('https://maps.google.com/**',route=>route.abort());
    await page.locator('#load-map').click();assert.match(await page.locator('#regional-map iframe').getAttribute('src'),/Dandeli/);
  });
  await check('Programme note, references and download',async()=>{
    await page.locator('#programme-note summary').click();assert.equal(await page.locator('#word-count').textContent(),'917');
    const words=await page.locator('#note-text').innerText();assert.equal(words.trim().split(/\s+/).length,917);
    await page.locator('#note-text a').first().click();assert.equal(await page.locator('#sources details').getAttribute('open'),'');
    const response=await page.request.get(url+'/assets/Bio-synthetic-booklet.docx');assert.equal(response.status(),200);
  });
  // Simulate service failure, then exercise the real fallback and persistent player UI.
  await page.route('https://p.scdn.co/**',route=>route.abort());
  await page.route('https://bandcamp.com/**',route=>route.abort());
  await check('Artist selection requests correct music, profile Escape restores focus, player persists',async()=>{
    const artist=page.locator('#artist-roster [data-artist="adotj"]');await artist.click();
    assert.equal(await page.locator('#artist-dialog').isVisible(),true);
    assert.equal(await page.locator('#floating-player').isVisible(),true);
    assert.match(await page.locator('#preview-audio').getAttribute('src'),/^https:\/\/p.scdn.co/);
    assert.equal(await page.locator('#track-name').textContent(),'Epipremnum Aureum');
    await page.keyboard.press('Escape');assert.equal(await page.locator('#artist-dialog').isVisible(),false);
    assert.equal(await artist.evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.locator('#floating-player').isVisible(),true);
    await page.locator('#player-close').click();assert.equal(await page.locator('#floating-player').isVisible(),false);
    assert.equal(await page.locator('#preview-audio').getAttribute('src'),null);
  });
  await check('Bandcamp uses actual service controls and selecting an artist stops previous media',async()=>{
    await page.locator('#artist-roster [data-artist="manganiyar"]').click();
    assert.match(await page.locator('#persistent-embed iframe').getAttribute('src'),/album=1805014959/);
    assert.equal(await page.locator('#music-toggle').isVisible(),false);
    await page.keyboard.press('Escape');
    await page.locator('#artist-roster [data-artist="wild"]').click();
    assert.equal(await page.locator('#persistent-embed iframe').count(),0);
    assert.equal(await page.locator('#track-name').textContent(),'Quiet Voices of the Ether');
    await page.keyboard.press('Escape');await page.locator('#player-close').click();
  });
  await check('Desktop has no serious accessibility violations or runtime errors',async()=>{
    const audit=await new AxeBuilder({page}).analyze();
    await writeFile(new URL('../test-results/axe-desktop.json',import.meta.url),JSON.stringify(audit.violations,null,2));
    assert.deepEqual(audit.violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
    assert.deepEqual(errors,[]);
  });
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:fileURLToPath(new URL('../test-results/desktop.png',import.meta.url))});
  await page.locator('.ascii-installation').screenshot({path:fileURLToPath(new URL('../test-results/ascii.png',import.meta.url))});
  const mobile=await context.newPage();await mobile.setViewportSize({width:390,height:844});await mobile.goto(url);await mobile.locator('.event').first().waitFor();
  await check('Mobile navigation, Escape, and no horizontal overflow',async()=>{
    await mobile.locator('.menu-button').click();assert.equal(await mobile.locator('#nav').isVisible(),true);
    await mobile.keyboard.press('Escape');assert.equal(await mobile.locator('#nav').isVisible(),false);
    assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const audit=await new AxeBuilder({page:mobile}).analyze();
    await writeFile(new URL('../test-results/axe-mobile.json',import.meta.url),JSON.stringify(audit.violations,null,2));
    assert.deepEqual(audit.violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>v.id),[]);
    await mobile.screenshot({path:fileURLToPath(new URL('../test-results/mobile.png',import.meta.url))});
  });
  console.log(`${results.length} browser checks passed.`);
  await writeFile(new URL('../test-results/browser-checks.json',import.meta.url),JSON.stringify({checks:results,errors},null,2));
}finally{await browser.close();}
