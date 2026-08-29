from typing import Dict, Any, List, Optional, Callable
import time
from backend.judge.verdicts import Verdict, SubmissionStatus

class PacketType:
    HANDSHAKE = "handshake"
    SUPPORTED_PROBLEMS = "supported-problems"
    GRADING_BEGIN = "grading-begin"
    COMPILE_MESSAGE = "compile-message"
    COMPILE_ERROR = "compile-error"
    BATCH_BEGIN = "batch-begin"
    TEST_CASE_STATUS = "test-case-status"
    BATCH_END = "batch-end"
    GRADING_END = "grading-end"
    INTERNAL_ERROR = "internal-error"
    SUBMISSION_TERMINATED = "submission-terminated"

class BridgeEventDispatcher:
    """Dispatches real-time DMOJ packets to listening websockets/callbacks."""
    def __init__(self):
        self.listeners: List[Callable[[str, Dict[str, Any]], None]] = []

    def subscribe(self, callback: Callable[[str, Dict[str, Any]], None]):
        if callback not in self.listeners:
            self.listeners.append(callback)

    def unsubscribe(self, callback: Callable[[str, Dict[str, Any]], None]):
        if callback in self.listeners:
            self.listeners.remove(callback)

    def emit(self, packet_type: str, data: Dict[str, Any]):
        packet = {
            "name": packet_type,
            "timestamp": time.time(),
            **data
        }
        for listener in self.listeners:
            try:
                listener(packet_type, packet)
            except Exception:
                pass

bridge_events = BridgeEventDispatcher()
