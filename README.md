# IndicDocAI — Multilingual Document Layout & Structured OCR Engine

![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)
![ONNX Runtime](https://img.shields.io/badge/ONNX_Runtime-1.20-005CED?style=flat-square&logo=onnx&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)

**IndicDocAI** is an end-to-end **Document AI and Computer Vision pipeline** that converts complex, multi-column scanned documents—such as Indian regional newspapers, academic question papers, and government forms in **Bengali, Hindi, and English**—into reading-order-preserving **Markdown** and **structured JSON**.

---

## Why IndicDocAI?

Standard full-page OCR tools fail on real-world multi-column Indian documents because they read straight across column gutters, merge advertisements or captions into body paragraphs, and offer no way to verify uncertain script recognition.

IndicDocAI solves this with a four-stage pipeline:
1. **Physical Layout Segmentation:** Separates titles, body paragraphs, tables, figures, lists, and advertisements before running OCR.
2. **Reading-Order Restoration:** Uses an **Augmented Recursive XY-Cut** projection algorithm to restore natural human reading order across multi-column pages.
3. **Crop-Level Multilingual OCR:** Runs script-aware recognition (`bn`, `hi`, `en`) per segmented region with confidence scoring.
4. **Human-in-the-Loop (HITL) Studio:** Highlights low-confidence OCR blocks (`< 80%` by default) in an interactive React + TypeScript verification workspace.

---

## System Architecture

```text
┌───────────────────────────┐
│   Scanned Document Page   │  (PNG / JPG / WEBP)
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│  Layout Detection Engine  │  DocLayout-YOLO / YOLOv8 (ONNX Runtime)
│  (9 Physical Classes)     │  + OpenCV Morphological Fallback
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│  Augmented XY-Cut Sorter  │  Recursive 1D Projection-Profile Splitting
│                           │  (Spanning Banners → Columns → Rows)
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│  Multilingual Crop OCR    │  EasyOCR (Bengali / Hindi / English)
│                           │  Per-Block Confidence Scoring
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│  React + TS HITL Studio   │  Interactive SVG Bounding-Box Overlay,
│                           │  Confidence Filtering, .MD & .JSON Export
└───────────────────────────┘
```

---

## Key Features

- **Custom Layout Fine-Tuning (`ml/train_layout.py`):** Downloads and converts AI4Bharat's [`ai4bharat/indicdlp`](https://huggingface.co/datasets/ai4bharat/indicdlp) dataset into YOLO format across 9 classes: `Title`, `Text`, `Table`, `Figure`, `Caption`, `List`, `Header`, `Footer`, and `Advertisement`.
- **ONNX Runtime Export & Latency Benchmarking (`ml/export_onnx.py`):** Exports PyTorch `.pt` weights to simplified ONNX (`opset=17`, `1024×1024`) and benchmarks inference speed (`ms/page`).
- **Zero-Weight Morphological Fallback (`backend/app/detector.py`):** Automatically falls back to adaptive thresholding and anisotropic morphological dilation when custom `.onnx` weights are not yet mounted.
- **Augmented Recursive XY-Cut (`backend/app/xy_cut.py`):** Detects horizontal projection valleys for full-width headlines first, splits column gutters left-to-right, and orders blocks top-to-bottom within each column.
- **CER & WER Evaluation Suite (`ml/benchmark_cer.py`):** Measures Character Error Rate (CER) and Word Error Rate (WER) reductions between raw full-page OCR and layout-segmented XY-Cut OCR using `jiwer`.
- **Interactive Verification Studio (`frontend/src/App.tsx`):**
  - Color-coded SVG bounding-box overlay with reading-order badges (`#1`, `#2`, ...).
  - Live confidence threshold slider (`50%–98%`) flagging uncertain OCR blocks with dashed amber borders.
  - Inline text editor synchronized with a live Markdown viewer and one-click `.md` / `.json` export.
  - Built-in **Load Demo Sample** mode with a Bengali multi-column newspaper sample for instant frontend previews on Vercel.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Computer Vision & ML** | PyTorch, Ultralytics YOLOv8, Hugging Face `datasets` (`IndicDLP`), ONNX Runtime, OpenCV, `jiwer` |
| **Multilingual OCR** | EasyOCR (`bn`, `hi`, `en`) |
| **Backend & Deployment** | FastAPI, Uvicorn, Pydantic v2, Docker |
| **Frontend Studio** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Vercel |

---

## Project Structure

```text
indic-doc-layout-ocr/
├── .gitignore
├── README.md
├── push_to_github.ps1              # PowerShell helper script for Git initialization & push
├── ml/
│   ├── train_layout.py             # IndicDLP dataset prep & YOLOv8 fine-tuning
│   ├── export_onnx.py              # PyTorch-to-ONNX export & ms/page latency benchmark
│   └── benchmark_cer.py            # CER / WER comparison (Raw vs. Layout + XY-Cut)
├── backend/
│   ├── Dockerfile                  # Production container image for FastAPI service
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── main.py                 # FastAPI routes (/health, /api/v1/analyze) & Markdown builder
│       ├── detector.py             # ONNX layout detector + OpenCV morphological fallback
│       ├── xy_cut.py               # Augmented recursive XY-Cut reading-order algorithm
│       └── ocr_engine.py           # Script-aware crop OCR with confidence aggregation
└── frontend/
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── vercel.json                 # SPA routing configuration for Vercel
    └── src/
        ├── main.tsx
        ├── index.css
        ├── types/
        │   └── document.ts         # TypeScript interfaces for blocks & analysis payloads
        └── App.tsx                 # Interactive bounding-box studio & HITL editor
```

---

## Quick Start

### 1. Start the FastAPI Backend

```powershell
cd backend
python -m venv .venv

# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Linux / macOS:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Interactive API documentation runs at `http://localhost:8000/docs`.

### 2. Start the React + TypeScript Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser and upload a scanned document image or click **Load Demo Sample**.

### 3. Run Backend with Docker (Optional)

```bash
cd backend
docker build -t indic-doc-ai-api .
docker run -p 8000:8000 indic-doc-ai-api
```

---

## Model Training, ONNX Export & Benchmarking

```bash
pip install ultralytics datasets onnxruntime jiwer pyyaml

# 1. Fine-tune layout detector on IndicDLP
python ml/train_layout.py --base-model yolov8m.pt --max-samples 2000 --epochs 30 --imgsz 1024 --batch 8

# 2. Export to ONNX & benchmark inference latency (ms/page)
python ml/export_onnx.py --weights runs/detect/indicdlp_layout/weights/best.pt --imgsz 1024 --dest backend/models/doclayout_indic.onnx

# 3. Compare Character Error Rate (CER) & Word Error Rate (WER)
python ml/benchmark_cer.py --ground-truth data/gt.txt --raw-ocr data/raw.txt --layout-ocr data/structured.txt
```

---

## API Reference

### `GET /health`
```json
{
  "status": "ok",
  "detector_backend": "onnx-doclayout-yolo",
  "ocr_languages": ["bn", "en"]
}
```

### `POST /api/v1/analyze`
Accepts `multipart/form-data` with an image `file` (`image/png`, `image/jpeg`, `image/webp`) and returns reading-order-sorted layout blocks alongside compiled Markdown.

```json
{
  "filename": "newspaper_clipping.png",
  "image_width": 1000,
  "image_height": 1200,
  "detector_backend": "onnx-doclayout-yolo",
  "latency_ms": 142.8,
  "average_ocr_confidence": 0.874,
  "blocks": [
    {
      "id": "a1b2c3d4",
      "reading_order": 1,
      "label": "Title",
      "bbox": [60, 50, 940, 155],
      "layout_confidence": 0.96,
      "ocr_confidence": 0.94,
      "text": "কলকাতায় কৃত্রিম বুদ্ধিমত্তা ও আঞ্চলিক ভাষা গবেষণায় নতুন দিগন্ত"
    }
  ],
  "markdown": "## কলকাতায় কৃত্রিম বুদ্ধিমত্তা ও আঞ্চলিক ভাষা গবেষণায় নতুন দিগন্ত"
}
```

---

## Author

**Siddhinath Chakraborty**  
B.Tech in Computer Science & Engineering (AI & ML) — RCC Institute of Information Technology, Kolkata  
GitHub: [@siddhi7921](https://github.com/siddhi7921)
