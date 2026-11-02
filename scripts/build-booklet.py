"""Build the public booklet and optionally a local submission with the MMT form.

Install requirements-docs.txt first. The programme note is never rewritten.
The supplied declaration and submission stay outside the public repository.
"""
from copy import deepcopy
from io import BytesIO
from pathlib import Path
import argparse
import json
from docx import Document
from docx.enum.section import WD_SECTION_START
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
GREEN, ACID, MUTED = '091B12', 'E3FA80', '4A6348'
DATA = json.loads((ROOT/'content/festival.json').read_text())
CREDITS = json.loads((ROOT/'content/credits.json').read_text())
NOTE = (ROOT/'content/programme-note.txt').read_text()
SITE = json.loads((ROOT/'content/site.json').read_text())['url']


def xml(tag, **attrs):
    node = OxmlElement('w:'+tag)
    for key, value in attrs.items():
        node.set(qn('w:'+key), str(value))
    return node


def paragraph(doc, text='', size=None, bold=False, color=None, after=7):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(after)
    r = p.add_run(text)
    if size:
        r.font.size = Pt(size)
    r.bold = bold
    if color:
        r.font.color.rgb = RGBColor.from_string(color)
    return p


def heading(doc, text, page=False):
    p = doc.add_paragraph(text, 'Heading 1')
    p.paragraph_format.page_break_before = page
    return p


def link(p, label, url):
    identifier = p.part.relate_to(url, RT.HYPERLINK, is_external=True)
    node = OxmlElement('w:hyperlink'); node.set(qn('r:id'), identifier)
    run, props = xml('r'), xml('rPr')
    props.append(xml('color', val=MUTED)); props.append(xml('u', val='single'))
    props.append(xml('sz', val='18'))
    run.append(props)
    value = xml('t'); value.text = label; run.append(value)
    node.append(run); p._p.append(node)


def cover_background():
    """Dither the existing illustration, without generation or network requests."""
    source = Image.open(ROOT/'assets/sculpture.webp').convert('RGB')
    pattern = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5]
    art = Image.new('RGB', source.size, '#'+GREEN)
    pixels, output = source.load(), art.load()
    for y in range(source.height):
        for x in range(source.width):
            r,g,b = pixels[x,y]
            lum = (.2126*r+.7152*g+.0722*b)/255
            threshold = (pattern[((y//2)%4)*4+(x//2)%4]+.5)/16
            fade = min(1, max(0, (source.height-y)/(source.height*.15)))
            if lum>.025 and lum**.86*fade>threshold:
                output[x,y] = (202,222,150)
    page = Image.new('RGB', (1240,1754), '#'+GREEN)
    page.paste(art.resize((1050,700), Image.Resampling.LANCZOS), (95,400))
    data = BytesIO(); page.save(data, format='PNG'); data.seek(0)
    return data


def full_page_background(doc):
    p = paragraph(doc, after=0); p.paragraph_format.line_spacing = Pt(1)
    inline = p.add_run().add_picture(cover_background(), width=Cm(21), height=Cm(29.7))._inline
    # Anchored behind editable cover text, on this page only.
    anchor = OxmlElement('wp:anchor')
    for key,value in {'distT':'0','distB':'0','distL':'0','distR':'0','simplePos':'0',
                      'relativeHeight':'0','behindDoc':'1','locked':'0',
                      'layoutInCell':'1','allowOverlap':'1'}.items():
        anchor.set(key,value)
    position = OxmlElement('wp:simplePos'); position.set('x','0'); position.set('y','0')
    anchor.append(position)
    for axis in ['H','V']:
        pos = OxmlElement('wp:position'+axis); pos.set('relativeFrom','page')
        offset = OxmlElement('wp:posOffset'); offset.text = '0'
        pos.append(offset); anchor.append(pos)
    anchor.append(deepcopy(inline.find(qn('wp:extent'))))
    anchor.append(OxmlElement('wp:wrapNone'))
    for tag in ['wp:docPr','wp:cNvGraphicFramePr','a:graphic']:
        child = inline.find(qn(tag))
        if child is not None:
            anchor.append(deepcopy(child))
    anchor.find(qn('wp:docPr')).set('descr','Dithered hand, synth knob and leaf on forest green')
    inline.getparent().replace(inline,anchor)


def setup(doc):
    section = doc.sections[0]
    section.page_width, section.page_height = Cm(21), Cm(29.7)
    section.top_margin = section.bottom_margin = Cm(1.7)
    section.left_margin = section.right_margin = Cm(1.8)
    normal = doc.styles['Normal']
    normal.font.name = 'Arial'; normal.font.size = Pt(11)
    normal.font.color.rgb = RGBColor.from_string(GREEN)
    normal.paragraph_format.line_spacing = 1.15
    normal.paragraph_format.widow_control = True
    title = doc.styles['Heading 1']
    title.font.name = 'Impact'; title.font.size = Pt(30)
    title.font.color.rgb = RGBColor.from_string(GREEN)
    title.paragraph_format.space_before = Pt(0)
    title.paragraph_format.space_after = Pt(14)
    title.paragraph_format.keep_with_next = True
    doc.core_properties.title = 'Bio-synthetic — Curation Assignment'
    doc.core_properties.author = 'Anshul Jain / adotj'
    doc.core_properties.subject = 'Expanding Parameters; Music & its Others; Experimentalism'
    doc.core_properties.comments = CREDITS['assistance']


def cover(doc):
    full_page_background(doc)
    paragraph(doc,'Fatty Recording Co. presents',10,color=ACID,after=13)
    p = paragraph(doc,'BIO–SYNTHETIC',64,color=ACID,after=7)
    p.runs[0].font.name = 'Impact'; p.paragraph_format.line_spacing = 1
    paragraph(doc,'Interspecies music, from afternoon to first light.',10,color=ACID)
    p = paragraph(doc,after=0); p.paragraph_format.line_spacing = Pt(360); p.add_run(' ')
    paragraph(doc,'Curated by Anshul Jain / adotj',15,color=ACID,after=7)
    paragraph(doc,'Curation Assignment · M.Phil. Music and Media Technology',10,color=ACID,after=9)
    paragraph(doc,'Theme: Expanding Parameters\nMusic & its Others / Experimentalism',10,color=ACID,after=9)
    paragraph(doc,'Jungli, near Dandeli, Karnataka\nApproximately 18 hours · 14:00–08:00 · sunrise finale',10,color=ACID,after=12)
    paragraph(doc,'adotj · invited Manganiyar musicians · Anoushka Shankar\nModern Biology · Masterplants Orchestra · Wild Anima\nBrian d’Souza · Mileece · Biosis',9.5,color=ACID,after=9)
    paragraph(doc,'Hypothetical festival. All invitations and commissions are proposed.',8.5,color=ACID,after=0)
    section = doc.add_section(WD_SECTION_START.NEW_PAGE)
    section.top_margin = section.bottom_margin = Cm(1.9)
    section.header.is_linked_to_previous = False; section.footer.is_linked_to_previous = False
    p = section.header.paragraphs[0]
    r = p.add_run('BIO–SYNTHETIC / Fatty Recording Co.'); r.font.size = Pt(8)
    r.font.color.rgb = RGBColor.from_string(MUTED)
    p = section.footer.paragraphs[0]
    r = p.add_run('Anshul Jain / adotj                                      '); r.font.size = Pt(8)
    p._p.append(xml('fldSimple',instr='PAGE'))


def programme(doc):
    heading(doc,'Programme note')
    paragraph(doc,f'{len(NOTE.split())} words · read before the event',9,color=MUTED,after=16)
    for text in NOTE.split('\n\n'):
        p = paragraph(doc,text,11.25,after=8); p.paragraph_format.line_spacing = 1.18
        p.paragraph_format.keep_together = True


def order_of_event(doc):
    heading(doc,'Order of event',page=True)
    paragraph(doc,'Times are IST. All live commissions, invitations and production plans are hypothetical. Sunrise timing is relative to dawn; no festival date or exact sunrise time is specified.',9,after=12)
    table = doc.add_table(rows=0,cols=2); table.autofit = False
    table.columns[0].width, table.columns[1].width = Cm(2.8), Cm(14.6)
    for event in DATA['events']:
        row = table.add_row(); row._tr.get_or_add_trPr().append(xml('cantSplit'))
        first,second = row.cells; first.width,second.width = Cm(2.8),Cm(14.6)
        p = first.paragraphs[0]; p.paragraph_format.space_after = Pt(6)
        r = p.add_run(event['time']); r.bold = True; r.font.size = Pt(9)
        r = p.add_run('\n'+('±45 min' if event['id']=='dawn' else '– '+event['end'])); r.font.size = Pt(8)
        p = second.paragraphs[0]; p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.05
        r = p.add_run(event['title']); r.bold = True; r.font.size = Pt(9.5)
        r = p.add_run('\n'+event['artist']); r.font.size = Pt(8.5)
        for cell in row.cells:
            borders = xml('tcBorders'); borders.append(xml('top',val='single',sz='3',color='B4C0AB'))
            cell._tc.get_or_add_tcPr().append(borders)
    paragraph(doc,'Existing recordings / listening references',10,True,after=4)
    paragraph(doc,'Leaf Library: Mort Garson [2,21], Fujieda / Sarah Cahill [3,22], Plantland Radio [4,23,24] and Tom Iddan / Tito the Wize [25,36]. Artist catalogue links: adotj [13,33]; Manganiyar reference [11,12]; Shankar [14,34]; Modern Biology [15]; Masterplants Orchestra [16]; Wild Anima [17,35]; Brian d’Souza [18]; Mileece [19]; Biosis [20]. All are existing recordings, separate from the proposed festival works.',8.5,after=5)
    paragraph(doc,'Plantland Radio was founded by Masterplants Orchestra / Tritone Crisantemo [4,6]. The Tito preview is a wider-catalogue example, not confirmed plant-derived music. The Manganiyar Seduction is a Roysten Abel production used as a reference; the festival ensemble and acoustic guest remain unselected.',8.5,after=0)


def references(doc):
    heading(doc,'Sources & credits',page=True)
    paragraph(doc,'Numbered references support the note [1–10], recordings, artist profiles and website. Links are clickable. Source and link checks: 2 November 2026.',9,after=10)
    section = doc.add_section(WD_SECTION_START.CONTINUOUS)
    columns = section._sectPr.find(qn('w:cols'))
    columns.set(qn('w:num'),'2'); columns.set(qn('w:space'),'400')
    for index,(title,url) in enumerate(DATA['sources'],1):
        p = paragraph(doc,f'[{index}] ',9,after=2)
        p.paragraph_format.line_spacing = 1.03; p.paragraph_format.keep_together = True
        link(p,title,url)
    paragraph(doc,'Credits & AI assistance',12,True,after=8)
    for key in ['curator','assistance','artwork']:
        paragraph(doc,CREDITS[key],9,after=6)
    paragraph(doc,'Website artist images',10,True,after=5)
    items = []
    for artist in DATA['artists']:
        source = artist['image']['source']
        refs = [str(i) for i,(_,url) in enumerate(DATA['sources'],1) if url==source]
        items.append(artist['image']['credit']+' ['+','.join(refs)+']')
    paragraph(doc,'; '.join(items)+'. Dithering and crops are display treatments. The Manganiyar image shows the existing reference production, not a confirmed festival ensemble.',8.5,after=7)
    paragraph(doc,'Maps are illustrative: the regional view identifies Dandeli, not exact Jungli coordinates. Other artists use their own instruments. The interactive artwork changes time and light; it does not simulate BECA.',8.5,after=7)
    p = paragraph(doc,'Interactive companion: ',9,after=0); link(p,SITE,SITE)


def submission(booklet,declaration,output):
    """Keep institutional wording and logo; leave the attestations unsigned."""
    from docxcompose.composer import Composer
    form = Document(declaration)
    book = Document(booklet)
    form.core_properties.title = book.core_properties.title
    form.core_properties.author = book.core_properties.author
    form.core_properties.comments = CREDITS['assistance']
    # Shared style IDs in the institution's form must not replace booklet fonts.
    for name in ['Normal','Heading 1']:
        old = form.styles[name]._element
        old.getparent().replace(old,deepcopy(book.styles[name]._element))
    fields = {'Student Name:':'Anshul Jain','Assessment Title:':'Bio-synthetic — Curation Assignment'}
    for row in form.tables[0].rows:
        key = row.cells[0].text.strip()
        if key in fields:
            row.cells[1].text = fields[key]
        for cell in row.cells:
            for p in cell.paragraphs:
                p.paragraph_format.space_before = Pt(2); p.paragraph_format.space_after = Pt(2)
                for r in p.runs:
                    r.font.size = Pt(10.5)
    for p in form.paragraphs:
        p.paragraph_format.space_after = Pt(5)
        if not p.text.strip() and not p._p.xpath('.//w:drawing'):
            p.paragraph_format.line_spacing = Pt(3); p.paragraph_format.space_after = Pt(0)
        if p.text.startswith('The Department'):
            for r in p.runs:
                r.font.size = Pt(12)
        elif p.text.startswith(('I have ','Signed:','Date:')):
            for r in p.runs:
                r.font.size = Pt(10.5)
    paragraph(form,'Declaration of AI use',11,True,after=6)
    paragraph(form,CREDITS['declaration'],9,after=0)
    new = form.add_section(WD_SECTION_START.NEW_PAGE)
    source = book.sections[0]
    for attr in ['page_width','page_height','top_margin','bottom_margin','left_margin','right_margin']:
        setattr(new,attr,getattr(source,attr))
    new.header.is_linked_to_previous = False; new.footer.is_linked_to_previous = False
    composer = Composer(form); composer.append(book)
    # Restore the bibliography's columns after Composer adopts the form's
    # final-section defaults. Header parts from the institution stay untouched.
    last = composer.doc.sections[-1]
    last._sectPr.find(qn('w:cols')).set(qn('w:num'),'2')
    last._sectPr.find(qn('w:cols')).set(qn('w:space'),'400')
    last.top_margin = last.bottom_margin = Cm(1.9)
    output.parent.mkdir(parents=True,exist_ok=True)
    composer.save(output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--declaration',type=Path,help='Local MMT declaration DOCX (never published)')
    parser.add_argument('--submission',type=Path,default=ROOT/'submission/Bio-synthetic_Curation_Submission.docx')
    args = parser.parse_args()
    assert 800<=len(NOTE.split())<=1000
    doc = Document(); setup(doc); cover(doc); programme(doc); order_of_event(doc); references(doc)
    output = ROOT/'assets/Bio-synthetic-booklet.docx'; doc.save(output)
    if args.declaration:
        submission(output,args.declaration,args.submission)
        print('Local submission saved with the MMT declaration first. Personal fields and signature remain blank.')
    print(f'Public booklet saved: {len(NOTE.split())} unchanged note words, {len(DATA["events"])} events, {len(DATA["sources"])} references.')


if __name__=='__main__':
    main()
