"""
PDF and Text Extraction Service
Supports OCR for scanned PDFs and text extraction for digital PDFs
"""
import sys
import re
from pathlib import Path
from typing import List, Dict, Any, Optional

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Try to import PDF libraries
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False

try:
    from PIL import Image
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False


class PDFExtractor:
    """Extract text from PDF files with OCR fallback"""
    
    def __init__(self):
        self.has_pymupdf = PYMUPDF_AVAILABLE
        self.has_ocr = OCR_AVAILABLE
        
        if not self.has_pymupdf:
            print("⚠ PyMuPDF not available, PDF extraction limited")
    
    def extract_text(self, file_path: str) -> Dict[str, Any]:
        """
        Extract text from a PDF file
        
        Returns:
            {
                "success": bool,
                "text": str,
                "page_count": int,
                "extraction_method": "digital" | "ocr" | "fallback",
                "metadata": dict
            }
        """
        path = Path(file_path)
        
        if not path.exists():
            return {
                "success": False,
                "error": f"File not found: {file_path}",
                "text": "",
                "page_count": 0
            }
        
        if path.suffix.lower() != ".pdf":
            # Try to read as plain text
            return self._extract_text_file(path)
        
        if not self.has_pymupdf:
            return {
                "success": False,
                "error": "PyMuPDF not installed",
                "text": "",
                "page_count": 0
            }
        
        try:
            doc = fitz.open(str(path))
            text_parts = []
            ocr_pages = 0
            
            for page_num, page in enumerate(doc):
                # Try direct text extraction first
                page_text = page.get_text()
                
                if page_text.strip():
                    text_parts.append(f"--- Page {page_num + 1} ---\n{page_text}")
                elif self.has_ocr:
                    # Fallback to OCR for scanned pages
                    pix = page.get_pixmap()
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    ocr_text = pytesseract.image_to_string(img)
                    if ocr_text.strip():
                        text_parts.append(f"--- Page {page_num + 1} (OCR) ---\n{ocr_text}")
                        ocr_pages += 1
            
            doc.close()
            
            full_text = "\n\n".join(text_parts)
            
            return {
                "success": True,
                "text": full_text,
                "page_count": len(text_parts),
                "extraction_method": "ocr" if ocr_pages > 0 else "digital",
                "ocr_pages": ocr_pages,
                "metadata": {
                    "filename": path.name,
                    "file_size": path.stat().st_size
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "text": "",
                "page_count": 0
            }
    
    def _extract_text_file(self, path: Path) -> Dict[str, Any]:
        """Extract from plain text file"""
        try:
            with open(path, 'r', encoding='utf-8') as f:
                text = f.read()
            
            return {
                "success": True,
                "text": text,
                "page_count": 1,
                "extraction_method": "text",
                "metadata": {
                    "filename": path.name,
                    "file_size": path.stat().st_size
                }
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "text": "",
                "page_count": 0
            }
    
    def extract_from_text(self, text: str) -> Dict[str, Any]:
        """Wrap raw text input in standard format"""
        return {
            "success": True,
            "text": text,
            "page_count": 1,
            "extraction_method": "raw_text",
            "metadata": {
                "char_count": len(text)
            }
        }


# Singleton
_extractor: Optional[PDFExtractor] = None


def get_pdf_extractor() -> PDFExtractor:
    global _extractor
    if _extractor is None:
        _extractor = PDFExtractor()
    return _extractor
