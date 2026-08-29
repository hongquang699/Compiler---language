import math

class FloatGrader:
    """Float comparator with relative and absolute tolerance."""
    def __init__(self, tolerance: float = 1e-6):
        self.tolerance = tolerance

    def check(self, test_input: str, expected_output: str, user_output: str) -> bool:
        u_toks = user_output.split()
        e_toks = expected_output.split()
        if len(u_toks) != len(e_toks):
            return False
        for u, e in zip(u_toks, e_toks):
            try:
                uf = float(u)
                ef = float(e)
                if not math.isclose(uf, ef, rel_tol=self.tolerance, abs_tol=self.tolerance):
                    return False
            except ValueError:
                if u != e:
                    return False
        return True
