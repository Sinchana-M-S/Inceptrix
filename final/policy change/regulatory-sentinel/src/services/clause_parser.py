"""
Clause Parser Service
Segments regulatory text into individual clauses
"""
import sys
import re
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from config import GOOGLE_API_KEY
from src.utils.prompts import CLAUSE_EXTRACTION_SYSTEM, CLAUSE_EXTRACTION_USER

# Try to import Gemini
try:
    import google.generativeai as genai
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


class ClauseParser:
    """Parse regulatory text into structured clauses"""
    
    def __init__(self):
        self.use_llm = GENAI_AVAILABLE and bool(GOOGLE_API_KEY)
        
        if self.use_llm:
            self.model = genai.GenerativeModel('gemini-1.5-flash')
    
    def parse_clauses(self, text: str, regulation_id: str) -> List[Dict[str, Any]]:
        """
        Extract clauses from regulatory text
        
        Returns list of:
            {
                "clause_id": "REG_ART1_1",
                "clause_number": "Article 1(1)",
                "clause_text": "...",
                "risk_tags": ["AI", "Data"],
                "key_obligations": "..."
            }
        """
        if self.use_llm:
            return self._parse_with_llm(text, regulation_id)
        else:
            return self._parse_with_regex(text, regulation_id)
    
    def _parse_with_llm(self, text: str, regulation_id: str) -> List[Dict[str, Any]]:
        """Use LLM to extract clauses"""
        try:
            # Limit text to avoid token limits
            text_chunk = text[:15000] if len(text) > 15000 else text
            
            prompt = CLAUSE_EXTRACTION_USER.format(regulation_text=text_chunk)
            
            response = self.model.generate_content(
                f"{CLAUSE_EXTRACTION_SYSTEM}\n\n{prompt}",
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=4000,
                    temperature=0.3
                )
            )
            
            # Parse JSON from response
            response_text = response.text
            
            # Try to extract JSON array
            json_match = re.search(r'\[[\s\S]*\]', response_text)
            if json_match:
                clauses = json.loads(json_match.group())
                
                # Add clause IDs
                for i, clause in enumerate(clauses):
                    if 'clause_id' not in clause:
                        clause_num = clause.get('clause_number', f'CLAUSE_{i+1}')
                        clause['clause_id'] = f"{regulation_id}_{self._normalize_clause_id(clause_num)}"
                
                return clauses
            else:
                print("  Could not parse LLM response, falling back to regex")
                return self._parse_with_regex(text, regulation_id)
                
        except Exception as e:
            print(f"  LLM clause parsing failed: {e}")
            return self._parse_with_regex(text, regulation_id)
    
    def _parse_with_regex(self, text: str, regulation_id: str) -> List[Dict[str, Any]]:
        """Fallback regex-based clause extraction"""
        clauses = []
        
        # Common patterns for regulatory articles/sections
        patterns = [
            r'(Article\s+\d+[\.\d]*[a-z]?)\s*[\.\:]\s*([^\n]+(?:\n(?!Article\s+\d).*)*)',
            r'(Section\s+\d+[\.\d]*)\s*[\.\:]\s*([^\n]+(?:\n(?!Section\s+\d).*)*)',
            r'(\d+\.\d+\.?\d*)\s+([^\n]+(?:\n(?!\d+\.\d+\.).*)*)',
            r'(\([a-z]\))\s*([^\n]+(?:\n(?!\([a-z]\)).*)*)'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.MULTILINE | re.IGNORECASE)
            for match in matches:
                clause_num, clause_text = match
                clause_text = clause_text.strip()
                
                if len(clause_text) > 50:  # Skip very short matches
                    clauses.append({
                        "clause_id": f"{regulation_id}_{self._normalize_clause_id(clause_num)}",
                        "clause_number": clause_num.strip(),
                        "clause_text": clause_text[:2000],
                        "risk_tags": self._infer_risk_tags(clause_text),
                        "key_obligations": self._extract_obligations(clause_text)
                    })
        
        # If no pattern matches, split by paragraphs
        if not clauses:
            paragraphs = text.split('\n\n')
            for i, para in enumerate(paragraphs):
                para = para.strip()
                if len(para) > 100:
                    clauses.append({
                        "clause_id": f"{regulation_id}_PARA_{i+1}",
                        "clause_number": f"Paragraph {i+1}",
                        "clause_text": para[:2000],
                        "risk_tags": self._infer_risk_tags(para),
                        "key_obligations": self._extract_obligations(para)
                    })
        
        return clauses[:50]  # Limit to 50 clauses
    
    def _normalize_clause_id(self, clause_num: str) -> str:
        """Convert clause number to ID-safe string"""
        # Remove special chars, replace spaces with underscores
        normalized = re.sub(r'[^\w\s]', '', clause_num)
        normalized = re.sub(r'\s+', '_', normalized)
        return normalized.upper()[:30]
    
    def _infer_risk_tags(self, text: str) -> List[str]:
        """Infer risk domain tags from text"""
        tags = []
        text_lower = text.lower()
        
        tag_keywords = {
            "AI": ["artificial intelligence", "ai system", "machine learning", "algorithm", "automated decision"],
            "Data Privacy": ["personal data", "data protection", "privacy", "gdpr", "data subject"],
            "AML": ["money laundering", "suspicious", "aml", "kyc", "customer due diligence"],
            "Credit Risk": ["credit", "loan", "lending", "collateral", "default"],
            "Cybersecurity": ["security", "cyber", "encryption", "access control", "incident"],
            "Model Risk": ["model", "validation", "testing", "accuracy", "bias"],
            "Operational": ["operational", "process", "procedure", "control"],
            "Reporting": ["report", "disclosure", "notification", "transparency"]
        }
        
        for tag, keywords in tag_keywords.items():
            if any(kw in text_lower for kw in keywords):
                tags.append(tag)
        
        return tags if tags else ["General"]
    
    def _extract_obligations(self, text: str) -> str:
        """Extract key obligations from text"""
        obligation_patterns = [
            r'(shall|must|required to|obligated to)[^.]+\.',
            r'(ensure that|ensure the)[^.]+\.',
            r'(prohibited from|not permitted)[^.]+\.'
        ]
        
        obligations = []
        for pattern in obligation_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            obligations.extend(matches[:3])
        
        if obligations:
            return "; ".join(obligations[:3])
        else:
            # Return first sentence as summary
            first_sentence = text.split('.')[0] if '.' in text else text[:200]
            return first_sentence[:200]


# Singleton
_parser: Optional[ClauseParser] = None


def get_clause_parser() -> ClauseParser:
    global _parser
    if _parser is None:
        _parser = ClauseParser()
    return _parser
