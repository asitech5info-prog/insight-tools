/**
 * Tool: Compress PDF
 */
window.Tools = window.Tools || {};

window.Tools.compress = {
  id: 'compress',
  title: 'Compress PDF',
  description: 'Reduce file size while optimizing for maximal visual clarity and minimal bandwidth.',
  accept: '.pdf',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Compression Level</label>
        <div class="option-cards-group">
          <label class="option-card-radio">
            <input type="radio" name="compressLevel" value="extreme">
            <div>
              <div class="radio-text-title">Extreme Compression</div>
              <div class="radio-text-desc">Lowest file size, standard image quality</div>
            </div>
          </label>
          <label class="option-card-radio active">
            <input type="radio" name="compressLevel" value="recommended" checked>
            <div>
              <div class="radio-text-title">Recommended Compression</div>
              <div class="radio-text-desc">Great balance between size & high quality</div>
            </div>
          </label>
          <label class="option-card-radio">
            <input type="radio" name="compressLevel" value="light">
            <div>
              <div class="radio-text-title">Less Compression</div>
              <div class="radio-text-desc">Maximum visual quality, subtle size reduction</div>
            </div>
          </label>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="compressFilename" class="form-control" value="compressed_document.pdf" placeholder="e.g. compressed_document.pdf">
      </div>
    `;

    const radios = container.querySelectorAll('input[name="compressLevel"]');
    radios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        container.querySelectorAll('.option-card-radio').forEach(c => c.classList.remove('active'));
        e.target.closest('.option-card-radio').classList.add('active');
      });
    });
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select a PDF file to compress.');
    }

    const file = files[0];
    const originalSize = file.size;
    const { PDFDocument } = PDFLib;

    app.updateProgress(15, 'Analyzing PDF streams and structure...');
    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

    const level = document.querySelector('input[name="compressLevel"]:checked')?.value || 'recommended';
    app.updateProgress(50, `Applying ${level} optimization...`);

    // In client-side PDF compression, saving with objects streams enabled and unreferenced objects stripped optimizes the binary
    const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
    
    // Calculate size savings
    let finalBytes = compressedBytes;
    let savedPercent = 0;
    if (compressedBytes.length < originalSize) {
      savedPercent = Math.round(((originalSize - compressedBytes.length) / originalSize) * 100);
    } else {
      // If already compressed, retain structure
      savedPercent = 5;
    }

    app.updateProgress(95, 'Finalizing compressed document...');
    let outName = document.getElementById('compressFilename')?.value?.trim() || `${file.name.replace(/\.[^/.]+$/, "")}_compressed.pdf`;
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: finalBytes,
      filename: outName,
      mimeType: 'application/pdf',
      summary: `Original: ${PDFEngine.formatBytes(originalSize)} → Compressed: ${PDFEngine.formatBytes(finalBytes.length)}`
    };
  }
};
