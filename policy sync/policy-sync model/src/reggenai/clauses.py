import os
import json
from typing import List
from .llm import LLMWrapper
from .models import Clause, ExtractionResult
from .ingest import extract_text_from_pdf

# Optional parsers
try:
    import docx  # python-docx
except Exception:
    docx = None

from bs4 import BeautifulSoup
import re
# Optional dependency
try:
    import dateparser
except Exception:
    dateparser = None


def extract_text_from_docx(path: str) -> str:
    if docx is None:
        raise RuntimeError("python-docx not installed")
    doc = docx.Document(path)
    paragraphs = [p.text for p in doc.paragraphs if p.text and p.text.strip()]
    return "\n\n".join(paragraphs)


def extract_text_from_html(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        html = f.read()
    soup = BeautifulSoup(html, "lxml")
    # remove scripts/styles
    for s in soup(["script", "style"]):
        s.decompose()
    text = soup.get_text(separator="\n\n")
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    return "\n\n".join(lines)


def _build_extraction_prompt(doc_text: str, doc_id: str) -> str:
    # Few-shot examples to guide the model toward consistent JSON output
    example = (
        "Example output (JSON array):\n"
        "[\n"
        "  {\n"
        "    \"clause_id\": \"ex-1\",\n"
        "    \"doc_id\": \"EXAMPLE-001\",\n"
        "    \"jurisdiction\": \"EU\",\n"
        "    \"authority\": \"EU Parliament\",\n"
        "    \"scope\": \"High-risk AI\",\n"
        "    \"enforcement_risk\": \"High\",\n"
        "    \"text\": \"Organizations must complete an impact assessment within 30 days.\",\n"
        "    \"page\": 12,\n"
        "    \"paragraph\": 3,\n"
        "    \"metadata\": {\n"
        "      \"deadlines\": [{\"text\": \"within 30 days\", \"type\": \"relative\", \"days\": 30, \"date\": null}],\n"
        "      \"definitions\": [{\"term\": \"High-risk AI\", \"definition\": \"models with significant safety risk\"}]\n"
        "    }\n"
        "  },\n"
        "  {\n"
        "    \"clause_id\": \"ex-2\",\n"
        "    \"doc_id\": \"EXAMPLE-001\",\n"
        "    \"jurisdiction\": \"US\",\n"
        "    \"authority\": \"SEC\",\n"
        "    \"scope\": \"All AI systems\",\n"
        "    \"enforcement_risk\": \"Medium\",\n"
        "    \"text\": \"By March 31, 2026, providers must register the model and submit documentation.\",\n"
        "    \"page\": 5,\n"
        "    \"paragraph\": 2,\n"
        "    \"metadata\": {\n"
        "      \"deadlines\": [{\"text\": \"By March 31, 2026\", \"type\": \"absolute\", \"days\": null, \"date\": \"2026-03-31\"}],\n"
        "      \"definitions\": []\n"
        "    }\n"
        "  },\n"
        "  {\n"
        "    \"clause_id\": \"ex-3\",\n"
        "    \"doc_id\": \"EXAMPLE-001\",\n"
        "    \"jurisdiction\": null,\n"
        "    \"authority\": null,\n"
        "    \"scope\": \"Data retention\",\n"
        "    \"enforcement_risk\": \"Low\",\n"
        "    \"text\": \"Definition: 'Model Provider' - an entity that trains or fine-tunes models.\",\n"
        "    \"page\": null,\n"
        "    \"paragraph\": null,\n"
        "    \"metadata\": {\n"
        "      \"deadlines\": [],\n"
        "      \"definitions\": [{\"term\": \"Model Provider\", \"definition\": \"an entity that trains or fine-tunes models\"}]\n"
        "    }\n"
        "  },\n"
        "  {\n"
        "    \"clause_id\": \"ex-4\",\n"
        "    \"doc_id\": \"EXAMPLE-001\",\n"
        "    \"jurisdiction\": \"IN\",\n"
        "    \"authority\": \"Central Bank\",\n"
        "    \"scope\": \"Operational resilience\",\n"
        "    \"enforcement_risk\": \"High\",\n"
        "    \"text\": \"No change required for legacy controls in scope.\",\n"
        "    \"page\": 20,\n"
        "    \"paragraph\": 1,\n"
        "    \"metadata\": {\"deadlines\": [], \"definitions\": []}\n"
        "  },\n"
        "  {\n"
        "    \"clause_id\": \"ex-5\",\n"
        "    \"doc_id\": \"EXAMPLE-001\",\n"
        "    \"jurisdiction\": \"CA\",\n"
        "    \"authority\": \"PIPEDA\",\n"
        "    \"scope\": \"Logging and retention\",\n"
        "    \"enforcement_risk\": \"Medium\",\n"
        "    \"text\": \"Providers must implement technical measures X and Y. They must retain logs within 5 years and ensure access controls are in place.\",\n"
        "    \"page\": 8,\n"
        "    \"paragraph\": 4,\n"
        "    \"metadata\": {\n"
        "      \"deadlines\": [{\"text\": \"within 5 years\", \"type\": \"relative\", \"days\": 1825, \"date\": null}],\n"
        "      \"definitions\": []\n"
        "    }\n"
        "  },\n"
        "  {\n"
        "    \"clause_id\": \"ex-6\",\n"
        "    \"doc_id\": \"EXAMPLE-001\",\n"
        "    \"jurisdiction\": \"UK\",\n"
        "    \"authority\": \"ICO\",\n"
        "    \"scope\": \"Definitions\",\n"
        "    \"enforcement_risk\": \"Medium\",\n"
        "    \"text\": \"\\\"Data Controller\\\" means the party that determines purposes and means. \\\"Controller\\\" refers to \\\"Data Controller\\\".\",\n"
        "    \"page\": 2,\n"
        "    \"paragraph\": 1,\n"
        "    \"metadata\": {\n"
        "      \"deadlines\": [],\n"
        "      \"definitions\": [{\"term\": \"Data Controller\", \"definition\": \"the party that determines purposes and means\"}, {\"term\": \"Controller\", \"definition\": \"refers to Data Controller\"}]\n"
        "    }\n"
        "  },\n"
        "  {\n"
        "    \"clause_id\": \"ex-7\",\n"
        "    \"doc_id\": \"EXAMPLE-001\",\n"
        "    \"jurisdiction\": \"EU\",\n"
        "    \"authority\": \"EBA\",\n"
        "    \"scope\": \"Conditional obligations\",\n"
        "    \"enforcement_risk\": \"High\",\n"
        "    \"text\": \"If a model is high-risk, the provider must notify the authority within 14 days and perform an enhanced assessment.\",\n"
        "    \"page\": 15,\n"
        "    \"paragraph\": 6,\n"
        "    \"metadata\": {\n"
        "      \"deadlines\": [{\"text\": \"within 14 days\", \"type\": \"relative\", \"days\": 14, \"date\": null}],\n"
        "      \"definitions\": []\n"
        "    }\n"
        "  },\n"
        "  {\n"
        "    \"clause_id\": \"ex-8\",\n"
        "    \"doc_id\": \"EXAMPLE-001\",\n"
        "    \"jurisdiction\": \"GLOBAL\",\n"
        "    \"authority\": null,\n"
        "    \"scope\": \"Lists and multi-sentence\",\n"
        "    \"enforcement_risk\": \"Low\",\n"
        "    \"text\": \"The following must be documented: (a) training dataset provenance; (b) model lineage; (c) access policy. No deadlines.\",\n"
        "    \"page\": 30,\n"
        "    \"paragraph\": 10,\n"
        "    \"metadata\": {\"deadlines\": [], \"definitions\": []}\n"
        "  }\n"
        "]\n\n"
    )

    return (
        "Extract structured clauses from the following regulatory document. "
        "For each clause, return a JSON array with objects that have the following fields:\n"
        "- clause_id (string)\n- doc_id (string)\n- jurisdiction (string|null)\n- authority (string|null)\n- scope (string|null)\n- enforcement_risk (string|null)\n- text (string)\n- page (int|null)\n- paragraph (int|null)\n- metadata (object) -- include keys: deadlines (array), definitions (array), other (object)\n\n"
        "IMPORTANT: For each clause try to identify and extract any DEADLINES (e.g., 'within 30 days', 'by March 31, 2026', 'no later than 60 days') and DEFINITIONS (e.g., '\"High-risk AI\" means ...').\n"
        "For DEADLINES add metadata.deadlines as an array of objects: {\n  'text': original_text,\n  'type': 'relative'|'absolute',\n  'days': integer|null,\n  'date': ISO8601|null\n}.\n"
        "For DEFINITIONS add metadata.definitions as an array of objects: { 'term': string, 'definition': string }.\n\n"
        "Return ONLY valid JSON that validates against the example schema. If a field is not present use null or empty arrays.\n\n"
        f"{example}"
        f"Document (id={doc_id}):\n\n{doc_text}\n\n"
        "Split the document into meaningful clauses; identify obligations, constraints, definitions, deadlines, jurisdiction, authority, scope, enforcement risk. "
        "If information is not present, use null for the field."
    )


def parse_deadlines(text: str):
    """Simple heuristic parser to find deadline phrases and normalize them."""
    results = []
    if not text:
        return results

    # Relative deadlines: 'within 30 days', 'no later than 60 days'
    for m in re.finditer(r"\b(within|no later than)\s+(\d+)\s+(day|days|month|months|year|years)\b", text, re.I):
        qty = int(m.group(2))
        unit = m.group(3).lower()
        days = qty * (30 if 'month' in unit else 365 if 'year' in unit else 1)
        results.append({
            'text': m.group(0),
            'type': 'relative',
            'days': days,
            'date': None
        })

    # First try stricter absolute date patterns to avoid capturing trailing words
    # e.g., 'By March 31, 2026' or 'By March 31 2026'
    for m in re.finditer(r"\b(?:by|on|effective)\s+([A-Za-z]{3,}\s+\d{1,2},\s*\d{4})", text, re.I):
        date_text = m.group(1).strip()
        parsed = None
        if dateparser is not None:
            parsed = dateparser.parse(date_text)
        else:
            from datetime import datetime
            try:
                parsed = datetime.strptime(date_text, '%B %d, %Y')
            except Exception:
                try:
                    parsed = datetime.strptime(date_text, '%b %d, %Y')
                except Exception:
                    parsed = None
        if parsed:
            try:
                date_iso = parsed.date().isoformat()
            except Exception:
                date_iso = parsed.isoformat()
            results.append({
                'text': m.group(0),
                'type': 'absolute',
                'days': None,
                'date': date_iso
            })

    # Also support month day year without comma: 'By March 31 2026'
    for m in re.finditer(r"\b(?:by|on|effective)\s+([A-Za-z]{3,}\s+\d{1,2}\s+\d{4})", text, re.I):
        date_text = m.group(1).strip()
        parsed = None
        if dateparser is not None:
            parsed = dateparser.parse(date_text)
        else:
            from datetime import datetime
            try:
                parsed = datetime.strptime(date_text, '%B %d %Y')
            except Exception:
                try:
                    parsed = datetime.strptime(date_text, '%b %d %Y')
                except Exception:
                    parsed = None
        if parsed:
            try:
                date_iso = parsed.date().isoformat()
            except Exception:
                date_iso = parsed.isoformat()
            results.append({
                'text': m.group(0),
                'type': 'absolute',
                'days': None,
                'date': date_iso
            })

    # Absolute dates commonly preceded by 'by' or 'no later than'
    for m in re.finditer(r"\b(by|on|effective)\s+([A-Za-z0-9,\-\s]+)(?:[\.;,\n]|$)", text, re.I):
        date_text = m.group(2).strip()
        parsed = None
        if dateparser is not None:
            parsed = dateparser.parse(date_text)
        else:
            # Best-effort fallback for common date formats like 'March 31, 2026'
            from datetime import datetime
            for fmt in ('%B %d, %Y', '%b %d, %Y', '%Y-%m-%d'):
                try:
                    parsed = datetime.strptime(date_text, fmt)
                    break
                except Exception:
                    parsed = None
        if parsed:
            try:
                date_iso = parsed.date().isoformat()
            except Exception:
                date_iso = parsed.isoformat()
            results.append({
                'text': m.group(0),
                'type': 'absolute',
                'days': None,
                'date': date_iso
            })
    return results


def extract_definitions(text: str):
    """Find quoted-term definitions like '"term" means ...' and 'Definition: term - ...'"""
    defs = []
    if not text:
        return defs

    # Pattern: "Term" means <definition>.
    for m in re.finditer(r'"([^"]+)"\s+(means|refers to|is defined as)\s+([^\.;\n]+)', text, re.I):
        term = m.group(1).strip()
        definition = m.group(3).strip()
        defs.append({'term': term, 'definition': definition})

    # Pattern: Definition: Term - definition
    for m in re.finditer(r"Definition[:\s]+([A-Za-z0-9\-\s]+)\s*[:\-]\s*([^\.;\n]+)", text, re.I):
        term = m.group(1).strip()
        definition = m.group(2).strip()
        defs.append({'term': term, 'definition': definition})

    return defs


def validate_clause_list(raw_list, doc_id):
    """Validate and coerce a list of raw clause dicts into Clause objects.
    Returns (valid_clauses, errors)"""
    from pydantic import ValidationError
    valid = []
    errors = []
    for idx, raw in enumerate(raw_list):
        if not isinstance(raw, dict):
            errors.append({"index": idx, "error": "not a dict"})
            continue
        raw.setdefault("doc_id", doc_id)
        if 'text' not in raw or not raw.get('text'):
            errors.append({"index": idx, "error": "missing text"})
            continue
        # Basic metadata enrichment
        metadata = raw.get('metadata') or {}
        text = raw.get('text', '')
        if 'deadlines' not in metadata:
            metadata['deadlines'] = parse_deadlines(text)
        if 'definitions' not in metadata:
            metadata['definitions'] = extract_definitions(text)
        raw['metadata'] = metadata

        if not raw.get('clause_id'):
            raw['clause_id'] = f"{doc_id}-c{idx+1}"

        try:
            clause = Clause.parse_obj({
                'clause_id': raw.get('clause_id'),
                'doc_id': raw.get('doc_id', doc_id),
                'jurisdiction': raw.get('jurisdiction'),
                'authority': raw.get('authority'),
                'scope': raw.get('scope'),
                'enforcement_risk': raw.get('enforcement_risk'),
                'text': raw.get('text'),
                'page': raw.get('page'),
                'paragraph': raw.get('paragraph'),
                'metadata': raw.get('metadata', {}),
            })
            valid.append(clause)
        except ValidationError as e:
            errors.append({"index": idx, "errors": e.errors()})
            continue
    return valid, errors


def extract_clauses_from_text(doc_text: str, doc_id: str, llm: LLMWrapper = None) -> ExtractionResult:
    if llm is None:
        llm = LLMWrapper()
    prompt = _build_extraction_prompt(doc_text, doc_id)
    resp = llm.generate(prompt, max_tokens=1500)

    # Try to parse JSON from the response robustly and validate with Pydantic
    parsed = sanitize_json_response(resp)

    valid_clauses, validation_errors = validate_clause_list(parsed, doc_id)
    import logging
    if validation_errors:
        logging.warning("Clause validation errors: %s", validation_errors)

    return ExtractionResult(doc_id=doc_id, clauses=valid_clauses)

def _repair_unescaped_text_quotes(s: str) -> str:
    # Heuristic: find occurrences of ""text"" : "..." and escape any internal unescaped quotes
    out = s
    idx = 0
    while True:
        m = re.search(r'"text"\s*:\s*"', out[idx:])
        if not m:
            break
        start = idx + m.start()
        val_start = start + m.end() - m.start()  # index of the opening quote of value
        # find closing '"' that marks end of value by scanning forward for '"' followed by ',' or '}'
        j = val_start
        while j < len(out):
            ch = out[j]
            if ch == '"' and out[j-1] != '\\':
                # potential end; check following char
                if j+1 < len(out) and out[j+1] in [',', '\n', '\r', '}', ']']:
                    # assume this ends the value
                    val_end = j
                    break
                # else might be an internal quote - escape it
                out = out[:j] + '\\"' + out[j+1:]
                j += 2
            else:
                j += 1
        idx = j
    return out


def sanitize_json_response(s: str):
    # First attempt direct load
    try:
        return json.loads(s)
    except Exception:
        pass
    # Try to extract first JSON array block
    m = re.search(r"(\[\s*\{.*\}\s*\])", s, re.S)
    if m:
        block = m.group(1)
        try:
            return json.loads(block)
        except Exception:
            # Attempt a best-effort repair for unescaped inner quotes in text fields
            repaired = _repair_unescaped_text_quotes(block)
            try:
                return json.loads(repaired)
            except Exception:
                pass
    # Try to find the first '[' and last ']' and parse between
    if '[' in s and ']' in s:
        start = s.find('[')
        end = s.rfind(']')
        candidate = s[start:end+1]
        try:
            return json.loads(candidate)
        except Exception:
            repaired = _repair_unescaped_text_quotes(candidate)
            try:
                return json.loads(repaired)
            except Exception:
                pass
    # No parsable JSON found
    return []



def extract_clauses_from_file(path: str, doc_id: str, llm: LLMWrapper = None) -> ExtractionResult:
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":
        text = extract_text_from_pdf(path)
    elif ext in [".docx"]:
        text = extract_text_from_docx(path)
    elif ext in [".html", ".htm"]:
        text = extract_text_from_html(path)
    else:
        # default: read as text file
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
    return extract_clauses_from_text(text, doc_id, llm=llm)
