/**
 * COMPILER---LANGUAGE — Submission Arena JavaScript Controller
 */

(function () {
    let editorInstance = null;

    const TEMPLATES = {
        python: `import sys

def main():
    # Đọc dữ liệu từ stdin và in kết quả ra stdout
    # Ví dụ: n = int(sys.stdin.read().strip())
    pass

if __name__ == '__main__':
    main()`,
        cpp: `#include <iostream>
#include <vector>
#include <string>

using namespace std;

int main() {
    ios_base::sync_with_stdio(0);
    cin.tie(0); cout.tie(0);
    // Xử lý bài toán tại đây
    return 0;
}`,
        c: `#include <stdio.h>

int main() {
    // Nhập xuất chuẩn
    return 0;
}`,
        java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Xử lý bài toán tại đây
    }
}`,
        go: `package main

import (
    "bufio"
    "fmt"
    "os"
)

func main() {
    reader := bufio.NewReader(os.Stdin)
    _ = reader
    // Nhập xuất chuẩn tại đây
}`,
        rust: `use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    // Xử lý bài toán tại đây
}`,
        javascript: `const fs = require('fs');

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim();
    // In kết quả ra stdout bằng console.log()
}

main();`,
        typescript: `import * as fs from 'fs';

function main(): void {
    const input: string = fs.readFileSync(0, 'utf-8').trim();
    // In kết quả ra stdout bằng console.log()
}

main();`,
        csharp: `using System;

class Program {
    static void Main() {
        string input = Console.ReadLine();
        // Xử lý bài toán tại đây
    }
}`,
        pascal: `program Solution;
begin
  { Nhập xuất dữ liệu }
end.`
    };

    const MONACO_LANG_MAP = {
        python: "python",
        cpp: "cpp",
        c: "c",
        java: "java",
        go: "go",
        rust: "rust",
        javascript: "javascript",
        typescript: "typescript",
        csharp: "csharp",
        pascal: "pascal"
    };

    const FILE_EXT_MAP = {
        python: "solution.py",
        cpp: "solution.cpp",
        c: "solution.c",
        java: "Main.java",
        go: "main.go",
        rust: "main.rs",
        javascript: "solution.js",
        typescript: "solution.ts",
        csharp: "Program.cs",
        pascal: "solution.pas"
    };

    async function loadProblemList() {
        const selectEl = document.getElementById('problem-select');
        if (!selectEl) return;

        const params = new URLSearchParams(window.location.search);
        const queryCode = (params.get('code') || 'PY001').toUpperCase();

        try {
            const res = await fetch('/api/problem-bank?limit=300');
            const data = await res.json();
            const problems = data.problems || [];

            if (problems.length > 0) {
                selectEl.innerHTML = '';
                problems.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.code;
                    opt.textContent = `[${p.code}] ${p.title} · ${p.chapter_title}`;
                    if (p.code.toUpperCase() === queryCode) {
                        opt.selected = true;
                    }
                    selectEl.appendChild(opt);
                });
            }
        } catch (err) {
            console.error('Không thể tải danh sách bài tập:', err);
        }
    }

    function initMonaco() {
        loadProblemList();

        if (window.require) {
            require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
            require(['vs/editor/editor.main'], function () {
                monaco.editor.defineTheme("cp-aurora", {
                    base: "vs-dark",
                    inherit: true,
                    rules: [
                        { token: "comment", foreground: "64748b", fontStyle: "italic" },
                        { token: "keyword", foreground: "22d3ee" },
                        { token: "string", foreground: "86efac" },
                        { token: "number", foreground: "fbbf24" },
                        { token: "type", foreground: "a78bfa" },
                        { token: "identifier", foreground: "e2e8f0" }
                    ],
                    colors: {
                        "editor.background": "#0b1220",
                        "editor.foreground": "#e2e8f0",
                        "editorLineNumber.foreground": "#475569",
                        "editorLineNumber.activeForeground": "#94a3b8",
                        "editor.selectionBackground": "#164e6388",
                        "editor.lineHighlightBackground": "#1e293b55",
                        "editorCursor.foreground": "#22d3ee",
                        "editorGutter.background": "#0b1220"
                    }
                });

                const host = document.getElementById('monaco-submit-editor');
                if (!host) return;

                editorInstance = monaco.editor.create(host, {
                    value: TEMPLATES.python,
                    language: "python",
                    theme: "cp-aurora",
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    fontLigatures: true,
                    automaticLayout: true,
                    tabSize: 4,
                    insertSpaces: true,
                    lineNumbers: "on",
                    renderLineHighlight: "all",
                    cursorBlinking: "smooth",
                    smoothScrolling: true,
                    padding: { top: 12, bottom: 12 },
                    minimap: { enabled: false }
                });

                const tabEl = document.getElementById('tab-filename');
                if (tabEl) tabEl.textContent = "solution.py";
                const langLabel = document.getElementById('ide-lang-label');
                if (langLabel) langLabel.textContent = "Python 3 (Runtime)";

                editorInstance.onDidChangeCursorPosition((e) => {
                    const el = document.getElementById('cursor-pos');
                    if (el) el.textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
                });

                // Ctrl+Enter hotkey to submit
                editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                    submitSolution();
                });
            });
        }
    }

    function changeLanguage(langKey) {
        if (!editorInstance) return;
        const monacoLang = MONACO_LANG_MAP[langKey] || "python";
        const tabEl = document.getElementById('tab-filename');
        if (tabEl) tabEl.textContent = FILE_EXT_MAP[langKey] || `solution.${langKey}`;

        const langSelect = document.getElementById('lang-select');
        const langLabel = document.getElementById('ide-lang-label');
        if (langSelect && langLabel) {
            langLabel.textContent = langSelect.options[langSelect.selectedIndex].text;
        }

        const model = editorInstance.getModel();
        if (model) {
            monaco.editor.setModelLanguage(model, monacoLang);
        }
        if (confirm('Tải mã nguồn mẫu mặc định cho ngôn ngữ này?')) {
            editorInstance.setValue(TEMPLATES[langKey] || '');
        }
    }

    function toggleFullscreen() {
        const container = document.getElementById('ide-container');
        const icon = document.getElementById('expand-icon');
        if (!container) return;

        container.classList.toggle('fullscreen');
        if (icon) {
            icon.className = container.classList.contains('fullscreen') ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
        }
        if (editorInstance) {
            setTimeout(() => editorInstance.layout(), 100);
        }
    }

    async function submitSolution() {
        if (!editorInstance) return;
        const code = editorInstance.getValue().trim();
        const btn = document.getElementById('btn-submit');
        const verdictBox = document.getElementById('verdict-box');
        const verdictContent = document.getElementById('verdict-content');
        const problemSelect = document.getElementById('problem-select');
        const langSelect = document.getElementById('lang-select');

        const problemCode = problemSelect ? problemSelect.value : 'PY001';
        const language = langSelect ? langSelect.value : 'python';

        if (!code) {
            alert('Vui lòng nhập mã nguồn bài giải trước khi nộp!');
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang chấm bài...';
        }
        if (verdictBox) verdictBox.className = 'verdict-box show';
        if (verdictContent) {
            verdictContent.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px; font-weight:700; color:var(--arena-primary);">
                    <i class="fa-solid fa-spinner fa-spin" style="font-size:1.2rem;"></i>
                    <span>Máy chấm Compiler---language đang chuẩn bị môi trường, biên dịch và chạy các test cases...</span>
                </div>
            `;
        }

        try {
            const token = localStorage.getItem('token') || '';
            const res = await fetch(`/api/problem-bank/${problemCode}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    source_code: code,
                    language: language
                })
            });

            const data = await res.json();

            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Nộp bài!';
            }

            if (!res.ok) {
                if (verdictBox) verdictBox.className = 'verdict-box show verdict-wa';
                if (verdictContent) {
                    verdictContent.innerHTML = `
                        <div style="color: #ef4444; font-weight:700;">
                            <i class="fa-solid fa-circle-xmark"></i> ${data.detail || 'Lỗi khi chấm bài'}
                        </div>
                    `;
                }
                return;
            }

            const isAc = data.verdict === 'AC';
            if (verdictBox) {
                verdictBox.className = `verdict-box show ${isAc ? 'verdict-ac' : 'verdict-wa'}`;
            }

            let verdictColor = isAc ? '#16a34a' : '#ef4444';
            let verdictIcon = isAc ? 'fa-circle-check' : 'fa-circle-xmark';
            let verdictTitle = isAc ? `CHẤP NHẬN (ACCEPTED · ${data.score}/100)` : `KẾT QUẢ: ${data.verdict} (${data.score}/100 Điểm)`;

            if (verdictContent) {
                verdictContent.innerHTML = `
                    <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:14px; flex-wrap:wrap;">
                        <div>
                            <div style="display:flex; align-items:center; gap:8px; font-size:1.15rem; font-weight:800; color:${verdictColor}; margin-bottom:4px;">
                                <i class="fa-solid ${verdictIcon}"></i> ${verdictTitle}
                            </div>
                            <p style="font-size:0.86rem; color:var(--arena-text-muted); margin:0;">
                                Bài tập: <strong>${data.problem_code} - ${data.problem_title || ''}</strong> &nbsp;·&nbsp; 
                                Ngôn ngữ: <strong>${language.toUpperCase()}</strong> &nbsp;·&nbsp;
                                Thời gian chạy: <strong>${data.execution_time_ms} ms</strong> &nbsp;·&nbsp; 
                                Vượt qua: <strong>${data.passed_tests} / ${data.total_tests}</strong> test cases.
                            </p>
                        </div>
                        <a href="problems.html" class="btn-back-ide" style="padding:7px 14px; font-size:0.82rem;">
                            <i class="fa-solid fa-layer-group"></i> Kho bài tập
                        </a>
                    </div>
                `;
            }

        } catch (err) {
            console.error(err);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Nộp bài!';
            }
            if (verdictBox) verdictBox.className = 'verdict-box show verdict-wa';
            if (verdictContent) {
                verdictContent.innerHTML = `
                    <div style="color: #ef4444; font-weight:700;">
                        <i class="fa-solid fa-triangle-exclamation"></i> Lỗi kết nối mạng: Không thể gửi bài giải đến máy chấm.
                    </div>
                `;
            }
        }
    }

    // Expose global controller
    window.SubmissionController = {
        initMonaco,
        changeLanguage,
        toggleFullscreen,
        submitSolution,
    };

    window.changeLanguage = changeLanguage;
    window.toggleFullscreen = toggleFullscreen;
    window.submitSolution = submitSolution;

    document.addEventListener('DOMContentLoaded', initMonaco);
})();
