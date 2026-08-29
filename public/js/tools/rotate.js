/**
 * Tool: Rotate PDF
 */
window.Tools = window.Tools || {};

window.Tools.rotate = {
  id: 'rotate',
  title: 'Rotate PDF',
  description: 'Rotate PDF pages permanently by 90, 180, or 270 degrees in batch or individually.',
  accept: '.pdf',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Rotation Angle</label>
        <div class="option-cards-group">
          <label class="option-card-radio active">
            <input type="radio" name="rotateAngle" value="90" checked>
            <div>
              <div class="radio-text-title">90° Clockwise (Right)</div>
              <div class="radio-text-desc">Rotate to the right</div>
            </div>
          </label>
          <label class="option-card-radio">
            <input type="radio" name="rotateAngle" value="180">
            <div>
              <div class="radio-text-title">180° Flip (Upside Down)</div>
              <div class="radio-text-desc">Invert page orientation</div>
            </div>
          </label>
          <label class="option-card-radio">
            <input type="radio" name="rotateAngle" value="270">
            <div>
              <div class="radio-text-title">90° Counter-Clockwise (Left)</div>
              <div class="radio-text-desc">Rotate to the left</div>
            </div>
          </label>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Apply To Pages</label>
        <select id="rotateScope" class="form-control">
          <option value="all" selected>All Pages</option>
          <option value="odd">Odd Pages Only</option>
          <option value="even">Even Pages Only</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="rotateFilename" class="form-control" value="rotated_document.pdf" placeholder="e.g. rotated_document.pdf">
      </div>
    `;

    const radios = container.querySelectorAll('input[name="rotateAngle"]');
    radios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        container.querySelectorAll('.option-card-radio').forEach(c => c.classList.remove('active'));
        e.target.closest('.option-card-radio').classList.add('active');
      });
    });
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select a PDF file to rotate.');
    }

    const file = files[0];
    const { PDFDocument, degrees } = PDFLib;
    app.updateProgress(15, 'Loading PDF document...');

    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    const angleDelta = parseInt(document.querySelector('input[name="rotateAngle"]:checked')?.value || '90', 10);
    const scope = document.getElementById('rotateScope')?.value || 'all';

    pages.forEach((page, index) => {
      const pageNum = index + 1;
      let shouldRotate = false;
      if (scope === 'all') shouldRotate = true;
      else if (scope === 'odd' && pageNum % 2 !== 0) shouldRotate = true;
      else if (scope === 'even' && pageNum % 2 === 0) shouldRotate = true;

      if (shouldRotate) {
        const currentRotation = page.getRotation().angle || 0;
        const newAngle = (currentRotation + angleDelta) % 360;
        page.setRotation(degrees(newAngle));
      }
    });

    app.updateProgress(85, 'Saving rotated document...');
    const pdfBytes = await pdfDoc.save();

    let outName = document.getElementById('rotateFilename')?.value?.trim() || 'rotated_document.pdf';
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: pdfBytes,
      filename: outName,
      mimeType: 'application/pdf',
      summary: `Successfully rotated ${pages.length} pages by ${angleDelta}°`
    };
  }
};
