import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.crypto_passport import (
    sign_passport,
    verify_passport,
    canonical_fingerprint,
    get_public_key_hex,
)
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization


def test_public_key_endpoint():
    client = TestClient(app)
    r = client.get("/api/public-key")
    assert r.status_code == 200
    data = r.json()
    assert data["algorithm"] == "Ed25519"
    assert "publicKeyHex" in data
    assert len(data["publicKeyHex"]) == 64
    assert data["keyStatus"] == "active"


def test_receipt_sign_and_verify_lifecycle():
    receipt_data = {
        "id": "rcp-lifecycle-001",
        "documentId": "doc-001",
        "revision": 1,
        "fingerprint": "a" * 64,
        "sourceVersion": 1,
        "policyVersion": 1,
        "reviewer": "Alice Auditor",
        "decision": "approved",
        "approvedAt": "2026-10-30T12:00:00Z",
    }
    signed = sign_passport(receipt_data)
    assert signed["signatureAlgorithm"] == "Ed25519"
    assert "signature" in signed
    assert signed["publicKey"] == get_public_key_hex()

    verification = verify_passport(signed)
    assert verification["valid"] is True
    assert verification["signatureValid"] is True
    assert verification["status"] == "AUTHENTIC_AND_VERIFIED"


def test_key_rotation_unverifiable_state():
    """When a receipt is evaluated without original public key after rotation, reports unverifiable: key rotated."""
    # Generate an independent key simulating a different/rotated server instance
    foreign_priv = ed25519.Ed25519PrivateKey.generate()
    foreign_pub = foreign_priv.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    ).hex()

    receipt_data = {
        "id": "rcp-rotated-001",
        "documentId": "doc-002",
        "revision": 1,
        "fingerprint": "b" * 64,
        "sourceVersion": 1,
        "policyVersion": 1,
        "reviewer": "Bob Reviewer",
        "decision": "approved",
        "approvedAt": "2026-10-30T12:00:00Z",
        # Simulating an old receipt without embedded public key verified against a rotated server
        "signature": "badf" * 16,
    }

    # Verify against rotated active key
    result = verify_passport(receipt_data)
    assert result["valid"] is False
    assert result["status"] == "SIGNATURE_UNVERIFIABLE_KEY_ROTATED"
    assert "key rotated" in result["signatureStatus"]


def test_tampered_content_detected_even_with_valid_signature():
    original_text = "Compliant product copy."
    receipt_data = {
        "id": "rcp-tamper-001",
        "documentId": "doc-003",
        "revision": 1,
        "fingerprint": canonical_fingerprint(original_text),
        "sourceVersion": 1,
        "policyVersion": 1,
        "reviewer": "Carol Auditor",
        "decision": "approved",
        "approvedAt": "2026-10-30T12:00:00Z",
    }
    signed = sign_passport(receipt_data)

    # Content altered post-signing
    tampered_text = "Compliant product copy with unapproved edits."
    verif = verify_passport(signed, candidate_text=tampered_text)
    assert verif["signatureValid"] is True
    assert verif["integrityValid"] is False
    assert verif["tamperDetected"] is True
    assert verif["valid"] is False
    assert verif["status"] == "CONTENT_INTEGRITY_COMPROMISED"

