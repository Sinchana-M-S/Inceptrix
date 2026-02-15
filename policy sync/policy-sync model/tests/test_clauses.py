from reggenai.clauses import extract_clauses_from_text
from reggenai.models import Clause


class DummyLLM:
    def generate(self, prompt: str, max_tokens: int = 512):
        # Return a simple JSON payload matching expected schema
        return '[{"clause_id": "c1", "jurisdiction": "EU", "authority": "EU Parliament", "scope": "All", "enforcement_risk": "High", "text": "Organizations must perform impact assessments for high-risk models within 30 days. \"High-risk AI\" means models with significant safety risk.", "page": 12, "paragraph": 3}]'


class DummyLLMNoMeta:
    def generate(self, prompt: str, max_tokens: int = 512):
        # Return clause without metadata to test enrichment
        return '[{"clause_id": "c2", "jurisdiction": "EU", "authority": "EU Parliament", "scope": "All", "enforcement_risk": "High", "text": "Providers must complete an impact assessment within 30 days. \"High-risk AI\" means models that could cause physical harm.", "page": 1, "paragraph": 1}]'


class DummyLLMMalformed:
    def generate(self, prompt: str, max_tokens: int = 512):
        # Returns explanatory text plus a JSON snippet (common LLM behavior)
        return 'Here are the clauses:\n[{"clause_id": "c3", "text": "Test clause with a deadline within 60 days.", "page": "5", "paragraph": "2"}]\nPlease review.'


class DummyLLMBadTypes:
    def generate(self, prompt: str, max_tokens: int = 512):
        # page/paragraph are strings that can be coerced to ints by Pydantic
        return '[{"clause_id": "c4", "text": "Clause with page and paragraph as strings.", "page": "8", "paragraph": "2"}]'

def test_extract_clauses_from_text_basic():
    text = "Organizations must perform impact assessments for high-risk models within 30 days." * 2
    result = extract_clauses_from_text(text, doc_id="eu-ai-act", llm=DummyLLM())
    assert result.doc_id == "eu-ai-act"
    assert len(result.clauses) == 1
    c = result.clauses[0]
    assert isinstance(c, Clause)
    assert c.jurisdiction == "EU"
    assert "impact assessments" in c.text


def test_deadline_and_definition_parsing():
    result = extract_clauses_from_text("Providers must complete an impact assessment within 30 days. \"High-risk AI\" means models that could cause physical harm.", doc_id="eu-ai-act", llm=DummyLLMNoMeta())
    assert len(result.clauses) == 1
    c = result.clauses[0]
    # metadata enriched
    assert 'deadlines' in c.metadata
    assert isinstance(c.metadata['deadlines'], list)
    assert any(d.get('days') == 30 for d in c.metadata['deadlines'])
    assert 'definitions' in c.metadata
    assert isinstance(c.metadata['definitions'], list)
    assert any(dd.get('term') == 'High-risk AI' for dd in c.metadata['definitions'])


def test_malformed_json_handling_and_coercion():
    result = extract_clauses_from_text("Dummy", doc_id="doc-malformed", llm=DummyLLMMalformed())
    assert len(result.clauses) == 1
    c = result.clauses[0]
    # page and paragraph should be coerced to ints by pydantic
    assert c.page == 5
    assert c.paragraph == 2


def test_bad_types_are_coerced():
    result = extract_clauses_from_text("Dummy", doc_id="doc-badtypes", llm=DummyLLMBadTypes())
    assert len(result.clauses) == 1
    c = result.clauses[0]
    assert c.page == 8
    assert c.paragraph == 2
