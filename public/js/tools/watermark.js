/**
 * Tool: Watermark PDF
 */
window.Tools = window.Tools || {};

window.Tools.watermark = {
  id: 'watermark',
  title: 'Watermark PDF',
  description: 'Stamp custom text watermarks onto PDF pages with full control over position, opacity, and angle.',
  accept: '.pdf',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Watermark Text</label>
        <input type="text" id="wmText" class="form-control" value="CONFIDENTIAL" placeholder="e.g. CONFIDENTIAL or INSIGHT TOOLS">
      </div>

      <div class="form-group">
        <label class="form-label">Position Anchor</label>
        <div class="alignment-grid" id="wmAlignGrid">
          <div class="align-grid-cell" data-pos="tl" title="Top Left"><i class="fa-solid fa-arrow-up-left"></i></div>
          <div class="align-grid-cell" data-pos="tc" title="Top Center"><i class="fa-solid fa-arrow-up"></i></div>
          <div class="align-grid-cell" data-pos="tr" title="Top Right"><i class="fa-solid fa-arrow-up-right"></i></div>
          <div class="align-grid-cell" data-pos="ml" title="Middle Left"><i class="fa-solid fa-arrow-left"></i></div>
          <div class="align-grid-cell active" data-pos="mc" title="Center"><i class="fa-solid fa-circle-dot"></i></div>
          <div class="align-grid-cell" data-pos="mr" title="Middle Right"><i class="fa-solid fa-arrow-right"></i></div>
          <div class="align-grid-cell" data-pos="bl" title="Bottom Left"><i class="fa-solid fa-arrow-down-left"></i></div>
          <div class="align-grid-cell" data-pos="bc" title="Bottom Center"><i class="fa-solid fa-arrow-down"></i></div>
          <div class="align-grid-cell" data-pos="br" title="Bottom Right"><i class="fa-solid fa-arrow-down-right"></i></div>
        </div>
      </div>

      <div class="form-group">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
          <label class="form-label" style="margin-bottom: 0;">Font Size</label>
          <span id="wmFontSizeVal" style="font-size: 0.8rem; font-weight: 700; color: var(--primary);">48 pt</span>
        </div>
        <input type="range" id="wmFontSize" min="16" max="96" value="48">
      </div>

      <div class="form-group">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
          <label class="form-label" style="margin-bottom: 0;">Opacity</label>
          <span id="wmOpacityVal" style="font-size: 0.8rem; font-weight: 700; color: var(--primary);">35%</span>
        </div>
        <input type="range" id="wmOpacity" min="10" max="100" value="35">
      </div>

      <div class="form-group">
        <label class="form-label">Rotation Angle</label>
        <select id="wmAngle" class="form-control">
          <option value="45" selected>45° Diagonal</option>
          <option value="0">0° Horizontal</option>
          <option value="-45">-45° Reverse Diagonal</option>
          <option value="90">90° Vertical</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Watermark Color</label>
        <select id="wmColor" class="form-control">
          <option value="red" selected>Red (#ef4444)</option>
          <option value="black">Black (#0f172a)</option>
          <option value="gray">Gray (#64748b)</option>
          <option value="blue">Blue (#3b82f6)</option>
          <option value="purple">Purple (#8b5cf6)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="wmFilename" class="form-control" value="watermarked_document.pdf">
      </div>
    `;

    // Sliders live text
    const sizeInput = document.getElementById('wmFontSize');
    const sizeVal = document.getElementById('wmFontSizeVal');
    sizeInput?.addEventListener('input', (e) => sizeVal.textContent = `${e.target.value} pt`);

    const opInput = document.getElementById('wmOpacity');
    const opVal = document.getElementById('wmOpacityVal');
    opInput?.addEventListener('input', (e) => opVal.textContent = `${e.target.value}%`);

    // Grid selection
    const gridCells = container.querySelectorAll('.align-grid-cell');
    gridCells.forEach(cell => {
      cell.addEventListener('click', () => {
        gridCells.forEach(c => c.classList.remove('active'));
        cell.classList.add('active');
      });
    });
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select a PDF file.');
    }

    const file = files[0];
    const { PDFDocument, StandardFonts, rgb, degrees } = PDFLib;
    app.updateProgress(15, 'Loading PDF document...');

    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    const text = document.getElementById('wmText')?.value?.trim() || 'CONFIDENTIAL';
    const fontSize = parseInt(document.getElementById('wmFontSize')?.value || '48', 10);
    const opacity = parseInt(document.getElementById('wmOpacity')?.value || '35', 10) / 100;
    const angle = parseInt(document.getElementById('wmAngle')?.value || '45', 10);
    const colorKey = document.getElementById('wmColor')?.value || 'red';
    const pos = document.querySelector('.align-grid-cell.active')?.getAttribute('data-pos') || 'mc';

    let colorRgb;
    if (colorKey === 'red') colorRgb = rgb(0.93, 0.27, 0.27);
    else if (colorKey === 'black') colorRgb = rgb(0.06, 0.09, 0.16);
    else if (colorKey === 'blue') colorRgb = rgb(0.23, 0.51, 0.96);
    else if (colorKey === 'purple') colorRgb = rgb(0.54, 0.36, 0.96);
    else colorRgb = rgb(0.4, 0.45, 0.55); // gray

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    pages.forEach((page, idx) => {
      const { width, height } = page.getSize();
      let x, y;

      // Coordinate mapping based on 9-point grid
      if (pos.includes('l')) x = 40;
      else if (pos.includes('r')) x = width - textWidth - 40;
      else x = (width - textWidth) / 2;

      if (pos.startsWith('t')) y = height - textHeight - 40;
      else if (pos.startsWith('b')) y = 40;
      else y = (height - textHeight) / 2;

      page.drawText(text, {
        x: x,
        y: y,
        size: fontSize,
        font: font,
        color: colorRgb,
        opacity: opacity,
        rotate: degrees(angle)
      });
    });

    app.updateProgress(90, 'Saving watermarked document...');
    const pdfBytes = await pdfDoc.save();

    let outName = document.getElementById('wmFilename')?.value?.trim() || 'watermarked_document.pdf';
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: pdfBytes,
      filename: outName,
      mimeType: 'application/pdf',
      summary: `Successfully applied watermark to all ${pages.length} pages`
    };
  }
};
