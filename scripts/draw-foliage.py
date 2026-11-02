"""Build the original vector artwork. No external images or generation service."""
from pathlib import Path
from math import sin, cos, pi, sqrt
import random

random.seed(47)
parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000"><defs>']
parts += ['<linearGradient id="blade" x1="0" x2="1" y1="0" y2=".2"><stop stop-color="#11271d"/><stop offset=".48" stop-color="#314e2a"/><stop offset=".51" stop-color="#718541"/><stop offset="1" stop-color="#1a3421"/></linearGradient>']
parts += ['<g id="leaf"><path d="M0 0C-110 80-190 250-115 430C-65 540-8 590 0 640C28 560 180 460 155 290C140 130 70 40 0 0Z" fill="url(#blade)"/>']
# A fixed dot screen turns the organic silhouette into a print-like field.
for y in range(12,628,5):
    t=y/640
    width=144*sin(pi*t)**.8
    center=20*sin(pi*t)
    for x in range(-150,160,5):
        side=(x-center)/max(width,1)
        if abs(side)>1: continue
        vein=abs((t*10+abs(side)*.85)%1-.5)
        density=.13+.28*(1-side)/2+.24*(1-abs(side))
        if vein<.045: density+=.28
        if random.random()<density:
            size=1.2+random.random()*1.8
            color='#9aac56' if random.random()<.6 else '#cbd078'
            parts.append(f'<rect x="{x}" y="{y}" width="{size:.1f}" height="{size:.1f}" fill="{color}" opacity="{.3+random.random()*.5:.2f}"/>')
parts += ['<path d="M0 7Q35 340 0 640" fill="none" stroke="#c5d17c" stroke-opacity=".55" stroke-width="2"/></g>']
parts += ['<g id="frond"><path d="M0 0Q35 300 0 700" fill="none" stroke="#8fa364" stroke-width="3"/>']
for i in range(12):
    y=45+i*46
    length=140*sin((i+1)/14*pi)+30
    for side in [-1,1]:
        parts.append(f'<path d="M0 {y}Q{side*length*.6:.1f} {y-65} {side*length:.1f} {y-50}Q{side*length*.75:.1f} {y+10} 0 {y+18}" fill="#35522b" stroke="#95a757" stroke-opacity=".5"/>')
        for j in range(5):
            parts.append(f'<path d="M{side*j*length/6:.1f} {y-j*6}l{side*20} -17" stroke="#b0be68" stroke-width="1" opacity=".4"/>')
parts += ['</g></defs>']
placements=[(120,1030,-155,1.1),(80,740,-105,.85),(150,440,-150,.9),(360,1100,-157,1.05),(1490,1080,151,1.5),(1520,720,130,1.25),(1310,1040,178,1.2),(1560,310,100,.9),(1100,1050,-165,.85)]
for x,y,angle,scale in placements:
    parts.append(f'<use href="#leaf" transform="translate({x} {y}) rotate({angle}) scale({scale})"/>')
for x,y,angle,scale in [(75,600,-120,.9),(1620,920,145,1.4),(520,1080,170,1.1),(1470,120,90,.6)]:
    parts.append(f'<use href="#frond" transform="translate({x} {y}) rotate({angle}) scale({scale})"/>')
parts.append('</svg>')
Path(__file__).resolve().parents[1].joinpath('assets/foliage.svg').write_text(''.join(parts))
