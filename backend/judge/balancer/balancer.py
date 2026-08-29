import time
from typing import Dict, Any, List, Optional

class JudgeNode:
    def __init__(self, node_id: str, name: str, is_online: bool = True, max_concurrency: int = 4):
        self.node_id = node_id
        self.name = name
        self.is_online = is_online
        self.max_concurrency = max_concurrency
        self.active_jobs = 0
        self.completed_jobs = 0
        self.failed_jobs = 0
        self.latency_ms = 0.0
        self.last_ping = time.time()

    @property
    def load(self) -> float:
        if not self.is_online:
            return float("inf")
        return self.active_jobs / max(1, self.max_concurrency)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_id": self.node_id,
            "name": self.name,
            "is_online": self.is_online,
            "active_jobs": self.active_jobs,
            "completed_jobs": self.completed_jobs,
            "failed_jobs": self.failed_jobs,
            "load": round(self.load, 2),
            "latency_ms": self.latency_ms,
            "last_ping": round(self.last_ping, 2)
        }

class JudgeLoadBalancer:
    """Manages judge nodes and distributes judging tasks using least-load balancing."""
    def __init__(self):
        self.nodes: Dict[str, JudgeNode] = {
            "judge-local-01": JudgeNode("judge-local-01", "Primary Local Worker #1", is_online=True, max_concurrency=4),
            "judge-local-02": JudgeNode("judge-local-02", "Secondary Local Worker #2", is_online=True, max_concurrency=4),
        }

    def select_best_node(self) -> Optional[JudgeNode]:
        available = [n for n in self.nodes.values() if n.is_online]
        if not available:
            return None
        return min(available, key=lambda n: (n.load, n.active_jobs))

    def record_job_start(self, node_id: str):
        if node_id in self.nodes:
            self.nodes[node_id].active_jobs += 1

    def record_job_done(self, node_id: str, success: bool = True, exec_time_ms: float = 0.0):
        if node_id in self.nodes:
            node = self.nodes[node_id]
            node.active_jobs = max(0, node.active_jobs - 1)
            if success:
                node.completed_jobs += 1
            else:
                node.failed_jobs += 1
            node.latency_ms = round(exec_time_ms, 2)
            node.last_ping = time.time()

    def get_cluster_status(self) -> List[Dict[str, Any]]:
        return [n.to_dict() for n in self.nodes.values()]

load_balancer = JudgeLoadBalancer()
