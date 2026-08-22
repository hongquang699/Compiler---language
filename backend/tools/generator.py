import random
from typing import List, Dict, Any

class EdgeCaseGenerator:
    """Generates tricky competitive programming test cases and boundary conditions."""
    
    @staticmethod
    def generate_array_edge_cases(min_val: int = -10**9, max_val: int = 10**9) -> List[Dict[str, Any]]:
        return [
            {"description": "Mảng rỗng hoặc N = 1 với số 0", "data": [0]},
            {"description": "N = 1 với số âm cực đại", "data": [min_val]},
            {"description": "N = 1 với số dương cực đại", "data": [max_val]},
            {"description": "Mảng toàn phần tử giống nhau", "data": [42] * 10},
            {"description": "Mảng đã sắp xếp tăng dần", "data": list(range(1, 11))},
            {"description": "Mảng sắp xếp giảm dần ngược lại", "data": list(range(10, 0, -1))},
            {"description": "Mảng đan xen âm dương", "data": [1, -1, 2, -2, 3, -3, 4, -4]},
        ]

    @staticmethod
    def generate_graph_edge_cases() -> List[Dict[str, Any]]:
        return [
            {"description": "Đồ thị đơn 1 đỉnh không có cạnh", "V": 1, "E": 0, "edges": []},
            {"description": "Đồ thị 2 đỉnh nối nhau", "V": 2, "E": 1, "edges": [(1, 2, 1)]},
            {"description": "Đồ thị có chu trình tự khuyên hoặc đa cạnh", "V": 3, "E": 3, "edges": [(1, 2, 5), (1, 2, 2), (2, 3, 4)]},
            {"description": "Đồ thị không liên thông", "V": 4, "E": 1, "edges": [(1, 2, 10)]},
            {"description": "Đồ thị hình sao (Star graph)", "V": 5, "E": 4, "edges": [(1, 2, 1), (1, 3, 1), (1, 4, 1), (1, 5, 1)]},
            {"description": "Đồ thị đường thẳng (Line graph)", "V": 5, "E": 4, "edges": [(1, 2, 1), (2, 3, 1), (3, 4, 1), (4, 5, 1)]}
        ]

    @staticmethod
    def generate_random_test_cases(count: int = 5, n_range=(1, 100), val_range=(-1000, 1000)) -> List[str]:
        tests = []
        for _ in range(count):
            n = random.randint(*n_range)
            arr = [str(random.randint(*val_range)) for _ in range(n)]
            test_str = f"{n}\n" + " ".join(arr)
            tests.append(test_str)
        return tests
