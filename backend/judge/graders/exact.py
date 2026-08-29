class ExactGrader:
    """Exact byte-for-byte output comparator."""
    @staticmethod
    def check(test_input: str, expected_output: str, user_output: str) -> bool:
        return user_output.replace("\r\n", "\n") == expected_output.replace("\r\n", "\n")
