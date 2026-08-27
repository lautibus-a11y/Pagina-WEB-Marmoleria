import re
import os

folder = "/Users/lauti/Documents/GitHub/Pagina-WEB-Marmoleria/assets/images/catalogo/neolitih"
files = [f for f in os.listdir(folder) if f.endswith(".webp")]

entries = []
for f in sorted(files):
    name = f.replace(".webp", "").replace("_", " ").strip().upper()
    img_path = f"assets/images/catalogo/neolitih/{f}"
    entry = f"    {{ name:'{name}', cat:'NEOLITH', tag:'SUPERFICIE · NEOLITH', img:'{img_path}', seed:'p-neoli', desc:'Superficie ultracompacta sinterizada de alto rendimiento y diseño.' }},"
    entries.append(entry)

entries_str = "\n".join(entries)

html_path = "/Users/lauti/Documents/GitHub/Pagina-WEB-Marmoleria/index.html"
with open(html_path, "r", encoding="utf-8") as file:
    content = file.read()

# Find the end of PRODUCTS array
# It ends with:
#     { name:'CONCRETE DARK', ... }
#   ];

match = re.search(r"(\s*\{ name:'CONCRETE DARK'.*?\n)(\s*\];)", content)
if match:
    # replace the last item (add a comma to it) and then append the new entries
    last_item = match.group(1).rstrip() + ",\n"
    new_block = last_item + entries_str
    # remove the trailing comma from the last new entry
    new_block = new_block.rstrip(",") + "\n" + match.group(2)
    content = content[:match.start()] + new_block + content[match.end():]
    with open(html_path, "w", encoding="utf-8") as file:
        file.write(content)
    print("Success: added 34 Neolith products.")
else:
    print("Error: Could not find the end of the PRODUCTS array.")
