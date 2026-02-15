"""
Regulatory Ingestion Agent (Agent 2)
Extracts and processes regulatory documents
"""
import sys
import uuid
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, List

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.database.models import Regulation, Clause, AuditLog
from src.database.schema import get_session
from src.database.vector_store import get_vector_store
from src.services.pdf_extractor import get_pdf_extractor
from src.services.clause_parser import get_clause_parser
from src.services.embedding_service import get_embedding_service


class RegulatoryIngestionAgent:
    """
    Agent 2: Regulatory Ingestion
    
    Responsibilities:
    - Extract text from PDFs (OCR if needed)
    - Segment into clauses
    - Normalize legal language
    - Generate clause IDs
    - Store in database and vector store
    """
    
    def __init__(self):
        self.pdf_extractor = get_pdf_extractor()
        self.clause_parser = get_clause_parser()
        self.embedding_service = get_embedding_service()
        self.vector_store = get_vector_store()
        print("✓ RegulatoryIngestionAgent initialized")
    
    def run(
        self,
        file_path: Optional[str] = None,
        raw_text: Optional[str] = None,
        regulation_name: str = "Unknown Regulation",
        regulation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Main execution: Ingest regulatory document
        
        Args:
            file_path: Path to PDF or text file
            raw_text: Raw regulation text (alternative to file)
            regulation_name: Name of the regulation
            regulation_id: Optional ID (auto-generated if not provided)
        
        Returns:
            {
                "status": "SUCCESS" | "FAILED",
                "regulation_id": str,
                "clause_count": int,
                "clauses": List[Dict]
            }
        """
        print(f"\n{'='*60}")
        print("AGENT 2: REGULATORY INGESTION")
        print(f"{'='*60}")
        print(f"Regulation: {regulation_name}")
        
        # Generate regulation ID if not provided
        if not regulation_id:
            regulation_id = self._generate_regulation_id(regulation_name)
        
        # Extract text
        if file_path:
            print(f"Extracting from: {file_path}")
            extraction = self.pdf_extractor.extract_text(file_path)
        elif raw_text:
            print(f"Processing raw text ({len(raw_text)} chars)")
            extraction = self.pdf_extractor.extract_from_text(raw_text)
        else:
            return {
                "status": "FAILED",
                "error": "No input provided (file_path or raw_text required)",
                "regulation_id": regulation_id,
                "clause_count": 0
            }
        
        if not extraction["success"]:
            return {
                "status": "FAILED",
                "error": extraction.get("error", "Extraction failed"),
                "regulation_id": regulation_id,
                "clause_count": 0
            }
        
        text = extraction["text"]
        print(f"  Extracted {len(text)} characters from {extraction['page_count']} pages")
        print(f"  Method: {extraction['extraction_method']}")
        
        # Parse clauses
        print("Parsing clauses...")
        clauses = self.clause_parser.parse_clauses(text, regulation_id)
        print(f"  Found {len(clauses)} clauses")
        
        # Store in database
        session = get_session()
        
        try:
            # Create regulation record
            regulation = Regulation(
                regulation_id=regulation_id,
                regulation_name=regulation_name,
                source_file=file_path,
                raw_text=text[:50000],  # Limit stored text
                ingestion_date=datetime.utcnow(),
                status="PROCESSED"
            )
            session.add(regulation)
            
            # Store clauses
            stored_clauses = []
            for clause_data in clauses:
                clause = Clause(
                    clause_id=clause_data["clause_id"],
                    regulation_id=regulation_id,
                    clause_number=clause_data.get("clause_number", ""),
                    clause_text=clause_data["clause_text"],
                    risk_tags=clause_data.get("risk_tags", [])
                )
                session.add(clause)
                stored_clauses.append(clause_data)
                
                # Generate and store embedding
                embedding = self.embedding_service.generate_embedding(
                    clause_data["clause_text"]
                )
                
                self.vector_store.add_clause_embeddings(
                    clause_ids=[clause_data["clause_id"]],
                    texts=[clause_data["clause_text"]],
                    embeddings=[embedding],
                    metadatas=[{
                        "regulation_id": regulation_id,
                        "clause_number": clause_data.get("clause_number", ""),
                        "risk_tags": clause_data.get("risk_tags", [])
                    }]
                )
            
            # Audit log
            audit = AuditLog(
                log_id=str(uuid.uuid4()),
                action_type="REGULATION_INGESTED",
                entity_type="regulation",
                entity_id=regulation_id,
                performed_by="SYSTEM",
                details={
                    "regulation_name": regulation_name,
                    "clause_count": len(clauses),
                    "extraction_method": extraction["extraction_method"],
                    "page_count": extraction["page_count"]
                }
            )
            session.add(audit)
            
            session.commit()
            
            print(f"\n✓ Regulation ingested successfully!")
            print(f"  ID: {regulation_id}")
            print(f"  Clauses stored: {len(stored_clauses)}")
            
            return {
                "status": "SUCCESS",
                "regulation_id": regulation_id,
                "regulation_name": regulation_name,
                "clause_count": len(stored_clauses),
                "clauses": stored_clauses,
                "extraction_info": {
                    "method": extraction["extraction_method"],
                    "pages": extraction["page_count"]
                }
            }
            
        except Exception as e:
            session.rollback()
            print(f"✗ Ingestion failed: {e}")
            return {
                "status": "FAILED",
                "error": str(e),
                "regulation_id": regulation_id,
                "clause_count": 0
            }
        finally:
            session.close()
    
    def _generate_regulation_id(self, name: str) -> str:
        """Generate a unique regulation ID from name"""
        # Normalize name
        normalized = name.upper()
        normalized = ''.join(c if c.isalnum() else '_' for c in normalized)
        normalized = '_'.join(filter(None, normalized.split('_')))
        
        # Add timestamp for uniqueness
        timestamp = datetime.now().strftime("%Y%m%d")
        
        return f"{normalized[:30]}_{timestamp}"
    
    def get_regulation(self, regulation_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a regulation with its clauses"""
        session = get_session()
        try:
            regulation = session.query(Regulation).filter_by(
                regulation_id=regulation_id
            ).first()
            
            if regulation:
                return {
                    **regulation.to_dict(),
                    "clauses": [c.to_dict() for c in regulation.clauses]
                }
            return None
        finally:
            session.close()
    
    def list_regulations(self) -> List[Dict[str, Any]]:
        """List all ingested regulations"""
        session = get_session()
        try:
            regulations = session.query(Regulation).all()
            return [r.to_dict() for r in regulations]
        finally:
            session.close()


if __name__ == "__main__":
    # Test with sample text
    sample_regulation = """
    EU AI ACT - SELECTED ARTICLES
    
    Article 10: Data and data governance
    
    1. High-risk AI systems which make use of techniques involving the training of models with data shall be developed on the basis of training, validation and testing data sets that meet the quality criteria referred to in paragraphs 2 to 5.
    
    2. Training, validation and testing data sets shall be subject to appropriate data governance and management practices. Those practices shall concern in particular:
    
    (a) the relevant design choices;
    (b) data collection processes;
    (c) relevant data preparation processing operations, such as annotation, labelling, cleaning, updating, enrichment and aggregation;
    (d) the formulation of relevant assumptions, notably with respect to the information that the data are supposed to measure and represent;
    (e) a prior assessment of the availability, quantity and suitability of the data sets that are needed;
    (f) examination in view of possible biases;
    
    3. Training, validation and testing data sets shall be relevant, representative, free of errors and complete. They shall have the appropriate statistical properties, including, where applicable, as regards the persons or groups of persons on which the high-risk AI system is intended to be used.
    
    Article 11: Technical documentation
    
    1. The technical documentation of a high-risk AI system shall be drawn up before that system is placed on the market or put into service and shall be kept up-to date.
    
    2. The technical documentation shall be drawn up in such a way as to demonstrate that the high-risk AI system complies with the requirements set out in this Section and provide national competent authorities and notified bodies with all the necessary information.
    """
    
    agent = RegulatoryIngestionAgent()
    result = agent.run(
        raw_text=sample_regulation,
        regulation_name="EU AI Act - Data Governance"
    )
    print(f"\nResult: {json.dumps(result, indent=2, default=str)}")
