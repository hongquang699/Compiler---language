from typing import Dict, Any, List

class VNOJContestFormat:
    name: str = "VNOJ"
    penalty_minutes: int = 5

    @classmethod
    def calculate_participation(cls, submissions: List[Dict[str, Any]], penalty: int = 5) -> Dict[str, Any]:
        cumtime = 0
        score = 0.0
        prob_best: Dict[str, Dict[str, Any]] = {}

        for sub in submissions:
            p_code = sub.get("problem_code", "A")
            pts = float(sub.get("score", 0.0))
            sub_time = sub.get("time_min", 0)

            if p_code not in prob_best or pts > prob_best[p_code]["points"]:
                prob_best[p_code] = {"points": pts, "time": sub_time, "failed_count": 0}
            elif pts == prob_best[p_code]["points"] and pts == 0:
                prob_best[p_code]["failed_count"] += 1

        for p_code, info in prob_best.items():
            score += info["points"]
            if info["points"] > 0:
                cumtime += info["time"] + (info["failed_count"] * penalty)

        return {
            "score": score,
            "cumtime": cumtime,
            "problems": prob_best
        }
