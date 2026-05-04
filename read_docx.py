import zipfile
import xml.etree.ElementTree as ET
import sys

def extract_text_from_docx(filepath):
    try:
        with zipfile.ZipFile(filepath, 'r') as zip_ref:
            document_xml = zip_ref.read('word/document.xml')
            # Decode as UTF-8
            document_xml_str = document_xml.decode('utf-8')
            root = ET.fromstring(document_xml_str)
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            paragraphs = root.findall('.//w:p', ns)
            text_parts = []
            for p in paragraphs:
                text_elements = p.findall('.//w:t', ns)
                for t in text_elements:
                    if t.text:
                        text_parts.append(t.text)
            return '\n'.join(text_parts)
    except Exception as e:
        return f'Error: {e}'

filepath = r'c:\OSPanel\diplom\Задание_на_учебную_практику_МДК_09_02.docx'
text = extract_text_from_docx(filepath)
# Encode to UTF-8 for proper output
sys.stdout.reconfigure(encoding='utf-8')
print(text)
