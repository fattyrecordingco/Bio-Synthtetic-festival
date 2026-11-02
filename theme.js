// Colour stops follow festival time. Intermediate times blend continuously.
const stops=[
 {at:0,colors:{bg:'091b12',ink:'d5dfac',quiet:'a5b593',accent:'e3fa80',line:'3d543a',panel:'10261a','sky-top':'08150f','sky-horizon':'24452a','sky-glow':'294827'},light:[12,95,165]},
 {at:240,colors:{bg:'182318',ink:'dcdfae',quiet:'b3b68d',accent:'ecda91',line:'555c3c',panel:'242c1c','sky-top':'0d1d17','sky-horizon':'403c24','sky-glow':'373d23'},light:[85,65,140]},
 {at:600,colors:{bg:'070e0d',ink:'bccfb3',quiet:'a1b49d',accent:'dbe8cb',line:'34493f',panel:'12201b','sky-top':'05080c','sky-horizon':'122727','sky-glow':'192f28'},light:[60,5,195]},
 {at:870,colors:{bg:'111b1a',ink:'cad8b5',quiet:'b2bea3',accent:'e5e7b2',line:'3c5142',panel:'17271f','sky-top':'090f13','sky-horizon':'303b28','sky-glow':'33452a'},light:[14,100,175]},
 {at:1080,colors:{bg:'303923',ink:'f3edbc',quiet:'c9cba9',accent:'fff1ab',line:'687151',panel:'283621','sky-top':'1a2b24','sky-horizon':'4e4a2c','sky-glow':'4b512b'},light:[85,85,140]}
].map(stop=>({...stop,colors:Object.fromEntries(Object.entries(stop.colors).map(([name,hex])=>[name,hex.match(/../g).map(n=>parseInt(n,16))]))}));
const mix=(a,b,t)=>a+(b-a)*t;
const hex=rgb=>'#'+rgb.map(n=>Math.round(n).toString(16).padStart(2,'0')).join('');
function blend(a,b,t){
 return {colors:Object.fromEntries(Object.keys(a.colors).map(name=>[name,a.colors[name].map((n,i)=>mix(n,b.colors[name][i],t))])),light:a.light.map((n,i)=>mix(n,b.light[i],t))};
}
export function themeAt(value){
 const time=Math.max(0,Math.min(1080,value));
 const end=stops.findIndex(stop=>stop.at>=time);
 if(end<=0)return stops[0];
 const a=stops[end-1],b=stops[end],t=(time-a.at)/(b.at-a.at);
 return blend(a,b,t*t*(3-2*t));
}
let current,target,paint,frame=0,last=0,started=0,motion;
function apply(){
 const root=document.documentElement;
 for(const [name,rgb] of Object.entries(current.colors))root.style.setProperty('--'+name,hex(rgb));
 root.style.setProperty('--glow-x',current.light[0]+'%');
 root.style.setProperty('--glow-y',current.light[1]+'%');
 root.style.setProperty('--sky-angle',current.light[2]+'deg');
 paint?.(hex(current.colors.ink));
}
function finish(){
 cancelAnimationFrame(frame);frame=0;current=target;
 document.documentElement.dataset.themeMoving='false';apply();
}
function reducedMotion(){
 if(!motion){motion=matchMedia('(prefers-reduced-motion: reduce)');motion.addEventListener('change',()=>{if(motion.matches&&target)finish();});}
 return motion.matches;
}
function tick(now){
 const amount=1-Math.exp(-Math.min(64,now-last)/140);last=now;
 current=blend(current,target,amount);
 if(now-started>=1000){finish();return;}
 apply();frame=requestAnimationFrame(tick);
}
export function setThemeTime(value,onPaint){
 target=themeAt(value);paint=onPaint;
 if(!current||reducedMotion()){finish();return;}
 // Restart from the displayed colours, so reversing the dial cannot flash.
 started=performance.now();document.documentElement.dataset.themeMoving='true';
 if(!frame){last=started;frame=requestAnimationFrame(tick);}
}
