"""
Constants and domain data for policy generation
"""

# Policy domains with detailed themes for generation
POLICY_THEMES = {
    "AI": [
        "AI Model Governance and Lifecycle Management",
        "Machine Learning Model Risk Assessment",
        "AI Bias and Fairness Monitoring",
        "Explainable AI Requirements",
        "AI Training Data Management",
        "Third-Party AI Vendor Assessment",
        "AI in Credit Decisioning",
        "Chatbot and Conversational AI Usage",
        "AI Model Documentation Standards",
        "AI Performance Monitoring"
    ],
    "AML": [
        "Anti-Money Laundering Program",
        "Suspicious Activity Reporting",
        "Customer Due Diligence",
        "Enhanced Due Diligence for High-Risk Customers",
        "Transaction Monitoring",
        "Sanctions Screening",
        "Correspondent Banking Due Diligence",
        "AML Training Requirements",
        "Politically Exposed Persons Screening",
        "Currency Transaction Reporting"
    ],
    "Credit Risk": [
        "Credit Risk Assessment Framework",
        "Loan Origination Standards",
        "Credit Limit Management",
        "Collateral Valuation",
        "Credit Concentration Risk",
        "Problem Loan Management",
        "Credit Scoring Model Governance",
        "Loan Loss Provisioning",
        "Credit Review and Approval Authority",
        "Counterparty Credit Risk"
    ],
    "Data Privacy": [
        "Data Protection and Privacy",
        "Personal Data Processing",
        "Data Subject Rights Management",
        "Cross-Border Data Transfer",
        "Data Retention and Disposal",
        "Privacy Impact Assessment",
        "Consent Management",
        "Data Breach Response",
        "Third-Party Data Sharing",
        "Employee Privacy"
    ],
    "Cybersecurity": [
        "Information Security Management",
        "Access Control and Identity Management",
        "Network Security",
        "Vulnerability Management",
        "Incident Response",
        "Security Awareness Training",
        "Encryption Standards",
        "Cloud Security",
        "Third-Party Security Assessment",
        "Penetration Testing"
    ],
    "Lending": [
        "Consumer Lending Standards",
        "Mortgage Lending",
        "Commercial Lending",
        "Fair Lending Practices",
        "Loan Documentation Requirements",
        "Underwriting Standards",
        "Loan Servicing",
        "Collections and Recovery",
        "Lending Limits and Approvals",
        "Small Business Lending"
    ],
    "Audit": [
        "Internal Audit Charter",
        "Audit Planning and Risk Assessment",
        "Audit Documentation Standards",
        "Audit Issue Management",
        "External Audit Coordination",
        "Audit Committee Reporting",
        "Quality Assurance Review",
        "Continuous Auditing",
        "Fraud Audit Procedures",
        "Compliance Testing"
    ],
    "Model Risk": [
        "Model Risk Management Framework",
        "Model Development Standards",
        "Model Validation Requirements",
        "Model Implementation Controls",
        "Model Performance Monitoring",
        "Model Inventory Management",
        "Vendor Model Assessment",
        "Model Documentation",
        "Model Change Management",
        "Stress Testing Models"
    ],
    "Payments": [
        "Payment Processing Controls",
        "Wire Transfer Procedures",
        "ACH Processing",
        "Card Processing Security",
        "Real-Time Payments",
        "Payment Fraud Prevention",
        "Cross-Border Payments",
        "Payment System Access",
        "Settlement and Reconciliation",
        "Digital Payment Services"
    ],
    "KYC": [
        "Know Your Customer Program",
        "Customer Identification Program",
        "Beneficial Ownership Identification",
        "Customer Risk Rating",
        "Ongoing Customer Monitoring",
        "KYC Refresh Requirements",
        "Documentary Evidence Standards",
        "Non-Face-to-Face Verification",
        "Legal Entity KYC",
        "High-Risk Customer Identification"
    ]
}

# Regulation mappings by domain
DOMAIN_REGULATIONS = {
    "AI": ["EU AI Act", "RBI AI Guidelines", "OCC Model Risk Management", "Fed SR 11-7"],
    "AML": ["Bank Secrecy Act", "USA PATRIOT Act", "FATF Recommendations", "EU AMLD", "RBI KYC/AML"],
    "Credit Risk": ["Basel III", "Basel IV", "CECL", "IFRS 9", "OCC Credit Risk"],
    "Data Privacy": ["GDPR", "CCPA", "DPDP Act", "GLBA", "RBI Data Localization"],
    "Cybersecurity": ["NIST CSF", "PCI DSS", "FFIEC Guidelines", "DORA", "RBI Cyber Security"],
    "Lending": ["TILA", "RESPA", "ECOA", "Fair Lending", "CRA"],
    "Audit": ["IIA Standards", "SOX", "PCAOB", "Basel III Pillar 3"],
    "Model Risk": ["Fed SR 11-7", "OCC 2011-12", "EU AI Act", "Basel III IRB"],
    "Payments": ["PSD2", "Regulation E", "UCC Article 4A", "RBI Payment Systems"],
    "KYC": ["CIP Rule", "FinCEN CDD Rule", "EU AMLD", "FATF Recommendations", "RBI KYC"]
}

# Policy section templates
POLICY_SECTIONS = [
    "1. PURPOSE",
    "2. SCOPE",
    "3. DEFINITIONS",
    "4. ROLES AND RESPONSIBILITIES",
    "5. POLICY REQUIREMENTS",
    "6. PROCEDURES",
    "7. CONTROLS",
    "8. MONITORING AND REPORTING",
    "9. EXCEPTIONS",
    "10. REVIEW AND APPROVAL",
    "11. REFERENCES",
    "12. VERSION HISTORY"
]

# Change types for diff engine
CHANGE_TYPES = [
    "New Mandatory Control",
    "Threshold Modification",
    "Process Enhancement",
    "Documentation Requirement",
    "Reporting Frequency Change",
    "Scope Expansion",
    "Role Assignment Change",
    "Compliance Timeline Update",
    "Risk Classification Change",
    "Governance Structure Update"
]

# Audit action types
AUDIT_ACTIONS = [
    "POLICY_GENERATED",
    "POLICY_UPDATED",
    "REGULATION_INGESTED",
    "CLAUSE_EXTRACTED",
    "IMPACT_ANALYZED",
    "DIFF_GENERATED",
    "REMEDIATION_PROPOSED",
    "PROPOSAL_APPROVED",
    "PROPOSAL_REJECTED",
    "PROPOSAL_MODIFIED",
    "WORKFLOW_STARTED",
    "WORKFLOW_COMPLETED",
    "HUMAN_REVIEW_REQUESTED",
    "SYSTEM_ERROR"
]
