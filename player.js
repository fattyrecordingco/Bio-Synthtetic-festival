// One player follows the visitor. Recordings are loaded only after a selection.
const $ = selector => document.querySelector(selector);
const audio = $('#preview-audio');
let selection = null, controller = null, service = null, playing = false, generation = 0;
const scripts = new Map();

function loadScript(url) {
  if (scripts.has(url)) return scripts.get(url);
  const promise = new Promise((resolve,reject) => {
    const script = document.createElement('script'); script.src=url;
    const timer=setTimeout(()=>reject(new Error('The streaming service did not respond.')),10000);
    script.onload=()=>{clearTimeout(timer);resolve();}; script.onerror=()=>{clearTimeout(timer);reject(new Error('The streaming service is unavailable.'));};
    document.head.append(script);
  });
  scripts.set(url,promise); return promise;
}
function setPlaying(value) {
  playing=value;
  $('#music-toggle').textContent=value?'Ⅱ':'▶';
  $('#music-toggle').setAttribute('aria-label',value?'Pause recording':'Play recording');
  $('#music-toggle').title=value?'Pause recording':'Play recording';
  $('#floating-player').classList.toggle('is-playing',value);
}
function setDrawer(open) {
  $('#player-drawer').hidden=!open;
  $('#player-expand').setAttribute('aria-expanded',String(open));
  $('#player-expand').setAttribute('aria-label',open?'Hide streaming player':'Show streaming player');
  $('#player-expand').textContent=open?'⌄':'⌃';
}
function clearMedia() {
  audio.pause(); audio.removeAttribute('src'); audio.load();
  try { controller?.pause?.(); controller?.pauseVideo?.(); controller?.destroy?.(); } catch { /* iframe removal stops a disconnected service */ }
  controller=null; $('#persistent-embed').replaceChildren(); setPlaying(false);
}
function fallback(message) {
  $('#player-message').textContent=message+' Use the recording link if needed.';
  setDrawer(true);
}
function iframe(src,title,height=240) {
  const frame=document.createElement('iframe');
  frame.src=src;frame.title=title;frame.height=height;
  frame.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';
  frame.referrerPolicy='strict-origin-when-cross-origin';
  $('#persistent-embed').replaceChildren(frame);return frame;
}

export async function playSelection(item) {
  if(!item)return;
  const token=++generation;
  clearMedia(); selection=item; service=item.media[0];
  $('#floating-player').hidden=false;
  $('#music-toggle').hidden=false; $('#music-toggle').disabled=false;
  $('#track-name').textContent=item.playerTitle || item.title || item.name;
  $('#track-artist').textContent=item.preview?.artist || item.name;
  $('#track-source').href=item.preview?.source || item.listen;
  $('#player-message').textContent='Existing recording. Playback requested.';
  setDrawer(false);
  if (item.preview) {
    service='preview';
    audio.src=item.preview.url;
    $('#player-message').textContent='Official Spotify preview / existing recording. Full recording linked below.';
    try { await audio.play(); } catch { if(token===generation) fallback('Press play to hear this preview.'); }
    return;
  }
  const [,id]=item.media;
  try {
    if(service==='radio') {
      iframe(id,'Official Plantland Radio broadcast player',180);
      $('#music-toggle').hidden=true;
      $('#player-message').textContent='Existing live broadcast by Plantland Radio, founded by Masterplants Orchestra / Tritone Crisantemo. Use the station’s play and pause controls.';
      setDrawer(true);
    } else if(service==='bandcamp') {
      iframe(`https://bandcamp.com/EmbeddedPlayer/${id}/size=large/bgcol=1a2e23/linkcol=e7ff6b/artwork=small/transparent=true/`,`${item.name} — ${item.playerTitle}`,300);
      // Bandcamp does not expose a public play/pause API. Keep its genuine controls visible.
      $('#music-toggle').hidden=true;
      $('#player-message').textContent='Existing recording. Press play in Bandcamp; its controls stay here while you browse.';
      setDrawer(true);
    } else if(service==='soundcloud') {
      $('#music-toggle').disabled=true;
      const frame=iframe(`https://w.soundcloud.com/player/?url=${encodeURIComponent(id)}&auto_play=true&show_comments=false&visual=false`,`${item.name} — existing recordings`,190);
      await loadScript('https://w.soundcloud.com/player/api.js');
      if(token!==generation)return;
      controller=window.SC.Widget(frame);
      const widget=controller;
      const events=window.SC.Widget.Events;
      controller.bind(events.READY,()=>{if(token===generation){$('#music-toggle').disabled=false;widget.play();widget.getCurrentSound(sound=>{if(sound&&token===generation)$('#track-name').textContent=sound.title;});}});
      controller.bind(events.PLAY,()=>{if(token===generation){$('#music-toggle').disabled=false;setPlaying(true);widget.getCurrentSound(sound=>{if(sound&&token===generation)$('#track-name').textContent=sound.title;});}});
      controller.bind(events.PAUSE,()=>{if(token===generation)setPlaying(false);});
      controller.bind(events.FINISH,()=>{if(token===generation)setPlaying(false);});
      controller.bind(events.ERROR,()=>{if(token===generation)fallback('SoundCloud could not load this recording.');});
      setDrawer(true);
      $('#player-message').textContent='Existing recording. If playback is blocked, press play in SoundCloud.';
    } else if(service==='youtube') {
      $('#music-toggle').disabled=true;
      const holder=document.createElement('div');holder.id='youtube-player';$('#persistent-embed').replaceChildren(holder);
      await new Promise((resolve,reject)=>{
        if(window.YT?.Player){resolve();return;}
        const timeout=setTimeout(()=>reject(new Error('YouTube did not respond. Open the recording directly.')),10000);
        window.onYouTubeIframeAPIReady=()=>{clearTimeout(timeout);resolve();};
        loadScript('https://www.youtube.com/iframe_api').catch(reject);
      });
      if(token!==generation)return;
      controller=new window.YT.Player(holder,{host:'https://www.youtube-nocookie.com',height:230,width:'100%',videoId:id,
        playerVars:{autoplay:1,playsinline:1,origin:location.origin},events:{
          onReady:event=>{if(token===generation){$('#music-toggle').disabled=false;event.target.playVideo();}},
          onStateChange:event=>{if(token===generation){setPlaying(event.data===1);const title=event.target.getVideoData()?.title;if(title)$('#track-name').textContent=title;}},
          onAutoplayBlocked:()=>{if(token===generation)fallback('Press play in the video player.');},
          onError:()=>{if(token===generation)fallback('This video is unavailable here.');}
        }});
      setDrawer(true);
      $('#player-message').textContent='Existing performance recording. Video stays visible; close the player to stop.';
    }
  } catch(error) {if(token===generation)fallback(error.message);}
}

audio.addEventListener('play',()=>{if(service==='preview')setPlaying(true);});
audio.addEventListener('pause',()=>{if(service==='preview')setPlaying(false);});
audio.addEventListener('ended',()=>{if(service==='preview'){$('#player-message').textContent='Preview finished. Play again or open the full recording.';setPlaying(false);}});
audio.addEventListener('error',()=>{if(selection&&service==='preview'&&audio.hasAttribute('src'))fallback('Preview unavailable.');});
$('#music-toggle').addEventListener('click',async()=>{
  try{
    if(service==='preview'){playing?audio.pause():await audio.play();}
    else if(service==='soundcloud'){playing?controller?.pause():controller?.play();}
    else if(service==='youtube'){playing?controller?.pauseVideo():controller?.playVideo();}
    else setDrawer(true);
  }catch{fallback('Press play in the recording source.');}
});
$('#player-expand').addEventListener('click',()=>setDrawer($('#player-drawer').hidden));
$('#player-close').addEventListener('click',()=>{
  ++generation; clearMedia();selection=null;$('#floating-player').hidden=true;
  const returnTo=document.querySelector('.artist-button[aria-pressed="true"]')||document.querySelector('#artists h2');
  if(returnTo){returnTo.setAttribute('tabindex',returnTo.tagName==='BUTTON'?'0':'-1');returnTo.focus({preventScroll:true});}
});
