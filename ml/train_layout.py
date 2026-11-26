"""
Fine-tune DocLayout-YOLO / YOLOv8 on AI4Bharat IndicDLP dataset.
Converts Hugging Face dataset annotations into YOLO format and trains the layout detector.
"""

import argparse
from pathlib import Path
import yaml
from datasets import load_dataset
from ultralytics import YOLO

LAYOUT_CLASSES = [
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


def prepare_indicdlp_yolo(output_dir: Path, max_samples: int = 2000) -> Path:
    """Downloads IndicDLP subset and converts bounding boxes to YOLO normalized format."""
    images_train = output_dir / "images" / "train"
    images_val = output_dir / "images" / "val"
    labels_train = output_dir / "labels" / "train"
    labels_val = output_dir / "labels" / "val"

    for folder in (images_train, images_val, labels_train, labels_val):
        folder.mkdir(parents=True, exist_ok=True)

    print("Loading ai4bharat/indicdlp from Hugging Face...")
    ds = load_dataset("ai4bharat/indicdlp", split=f"train[:{max_samples}]")
    split_idx = int(len(ds) * 0.85)

    for idx, sample in enumerate(ds):
        is_train = idx < split_idx
        img_dir = images_train if is_train else images_val
        lbl_dir = labels_train if is_train else labels_val

        image = sample["image"].convert("RGB")
        w, h = max(image.size[0], 1), max(image.size[1], 1)
        img_path = img_dir / f"doc_{idx:05d}.jpg"
        image.save(img_path, quality=92)

        annotations = sample.get("annotations", [])
        yolo_lines = []
        for ann in annotations:
            cat_name = ann.get("category", "Text")
            cls_id = LAYOUT_CLASSES.index(cat_name) if cat_name in LAYOUT_CLASSES else 1
            x_min, y_min, box_w, box_h = ann["bbox"]
            x_center = (x_min + box_w / 2.0) / w
            y_center = (y_min + box_h / 2.0) / h
            norm_w = box_w / w
            norm_h = box_h / h
            yolo_lines.append(f"{cls_id} {x_center:.6f} {y_center:.6f} {norm_w:.6f} {norm_h:.6f}")

        (lbl_dir / f"doc_{idx:05d}.txt").write_text("\n".join(yolo_lines), encoding="utf-8")

    data_yaml = {
        "path": str(output_dir.resolve()),
        "train": "images/train",
        "val": "images/val",
        "names": {i: name for i, name in enumerate(LAYOUT_CLASSES)},
    }
    yaml_path = output_dir / "indicdlp.yaml"
    yaml_path.write_text(yaml.safe_dump(data_yaml, sort_keys=False), encoding="utf-8")
    return yaml_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Document Layout Detector on IndicDLP")
    parser.add_argument("--base-model", type=str, default="yolov8m.pt", help="Pretrained YOLO weights")
    parser.add_argument("--data-dir", type=str, default="datasets/indicdlp_yolo")
    parser.add_argument("--max-samples", type=int, default=2000)
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--imgsz", type=int, default=1024)
    parser.add_argument("--batch", type=int, default=8)
    args = parser.parse_args()

    yaml_path = prepare_indicdlp_yolo(Path(args.data_dir), max_samples=args.max_samples)
    model = YOLO(args.base_model)
    model.train(
        data=str(yaml_path),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        project="runs/detect",
        name="indicdlp_layout",
        patience=8,
    )

    metrics = model.val()
    print(f"Validation mAP@50: {metrics.box.map50:.4f} | mAP@50:95: {metrics.box.map:.4f}")


if __name__ == "__main__":
    main()
