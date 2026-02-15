import re
import json
from reggenai.clauses import _build_extraction_prompt, validate_clause_list


def test_prompt_examples_are_valid_json_and_parse():
    prompt = _build_extraction_prompt("TEST DOC", doc_id="EX-TEST")
    # extract example JSON block
    m = re.search(r"Example output \(JSON array\):\n(\[.*?\])\n\nDocument \(id=", prompt, re.S)
    assert m, "Prompt should contain example JSON"
    example_json = m.group(1)
    parsed = json.loads(example_json)
    # Validate via helper
    valid, errors = validate_clause_list(parsed, "EX-TEST")
    assert not errors, f"Example JSON should validate against schema, got errors: {errors}"
    assert len(valid) >= 1


def test_validate_clause_list_reports_errors():
    raw = [ {}, {"text": ""}, {"text": "Valid clause", "clause_id": "c1"} ]
    valid, errors = validate_clause_list(raw, doc_id="doc1")
    assert len(valid) == 1
    assert len(errors) == 2
    assert errors[0]['index'] == 0
    assert errors[1]['index'] == 1


def test_example_array_contains_expected_clauses():
    prompt = _build_extraction_prompt("TEST DOC", doc_id="EX-TEST")
    m = re.search(r"Example output \(JSON array\):\n(\[.*?\])\n\nDocument \(id=", prompt, re.S)
    assert m
    example_json = m.group(1)
    parsed = json.loads(example_json)
    assert len(parsed) == 8
    valid, errors = validate_clause_list(parsed, "EX-TEST")
    assert not errors
    assert len(valid) == 8


def test_nested_definitions_in_examples():
    prompt = _build_extraction_prompt("TEST DOC", doc_id="EX-TEST")
    example_json = re.search(r"Example output \(JSON array\):\n(\[.*?\])\n\nDocument \(id=", prompt, re.S).group(1)
    parsed = json.loads(example_json)
    valid, errors = validate_clause_list(parsed, "EX-TEST")
    clause = next((c for c in valid if c.clause_id == 'ex-6'), None)
    assert clause is not None
    defs = clause.metadata.get('definitions', [])
    assert any(d['term'] == 'Data Controller' for d in defs)
    assert any(d['term'] == 'Controller' for d in defs)


def test_multi_sentence_deadline_parsing():
    prompt = _build_extraction_prompt("TEST DOC", doc_id="EX-TEST")
    example_json = re.search(r"Example output \(JSON array\):\n(\[.*?\])\n\nDocument \(id=", prompt, re.S).group(1)
    parsed = json.loads(example_json)
    valid, errors = validate_clause_list(parsed, "EX-TEST")
    clause = next((c for c in valid if c.clause_id == 'ex-5'), None)
    assert clause is not None
    assert any(d.get('days') == 1825 for d in clause.metadata.get('deadlines', []))


def test_conditional_obligation_deadline():
    prompt = _build_extraction_prompt("TEST DOC", doc_id="EX-TEST")
    example_json = re.search(r"Example output \(JSON array\):\n(\[.*?\])\n\nDocument \(id=", prompt, re.S).group(1)
    parsed = json.loads(example_json)
    valid, errors = validate_clause_list(parsed, "EX-TEST")
    clause = next((c for c in valid if c.clause_id == 'ex-7'), None)
    assert clause is not None
    assert any(d.get('days') == 14 for d in clause.metadata.get('deadlines', []))


def test_absolute_date_parsing_enrichment():
    raw = [{"text": "All providers must register by March 31, 2026.", "clause_id": "t1"}]
    valid, errors = validate_clause_list(raw, doc_id="doc-date")
    assert not errors
    assert valid[0].metadata['deadlines'][0]['date'] == '2026-03-31'


def test_multiple_definitions_enrichment():
    raw = [{"text": '"A" means alpha. "B" means beta.', "clause_id": "t2"}]
    valid, errors = validate_clause_list(raw, doc_id="doc-defs")
    assert not errors
    defs = valid[0].metadata['definitions']
    assert any(d['term'] == 'A' for d in defs)
    assert any(d['term'] == 'B' for d in defs)


def test_relative_deadline_parsing():
    raw = [{"text": "Submit report within 60 days of notice.", "clause_id": "t3"}]
    valid, errors = validate_clause_list(raw, doc_id="doc-rel")
    assert not errors
    assert any(d.get('days') == 60 for d in valid[0].metadata['deadlines'])
