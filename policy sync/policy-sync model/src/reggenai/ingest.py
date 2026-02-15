from typing import List


def extract_text_from_pdf(path: str) -> str:
    """Extracts text from a PDF file."""
    try:
        import pdfplumber
    except Exception as e:
        raise ImportError(
            "pdfplumber is required to extract text from PDFs. Install via `pip install pdfplumber`"
        ) from e

    texts: List[str] = []
    with pdfplumber.open(path) as pdf:
        for p in pdf.pages:
            texts.append(p.extract_text() or "")
    return "\n\n".join(texts)


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """Chunk text into overlapping windows for embeddings."""
    if not text:
        return []
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i+chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks
