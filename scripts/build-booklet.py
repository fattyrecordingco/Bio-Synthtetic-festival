"""Reconcile the supplied booklet with the website, preserving its programme note.

First run: --source /path/to/original.docx
Later runs use the small, image-free template in content/booklet-template.docx.
"""
from pathlib import Path
from xml.dom import minidom as DOM
import argparse
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, default=ROOT / 'content/booklet-template.docx')
parser.add_argument('--site-url', default='https://bio-synthetic-first-light.fatty-record-8662.chatgpt.site')
args = parser.parse_args()
data = json.loads((ROOT / 'content/festival.json').read_text())
note = (ROOT / 'content/programme-note.txt').read_text()
with zipfile.ZipFile(args.source) as archive:
    files = {name: archive.read(name) for name in archive.namelist()}
doc = DOM.parseString(files['word/document.xml'])
rels = DOM.parseString(files['word/_rels/document.xml.rels'])
body = doc.getElementsByTagName('w:body')[0]

def text(node):
    return ''.join(child.firstChild.data for child in node.getElementsByTagName('w:t') if child.firstChild)

def element(name, attrs=None):
    node = doc.createElementNS(W, 'w:' + name)
    for key, value in (attrs or {}).items():
        node.setAttributeNS(W, 'w:' + key, str(value))
    return node

def run(words, bold=False):
    node = element('r')
    if bold:
        props = element('rPr'); props.appendChild(element('b')); node.appendChild(props)
    value = element('t'); value.setAttribute('xml:space', 'preserve'); value.appendChild(doc.createTextNode(words)); node.appendChild(value)
    return node

def paragraph(words='', heading=False, page_break=False):
    node = element('p'); props = element('pPr')
    props.appendChild(element('spacing', {'after': 160, 'line': 260, 'lineRule': 'auto'}))
    if heading:
        props.appendChild(element('pStyle', {'val': 'Heading2'}))
        props.appendChild(element('keepNext'))
    if page_break:
        props.appendChild(element('pageBreakBefore'))
    node.appendChild(props); node.appendChild(run(words,heading)); return node

def append(node):
    section = next((child for child in body.childNodes if child.nodeName == 'w:sectPr'), None)
    body.insertBefore(node, section) if section else body.appendChild(node)

def relationship(url):
    existing = rels.getElementsByTagName('Relationship')
    for relation in existing:
        if relation.getAttribute('Target') == url:
            return relation.getAttribute('Id')
    highest = max(int(relation.getAttribute('Id').replace('rId','')) for relation in existing)
    identifier = f'rId{highest+1}'
    relation = rels.createElementNS(REL,'Relationship')
    for key,value in {'Id':identifier,'Type':R+'/hyperlink','Target':url,'TargetMode':'External'}.items():
        relation.setAttribute(key,value)
    rels.documentElement.appendChild(relation); return identifier

def link(words,url):
    node = doc.createElementNS(W,'w:hyperlink'); node.setAttributeNS(R,'r:id',relationship(url))
    value = run(words); props = element('rPr'); props.appendChild(element('color',{'val':'41602C'})); props.appendChild(element('u',{'val':'single'}))
    value.insertBefore(props,value.firstChild); node.appendChild(value); return node

# Remove only the old generated cover picture. Keep the document's original text,
# order of events, styles, margins, running footer and note pagination.
for drawing in list(doc.getElementsByTagName('w:drawing')):
    drawing.parentNode.removeChild(drawing)
files = {name:value for name,value in files.items() if not name.startswith('word/media/')}
for relation in list(rels.getElementsByTagName('Relationship')):
    if relation.getAttribute('Type').endswith('/image'):
        relation.parentNode.removeChild(relation)

# Save a compact template once; all later generated additions stay out of it.
template = ROOT / 'content/booklet-template.docx'
if args.source.resolve() != template.resolve():
    template_files = dict(files)
    template_files['word/document.xml'] = doc.toxml(encoding='UTF-8')
    template_files['word/_rels/document.xml.rels'] = rels.toxml(encoding='UTF-8')
    with zipfile.ZipFile(template,'w',zipfile.ZIP_DEFLATED) as archive:
        for name,value in template_files.items(): archive.writestr(name,value)

for relation in rels.getElementsByTagName('Relationship'):
    target = relation.getAttribute('Target')
    if '2hrdPo9YFwpDLFUUp0BYlQ' in target:
        relation.setAttribute('Target','https://open.spotify.com/artist/1taiQkQLBzfeMXIWMi2Hdx')
    if 'bio-synthetic.fatty-record-8662.chatgpt.site' in target:
        relation.setAttribute('Target',args.site_url)
    if target.rstrip('/') == 'https://biosis.carrd.co':
        relation.setAttribute('Target','https://biosis.bandcamp.com/track/wachuma-fm')

replacements = {
    'https://bio-synthetic.fatty-record-8662.chatgpt.site':args.site_url,
    'The hosted companion is private. The supplied Bio-synthetic_Editable.html file opens locally without a ChatGPT sign-in. Streaming players, maps and external links require internet access.':'The rebuilt interactive companion is public at the link above. A local copy is also supplied; see README.txt. Recordings, streaming players and regional maps require internet access.',
    'Short artist-selected excerpts by Biosis, Wild Anima and Tom Iddan. Compare synthesizer layers, voice, percussion and environmental recordings; final excerpts would be chosen with the artists.':'Plantland Radio was founded by Masterplants Orchestra / Tritone Crisantemo.[4,6] Proposed selections include Biosis, Wild Anima and Tom Iddan; excerpts would be chosen with the artists. The website separates the station broadcast from individual catalogue examples. A Tito the Wize preview introduces a wider catalogue and is not identified as a plant-derived track.',
    'Generative AI assistance: ChatGPT assisted with research, programme development, drafting, document layout and the interactive website. Botanical artwork was generated using OpenAI image generation from a prompt specifying dithered leaves, ASCII-like marks and a green-and-ivory palette.':'Generative AI assistance: ChatGPT assisted with research, programme development, drafting, document layout and the website rebuild. The rebuilt website uses an original hand, knob and leaf sculpture created with OpenAI image generation, displayed through live dither and ASCII rendering. Artist images come from credited artist and production sources. The artwork control changes the illustrative time and light, without simulating BECA or live plant data.'
}
protected = note.split('\n\n')
for para in list(doc.getElementsByTagName('w:p')):
    value = text(para)
    if value in protected: continue
    if value in replacements:
        # Preserve existing paragraph properties while replacing the text.
        for child in list(para.childNodes):
            if child.nodeName != 'w:pPr': para.removeChild(child)
        if value.startswith('https://'):para.appendChild(link(replacements[value],args.site_url))
        else:para.appendChild(run(replacements[value]))

append(paragraph('06 / REFERENCE REGISTER',heading=True,page_break=True))
append(paragraph('Complete website and booklet sources',heading=True))
append(paragraph('References [1]–[10] correspond to the unchanged 917-word programme note. The full register below also covers artist profiles, existing recordings, the Plantland Radio founder credit, visual references and website integrations. All sources checked 2 November 2026. References and explanatory captions are separate from the programme-note word count.'))
append(paragraph('Attribution and listening distinctions',heading=True))
append(paragraph('Plantland Radio is the radio platform founded by Masterplants Orchestra / Tritone Crisantemo.[4,6] It is not a separate festival performer. Biosis, Wild Anima and Tom Iddan are artists in its directory. Tom Iddan’s linked Spotify identity is Tito the Wize; an example from that wider catalogue is not evidence that the particular track is plant-derived.'))
append(paragraph('The Manganiyar Seduction is an existing production conceived, arranged and directed by Roysten Abel, with an Amarrass release.[11,12] It is a listening reference, not the identity or repertoire of the as-yet unselected ensemble for Roots in Conversation. Modern Biology’s acoustic guest also remains unselected. Anoushka Shankar’s Chapter II is an existing recording, separate from the proposed sunrise jugalbandi.'))
append(paragraph('Evidence and links by artist',heading=True))
for item in data['artists']:
    citations=', '.join(str(value) for value in item['sourceRefs'])
    append(paragraph(f"{item['name']} — practice and listening references [{citations}]. {item['caption']}"))
append(paragraph('Website image credits',heading=True))
for artist in data['artists']:
    image = artist.get('image')
    if image:
        p = paragraph(artist['name'] + ' — '); p.appendChild(link(image['credit'],image['source'])); append(p)
append(paragraph('The Manganiyar image documents The Manganiyar Seduction, an existing Roysten Abel production. It does not identify a confirmed festival ensemble. Display dithering and cropping occur in the browser; the source images are credited above.'))
append(paragraph('Additional online references [11]–[36]',heading=True))
append(paragraph('References [1]–[10] appear on the preceding Sources and credits page. The following register continues that numbering.'))
for index,(title,url) in enumerate(data['sources'][10:],11):
    para = paragraph(f'[{index}] ');para.appendChild(link(title,url));append(para)
append(paragraph('Website player behaviour',heading=True))
append(paragraph('Nothing plays on arrival. Selecting an artist requests an existing recording in the floating player. Spotify excerpts are previews, not full festival sets. SoundCloud and YouTube use their service APIs. Bandcamp and the radio station retain their own controls. Browser and service rules can require an additional press; a full-recording source is always linked.'))
append(paragraph('Venue and commission status',heading=True))
append(paragraph('All invitations, titled live collaborations, installation commissions, access provisions and production arrangements are hypothetical proposals. The festival layout is illustrative and not surveyed. The regional map shows Dandeli, not Jungli’s undisclosed location. No exact venue coordinates or date-specific sunrise time are claimed.'))
append(paragraph('Assignment and AI policy',heading=True))
append(paragraph('The note meets the supplied 800–1,000-word requirement. Cover details, themes, artists, venue, duration, order of events and secondary sources are included. MMT Student Handbook sections 4.5 and 4.6 were not supplied, so their requirements have not been independently checked. AI assistance is acknowledged above.'))

actual = [text(para) for para in doc.getElementsByTagName('w:p') if text(para) in protected]
assert actual == protected, 'Protected programme note changed.'
files['word/document.xml'] = doc.toxml(encoding='UTF-8')
files['word/_rels/document.xml.rels'] = rels.toxml(encoding='UTF-8')
output = ROOT / 'assets/Bio-synthetic-booklet.docx'
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
    for name,value in files.items(): archive.writestr(name,value)
print(f'Booklet saved: {len(note.split())} programme-note words; {len(data["sources"])} numbered references; protected text unchanged.')
