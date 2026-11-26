"""
Export trained PyTorch layout weights to ONNX and benchmark inference latency (ms/page).
"""

import argparse
import shutil
import time
from pathlib import Path
import numpy as np
import onnxruntime as ort
from ultralytics import YOLO


def benchmark_onnx(onnx_path: Path, imgsz: int = 1024, runs: int = 40) -> float:
    providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
    session = ort.InferenceSession(str(onnx_path), providers=providers)
    input_name = session.get_inputs()[0].name
    dummy_input = np.random.randn(1, 3, imgsz, imgsz).astype(np.float32)

    for _ in range(5):
        session.run(None, {input_name: dummy_input})

    latencies_ms = []
    for _ in range(runs):
        t0 = time.perf_counter()
        session.run(None, {input_name: dummy_input})
        latencies_ms.append((time.perf_counter() - t0) * 1000.0)

    return float(np.mean(latencies_ms))


def main() -> None:
    parser = argparse.ArgumentParser(description="Export layout detector to ONNX & benchmark")
    parser.add_argument("--weights", type=str, required=True, help="Path to best.pt")
    parser.add_argument("--imgsz", type=int, default=1024)
    parser.add_argument("--dest", type=str, default="backend/models/doclayout_indic.onnx")
    args = parser.parse_args()

    model = YOLO(args.weights)
    export_result = model.export(format="onnx", imgsz=args.imgsz, simplify=True, opset=17)
    if isinstance(export_result, (list, tuple)):
        exported_file = Path(export_result[0])
    else:
        exported_file = Path(export_result)

    dest_path = Path(args.dest)
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(exported_file, dest_path)

    avg_ms = benchmark_onnx(dest_path, imgsz=args.imgsz)
    print(f"Exported ONNX model to: {dest_path}")
    print(f"Average ONNX Runtime Latency ({args.imgsz}x{args.imgsz}): {avg_ms:.2f} ms/page")


if __name__ == "__main__":
    main()
