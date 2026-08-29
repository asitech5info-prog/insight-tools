/**
 * Tool: Split PDF
 */
window.Tools = window.Tools || {};

window.Tools.split = {
  id: 'split',
  title: 'Split PDF',
  description: 'Extract pages, split by custom range, or separate every page into individual PDFs.',
  accept: '.pdf',
  multiple: false,

  renderOptions(container, fileMeta) {
    const totalPages = fileMeta ? fileMeta.pageCount : 1;
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Split Mode</label>
        <div class="option-cards-group">
          <label class="option-card-radio active">
            <input type="radio" name="splitMode" value="range" checked>
            <div>
              <div class="radio-text-title">Custom Page Range</div>
              <div class="radio-text-desc">Extract specific pages (e.g. 1, 3-5)</div>
            </div>
          </label>
          <label class="option-card-radio">
            <input type="radio" name="splitMode" value="all">
            <div>
              <div class="radio-text-title">Extract All Pages</div>
              <div class="radio-text-desc">Save every single page as a separate PDF (.zip)</div>
            </div>
          </label>
          <label class="option-card-radio">
            <input type="radio" name="splitMode" value="odd">
            <div>
              <div class="radio-text-title">Odd Pages Only</div>
              <div class="radio-text-desc">Extract pages 1, 3, 5, 7...</div>
            </div>
          </label>
          <label class="option-card-radio">
            <input type="radio" name="splitMode" value="even">
            <div>
              <div class="radio-text-title">Even Pages Only</div>
              <div class="radio-text-desc">Extract pages 2, 4, 6, 8...</div>
            </div>
          </label>
        </div>
      </div>

      <div class="form-group" id="customRangeGroup">
        <label class="form-label">Page Numbers (Total: <span id="splitTotalPagesSpan">${totalPages}</span>)</label>
        <input type="text" id="splitRangeInput" class="form-control" value="1-${Math.min(totalPages, 5)}" placeholder="e.g. 1-3, 5, 8">
        <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 0.25rem;">
          Use commas and hyphens (e.g. 1, 3-5, 7)
        </small>
      </div>

      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="splitFilename" class="form-control" value="split_document.pdf" placeholder="e.g. split_document.pdf">
      </div>
    `;

    // Listen to radio changes to toggle range input visibility
    const radios = container.querySelectorAll('input[name="splitMode"]');
    radios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        container.querySelectorAll('.option-card-radio').forEach(c => c.classList.remove('active'));
        e.target.closest('.option-card-radio').classList.add('active');
        const rangeGroup = document.getElementById('customRangeGroup');
        if (e.target.value === 'range') {
          rangeGroup.style.display = 'block';
        } else {
          rangeGroup.style.display = 'none';
        }
      });
    });
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select a PDF file to split.');
    }

    const file = files[0];
    const { PDFDocument } = PDFLib;
    app.updateProgress(10, 'Loading document...');

    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    const srcDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = srcDoc.getPageCount();

    const mode = document.querySelector('input[name="splitMode"]:checked')?.value || 'range';
    const baseName = file.name.replace(/\.[^/.]+$/, "");

    if (mode === 'all') {
      // Extract every single page into a ZIP archive
      app.updateProgress(20, 'Preparing individual pages...');
      const zip = new JSZip();

      for (let i = 0; i < totalPages; i++) {
        const progress = Math.round(20 + ((i / totalPages) * 70));
        app.updateProgress(progress, `Extracting page ${i + 1} of ${totalPages}...`);
        
        const singlePageDoc = await PDFDocument.create();
        const [copiedPage] = await singlePageDoc.copyPages(srcDoc, [i]);
        singlePageDoc.addPage(copiedPage);
        const singleBytes = await singlePageDoc.save();
        
        zip.file(`${baseName}_page_${i + 1}.pdf`, singleBytes);
      }

      app.updateProgress(92, 'Generating ZIP bundle...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      app.updateProgress(100, 'Done!');

      return {
        data: zipBlob,
        filename: `${baseName}_split_pages.zip`,
        mimeType: 'application/zip',
        summary: `Successfully split into ${totalPages} separate PDF files`
      };
    } else {
      let pageIndices = [];
      if (mode === 'odd') {
        for (let i = 0; i < totalPages; i += 2) pageIndices.push(i);
      } else if (mode === 'even') {
        for (let i = 1; i < totalPages; i += 2) pageIndices.push(i);
      } else {
        const rangeStr = document.getElementById('splitRangeInput')?.value || `1-${totalPages}`;
        const pages1Based = PDFEngine.parsePageRange(rangeStr, totalPages);
        if (pages1Based.length === 0) {
          throw new Error('No valid pages selected. Please enter valid page numbers.');
        }
        pageIndices = pages1Based.map(p => p - 1);
      }

      app.updateProgress(50, `Extracting ${pageIndices.length} pages...`);
      const newDoc = await PDFDocument.create();
      const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
      copiedPages.forEach(p => newDoc.addPage(p));

      app.updateProgress(90, 'Saving extracted PDF...');
      const pdfBytes = await newDoc.save();
      
      let outName = document.getElementById('splitFilename')?.value?.trim() || `${baseName}_split.pdf`;
      if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

      app.updateProgress(100, 'Done!');
      return {
        data: pdfBytes,
        filename: outName,
        mimeType: 'application/pdf',
        summary: `Successfully extracted ${copiedPages.length} pages from ${file.name}`
      };
    }
  }
};
