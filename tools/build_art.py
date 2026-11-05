"""Builds the site's artwork. Needs numpy, OpenCV, Pillow, and ffmpeg.

Usage: python3 tools/build_art.py SOURCE_DIR

SOURCE_DIR holds the GIFs and stills named in LOOPS and STILLS, plus 5.webp for the sky. They are show footage, so they aren't kept in this
repository.

Each GIF becomes a looping video of the whole GIF, uncropped and at its full length, with VHS-style colour and no added
motion, for the frames around the page. The night sky behind Contact is different: one frame with its lights made to
twinkle, and the small Capri painted out so the live one can stand there. The city's floor and the hero's dithered panel
are pixel art and are drawn here too.
"""
import math
import random
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / 'dist' / 'assets' / 'art'
WIDTH = 840
FPS = 15
LOOPS = {
    'duel': 'Capri D Edgerunners GIF.gif',
    'embers': 'dcpe.gif',
    'roman': 'roman.gif',
}
STILLS = {'crack': '7.jpg'}
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32) / 16


def enlarge(image, height):
    """Enlarges smoothly, so nothing looks pixelated in a frame on a sharp screen. Returns RGB floats from 0 to 1."""
    array = np.array(image.convert('RGB'), dtype=np.float32) / 255
    return cv2.resize(array, (WIDTH, height), interpolation=cv2.INTER_LANCZOS4).clip(0, 1)


def grade(rgb):
    """The look of a tape: colour smeared sideways against sharper brightness, glowing highlights, faded blacks."""
    scale = rgb.shape[1] / 1280
    ycc = cv2.cvtColor(rgb, cv2.COLOR_RGB2YCrCb)
    y, cr, cb = cv2.split(ycc)
    y = (y + (y - cv2.GaussianBlur(y, (0, 0), 2.4 * scale)) * 0.45).clip(0, 1)
    cr = np.roll(cv2.GaussianBlur(cr, (0, 0), sigmaX=5.5 * scale, sigmaY=0.8 * scale), round(3 * scale), axis=1)
    cb = np.roll(cv2.GaussianBlur(cb, (0, 0), sigmaX=5.5 * scale, sigmaY=0.8 * scale), -round(2 * scale), axis=1)
    out = cv2.cvtColor(cv2.merge((y, cr, cb)), cv2.COLOR_YCrCb2RGB).clip(0, 1)
    shift = max(1, round(2 * scale))
    out[:, :, 0] = np.roll(out[:, :, 0], shift, axis=1)
    out[:, :, 2] = np.roll(out[:, :, 2], -shift, axis=1)
    glow = cv2.GaussianBlur(np.clip((rgb - 0.6) / 0.4, 0, 1), (0, 0), 13 * scale)
    out = out + glow * np.array([0.34, 0.2, 0.26], dtype=np.float32)
    lift = np.array([0.04, 0.022, 0.066], dtype=np.float32)
    out = lift + out * (0.97 - lift)
    return out.clip(0, 1)


def even_height(image):
    return round(image.height * WIDTH / image.width / 2) * 2


def save_still(array, name):
    Image.fromarray(array, 'RGB').save(OUT / f'{name}.jpg', quality=82, optimize=True, progressive=True)


def report(name, detail):
    sizes = ', '.join(f'{p.name} {p.stat().st_size // 1024} KB' for p in sorted(OUT.glob(f'{name}.*')))
    print(f'{name}: {detail}, {sizes}')


def loop(name, path):
    """Writes the whole GIF as a video, keeping each frame's timing, and its first frame as the poster."""
    gif = Image.open(path)
    durations = []
    for i in range(gif.n_frames):
        gif.seek(i)
        durations.append((gif.info.get('duration') or 100) / 1000)
    total = sum(durations)
    fps = 30 if gif.n_frames / total > 20 else 15
    starts = np.cumsum([0] + durations[:-1])
    height = even_height(gif)
    command = [
        'ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{WIDTH}x{height}', '-r', str(fps), '-i', '-',
        '-an', '-c:v', 'libx264', '-preset', 'veryslow', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(OUT / f'{name}.mp4'),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    shown = None
    raw = b''
    for k in range(max(1, round(total * fps))):
        index = int(np.searchsorted(starts, k / fps, side='right')) - 1
        if index != shown:
            gif.seek(index)
            shown = index
            picture = (grade(enlarge(gif, height)) * 255).astype(np.uint8)
            raw = picture.tobytes()
            if index == 0:
                save_still(picture, name)
        process.stdin.write(raw)
    process.stdin.close()
    if process.wait():
        sys.exit(f'ffmpeg failed for {name}')
    report(name, f'{WIDTH}x{height}, {gif.n_frames} GIF frames, {total:.1f} s at {fps} fps')


def still(name, path):
    image = Image.open(path)
    height = even_height(image)
    save_still((grade(enlarge(image, height)) * 255).astype(np.uint8), name)
    report(name, f'{WIDTH}x{height}, still')


def tape(frame, t, count, rng_seed):
    """Per-frame tape wear. Everything here repeats exactly over the loop, so it never jumps at the seam."""
    h, w = frame.shape[:2]
    rng = np.random.default_rng(rng_seed + t)
    band_height = h // 7
    top = int((t / count) * (h + band_height * 2)) - band_height
    rows = range(max(0, top), min(h, top + band_height))
    for y in rows:
        strength = math.sin((y - top) / band_height * math.pi)
        shift = int(strength * (14 * math.sin(y * 0.21) + rng.integers(-5, 6)))
        frame[y] = np.roll(frame[y], shift, axis=0)
        frame[y] = frame[y] * (1 - 0.12 * strength) + 0.12 * strength * rng.random((w, 1), dtype=np.float32)
    frame *= 1 + 0.012 * math.sin(t * 2.399)
    return frame.clip(0, 1)


def encode(name, frames):
    """Writes the loop at two sizes and its first frame as the poster."""
    OUT.mkdir(parents=True, exist_ok=True)
    h, w = frames[0].shape[:2]
    def run(path, width, crf):
        command = [
            'ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-r', str(FPS), '-i', '-',
            '-an', '-vf', f'scale={width}:-2:flags=lanczos', '-c:v', 'libx264', '-preset', 'veryslow', '-crf', str(crf),
            '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(path),
        ]
        process = subprocess.Popen(command, stdin=subprocess.PIPE)
        for frame in frames:
            process.stdin.write((frame * 255).astype(np.uint8).tobytes())
        process.stdin.close()
        if process.wait():
            sys.exit(f'ffmpeg failed for {path}')
    run(OUT / f'{name}.mp4', w, 29)
    run(OUT / f'{name}-small.mp4', 720, 30)
    Image.fromarray((frames[0] * 255).astype(np.uint8), 'RGB').save(OUT / f'{name}.jpg', quality=82, optimize=True, progressive=True)
    sizes = ', '.join(f'{p.name} {p.stat().st_size // 1024} KB' for p in sorted(OUT.glob(f'{name}*')))
    print(f'{name}: {w}x{h}, {len(frames)} frames, {sizes}')


def sky(images):
    """Golden lights over the broken turbine, twinkling. The live Capri stands where the small one in the still was."""
    source = np.array(Image.open(images / '5.webp').convert('RGB'))
    box = (225, 150, 306, 223)
    patch_x = 322
    patch = source[box[1]:box[3], patch_x:patch_x + box[2] - box[0]]
    mask = np.full(patch.shape[:2], 255, np.uint8)
    source = cv2.seamlessClone(patch[:, :, ::-1], source[:, :, ::-1].copy(), mask, ((box[0] + box[2]) // 2, (box[1] + box[3] - 1) // 2), cv2.NORMAL_CLONE)[:, :, ::-1]
    size = (1280, 572)
    base = cv2.resize(source.astype(np.float32) / 255, size, interpolation=cv2.INTER_LANCZOS4).clip(0, 1)
    h, w = base.shape[:2]
    rng = random.Random(5)
    r, g, b = base[:, :, 0], base[:, :, 1], base[:, :, 2]
    bright = ((r > 0.42) & (g > 0.32) & (b < 0.55) & (r > b + 0.14)).astype(np.uint8)
    bright[int(h * 0.48):] = 0
    found, _, stats, centres = cv2.connectedComponentsWithStats(bright)
    lights = [(int(centres[i][0]), int(centres[i][1]), rng.randrange(45), rng.uniform(4, 9)) for i in range(1, found)]
    count = 45
    frames = []
    for t in range(count):
        layer = np.zeros((h, w), np.float32)
        for x, y, phase, radius in lights:
            amount = max(0.0, math.sin((t + phase) / count * math.tau * 2)) ** 3
            if amount > 0.02:
                cv2.circle(layer, (x, y), int(radius), float(amount), -1, cv2.LINE_AA)
        layer = cv2.GaussianBlur(layer, (0, 0), 3.4)[:, :, None]
        frame = base + layer * np.array([1.0, 0.76, 0.34], dtype=np.float32)
        frames.append(tape(grade(frame.clip(0, 1)), t, count, 300))
    encode('sky', frames)


def floor():
    """A pixel tile of the floor: dark ground, blue dome lights, and debris, breaking up into dither below."""
    w, h = 240, 44
    image = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = image.load()
    rng = random.Random(3)
    ground, edge, deep, glow, light, core = (10, 15, 36, 255), (26, 35, 80, 255), (7, 10, 28, 255), (28, 70, 150, 255), (69, 212, 255, 255), (214, 244, 255, 255)
    top = 12
    for y in range(top, h):
        for x in range(w):
            if y == top:
                px[x, y] = edge
            elif y < 30:
                px[x, y] = ground
            elif int(BAYER[y % 4, x % 4] * 16) >= (y - 30) / (h - 30) * 18:
                px[x, y] = deep
    for cx in range(14, w, 30):
        for dy in range(-5, 1):
            for dx in range(-7, 8):
                if dx * dx + (dy * 1.4) ** 2 <= 49 and (cx + dx + top + dy) % 2 == 0:
                    px[cx + dx, top + dy - 1] = glow
        for dy in range(-3, 1):
            half = {0: 4, -1: 4, -2: 3, -3: 1}[dy]
            for dx in range(-half, half + 1):
                px[cx + dx, top + dy] = light
        px[cx, top - 1] = core
        px[cx - 1, top - 1] = core
    for _ in range(9):
        x = rng.randrange(w)
        width = rng.randint(4, 12)
        rise = rng.randint(2, 6)
        for i in range(width):
            height = max(1, int(rise * (1 - abs(i - width / 2) / (width / 2 + 1))))
            for y in range(top + 3, top + 3 + height + rng.randint(0, 1)):
                px[(x + i) % w, y] = deep
    image.save(OUT / 'floor.png', optimize=True)


def scrims():
    """Pixel tiles that dissolve solid night blue into nothing, for the panel behind the hero's text."""
    night = (10, 15, 36, 255)
    for name, w, h, fade in (('scrim', 96, 16, lambda x, y: 1 - x / 96), ('scrim-down', 16, 48, lambda x, y: 1 - y / 48)):
        image = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        px = image.load()
        for y in range(h):
            for x in range(w):
                if fade(x, y) > BAYER[y % 4, x % 4]:
                    px[x, y] = night
        image.save(OUT / f'{name}.png', optimize=True)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    folder = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    for name, file in LOOPS.items():
        loop(name, folder / file)
    for name, file in STILLS.items():
        still(name, folder / file)
    sky(folder)
    floor()
    scrims()
