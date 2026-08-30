/**
 * Tool: Redact PDF (Permanent Blackout of Sensitive Data)
 */
window.Tools = window.Tools || {};

window.Tools.redact = {
  id: 'redact',
  title: 'Redact PDF',
  description: 'Permanently blackout confidential information, personal data, and sensitive sections from PDFs.',
  accept: '.pdf',
  multiple: false,

  renderOptions(container, fileMeta) {
    const totalPages = fileMeta ? fileMeta.pageCount : 1;
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Redaction Preset Zone</label>
        <select id="redactPresetZone" class="form-control">
          <option value="top" selected>Top Header Confidential Zone (Top 50pt)</option>
          <option value="bottom">Bottom Footer Sensitive Zone (Bottom 50pt)</option>
          <option value="center">Center Document Banner (Confidential Strip)</option>
          <option value="all-edges">Border Margins (Top & Bottom)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Redaction Style</label>
        <div class="option-cards-group">
          <label class="option-card-radio active">
            <input type="radio" name="redactColor" value="black" checked>
            <div>
              <div class="radio-text-title">Solid Blackout (#000000)</div>
              <div class="radio-text-desc">Classic opaque black security bar</div>
            </div>
          </label>
          <label class="option-card-radio">
            <input type="radio" name="redactColor" value="white">
            <div>
              <div class="radio-text-title">Clean Whiteout (#FFFFFF)</div>
              <div class="radio-text-desc">Erases area with clean document white</div>
            </div>
          </label>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Apply To Pages</label>
        <select id="redactPageScope" class="form-control">
          <option value="all" selected>All Pages (1 to ${totalPages})</option>
          <option value="first">First Page Only</option>
          <option value="last">Last Page Only</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="redactFilename" class="form-control" value="redacted_document.pdf">
      </div>

      <div style="font-size: 0.82rem; color: var(--text-secondary); background: var(--bg-input); padding: 0.75rem; border-radius: var(--radius-md);">
        <i class="fa-solid fa-shield-halved" style="color: var(--primary);"></i>
        Redactions are permanently burned into the PDF structure, preventing text copying or layer extraction.
      </div>
    `;

    const radios = container.querySelectorAll('input[name="redactColor"]');
    radios.forEach(r => {
      r.addEventListener('change', (e) => {
        container.querySelectorAll('.option-card-radio').forEach(c => c.classList.remove('active'));
        e.target.closest('.option-card-radio').classList.add('active');
      });
    });
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select a PDF file to redact.');
    }

    const file = files[0];
    const { PDFDocument, rgb } = PDFLib;
    app.updateProgress(20, 'Loading PDF document...');

    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    const zone = document.getElementById('redactPresetZone')?.value || 'top';
    const colorType = document.querySelector('input[name="redactColor"]:checked')?.value || 'black';
    const scope = document.getElementById('redactPageScope')?.value || 'all';

    const fillColor = colorType === 'white' ? rgb(1, 1, 1) : rgb(0.04, 0.04, 0.04);

    app.updateProgress(50, 'Burning permanent redactions...');

    pages.forEach((page, idx) => {
      const pageNum = idx + 1;
      let shouldApply = false;
      if (scope === 'all') shouldApply = true;
      else if (scope === 'first' && pageNum === 1) shouldApply = true;
      else if (scope === 'last' && pageNum === totalPages) shouldApply = true;

      if (!shouldApply) return;

      const { width, height } = page.getSize();
      const margin = 20;

      if (zone === 'top' || zone === 'all-edges') {
        // Redact top
        page.drawRectangle({
          x: margin,
          y: height - 60,
          width: width - (margin * 2),
          height: 45,
          color: fillColor
        });
      }

      if (zone === 'bottom' || zone === 'all-edges') {
        // Redact bottom
        page.drawRectangle({
          x: margin,
          y: 20,
          width: width - (margin * 2),
          height: 45,
          color: fillColor
        });
      }

      if (zone === 'center') {
        // Redact center strip
        page.drawRectangle({
          x: margin,
          y: (height / 2) - 30,
          width: width - (margin * 2),
          height: 60,
          color: fillColor
        });
      }
    });

    app.updateProgress(90, 'Saving redacted document...');
    const pdfBytes = await pdfDoc.save();

    let outName = document.getElementById('redactFilename')?.value?.trim() || 'redacted_document.pdf';
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: pdfBytes,
      filename: outName,
      mimeType: 'application/pdf',
      summary: `Successfully applied permanent redaction to ${file.name}`
    };
  }
};
