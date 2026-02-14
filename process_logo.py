import os
from rembg import remove
from PIL import Image
import vtracer

input_path = r'C:/Users/david/Desktop/web-projects/commerce-management-system/public/logo-processed.png'
output_path_png = r'C:/Users/david/Desktop/web-projects/commerce-management-system/public/logo-processed.png'
output_path_svg = r'C:/Users/david/Desktop/web-projects/commerce-management-system/public/logo.svg'

def process_logo():
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    print(f"Loading {input_path}...")
    with open(input_path, 'rb') as i:
        input_image = i.read()
    
    print("Removing background (this may take a moment for the model to download)...")
    output_image = remove(input_image)
    
    with open(output_path_png, 'wb') as o:
        o.write(output_image)
    print(f"Saved transparent PNG to {output_path_png}")

    print("Vectorizing to SVG...")
    try:
        vtracer.convert_image_to_svg_py(
            output_path_png,
            output_path_svg,
            colormode='color',
            hierarchical='stacked',
            mode='spline',
            filter_speckle=4,
            color_precision=6,
            layer_difference=16,
            corner_threshold=60,
            length_threshold=4.0,
            max_iterations=10,
            splice_threshold=45,
            path_precision=3
        )
        print(f"Saved SVG to {output_path_svg}")
    except Exception as e:
        print(f"Error during vectorization: {e}")

if __name__ == "__main__":
    process_logo()
