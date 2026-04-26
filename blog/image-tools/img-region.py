"""
img-region.py -- Blur / Fill specific region

Usage:
  python img-region.py input.jpg output.jpg --region x1,y1,x2,y2 [--blur N | --fill COLOR]

Options:
  --region x1,y1,x2,y2   target region (top-left to bottom-right, pixels)
  --blur N               blur strength (e.g. 20 / 40 / 60)
  --fill COLOR           fill color (black / white / gray / #FF0000 etc.)
  --preview              draw red border to confirm region (no overwrite)

Examples:
  python img-region.py input.jpg out.jpg --region 0,300,1080,800 --blur 40
  python img-region.py input.jpg out.jpg --region 0,300,1080,800 --fill black
  python img-region.py input.jpg out.jpg --region 0,300,1080,800 --fill white
  python img-region.py input.jpg preview.jpg --region 0,300,1080,800 --preview

Multiple regions: run the script twice, using the first output as input for the second run.
"""

import argparse
from PIL import Image, ImageFilter, ImageDraw

parser = argparse.ArgumentParser(description='Blur / Fill region')
parser.add_argument('input',    help='input file path')
parser.add_argument('output',   help='output file path')
parser.add_argument('--region', required=True, type=str, help='region x1,y1,x2,y2')
parser.add_argument('--blur',   type=int, help='blur strength')
parser.add_argument('--fill',   type=str, help='fill color (black/white/#RRGGBB)')
parser.add_argument('--preview',action='store_true', help='preview region with red border')
args = parser.parse_args()

if not args.blur and not args.fill and not args.preview:
    print('[ERROR] Specify --blur, --fill, or --preview')
    exit(1)

img = Image.open(args.input)
x1, y1, x2, y2 = map(int, args.region.split(','))
print('[IN]     %s  (%dx%d)' % (args.input, img.width, img.height))
print('[REGION] (%d,%d) -> (%d,%d)' % (x1, y1, x2, y2))

if args.preview:
    draw = ImageDraw.Draw(img)
    draw.rectangle([x1, y1, x2, y2], outline='red', width=4)
    img.save(args.output, quality=95)
    print('[PREVIEW SAVED] %s  (red border = target region)' % args.output)
    exit(0)

if args.blur:
    region = img.crop((x1, y1, x2, y2))
    blurred = region.filter(ImageFilter.GaussianBlur(radius=args.blur))
    img.paste(blurred, (x1, y1))
    print('[BLUR] radius=%d applied' % args.blur)

if args.fill:
    draw = ImageDraw.Draw(img)
    draw.rectangle([x1, y1, x2, y2], fill=args.fill)
    print('[FILL] color=%s applied' % args.fill)

img.save(args.output, quality=95)
print('[SAVED] %s' % args.output)
