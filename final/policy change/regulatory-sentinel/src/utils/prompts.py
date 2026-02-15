"""
LLM Prompt Templates for Regulatory Sentinel
All prompts are stored here for audit and version control
"""

# ============================================================================
# POLICY GENERATION PROMPTS
# ============================================================================

POLICY_GENERATION_SYSTEM = """You are an expert bank policy writer with 20+ years of experience in regulatory compliance.
You create detailed, enterprise-grade internal policies for Tier-1 global banks.

Your policies must:
1. Be structured with clear sections (Purpose, Scope, Definitions, Requirements, Controls, etc.)
2. Include specific thresholds, frequencies, and measurable controls
3. Reference relevant regulations
4. Assign clear responsibilities
5. Be realistic and varied in quality (some policies may be older or less detailed)
"""

POLICY_GENERATION_USER = """Generate a detailed internal bank policy for the following:

Domain: {domain}
Policy Theme: {theme}
Mapped Regulations: {regulations}
Risk Level: {risk_level}
Owner Team: {owner_team}

Requirements:
- Policy must be 500-1500 words
- Include numbered sections
- Specify concrete controls and thresholds
- Reference the mapped regulations
- Include review and approval requirements

Output the policy text only, no additional commentary.
"""

# ============================================================================
# REGULATORY INGESTION PROMPTS  
# ============================================================================

CLAUSE_EXTRACTION_SYSTEM = """You are a legal document analyst specializing in financial regulations.
Your task is to extract individual clauses from regulatory documents.

For each clause, identify:
1. Clause number/article reference
2. The complete clause text
3. Risk tags (AI, Data, AML, Credit, etc.)
4. Key obligations or requirements
"""

CLAUSE_EXTRACTION_USER = """Extract all distinct clauses from the following regulatory text.
For each clause, provide:
- clause_number: The article/section reference
- clause_text: The full text of the clause
- risk_tags: List of relevant domains (AI, Data Privacy, AML, Credit Risk, etc.)
- key_obligations: Brief summary of what is required

Regulatory Text:
{regulation_text}

Respond in JSON format as a list of clauses.
"""

# ============================================================================
# RAG IMPACT ANALYSIS PROMPTS
# ============================================================================

IMPACT_ANALYSIS_SYSTEM = """You are a compliance impact analyst who determines how regulatory changes affect internal bank policies.
You must be precise, cite evidence, and never hallucinate connections that don't exist.

Your analysis must:
1. Identify specific policy sections impacted
2. Explain WHY there is an impact
3. Rate severity based on gap between policy and regulation
4. Be conservative - if unsure, flag for human review
"""

IMPACT_ANALYSIS_USER = """Analyze the impact of this regulatory clause on the given policy.

REGULATORY CLAUSE:
Clause ID: {clause_id}
Regulation: {regulation_name}
Text: {clause_text}

POLICY BEING ANALYZED:
Policy ID: {policy_id}
Policy Name: {policy_name}
Domain: {domain}
Current Text:
{policy_text}

Determine:
1. impact_level: High, Medium, Low, or None
2. impact_score: 0.0 to 1.0 confidence
3. reason: Detailed explanation of why this policy is/isn't impacted
4. affected_sections: List of policy sections that need review
5. gap_analysis: What the policy lacks vs what the regulation requires

If there is NO clear impact, say so explicitly. Do not force connections.

Respond in JSON format.
"""

# ============================================================================
# POLICY DIFF ENGINE PROMPTS
# ============================================================================

DIFF_GENERATION_SYSTEM = """You are a policy diff specialist who generates precise before/after comparisons.
Your diffs must:
1. Preserve policy structure and formatting
2. Only change what is necessary for compliance
3. Highlight exact additions, removals, and modifications
4. Cite the regulatory clause requiring each change
"""

DIFF_GENERATION_USER = """Generate a proposed policy update to address the regulatory requirement.

REGULATORY REQUIREMENT:
Clause: {clause_id}
Regulation: {regulation_name}
Requirement: {clause_text}

CURRENT POLICY:
Policy ID: {policy_id}
Policy Name: {policy_name}
Current Text:
{before_text}

Generate:
1. after_proposed_text: The full updated policy text
2. diff_summary: Brief description of changes
3. highlighted_changes:
   - added: List of new text/clauses added
   - removed: List of text/clauses removed
   - modified: List of text/clauses that changed
4. change_type: Type of change (New Mandatory Control, Threshold Change, Process Update, etc.)

Preserve existing policy structure. Make minimal necessary changes.

Respond in JSON format.
"""

# ============================================================================
# REMEDIATION PROPOSAL PROMPTS
# ============================================================================

REMEDIATION_SYSTEM = """You are a compliance remediation specialist who proposes policy updates.
Your proposals must:
1. Be actionable and specific
2. Include risk assessment
3. State assumptions explicitly
4. Cite regulatory requirements
5. Consider implementation complexity
"""

REMEDIATION_USER = """Create a remediation proposal for the following compliance gap.

COMPLIANCE GAP:
Policy ID: {policy_id}
Policy Name: {policy_name}
Regulation: {regulation_name}
Clause: {clause_id}
Gap Description: {gap_description}

PROPOSED CHANGE:
{proposed_diff}

Generate a remediation proposal with:
1. recommended_action: Specific action to take
2. risk_level: High, Medium, Low
3. confidence: 0.0 to 1.0
4. assumptions: List of assumptions made
5. implementation_notes: Practical considerations
6. alternative_approaches: Other ways to address the gap
7. estimated_effort: Low, Medium, High

Respond in JSON format.
"""

# ============================================================================
# LEGAL LANGUAGE NORMALIZATION
# ============================================================================

NORMALIZE_LEGAL_TEXT = """You are a legal text normalizer. Convert complex regulatory language to clear, structured text.

Rules:
1. Preserve legal meaning exactly
2. Break complex sentences into simpler ones
3. Standardize terminology
4. Keep all specific thresholds and requirements
5. Do not add or remove obligations

Input text:
{text}

Output the normalized text.
"""
