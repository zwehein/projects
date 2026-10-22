import os
from cairosvg import svg2png

# Path to cards directory
cards_dir = 'src/main/resources/cards'

# Convert all SVG files to PNG
for filename in os.listdir(cards_dir):
    if filename.endswith('.svg'):
        svg_path = os.path.join(cards_dir, filename)
        png_path = os.path.join(cards_dir, filename.replace('.svg', '.png'))
        
        print(f"Converting {filename} to PNG...")
        with open(svg_path, 'rb') as svg_file:
            svg_content = svg_file.read()
            svg2png(bytestring=svg_content, write_to=png_path, output_width=140, output_height=190)

print("Conversion complete!") 