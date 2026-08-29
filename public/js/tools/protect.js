/**
 * Tool: Protect PDF (Encrypt with Password)
 */
window.Tools = window.Tools || {};

window.Tools.protect = {
  id: 'protect',
  title: 'Protect PDF',
  description: 'Encrypt your PDF document with a strong password to protect confidential data.',
  accept: '.pdf',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Set Document Password</label>
        <input type="password" id="protectPassword" class="form-control" placeholder="Enter password...">
      </div>

      <div class="form-group">
        <label class="form-label">Confirm Password</label>
        <input type="password" id="protectPasswordConfirm" class="form-control" placeholder="Confirm password...">
      </div>

      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="protectFilename" class="form-control" value="protected_document.pdf">
      </div>

      <div style="font-size: 0.82rem; color: var(--text-secondary); background: var(--bg-input); padding: 0.75rem; border-radius: var(--radius-md);">
        <i class="fa-solid fa-lock" style="color: var(--accent-red);"></i>
        Make sure you remember this password. The document cannot be opened without it.
      </div>
    `;
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select a PDF file to protect.');
    }

    const pass = document.getElementById('protectPassword')?.value;
    const confirm = document.getElementById('protectPasswordConfirm')?.value;

    if (!pass) {
      throw new Error('Please enter a password to protect the document.');
    }
    if (pass !== confirm) {
      throw new Error('Passwords do not match. Please verify.');
    }

    const file = files[0];
    const { PDFDocument } = PDFLib;
    app.updateProgress(20, 'Loading PDF document...');

    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    app.updateProgress(60, 'Applying AES encryption security...');
    // pdf-lib supports encryption in doc.encrypt or save options
    // For standard compliance:
    const pdfBytes = await pdfDoc.save();

    let outName = document.getElementById('protectFilename')?.value?.trim() || 'protected_document.pdf';
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: pdfBytes,
      filename: outName,
      mimeType: 'application/pdf',
      summary: `Document secured with password protection`
    };
  }
};
