import { useState, useMemo } from 'react';
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Download,
  Cpu,
  Layers,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { AnalysisResponse, DocumentBlock } from './types/document';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const LABEL_COLORS: Record<string, string> = {
  Title: '#38bdf8',
  Header: '#38bdf8',
  Text: '#34d399',
  Table: '#a78bfa',
  Figure: '#f472b6',
  Caption: '#fbbf24',
  List: '#2dd4bf',
  Advertisement: '#fb7185',
};

const DEMO_SAMPLE_DATA: AnalysisResponse = {
  filename: 'kolkata_regional_frontpage_sample.png',
  image_width: 1000,
  image_height: 1200,
  detector_backend: 'onnx-doclayout-yolo (demo-preview)',
  latency_ms: 142.8,
  average_ocr_confidence: 0.874,
  blocks: [
    {
      id: 'blk-01',
      reading_order: 1,
      label: 'Title',
      bbox: [60, 50, 940, 155],
      layout_confidence: 0.96,
      ocr_confidence: 0.94,
      text: 'কলকাতায় কৃত্রিম বুদ্ধিমত্তা ও আঞ্চলিক ভাষা গবেষণায় নতুন দিগন্ত',
    },
    {
      id: 'blk-02',
      reading_order: 2,
      label: 'Text',
      bbox: [60, 185, 480, 620],
      layout_confidence: 0.92,
      ocr_confidence: 0.91,
      text: 'বহু-স্তম্ভ বিশিষ্ট সংবাদপত্র এবং ঐতিহাসিক নথিপত্র ডিজিটাইজেশনের ক্ষেত্রে লেআউট বিশ্লেষণ ও সঠিক পাঠক্রম নির্ধারণ অত্যন্ত গুরুত্বপূর্ণ।',
    },
    {
      id: 'blk-03',
      reading_order: 3,
      label: 'Text',
      bbox: [520, 185, 940, 620],
      layout_confidence: 0.91,
      ocr_confidence: 0.74,
      text: 'অগমেন্টেড এক্সওয়াই-কাট অ্যালগরিদম ব্যবহার করে প্রতিটি অনুচ্ছেদ আলাদাভাবে শনাক্ত করা হলে ওসিআর ত্রুটির হার উল্লেখযোগ্যভাবে হ্রাস পায়।',
    },
    {
      id: 'blk-04',
      reading_order: 4,
      label: 'Table',
      bbox: [60, 660, 940, 1080],
      layout_confidence: 0.89,
      ocr_confidence: 0.88,
      text: 'Benchmark Summary | Raw Full-Page CER: 18.4% | Layout + XY-Cut CER: 4.9% | ONNX Latency: 142.8 ms/page',
    },
  ],
  markdown: '',
};

function generateMarkdown(blocks: DocumentBlock[]): string {
  return blocks
    .filter((b) => b.text.trim().length > 0)
    .map((b) => {
      if (b.label === 'Title' || b.label === 'Header') return `## ${b.text.trim()}`;
      if (b.label === 'Caption') return `*${b.text.trim()}*`;
      if (b.label === 'List') return `- ${b.text.trim()}`;
      if (b.label === 'Table') return `> **[Table]** ${b.text.trim()}`;
      return b.text.trim();
    })
    .join('\n\n');
}

export default function App() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [confThreshold, setConfThreshold] = useState<number>(0.8);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [lastUploaded, setLastUploaded] = useState<{ file: File; url: string } | null>(null);

  const liveMarkdown = useMemo(() => {
    if (!analysis) return '';
    return generateMarkdown(analysis.blocks);
  }, [analysis]);

  const lowConfidenceCount = useMemo(() => {
    if (!analysis) return 0;
    return analysis.blocks.filter((b) => b.ocr_confidence < confThreshold).length;
  }, [analysis, confThreshold]);

  const simulateUploadedDocument = (file: File, previewUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || 1000;
      const h = img.naturalHeight || 1200;
      const simData: AnalysisResponse = {
        filename: file.name,
        image_width: w,
        image_height: h,
        detector_backend: 'onnx-doclayout-yolo (offline preview simulation)',
        latency_ms: 138.4,
        average_ocr_confidence: 0.882,
        blocks: [
          {
            id: 'blk-01',
            reading_order: 1,
            label: 'Title',
            bbox: [
              Math.round(w * 0.06),
              Math.round(h * 0.04),
              Math.round(w * 0.94),
              Math.round(h * 0.14),
            ],
            layout_confidence: 0.97,
            ocr_confidence: 0.95,
            text: file.name.replace(/\.[^/.]+$/, '').toUpperCase() + ' — DOCUMENT LAYOUT ANALYSIS',
          },
          {
            id: 'blk-02',
            reading_order: 2,
            label: 'Text',
            bbox: [
              Math.round(w * 0.06),
              Math.round(h * 0.16),
              Math.round(w * 0.48),
              Math.round(h * 0.58),
            ],
            layout_confidence: 0.93,
            ocr_confidence: 0.91,
            text: 'বহু-স্তম্ভ বিশিষ্ট সংবাদপত্র এবং ঐতিহাসিক নথিপত্র ডিজিটাইজেশনের ক্ষেত্রে লেআউট বিশ্লেষণ ও সঠিক পাঠক্রম নির্ধারণ অত্যন্ত গুরুত্বপূর্ণ।',
          },
          {
            id: 'blk-03',
            reading_order: 3,
            label: 'Text',
            bbox: [
              Math.round(w * 0.52),
              Math.round(h * 0.16),
              Math.round(w * 0.94),
              Math.round(h * 0.58),
            ],
            layout_confidence: 0.91,
            ocr_confidence: 0.73,
            text: 'অগমেন্টেড এক্সওয়াই-কাট অ্যালগরিদম ব্যবহার করে প্রতিটি অনুচ্ছেদ আলাদাভাবে শনাক্ত করা হলে ওসিআর ত্রুটির হার উল্লেখযোগ্যভাবে হ্রাস পায়।',
          },
          {
            id: 'blk-04',
            reading_order: 4,
            label: 'Table',
            bbox: [
              Math.round(w * 0.06),
              Math.round(h * 0.62),
              Math.round(w * 0.94),
              Math.round(h * 0.92),
            ],
            layout_confidence: 0.9,
            ocr_confidence: 0.89,
            text: 'Benchmark Summary | Raw Full-Page CER: 18.4% | Layout + XY-Cut CER: 4.9% | ONNX Latency: 142.8 ms/page',
          },
        ],
        markdown: '',
      };
      setAnalysis(simData);
      setSelectedBlockId('blk-03');
    };
    img.src = previewUrl;
  };

  const handleFileUpload = async (file: File) => {
    setErrorMsg(null);
    setLoading(true);
    setSelectedBlockId(null);

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setLastUploaded({ file, url: previewUrl });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/api/v1/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Inference failed' }));
        throw new Error(err.detail || 'Server error');
      }

      const data: AnalysisResponse = await response.json();
      setAnalysis(data);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? `${err.message} (FastAPI backend is offline at ${API_BASE}. You can click "Preview on Uploaded Image" or "Load Demo Sample")`
          : 'Failed to reach backend.'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadDemoSample = () => {
    setErrorMsg(null);
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 1000, 1200);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(60, 50, 880, 105);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(60, 185, 420, 435);
      ctx.fillRect(520, 185, 420, 435);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(60, 660, 880, 420);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('SAMPLE MULTI-COLUMN DOCUMENT LAYOUT PREVIEW', 120, 112);
      setImagePreview(canvas.toDataURL('image/png'));
    }
    setAnalysis(DEMO_SAMPLE_DATA);
    setSelectedBlockId('blk-03');
  };

  const updateBlockText = (blockId: string, newText: string) => {
    if (!analysis) return;
    setAnalysis({
      ...analysis,
      blocks: analysis.blocks.map((b) => (b.id === blockId ? { ...b, text: newText } : b)),
    });
  };

  const copyMarkdown = () => {
    navigator.clipboard.writeText(liveMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                IndicDocAI <span className="text-sky-400">Layout & OCR Studio</span>
              </h1>
              <p className="text-xs text-slate-400">
                DocLayout-YOLO (ONNX) • Augmented XY-Cut Reading Order • Multilingual Crop OCR
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadDemoSample}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              Load Demo Sample
            </button>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 hover:bg-sky-500 cursor-pointer transition">
              <Upload className="w-4 h-4" />
              Upload Document
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {errorMsg && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {lastUploaded && (
                <button
                  onClick={() => {
                    setErrorMsg(null);
                    simulateUploadedDocument(lastUploaded.file, lastUploaded.url);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white transition"
                >
                  Preview on Uploaded Image
                </button>
              )}
              <button
                onClick={loadDemoSample}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium transition"
              >
                Load Demo Sample
              </button>
            </div>
          </div>
        )}

        {analysis && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-sky-400" /> Inference Latency
              </div>
              <div className="text-xl font-semibold mt-1">{analysis.latency_ms} ms</div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                {analysis.detector_backend}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Mean OCR Confidence
              </div>
              <div className="text-xl font-semibold mt-1">
                {(analysis.average_ocr_confidence * 100).toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {analysis.blocks.length} XY-Cut ordered regions
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Flagged Low-Confidence
              </div>
              <div className="text-xl font-semibold mt-1 text-amber-400">
                {lowConfidenceCount} block{lowConfidenceCount === 1 ? '' : 's'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Below {(confThreshold * 100).toFixed(0)}% threshold
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">HITL Alert Threshold</span>
                <span className="font-mono text-amber-400">{(confThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={0.98}
                step={0.02}
                value={confThreshold}
                onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                className="w-full accent-amber-400 mt-2"
              />
              <div className="text-[11px] text-slate-500 mt-1">
                Highlights uncertain OCR crops in amber
              </div>
            </div>
          </div>
        )}

        {!analysis && !loading ? (
          <div className="border-2 border-dashed border-slate-800 rounded-2xl p-16 text-center space-y-4 bg-slate-900/30">
            <FileText className="w-12 h-12 text-slate-500 mx-auto" />
            <h2 className="text-lg font-medium">Upload a Scanned Page or Newspaper Clipping</h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto">
              Detects physical layout regions, sorts multi-column text using Augmented XY-Cut, and
              extracts Bengali/English text with confidence-guided verification.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={loadDemoSample}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium"
              >
                Preview with Sample Document
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="rounded-2xl p-20 text-center bg-slate-900/50 border border-slate-800">
            <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-300">
              Running layout detection, XY-Cut sorting, and script-aware OCR...
            </p>
          </div>
        ) : (
          analysis && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Layout Overlay & Reading Order
                  </span>
                  <span className="text-xs text-slate-500">Click any box to inspect/edit</span>
                </div>

                {imagePreview && (
                  <div className="relative w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                    <img
                      src={imagePreview}
                      alt="Uploaded document"
                      className="w-full h-auto block select-none"
                    />
                    <svg
                      viewBox={`0 0 ${analysis.image_width} ${analysis.image_height}`}
                      className="absolute inset-0 w-full h-full"
                    >
                      {analysis.blocks.map((block) => {
                        const [x1, y1, x2, y2] = block.bbox;
                        const isLowConf = block.ocr_confidence < confThreshold;
                        const isSelected = block.id === selectedBlockId;
                        const strokeColor = isLowConf
                          ? '#f59e0b'
                          : LABEL_COLORS[block.label] || '#38bdf8';
                        const badgeX = Math.min(x1, Math.max(0, analysis.image_width - 160));
                        const badgeY = Math.max(0, y1 - 28);
                        const textY = Math.max(20, y1 - 8);

                        return (
                          <g
                            key={block.id}
                            onClick={() => setSelectedBlockId(block.id)}
                            className="cursor-pointer"
                          >
                            <rect
                              x={x1}
                              y={y1}
                              width={x2 - x1}
                              height={y2 - y1}
                              fill={strokeColor}
                              fillOpacity={isSelected ? 0.25 : 0.1}
                              stroke={strokeColor}
                              strokeWidth={isSelected ? 5 : 3}
                              strokeDasharray={isLowConf ? '10 6' : undefined}
                            />
                            <rect
                              x={badgeX}
                              y={badgeY}
                              width={155}
                              height={28}
                              fill={strokeColor}
                              rx={4}
                            />
                            <text
                              x={badgeX + 8}
                              y={textY}
                              fill="#090d16"
                              fontSize="16"
                              fontWeight="bold"
                            >
                              #{block.reading_order} {block.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                )}
              </div>

              <div className="lg:col-span-6 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 max-h-[420px] overflow-y-auto">
                  <div className="flex items-center justify-between sticky top-0 bg-slate-900 pb-2 border-b border-slate-800">
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Human-in-the-Loop Block Editor
                    </span>
                    <span className="text-xs text-slate-500">Sorted by XY-Cut</span>
                  </div>

                  {analysis.blocks.map((block) => {
                    const isLowConf = block.ocr_confidence < confThreshold;
                    const isSelected = block.id === selectedBlockId;
                    return (
                      <div
                        key={block.id}
                        onClick={() => setSelectedBlockId(block.id)}
                        className={`p-3 rounded-xl border transition ${
                          isSelected
                            ? 'border-sky-500 bg-slate-800/80'
                            : isLowConf
                            ? 'border-amber-500/50 bg-amber-950/20'
                            : 'border-slate-800 bg-slate-950/60'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-sky-400">
                              #{block.reading_order}
                            </span>
                            <span className="font-semibold">{block.label}</span>
                          </div>
                          <span
                            className={`font-mono ${
                              isLowConf ? 'text-amber-400 font-semibold' : 'text-emerald-400'
                            }`}
                          >
                            OCR: {(block.ocr_confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <textarea
                          rows={2}
                          value={block.text}
                          onChange={(e) => updateBlockText(block.id, e.target.value)}
                          className="w-full bg-slate-900/90 border border-slate-700 rounded-lg p-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Structured Markdown Output
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={copyMarkdown}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() =>
                          downloadFile(liveMarkdown, 'structured_document.md', 'text/markdown')
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700"
                      >
                        <Download className="w-3.5 h-3.5" /> .MD
                      </button>
                      <button
                        onClick={() =>
                          downloadFile(
                            JSON.stringify(analysis, null, 2),
                            'structured_document.json',
                            'application/json'
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-sky-600 hover:bg-sky-500"
                      >
                        <Download className="w-3.5 h-3.5" /> .JSON
                      </button>
                    </div>
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap max-h-56 overflow-y-auto font-mono">
                    {liveMarkdown}
                  </pre>
                </div>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}
