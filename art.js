// An original ASCII illustration. The knobs change drawing parameters, never audio.
const canvas = document.createElement('canvas');
canvas.width = 720; canvas.height = 600;
const ctx = canvas.getContext('2d', {willReadFrequently:true});
const output = document.querySelector('#ascii-art');
const light = document.querySelector('#art-light');
const texture = document.querySelector('#art-texture');
const palette = ' .,:;=+*#%@';
let pointer = 0;

function shape(path, fill = '#aaa', stroke = '#fff', width = 2) {
  const p = new Path2D(path);
  if (fill) {ctx.fillStyle=fill;ctx.fill(p);}
  if (stroke) {ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke(p);}
}
function leaf(x,y,rotation,size) {
  ctx.save(); ctx.translate(x,y); ctx.rotate(rotation); ctx.scale(size,size);
  const grad = ctx.createLinearGradient(-70,0,100,150);
  grad.addColorStop(0,'#444'); grad.addColorStop(.5,'#ddd');grad.addColorStop(1,'#333');
  shape('M0 0C-100 30-100 160 0 240C100 155 100 40 0 0Z',grad,'#ddd',2);
  shape('M0 0Q-12 140 0 240',null,'#333',3);
  for(let i=1;i<8;i++){
    shape(`M0 ${i*28}Q-40 ${i*28-25} -60 ${i*28-10}M0 ${i*28}Q40 ${i*28-25} 60 ${i*28-10}`,null,'#333',2);
  }
  ctx.restore();
}
function draw() {
  ctx.fillStyle='#000';ctx.fillRect(0,0,720,600);
  // One plant, two hands and an analogue instrument share the same ASCII surface.
  shape('M130 510Q140 290 260 60M155 420Q270 300 360 150M140 400Q100 250 30 150',null,'#999',4);
  leaf(250,50,.55,.85);leaf(355,150,.8,.65);leaf(20,130,-.6,.8);leaf(150,290,-.9,.65);
  shape('M225 410L605 360L705 480L285 565Z','#222','#aaa',3);
  shape('M285 565V590L705 504V480M225 410V438L285 590',null,'#888',3);
  // Keys are part of the illustration, without musical input handlers.
  for(let i=0;i<16;i++){
    const x=285+i*24;
    shape(`M${x} 496l22 -4 40 35 -22 5Z`,i%5===1||i%5===3?'#555':'#aaa','#111',2);
  }
  for(let i=0;i<7;i++){
    const x=292+i*42,y=434-i*5.4;
    ctx.beginPath();ctx.ellipse(x,y,13,9,-.14,0,Math.PI*2);ctx.fillStyle='#bbb';ctx.fill();
    const angle=(Number(light.value)/100*4.7-2.3)+i*.8;
    shape(`M${x} ${y}l${Math.sin(angle)*10} ${-Math.cos(angle)*7}`,null,'#222',3);
  }
  // Left hand reaches across the leaves towards the first knob.
  ctx.save();ctx.translate(pointer*6,0);
  shape('M100 600L160 458Q171 430 191 413L252 362Q263 352 274 361Q281 370 268 383L240 412L299 389Q317 384 321 395Q324 407 307 413L265 432L304 429Q324 430 320 444Q319 454 299 455L260 463L290 467Q311 473 304 486Q300 494 279 490L240 489Q222 517 200 523L178 600Z','#888','#ddd',3);
  shape('M167 491Q192 493 205 470M205 442Q220 463 240 489M239 412L220 435M265 432L238 443M260 463L238 468',null,'#333',3);
  ctx.restore();
  // Right hand pinches the final knob, joined to an arm entering the scene.
  shape('M720 150L648 206Q620 220 612 253L590 313L562 356Q554 373 568 380Q581 385 591 370L611 345L604 385Q602 404 619 405Q630 405 635 388L649 352L657 379Q666 393 678 384Q685 379 679 363L670 335Q701 321 710 292L720 275Z','#aaa','#eee',3);
  shape('M612 253Q651 267 670 302M611 345L632 315Q648 307 670 335M649 352L651 324M624 221Q648 233 665 230',null,'#444',3);
  const pixels=ctx.getImageData(0,0,720,600).data;
  const cols=110,rows=55;
  const exposure=.5+Number(light.value)/100;
  const density=Number(texture.value)/100;
  let result='';
  for(let y=0;y<rows;y++){
    for(let x=0;x<cols;x++){
      const i=(Math.floor(y*600/rows)*720+Math.floor(x*720/cols))*4;
      let value=pixels[i]/255*exposure;
      const screen=((x*17+y*31)%13)/13;
      if(screen>density+.3)value*=.35;
      result+=palette[Math.min(palette.length-1,Math.floor(value*(palette.length-1)))];
    }
    result+='\n';
  }
  output.textContent=result;
  light.parentElement.style.setProperty('--rotation',`${Number(light.value)*2.7-135}deg`);
  texture.parentElement.style.setProperty('--rotation',`${Number(texture.value)*2.7-135}deg`);
}
if(output&&ctx){
  light.addEventListener('input',draw);texture.addEventListener('input',draw);
  document.querySelector('.ascii-stage').addEventListener('pointermove',event=>{
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const rect=event.currentTarget.getBoundingClientRect();pointer=(event.clientX-rect.left)/rect.width-.5;
    requestAnimationFrame(draw);
  });
  draw();
}
