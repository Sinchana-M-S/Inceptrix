"""
Semantic Diff Service
Generates before/after comparisons for policy changes
"""
import sys
import re
from pathlib import Path
from typing import List, Dict, Any, Tuple
from difflib import SequenceMatcher, unified_diff

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


class DiffService:
    """Generate semantic diffs for policy changes"""
    
    def generate_diff(
        self,
        before_text: str,
        after_text: str
    ) -> Dict[str, Any]:
        """
        Generate structured diff between before and after text
        
        Returns:
            {
                "similarity": float,
                "additions": List[str],
                "deletions": List[str],
                "modifications": List[Dict],
                "unified_diff": str
            }
        """
        # Calculate similarity
        similarity = SequenceMatcher(None, before_text, after_text).ratio()
        
        # Split into lines for comparison
        before_lines = before_text.split('\n')
        after_lines = after_text.split('\n')
        
        # Generate unified diff
        unified = list(unified_diff(
            before_lines,
            after_lines,
            fromfile='Before',
            tofile='After',
            lineterm=''
        ))
        
        # Extract additions, deletions, modifications
        additions = []
        deletions = []
        
        for line in unified:
            if line.startswith('+') and not line.startswith('+++'):
                additions.append(line[1:].strip())
            elif line.startswith('-') and not line.startswith('---'):
                deletions.append(line[1:].strip())
        
        # Filter out empty lines
        additions = [a for a in additions if a]
        deletions = [d for d in deletions if d]
        
        # Identify modifications (similar lines that changed)
        modifications = self._find_modifications(deletions, additions)
        
        return {
            "similarity": similarity,
            "additions": additions,
            "deletions": deletions,
            "modifications": modifications,
            "unified_diff": '\n'.join(unified)
        }
    
    def _find_modifications(
        self,
        deletions: List[str],
        additions: List[str]
    ) -> List[Dict[str, str]]:
        """Find lines that were modified (similar content)"""
        modifications = []
        used_additions = set()
        
        for deleted in deletions:
            best_match = None
            best_score = 0.6  # Minimum similarity threshold
            
            for i, added in enumerate(additions):
                if i in used_additions:
                    continue
                    
                score = SequenceMatcher(None, deleted, added).ratio()
                if score > best_score:
                    best_score = score
                    best_match = (i, added)
            
            if best_match:
                idx, added_text = best_match
                used_additions.add(idx)
                modifications.append({
                    "before": deleted,
                    "after": added_text,
                    "similarity": best_score
                })
        
        return modifications
    
    def highlight_changes(
        self,
        before_text: str,
        after_text: str
    ) -> Dict[str, List[str]]:
        """
        Identify specific types of changes
        
        Returns:
            {
                "added": ["new clauses or requirements"],
                "removed": ["deleted clauses"],
                "modified": ["changed thresholds or wording"]
            }
        """
        diff = self.generate_diff(before_text, after_text)
        
        # Categorize changes
        added = []
        removed = []
        modified = []
        
        # Process modifications
        for mod in diff["modifications"]:
            # Check if threshold changed
            before_nums = re.findall(r'\d+(?:\.\d+)?%?', mod["before"])
            after_nums = re.findall(r'\d+(?:\.\d+)?%?', mod["after"])
            
            if before_nums != after_nums:
                modified.append(f"Threshold changed: '{mod['before'][:100]}...' → '{mod['after'][:100]}...'")
            else:
                modified.append(f"Wording updated: '{mod['before'][:50]}...'")
        
        # Process pure additions
        for add in diff["additions"]:
            # Check if it wasn't part of a modification
            is_modification = any(
                add == mod["after"] for mod in diff["modifications"]
            )
            if not is_modification and len(add) > 20:
                added.append(add[:200])
        
        # Process pure deletions
        for delete in diff["deletions"]:
            is_modification = any(
                delete == mod["before"] for mod in diff["modifications"]
            )
            if not is_modification and len(delete) > 20:
                removed.append(delete[:200])
        
        return {
            "added": added[:10],  # Limit to top 10
            "removed": removed[:10],
            "modified": modified[:10]
        }
    
    def calculate_change_severity(
        self,
        highlighted: Dict[str, List[str]]
    ) -> str:
        """
        Calculate severity of changes
        
        Returns: "High" | "Medium" | "Low"
        """
        # Count significant changes
        total_changes = (
            len(highlighted["added"]) * 2 +  # Additions weighted higher
            len(highlighted["removed"]) * 2 +
            len(highlighted["modified"])
        )
        
        # Check for critical keywords
        critical_keywords = [
            "mandatory", "required", "must", "shall",
            "prohibited", "forbidden", "compliance",
            "audit", "penalty", "fine"
        ]
        
        all_text = ' '.join(
            highlighted["added"] +
            highlighted["removed"] +
            highlighted["modified"]
        ).lower()
        
        critical_count = sum(1 for kw in critical_keywords if kw in all_text)
        
        if total_changes >= 10 or critical_count >= 3:
            return "High"
        elif total_changes >= 5 or critical_count >= 1:
            return "Medium"
        else:
            return "Low"


# Singleton
_diff_service = None


def get_diff_service() -> DiffService:
    global _diff_service
    if _diff_service is None:
        _diff_service = DiffService()
    return _diff_service
