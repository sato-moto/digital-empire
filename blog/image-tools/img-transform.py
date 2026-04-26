"""
img-transform.py -- Crop / Resize / Rotate

Usage:
  python img-transform.py input.jpg output.jpg [options]

Options:
  --crop  x1,y1,x2,y2    crop (pixel coords, top-left to bottom-right)
  --resize WxH           resize (e.g. 1024x640)
  --rotate N             rotate degrees (90 / 180 / 270)

Examples:
  python img-transform.py 29241.jpg out.jpg --crop 100,50,900,700
  python img-transform.py input.jpg out.jpg --resize 1024x640
  python img-transform.py input.jpg out.jpg --rotate 90
  python img-transform.py input.jpg out.jpg --crop 100,50,900,700 --resize 1024x640
"""

import argparse
from PIL import Image

parser = argparse.ArgumentParser(description='Crop / Resize / Rotate')
parser.add_argument('input',  help='input file path')
parser.add_argument('output', help='output file path')
parser.add_argument('--crop',   type=str, help='crop coords x1,y1,x2,y2')
parser.add_argument('--resize', type=str, help='resize WxH (e.g. 1024x640)')
parser.add_argument('--rotate', type=int, help='rotate degrees (90/180/270)')
args = parser.parse_args()

img = Image.open(args.input)
print('[IN]  %s  (%dx%d)' % (args.input, img.width, img.height))

if args.crop:
    x1, y1, x2, y2 = map(int, args.crop.split(','))
    img = img.crop((x1, y1, x2, y2))
    print('[CROP] (%d,%d) -> (%d,%d)  => %dx%d' % (x1, y1, x2, y2, img.width, img.height))

if args.resize:
    w, h = map(int, args.resize.split('x'))
    img = img.resize((w, h), Image.LANCZOS)
    print('[RESIZE] %dx%d' % (w, h))

if args.rotate:
    img = img.rotate(-args.rotate, expand=True)
    print('[ROTATE] %d deg' % args.rotate)

img.save(args.output, quality=95)
print('[SAVED] %s' % args.output)
