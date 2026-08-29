from typing import Dict, Any, List

class BaseContestFormat:
    name: str = "Base"
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}

    def calculate_score(self, problem_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        raise NotImplementedError
