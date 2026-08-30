/**
 * Tool: PDF to Grayscale (B&W Ink Saver)
 */
window.Tools = window.Tools || {};

window.Tools.grayscale = {
  id: 'grayscale',
  title: 'PDF to Grayscale',
  description: 'Convert color PDF documents into crisp monochrome / grayscale for ink-saving printing.',
  accept: '.pdf',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Grayscale Profile</label>
        <div class="option-cards-group">
          <label class="option-card-radio active">
            <input type="radio" name="grayProfile" value="balanced" checked>
            <div>
              <div class="radio-text-title">Balanced Grayscale</div>
              <div class="radio-text-desc">Smooth shades of gray with sharp text</div>
            </div>
          </label>
          <label class="option-card-radio">
            <input type="radio" name="grayProfile" value="high-contrast">
            <div>
              <div class="radio-text-title">High-Contrast B&W</div>
              <div class="radio-text-desc">Deep blacks & pure whites (Max ink saver)</div>
            </div>
          </label>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Print Quality / Resolution</label>
        <select id="grayDpiSelect" class="form-control">
          <option value="1.5">Standard Print (150 DPI - Compact Size)</option>
          <option value="2.0" selected>High Clarity (200 DPI - Sharp)</option>
          <option value="2.5">Ultra Print (250 DPI - Fine Vector Detail)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="grayFilename" class="form-control" value="grayscale_document.pdf">
      </div>
    `;

    const radios = container.querySelectorAll('input[name="grayProfile"]');
    radios.forEach(r => {
      r.addEventListener('change', (e) => {
        container.querySelectorAll('.option-card-radio').forEach(c => c.classList.remove('active'));
        e.target.closest('.option-card-radio').classList.add('active');
      });
    });
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select a PDF file.');
    }

    const file = files[0];
    const profile = document.querySelector('input[name="grayProfile"]:checked')?.value || 'balanced';
    const scale = parseFloat(document.getElementById('grayDpiSelect')?.value || '2.0');

    const { PDFDocument } = PDFLib;
    app.updateProgress(10, 'Loading PDF for grayscale conversion...');

    let loadingTask = null;
    let pdf = null;

    try {
      const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
      loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      const newPdfDoc = await PDFDocument.create();

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const progress = Math.round(10 + ((pageNum / totalPages) * 75));
        app.updateProgress(progress, `Converting page ${pageNum} of ${totalPages} to grayscale...`);

        const page = await pdf.getPage(pageNum);
        const originalViewport = page.getViewport({ scale: 1.0 });
        const renderViewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = renderViewport.width;
        canvas.height = renderViewport.height;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

        // Apply Grayscale Luminance Shader
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;

        for (let i = 0; i < d.length; i += 4) {
          let gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          if (profile === 'high-contrast') {
            gray = gray > 140 ? 255 : (gray < 80 ? 0 : gray);
          }
          d[i] = gray;
          d[i + 1] = gray;
          d[i + 2] = gray;
        }

        ctx.putImageData(imgData, 0, 0);

        // Convert canvas to JPEG buffer
        const jpegBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.90));
        PDFEngine.releaseCanvas(canvas);
        try { await page.cleanup?.(); } catch (_) {}

        const jpegBuffer = await jpegBlob.arrayBuffer();
        const embeddedImg = await newPdfDoc.embedJpg(jpegBuffer);

        const newPage = newPdfDoc.addPage([originalViewport.width, originalViewport.height]);
        newPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: originalViewport.width,
          height: originalViewport.height
        });
      }

      app.updateProgress(90, 'Saving grayscale PDF...');
      const pdfBytes = await newPdfDoc.save();

      let outName = document.getElementById('grayFilename')?.value?.trim() || `${file.name.replace(/\.[^/.]+$/, "")}_grayscale.pdf`;
      if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

      try { await pdf.cleanup?.(); await pdf.destroy?.(); } catch (_) {}
      try { await loadingTask.destroy?.(); } catch (_) {}

      app.updateProgress(100, 'Done!');
      return {
        data: pdfBytes,
        filename: outName,
        mimeType: 'application/pdf',
        summary: `Successfully converted ${totalPages} pages to clean monochrome grayscale`
      };
    } catch (err) {
      if (pdf) { try { await pdf.destroy?.(); } catch (_) {} }
      if (loadingTask) { try { await loadingTask.destroy?.(); } catch (_) {} }
      throw err;
    }
  }
};
