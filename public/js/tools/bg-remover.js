/**
 * Tool: Background Remover (AI/Canvas Edge & Alpha Segmentation)
 * 100% Client-side image background removal
 */
window.Tools = window.Tools || {};

window.Tools.bgRemover = {
  id: 'bg-remover',
  title: 'Remove Background',
  description: 'Instantly remove backgrounds from photos and logos. Download crisp, transparent PNGs 100% free.',
  accept: '.jpg,.jpeg,.png,.webp',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Background Replacement</label>
        <div class="option-cards-group">
          <label class="option-card-radio active">
            <input type="radio" name="bgReplaceMode" value="transparent" checked>
            <div>
              <div class="radio-text-title">Transparent (PNG)</div>
              <div class="radio-text-desc">Download cutout with no background</div>
            </div>
          </label>
          <label class="option-card-radio">
            <input type="radio" name="bgReplaceMode" value="white">
            <div>
              <div class="radio-text-title">Clean White</div>
              <div class="radio-text-desc">Replace with solid studio white</div>
            </div>
          </label>
          <label class="option-card-radio">
            <input type="radio" name="bgReplaceMode" value="custom">
            <div>
              <div class="radio-text-title">Custom Solid Color</div>
              <div class="radio-text-desc">Pick custom backdrop color</div>
            </div>
          </label>
        </div>
      </div>

      <div class="form-group" id="customColorGroup" style="display: none;">
        <label class="form-label">Select Backdrop Color</label>
        <input type="color" id="bgCustomColorPicker" class="form-control" value="#6366f1" style="height: 42px; padding: 4px; cursor: pointer;">
      </div>

      <div class="form-group">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
          <label class="form-label" style="margin-bottom: 0;">Edge Sensitivity / Tolerance</label>
          <span id="bgToleranceVal" style="font-size: 0.8rem; font-weight: 700; color: var(--primary);">32%</span>
        </div>
        <input type="range" id="bgToleranceSlider" min="5" max="80" value="32">
        <small style="color: var(--text-muted); font-size: 0.76rem;">Increase for solid backgrounds, decrease for complex photos</small>
      </div>

      <div class="form-group">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
          <label class="form-label" style="margin-bottom: 0;">Edge Smoothing (Feathering)</label>
          <span id="bgFeatherVal" style="font-size: 0.8rem; font-weight: 700; color: var(--primary);">2 px</span>
        </div>
        <input type="range" id="bgFeatherSlider" min="0" max="10" value="2">
      </div>

      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="bgRemoverFilename" class="form-control" value="removed_background.png">
      </div>
    `;

    // Toggle custom color picker
    const radios = container.querySelectorAll('input[name="bgReplaceMode"]');
    radios.forEach(r => {
      r.addEventListener('change', (e) => {
        container.querySelectorAll('.option-card-radio').forEach(c => c.classList.remove('active'));
        e.target.closest('.option-card-radio').classList.add('active');
        const colorGrp = document.getElementById('customColorGroup');
        if (e.target.value === 'custom') {
          colorGrp.style.display = 'block';
        } else {
          colorGrp.style.display = 'none';
        }
      });
    });

    // Range slider live feedback
    const tolSlider = document.getElementById('bgToleranceSlider');
    const tolVal = document.getElementById('bgToleranceVal');
    tolSlider?.addEventListener('input', (e) => tolVal.textContent = `${e.target.value}%`);

    const ftrSlider = document.getElementById('bgFeatherSlider');
    const ftrVal = document.getElementById('bgFeatherVal');
    ftrSlider?.addEventListener('input', (e) => ftrVal.textContent = `${e.target.value} px`);
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select an image to remove background.');
    }

    const file = files[0];
    app.updateProgress(15, 'Loading image into canvas engine...');

    const dataUrl = await PDFEngine.readFileAsDataURL(file);
    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    app.updateProgress(35, 'Analyzing color channels & sample edges...');

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;
    const width = canvas.width;
    const height = canvas.height;

    // Sample the corner colors (top-left, top-right, bottom-left, bottom-right) to determine key background color
    const samplePoints = [
      0, // Top-Left
      (width - 1) * 4, // Top-Right
      ((height - 1) * width) * 4, // Bottom-Left
      ((height - 1) * width + (width - 1)) * 4 // Bottom-Right
    ];

    let bgR = 0, bgG = 0, bgB = 0;
    samplePoints.forEach(idx => {
      bgR += pixels[idx];
      bgG += pixels[idx + 1];
      bgB += pixels[idx + 2];
    });
    bgR = Math.round(bgR / samplePoints.length);
    bgG = Math.round(bgG / samplePoints.length);
    bgB = Math.round(bgB / samplePoints.length);

    const tolerancePercent = parseInt(document.getElementById('bgToleranceSlider')?.value || '32', 10);
    // Euclidean distance threshold in RGB space (max dist ~441)
    const threshold = (tolerancePercent / 100) * 220;
    const feather = parseInt(document.getElementById('bgFeatherSlider')?.value || '2', 10);

    app.updateProgress(60, 'Applying intelligent alpha transparency mask...');

    const mode = document.querySelector('input[name="bgReplaceMode"]:checked')?.value || 'transparent';
    let replaceR = 255, replaceG = 255, replaceB = 255;
    if (mode === 'custom') {
      const hex = document.getElementById('bgCustomColorPicker')?.value || '#ffffff';
      const num = parseInt(hex.replace('#', ''), 16);
      replaceR = (num >> 16) & 255;
      replaceG = (num >> 8) & 255;
      replaceB = num & 255;
    }

    const totalPixels = width * height;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      // Calculate Euclidean color distance from background key
      const dist = Math.sqrt(
        (r - bgR) * (r - bgR) +
        (g - bgG) * (g - bgG) +
        (b - bgB) * (b - bgB)
      );

      if (dist < threshold) {
        if (mode === 'transparent') {
          // Feather alpha edge
          if (feather > 0 && dist > threshold - (feather * 5)) {
            const alphaFactor = (dist - (threshold - (feather * 5))) / (feather * 5);
            pixels[i + 3] = Math.round(pixels[i + 3] * alphaFactor);
          } else {
            pixels[i + 3] = 0; // Transparent
          }
        } else {
          // Replace with target color
          pixels[i] = replaceR;
          pixels[i + 1] = replaceG;
          pixels[i + 2] = replaceB;
          pixels[i + 3] = 255;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    app.updateProgress(90, 'Rendering final transparent cutout...');
    const resultBlob = await new Promise(r => canvas.toBlob(r, 'image/png'));

    let outName = document.getElementById('bgRemoverFilename')?.value?.trim() || `${file.name.replace(/\.[^/.]+$/, "")}_nobg.png`;
    if (!outName.toLowerCase().endsWith('.png')) outName += '.png';

    app.updateProgress(100, 'Done!');
    return {
      data: resultBlob,
      filename: outName,
      mimeType: 'image/png',
      summary: `Successfully removed background (${width}x${height}px PNG)`
    };
  }
};
