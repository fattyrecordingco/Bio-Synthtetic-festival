import { playSelection } from './player.js';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const state = { filter: 'all', query: '', space: null, saved: new Set(), phase: 'afternoon', record: null };
let data, programmeNote, lastFocus, toastTimer;
const dialog = $('#artist-dialog');
const phaseOffsets = {afternoon:0, twilight:180, night:390, dawn:990};

function externalLink(url, text) {
  return `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(text)} ↗</a>`;
}

function sourceLinks(item) {
  return (item.sourceRefs || []).map(number => `<a href="#source-${number}" aria-label="Source ${number}">[${number}]</a>`).join(' ');
}

function announce(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2600);
}

function saveJourney(id, button) {
  const isSaved = state.saved.has(id);
  isSaved ? state.saved.delete(id) : state.saved.add(id);
  try { localStorage.setItem('bio-synthetic-v2-journey', JSON.stringify([...state.saved])); } catch { /* Saving works in this session when storage is blocked. */ }
  $('#saved-count').textContent = state.saved.size;
  button.setAttribute('aria-pressed', String(!isSaved));
  button.textContent = isSaved ? 'Save to my journey +' : 'Saved to my journey ✓';
  announce(isSaved ? 'Removed from your journey.' : 'Saved to your journey.');
  if (state.filter === 'saved') {
    const previousRow = button.closest('.event');
    const nextId = previousRow?.nextElementSibling?.id || previousRow?.previousElementSibling?.id;
    renderSchedule();
    const nextSummary = nextId ? document.getElementById(nextId)?.querySelector('summary') : null;
    (nextSummary || $('[data-filter="saved"]')).focus();
  }
}

function renderSchedule() {
  const openIds = new Set($$('.event[open]').map(event => event.id));
  const events = data.events.filter(event => {
    const searchable = `${event.title} ${event.artist} ${event.description} ${data.spaces[event.space].name}`.toLowerCase();
    return (state.filter === 'all' || (state.filter === 'saved' ? state.saved.has(event.id) : event.type === state.filter)) &&
      (!state.space || event.space === state.space) && searchable.includes(state.query);
  });
  $('#schedule').innerHTML = events.length ? events.map(event => `
    <details class="event" id="event-${event.id}" ${openIds.has(`event-${event.id}`) ? 'open' : ''}>
      <summary><div class="event-time"><time>${escapeHTML(event.time)}</time><br><span>– ${escapeHTML(event.end)}</span></div>
        <div><h3>${escapeHTML(event.title)}</h3><p class="event-artist">${escapeHTML(event.artist)}</p></div>
        <span class="event-type">${escapeHTML(event.type)}</span><span class="open-icon" aria-hidden="true">+</span></summary>
      <div class="event-body"><div class="event-description"><p>${escapeHTML(event.description)}</p><p class="prompt"><strong>Listen for:</strong> ${escapeHTML(event.idea)}</p>
        <div class="event-actions">${(event.artists || []).map(id => `<button data-artist="${id}">${escapeHTML(data.artists.find(artist => artist.id === id).name)} / profile ↗</button>`).join('')}
        ${event.record ? `<button data-record-jump="${event.record}">Explore the recordings ↘</button>` : ''}
        <button class="save-button" data-save="${event.id}" aria-pressed="${state.saved.has(event.id)}">${state.saved.has(event.id) ? 'Saved to my journey ✓' : 'Save to my journey +'}</button></div></div>
        <p class="event-location">${escapeHTML(data.spaces[event.space].name)}<br><br>${event.type === 'performance' ? 'Hypothetical festival performance / commission' : 'Proposed festival encounter'}</p></div></details>`).join('') : '<p class="empty">No encounters here yet. Try another filter or clear your search.</p>';
  $('#result-count').textContent = `${events.length} encounters${state.space ? ' / ' + data.spaces[state.space].name : ''}${state.filter === 'saved' ? ' / my journey' : ''}`;
  $('#reset').hidden = state.filter === 'all' && !state.query && !state.space;
  $$('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === state.filter)));
  updateExpandButton();
}

function updateExpandButton() {
  const rows = $$('.event');
  const allOpen = rows.length > 0 && rows.every(row => row.open);
  $('#expand-all').textContent = allOpen ? 'Collapse all' : 'Expand all';
  $('#expand-all').disabled = !rows.length;
}

function jumpToEvent(id) {
  state.filter = 'all'; state.query = ''; state.space = null;
  $('#search').value = '';
  renderSchedule();
  const row = document.getElementById(`event-${id}`);
  if (!row) return;
  row.open = true;
  row.scrollIntoView({behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'center'});
  $('summary', row).focus({preventScroll:true});
  updateExpandButton();
}

function setPhase(phase) {
  state.phase = phase;
  const chapter = data.phases[phase];
  $('#journey').dataset.scene = phase;
  $('#chapter-title').textContent = chapter.title.replace(/<br\s*\/?\s*>/g, ' ');
  $('#chapter-description').textContent = chapter.text;
  $('#chapter-highlights').innerHTML = chapter.events.map(([time,title]) => {
    const match = data.events.find(event => event.phase === phase && (event.time === time || (time === 'Dawn' && event.id === 'dawn') || (time === 'After' && event.id === 'breakfast')));
    return `<button data-event="${match?.id || chapter.event}"><time>${escapeHTML(time)}</time>${escapeHTML(title)} ↘</button>`;
  }).join('');
  $$('[data-phase]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.phase === phase)));
}

function setTime(offset) {
  const totalMinutes = 14 * 60 + Number(offset);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const time = `${String(hours).padStart(2,'0')}:${String(totalMinutes % 60).padStart(2,'0')}`;
  const phase = offset < 180 ? 'afternoon' : offset < 390 ? 'twilight' : offset < 990 ? 'night' : 'dawn';
  if (phase !== state.phase || !$('#chapter-description').textContent) setPhase(phase);
  $('#scene-time').textContent = time;
  $('#time-output').textContent = `${time} IST · ${phase === 'dawn' ? 'dawn scene' : phase}`;
  $('#journey-time').setAttribute('aria-valuetext', `${time} IST, ${phase === 'dawn' ? 'illustrative dawn scene' : phase}`);
}

function mediaMarkup(item) {
  return `<div class="media"><p>${escapeHTML(item.caption)}</p><button class="load-player" data-player="${item.id}"><span aria-hidden="true">▶</span> Listen</button><p class="embed-note">Existing ${item.media[0] === 'radio' ? 'broadcast' : 'recording'} / ${escapeHTML(item.media[0])}</p>${externalLink(item.listen, 'Recording source')}<p class="source-links">Sources ${sourceLinks(item)}</p></div>`;
}

function openArtist(id) {
  const artist = data.artists.find(artist => artist.id === id);
  if (!artist) return;
  lastFocus = document.activeElement;
  playSelection(artist);
  $('#dialog-body').innerHTML = `<span class="small-label">Artist / ${escapeHTML(artist.role)}</span><h2 id="dialog-title">${escapeHTML(artist.name)}</h2><p>${escapeHTML(artist.bio)}</p>
    <div class="commission"><span class="small-label">At Bio-synthetic / hypothetical commission</span><p>${escapeHTML(artist.commission)}</p></div>${mediaMarkup(artist)}
    <div class="artist-links">${externalLink(artist.source, 'Practice & source')}<button data-find-artist="${artist.id}">Find festival encounters ↘</button></div>`;
  dialog.show();
  dialog.scrollTop = 0;
  $('#dialog-close').focus();
}

function closeArtist() { dialog.close(); }
dialog.addEventListener('close', () => {
  $('#dialog-body').replaceChildren();
  document.body.style.overflow = '';
  if (lastFocus?.isConnected) lastFocus.focus({preventScroll:true});
});

function selectRecord(id) {
  const record = data.records.find(record => record.id === id);
  if (!record) return;
  state.record = id;
  $$('[data-record]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.record === id)));
  $('#record-panel').innerHTML = `<span class="small-label">${escapeHTML(record.label.toLowerCase())}</span><p class="record-author">${escapeHTML(record.name)}</p><h3>${escapeHTML(record.title)}</h3><p>${escapeHTML(record.text)}</p>${mediaMarkup(record)}`;
}

function selectSpace(id) {
  const space = data.spaces[id];
  if (!space) return;
  $$('[data-space]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.space === id)));
  $('#space-panel').innerHTML = `<span class="small-label">${space.number} / ${escapeHTML(space.type.toLowerCase())}</span><h3>${escapeHTML(space.name)}</h3><p>${escapeHTML(space.text)}</p><p class="space-access">${escapeHTML(space.access)}</p>${id === 'camp' ? '<button class="text-button" data-event="dawn">Return for first light ↘</button>' : `<button class="text-button" data-space-events="${id}">See encounters here ↘</button>`}`;
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.classList.contains('menu-button')) {
    const isOpen = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(isOpen));
    $('#nav').classList.toggle('open', isOpen);
  } else if (button.id === 'dialog-close') closeArtist();
  else if (!data) return;
  else if (button.dataset.phase) {
    $('#journey-time').value = phaseOffsets[button.dataset.phase];
    setTime(phaseOffsets[button.dataset.phase]);
  } else if (button.dataset.filter) { state.filter = button.dataset.filter; renderSchedule(); }
  else if (button.dataset.event) jumpToEvent(button.dataset.event);
  else if (button.dataset.artist) openArtist(button.dataset.artist);
  else if (button.dataset.save) saveJourney(button.dataset.save, button);
  else if (button.dataset.player) {
    const item = [...data.artists, ...data.records].find(item => item.id === button.dataset.player);
    if (item) playSelection(item);
  }
  else if (button.dataset.record) selectRecord(button.dataset.record);
  else if (button.dataset.recordJump) {
    selectRecord(button.dataset.recordJump);
    $('#listening').scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth'});
    $(`[data-record="${button.dataset.recordJump}"]`).focus({preventScroll:true});
  } else if (button.dataset.space) selectSpace(button.dataset.space);
  else if (button.dataset.spaceEvents) {
    state.space = button.dataset.spaceEvents; state.filter = 'all'; state.query = ''; $('#search').value = '';
    renderSchedule(); $('#programme').scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth'});
    $('#reset').focus({preventScroll:true});
  } else if (button.dataset.findArtist) {
    const artistId = button.dataset.findArtist;
    closeArtist();
    state.filter = 'all'; state.space = null;
    // Match IDs rather than display-name strings so collaborations are included.
    state.query = ''; $('#search').value = '';
    renderSchedule();
    const first = data.events.find(item => item.artists?.includes(artistId));
    if (first) setTimeout(() => jumpToEvent(first.id), 0);
  } else if (button.id === 'reset') {
    state.filter = 'all'; state.space = null; state.query = ''; $('#search').value = '';
    renderSchedule(); $('#search').focus();
  } else if (button.id === 'expand-all') {
    const rows = $$('.event'); const open = !rows.every(row => row.open);
    rows.forEach(row => { row.open = open; }); updateExpandButton();
  } else if (button.id === 'load-map') {
    const frame = document.createElement('iframe');
    frame.src = 'https://maps.google.com/maps?q=Dandeli%2C%20Karnataka%2C%20India&z=9&output=embed';
    frame.title = 'Regional map of Dandeli, Karnataka; no festival coordinates or venue pin';
    frame.referrerPolicy = 'no-referrer';
    $('#regional-map').replaceChildren(frame);
    frame.focus();
  }
});

$('#nav').addEventListener('click', event => {
  if (!event.target.closest('a')) return;
  $('#nav').classList.remove('open'); $('.menu-button').setAttribute('aria-expanded','false');
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && dialog.open) { event.preventDefault(); closeArtist(); return; }
  if (event.key === 'Escape' && $('#nav').classList.contains('open')) {
    $('#nav').classList.remove('open'); $('.menu-button').setAttribute('aria-expanded','false'); $('.menu-button').focus();
  }
});
$('#journey-time').addEventListener('input', event => { if (data) setTime(Number(event.target.value)); });
$('#search').addEventListener('input', event => { if (data) { state.query = event.target.value.trim().toLowerCase(); renderSchedule(); } });
$('#schedule').addEventListener('toggle', updateExpandButton, true);
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeArtist();
});
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#source-"]');
  if (link) { $('#sources details').open = true; if (dialog.open) closeArtist(); }
});

async function init() {
  try {
    const [contentResponse,noteResponse] = await Promise.all([fetch('content/festival.json'),fetch('content/programme-note.txt')]);
    if (!contentResponse.ok || !noteResponse.ok) throw new Error('Content files could not be loaded.');
    data = await contentResponse.json(); programmeNote = await noteResponse.text();
    try {
      const stored = JSON.parse(localStorage.getItem('bio-synthetic-v2-journey') || '[]');
      if (Array.isArray(stored)) state.saved = new Set(stored.filter(id => data.events.some(event => event.id === id)));
    } catch { /* Invalid or unavailable storage starts a new journey. */ }
    $('#saved-count').textContent = state.saved.size;
    $('#artist-roster').innerHTML = data.artists.map(artist => `<button data-artist="${artist.id}">${escapeHTML(artist.name)}<span aria-hidden="true">↗</span></button>`).join('');
    $('#record-list').innerHTML = data.records.map((record,index) => `<button data-record="${record.id}" aria-pressed="false"><span>0${index+1}</span>${escapeHTML(record.name)}</button>`).join('');
    $('#word-count').textContent = programmeNote.trim().split(/\s+/u).length;
    $('#note-text').innerHTML = programmeNote.split('\n\n').map(paragraph => `<p>${escapeHTML(paragraph).replace(/\[(\d+)\]/g, '<sup><a href="#source-$1" aria-label="Reference $1">[$1]</a></sup>')}</p>`).join('');
    $('#source-list').innerHTML = data.sources.map(([name,url],index) => `<li id="source-${index+1}">${externalLink(url,name)}</li>`).join('');
    $('#verification-note').textContent = data.verificationNote;
    renderSchedule(); setTime(0); selectRecord('garson'); selectSpace('grove');
  } catch (error) {
    $('#schedule').innerHTML = '<p class="empty">The programme could not load. Start the local server described in README.txt, then refresh this page. The original booklet remains available below.</p>';
    $('#result-count').textContent = 'Content unavailable';
    console.error(error);
  }
}

init();
