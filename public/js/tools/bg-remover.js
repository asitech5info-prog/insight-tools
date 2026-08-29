/**
 * Tool: Background Remover
 * 100% Client-side Smart Edge & Alpha Transparency Segmentation
 */
window.Tools = window.Tools || {};

window.Tools.bgRemover = {
  id: 'bg-remover',
  title: 'Remove Background',
  description: 'Instantly remove backgrounds from photos, products, and logos. Download crisp, transparent PNGs 100% free.',
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
              <div class="radio-text-desc">Download cutout with transparent background</div>
            </div>
          </label>
          <label class="option-card-radio">
            <input type="radio" name="bgReplaceMode" value="white">
            <div>
              <div class="radio-text-title">Studio White</div>
              <div class="radio-text-desc">Replace background with solid clean white</div>
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
        <label class="form-label">Detection Algorithm</label>
        <select id="bgAlgorithmMode" class="form-control">
          <option value="smart-flood" selected>Smart Edge Detection (Outer Background - Best for Photos)</option>
          <option value="chroma-global">Global Color Key (Best for Logos, Graphics & Solid Backdrops)</option>
        </select>
      </div>

      <div class="form-group">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
          <label class="form-label" style="margin-bottom: 0;">Edge Sensitivity / Tolerance</label>
          <span id="bgToleranceVal" style="font-size: 0.8rem; font-weight: 700; color: var(--primary);">30%</span>
        </div>
        <input type="range" id="bgToleranceSlider" min="5" max="85" value="30">
        <small style="color: var(--text-muted); font-size: 0.76rem;">Increase for solid backdrops, decrease for fine details</small>
      </div>

      <div class="form-group">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
          <label class="form-label" style="margin-bottom: 0;">Edge Smoothing (Feathering)</label>
          <span id="bgFeatherVal" style="font-size: 0.8rem; font-weight: 700; color: var(--primary);">2 px</span>
        </div>
        <input type="range" id="bgFeatherSlider" min="0" max="8" value="2">
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
        if (colorGrp) {
          colorGrp.style.display = e.target.value === 'custom' ? 'block' : 'none';
        }
      });
    });

    // Live feedback sliders
    const tolSlider = document.getElementById('bgToleranceSlider');
    const tolVal = document.getElementById('bgToleranceVal');
    tolSlider?.addEventListener('input', (e) => {
      if (tolVal) tolVal.textContent = `${e.target.value}%`;
    });

    const ftrSlider = document.getElementById('bgFeatherSlider');
    const ftrVal = document.getElementById('bgFeatherVal');
    ftrSlider?.addEventListener('input', (e) => {
      if (ftrVal) ftrVal.textContent = `${e.target.value} px`;
    });
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select an image file to remove background.');
    }

    const file = files[0];
    app.updateProgress(15, 'Loading image into processing engine...');

    const dataUrl = await PDFEngine.readFileAsDataURL(file);
    const img = new Image();
    img.src = dataUrl;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Failed to decode the selected image file.'));
    });

    app.updateProgress(35, 'Analyzing image channels & perimeter pixels...');

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Sample border pixels across all four edges (top, bottom, left, right)
    let sampleR = 0, sampleG = 0, sampleB = 0, sampleCount = 0;
    const stepX = Math.max(1, Math.floor(width / 40));
    const stepY = Math.max(1, Math.floor(height / 40));

    // Top & Bottom edges
    for (let x = 0; x < width; x += stepX) {
      const topIdx = x * 4;
      const btmIdx = ((height - 1) * width + x) * 4;
      sampleR += data[topIdx] + data[btmIdx];
      sampleG += data[topIdx + 1] + data[btmIdx + 1];
      sampleB += data[topIdx + 2] + data[btmIdx + 2];
      sampleCount += 2;
    }

    // Left & Right edges
    for (let y = 0; y < height; y += stepY) {
      const lftIdx = (y * width) * 4;
      const rgtIdx = (y * width + (width - 1)) * 4;
      sampleR += data[lftIdx] + data[rgtIdx];
      sampleG += data[lftIdx + 1] + data[rgtIdx + 1];
      sampleB += data[lftIdx + 2] + data[rgtIdx + 2];
      sampleCount += 2;
    }

    const bgR = sampleCount > 0 ? Math.round(sampleR / sampleCount) : 255;
    const bgG = sampleCount > 0 ? Math.round(sampleG / sampleCount) : 255;
    const bgB = sampleCount > 0 ? Math.round(sampleB / sampleCount) : 255;

    const tolerancePercent = parseInt(document.getElementById('bgToleranceSlider')?.value || '30', 10);
    // Threshold in Euclidean distance (max dist in RGB is sqrt(255^2*3) ~= 441.67)
    const threshold = (tolerancePercent / 100) * 220;
    const feather = parseInt(document.getElementById('bgFeatherSlider')?.value || '2', 10);
    const algorithm = document.getElementById('bgAlgorithmMode')?.value || 'smart-flood';
    const replaceMode = document.querySelector('input[name="bgReplaceMode"]:checked')?.value || 'transparent';

    let repR = 255, repG = 255, repB = 255;
    if (replaceMode === 'custom') {
      const hex = document.getElementById('bgCustomColorPicker')?.value || '#ffffff';
      const cleanHex = hex.replace('#', '');
      const num = parseInt(cleanHex, 16);
      repR = (num >> 16) & 255;
      repG = (num >> 8) & 255;
      repB = num & 255;
    }

    app.updateProgress(55, 'Segmenting foreground & removing background...');

    const totalPixels = width * height;
    const isBg = new Uint8Array(totalPixels);

    // Compute color match
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const dist = Math.sqrt(
        (r - bgR) * (r - bgR) +
        (g - bgG) * (g - bgG) +
        (b - bgB) * (b - bgB)
      );

      if (dist <= threshold) {
        isBg[i] = 1;
      }
    }

    // If Smart Flood Fill: only clear background pixels connected to the outer border
    if (algorithm === 'smart-flood') {
      const connectedBg = new Uint8Array(totalPixels);
      const queue = new Int32Array(totalPixels);
      let head = 0;
      let tail = 0;

      // Seed all perimeter pixels that matched background color
      for (let x = 0; x < width; x++) {
        const top = x;
        const btm = (height - 1) * width + x;
        if (isBg[top] && !connectedBg[top]) {
          connectedBg[top] = 1;
          queue[tail++] = top;
        }
        if (isBg[btm] && !connectedBg[btm]) {
          connectedBg[btm] = 1;
          queue[tail++] = btm;
        }
      }

      for (let y = 0; y < height; y++) {
        const lft = y * width;
        const rgt = y * width + (width - 1);
        if (isBg[lft] && !connectedBg[lft]) {
          connectedBg[lft] = 1;
          queue[tail++] = lft;
        }
        if (isBg[rgt] && !connectedBg[rgt]) {
          connectedBg[rgt] = 1;
          queue[tail++] = rgt;
        }
      }

      // BFS flood fill
      while (head < tail) {
        const curr = queue[head++];
        const cx = curr % width;
        const cy = Math.floor(curr / width);

        // 4 neighbors (left, right, up, down)
        const neighbors = [];
        if (cx > 0) neighbors.push(curr - 1);
        if (cx < width - 1) neighbors.push(curr + 1);
        if (cy > 0) neighbors.push(curr - width);
        if (cy < height - 1) neighbors.push(curr + width);

        for (let n = 0; n < neighbors.length; n++) {
          const nIdx = neighbors[n];
          if (isBg[nIdx] && !connectedBg[nIdx]) {
            connectedBg[nIdx] = 1;
            queue[tail++] = nIdx;
          }
        }
      }

      // Apply connected background mask
      for (let i = 0; i < totalPixels; i++) {
        if (connectedBg[i]) {
          const idx = i * 4;
          if (replaceMode === 'transparent') {
            data[idx + 3] = 0;
          } else {
            data[idx] = repR;
            data[idx + 1] = repG;
            data[idx + 2] = repB;
            data[idx + 3] = 255;
          }
        }
      }
    } else {
      // Global Chroma Key mode
      for (let i = 0; i < totalPixels; i++) {
        if (isBg[i]) {
          const idx = i * 4;
          if (replaceMode === 'transparent') {
            data[idx + 3] = 0;
          } else {
            data[idx] = repR;
            data[idx + 1] = repG;
            data[idx + 2] = repB;
            data[idx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    app.updateProgress(85, 'Finalizing transparent alpha cutout...');

    const resultBlob = await new Promise((res, rej) => {
      canvas.toBlob((blob) => {
        if (blob) res(blob);
        else rej(new Error('Failed to encode transparent PNG'));
      }, 'image/png');
    });

    // Proactively clean up canvas memory
    PDFEngine.releaseCanvas(canvas);

    let outName = document.getElementById('bgRemoverFilename')?.value?.trim() || `${file.name.replace(/\.[^/.]+$/, '')}_nobg.png`;
    if (!outName.toLowerCase().endsWith('.png')) outName += '.png';

    app.updateProgress(100, 'Done!');
    return {
      data: resultBlob,
      filename: outName,
      mimeType: 'image/png',
      summary: `Successfully removed background (${width} x ${height}px PNG)`
    };
  }
};
