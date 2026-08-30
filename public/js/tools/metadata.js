/**
 * Tool: Edit PDF Metadata
 */
window.Tools = window.Tools || {};

window.Tools.metadata = {
  id: 'metadata',
  title: 'Edit PDF Metadata',
  description: 'View and update Title, Author, Subject, Keywords, and Creator properties of your PDF.',
  accept: '.pdf',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Document Title</label>
        <input type="text" id="metaTitle" class="form-control" placeholder="e.g. Annual Financial Report 2026">
      </div>

      <div class="form-group">
        <label class="form-label">Author / Organization</label>
        <input type="text" id="metaAuthor" class="form-control" placeholder="e.g. John Doe / Insight Global">
      </div>

      <div class="form-group">
        <label class="form-label">Subject / Description</label>
        <input type="text" id="metaSubject" class="form-control" placeholder="e.g. Confidential Project Summary">
      </div>

      <div class="form-group">
        <label class="form-label">Keywords (comma-separated)</label>
        <input type="text" id="metaKeywords" class="form-control" placeholder="e.g. finance, legal, audit, 2026">
      </div>

      <div class="form-group">
        <label class="form-label">Creator / Producer</label>
        <input type="text" id="metaCreator" class="form-control" value="Insight Tools PDF Engine">
      </div>

      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="metaFilename" class="form-control" value="updated_metadata.pdf">
      </div>
    `;

    // Try reading metadata from loaded file if available
    if (window.App && window.App.currentFiles && window.App.currentFiles[0]) {
      const file = window.App.currentFiles[0];
      PDFEngine.readFileAsArrayBuffer(file).then(buf => {
        PDFLib.PDFDocument.load(buf, { ignoreEncryption: true }).then(doc => {
          const t = doc.getTitle();
          const a = doc.getAuthor();
          const s = doc.getSubject();
          const k = doc.getKeywords();
          if (t && document.getElementById('metaTitle')) document.getElementById('metaTitle').value = t;
          if (a && document.getElementById('metaAuthor')) document.getElementById('metaAuthor').value = a;
          if (s && document.getElementById('metaSubject')) document.getElementById('metaSubject').value = s;
          if (k && document.getElementById('metaKeywords')) document.getElementById('metaKeywords').value = k;
        }).catch(() => {});
      }).catch(() => {});
    }
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select a PDF file.');
    }

    const file = files[0];
    const { PDFDocument } = PDFLib;
    app.updateProgress(20, 'Loading PDF document...');

    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const title = PDFEngine.sanitizeWinAnsi(document.getElementById('metaTitle')?.value?.trim() || file.name.replace(/\.[^/.]+$/, ""));
    const author = PDFEngine.sanitizeWinAnsi(document.getElementById('metaAuthor')?.value?.trim() || '');
    const subject = PDFEngine.sanitizeWinAnsi(document.getElementById('metaSubject')?.value?.trim() || '');
    const keywordsRaw = document.getElementById('metaKeywords')?.value?.trim() || '';
    const keywords = keywordsRaw ? keywordsRaw.split(',').map(k => PDFEngine.sanitizeWinAnsi(k.trim())).filter(Boolean) : [];
    const creator = PDFEngine.sanitizeWinAnsi(document.getElementById('metaCreator')?.value?.trim() || 'Insight Tools');

    app.updateProgress(60, 'Updating document information dictionary...');

    if (title) pdfDoc.setTitle(title);
    if (author) pdfDoc.setAuthor(author);
    if (subject) pdfDoc.setSubject(subject);
    if (keywords.length > 0) pdfDoc.setKeywords(keywords);
    if (creator) pdfDoc.setCreator(creator);
    pdfDoc.setProducer('Insight Tools PDF Engine');
    pdfDoc.setModificationDate(new Date());

    app.updateProgress(90, 'Saving updated PDF document...');
    const pdfBytes = await pdfDoc.save();

    let outName = document.getElementById('metaFilename')?.value?.trim() || 'updated_metadata.pdf';
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: pdfBytes,
      filename: outName,
      mimeType: 'application/pdf',
      summary: `Successfully updated metadata properties on ${file.name}`
    };
  }
};
