import re
from typing import Optional

DURATION_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(years|year|yrs|yr|months|month|mos|mo|days|day)s?", flags=re.I)


def parse_duration_to_months(text: str) -> Optional[int]:
    """Find a duration in text and convert it to months. Returns first match in months or None."""
    if not text:
        return None
    m = DURATION_RE.search(text)
    if not m:
        return None
    num = float(m.group(1))
    unit = m.group(2).lower()
    if 'year' in unit or unit in ('yrs', 'yr'):
        return int(num * 12)
    if 'month' in unit or unit in ('mos', 'mo'):
        return int(num)
    if 'day' in unit or unit == 'day':
        # approximate days to months
        return max(1, int(num / 30))
    return None


def replace_first_duration_with_months(text: str, months: int) -> str:
    """Replace the first detected duration in text with a normalized '<months> months' string."""

    def _repl(match):
        return f"{months} months"

    new_text, n = DURATION_RE.subn(_repl, text, count=1)
    return new_text


def normalize_all_durations_to_months(text: str) -> str:
    """Normalize all durations in the text to months."""

    def _repl(match):
        num = float(match.group(1))
        unit = match.group(2).lower()
        if 'year' in unit or unit in ('yrs', 'yr'):
            months = int(num * 12)
        elif 'month' in unit or unit in ('mos', 'mo'):
            months = int(num)
        elif 'day' in unit or unit == 'day':
            months = max(1, int(num / 30))
        else:
            months = int(num)
        return f"{months} months"

    return DURATION_RE.sub(_repl, text)


# ----------------------
# Diff / highlight helpers
# ----------------------
import difflib
from typing import List, Dict
from difflib import SequenceMatcher


def generate_unified_diff(old: str, new: str, fromfile: str = 'old', tofile: str = 'new') -> str:
    """Return a unified diff string between old and new text."""
    old_lines = old.splitlines(keepends=True)
    new_lines = new.splitlines(keepends=True)
    return ''.join(difflib.unified_diff(old_lines, new_lines, fromfile=fromfile, tofile=tofile))


def compute_span_highlights(old: str, new: str) -> List[Dict[str, str]]:
    """Compute changed spans between old and new strings. Returns list of {old_from, old_to, old, new_from, new_to, new} with character indices."""
    sm = SequenceMatcher(a=old, b=new)
    spans = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            continue
        spans.append({
            'op': tag,
            'old_from': i1,
            'old_to': i2,
            'old': old[i1:i2],
            'new_from': j1,
            'new_to': j2,
            'new': new[j1:j2],
        })
    return spans
