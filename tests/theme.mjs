import assert from 'node:assert/strict';
import {themeAt} from '../theme.js';

const luminance=rgb=>rgb.map(n=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
const backgrounds=['bg','panel','sky-top','sky-horizon','sky-glow'];
let minimum=Infinity;
function checkContrast(colors){
 for(const foreground of ['quiet','ink','accent'])for(const background of backgrounds){
  const ratio=(luminance(colors[foreground])+.05)/(luminance(colors[background])+.05);
  minimum=Math.min(minimum,ratio);assert.ok(ratio>=4.5,`${foreground} on ${background}: ${ratio}`);
 }
}
for(let time=0;time<=1080;time+=5)checkContrast(themeAt(time).colors);
// Large jumps and reversals also pass through readable intermediate colours.
for(const from of [0,240,600,870,1080])for(const to of [0,240,600,870,1080]){
 const a=themeAt(from).colors,b=themeAt(to).colors;
 for(let step=0;step<=10;step++)checkContrast(Object.fromEntries(Object.keys(a).map(name=>[name,a[name].map((n,i)=>n+(b[name][i]-n)*step/10)])));
}
for(const boundary of [180,390,990]){
 const a=themeAt(boundary-.1).colors,b=themeAt(boundary+.1).colors;
 for(const name of Object.keys(a))assert.ok(a[name].every((n,i)=>Math.abs(n-b[name][i])<1),`Colour jumped at ${boundary}`);
}
assert.deepEqual(themeAt(-1).colors,themeAt(0).colors);
assert.deepEqual(themeAt(2000).colors,themeAt(1080).colors);
assert.notDeepEqual(themeAt(15).light,themeAt(0).light);
assert.notDeepEqual(themeAt(90).colors,themeAt(0).colors);
console.log(`Colour continuity, clamping and text contrast pass; minimum contrast ${minimum.toFixed(2)}:1.`);
