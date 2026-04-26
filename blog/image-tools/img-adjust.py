"""
img-adjust.py -- Brightness / Contrast

Usage:
  python img-adjust.py input.jpg output.jpg [options]

Options:
  --brightness N   brightness (1.0=no change / 1.5=brighter / 0.7=darker)
  --contrast   N   contrast   (1.0=no change / 1.5=stronger / 0.7=softer)

Examples:
  python img-adjust.py input.jpg out.jpg --brightness 1.3
  python img-adjust.py input.jpg out.jpg --contrast 1.2
  python img-adjust.py input.jpg out.jpg --brightness 1.2 --contrast 1.1
"""

import argparse
from PIL import Image, ImageEnhance

parser = argparse.ArgumentParser(description='Brightness / Contrast')
parser.add_argument('input',  help='input file path')
parser.add_argument('output', help='output file path')
parser.add_argument('--brightness', type=float, default=1.0, help='brightness (1.0=no change)')
parser.add_argument('--contrast',   type=float, default=1.0, help='contrast (1.0=no change)')
args = parser.parse_args()

if args.brightness == 1.0 and args.contrast == 1.0:
    print('[WARN] No options specified. Use --brightness and/or --contrast.')
    exit(1)

img = Image.open(args.input)
print('[IN]  %s  (%dx%d)' % (args.input, img.width, img.height))

if args.brightness != 1.0:
    img = ImageEnhance.Brightness(img).enhance(args.brightness)
    print('[BRIGHTNESS] x%.2f' % args.brightness)

if args.contrast != 1.0:
    img = ImageEnhance.Contrast(img).enhance(args.contrast)
    print('[CONTRAST] x%.2f' % args.contrast)

img.save(args.output, quality=95)
print('[SAVED] %s' % args.output)
