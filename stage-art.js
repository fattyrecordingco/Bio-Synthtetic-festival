// Display the original assets through a live ordered-dither screen.
const pattern=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const images=new Map();
let sourcePixels=null,currentPhase='afternoon',ascii=false;
function image(src){if(!images.has(src))images.set(src,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Image unavailable: '+src));img.src=src;}));return images.get(src);}
function tone(lum,x,y){const threshold=(pattern[(y%4)*4+x%4]+.5)/16;return lum>threshold;}
export async function renderPortrait(canvas,credit){
 if(!canvas||!credit)return;
 try{
  const img=await image(credit.path),size=240,ctx=canvas.getContext('2d',{willReadFrequently:true});canvas.width=size;canvas.height=size;
  ctx.fillStyle='#07170f';ctx.fillRect(0,0,size,size);
  const mode=credit.fit||'cover',ratio=(mode==='contain'?Math.min(size/img.width,size/img.height):Math.max(size/img.width,size/img.height))*(credit.zoom||1);
  const w=img.width*ratio,h=img.height*ratio,fx=credit.focus?.[0]??.5,fy=credit.focus?.[1]??.5;
  if(credit.invert)ctx.fillStyle='#eee';else ctx.fillStyle='#07170f';ctx.fillRect(0,0,size,size);
  const dx=mode==='contain'?(size-w)/2:Math.max(size-w,Math.min(0,size/2-w*fx));
  const dy=mode==='contain'?(size-h)/2:Math.max(size-h,Math.min(0,size/2-h*fy));
  ctx.drawImage(img,dx,dy,w,h);
  const frame=ctx.getImageData(0,0,size,size),pixels=frame.data;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const n=(y*size+x)*4;let lum=(.2126*pixels[n]+.7152*pixels[n+1]+.0722*pixels[n+2])/255;
   if(credit.invert)lum=1-lum;
   lum=Math.pow(Math.max(0,Math.min(1,(lum-.045)/.85)),.8);
   const bright=tone(lum,Math.floor(x/2),Math.floor(y/2));
   pixels[n]=bright?203:8;pixels[n+1]=bright?221:26;pixels[n+2]=bright?159:16;pixels[n+3]=255;
  }
  ctx.putImageData(frame,0,0);canvas.dataset.loaded='true';
 }catch(error){canvas.dataset.loaded='false';const ctx=canvas.getContext('2d');ctx.fillStyle='#acc483';ctx.font='22px monospace';ctx.fillText('↗',100,125);console.warn(error.message);}
}
function renderSculpture(){
 if(!sourcePixels)return;const canvas=document.querySelector('#sculpture'),ctx=canvas.getContext('2d'),out=ctx.createImageData(canvas.width,canvas.height),pixels=out.data;
 const palette={afternoon:[202,222,150],twilight:[233,216,163],night:[176,207,182],dawn:[253,240,183]}[currentPhase];
 const width=canvas.width,height=canvas.height;
 if(ascii){
  ctx.clearRect(0,0,width,height);ctx.font='8px monospace';ctx.textBaseline='top';ctx.fillStyle=`rgb(${palette.join(',')})`;
  const chars=' .,:;=+*#%@';
  for(let y=0;y<height;y+=9)for(let x=0;x<width;x+=5){const n=(y*width+x)*4;const lum=(.2126*sourcePixels[n]+.7152*sourcePixels[n+1]+.0722*sourcePixels[n+2])/255;if(lum>.04)ctx.fillText(chars[Math.min(10,Math.floor(Math.pow(lum,.75)*10))],x,y);}
  canvas.dataset.mode='ascii';return;
 }
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const n=(y*width+x)*4,lum=(.2126*sourcePixels[n]+.7152*sourcePixels[n+1]+.0722*sourcePixels[n+2])/255;
  if(lum<.025){pixels[n+3]=0;continue;}
  const value=Math.pow(lum,.86),bright=tone(value,Math.floor(x/2),Math.floor(y/2));
  pixels[n]=palette[0];pixels[n+1]=palette[1];pixels[n+2]=palette[2];pixels[n+3]=bright?245:0;
 }
 ctx.putImageData(out,0,0);canvas.dataset.loaded='true';canvas.dataset.mode='dither';
}
export function setArtTime(value,phase){const changed=currentPhase!==phase;currentPhase=phase;if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.style.setProperty('--hand-turn',`${(value/1080-.5)*5}deg`);if(changed)renderSculpture();}
export async function initializeArt(){
 const frame=document.querySelector('#art-frame'),object=document.querySelector('#art-object');
 const fit=()=>{
  const width=frame.clientWidth,height=frame.clientHeight;
  const margin = window.innerWidth <= 600 ? 0.98 : 0.84;
  const fittedWidth=Math.max(1,Math.min(width*margin,height*1.5));
  object.style.width=fittedWidth+'px';object.style.height=fittedWidth/1.5+'px';
 };
 const observer=new ResizeObserver(fit);observer.observe(frame);fit();
 const img=await image('assets/sculpture.webp'),canvas=document.querySelector('#sculpture'),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,canvas.width,canvas.height);sourcePixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;renderSculpture();
 document.querySelector('#art-mode').addEventListener('click',event=>{ascii=!ascii;event.currentTarget.setAttribute('aria-pressed',String(ascii));renderSculpture();});
}
