from typing import Dict, Any, List

class IOIContestFormat:
    name: str = "IOI"

    @classmethod
    def calculate_subtask_score(cls, test_results: List[Dict[str, Any]], subtasks: List[Dict[str, Any]]) -> Dict[str, Any]:
        total_points = 0.0
        max_points = sum(st.get("points", 0) for st in subtasks) if subtasks else 100.0
        subtask_out = []

        for st in subtasks:
            st_id = st.get("subtask", 1)
            st_pts = float(st.get("points", 0))
            test_indices = st.get("test_indices", [])
            st_passed = True

            for idx in test_indices:
                t_idx = idx - 1
                if t_idx < 0 or t_idx >= len(test_results):
                    st_passed = False
                    break
                if test_results[t_idx].get("verdict") != "AC":
                    st_passed = False
                    break

            earned = st_pts if st_passed else 0.0
            total_points += earned
            subtask_out.append({
                "subtask": st_id,
                "points": earned,
                "max_points": st_pts,
                "passed": st_passed,
                "description": st.get("description", "")
            })

        return {
            "points": total_points,
            "max_points": max_points,
            "subtask_results": subtask_out
        }
