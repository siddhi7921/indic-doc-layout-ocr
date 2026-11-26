export type LayoutLabel =
  | 'Title'
  | 'Text'
  | 'Table'
  | 'Figure'
  | 'Caption'
  | 'List'
  | 'Header'
  | 'Footer'
  | 'Advertisement';

export interface DocumentBlock {
  id: string;
  reading_order: number;
  label: LayoutLabel | string;
  bbox: [number, number, number, number];
  layout_confidence: number;
  ocr_confidence: number;
  text: string;
}

export interface AnalysisResponse {
  filename: string;
  image_width: number;
  image_height: number;
  detector_backend: string;
  latency_ms: number;
  average_ocr_confidence: number;
  blocks: DocumentBlock[];
  markdown: string;
}
