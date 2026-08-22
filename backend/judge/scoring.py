from typing import Any, Dict, List


def score_result(result: Dict[str, Any], tests: List[Dict[str, Any]]) -> Dict[str, Any]:
    total_points = sum(float(test.get("points", 0)) for test in tests)
    earned_points = sum(
        float(test.get("points", 0))
        for test, outcome in zip(tests, result.get("test_results", []))
        if outcome.get("verdict") == "AC"
    )
    if not total_points:
        total_points = 100
        earned_points = 100 if result.get("overall_verdict") == "AC" else 0
    return {**result, "points": earned_points, "max_points": total_points}
