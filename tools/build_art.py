"""Builds the site's artwork. Needs numpy, OpenCV, Pillow, and ffmpeg.

Usage: python3 tools/build_art.py IMAGES_DIR

IMAGES_DIR holds the source stills (5.webp, 6.webp, 7.jpg, 9.webp, 10.webp). They are show frames, so they aren't kept in this repository.

The stills become short retro loops: VHS-style colour, plus a little added motion in each. The city's floor and the
hero's dithered panel are pixel art and are drawn here too.
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
FPS = 15
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32) / 16


def load(path, box, size):
    """Crops a still and enlarges it smoothly. Returns RGB floats from 0 to 1."""
    image = Image.open(path).convert('RGB').crop(box)
    array = np.array(image, dtype=np.float32) / 255
    return cv2.resize(array, size, interpolation=cv2.INTER_LANCZOS4).clip(0, 1)


def grade(rgb):
    """The look of a tape: colour smeared sideways against sharper brightness, glowing highlights, faded blacks."""
    ycc = cv2.cvtColor(rgb, cv2.COLOR_RGB2YCrCb)
    y, cr, cb = cv2.split(ycc)
    y = (y + (y - cv2.GaussianBlur(y, (0, 0), 2.4)) * 0.45).clip(0, 1)
    cr = np.roll(cv2.GaussianBlur(cr, (0, 0), sigmaX=5.5, sigmaY=0.8), 3, axis=1)
    cb = np.roll(cv2.GaussianBlur(cb, (0, 0), sigmaX=5.5, sigmaY=0.8), -2, axis=1)
    out = cv2.cvtColor(cv2.merge((y, cr, cb)), cv2.COLOR_YCrCb2RGB).clip(0, 1)
    out[:, :, 0] = np.roll(out[:, :, 0], 2, axis=1)
    out[:, :, 2] = np.roll(out[:, :, 2], -2, axis=1)
    glow = cv2.GaussianBlur(np.clip((rgb - 0.6) / 0.4, 0, 1), (0, 0), 13)
    out = out + glow * np.array([0.34, 0.2, 0.26], dtype=np.float32)
    lift = np.array([0.04, 0.022, 0.066], dtype=np.float32)
    out = lift + out * (0.97 - lift)
    return out.clip(0, 1)


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


def crack(images):
    """The cracked face on blue, with black debris tumbling past and the cracks pulsing."""
    base = load(images / '7.jpg', (0, 40, 739, 300), (1280, 448))
    h, w = base.shape[:2]
    rng = random.Random(7)
    count = 45
    shards = []
    for i in range(24):
        near = i < 8
        length = rng.uniform(16, 40) if near else rng.uniform(5, 15)
        shards.append({
            'x': rng.uniform(0, w), 'y': rng.uniform(0, h), 'length': length, 'width': length * rng.uniform(0.18, 0.4),
            'rot': rng.uniform(0, math.tau), 'turns': rng.choice((-1, 1)), 'laps': 2 if near else 1,
        })
    r, g, b = base[:, :, 0], base[:, :, 1], base[:, :, 2]
    glow = cv2.GaussianBlur(((r > 0.66) & (g < 0.6) & (b < 0.85) & (b > 0.15)).astype(np.float32), (0, 0), 5)[:, :, None]
    glint = np.zeros((h, w), np.float32)
    cv2.circle(glint, (745, 195), 12, 1.0, -1, cv2.LINE_AA)
    glint = cv2.GaussianBlur(glint, (0, 0), 12)[:, :, None]
    pink = np.array([0.32, 0.12, 0.2], dtype=np.float32)
    frames = []
    for t in range(count):
        frame = base.copy()
        pulse = 0.5 + 0.5 * math.sin(t / count * math.tau * 2)
        frame += glow * pink * pulse + glint * 0.6 * max(0, math.sin(t / count * math.tau * 2 + 1)) ** 4
        for shard in shards:
            y = (shard['y'] + t / count * (h + 80) * shard['laps']) % (h + 80) - 40
            angle = shard['rot'] + shard['turns'] * t / count * math.tau
            c, s = math.cos(angle), math.sin(angle)
            corners = [(-1, -0.5), (1, -0.2), (0.7, 0.5), (-0.6, 0.35)]
            points = [(shard['x'] + cx * shard['length'] * c - cy * shard['width'] * s, y + cx * shard['length'] * s + cy * shard['width'] * c) for cx, cy in corners]
            cv2.fillPoly(frame, [np.round(np.array(points) * 16).astype(np.int32)], (0.03, 0.04, 0.09), cv2.LINE_AA, 4)
        frames.append(tape(grade(frame.clip(0, 1)), t, count, 100))
    encode('crack', frames)


def duel(images):
    """D and Capri face to face, with her hair glittering and a short glitch once a loop."""
    source = images / '6.webp'
    base = load(source, (0, 14, 498, 188), (1280, 448))
    h, w = base.shape[:2]
    rng = random.Random(11)
    r, g, b = base[:, :, 0], base[:, :, 1], base[:, :, 2]
    hair = np.argwhere((r > 0.75) & (g < 0.36) & (b < 0.52))
    specks = [(tuple(int(v) for v in hair[rng.randrange(len(hair))]), rng.randrange(60), rng.uniform(1.2, 3.4)) for _ in range(260)]
    count = 60
    frames = []
    for t in range(count):
        frame = base.copy()
        for (y, x), phase, radius in specks:
            age = (t + phase) % 60
            if age < 8:
                cv2.circle(frame, (x * 16, y * 16), int(radius * 16 * math.sin(age / 8 * math.pi)), (1.0, 0.96, 0.98), -1, cv2.LINE_AA, 4)
        graded = grade(frame.clip(0, 1))
        if t in (34, 35, 39):
            for _ in range(8):
                y = rng.randrange(h - 40)
                band = rng.randint(8, 34)
                graded[y:y + band] = np.roll(graded[y:y + band], rng.randint(-90, 90), axis=1)
            graded[:, :, 0] = np.roll(graded[:, :, 0], 9, axis=1)
            graded[:, :, 2] = np.roll(graded[:, :, 2], -9, axis=1)
        frames.append(tape(graded, t, count, 200))
    encode('duel', frames)


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


def embers(images):
    """D looking up through the fire, with embers rising past him and the red light breathing. The crop leaves out the still's logo."""
    base = load(images / '9.webp', (0, 48, 480, 216), (1280, 448))
    h, w = base.shape[:2]
    rng = random.Random(9)
    r, g, b = base[:, :, 0], base[:, :, 1], base[:, :, 2]
    red = cv2.GaussianBlur(np.clip((r - np.maximum(g, b)) * 2.2, 0, 1), (0, 0), 7)[:, :, None]
    count = 60
    sparks = [{
        'x': rng.uniform(0, w), 'y': rng.uniform(0, h + 60), 'laps': rng.choice((1, 1, 2)), 'radius': rng.uniform(1.2, 4.2),
        'sway': rng.uniform(4, 22), 'swaps': rng.choice((1, 2)), 'phase': rng.uniform(0, math.tau), 'flicker': rng.choice((3, 4, 5)),
    } for _ in range(70)]
    frames = []
    for t in range(count):
        u = t / count
        layer = np.zeros((h, w), np.float32)
        for spark in sparks:
            y = (spark['y'] - u * (h + 60) * spark['laps']) % (h + 60) - 30
            x = spark['x'] + math.sin(u * math.tau * spark['swaps'] + spark['phase']) * spark['sway']
            amount = 0.55 + 0.45 * math.sin(u * math.tau * spark['flicker'] + spark['phase'])
            cv2.circle(layer, (int(x * 16), int(y * 16)), int(spark['radius'] * 16), float(amount), -1, cv2.LINE_AA, 4)
        tight = cv2.GaussianBlur(layer, (0, 0), 1.1)[:, :, None]
        wide = cv2.GaussianBlur(layer, (0, 0), 7)[:, :, None]
        breath = 0.5 + 0.5 * math.sin(u * math.tau * 2)
        frame = base + tight * np.array([1.0, 0.62, 0.2], dtype=np.float32) + wide * np.array([0.9, 0.34, 0.08], dtype=np.float32)
        frame = frame + red * np.array([0.14, 0.02, 0.0], dtype=np.float32) * breath
        frames.append(tape(grade(frame.clip(0, 1)), t, count, 400))
    encode('embers', frames)


def on_call(images):
    """The shocked face, for the monitor beside the crash demo. The page adds the shake and scanlines."""
    face = load(images / '10.webp', (100, 2, 420, 242), (480, 360))
    Image.fromarray((grade(face) * 255).astype(np.uint8), 'RGB').save(OUT / 'on-call.jpg', quality=84, optimize=True, progressive=True)


def floor():
    """A pixel tile of the hero's floor: dark ground, blue dome lights, and debris, breaking up into dither below."""
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
    crack(folder)
    duel(folder)
    sky(folder)
    embers(folder)
    on_call(folder)
    floor()
    scrims()
