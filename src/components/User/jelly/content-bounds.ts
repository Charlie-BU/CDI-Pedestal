/** pixelContentBounds：读取画布中非透明像素的外接矩形。 */
export function pixelContentBounds(data: Uint8ClampedArray, width: number, height: number) {
    let left = width, top = height, right = -1, bottom = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!data[(y * width + x) * 4 + 3]) continue;
            left = Math.min(left, x); top = Math.min(top, y);
            right = Math.max(right, x); bottom = Math.max(bottom, y);
        }
    }
    return right < 0 ? null : { left, top, right: right + 1, bottom: bottom + 1 };
}
