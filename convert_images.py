import os
import glob
from PIL import Image

assets_dir = 'assets/images'
index_file = 'index.html'

# Read index.html
with open(index_file, 'r', encoding='utf-8') as f:
    html_content = f.read()

converted_count = 0

# Walk through all files in assets/images
for root, _, files in os.walk(assets_dir):
    for file in files:
        if file.lower().endswith(('.jpg', '.jpeg', '.png')):
            orig_path = os.path.join(root, file)
            # Create new path with .webp extension
            name_without_ext = os.path.splitext(file)[0]
            new_path = os.path.join(root, name_without_ext + '.webp')
            
            try:
                # Convert image
                with Image.open(orig_path) as img:
                    img.save(new_path, 'webp', quality=80)
                
                # Update HTML content (replace the specific relative path)
                rel_orig_path = orig_path
                rel_new_path = new_path
                html_content = html_content.replace(rel_orig_path, rel_new_path)
                
                # Delete original
                os.remove(orig_path)
                converted_count += 1
                print(f"Converted: {orig_path} -> {new_path}")
            except Exception as e:
                print(f"Error converting {orig_path}: {e}")

# Write back updated HTML
with open(index_file, 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f"\nTotal images converted: {converted_count}")
