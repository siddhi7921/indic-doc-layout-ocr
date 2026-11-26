"""
FastAPI Microservice for Multilingual Document Layout Analysis & Structured OCR.
"""

import time
import uuid
from typing import List
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from app.detector import DocumentLayoutDetector
    from app.ocr_engine import MultilingualOCREngine
    from app.xy_cut import recursive_xy_cut
except ModuleNotFoundError:
    from detector import DocumentLayoutDetector
    from ocr_engine import MultilingualOCREngine
    from xy_cut import recursive_xy_cut

app = FastAPI(
    title="IndicDocAI — Document Layout & Structured OCR API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

detector = DocumentLayoutDetector()
ocr_engine = MultilingualOCREngine(languages=["bn", "en"])


class DocumentBlock(BaseModel):
    id: str
    reading_order: int
    label: str
    bbox: List[int]
    layout_confidence: float
    ocr_confidence: float
    text: str


class AnalysisResponse(BaseModel):
    filename: str
    image_width: int
    image_height: int
    detector_backend: str
    latency_ms: float
    average_ocr_confidence: float
    blocks: List[DocumentBlock]
    markdown: str


def blocks_to_markdown(blocks: List[DocumentBlock]) -> str:
    md_lines: List[str] = []
    for block in blocks:
        content = block.text.strip()
        if not content:
            continue
        if block.label in ("Title", "Header"):
            md_lines.append(f"## {content}")
        elif block.label == "Caption":
            md_lines.append(f"*{content}*")
        elif block.label == "List":
            md_lines.append(f"- {content}")
        elif block.label == "Table":
            md_lines.append(f"> **[Table Block]**\n> {content}")
        elif block.label == "Advertisement":
            md_lines.append(f"---\n**[Advertisement]** {content}\n---")
        else:
            md_lines.append(content)
    return "\n\n".join(md_lines)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "detector_backend": detector.backend_mode,
        "ocr_languages": ocr_engine.languages,
    }


@app.post("/api/v1/analyze", response_model=AnalysisResponse)
async def analyze_document(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload a PNG, JPG, or WEBP image.")

    raw_bytes = await file.read()
    np_arr = np.frombuffer(raw_bytes, np.uint8)
    image_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image_bgr is None:
        raise HTTPException(status_code=400, detail="Could not decode uploaded image.")

    t_start = time.perf_counter()
    img_h, img_w = image_bgr.shape[:2]

    raw_blocks = detector.detect(image_bgr)
    ordered_blocks = recursive_xy_cut(raw_blocks)

    structured_blocks: List[DocumentBlock] = []
    conf_scores: List[float] = []

    for idx, blk in enumerate(ordered_blocks, start=1):
        x1, y1, x2, y2 = [int(v) for v in blk["bbox"]]
        crop = image_bgr[max(0, y1) : min(img_h, y2), max(0, x1) : min(img_w, x2)]
        text, ocr_conf = ocr_engine.extract_crop(crop)

        if ocr_conf > 0:
            conf_scores.append(ocr_conf)

        structured_blocks.append(
            DocumentBlock(
                id=str(uuid.uuid4())[:8],
                reading_order=idx,
                label=blk["label"],
                bbox=blk["bbox"],
                layout_confidence=blk["layout_confidence"],
                ocr_confidence=ocr_conf,
                text=text,
            )
        )

    elapsed_ms = round((time.perf_counter() - t_start) * 1000.0, 2)
    avg_conf = round(float(np.mean(conf_scores)), 4) if conf_scores else 0.0
    markdown_output = blocks_to_markdown(structured_blocks)

    return AnalysisResponse(
        filename=file.filename or "document.png",
        image_width=img_w,
        image_height=img_h,
        detector_backend=detector.backend_mode,
        latency_ms=elapsed_ms,
        average_ocr_confidence=avg_conf,
        blocks=structured_blocks,
        markdown=markdown_output,
    )
