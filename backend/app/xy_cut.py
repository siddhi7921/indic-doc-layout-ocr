"""
Augmented Recursive XY-Cut Algorithm for Multi-Column Reading-Order Sorting.
Splits document bounding boxes along vertical (column) and horizontal (row) projection valleys.
"""

from typing import List, Dict, Any
import numpy as np


def _find_projection_valleys(intervals: np.ndarray, min_gap: int) -> List[float]:
    """Finds split midpoints where no bounding boxes overlap along a 1D axis."""
    if len(intervals) <= 1:
        return []

    sorted_idx = np.argsort(intervals[:, 0])
    sorted_intervals = intervals[sorted_idx]

    splits: List[float] = []
    current_max_end = sorted_intervals[0, 1]

    for start, end in sorted_intervals[1:]:
        gap = start - current_max_end
        if gap >= min_gap:
            splits.append(float(current_max_end + gap / 2.0))
        current_max_end = max(current_max_end, end)

    return splits


def recursive_xy_cut(
    blocks: List[Dict[str, Any]],
    x_min_gap: int = 24,
    y_min_gap: int = 16,
    prefer_vertical_first: bool = True,
) -> List[Dict[str, Any]]:
    """
    Recursively partitions bounding boxes into reading order:
    1. Separates full-width banners/headers horizontally if present.
    2. Splits multi-column regions vertically (left-to-right).
    3. Sorts paragraphs within each column top-to-bottom.
    """
    if len(blocks) <= 1:
        return blocks

    boxes = np.array([b["bbox"] for b in blocks], dtype=np.float32)  # [x1, y1, x2, y2]

    if prefer_vertical_first:
        y_splits = _find_projection_valleys(boxes[:, [1, 3]], min_gap=y_min_gap * 2)
        if y_splits:
            mid_y = y_splits[0]
            top = [b for b in blocks if (b["bbox"][1] + b["bbox"][3]) / 2.0 < mid_y]
            bottom = [b for b in blocks if (b["bbox"][1] + b["bbox"][3]) / 2.0 >= mid_y]
            if top and bottom:
                return recursive_xy_cut(top, x_min_gap, y_min_gap, True) + recursive_xy_cut(
                    bottom, x_min_gap, y_min_gap, True
                )

        x_splits = _find_projection_valleys(boxes[:, [0, 2]], min_gap=x_min_gap)
        if x_splits:
            mid_x = x_splits[0]
            left = [b for b in blocks if (b["bbox"][0] + b["bbox"][2]) / 2.0 < mid_x]
            right = [b for b in blocks if (b["bbox"][0] + b["bbox"][2]) / 2.0 >= mid_x]
            if left and right:
                return recursive_xy_cut(left, x_min_gap, y_min_gap, False) + recursive_xy_cut(
                    right, x_min_gap, y_min_gap, False
                )

    y_splits = _find_projection_valleys(boxes[:, [1, 3]], min_gap=y_min_gap)
    if y_splits:
        mid_y = y_splits[0]
        top = [b for b in blocks if (b["bbox"][1] + b["bbox"][3]) / 2.0 < mid_y]
        bottom = [b for b in blocks if (b["bbox"][1] + b["bbox"][3]) / 2.0 >= mid_y]
        if top and bottom:
            return recursive_xy_cut(top, x_min_gap, y_min_gap, True) + recursive_xy_cut(
                bottom, x_min_gap, y_min_gap, True
            )

    return sorted(blocks, key=lambda b: (round(b["bbox"][1] / 15) * 15, b["bbox"][0]))
