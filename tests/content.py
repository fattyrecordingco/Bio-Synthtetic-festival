"""Check content invariants and the protected programme note with stdlib only."""
from pathlib import Path
import hashlib
import json
import unittest
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'content/festival.json').read_text())
NOTE = (ROOT / 'content/programme-note.txt').read_text()

class FestivalContent(unittest.TestCase):
    def test_programme_note_preserved(self):
        verification = json.loads((ROOT / 'content/media-verification.json').read_text())
        self.assertEqual(len(NOTE.split()), 917)
        self.assertEqual(hashlib.sha256(NOTE.encode()).hexdigest(), verification['programmeNoteSHA256'])
        self.assertTrue(800 <= len(NOTE.split()) <= 1000)

    def test_booklet_matches_note(self):
        ns = {'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        with zipfile.ZipFile(ROOT / 'assets/Bio-synthetic-booklet.docx') as archive:
            root = ET.fromstring(archive.read('word/document.xml'))
            paragraphs = [''.join(t.text or '' for t in p.findall('.//w:t',ns)) for p in root.findall('.//w:p',ns)]
            self.assertEqual([p for p in paragraphs if p in NOTE.split('\n\n')], NOTE.split('\n\n'))
            relationships = archive.read('word/_rels/document.xml.rels').decode()
            self.assertIn('1taiQkQLBzfeMXIWMi2Hdx', relationships)
            self.assertNotIn('2hrdPo9YFwpDLFUUp0BYlQ', relationships)

    def test_separate_performances_and_sunrise(self):
        events = {event['id']:event for event in DATA['events']}
        self.assertEqual(len(events),17)
        self.assertEqual(events['roots']['time'],'19:30')
        self.assertEqual(set(events['roots']['artists']),{'manganiyar','adotj'})
        self.assertEqual(events['solo']['time'],'22:30')
        self.assertEqual(events['solo']['artists'],['adotj'])
        self.assertEqual(events['dawn']['time'],'Sunrise')
        self.assertEqual(set(events['dawn']['artists']),{'anoushka','adotj'})
        self.assertIn('garson',[record['id'] for record in DATA['records']])

    def test_cross_references(self):
        artists = {artist['id'] for artist in DATA['artists']}
        self.assertEqual(len(artists),9)
        for event in DATA['events']:
            self.assertIn(event['space'],DATA['spaces'])
            self.assertIn(event['phase'],DATA['phases'])
            self.assertTrue(set(event.get('artists',[])) <= artists)
        for artist in DATA['artists']:
            self.assertTrue(artist['listen'].startswith('https://'))
            self.assertIn(artist['media'][0],['spotify','soundcloud','youtube','bandcamp'])
        adotj = next(artist for artist in DATA['artists'] if artist['id']=='adotj')
        self.assertEqual(adotj['listen'],'https://open.spotify.com/artist/1taiQkQLBzfeMXIWMi2Hdx')

    def test_reference_register_in_booklet(self):
        with zipfile.ZipFile(ROOT / 'assets/Bio-synthetic-booklet.docx') as archive:
            relationships = ET.fromstring(archive.read('word/_rels/document.xml.rels'))
            targets = {node.attrib.get('Target') for node in relationships}
            for _,url in DATA['sources']:
                self.assertIn(url, targets)
            external = {url for url in targets if url and url.startswith('https://')}
            source_urls = {url for _,url in DATA['sources']}
            companion = {'https://bio-synthetic-first-light.fatty-record-8662.chatgpt.site'}
            self.assertEqual(external - source_urls - companion,set())
            paragraphs = ET.fromstring(archive.read('word/document.xml'))
            all_text = ''.join(paragraphs.itertext())
            self.assertIn('Masterplants Orchestra / Tritone Crisantemo',all_text)
            self.assertNotIn('The hosted companion is private.',all_text)

    def test_radio_and_artist_catalogue_are_distinct(self):
        records = {record['id']:record for record in DATA['records']}
        self.assertEqual(records['plantland']['media'][0],'radio')
        self.assertNotIn('preview',records['plantland'])
        self.assertEqual(records['tom']['media'][0],'spotify')
        self.assertIn('not confirmed',records['tom']['text'])

if __name__ == '__main__':
    unittest.main(verbosity=2)
