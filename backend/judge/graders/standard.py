class StandardGrader:
    """Whitespace-insensitive token-by-token comparator."""
    @staticmethod
    def check(test_input: str, expected_output: str, user_output: str) -> bool:
        return user_output.split() == expected_output.split()
