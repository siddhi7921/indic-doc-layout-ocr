"""
Benchmark Character Error Rate (CER) and Word Error Rate (WER) between
raw full-page OCR and layout-segmented XY-Cut ordered OCR.
"""

import argparse
from pathlib import Path
from jiwer import cer, wer


def main() -> None:
    parser = argparse.ArgumentParser(description="Compute CER & WER reduction")
    parser.add_argument("--ground-truth", type=str, required=True)
    parser.add_argument("--raw-ocr", type=str, required=True)
    parser.add_argument("--layout-ocr", type=str, required=True)
    args = parser.parse_args()

    gt = Path(args.ground_truth).read_text(encoding="utf-8").strip()
    raw = Path(args.raw_ocr).read_text(encoding="utf-8").strip()
    structured = Path(args.layout_ocr).read_text(encoding="utf-8").strip()

    raw_cer, raw_wer = cer(gt, raw), wer(gt, raw)
    struct_cer, struct_wer = cer(gt, structured), wer(gt, structured)

    cer_reduction = ((raw_cer - struct_cer) / max(raw_cer, 1e-6)) * 100.0
    wer_reduction = ((raw_wer - struct_wer) / max(raw_wer, 1e-6)) * 100.0

    print("=== Document OCR Benchmark Results ===")
    print(f"Raw Full-Page OCR   -> CER: {raw_cer:.4f} | WER: {raw_wer:.4f}")
    print(f"Layout + XY-Cut OCR -> CER: {struct_cer:.4f} | WER: {struct_wer:.4f}")
    print(f"Relative Reduction  -> CER: -{cer_reduction:.2f}% | WER: -{wer_reduction:.2f}%")


if __name__ == "__main__":
    main()
