from typing import Any, Dict, List, Optional
import json


def score_result(
    result: Dict[str, Any],
    tests: List[Dict[str, Any]],
    subtasks: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    test_results = result.get("test_results", [])
    
    # Check if subtasks are defined
    if subtasks and len(subtasks) > 0:
        subtask_scores = []
        total_max_points = 0.0
        earned_total = 0.0
        overall_ac = True

        for idx, st in enumerate(subtasks, 1):
            st_points = float(st.get("points", 0))
            total_max_points += st_points
            raw_indices = st.get("test_indices") or st.get("test_indices_json") or []
            if isinstance(raw_indices, str):
                try:
                    raw_indices = json.loads(raw_indices)
                except Exception:
                    raw_indices = []

            # If no indices specified, assume all or map by index
            st_passed = True
            st_tests_count = 0
            for t_idx in raw_indices:
                # 1-indexed test ID
                if 1 <= t_idx <= len(test_results):
                    st_tests_count += 1
                    if test_results[t_idx - 1].get("verdict") != "AC":
                        st_passed = False
                        overall_ac = False
            
            if st_tests_count == 0:
                # Fallback: if no test indices, check if any test failed
                st_passed = all(t.get("verdict") == "AC" for t in test_results)

            st_earned = st_points if st_passed else 0.0
            earned_total += st_earned
            subtask_scores.append({
                "subtask": idx,
                "description": st.get("description", f"Subtask {idx}"),
                "passed": st_passed,
                "points": st_earned,
                "max_points": st_points
            })

        if total_max_points == 0:
            total_max_points = 100.0
            earned_total = 100.0 if result.get("overall_verdict") == "AC" else 0.0

        return {
            **result,
            "points": round(earned_total, 2),
            "max_points": round(total_max_points, 2),
            "subtask_results": subtask_scores
        }

    # Standard test scoring
    total_points = sum(float(test.get("points", 0)) for test in tests)
    earned_points = sum(
        float(test.get("points", 0))
        for test, outcome in zip(tests, test_results)
        if outcome.get("verdict") == "AC"
    )
    if not total_points:
        total_points = 100.0
        earned_points = 100.0 if result.get("overall_verdict") == "AC" else round((result.get("passed_tests", 0) / max(1, len(tests))) * 100.0, 2)

    return {**result, "points": round(earned_points, 2), "max_points": round(total_points, 2)}

