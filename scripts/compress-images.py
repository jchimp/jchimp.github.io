#!/usr/bin/env python3
from __future__ import annotations
import argparse
import json
from pathlib import Path
from PIL import Image

DEFAULT_EXTS = {'.png', '.jpg', '.jpeg'}


def human(n: int) -> str:
    for unit in ['B', 'KB', 'MB', 'GB']:
        if n < 1024 or unit == 'GB':
            return f"{n:.1f}{unit}" if unit != 'B' else f"{n}B"
        n /= 1024
    return f"{n}B"


def iter_images(root: Path):
    for p in root.rglob('*'):
        if p.is_file() and p.suffix.lower() in DEFAULT_EXTS:
            yield p


def process_image(path: Path, max_width: int, max_height: int, jpeg_quality: int):
    before_size = path.stat().st_size
    changed = False
    with Image.open(path) as img:
        fmt = (img.format or path.suffix.replace('.', '')).upper()
        exif = img.info.get('exif')
        if img.mode not in ('RGB', 'RGBA'):
            img = img.convert('RGBA' if 'A' in img.getbands() else 'RGB')
            changed = True
        width, height = img.size
        scale = min(max_width / width if width > max_width else 1.0,
                    max_height / height if height > max_height else 1.0)
        if scale < 1.0:
            new_size = (max(1, int(width * scale)), max(1, int(height * scale)))
            img = img.resize(new_size, Image.LANCZOS)
            changed = True
        save_kwargs = {'optimize': True}
        if fmt in ('JPG', 'JPEG'):
            if img.mode == 'RGBA':
                img = img.convert('RGB')
            save_kwargs.update({'quality': jpeg_quality, 'progressive': True})
        elif fmt == 'PNG':
            save_kwargs.update({'compress_level': 9})
        if exif:
            save_kwargs['exif'] = exif
        img.save(path, format='JPEG' if fmt == 'JPG' else fmt, **save_kwargs)
    after_size = path.stat().st_size
    if after_size != before_size:
        changed = True
    return {
        'path': str(path),
        'before_bytes': before_size,
        'after_bytes': after_size,
        'before_human': human(before_size),
        'after_human': human(after_size),
        'saved_bytes': before_size - after_size,
        'saved_human': human(max(0, before_size - after_size)),
        'changed': changed,
    }


def main():
    parser = argparse.ArgumentParser(description='Compress images under docs/images in place.')
    parser.add_argument('--root', default='docs/images', help='Root image directory')
    parser.add_argument('--max-width', type=int, default=2200)
    parser.add_argument('--max-height', type=int, default=2200)
    parser.add_argument('--jpeg-quality', type=int, default=82)
    parser.add_argument('--report', default='.image-compress-report.json')
    args = parser.parse_args()

    root = Path(args.root)
    if not root.exists():
        raise SystemExit(f'Root path not found: {root}')

    results = []
    total_before = 0
    total_after = 0
    for img_path in iter_images(root):
        result = process_image(img_path, args.max_width, args.max_height, args.jpeg_quality)
        results.append(result)
        total_before += result['before_bytes']
        total_after += result['after_bytes']
        flag = 'CHANGED' if result['changed'] else 'SKIPPED'
        print(f"[{flag}] {result['path']} :: {result['before_human']} -> {result['after_human']} (saved {result['saved_human']})")

    report = {
        'root': str(root),
        'count': len(results),
        'total_before_bytes': total_before,
        'total_after_bytes': total_after,
        'total_saved_bytes': total_before - total_after,
        'images': results,
    }
    Path(args.report).write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(f"Processed {len(results)} image(s). Total saved: {human(max(0, total_before - total_after))}")
    print(f"Report written to {args.report}")


if __name__ == '__main__':
    main()
