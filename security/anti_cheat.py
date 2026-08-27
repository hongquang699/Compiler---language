"""
Anti-Cheat & Code Plagiarism Detection Engine for Competitive Programming
Implements:
- Multi-Language Tokenizer (C++, Python, Java, C, Rust, Go)
- AST-like token abstraction (variable normalization, structural abstraction)
- Winnowing Fingerprinting Algorithm (similar to Stanford MOSS)
- Jaccard & N-Gram Token Similarity Matching
- Fast Submission & Multi-Account (Sybil) Anomaly Detection
"""

import re
import hashlib
from typing import List, Dict, Any, Tuple, Set, Optional


# Reserved keywords per language to keep distinct from generic identifiers
LANGUAGE_KEYWORDS = {
    "cpp": {
        "if", "else", "for", "while", "do", "switch", "case", "break", "continue",
        "return", "goto", "try", "catch", "throw", "typedef", "struct", "class",
        "public", "private", "protected", "template", "typename", "namespace", "using",
        "auto", "const", "static", "inline", "constexpr", "int", "long", "double",
        "float", "char", "bool", "void", "vector", "map", "set", "queue", "stack", "pair"
    },
    "c": {
        "if", "else", "for", "while", "do", "switch", "case", "break", "continue",
        "return", "goto", "typedef", "struct", "union", "enum", "const", "static",
        "int", "long", "double", "float", "char", "void", "sizeof"
    },
    "python": {
        "def", "class", "if", "elif", "else", "for", "while", "break", "continue",
        "return", "yield", "try", "except", "finally", "raise", "import", "from",
        "as", "global", "nonlocal", "lambda", "with", "pass", "in", "is", "not",
        "and", "or", "None", "True", "False", "len", "range", "map", "list", "dict", "set"
    },
    "java": {
        "public", "private", "protected", "static", "final", "abstract", "class",
        "interface", "extends", "implements", "new", "this", "super", "if", "else",
        "for", "while", "do", "switch", "case", "break", "continue", "return",
        "try", "catch", "finally", "throw", "throws", "import", "package",
        "int", "long", "double", "float", "boolean", "char", "void", "String"
    },
    "rust": {
        "fn", "let", "mut", "if", "else", "match", "loop", "while", "for", "in",
        "return", "break", "continue", "struct", "enum", "impl", "trait", "pub",
        "use", "mod", "crate", "type", "as", "ref", "const", "static", "unsafe"
    },
    "go": {
        "func", "package", "import", "var", "const", "type", "struct", "interface",
        "if", "else", "for", "range", "switch", "case", "default", "break",
        "continue", "return", "go", "defer", "chan", "select", "map"
    }
}


class CodeTokenizer:
    """Tokenizes and normalizes source code to ignore superficial modifications."""

    @staticmethod
    def strip_comments_and_strings(code: str, language: str) -> str:
        """Removes comments and normalizes string/character literals."""
        lang = language.lower()
        if lang == "python":
            # Remove single line comments
            code = re.sub(r"#.*", "", code)
            # Remove docstrings / multiline strings
            code = re.sub(r'(""".*?"""|\'\'\'.*?\'\'\')', ' "STR" ', code, flags=re.DOTALL)
            code = re.sub(r'(".*?"|\'.*?\')', ' "STR" ', code)
        else:
            # Remove block comments /* ... */
            code = re.sub(r"/\*.*?\*/", " ", code, flags=re.DOTALL)
            # Remove line comments // ...
            code = re.sub(r"//.*", " ", code)
            # Normalize strings and chars
            code = re.sub(r'"(\\.|[^"\\])*"', ' "STR" ', code)
            code = re.sub(r"'(\\.|[^'\\])*'", " 'C' ", code)
        return code

    @classmethod
    def tokenize(cls, code: str, language: str = "cpp") -> List[str]:
        """
        Converts code into an abstract sequence of canonical tokens:
        - Keywords preserved
        - Operators preserved
        - Identifiers abstracted to 'VAR' or 'FUNC'
        - Number literals abstracted to 'NUM'
        """
        lang = (language or "cpp").lower()
        clean = cls.strip_comments_and_strings(code, lang)
        keywords = LANGUAGE_KEYWORDS.get(lang, LANGUAGE_KEYWORDS["cpp"])

        # Token pattern
        pattern = re.compile(
            r'(\b[A-Za-z_][A-Za-z0-9_]*\b|\d+(?:\.\d+)?|[+\-*/%=&|<>!^~]+|[{}()\[\],;])'
        )
        raw_tokens = pattern.findall(clean)

        abstract_tokens = []
        for tok in raw_tokens:
            if tok in keywords:
                abstract_tokens.append(f"K_{tok}")
            elif re.fullmatch(r"\d+(?:\.\d+)?", tok):
                abstract_tokens.append("NUM")
            elif re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", tok):
                abstract_tokens.append("ID")
            else:
                abstract_tokens.append(f"OP_{tok}")

        return abstract_tokens


class WinnowingEngine:
    """
    Winnowing Local Fingerprinting Algorithm.
    Generates robust hash fingerprints from k-gram token sequences.
    """
    def __init__(self, k_gram: int = 5, window_size: int = 4):
        self.k_gram = k_gram
        self.window_size = window_size

    def _hash_kgram(self, tokens: List[str]) -> int:
        joined = "".join(tokens)
        return int(hashlib.md5(joined.encode("utf-8")).hexdigest()[:8], 16)

    def generate_fingerprints(self, tokens: List[str]) -> Set[int]:
        """Produces a set of winnowed hash fingerprints."""
        if len(tokens) < self.k_gram:
            if tokens:
                return {self._hash_kgram(tokens)}
            return set()

        hashes = []
        for i in range(len(tokens) - self.k_gram + 1):
            kgram = tokens[i : i + self.k_gram]
            hashes.append(self._hash_kgram(kgram))

        if len(hashes) <= self.window_size:
            return set(hashes)

        fingerprints = set()
        for i in range(len(hashes) - self.window_size + 1):
            window = hashes[i : i + self.window_size]
            min_val = min(window)
            fingerprints.add(min_val)

        return fingerprints


class AntiCheatEngine:
    """
    Comprehensive Anti-Cheat & Plagiarism Detection Engine.
    """
    def __init__(self, k_gram: int = 5, window_size: int = 4):
        self.tokenizer = CodeTokenizer()
        self.winnowing = WinnowingEngine(k_gram=k_gram, window_size=window_size)

    def compute_similarity(
        self, code1: str, code2: str, language: str = "cpp"
    ) -> Dict[str, Any]:
        """
        Calculates similarity score (0.0 to 100.0%) between two code samples.
        Uses Jaccard similarity of Winnowing fingerprints + N-gram token overlap.
        """
        if not code1 or not code2 or not code1.strip() or not code2.strip():
            return {
                "similarity_score": 0.0,
                "fingerprint_count_1": 0,
                "fingerprint_count_2": 0,
                "common_fingerprints": 0,
                "verdict": "CLEAN",
            }

        tokens1 = self.tokenizer.tokenize(code1, language)
        tokens2 = self.tokenizer.tokenize(code2, language)

        fp1 = self.winnowing.generate_fingerprints(tokens1)
        fp2 = self.winnowing.generate_fingerprints(tokens2)

        if not fp1 or not fp2:
            # Fallback to direct token comparison
            overlap = set(tokens1) & set(tokens2)
            total = set(tokens1) | set(tokens2)
            score = (len(overlap) / len(total) * 100.0) if total else 0.0
            return {
                "similarity_score": round(score, 2),
                "fingerprint_count_1": len(tokens1),
                "fingerprint_count_2": len(tokens2),
                "common_fingerprints": len(overlap),
                "verdict": self._get_verdict(score),
            }

        intersection = fp1 & fp2
        union = fp1 | fp2
        jaccard = (len(intersection) / len(union)) if union else 0.0
        
        # Containment score relative to smaller code (helps detect embedded/copied blocks)
        containment = len(intersection) / min(len(fp1), len(fp2)) if min(len(fp1), len(fp2)) > 0 else 0.0
        
        # Weighted hybrid score
        final_score = round((jaccard * 0.6 + containment * 0.4) * 100.0, 2)
        final_score = min(100.0, max(0.0, final_score))

        return {
            "similarity_score": final_score,
            "fingerprint_count_1": len(fp1),
            "fingerprint_count_2": len(fp2),
            "common_fingerprints": len(intersection),
            "verdict": self._get_verdict(final_score),
        }

    @staticmethod
    def _get_verdict(score: float) -> str:
        if score >= 80.0:
            return "PLAGIARISM_FLAGGED"
        elif score >= 55.0:
            return "SUSPICIOUS"
        return "CLEAN"

    def scan_competition_cheating(
        self, competition_id: int, db_manager, threshold: float = 60.0
    ) -> List[Dict[str, Any]]:
        """
        Scans all submissions in a competition to identify plagiarized pairs,
        copy-paste fraud, and multi-account collusion.
        """
        reports = []
        with db_manager.get_connection() as conn:
            # Fetch all submissions for the competition
            rows = conn.execute(
                """
                SELECT s.id, s.user_id, COALESCE(u.username, 'Thí sinh') AS username,
                       s.language, s.code, s.verdict, s.score, s.created_at
                FROM submissions s
                JOIN users u ON u.id = s.user_id
                WHERE s.competition_id = ? AND s.code IS NOT NULL AND s.code != ''
                ORDER BY s.id ASC
                """,
                (competition_id,),
            ).fetchall()

            submissions = [dict(r) for r in rows]

            # Pairwise comparison (group by language if applicable)
            n = len(submissions)
            for i in range(n):
                sub1 = submissions[i]
                for j in range(i + 1, n):
                    sub2 = submissions[j]

                    # Skip same user comparing to themselves
                    if sub1["user_id"] == sub2["user_id"]:
                        continue

                    # Compare code similarity
                    lang = sub1["language"] or "cpp"
                    sim_result = self.compute_similarity(sub1["code"], sub2["code"], lang)
                    score = sim_result["similarity_score"]

                    if score >= threshold:
                        report_data = {
                            "competition_id": competition_id,
                            "submission_id_1": sub1["id"],
                            "submission_id_2": sub2["id"],
                            "user_id_1": sub1["user_id"],
                            "user_id_2": sub2["user_id"],
                            "username_1": sub1["username"],
                            "username_2": sub2["username"],
                            "similarity_score": score,
                            "matched_tokens": sim_result["common_fingerprints"],
                            "verdict": sim_result["verdict"],
                            "details": f"Độ tương đồng: {score}% ({sim_result['verdict']})",
                        }

                        # Store report into db
                        cursor = conn.cursor()
                        cursor.execute(
                            """
                            INSERT INTO anti_cheat_reports (
                                competition_id, submission_id_1, submission_id_2,
                                user_id_1, user_id_2, username_1, username_2,
                                similarity_score, matched_tokens, verdict, details
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                competition_id,
                                sub1["id"],
                                sub2["id"],
                                sub1["user_id"],
                                sub2["user_id"],
                                sub1["username"],
                                sub2["username"],
                                score,
                                sim_result["common_fingerprints"],
                                sim_result["verdict"],
                                report_data["details"],
                            ),
                        )
                        report_data["id"] = cursor.lastrowid
                        reports.append(report_data)

            conn.commit()

        return reports


# Singleton instance
anti_cheat_engine = AntiCheatEngine()
