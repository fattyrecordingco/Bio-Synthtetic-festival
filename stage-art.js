// Dither each image once, then tint its cached mask as the sky changes.
import {setThemeTime} from './theme.js';
const pattern=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const images=new Map(),portraitMasks=new WeakMap(),sculptureMasks=new Map();
let sourcePixels=null,currentPhase='afternoon',ascii=false;
function image(src){if(!images.has(src))images.set(src,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Image unavailable: '+src));img.src=src;}));return images.get(src);}
function tone(lum,x,y){return lum>(pattern[(y%4)*4+x%4]+.5)/16;}
function surface(width,height){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;}
function artworkInk(){return getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();}
function tint(canvas,mask,ink){
 const ctx=canvas.getContext('2d');ctx.save();ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.drawImage(mask,0,0);ctx.globalCompositeOperation='source-in';ctx.fillStyle=ink;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();
}
function paintPortrait(canvas,ink=artworkInk()){
 const mask=portraitMasks.get(canvas);if(!mask)return;
 tint(canvas,mask,ink);canvas.dataset.phase=currentPhase;
}
export async function renderPortrait(canvas,credit){
 if(!canvas||!credit)return;
 try{
  const img=await image(credit.path),size=240,source=surface(size,size),ctx=source.getContext('2d',{willReadFrequently:true});canvas.width=size;canvas.height=size;
  const mode=credit.fit||'cover',ratio=(mode==='contain'?Math.min(size/img.width,size/img.height):Math.max(size/img.width,size/img.height))*(credit.zoom||1);
  const w=img.width*ratio,h=img.height*ratio,fx=credit.focus?.[0]??.5,fy=credit.focus?.[1]??.5;
  ctx.fillStyle=credit.invert?'#eee':'#07170f';ctx.fillRect(0,0,size,size);
  const dx=mode==='contain'?(size-w)/2:Math.max(size-w,Math.min(0,size/2-w*fx));
  const dy=mode==='contain'?(size-h)/2:Math.max(size-h,Math.min(0,size/2-h*fy));
  ctx.drawImage(img,dx,dy,w,h);
  const pixels=ctx.getImageData(0,0,size,size).data,mask=surface(size,size),output=mask.getContext('2d'),frame=output.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const n=(y*size+x)*4;let lum=(.2126*pixels[n]+.7152*pixels[n+1]+.0722*pixels[n+2])/255;
   if(credit.invert)lum=1-lum;
   lum=Math.pow(Math.max(0,Math.min(1,(lum-.045)/.85)),.8);
   frame.data[n]=frame.data[n+1]=frame.data[n+2]=255;frame.data[n+3]=tone(lum,Math.floor(x/2),Math.floor(y/2))?255:0;
  }
  output.putImageData(frame,0,0);portraitMasks.set(canvas,mask);paintPortrait(canvas);canvas.dataset.loaded='true';
 }catch(error){canvas.dataset.loaded='false';const ctx=canvas.getContext('2d');ctx.fillStyle=artworkInk();ctx.font='22px monospace';ctx.fillText('↗',100,125);console.warn(error.message);}
}
function sculptureMask(mode){
 if(sculptureMasks.has(mode))return sculptureMasks.get(mode);
 const canvas=document.querySelector('#sculpture'),width=canvas.width,height=canvas.height,mask=surface(width,height),ctx=mask.getContext('2d');
 if(mode==='ascii'){
  ctx.font='8px monospace';ctx.textBaseline='top';ctx.fillStyle='#fff';const chars=' .,:;=+*#%@';
  for(let y=0;y<height;y+=9)for(let x=0;x<width;x+=5){const n=(y*width+x)*4,lum=(.2126*sourcePixels[n]+.7152*sourcePixels[n+1]+.0722*sourcePixels[n+2])/255;if(lum>.04)ctx.fillText(chars[Math.min(10,Math.floor(Math.pow(lum,.75)*10))],x,y);}
 }else{
  const frame=ctx.createImageData(width,height),pixels=frame.data;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const n=(y*width+x)*4,lum=(.2126*sourcePixels[n]+.7152*sourcePixels[n+1]+.0722*sourcePixels[n+2])/255;
   pixels[n]=pixels[n+1]=pixels[n+2]=255;
   pixels[n+3]=lum>=.025&&tone(Math.pow(lum,.86),Math.floor(x/2),Math.floor(y/2))?255:0;
  }
  ctx.putImageData(frame,0,0);
 }
 sculptureMasks.set(mode,mask);return mask;
}
function renderSculpture(ink=artworkInk()){
 if(!sourcePixels)return;
 const canvas=document.querySelector('#sculpture'),mode=ascii?'ascii':'dither';
 tint(canvas,sculptureMask(mode),ink);canvas.dataset.loaded='true';canvas.dataset.mode=mode;
}
export function setArtTime(value,phase){
 currentPhase=phase;
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.style.setProperty('--hand-turn',`${(value/1080-.5)*5}deg`);
 setThemeTime(value,ink=>{
  document.querySelectorAll('[data-portrait],.profile-portrait').forEach(canvas=>paintPortrait(canvas,ink));
  renderSculpture(ink);
 });
}
export async function initializeArt(){
 const frame=document.querySelector('#art-frame'),object=document.querySelector('#art-object'),poster=document.querySelector('.poster'),scene=document.querySelector('.scene');
 const fit=()=>{
  const bounds=poster.getBoundingClientRect(),space=scene.getBoundingClientRect();
  const landscape=matchMedia('(max-height: 540px) and (min-aspect-ratio: 4/3)').matches;
  const narrow=!landscape&&window.innerWidth<=600;
  // The figure occupies the poster behind the type and artist rail. Only the
  // knob catches pointers; transparent artwork areas leave foreground links free.
  frame.style.top=(bounds.top-space.top)+'px';frame.style.height=bounds.height+'px';
  let width=Math.min(window.innerWidth*.94,bounds.height*1.8);
  if(narrow)width=bounds.height*1.32;
  if(landscape)width=Math.min(space.width*1.35,bounds.height*1.5);
  const fittedWidth=Math.max(1,width);
  frame.style.left=landscape?'0px':(-space.left)+'px';frame.style.right=landscape?'0px':(space.right-window.innerWidth)+'px';
  object.style.width=fittedWidth+'px';object.style.height=fittedWidth/1.5+'px';
  object.style.left=narrow?fittedWidth*.037+'px':'0px';
  // Keep the large figure visible behind the title, then fade it before the
  // portraits so foreground type and artist images retain their own contrast.
  const titleDepth=space.top-bounds.top,sceneEnd=space.bottom-bounds.top;
  const fadeIn=titleDepth+Math.min(110,space.height*.23),fadeOut=Math.max(fadeIn,sceneEnd-90);
  frame.style.maskImage=`linear-gradient(#0003 0px,#0003 ${titleDepth}px,#000 ${fadeIn}px,#000 ${fadeOut}px,transparent ${sceneEnd+35}px)`;
 };
 const observer=new ResizeObserver(fit);observer.observe(poster);observer.observe(scene);fit();
 const img=await image('assets/sculpture.webp'),canvas=document.querySelector('#sculpture'),source=surface(canvas.width,canvas.height),ctx=source.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(img,0,0,source.width,source.height);sourcePixels=ctx.getImageData(0,0,source.width,source.height).data;renderSculpture();
 document.querySelector('#art-mode').addEventListener('click',event=>{ascii=!ascii;event.currentTarget.setAttribute('aria-pressed',String(ascii));renderSculpture();});
}
