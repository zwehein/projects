import os

def create_svg_card(rank, suit_symbol, color):
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="140" height="190" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="5" width="130" height="180" rx="10" fill="white" stroke="#34495e" stroke-width="5"/>
    <text x="25" y="45" font-family="Arial" font-size="24" fill="{color}">{rank}</text>
    <text x="45" y="45" font-family="Arial" font-size="24" fill="{color}">{suit_symbol}</text>
    <text x="70" y="100" font-family="Arial" font-size="48" fill="{color}" text-anchor="middle">{suit_symbol}</text>
    <text x="115" y="145" font-family="Arial" font-size="24" fill="{color}" text-anchor="end">{rank}</text>
    <text x="95" y="145" font-family="Arial" font-size="24" fill="{color}" text-anchor="end">{suit_symbol}</text>
</svg>'''

def create_svg_back():
    return '''<?xml version="1.0" encoding="UTF-8"?>
<svg width="140" height="190" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="5" width="130" height="180" rx="10" fill="#2c3e50" stroke="#34495e" stroke-width="5"/>
    <rect x="15" y="15" width="110" height="160" rx="5" fill="none" stroke="#3498db" stroke-width="2"/>
    <text x="70" y="100" font-family="Arial" font-size="24" fill="#3498db" text-anchor="middle">♠♣♥♦</text>
</svg>'''

# Define card properties
ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
suits = {
    'H': ('♥', '#e74c3c'),  # Hearts - Red
    'D': ('♦', '#e74c3c'),  # Diamonds - Red
    'C': ('♣', '#2c3e50'),  # Clubs - Black
    'S': ('♠', '#2c3e50')   # Spades - Black
}

# Create output directory if it doesn't exist
os.makedirs('src/main/resources/cards', exist_ok=True)

# Generate card back
with open('src/main/resources/cards/back.svg', 'w', encoding='utf-8') as f:
    f.write(create_svg_back())

# Generate card faces
for suit_code, (suit_symbol, color) in suits.items():
    for rank in ranks:
        filename = f'src/main/resources/cards/{rank}{suit_code}.svg'
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(create_svg_card(rank, suit_symbol, color))

print("Card generation complete!") 