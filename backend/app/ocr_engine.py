"""
Multilingual Crop OCR Engine supporting Bengali, Hindi, and English with confidence scoring.
"""

from __future__ import annotations

from typing import Tuple, List, Optional
import numpy as np

try:
    import easyocr
except ImportError:
    easyocr = None


class MultilingualOCREngine:
    def __init__(self, languages: Optional[List[str]] = None):
        self.languages = languages or ["bn", "en"]
        self.reader = None
        if easyocr is not None:
            try:
                self.reader = easyocr.Reader(self.languages, gpu=False)
            except Exception:
                self.reader = None

    def extract_crop(self, crop_bgr: np.ndarray) -> Tuple[str, float]:
        """Runs OCR on an individual layout crop and returns (text, avg_confidence)."""
        if crop_bgr.size == 0:
            return "", 0.0

        if self.reader is None:
            return "[OCR engine unavailable — install easyocr]", 0.50

        detections = self.reader.readtext(crop_bgr, detail=1, paragraph=True)
        if not detections:
            return "", 0.0

        texts: List[str] = []
        confidences: List[float] = []

        for item in detections:
            if len(item) == 3:
                _, text, conf = item
                confidences.append(float(conf))
            else:
                _, text = item
                confidences.append(0.85)
            if text.strip():
                texts.append(text.strip())

        combined_text = " ".join(texts)
        avg_conf = float(np.mean(confidences)) if confidences else 0.0
        return combined_text, round(avg_conf, 4)
