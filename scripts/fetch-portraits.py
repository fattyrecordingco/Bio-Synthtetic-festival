"""Download credited originals; browser rendering applies the display-only dither."""
from pathlib import Path
import concurrent.futures,json,urllib.request
ROOT=Path(__file__).resolve().parents[1]
images={
'adotj':('https://image-cdn-fa.spotifycdn.com/image/ab676161000051747df459e9a4ac43948d0a2953','https://open.spotify.com/artist/1taiQkQLBzfeMXIWMi2Hdx','adotj.music / Spotify artist image','Artist logo for adotj.music'),
'wild':('https://image-cdn-fa.spotifycdn.com/image/ab6761610000517496d4e2ba1c03ce843619a15f','https://open.spotify.com/artist/5hFivotCpgANmtLv4yx67u','Wild Anima / Spotify artist image','Wild Anima artist portrait'),
'anoushka':('https://www.anoushkashankar.com/media/pages/biography/1002107232-1792825824/ltr037_anoushka-shankar_1-aa-laura-lewis_hq.jpg','https://www.anoushkashankar.com/biography','Anoushka Shankar / official biography','Portrait of Anoushka Shankar'),
'modern':('https://i1.sndcdn.com/avatars-tb9DgufT3vfGWbOI-OIEz5Q-t500x500.jpg','https://soundcloud.com/modernbiology','Modern Biology / SoundCloud avatar','Modern Biology artist portrait'),
'mileece':('https://i1.sndcdn.com/avatars-000685043276-dximhd-t500x500.jpg','https://soundcloud.com/Mileece','Mileece / SoundCloud avatar','Mileece artist image'),
'biosis':('https://f4.bcbits.com/img/0047296945_21.jpg','https://biosis.bandcamp.com/track/wachuma-fm','Biosis / Bandcamp artist image','Biosis artist portrait'),
'brian':('https://images.squarespace-cdn.com/content/v1/60c5b3891d84ec1d37ee3d7d/96c8c585-c1ce-4418-b3e6-97c0e1811f9a/Briandsouzapresspic6.jpeg?format=500w','https://www.briandsouza.in/plants-can-dance','Brian d’Souza / official press image','Portrait of Brian d’Souza'),
'masterplants':('https://images.squarespace-cdn.com/content/v1/5f1054b1511b113453347e2b/91977f0d-9392-416e-8474-9849b8edc477/MP_Logo_Blk.png?format=500w','https://www.masterplants.net/orchestra','Masterplants Orchestra / official logo','Masterplants Orchestra logo'),
'manganiyar':('https://roystenabel.co/core-source/uploads/2026/01/tms9.webp','https://roystenabel.co/the-manganiyar-seduction/','Roysten Abel Productions / The Manganiyar Seduction','Reference photograph of The Manganiyar Seduction, not a confirmed festival ensemble')}
raw=ROOT/'assets/raw';raw.mkdir(exist_ok=True)
def download(item):
 key,(url,source,credit,alt)=item
 request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
 with urllib.request.urlopen(request,timeout=30) as response:
  content=response.read();mime=response.headers.get_content_type()
 ext={ 'image/png':'png','image/webp':'webp'}.get(mime,'jpg')
 target=raw/(key+'.'+ext);target.write_bytes(content)
 return key,{'path':f'assets/artists/{key}.webp','original':url,'source':source,'credit':credit,'alt':alt,'downloaded':'2026-11-02','raw':str(target.relative_to(ROOT)),'fit':'contain' if key=='masterplants' else 'cover','invert':key=='masterplants'}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:credits=dict(pool.map(download,images.items()))
for key,value in credits.items():print(key,Path(ROOT/value['raw']).stat().st_size)
p=ROOT/'content/festival.json';data=json.loads(p.read_text())
for artist in data['artists']:artist['image']={k:v for k,v in credits[artist['id']].items() if k!='raw'}
p.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
(ROOT/'content/image-credits.json').write_text(json.dumps(credits,indent=2,ensure_ascii=False)+'\n')
