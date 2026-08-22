from pathlib import Path
from typing import Dict, List

import yaml


class JudgeRegistry:
    """Loads one explicit configuration file per local judge node."""

    def __init__(self, config_dir: str = "config/judges"):
        self.config_dir = Path(config_dir)

    def load(self) -> List[Dict[str, object]]:
        configs = []
        for config_path in sorted(self.config_dir.glob("judge*.yml")):
            config = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
            configs.append({"config_path": str(config_path), **config})
        return configs
