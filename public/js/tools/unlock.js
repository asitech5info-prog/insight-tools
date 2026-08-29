/**
 * Tool: Unlock PDF (Remove Password Restrictions)
 */
window.Tools = window.Tools || {};

window.Tools.unlock = {
  id: 'unlock',
  title: 'Unlock PDF',
  description: 'Remove password and security restrictions from your password-protected PDF files.',
  accept: '.pdf',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Current PDF Password (if required)</label>
        <input type="password" id="unlockPassword" class="form-control" placeholder="Enter current password...">
        <small style="color: var(--text-muted); font-size: 0.78rem;">Leave blank if only permissions/editing restrictions need removal</small>
      </div>

      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="unlockFilename" class="form-control" value="unlocked_document.pdf">
      </div>

      <div style="font-size: 0.82rem; color: var(--text-secondary); background: var(--bg-input); padding: 0.75rem; border-radius: var(--radius-md);">
        <i class="fa-solid fa-lock-open" style="color: var(--accent-green);"></i>
        Insight Tools will decrypt the PDF and remove all security limits, printing blocks, and modification locks.
      </div>
    `;
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select a PDF file.');
    }

    const file = files[0];
    const password = document.getElementById('unlockPassword')?.value || undefined;
    const { PDFDocument } = PDFLib;

    app.updateProgress(20, 'Decrypting PDF streams...');
    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);

    let pdfDoc;
    try {
      pdfDoc = await PDFDocument.load(arrayBuffer, { 
        password: password,
        ignoreEncryption: true 
      });
    } catch (err) {
      throw new Error('Could not unlock PDF. Please verify that the password is correct.');
    }

    app.updateProgress(70, 'Stripping security restrictions...');
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
    copiedPages.forEach(page => newDoc.addPage(page));

    app.updateProgress(90, 'Saving unlocked document...');
    const pdfBytes = await newDoc.save();

    let outName = document.getElementById('unlockFilename')?.value?.trim() || 'unlocked_document.pdf';
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: pdfBytes,
      filename: outName,
      mimeType: 'application/pdf',
      summary: `Successfully removed password and restrictions (${copiedPages.length} pages)`
    };
  }
};
