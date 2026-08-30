const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const JSZip = require('jszip');

async function generateTestFixtures() {
  const dir = path.join(__dirname);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  console.log('Generating automated test fixtures in:', dir);

  // 1. Generate sample.pdf (2 pages with text)
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page1 = pdfDoc.addPage([600, 400]);
  page1.drawText('Insight Tools Automated Verification - Page 1', {
    x: 50,
    y: 350,
    size: 16,
    font,
    color: rgb(0.1, 0.2, 0.5)
  });
  page1.drawText('Sample confidential document content for automated testing.', {
    x: 50,
    y: 300,
    size: 12,
    font,
    color: rgb(0.2, 0.2, 0.2)
  });

  const page2 = pdfDoc.addPage([600, 400]);
  page2.drawText('Insight Tools Automated Verification - Page 2', {
    x: 50,
    y: 350,
    size: 16,
    font,
    color: rgb(0.1, 0.2, 0.5)
  });
  page2.drawText('Secondary page content for multi-page merge, split, and organize.', {
    x: 50,
    y: 300,
    size: 12,
    font,
    color: rgb(0.2, 0.2, 0.2)
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(path.join(dir, 'sample.pdf'), pdfBytes);

  // 2. Generate sample-2.pdf (1 page for merge test)
  const pdfDoc2 = await PDFDocument.create();
  const font2 = await pdfDoc2.embedFont(StandardFonts.Helvetica);
  const p2 = pdfDoc2.addPage([600, 400]);
  p2.drawText('Merged Appendix Document - Page 1', {
    x: 50,
    y: 350,
    size: 14,
    font: font2,
    color: rgb(0.1, 0.4, 0.2)
  });
  const pdfBytes2 = await pdfDoc2.save();
  fs.writeFileSync(path.join(dir, 'sample-2.pdf'), pdfBytes2);

  // 3. Generate sample.docx (valid minimal ZIP/XML docx package)
  const docxZip = new JSZip();
  docxZip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  docxZip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  docxZip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>Insight Tools Word to PDF automated conversion test.</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Second paragraph verifying typography layout, margins, and page rendering.</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`);

  const docxBuf = await docxZip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(path.join(dir, 'sample.docx'), docxBuf);

  // 4. Generate sample.xlsx (valid minimal ZIP/XML xlsx package)
  const xlsxZip = new JSZip();
  xlsxZip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`);

  xlsxZip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);

  xlsxZip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Financials" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`);

  xlsxZip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`);

  xlsxZip.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>Item</t></is></c>
      <c r="B1" t="inlineStr"><is><t>Q1 Revenue</t></is></c>
      <c r="C1" t="inlineStr"><is><t>Status</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="inlineStr"><is><t>Insight Cloud</t></is></c>
      <c r="B2" t="inlineStr"><is><t>$124,000</t></is></c>
      <c r="C2" t="inlineStr"><is><t>Verified</t></is></c>
    </row>
    <row r="3">
      <c r="A3" t="inlineStr"><is><t>PDF Engine Pro</t></is></c>
      <c r="B3" t="inlineStr"><is><t>$89,500</t></is></c>
      <c r="C3" t="inlineStr"><is><t>Active</t></is></c>
    </row>
  </sheetData>
</worksheet>`);

  const xlsxBuf = await xlsxZip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(path.join(dir, 'sample.xlsx'), xlsxBuf);

  // 5. Generate sample.pptx (valid minimal ZIP/XML pptx package)
  const pptxZip = new JSZip();
  pptxZip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`);

  pptxZip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);

  pptxZip.file('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId1"/>
  </p:sldIdLst>
</p:presentation>`);

  pptxZip.file('ppt/_rels/presentation.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`);

  pptxZip.file('ppt/slides/slide1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>Insight Tools Keynote 2026</a:t></a:r></a:p>
          <a:p><a:r><a:t>• Client-Side Zero-Latency PDF Generation</a:t></a:r></a:p>
          <a:p><a:r><a:t>• Instant Document Redaction and Conversion</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`);

  const pptxBuf = await pptxZip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(path.join(dir, 'sample.pptx'), pptxBuf);

  // 6. Generate sample.png and sample.jpg (1x1 pixel image buffers)
  const png1px = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkWPjfDwAEVwG9U7nSkgAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(path.join(dir, 'sample.png'), png1px);

  const jpg1px = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
  fs.writeFileSync(path.join(dir, 'sample.jpg'), jpg1px);

  console.log('Test fixtures created successfully!');
}

if (require.main === module) {
  generateTestFixtures().catch(console.error);
}

module.exports = { generateTestFixtures };
