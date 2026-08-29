/**
 * Tool: Sign PDF
 */
window.Tools = window.Tools || {};

window.Tools.sign = {
  id: 'sign',
  title: 'Sign PDF',
  description: 'Draw or type your signature and place it securely onto any page of your document.',
  accept: '.pdf',
  multiple: false,

  renderOptions(container, fileMeta) {
    const totalPages = fileMeta ? fileMeta.pageCount : 1;
    let pageOptionsHtml = '';
    for (let i = 1; i <= totalPages; i++) {
      pageOptionsHtml += `<option value="${i}">Page ${i}</option>`;
    }

    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Draw Signature Below</label>
        <div class="signature-box-wrapper">
          <canvas id="signPadCanvas" class="signature-canvas"></canvas>
          <div class="sig-toolbar">
            <div style="display: flex; gap: 0.4rem;">
              <button type="button" class="btn-tool-sm sig-color-btn active" data-color="#0f172a" style="background:#0f172a; width: 22px; height: 22px; border-radius: 50%; padding:0;"></button>
              <button type="button" class="btn-tool-sm sig-color-btn" data-color="#2563eb" style="background:#2563eb; width: 22px; height: 22px; border-radius: 50%; padding:0;"></button>
              <button type="button" class="btn-tool-sm sig-color-btn" data-color="#dc2626" style="background:#dc2626; width: 22px; height: 22px; border-radius: 50%; padding:0;"></button>
            </div>
            <button type="button" id="btnClearSignature" class="btn-tool-sm">
              <i class="fa-solid fa-eraser"></i> Clear
            </button>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Place Signature On</label>
        <select id="signTargetPage" class="form-control">
          ${pageOptionsHtml}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Signature Position</label>
        <select id="signPresetPosition" class="form-control">
          <option value="bottom-right" selected>Bottom Right</option>
          <option value="bottom-left">Bottom Left</option>
          <option value="bottom-center">Bottom Center</option>
          <option value="center">Center of Page</option>
        </select>
      </div>

      <div class="form-group">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
          <label class="form-label" style="margin-bottom: 0;">Signature Size</label>
          <span id="signScaleVal" style="font-size: 0.8rem; font-weight: 700; color: var(--primary);">Medium (160px)</span>
        </div>
        <input type="range" id="signWidthSlider" min="80" max="300" value="160">
      </div>

      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="signFilename" class="form-control" value="signed_document.pdf">
      </div>
    `;

    // Initialize Signature Pad
    const canvas = document.getElementById('signPadCanvas');
    if (canvas) {
      // Handle high-dpi canvas
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = 160 * ratio;
      const ctx = canvas.getContext('2d');
      ctx.scale(ratio, ratio);

      let sigPad;
      if (window.SignaturePad) {
        sigPad = new SignaturePad(canvas, {
          penColor: '#0f172a',
          minWidth: 1.5,
          maxWidth: 3.5
        });
        window._activeSignaturePad = sigPad;
      }

      // Color pickers
      container.querySelectorAll('.sig-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const color = btn.getAttribute('data-color');
          if (window._activeSignaturePad) {
            window._activeSignaturePad.penColor = color;
          }
        });
      });

      // Clear button
      document.getElementById('btnClearSignature')?.addEventListener('click', () => {
        if (window._activeSignaturePad) {
          window._activeSignaturePad.clear();
        }
      });

      // Slider feedback
      const slider = document.getElementById('signWidthSlider');
      const valSpan = document.getElementById('signScaleVal');
      slider?.addEventListener('input', (e) => {
        valSpan.textContent = `${e.target.value}px`;
      });
    }
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select a PDF file.');
    }

    if (!window._activeSignaturePad || window._activeSignaturePad.isEmpty()) {
      throw new Error('Please draw your signature in the box first.');
    }

    const file = files[0];
    const { PDFDocument } = PDFLib;
    app.updateProgress(20, 'Capturing signature...');

    // Convert signature canvas to PNG Data URL
    const sigDataUrl = window._activeSignaturePad.toDataURL('image/png');
    const sigBuffer = await fetch(sigDataUrl).then(r => r.arrayBuffer());

    app.updateProgress(40, 'Loading PDF document...');
    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    const targetPageNum = parseInt(document.getElementById('signTargetPage')?.value || '1', 10);
    const targetPage = pages[Math.min(targetPageNum - 1, pages.length - 1)];

    app.updateProgress(60, 'Embedding signature stamp...');
    const sigImage = await pdfDoc.embedPng(sigBuffer);

    const signWidth = parseInt(document.getElementById('signWidthSlider')?.value || '160', 10);
    const aspectRatio = sigImage.height / sigImage.width;
    const signHeight = signWidth * aspectRatio;

    const { width, height } = targetPage.getSize();
    const posPreset = document.getElementById('signPresetPosition')?.value || 'bottom-right';

    let x, y;
    const margin = 36;
    if (posPreset === 'bottom-right') {
      x = width - signWidth - margin;
      y = margin;
    } else if (posPreset === 'bottom-left') {
      x = margin;
      y = margin;
    } else if (posPreset === 'bottom-center') {
      x = (width - signWidth) / 2;
      y = margin;
    } else {
      // center
      x = (width - signWidth) / 2;
      y = (height - signHeight) / 2;
    }

    targetPage.drawImage(sigImage, {
      x: x,
      y: y,
      width: signWidth,
      height: signHeight
    });

    app.updateProgress(90, 'Saving signed PDF...');
    const pdfBytes = await pdfDoc.save();

    let outName = document.getElementById('signFilename')?.value?.trim() || 'signed_document.pdf';
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: pdfBytes,
      filename: outName,
      mimeType: 'application/pdf',
      summary: `Successfully stamped signature on Page ${targetPageNum}`
    };
  }
};
