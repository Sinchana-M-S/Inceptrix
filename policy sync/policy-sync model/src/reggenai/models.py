from pydantic import BaseModel, Field
from typing import Optional, Dict


class Clause(BaseModel):
    clause_id: str
    doc_id: str
    jurisdiction: Optional[str]
    authority: Optional[str]
    scope: Optional[str]
    enforcement_risk: Optional[str]
    text: str
    page: Optional[int]
    paragraph: Optional[int]
    metadata: Optional[Dict] = Field(default_factory=dict)


class ExtractionResult(BaseModel):
    doc_id: str
    clauses: list[Clause] = []
