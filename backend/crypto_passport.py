"""Proofline 2.0 - Cryptographic Approval Passport Module
Implements canonical SHA-256 artifact hashing and Ed25519 digital signatures.
"""

from __future__ import annotations
import base64
import hashlib
import json
import os
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization

KEY_DIR = Path(__file__).resolve().parent.parent / "private_files"
KEY_DIR.mkdir(exist_ok=True)
KEY_FILE = KEY_DIR / "ed25519_signing_key.pem"


def _get_or_create_keypair() -> Tuple[ed25519.Ed25519PrivateKey, ed25519.Ed25519PublicKey]:
    """Load or generate the persistent server-side Ed25519 signing keypair."""
    if KEY_FILE.is_file():
        try:
            pem_data = KEY_FILE.read_bytes()
            priv = serialization.load_pem_private_key(pem_data, password=None)
            if isinstance(priv, ed25519.Ed25519PrivateKey):
                return priv, priv.public_key()
        except Exception:
            pass  # regenerate if corrupt

    # Generate fresh Ed25519 key
    priv = ed25519.Ed25519PrivateKey.generate()
    pem = priv.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    KEY_FILE.write_bytes(pem)
    return priv, priv.public_key()


PRIVATE_KEY, PUBLIC_KEY = _get_or_create_keypair()


def get_public_key_hex() -> str:
    """Return the raw public key as hex string."""
    raw = PUBLIC_KEY.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    return raw.hex()


def canonical_fingerprint(text: str, context: Optional[Dict[str, Any]] = None, visual_check_ids: Optional[list] = None) -> str:
    """Compute deterministic canonical SHA-256 digest of document text and declared context."""
    payload = {
        "text": text or "",
        "context": context or {},
        "visualCheckIds": sorted(visual_check_ids or []),
    }
    canonical_json = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


def sign_passport(receipt_data: Dict[str, Any]) -> Dict[str, Any]:
    """Cryptographically sign a release receipt payload using server Ed25519 key."""
    # Canonical message to sign: hash of ordered core receipt attributes
    core_fields = {
        "id": receipt_data.get("id"),
        "documentId": receipt_data.get("documentId"),
        "revision": receipt_data.get("revision"),
        "fingerprint": receipt_data.get("fingerprint"),
        "sourceVersion": receipt_data.get("sourceVersion"),
        "policyVersion": receipt_data.get("policyVersion", 1),
        "reviewer": receipt_data.get("reviewer") or receipt_data.get("reviewerName"),
        "decision": receipt_data.get("decision", "approved"),
        "timestamp": receipt_data.get("approvedAt") or receipt_data.get("at") or receipt_data.get("createdAt"),
    }
    msg = json.dumps(core_fields, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    signature = PRIVATE_KEY.sign(msg)
    
    receipt_copy = dict(receipt_data)
    receipt_copy["signatureAlgorithm"] = "Ed25519"
    receipt_copy["signature"] = signature.hex()
    receipt_copy["publicKey"] = get_public_key_hex()
    receipt_copy["verificationEndpoint"] = f"/api/receipts/{receipt_data.get('id')}/verify"
    return receipt_copy


def verify_passport(receipt: Dict[str, Any], candidate_text: Optional[str] = None, candidate_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Verify digital signature and optional candidate content integrity."""
    pub_hex = receipt.get("publicKey") or get_public_key_hex()
    sig_hex = receipt.get("signature", "")
    expected_fingerprint = receipt.get("fingerprint", "")
    
    # 1. Signature Verification
    sig_valid = False
    try:
        pub_bytes = bytes.fromhex(pub_hex)
        pub_key = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)
        
        core_fields = {
            "id": receipt.get("id"),
            "documentId": receipt.get("documentId"),
            "revision": receipt.get("revision"),
            "fingerprint": receipt.get("fingerprint"),
            "sourceVersion": receipt.get("sourceVersion"),
            "policyVersion": receipt.get("policyVersion", 1),
            "reviewer": receipt.get("reviewer") or receipt.get("reviewerName"),
            "decision": receipt.get("decision", "approved"),
            "timestamp": receipt.get("approvedAt") or receipt.get("at") or receipt.get("createdAt"),
        }
        msg = json.dumps(core_fields, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        sig_bytes = bytes.fromhex(sig_hex)
        pub_key.verify(sig_bytes, msg)
        sig_valid = True
    except Exception as e:
        sig_valid = False
        sig_error = str(e)
    
    # 2. Content Integrity Verification (if candidate text provided)
    integrity_valid = True
    computed_fingerprint = ""
    tamper_detected = False
    
    if candidate_text is not None:
        computed_fingerprint = canonical_fingerprint(
            candidate_text,
            context=candidate_context or receipt.get("context", {}),
            visual_check_ids=receipt.get("visualCheckIds", []),
        )
        if computed_fingerprint != expected_fingerprint:
            integrity_valid = False
            tamper_detected = True

    overall_valid = sig_valid and integrity_valid

    status = "AUTHENTIC_AND_VERIFIED"
    if not sig_valid:
        status = "INVALID_SIGNATURE"
    elif tamper_detected:
        status = "CONTENT_INTEGRITY_COMPROMISED"

    return {
        "status": status,
        "valid": overall_valid,
        "signatureValid": sig_valid,
        "integrityValid": integrity_valid,
        "tamperDetected": tamper_detected,
        "algorithm": receipt.get("signatureAlgorithm", "Ed25519"),
        "expectedFingerprint": expected_fingerprint,
        "computedFingerprint": computed_fingerprint or expected_fingerprint,
        "receiptId": receipt.get("id"),
        "documentId": receipt.get("documentId"),
        "revision": receipt.get("revision"),
        "sourceVersion": receipt.get("sourceVersion"),
        "reviewer": receipt.get("reviewer") or receipt.get("reviewerName"),
        "approvedAt": receipt.get("approvedAt") or receipt.get("at"),
    }
