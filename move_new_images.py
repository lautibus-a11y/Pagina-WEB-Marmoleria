import os
import glob
from PIL import Image

artifact_dir = '/Users/lauti/.gemini/antigravity-ide/brain/e474b1be-ac58-443e-9088-6aaad5aacbca'
dest_dir = 'assets/images/catalogo'

mappings = {
    'cafe_imperial': 'cafe-imperial.webp',
    'blanco_puro': 'blanco-puro.webp',
    'calacatta_': 'calacatta.webp',
    'gris_concrete': 'gris-concrete.webp',
    'negro_stellar': 'negro-stellar.webp'
}

for prefix, dest_name in mappings.items():
    # Find latest file matching prefix
    search_pattern = os.path.join(artifact_dir, f"{prefix}*.jpg")
    files = glob.glob(search_pattern)
    if files:
        latest_file = max(files, key=os.path.getmtime)
        dest_path = os.path.join(dest_dir, dest_name)
        
        try:
            with Image.open(latest_file) as img:
                img.save(dest_path, 'webp', quality=80)
            print(f"Converted and moved: {latest_file} -> {dest_path}")
        except Exception as e:
            print(f"Error processing {latest_file}: {e}")
    else:
        print(f"No file found for prefix {prefix}")

