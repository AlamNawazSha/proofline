import os
import pytest

@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    """Offline guard: clear external provider and cloud credentials for every test."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    for k in list(os.environ.keys()):
        if k.startswith("SUPABASE_"):
            monkeypatch.delenv(k, raising=False)

