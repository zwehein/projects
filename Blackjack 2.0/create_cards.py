from PIL import Image, ImageDraw, ImageFont
import os

# Create cards directory if it doesn't exist
cards_dir = 'src/main/resources/cards'
os.makedirs(cards_dir, exist_ok=True)

# Card dimensions
CARD_WIDTH = 140
CARD_HEIGHT = 190

def create_card(rank, suit, color):
    # Create a new image with white background
    img = Image.new('RGB', (CARD_WIDTH, CARD_HEIGHT), 'white')
    draw = ImageDraw.Draw(img)
    
    # Draw card border
    draw.rectangle([5, 5, CARD_WIDTH-6, CARD_HEIGHT-6], outline='black', width=2)
    
    # Draw rank and suit
    try:
        font = ImageFont.truetype("arial.ttf", 36)
    except:
        font = ImageFont.load_default()
    
    # Top left
    draw.text((15, 15), rank, fill=color, font=font)
    draw.text((15, 50), suit, fill=color, font=font)
    
    # Center
    draw.text((CARD_WIDTH//2-15, CARD_HEIGHT//2-25), suit, fill=color, font=font)
    
    # Bottom right (inverted)
    draw.text((CARD_WIDTH-30, CARD_HEIGHT-60), rank, fill=color, font=font)
    draw.text((CARD_WIDTH-30, CARD_HEIGHT-30), suit, fill=color, font=font)
    
    return img

def create_card_back():
    img = Image.new('RGB', (CARD_WIDTH, CARD_HEIGHT), '#2c3e50')
    draw = ImageDraw.Draw(img)
    
    # Draw border
    draw.rectangle([5, 5, CARD_WIDTH-6, CARD_HEIGHT-6], outline='#34495e', width=2)
    
    # Draw pattern
    try:
        font = ImageFont.truetype("arial.ttf", 24)
    except:
        font = ImageFont.load_default()
    
    draw.text((CARD_WIDTH//2-30, CARD_HEIGHT//2-15), '♠♣♥♦', fill='#3498db', font=font)
    
    return img

# Define card properties
ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
suits = {
    'H': ('♥', '#e74c3c'),  # Hearts - Red
    'D': ('♦', '#e74c3c'),  # Diamonds - Red
    'C': ('♣', '#2c3e50'),  # Clubs - Black
    'S': ('♠', '#2c3e50')   # Spades - Black
}

# Generate card back
card_back = create_card_back()
card_back.save(os.path.join(cards_dir, 'back.png'))

# Generate all cards
for suit_code, (suit_symbol, color) in suits.items():
    for rank in ranks:
        card = create_card(rank, suit_symbol, color)
        filename = f'{rank}{suit_code}.png'
        card.save(os.path.join(cards_dir, filename))

print("Card generation complete!") 