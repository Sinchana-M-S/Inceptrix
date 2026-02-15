import difflib
from typing import List


def generate_diff(old: str, new: str) -> str:
    old_lines = old.splitlines(keepends=True)
    new_lines = new.splitlines(keepends=True)
    diff = difflib.unified_diff(old_lines, new_lines, fromfile='current_policy', tofile='proposed_policy')
    return ''.join(diff)
