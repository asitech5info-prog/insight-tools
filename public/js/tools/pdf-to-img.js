/**
 * Tool: PDF to Images (JPG / PNG)
 */
window.Tools = window.Tools || {};

window.Tools.pdfToImg = {
  id: 'pdf-to-img',
  title: 'PDF to JPG / PNG',
  description: 'Convert every page of your PDF into crisp, high-resolution image files.',
  accept: '.pdf',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Image Format</label>
        <div class="option-cards-group">
          <label class="option-card-radio active">
            <input type="radio" name="imgFormat" value="image/jpeg" checked>
            <div>
              <div class="radio-text-title">JPG (.jpg)</div>
              <div class="radio-text-desc">Great for photos and standard documents</div>
            </div>
          </label>
          <label class="option-card-radio">
            <input type="radio" name="imgFormat" value="image/png">
            <div>
              <div class="radio-text-title">PNG (.png)</div>
              <div class="radio-text-desc">Lossless clarity for text and vector drawings</div>
            </div>
          </label>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Image Resolution</label>
        <select id="imgDpiSelect" class="form-control">
          <option value="1.5">Standard (150 DPI - Balanced size)</option>
          <option value="2.0" selected>High Quality (200 DPI - Crisp)</option>
          <option value="3.0">Ultra High (300 DPI - Print quality)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">ZIP Archive Name</label>
        <input type="text" id="zipExportName" class="form-control" value="pdf_images.zip" placeholder="e.g. pdf_images.zip">
      </div>
    `;

    const radios = container.querySelectorAll('input[name="imgFormat"]');
    radios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        container.querySelectorAll('.option-card-radio').forEach(c => c.classList.remove('active'));
        e.target.closest('.option-card-radio').classList.add('active');
      });
    });
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select a PDF file to convert.');
    }

    const file = files[0];
    const mimeType = document.querySelector('input[name="imgFormat"]:checked')?.value || 'image/jpeg';
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const scale = parseFloat(document.getElementById('imgDpiSelect')?.value || '2.0');
    const baseName = file.name.replace(/\.[^/.]+$/, "");

    app.updateProgress(10, 'Loading PDF pages...');
    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    const zip = new JSZip();

    for (let i = 1; i <= totalPages; i++) {
      const progress = Math.round(10 + ((i / totalPages) * 75));
      app.updateProgress(progress, `Rendering page ${i} of ${totalPages} (${ext.toUpperCase()})...`);

      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      // White background for JPEG
      if (ext === 'jpg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise((res) => canvas.toBlob(res, mimeType, 0.92));
      zip.file(`${baseName}_page_${i}.${ext}`, blob);
    }

    app.updateProgress(90, 'Packaging into ZIP archive...');
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    let zipName = document.getElementById('zipExportName')?.value?.trim() || `${baseName}_images.zip`;
    if (!zipName.toLowerCase().endsWith('.zip')) zipName += '.zip';

    app.updateProgress(100, 'Done!');
    return {
      data: zipBlob,
      filename: zipName,
      mimeType: 'application/zip',
      summary: `Successfully converted ${totalPages} pages to .${ext} images`
    };
  }
};
