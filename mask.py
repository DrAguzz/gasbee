from PIL import Image, ImageDraw

def mask_squircle(img_path, out_path, margin, radius):
    img = Image.open(img_path).convert("RGBA")
    width, height = img.size
    
    left = margin
    top = margin
    right = width - margin
    bottom = height - margin
    
    mask = Image.new("L", img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([left, top, right, bottom], radius=radius, fill=255)
    
    img.putalpha(mask)
    
    img_cropped = img.crop((left, top, right, bottom))
    
    img_cropped.save(out_path)

mask_squircle("/Users/aguzzz/.gemini/antigravity-ide/brain/e1aa961b-f306-4727-92af-0651a5d97e4f/gasbee_rider_icon_front_logo_1781193171484.png", "gasbee_rider_icon_clean.png", 64, 160)
