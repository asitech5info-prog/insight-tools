/**
 * Tool: Watermark PDF
 */
window.Tools = window.Tools || {};

window.Tools.watermark = {
  id: 'watermark',
  title: 'Watermark PDF',
  description: 'Stamp customized text or confidential notices across all pages of your PDF.',
  accept: '.pdf',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Watermark Text</label>
        <input type="text" id="wmText" class="form-control" value="CONFIDENTIAL" placeholder="e.g. CONFIDENTIAL, DRAFT">
      </div>

      <div class="form-group">
        <label class="form-label">Preset Stamps</label>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button type="button" class="btn-tool-sm wm-preset-btn" data-text="CONFIDENTIAL">CONFIDENTIAL</button>
          <button type="button" class="btn-tool-sm wm-preset-btn" data-text="DRAFT">DRAFT</button>
          <button type="button" class="btn-tool-sm wm-preset-btn" data-text="APPROVED">APPROVED</button>
          <button type="button" class="btn-tool-sm wm-preset-btn" data-text="DO NOT COPY">DO NOT COPY</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Position & Placement</label>
        <select id="wmPosition" class="form-control">
          <option value="diagonal" selected>Diagonal Center (45° Angle)</option>
          <option value="center">Horizontal Center</option>
          <option value="top">Top Header Banner</option>
          <option value="bottom">Bottom Footer Notice</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Stamp Color</label>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <input type="color" id="wmColor" value="#dc2626" style="width: 44px; height: 38px; border: none; border-radius: 6px; cursor: pointer;">
          <select id="wmColorPreset" class="form-control" style="flex: 1;">
            <option value="#dc2626" selected>Security Red (#DC2626)</option>
            <option value="#2563eb">Corporate Blue (#2563EB)</option>
            <option value="#64748b">Slate Gray (#64748B)</option>
            <option value="#10b981">Approved Green (#10B981)</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Opacity / Transparency: <span id="wmOpacityVal">25%</span></label>
        <input type="range" id="wmOpacity" min="10" max="100" value="25" class="form-range" style="width: 100%;">
      </div>

      <div class="form-group">
        <label class="form-label">Font Size: <span id="wmSizeVal">54 pt</span></label>
        <input type="range" id="wmSize" min="20" max="100" value="54" class="form-range" style="width: 100%;">
      </div>

      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="wmFilename" class="form-control" value="watermarked.pdf">
      </div>
    `;

    // Bind Presets
    container.querySelectorAll('.wm-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const textInput = document.getElementById('wmText');
        if (textInput) textInput.value = e.target.dataset.text;
      });
    });

    // Color preset sync
    document.getElementById('wmColorPreset')?.addEventListener('change', (e) => {
      const picker = document.getElementById('wmColor');
      if (picker) picker.value = e.target.value;
    });

    document.getElementById('wmColor')?.addEventListener('input', (e) => {
      const select = document.getElementById('wmColorPreset');
      if (select) select.value = e.target.value;
    });

    // Sliders live values
    document.getElementById('wmOpacity')?.addEventListener('input', (e) => {
      document.getElementById('wmOpacityVal').textContent = `${e.target.value}%`;
    });

    document.getElementById('wmSize')?.addEventListener('input', (e) => {
      document.getElementById('wmSizeVal').textContent = `${e.target.value} pt`;
    });
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select a PDF file.');
    }

    const textRaw = document.getElementById('wmText')?.value?.trim();
    if (!textRaw) {
      throw new Error('Please enter watermark text.');
    }

    const text = PDFEngine.sanitizeWinAnsi(textRaw);
    if (!text) {
      throw new Error('Watermark text must contain valid alphanumeric characters.');
    }

    const file = files[0];
    const { PDFDocument, StandardFonts, rgb, degrees } = PDFLib;
    app.updateProgress(20, 'Loading PDF document...');

    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const position = document.getElementById('wmPosition')?.value || 'diagonal';
    const hexColor = document.getElementById('wmColor')?.value || '#dc2626';
    const opacity = parseInt(document.getElementById('wmOpacity')?.value || '25', 10) / 100;
    const fontSize = parseInt(document.getElementById('wmSize')?.value || '54', 10);

    const colorRgb = PDFEngine.hexToPdfRgb(hexColor);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    for (let i = 0; i < totalPages; i++) {
      const progress = Math.round(20 + ((i / totalPages) * 70));
      app.updateProgress(progress, `Stamping watermark on page ${i + 1} of ${totalPages}...`);

      const page = pages[i];
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      if (position === 'diagonal') {
        page.drawText(text, {
          x: (width / 2) - (textWidth / 2.8),
          y: (height / 2) - (textHeight / 2.8),
          size: fontSize,
          font: font,
          color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
          opacity: opacity,
          rotate: degrees(45)
        });
      } else if (position === 'center') {
        page.drawText(text, {
          x: (width / 2) - (textWidth / 2),
          y: (height / 2) - (textHeight / 2),
          size: fontSize,
          font: font,
          color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
          opacity: opacity
        });
      } else if (position === 'top') {
        page.drawText(text, {
          x: (width / 2) - (textWidth / 2),
          y: height - 40,
          size: Math.min(fontSize, 24),
          font: font,
          color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
          opacity: opacity
        });
      } else if (position === 'bottom') {
        page.drawText(text, {
          x: (width / 2) - (textWidth / 2),
          y: 30,
          size: Math.min(fontSize, 24),
          font: font,
          color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
          opacity: opacity
        });
      }
    }

    app.updateProgress(95, 'Saving watermarked document...');
    const pdfBytes = await pdfDoc.save();

    let outName = document.getElementById('wmFilename')?.value?.trim() || `${file.name.replace(/\.[^/.]+$/, "")}_watermarked.pdf`;
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: pdfBytes,
      filename: outName,
      mimeType: 'application/pdf',
      summary: `Successfully watermarked all ${totalPages} pages with "${text}"`
    };
  }
};
