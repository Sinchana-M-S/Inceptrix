"""Update proposals with realistic data"""
import sys
sys.path.insert(0, 'c:\\Users\\jainj\\OneDrive\\Desktop\\last\\regulatory-sentinel')
from src.database.schema import get_session
from src.database.models import ChangeProposal

session = get_session()

# Get pending proposals
proposals = session.query(ChangeProposal).filter_by(status='PENDING').all()

# Define realistic diff summaries based on EU AI Act
summaries = [
    {
        'diff': 'Add mandatory bias monitoring and detection procedures for AI model training data. Implement quarterly bias audits with documented remediation plans.',
        'risk': 'HIGH',
        'clause': 'EU AI Act Article 10.2d - Bias Examination'
    },
    {
        'diff': 'Implement data quality validation gates before model training. Require statistical property documentation including representativeness metrics.',
        'risk': 'HIGH',
        'clause': 'EU AI Act Article 10.3 - Data Quality Requirements'
    },
    {
        'diff': 'Add data provenance tracking requirements. Document all data collection, annotation, labelling and cleaning operations with full audit trails.',
        'risk': 'MEDIUM',
        'clause': 'EU AI Act Article 10.2c - Data Processing Documentation'
    },
    {
        'diff': 'Include geographical and demographic context requirements. Ensure training data represents intended deployment regions and user populations.',
        'risk': 'MEDIUM',
        'clause': 'EU AI Act Article 10.4 - Contextual Adequacy'
    },
    {
        'diff': 'Implement pseudonymization requirements for special category personal data used in bias monitoring. Add encryption standards for sensitive data processing.',
        'risk': 'HIGH',
        'clause': 'EU AI Act Article 10.5 - Personal Data Safeguards'
    },
]

count = 0
for i, proposal in enumerate(proposals[:5]):
    if i < len(summaries):
        proposal.diff_summary = summaries[i]['diff']
        proposal.risk_level = summaries[i]['risk']
        proposal.regulation_clause = summaries[i]['clause']
        proposal.confidence = 0.88 + (i * 0.02)
        proposal.assumptions = ['Bank deploys AI for credit decisions', 'AI models trained on customer data', 'System processes EU citizen data']
        count += 1

session.commit()
print(f'Updated {count} proposals with realistic compliance gap data')
session.close()
