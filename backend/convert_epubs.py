import os
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
import argparse

def epub_to_text(epub_path):
    """Convert EPUB file to plain text."""
    book = epub.read_epub(epub_path)
    chapters = []
    for item in book.get_items():
        if item.get_type() == ebooklib.ITEM_DOCUMENT:
            chapters.append(item.get_content())
    
    text = ""
    for html_content in chapters:
        soup = BeautifulSoup(html_content, 'html.parser')
        # Remove script and style elements
        for element in soup(["script", "style"]):
            element.extract()
        # Get text
        chapter_text = soup.get_text(separator='\n')
        # Add some spacing between paragraphs
        chapter_text = '\n\n'.join(line.strip() for line in chapter_text.split('\n') if line.strip())
        text += chapter_text + "\n\n"
    
    return text

def process_directory(input_dir, output_dir):
    """Process all EPUB files in a directory."""
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    for filename in os.listdir(input_dir):
        if filename.lower().endswith('.epub'):
            print(f"Processing {filename}...")
            filepath = os.path.join(input_dir, filename)
            try:
                text = epub_to_text(filepath)
                # Create output filename
                output_filename = os.path.splitext(filename)[0] + '.txt'
                output_path = os.path.join(output_dir, output_filename)
                
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(text)
                
                print(f"Created {output_path}")
            except Exception as e:
                print(f"Error processing {filename}: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Convert EPUB files to text.')
    parser.add_argument('--input_dir', required=True, help='Directory containing EPUB files')
    parser.add_argument('--output_dir', required=True, help='Directory to output text files')
    
    args = parser.parse_args()
    process_directory(args.input_dir, args.output_dir)