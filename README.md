# Insight Tools 🚀
> An ultra-fast, privacy-first, all-in-one PDF & Document Suite inspired by iLovePDF. Ready for zero-config deployment on **Render**.

![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![Express](https://img.shields.io/badge/Express-4.19+-blue.svg)
![Render](https://img.shields.io/badge/Render-Cloud_Ready-success.svg)
![Privacy](https://img.shields.io/badge/Privacy-100%25_Client_Side-purple.svg)
![License](https://img.shields.io/badge/License-MIT-amber.svg)

---

## ✨ Features & Included Tools

Insight Tools provides 13 essential tools organized into intuitive categories:

### 📂 1. Organize PDF
- **Merge PDF**: Combine multiple PDF files into one in custom order with drag-and-drop.
- **Split PDF**: Extract page ranges (e.g. `1, 3-5`), odd/even pages, or extract every single page into separate files packaged in a `.zip`.
- **Organize PDF**: Interactive visual page grid — drag to reorder pages, rotate individual pages 90°, or remove pages.
- **Rotate PDF**: Rotate all or selected pages by 90°, 180°, or 270°.

### 🔄 2. Convert PDF
- **PDF to JPG / PNG**: Export PDF pages to crisp high-res images (150/200/300 DPI) and download individually or as a `.zip`.
- **Images to PDF**: Convert JPG, PNG, and WebP images into a single PDF with custom page orientation, sizes (Fit, A4, US Letter), and margins.
- **PDF to Text**: Extract selectable text content from PDF pages with one-click copy to clipboard and `.txt` file export.

### 🔒 3. Security & Sign
- **Protect PDF**: Secure documents with strong AES encryption and custom passwords.
- **Unlock PDF**: Remove password protection and permissions restrictions from protected PDFs.
- **Sign PDF**: Draw signatures with a smooth canvas pad, pick pen color, customize stamp size, and place on any page.

### ⚙️ 4. Optimize & Edit
- **Compress PDF**: Optimize and reduce document size while preserving crisp text and visual clarity.
- **Watermark PDF**: Add custom text watermarks with 9-point anchor positioning, angle rotation, opacity, and color palette.
- **Page Numbers**: Add headers and footers with custom formats (`Page X of Y`, `{n}`), starting offset, and position selection.

---

## 🔒 100% Privacy-First Architecture

Insight Tools uses a **hybrid client-side architecture**:
- PDF manipulation, page rendering, image compilation, and cryptographic operations run **directly inside the user's browser** via `pdf-lib`, `pdfjs-dist`, and HTML5 Canvas.
- **Documents never leave the user's computer** for standard tools, guaranteeing strict privacy and enterprise compliance.
- Ultra-low server resource consumption — runs smoothly even on Render's **Free Tier** without memory crashes or timeouts.

---

## 🚀 One-Click Deployment to Render

### Option A: Deploy via GitHub (Recommended)
1. Push this repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Insight Tools"
   git remote add origin https://github.com/your-username/insight-tools.git
   git push -u origin main
   ```
2. Log into [Render.com](https://dashboard.render.com/).
3. Click **New +** → **Web Service**.
4. Connect your GitHub repository.
5. Set the following settings (auto-detected via `render.yaml`):
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
6. Click **Create Web Service**. Your app will be live with free SSL in ~1 minute!

### Option B: Deploy via Render Blueprint
Render automatically detects the included `render.yaml` configuration file for zero-config blueprint deployment.

---

## 💻 Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the local server**:
   ```bash
   npm start
   ```
   Or for auto-reloading development:
   ```bash
   npm run dev
   ```

3. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## 📂 Project Structure

```
insight-tools/
├── package.json           # Dependencies and scripts (start, dev)
├── render.yaml            # Render deployment blueprint
├── server.js              # Express production server & health checks
├── .gitignore             # Git ignore rules
├── README.md              # Project documentation & deployment guide
└── public/
    ├── index.html         # Main app layout, hero section, tool modals
    ├── css/
    │   ├── style.css      # Core theme, HSL tokens, dark/light mode
    │   └── components.css # Dropzones, page previews, option sidebars
    └── js/
        ├── app.js         # Router, tool manager, drag-and-drop, toasts
        ├── pdf-engine.js  # Wrapper for pdf-lib, pdfjs, and zip utilities
        └── tools/         # 13 dedicated tool modules:
            ├── merge.js
            ├── split.js
            ├── organize.js
            ├── compress.js
            ├── pdf-to-img.js
            ├── img-to-pdf.js
            ├── rotate.js
            ├── watermark.js
            ├── page-number.js
            ├── protect.js
            ├── unlock.js
            ├── sign.js
            └── extract-text.js
```

---

## 📄 License
MIT License. Free for personal and commercial use.
