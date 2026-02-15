from reggenai.diff import generate_diff


def test_generate_diff_basic():
    a = "line1\nline2\nline3\n"
    b = "line1\nline2 changed\nline3\n"
    d = generate_diff(a, b)
    assert "line2" in d
    assert "changed" in d
