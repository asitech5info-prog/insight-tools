/**
 * Tool: PDF to Excel (.pdf -> .xlsx)
 */
window.Tools = window.Tools || {};

window.Tools.pdfToExcel = {
  id: 'pdf-to-excel',
  title: 'PDF to Excel',
  description: 'Extract tables and structured data from PDF into editable Microsoft Excel spreadsheets (.xlsx).',
  accept: '.pdf',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Workbook Structure</label>
        <div class="option-cards-group">
          <label class="option-card-radio active">
            <input type="radio" name="excelSheetMode" value="multi" checked>
            <div>
              <div class="radio-text-title">One Sheet per PDF Page</div>
              <div class="radio-text-desc">Creates Sheet1, Sheet2... for each page</div>
            </div>
          </label>
          <label class="option-card-radio">
            <input type="radio" name="excelSheetMode" value="single">
            <div>
              <div class="radio-text-title">Combine into Single Sheet</div>
              <div class="radio-text-desc">Concatenates all pages into one worksheet</div>
            </div>
          </label>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="pdfExcelFilename" class="form-control" value="extracted_data.xlsx">
      </div>
    `;

    const radios = container.querySelectorAll('input[name="excelSheetMode"]');
    radios.forEach(radio => {
      radio.addEventListener('change', (e) => {
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
    if (!window.XLSX) {
      throw new Error('Excel library loading, please try again.');
    }

    let loadingTask = null;
    let pdf = null;

    try {
      app.updateProgress(15, 'Extracting text tables and data matrix...');
      const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
      loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      const wb = XLSX.utils.book_new();
      const sheetMode = document.querySelector('input[name="excelSheetMode"]:checked')?.value || 'multi';
      let combinedRows = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const progress = Math.round(15 + ((pageNum / totalPages) * 70));
        app.updateProgress(progress, `Analyzing table columns on page ${pageNum} of ${totalPages}...`);

        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Group items by Y coordinate (rows)
        const rowBuckets = {};
        for (const item of textContent.items) {
          if (!item.str.trim()) continue;
          const y = Math.round(item.transform[5]);
          const matchedY = Object.keys(rowBuckets).find(k => Math.abs(k - y) < 6);
          const targetY = matchedY !== undefined ? matchedY : y;

          if (!rowBuckets[targetY]) rowBuckets[targetY] = [];
          rowBuckets[targetY].push({
            x: Math.round(item.transform[4]),
            text: item.str.trim()
          });
        }

        // Sort rows top-to-bottom (descending Y)
        const sortedYs = Object.keys(rowBuckets).sort((a, b) => Number(b) - Number(a));
        const pageRows = [];

        for (const y of sortedYs) {
          // Sort cells in this row left-to-right (ascending X)
          const cells = rowBuckets[y].sort((a, b) => a.x - b.x);
          pageRows.push(cells.map(c => c.text));
        }

        if (sheetMode === 'multi') {
          const ws = XLSX.utils.aoa_to_sheet(pageRows.length ? pageRows : [['No table data detected on this page']]);
          XLSX.utils.book_append_sheet(wb, ws, `Page ${pageNum}`);
        } else {
          if (pageNum > 1 && pageRows.length) {
            combinedRows.push([`--- Page ${pageNum} ---`]);
          }
          combinedRows.push(...pageRows);
        }

        try { await page.cleanup?.(); } catch (_) {}
      }

      if (sheetMode === 'single') {
        const ws = XLSX.utils.aoa_to_sheet(combinedRows.length ? combinedRows : [['No table data detected']]);
        XLSX.utils.book_append_sheet(wb, ws, 'Extracted Data');
      }

      app.updateProgress(90, 'Writing Excel workbook (.xlsx)...');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const excelBlob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      let outName = document.getElementById('pdfExcelFilename')?.value?.trim() || `${file.name.replace(/\.[^/.]+$/, "")}.xlsx`;
      if (!outName.toLowerCase().endsWith('.xlsx') && !outName.toLowerCase().endsWith('.xls')) outName += '.xlsx';

      try { await pdf.cleanup?.(); await pdf.destroy?.(); } catch (_) {}
      try { await loadingTask.destroy?.(); } catch (_) {}

      app.updateProgress(100, 'Done!');
      return {
        data: excelBlob,
        filename: outName,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        summary: `Successfully extracted data into Excel workbook (${totalPages} pages)`
      };
    } catch (err) {
      if (pdf) { try { await pdf.destroy?.(); } catch (_) {} }
      if (loadingTask) { try { await loadingTask.destroy?.(); } catch (_) {} }
      throw err;
    }
  }
};
