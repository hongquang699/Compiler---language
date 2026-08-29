from typing import Dict, Any, List

class ICPCContestFormat:
    name: str = "ICPC"
    penalty_per_failed_attempt: int = 20  # 20 minutes

    @classmethod
    def calculate_ranking(cls, user_submissions: List[Dict[str, Any]]) -> Dict[str, Any]:
        solved = 0
        total_penalty = 0
        problems_status: Dict[str, Dict[str, Any]] = {}

        for sub in user_submissions:
            p_code = sub.get("problem_code", "A")
            if p_code not in problems_status:
                problems_status[p_code] = {"solved": False, "attempts": 0, "time_min": 0}

            if problems_status[p_code]["solved"]:
                continue

            if sub.get("verdict") == "AC":
                problems_status[p_code]["solved"] = True
                problems_status[p_code]["time_min"] = sub.get("time_min", 0)
                solved += 1
                total_penalty += problems_status[p_code]["time_min"] + (problems_status[p_code]["attempts"] * cls.penalty_per_failed_attempt)
            else:
                problems_status[p_code]["attempts"] += 1

        return {
            "solved": solved,
            "penalty": total_penalty,
            "score": solved * 100,
            "problems": problems_status
        }
