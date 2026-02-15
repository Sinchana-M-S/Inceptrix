"""
Policy Corpus Generator Agent (Agent 1)
Generates 1000+ realistic enterprise bank policies
"""
import sys
import uuid
import json
import random
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from config import (
    MIN_POLICY_COUNT, POLICY_DOMAINS, SUPPORTED_REGULATIONS,
    RISK_LEVELS, OWNER_TEAMS, GOOGLE_API_KEY
)
from src.utils.constants import POLICY_THEMES, DOMAIN_REGULATIONS, POLICY_SECTIONS
from src.utils.prompts import POLICY_GENERATION_SYSTEM, POLICY_GENERATION_USER
from src.database.models import Policy, AuditLog
from src.database.schema import get_session, get_policy_count, init_db
from src.database.vector_store import get_vector_store
from src.services.embedding_service import get_embedding_service

# Try to import Gemini
try:
    import google.generativeai as genai
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


class PolicyGeneratorAgent:
    """
    Agent 1: Autonomous Policy Corpus Generator
    
    Responsibilities:
    - Generate 1000+ realistic bank policies
    - Ensure domain diversity
    - Insert into database
    - Generate embeddings for RAG
    
    Blocking: Cannot proceed to next phase until policy_count >= 1000
    """
    
    def __init__(self):
        self.use_llm = GENAI_AVAILABLE and bool(GOOGLE_API_KEY)
        self.embedding_service = get_embedding_service()
        self.vector_store = get_vector_store()
        
        if self.use_llm:
            self.model = genai.GenerativeModel('gemini-1.5-flash')
            print("✓ PolicyGeneratorAgent initialized with Gemini LLM")
        else:
            print("⚠ PolicyGeneratorAgent using template-based generation")
    
    def run(self, target_count: int = MIN_POLICY_COUNT) -> Dict[str, Any]:
        """
        Main execution: Generate and store policies
        
        Returns:
            {
                "status": "POLICY_DB_READY" | "FAILED",
                "record_count": int,
                "domains_covered": List[str]
            }
        """
        print(f"\n{'='*60}")
        print("AGENT 1: POLICY CORPUS GENERATOR")
        print(f"{'='*60}")
        print(f"Target: {target_count} policies")
        
        # Initialize database
        init_db()
        
        # Check existing count
        existing_count = get_policy_count()
        print(f"Existing policies: {existing_count}")
        
        if existing_count >= target_count:
            return {
                "status": "POLICY_DB_READY",
                "record_count": existing_count,
                "domains_covered": POLICY_DOMAINS,
                "message": "Policy database already meets minimum requirement"
            }
        
        # Calculate policies needed per domain
        policies_needed = target_count - existing_count
        policies_per_domain = policies_needed // len(POLICY_DOMAINS)
        remainder = policies_needed % len(POLICY_DOMAINS)
        
        generated_count = 0
        domain_counts = {domain: 0 for domain in POLICY_DOMAINS}
        
        session = get_session()
        
        try:
            for domain_idx, domain in enumerate(POLICY_DOMAINS):
                count_for_domain = policies_per_domain
                if domain_idx < remainder:
                    count_for_domain += 1
                
                themes = POLICY_THEMES.get(domain, [f"{domain} Policy"])
                regulations = DOMAIN_REGULATIONS.get(domain, ["General Regulation"])
                
                for i in range(count_for_domain):
                    theme = themes[i % len(themes)]
                    policy_id = f"POL-{existing_count + generated_count + 1:04d}"
                    
                    # Generate policy
                    policy_data = self._generate_policy(
                        policy_id=policy_id,
                        domain=domain,
                        theme=theme,
                        regulations=regulations
                    )
                    
                    # Create ORM object
                    policy = Policy(
                        policy_id=policy_data["policy_id"],
                        policy_name=policy_data["policy_name"],
                        policy_text=policy_data["policy_text"],
                        domain=policy_data["domain"],
                        mapped_regulations=policy_data["mapped_regulations"],
                        risk_level=policy_data["risk_level"],
                        owner_team=policy_data["owner_team"],
                        last_updated=datetime.fromisoformat(policy_data["last_updated"]),
                        version=policy_data["version"]
                    )
                    
                    session.add(policy)
                    
                    # Generate and store embedding
                    embedding = self.embedding_service.generate_embedding(
                        f"{policy.policy_name}\n{policy.policy_text[:2000]}"
                    )
                    
                    self.vector_store.add_policy_embeddings(
                        policy_ids=[policy_id],
                        texts=[f"{policy.policy_name}\n{policy.policy_text[:2000]}"],
                        embeddings=[embedding],
                        metadatas=[{
                            "domain": domain,
                            "risk_level": policy.risk_level,
                            "policy_name": policy.policy_name
                        }]
                    )
                    
                    generated_count += 1
                    domain_counts[domain] += 1
                    
                    # Progress update every 100 policies
                    if generated_count % 100 == 0:
                        print(f"  Generated {generated_count}/{policies_needed} policies...")
                        session.commit()
            
            # Final commit
            session.commit()
            
            # Log audit
            audit_log = AuditLog(
                log_id=str(uuid.uuid4()),
                action_type="POLICY_GENERATED",
                entity_type="policy_corpus",
                entity_id="bulk_generation",
                performed_by="SYSTEM",
                details={
                    "total_generated": generated_count,
                    "domain_distribution": domain_counts,
                    "target_count": target_count
                }
            )
            session.add(audit_log)
            session.commit()
            
            final_count = get_policy_count()
            
            print(f"\n✓ Policy generation complete!")
            print(f"  Total policies: {final_count}")
            print(f"  Domain distribution: {domain_counts}")
            
            return {
                "status": "POLICY_DB_READY" if final_count >= target_count else "PARTIAL",
                "record_count": final_count,
                "domains_covered": list(domain_counts.keys()),
                "domain_distribution": domain_counts
            }
            
        except Exception as e:
            session.rollback()
            print(f"✗ Policy generation failed: {e}")
            return {
                "status": "FAILED",
                "error": str(e),
                "record_count": get_policy_count(),
                "domains_covered": []
            }
        finally:
            session.close()
    
    def _generate_policy(
        self,
        policy_id: str,
        domain: str,
        theme: str,
        regulations: List[str]
    ) -> Dict[str, Any]:
        """Generate a single policy"""
        
        risk_level = random.choice(RISK_LEVELS)
        owner_team = random.choice(OWNER_TEAMS)
        selected_regulations = random.sample(regulations, min(3, len(regulations)))
        
        # Generate varied last_updated dates (simulate aging policies)
        days_ago = random.randint(30, 730)
        last_updated = datetime.now() - timedelta(days=days_ago)
        
        # Version varies with age
        if days_ago > 365:
            version = f"v{random.randint(1, 3)}.{random.randint(0, 5)}"
        else:
            version = f"v{random.randint(2, 5)}.{random.randint(0, 9)}"
        
        if self.use_llm:
            policy_text = self._generate_with_llm(domain, theme, selected_regulations, risk_level, owner_team)
        else:
            policy_text = self._generate_template_policy(domain, theme, selected_regulations, risk_level, owner_team)
        
        return {
            "policy_id": policy_id,
            "policy_name": f"{theme} Policy",
            "policy_text": policy_text,
            "domain": domain,
            "mapped_regulations": selected_regulations,
            "risk_level": risk_level,
            "owner_team": owner_team,
            "last_updated": last_updated.isoformat(),
            "version": version
        }
    
    def _generate_with_llm(
        self,
        domain: str,
        theme: str,
        regulations: List[str],
        risk_level: str,
        owner_team: str
    ) -> str:
        """Generate policy text using Gemini LLM"""
        try:
            prompt = POLICY_GENERATION_USER.format(
                domain=domain,
                theme=theme,
                regulations=", ".join(regulations),
                risk_level=risk_level,
                owner_team=owner_team
            )
            
            response = self.model.generate_content(
                f"{POLICY_GENERATION_SYSTEM}\n\n{prompt}",
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=2000,
                    temperature=0.7
                )
            )
            
            return response.text
        except Exception as e:
            print(f"  LLM generation failed, using template: {e}")
            return self._generate_template_policy(domain, theme, regulations, risk_level, owner_team)
    
    def _generate_template_policy(
        self,
        domain: str,
        theme: str,
        regulations: List[str],
        risk_level: str,
        owner_team: str
    ) -> str:
        """Generate policy using templates (fallback)"""
        
        policy_text = f"""
{theme.upper()} POLICY

Document ID: AUTO-GENERATED
Classification: INTERNAL USE ONLY
Risk Level: {risk_level}
Owner: {owner_team}

1. PURPOSE

This policy establishes the requirements, controls, and governance framework for {theme.lower()} within the Bank. It aims to ensure compliance with applicable regulations including {', '.join(regulations)}, while maintaining operational efficiency and risk management standards.

2. SCOPE

This policy applies to:
- All business units and subsidiaries of the Bank
- All employees, contractors, and third-party vendors
- All {domain.lower()}-related activities and systems
- Both domestic and international operations where applicable

3. DEFINITIONS

{domain} Controls: Specific measures implemented to manage {domain.lower()}-related risks.
Risk Assessment: The process of identifying, analyzing, and evaluating risks.
Compliance Officer: The designated individual responsible for policy oversight.
Material Threshold: Any activity exceeding $100,000 or affecting more than 1,000 customers.

4. ROLES AND RESPONSIBILITIES

4.1 Board of Directors
- Overall oversight of {domain.lower()} risk management
- Annual review and approval of this policy
- Ensuring adequate resources for compliance

4.2 {owner_team}
- Day-to-day implementation of policy requirements
- Monitoring and reporting on compliance status
- Escalation of material issues to senior management

4.3 First Line of Defense
- Implementation of required controls
- Documentation of activities and decisions
- Immediate reporting of incidents or exceptions

5. POLICY REQUIREMENTS

5.1 Risk Assessment
All {domain.lower()} activities must undergo risk assessment:
- Initial assessment before implementation
- Annual reassessment for existing activities
- Ad-hoc assessment when material changes occur
- Documentation of assessment methodology and results

5.2 Controls Framework
The following controls must be implemented:
a) Preventive Controls: Approval workflows, access restrictions, input validation
b) Detective Controls: Monitoring, audits, exception reporting
c) Corrective Controls: Incident response, remediation tracking

5.3 Monitoring Requirements
- Real-time monitoring for high-risk activities
- Weekly reviews of {domain.lower()} metrics
- Monthly reporting to senior management
- Quarterly reporting to Board/Committee

5.4 Documentation Standards
All activities must be documented including:
- Decision rationale and approvals
- Risk assessments and control evidence
- Exception requests and dispositions
- Audit trails and version history

6. PROCEDURES

6.1 Standard Operating Procedures
Detailed procedures for {theme.lower()} are maintained in the operational handbook and include step-by-step guidance for common scenarios.

6.2 Exception Handling
Exceptions to this policy require:
- Written justification with risk analysis
- Approval from {owner_team} leadership
- Time-limited exemption (maximum 90 days)
- Compensating controls during exception period

7. CONTROLS

7.1 Technical Controls
- System access controls with role-based permissions
- Encryption for data at rest and in transit
- Automated monitoring and alerting
- Audit logging for all critical functions

7.2 Operational Controls
- Segregation of duties for critical processes
- Dual approval for transactions above thresholds
- Regular reconciliation and verification
- Third-party assessments where required

8. MONITORING AND REPORTING

8.1 Key Risk Indicators (KRIs)
- Exception rate: Target < 5%
- Control effectiveness: Target > 95%
- Incident response time: Target < 4 hours
- Audit finding closure: Target < 30 days

8.2 Reporting Cadence
- Daily: Automated alerts for threshold breaches
- Weekly: Operational dashboard review
- Monthly: Management summary report
- Quarterly: Board-level reporting

9. EXCEPTIONS

All exceptions must be:
- Documented with business justification
- Approved by appropriate authority level
- Time-limited with review date
- Tracked in the exception register

10. REVIEW AND APPROVAL

This policy shall be reviewed:
- Annually at minimum
- Upon material regulatory changes
- Following significant incidents
- As directed by management or regulators

Approvals:
- Policy Owner: {owner_team} Director
- Compliance: Chief Compliance Officer
- Final Approval: Risk Committee

11. REFERENCES

- {chr(10).join([f'- {reg}' for reg in regulations])}
- Bank Risk Management Framework
- Enterprise Control Standards
- Incident Management Policy

12. VERSION HISTORY

This is an active policy document. For version history, refer to the document management system.

---
CONFIDENTIAL - FOR INTERNAL USE ONLY
"""
        return policy_text.strip()


if __name__ == "__main__":
    agent = PolicyGeneratorAgent()
    result = agent.run(target_count=100)  # Test with smaller count
    print(f"\nResult: {json.dumps(result, indent=2)}")
