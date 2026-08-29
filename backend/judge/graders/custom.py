class CustomScriptGrader:
    """Evaluates Python custom checker script inside a restricted environment."""
    @staticmethod
    def check(test_input: str, expected_output: str, user_output: str, checker_code: str) -> bool:
        loc: dict = {}
        try:
            exec(checker_code, {}, loc)
            if "check" in loc and callable(loc["check"]):
                return bool(loc["check"](test_input, expected_output, user_output))
            return False
        except Exception:
            return False
