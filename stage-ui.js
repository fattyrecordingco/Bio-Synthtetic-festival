import {playSelection} from './player.js';
import {initializeArt,renderPortrait,setArtTime} from './stage-art.js';
const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const panel=$('#info-panel');
const state={filter:'all',query:'',space:null,artist:null,saved:new Set(),record:'garson',time:0};
let data,note,lastFocus,toastTimer;
const link=(url,label)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
const citations=item=>(item.sourceRefs||[]).map(n=>`<a href="#source-${n}" data-reference="${n}">[${n}]</a>`).join(' ');
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2200);}
function showPanel(title,html){
  if(!panel.contains(document.activeElement))lastFocus=document.activeElement;
  $('#panel-title').textContent=title;$('#panel-content').innerHTML=html;
  if(!panel.open)panel.show();panel.scrollTop=0;$('#panel-close').focus({preventScroll:true});
}
function closePanel(){panel.close();}
panel.addEventListener('close',()=>{$('#panel-content').replaceChildren();if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});});

function renderProgramme(){
  if(!$('#schedule'))return;
  const opened=new Set($$('.event[open]').map(row=>row.id));
  const events=data.events.filter(event=>(state.filter==='all'||(state.filter==='saved'?state.saved.has(event.id):event.type===state.filter))&&(!state.space||event.space===state.space)&&(!state.artist||event.artists?.includes(state.artist))&&`${event.title} ${event.artist} ${data.spaces[event.space].name}`.toLowerCase().includes(state.query));
  $('#schedule').innerHTML=events.length?events.map(e=>`<details id="event-${e.id}" class="event" ${opened.has(`event-${e.id}`)?'open':''}><summary><time>${esc(e.time)}<br><small>– ${esc(e.end)}</small></time><div><h3>${esc(e.title)}</h3><p class="artist-line">${esc(e.artist)}</p></div><span class="plus" aria-hidden="true">+</span></summary><div class="event-body"><p>${esc(e.description)}</p><p class="prompt">Listen for: ${esc(e.idea)}</p><p class="caption">${esc(data.spaces[e.space].name)} / hypothetical ${e.type==='performance'?'commission':'encounter'}</p><div class="event-actions">${(e.artists||[]).map(id=>`<button data-artist="${id}">${esc(data.artists.find(a=>a.id===id).name)} ↗</button>`).join('')}${e.record?'<button data-panel="listening">Recordings ↗</button>':''}<button data-save="${e.id}" aria-pressed="${state.saved.has(e.id)}">${state.saved.has(e.id)?'Saved ✓':'Save +'}</button></div></div></details>`).join(''):'<p class="empty">No encounters match. Clear the filters to see the full programme.</p>';
  $('#result-count').textContent=`${events.length} encounters${state.space?' / '+data.spaces[state.space].name:''}${state.artist?' / '+data.artists.find(a=>a.id===state.artist).name:''}`;
  $('#reset-filters').hidden=state.filter==='all'&&!state.query&&!state.space&&!state.artist;
  $$('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===state.filter)));
  $('[data-filter="saved"]').textContent=`Saved (${state.saved.size})`;updateExpand();
}
function openProgramme(){
 showPanel('Programme',`<p class="panel-lead">14:00–08:00 IST. Undated and hypothetical; the finale follows actual sunrise.</p><div class="tools"><button data-filter="all" aria-pressed="true">All</button><button data-filter="performance" aria-pressed="false">Live</button><button data-filter="saved" aria-pressed="false">Saved (${state.saved.size})</button><label class="programme-search"><span class="sr-only">Search programme</span><input id="event-search" type="search" placeholder="Find an artist or set" value="${esc(state.query)}"></label></div><div class="schedule-meta"><span id="result-count" role="status"></span><button id="reset-filters" hidden>Clear</button><button id="expand-all">Expand all</button></div><div id="schedule"></div><p class="caption">Leaf Room runs in small groups until midnight, pausing near concerts. Biosis and the fixed-mapping BECA station continue overnight on headphones. The quiet rest area is separate.</p>`);
 renderProgramme();
}
function updateExpand(){const b=$('#expand-all');if(!b)return;const rows=$$('.event');b.disabled=!rows.length;b.textContent=rows.length&&rows.every(row=>row.open)?'Collapse all':'Expand all';}
function jumpEvent(id){state.filter='all';state.query='';state.space=null;state.artist=null;openProgramme();const row=document.getElementById(`event-${id}`);if(row){row.open=true;$('summary',row).focus();row.scrollIntoView({block:'center',behavior:'instant'});}}
function saveEvent(id,button){
 state.saved.has(id)?state.saved.delete(id):state.saved.add(id);
 try{localStorage.setItem('bio-synthetic-v2-journey',JSON.stringify([...state.saved]));}catch{}
 button.textContent=state.saved.has(id)?'Saved ✓':'Save +';button.setAttribute('aria-pressed',String(state.saved.has(id)));
 toast(state.saved.has(id)?'Saved to your journey.':'Removed from your journey.');
 if(state.filter==='saved'){renderProgramme();$('[data-filter="saved"]').focus();}else $('[data-filter="saved"]').textContent=`Saved (${state.saved.size})`;
}
function openArtist(id){
 const a=data.artists.find(a=>a.id===id);if(!a)return;
 $$('[data-artist].artist-button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.artist===id)));
 playSelection(a);
 showPanel(a.name,`<div class="profile"><div><canvas class="profile-portrait" width="360" height="360" role="img" aria-label="${esc(a.image.alt)}" data-portrait="${a.id}"></canvas><small>${esc(a.image.credit)}${a.id==='manganiyar'?'<br>Existing production; festival ensemble unconfirmed.':''}</small></div><div class="profile-copy"><p>${esc(a.bio)}</p><div class="panel-links"><button class="panel-button" data-find-artist="${id}">In the programme ↗</button>${link(a.listen,'Recording')}</div></div></div><div class="commission"><p>${esc(a.commission)}</p><p class="caption">Hypothetical commission / ${citations(a)}</p></div><p class="caption">${esc(a.caption)}</p>`);
 renderPortrait($('.profile-portrait'),a.image);
}
function openNote(){
 showPanel('Before you listen.',`<p class="note-meta">Programme note / ${note.trim().split(/\s+/).length} words / Anshul Jain</p><article class="programme-note">${note.split('\n\n').map(p=>`<p>${esc(p).replace(/\[(\d+)\]/g,'<sup><a href="#source-$1" data-reference="$1">[$1]</a></sup>')}</p>`).join('')}</article>`);
}
function openListening(){
 showPanel('The Leaf Library',`<p class="panel-lead">Existing recordings. Hosted listening: 14:30–15:30.</p><div class="record-list" role="group" aria-label="Listening references">${data.records.map(r=>`<button data-record="${r.id}" aria-pressed="${r.id===state.record}">${esc(r.name)}</button>`).join('')}</div><article id="record-detail" class="record-detail"></article>`);selectRecord(state.record);
}
function selectRecord(id){const r=data.records.find(r=>r.id===id);if(!r)return;state.record=id;$$('[data-record]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.record===id)));$('#record-detail').innerHTML=`<h3>${esc(r.title)}</h3><p>${esc(r.text)}</p><div class="panel-links"><button class="panel-button" data-play-record="${r.id}">▶ Listen</button>${link(r.listen,'Recording source')}</div><p class="caption">${esc(r.caption)}</p><p class="caption">Sources ${citations(r)}</p>`;}
function openPlace(){
 showPanel('Jungli / near Dandeli',`<p class="panel-lead">An illustrative festival layout. Not surveyed or to scale.</p><svg class="map-svg" viewBox="0 0 700 370" role="img" aria-labelledby="map-title"><title id="map-title">Five proposed listening spaces joined by a winding route</title><defs><pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".7" fill="#799254"/></pattern></defs><path d="M30 140Q100 5 340 40T670 145L630 310Q420 360 220 320T30 140" fill="url(#dots)"/><path d="M120 230Q80 50 260 100T520 100Q640 170 530 270Q410 320 360 200T120 230" fill="none" stroke="#b8ca88" stroke-dasharray="4 6"/><g fill="#d6e5a3" font-size="14" font-family="monospace"><text x="120" y="95">01 / Grove</text><text x="452" y="90">02 / Nursery</text><text x="315" y="197">03 / Library</text><text x="75" y="265">04 / Table</text><text x="480" y="310">05 / Quiet camp</text></g></svg><div class="map-spaces" role="group" aria-label="Festival spaces">${Object.entries(data.spaces).map(([id,s])=>`<button data-space="${id}" aria-pressed="false">${s.number} ${esc(s.name.replace('The ',''))}</button>`).join('')}</div><article id="space-panel" class="space-panel"></article><div class="regional-section"><h3>The region</h3><p>Jungli’s published location is near Dandeli, Karnataka. Its exact site is not public. This map shows Dandeli, with no festival pin.</p><p>${link('https://junglithenomad.com/press-kit/','Venue source')}</p><div class="regional-map" id="regional-map"><button class="panel-button" id="load-map">Load Dandeli map ↗</button></div></div>`);selectSpace('grove');
}
function selectSpace(id){const s=data.spaces[id];if(!s)return;$$('[data-space]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.space===id)));$('#space-panel').innerHTML=`<h3>${esc(s.name)}</h3><p>${esc(s.text)}</p><p class="space-access">${esc(s.access)}</p><p class="map-disclaimer">Access provisions describe the proposal, not verified venue facilities.</p><button class="panel-button" ${id==='camp'?'data-event="dawn"':`data-space-events="${id}"`}>${id==='camp'?'Sunrise finale':'Encounters here'} ↗</button>`;}
function openSources(){
 showPanel('Sources & credits',`<p class="panel-lead">Existing practices and recordings are cited below. All festival invitations, live collaborations, installations and production arrangements are proposals.</p><div class="panel-links"><a href="content/sources.txt" download>References (.txt) ↙</a><a href="ASSIGNMENT-CHECK.txt" download>Assignment check ↙</a><a href="assets/Bio-synthetic-booklet.docx" download>Booklet ↙</a></div><ol class="sources-list">${data.sources.map(([name,url],i)=>`<li id="source-${i+1}">${link(url,name)}</li>`).join('')}</ol><div class="credits"><p>Research, concept, curation and BECA: Anshul Jain / adotj, Fatty Recording Co. Spotify: adotj.music. Other artists bring their own instruments.</p><p>Plantland Radio was founded by Masterplants Orchestra / Tritone Crisantemo. The radio platform, directory and individual artist catalogues are distinct.</p><p>The 917-word programme note is preserved. ChatGPT assisted with grammar, paraphrasing supplied research, and building the website and booklet. The hand-and-leaf illustration was made with OpenAI image generation; its dithered and ASCII versions are illustrative.</p><p>Artist photographs and logos come from the artists’ or production’s own pages. Browser-rendered dithering does not alter the downloaded originals. ${data.artists.map(a=>`${esc(a.name)}: ${link(a.image.source,a.image.credit)}`).join('<br>')}</p><p>Visual references: ${link('https://sasukeharaguchi.com/discography/','Sasuke Haraguchi')} and ${link('https://www.linkinpark.com/','Linkin Park')}. Fonts are locally hosted under the SIL Open Font License.</p><p>Music loads after selection. Some services require their own play button. Full recording links remain available. Handbook sections 4.5–4.6 were not supplied for checking.</p></div>`);
}
function setTime(value){
 state.time=Math.max(0,Math.min(1080,Math.round(Number(value)/15)*15));
 const minutes=14*60+state.time,hour=Math.floor(minutes/60)%24,time=`${String(hour).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
 const phase=state.time<180?'afternoon':state.time<390?'twilight':state.time<990?'night':'dawn';
 document.documentElement.dataset.phase=phase;$('#phase-name').textContent={afternoon:'Afternoon',twilight:'Twilight',night:'Night',dawn:'First light'}[phase];$('#scene-clock').textContent=time;
 $('#journey-time').value=state.time;$('#journey-time').setAttribute('aria-valuetext',`${time} IST, ${phase==='dawn'?'illustrative dawn':phase}`);
 const dial=$('#time-dial');dial.setAttribute('aria-valuenow',state.time);dial.setAttribute('aria-valuetext',`${time} IST, ${phase==='dawn'?'illustrative dawn':phase}`);
 document.documentElement.style.setProperty('--dial-angle',`${state.time/4-130}deg`);setArtTime(state.time,phase);
}
function updateStrip(){const strip=$('#artist-strip');$('.strip-controls').hidden=strip.scrollWidth<=strip.clientWidth+2;$('#artists-prev').disabled=strip.scrollLeft<2;$('#artists-next').disabled=strip.scrollLeft+strip.clientWidth>=strip.scrollWidth-2;}

// One gesture controls the light, using pointer capture so drags remain stable.
let drag=null;
$('#time-dial').addEventListener('pointerdown',event=>{if(event.button!==0)return;drag={x:event.clientX,y:event.clientY,value:state.time,moved:false};event.currentTarget.setPointerCapture(event.pointerId);event.currentTarget.focus();});
$('#time-dial').addEventListener('pointermove',event=>{if(!drag)return;const delta=(event.clientX-drag.x)-(event.clientY-drag.y);if(Math.abs(delta)>3)drag.moved=true;if(drag.moved)setTime(drag.value+delta*4);});
$('#time-dial').addEventListener('pointerup',event=>{if(!drag)return;const moved=drag.moved;drag=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);if(!moved){const values=[0,180,600,990];setTime(values.find(value=>value>state.time)??0);}});
$('#time-dial').addEventListener('pointercancel',()=>{drag=null;});
$('#time-dial').addEventListener('keydown',event=>{const deltas={ArrowRight:15,ArrowUp:15,ArrowLeft:-15,ArrowDown:-15,PageUp:180,PageDown:-180};if(event.key in deltas){event.preventDefault();setTime(state.time+deltas[event.key]);}else if(['Home','End','Enter',' '].includes(event.key)){event.preventDefault();setTime(event.key==='Home'?0:event.key==='End'?1080:state.time>=1080?0:state.time+180);}});
$('#journey-time').addEventListener('input',event=>setTime(event.target.value));
$('#artist-strip').addEventListener('scroll',updateStrip,{passive:true});window.addEventListener('resize',updateStrip);
$('#panel-close').addEventListener('click',closePanel);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel.open){event.preventDefault();closePanel();}});
document.addEventListener('input',event=>{if(event.target.id==='event-search'){state.query=event.target.value.trim().toLowerCase();renderProgramme();}});
document.addEventListener('toggle',event=>{if(event.target.classList?.contains('event'))updateExpand();},true);
document.addEventListener('click',event=>{
 const reference=event.target.closest('[data-reference]');if(reference){event.preventDefault();const id=reference.dataset.reference;openSources();document.getElementById('source-'+id)?.scrollIntoView({block:'center'});return;}
 const b=event.target.closest('button');if(!b||!data)return;
 if(b.dataset.panel){({programme:openProgramme,listening:openListening,place:openPlace,note:openNote,sources:openSources})[b.dataset.panel]?.();}
 else if(b.dataset.artist)openArtist(b.dataset.artist);
 else if(b.dataset.event)jumpEvent(b.dataset.event);
 else if(b.dataset.save)saveEvent(b.dataset.save,b);
 else if(b.dataset.filter){state.filter=b.dataset.filter;renderProgramme();}
 else if(b.dataset.findArtist){state.artist=b.dataset.findArtist;state.filter='all';state.space=null;state.query='';openProgramme();}
 else if(b.dataset.record)selectRecord(b.dataset.record);
 else if(b.dataset.playRecord)playSelection(data.records.find(r=>r.id===b.dataset.playRecord));
 else if(b.dataset.space)selectSpace(b.dataset.space);
 else if(b.dataset.spaceEvents){state.space=b.dataset.spaceEvents;state.artist=null;state.filter='all';state.query='';openProgramme();}
 else if(b.id==='reset-filters'){state.filter='all';state.query='';state.space=null;state.artist=null;$('#event-search').value='';renderProgramme();$('#event-search').focus();}
 else if(b.id==='expand-all'){const rows=$$('.event'),open=!rows.every(row=>row.open);rows.forEach(row=>row.open=open);updateExpand();}
 else if(b.id==='load-map'){const frame=document.createElement('iframe');frame.src='https://maps.google.com/maps?q=Dandeli%2C%20Karnataka%2C%20India&z=9&output=embed';frame.title='Regional map of Dandeli; no exact festival location';frame.referrerPolicy='no-referrer';$('#regional-map').replaceChildren(frame);frame.focus();}
 else if(b.id==='artists-prev'||b.id==='artists-next')$('#artist-strip').scrollBy({left:(b.id==='artists-next'?1:-1)*230,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
});

async function init(){
 try{
  const responses=await Promise.all([fetch('content/festival.json'),fetch('content/programme-note.txt')]);if(responses.some(r=>!r.ok))throw Error('Festival content is unavailable.');
  data=await responses[0].json();note=await responses[1].text();
  try{const stored=JSON.parse(localStorage.getItem('bio-synthetic-v2-journey')||'[]');if(Array.isArray(stored))state.saved=new Set(stored.filter(id=>data.events.some(e=>e.id===id)));}catch{}
  $('#artist-strip').innerHTML=data.artists.map(a=>`<li><button class="artist-button" data-artist="${a.id}" aria-pressed="false" aria-label="${esc(a.name)} — listen and view profile"><canvas width="240" height="240" aria-hidden="true" data-portrait="${a.id}"></canvas><span>${esc(a.name)}</span></button></li>`).join('');
  await Promise.allSettled(data.artists.map(a=>renderPortrait($(`[data-portrait="${a.id}"]`),a.image)));
  updateStrip();setTime(0);await initializeArt();document.documentElement.dataset.ready='true';
 }catch(error){toast('Content could not load. The booklet is available above.');console.error(error);}
}
init();
