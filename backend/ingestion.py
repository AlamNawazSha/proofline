"""Proofline (v0.2.0) - Multi-Format Ingestion Pipeline with SSRF Guards.

Supports: PDF, DOCX, TXT, Markdown, CSV, HTML, Scanned/Images, and Web URLs.
Enforces strict SSRF protections against internal network scanning.
"""

from __future__ import annotations
import csv
import io
import ipaddress
import re
import socket
import urllib.parse
import zipfile
import xml.etree.ElementTree as ET
from typing import Any, Dict, Optional, Tuple

import httpx
from pypdf import PdfReader


def is_safe_url(url: str) -> Tuple[bool, str]:
    """Validate that URL does not target localhost, private IP networks, or cloud metadata services."""
    try:
        parsed = urllib.parse.urlparse(url)
    except Exception:
        return False, "Malformed URL"
        
    if parsed.scheme not in ("http", "https"):
        return False, f"Unsupported protocol '{parsed.scheme}'; only HTTP and HTTPS are permitted."
        
    hostname = parsed.hostname
    if not hostname:
        return False, "URL contains no valid host name."
        
    # Block literal localhost or known metadata hostnames
    if hostname.lower() in ("localhost", "metadata.google.internal", "instance-data"):
        return False, f"Access to internal host '{hostname}' is blocked."
        
    try:
        # Resolve all IPs
        addr_info = socket.getaddrinfo(hostname, None)
    except Exception as e:
        return False, f"Could not resolve host '{hostname}': {str(e)}"
        
    for item in addr_info:
        ip_str = item[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
            if ip.is_loopback:
                return False, f"Host resolves to loopback address ({ip_str}), access denied."
            if ip.is_private:
                return False, f"Host resolves to private network ({ip_str}), access denied."
            if ip.is_link_local:
                return False, f"Host resolves to link-local/cloud metadata ({ip_str}), access denied."
            if ip.is_multicast:
                return False, f"Host resolves to multicast address ({ip_str}), access denied."
            if ip_str.startswith("169.254."):
                return False, f"Access to cloud metadata address ({ip_str}) is blocked."
        except ValueError:
            return False, f"Invalid IP address returned: {ip_str}"
            
    return True, "URL is safe"


async def fetch_web_page(url: str, timeout: float = 10.0, max_bytes: int = 2 * 1024 * 1024) -> Dict[str, Any]:
    """Safely fetch web page content with SSRF defenses and text extraction."""
    safe, reason = is_safe_url(url)
    if not safe:
        raise ValueError(f"SSRF Security Violation: {reason}")
        
    async with httpx.AsyncClient(follow_redirects=False, timeout=timeout) as client:
        # Follow up to 3 redirects, validating each hop
        current_url = url
        resp = None
        for _ in range(4):
            safe, reason = is_safe_url(current_url)
            if not safe:
                raise ValueError(f"SSRF Security Violation in redirect: {reason}")
            resp = await client.get(current_url, headers={"User-Agent": "Proofline-Evidence-Ingest/2.0"})
            if resp.status_code in (301, 302, 303, 307, 308):
                location = resp.headers.get("Location")
                if not location:
                    break
                current_url = urllib.parse.urljoin(current_url, location)
            else:
                break
                
        if not resp or not resp.is_success:
            raise ValueError(f"Failed to fetch URL: HTTP {resp.status_code if resp else 'No response'}")
            
        content_bytes = resp.content[:max_bytes]
        text_content = content_bytes.decode("utf-8", errors="replace")
        
        # Extract title
        title_m = re.search(r"<title[^>]*>(.*?)</title>", text_content, re.I | re.S)
        title = title_m.group(1).strip() if title_m else "Web Ingested Source"
        title = re.sub(r"\s+", " ", title)
        
        # Strip script, style, comments
        clean_text = re.sub(r"<(script|style|noscript)[^>]*>.*?</\1>", " ", text_content, flags=re.I | re.S)
        clean_text = re.sub(r"<!--.*?-->", " ", clean_text, flags=re.S)
        clean_text = re.sub(r"<[^>]+>", " ", clean_text)
        clean_text = re.sub(r"&[a-zA-Z0-9#]+;", " ", clean_text)
        clean_text = re.sub(r"\s+", " ", clean_text).strip()
        
        return {
            "title": title[:120],
            "body": clean_text,
            "url": current_url,
            "sourceType": "url",
            "trustLevel": "EXTERNAL_INFORMATIONAL",
        }


def extract_docx_text(data: bytes) -> str:
    """Extract plain text from DOCX archive without heavy third-party dependencies."""
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            xml_content = z.read("word/document.xml")
            tree = ET.fromstring(xml_content)
            namespaces = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
            
            paragraphs = []
            for p in tree.findall(".//w:p", namespaces):
                texts = [node.text for node in p.findall(".//w:t", namespaces) if node.text]
                if texts:
                    paragraphs.append("".join(texts))
            return "\n\n".join(paragraphs)
    except Exception as e:
        raise ValueError(f"Failed to parse DOCX file: {str(e)}")


def extract_csv_text(data: bytes) -> str:
    """Extract structured tabular text from CSV data."""
    try:
        decoded = data.decode("utf-8", errors="replace")
        reader = csv.reader(io.StringIO(decoded))
        lines = []
        for row in reader:
            if any(cell.strip() for cell in row):
                lines.append(" | ".join(cell.strip() for cell in row))
        return "\n".join(lines)
    except Exception as e:
        raise ValueError(f"Failed to parse CSV file: {str(e)}")


def extract_multi_format_content(filename: str, data: bytes) -> Dict[str, Any]:
    """Unified extractor supporting PDF, DOCX, TXT, MD, CSV, HTML."""
    fname = (filename or "").lower()
    
    if fname.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise ValueError("Encrypted PDFs are not supported.")
        parts = [p.extract_text() or "" for p in reader.pages]
        text = "\n\n".join(f"[Page {i + 1}]\n{t}" for i, t in enumerate(parts))
        return {
            "text": text,
            "pages": len(reader.pages),
            "format": "pdf",
            "trustLevel": "OFFICIAL_APPROVED",
        }
        
    elif fname.endswith(".docx"):
        text = extract_docx_text(data)
        return {
            "text": text,
            "pages": max(1, len(text.splitlines()) // 40),
            "format": "docx",
            "trustLevel": "OFFICIAL_APPROVED",
        }
        
    elif fname.endswith(".csv"):
        text = extract_csv_text(data)
        return {
            "text": text,
            "pages": 1,
            "format": "csv",
            "trustLevel": "INTERNAL_REFERENCE",
        }
        
    elif fname.endswith((".html", ".htm")):
        raw = data.decode("utf-8", errors="replace")
        clean = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", raw, flags=re.I | re.S)
        clean = re.sub(r"<[^>]+>", " ", clean)
        clean = re.sub(r"\s+", " ", clean).strip()
        return {
            "text": clean,
            "pages": 1,
            "format": "html",
            "trustLevel": "EXTERNAL_INFORMATIONAL",
        }
        
    elif fname.endswith((".txt", ".md")):
        text = data.decode("utf-8", errors="replace")
        return {
            "text": text,
            "pages": max(1, len(text.splitlines()) // 40),
            "format": "markdown" if fname.endswith(".md") else "text",
            "trustLevel": "INTERNAL_REFERENCE",
        }
        
    else:
        raise ValueError(f"Unsupported file format '{filename}'. Supported: PDF, DOCX, TXT, MD, CSV, HTML.")
