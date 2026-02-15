from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os

app = FastAPI(title="Reg-GenAI API")

# Allow frontend (Vite dev server) to call this API from the browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# instantiate pipeline lazily to avoid heavy imports at module import time (helpful for tests)
pipeline = None

def get_pipeline():
    global pipeline
    if pipeline is None:
        from reggenai.pipeline import RegGenPipeline
        pipeline = RegGenPipeline()
    return pipeline

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.post("/ingest-policy")
async def ingest_policy(file: UploadFile = File(...), policy_id: str = Form("default")):
    path = os.path.join(UPLOAD_DIR, file.filename)
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    pl = get_pipeline()
    res = pl.ingest_policy_pdf(path, policy_id=policy_id)
    return JSONResponse(res)


@app.post("/ingest-regulation")
async def ingest_regulation(file: UploadFile = File(...), doc_id: str = Form(None)):
    path = os.path.join(UPLOAD_DIR, file.filename)
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    pl = get_pipeline()
    res = pl.ingest_regulation(path, doc_id=doc_id)
    return JSONResponse(res)


@app.get("/docs/{doc_id}/clauses")
def get_clauses(doc_id: str):
    pl = get_pipeline()
    clauses = pl.get_regulation_clauses(doc_id)
    # use Pydantic dicts for serialization
    return JSONResponse({"doc_id": doc_id, "clauses": [c.dict() for c in clauses]})


@app.post("/docs/{doc_id}/analyze")
async def analyze_document(doc_id: str):
    # trigger the multi-agent orchestration for the regulation document
    pl = get_pipeline()
    report = pl.process_regulation(doc_id)
    # return limited view by default; full audit can be fetched separately
    return JSONResponse({"doc_id": report['doc_id'], "clauses_count": len(report['clauses']), "summary": [{"clause_id": c['clause_id'], "diff_type": c['analysis']['diff'].get('type')} for c in report['clauses']]})


@app.get("/audit/{doc_id}")
def get_audit(doc_id: str):
    from reggenai.audit import read_audit
    entries = read_audit()
    filtered = [e for e in entries if e.get('doc_id') == doc_id]
    return JSONResponse({"doc_id": doc_id, "entries": filtered})


@app.get("/audit/{doc_id}/patches")
def get_patches(doc_id: str, status: str | None = None, limit: int = 100, offset: int = 0):
    # Prefer DB-backed patches when available
    try:
        from reggenai import db
        patches = db.get_patches_by_doc(doc_id, status=status, limit=limit, offset=offset)
    except Exception:
        from reggenai.audit import read_audit
        entries = read_audit()
        patches = [e for e in entries if e.get('doc_id') == doc_id and e.get('type') in ('proposal', 'accepted')]
    return JSONResponse({"doc_id": doc_id, "patches": patches})


@app.post("/patches/{patch_id}/review")
def review_patch(patch_id: str, review_action: str = Form(...), reviewer_id: str = Form(...), review_comments: str = Form(None), human_override: bool = Form(False)):
    try:
        from reggenai import db
        res = db.review_patch(patch_id, review_action, reviewer_id, review_comments, human_override)
        if not res:
            return JSONResponse({"error": "patch not found"}, status_code=404)
        # append audit entry
        from reggenai.audit import append_audit
        append_audit({
            'doc_id': None,
            'clause_id': None,
            'type': 'review',
            'patch': {'patch_id': patch_id},
            'agent': reviewer_id,
            'review_action': review_action,
            'review_comments': review_comments,
            'timestamp': None,
        })
        return JSONResponse(res)
    except Exception:
        return JSONResponse({"error": "failed to review patch"}, status_code=500)


@app.post("/patches/{patch_id}/apply")
def apply_patch_endpoint(patch_id: str, reviewer_id: str = Form(...), human_override: bool = Form(False)):
    try:
        from reggenai import db
        res = db.apply_patch(patch_id, reviewer_id, human_override=human_override)
        if not res:
            return JSONResponse({"error": "patch not found or not applicable"}, status_code=404)
        # append audit entry
        from reggenai.audit import append_audit
        append_audit({
            'doc_id': None,
            'clause_id': None,
            'type': 'applied',
            'patch': {'patch_id': patch_id},
            'agent': reviewer_id,
            'timestamp': None,
        })
        return JSONResponse(res)
    except Exception:
        return JSONResponse({"error": "failed to apply patch"}, status_code=500)


@app.post("/analyze-update")
async def analyze_update(law_text: str = Form(...), top_k: int = Form(5)):
    pl = get_pipeline()
    res = pl.analyze_law_update(law_text, top_k=top_k)
    return JSONResponse(res)


from pydantic import BaseModel
from typing import Optional
from reggenai.diffgen import generate_diff
from reggenai.utils import generate_unified_diff, compute_span_highlights
from reggenai.llm import LLMWrapper
from reggenai.audit import append_audit
import uuid


class SimulateDiffRequest(BaseModel):
    doc_id: Optional[str]
    clause_id: Optional[str]
    clause_text: str
    policy_id: Optional[str]
    policy_text: Optional[str]
    save: Optional[bool] = False


@app.post("/simulate/diff")
def simulate_diff(req: SimulateDiffRequest):
    # Use a lightweight dummy LLM for simulation to avoid heavy HF imports during test runs
    class DummyLLM:
        def generate(self, prompt: str, max_tokens: int = 512):
            return "{}"

    llm = DummyLLM()
    old_text = req.policy_text or ''
    diff = generate_diff(req.clause_text, old_text, llm)
    proposed = diff.get('proposed_policy_text') or ''
    unified = generate_unified_diff(old_text, proposed, fromfile='policy_old', tofile='policy_new')
    spans = compute_span_highlights(old_text, proposed)

    saved = False
    if req.save:
        patch = {
            'patch_id': str(uuid.uuid4()),
            'doc_id': req.doc_id,
            'clause_id': req.clause_id,
            'agent': 'simulate',
            'target': 'policy',
            'field': 'policy_text',
            'op': 'replace',
            'value': [{'policy_id': req.policy_id, 'policy_text': proposed}],
            'proposed_text': proposed,
            'rationale': diff.get('rationale'),
            'confidence': diff.get('confidence', 0.5),
            'round': 0,
        }
        append_audit({
            'doc_id': req.doc_id,
            'clause_id': req.clause_id,
            'type': 'proposal',
            'patch': patch,
            'agent': 'simulate',
            'timestamp': None,
        })
        saved = True

    return JSONResponse({
        'diff': diff,
        'unified_diff': unified,
        'span_highlights': spans,
        'saved': saved,
    })


@app.get("/health")
def health():
    return {"status": "ok"}
