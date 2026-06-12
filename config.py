import os
from dotenv import load_dotenv

load_dotenv()

ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# 本番（Railway）はアプリルート=backend/ のため backend/config.py が読まれる。
# ローカルでフルリポジトリから backend を起動した場合のみ、sys.path の関係でこちらが優先される。
# backend/config.py・backend/modules/ と必ず同期すること。
CLAUDE_MODEL = "claude-sonnet-4-6"

ICF_COMPETENCIES = [
    {"id": 1, "name": "倫理に従った実践"},
    {"id": 2, "name": "コーチングマインドセットの体現"},
    {"id": 3, "name": "合意内容の確立と維持"},
    {"id": 4, "name": "信頼と安心感の育成"},
    {"id": 5, "name": "プレゼンスの維持"},
    {"id": 6, "name": "積極的傾聴"},
    {"id": 7, "name": "気づきの喚起"},
    {"id": 8, "name": "クライアントの成長の促進"},
]
