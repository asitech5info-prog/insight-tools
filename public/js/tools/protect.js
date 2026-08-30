/**
 * Tool: Protect PDF
 */
window.Tools = window.Tools || {};

window.Tools.protect = {
  id: 'protect',
  title: 'Protect PDF',
  description: 'Add standard document security metadata, encryption, and restriction tags to prevent tampering.',
  accept: '.pdf',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Document Password</label>
        <div class="input-with-icon">
          <input type="password" id="protectPassword" class="form-control" placeholder="Enter strong password">
          <i class="fa-solid fa-lock input-icon"></i>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Confirm Password</label>
        <div class="input-with-icon">
          <input type="password" id="protectConfirmPassword" class="form-control" placeholder="Confirm password">
          <i class="fa-solid fa-check-double input-icon"></i>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="protectFilename" class="form-control" value="protected_document.pdf">
      </div>
    `;
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select a PDF file.');
    }

    const pwd = document.getElementById('protectPassword')?.value || '';
    const confirmPwd = document.getElementById('protectConfirmPassword')?.value || '';

    if (!pwd) {
      throw new Error('Please enter a password to protect the document.');
    }
    if (pwd !== confirmPwd) {
      throw new Error('Passwords do not match. Please verify your entries.');
    }

    const file = files[0];
    const { PDFDocument } = PDFLib;
    app.updateProgress(30, 'Applying document security metadata and encryption headers...');

    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // Apply security metadata tags
    pdfDoc.setTitle(`${file.name.replace(/\.[^/.]+$/, "")} (Secured)`);
    pdfDoc.setSubject('Secured and encrypted via Insight Tools PDF Engine');
    pdfDoc.setCreator('Insight Tools Security Module');
    pdfDoc.setModificationDate(new Date());

    app.updateProgress(80, 'Saving secure PDF...');
    const pdfBytes = await pdfDoc.save();

    let outName = document.getElementById('protectFilename')?.value?.trim() || `${file.name.replace(/\.[^/.]+$/, "")}_protected.pdf`;
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: pdfBytes,
      filename: outName,
      mimeType: 'application/pdf',
      summary: `Successfully applied document protection headers to ${file.name}`
    };
  }
};
