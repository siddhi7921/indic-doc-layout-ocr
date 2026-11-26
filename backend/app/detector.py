"""
Layout Detection Engine using ONNX Runtime (DocLayout-YOLO) with an automatic
morphological contour fallback so the API runs cleanly before custom weights are trained.
"""

from pathlib import Path
from typing import List, Dict, Any
import cv2
import numpy as np

try:
    import onnxruntime as ort
except ImportError:
    ort = None

CLASSES = [
    "Title",
    "Text",
    "Table",
    "Figure",
    "Caption",
    "List",
    "Header",
    "Footer",
    "Advertisement",
]


class DocumentLayoutDetector:
    def __init__(self, model_path: str = "models/doclayout_indic.onnx", imgsz: int = 1024):
        self.model_path = Path(model_path)
        self.imgsz = imgsz
        self.session = None

        if ort is not None and self.model_path.exists():
            providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
            self.session = ort.InferenceSession(str(self.model_path), providers=providers)
            self.input_name = self.session.get_inputs()[0].name

    @property
    def backend_mode(self) -> str:
        return "onnx-doclayout-yolo" if self.session is not None else "opencv-morphological-fallback"

    def detect(self, image_bgr: np.ndarray, conf_thresh: float = 0.35) -> List[Dict[str, Any]]:
        if self.session is not None:
            return self._detect_onnx(image_bgr, conf_thresh)
        return self._detect_morphological(image_bgr)

    def _detect_onnx(self, image_bgr: np.ndarray, conf_thresh: float) -> List[Dict[str, Any]]:
        orig_h, orig_w = image_bgr.shape[:2]
        resized = cv2.resize(image_bgr, (self.imgsz, self.imgsz))
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        tensor = np.transpose(rgb, (2, 0, 1))[None, ...]

        outputs = self.session.run(None, {self.input_name: tensor})[0]
        preds = np.squeeze(outputs).T

        boxes, scores, class_ids = [], [], []
        scale_x, scale_y = orig_w / self.imgsz, orig_h / self.imgsz

        for row in preds:
            cls_scores = row[4:]
            cls_id = int(np.argmax(cls_scores))
            score = float(cls_scores[cls_id])
            if score < conf_thresh:
                continue

            cx, cy, w, h = row[:4]
            x1 = max(0, int((cx - w / 2) * scale_x))
            y1 = max(0, int((cy - h / 2) * scale_y))
            x2 = min(orig_w, int((cx + w / 2) * scale_x))
            y2 = min(orig_h, int((cy + h / 2) * scale_y))

            boxes.append([x1, y1, x2 - x1, y2 - y1])
            scores.append(score)
            class_ids.append(cls_id)

        indices = cv2.dnn.NMSBoxes(boxes, scores, conf_thresh, 0.45)
        results: List[Dict[str, Any]] = []
        if len(indices) > 0:
            for idx in np.asarray(indices).flatten():
                idx_int = int(idx)
                x, y, w, h = boxes[idx_int]
                label = CLASSES[class_ids[idx_int]] if class_ids[idx_int] < len(CLASSES) else "Text"
                results.append(
                    {
                        "label": label,
                        "layout_confidence": round(scores[idx_int], 4),
                        "bbox": [x, y, x + w, y + h],
                    }
                )
        return results

    def _detect_morphological(self, image_bgr: np.ndarray) -> List[Dict[str, Any]]:
        """Fallback layout block segmenter using adaptive thresholding & anisotropic dilation."""
        h, w = image_bgr.shape[:2]
        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 25, 15
        )

        kernel_w = max(15, w // 55)
        kernel_h = max(8, h // 90)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_w, kernel_h))
        dilated = cv2.dilate(thresh, kernel, iterations=2)

        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        results: List[Dict[str, Any]] = []

        for cnt in contours:
            x, y, bw, bh = cv2.boundingRect(cnt)
            if bw < w * 0.04 or bh < h * 0.015 or (bw > w * 0.96 and bh > h * 0.96):
                continue

            aspect = bw / max(bh, 1)
            if y < h * 0.16 and aspect > 3.2:
                label = "Title"
            elif bw > w * 0.45 and bh > h * 0.22:
                label = "Table"
            elif aspect < 1.3 and bh > h * 0.18:
                label = "Figure"
            else:
                label = "Text"

            results.append(
                {
                    "label": label,
                    "layout_confidence": 0.88,
                    "bbox": [int(x), int(y), int(x + bw), int(y + bh)],
                }
            )

        if not results:
            results.append({"label": "Text", "layout_confidence": 0.90, "bbox": [0, 0, w, h]})

        return results
