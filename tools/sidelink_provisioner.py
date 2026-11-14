"""
SideLink Provisioning Engine
Complete Apple GrandSlam (SRP-6a) authentication & Developer Services 2 (QH65B2) client.
Autonomously registers devices, issues developer certificates (.p12), and downloads
mobile provisioning profiles (.mobileprovision) directly from Apple without third-party tools.
"""

import os
import sys
import io
import json
import re

if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
import uuid
import base64
import hashlib
import hmac
import time
import argparse
import plistlib
import urllib3
import requests
from datetime import datetime, timezone

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import padding
import pbkdf2
from Crypto.Hash import SHA256
import srp._pysrp as srp

urllib3.disable_warnings()

# Enable RFC 5054 SRP parameters
srp.rfc5054_enable()
srp.no_username_in_x()

APP_ROOT = os.path.dirname(os.path.abspath(sys.executable if getattr(sys, 'frozen', False) else __file__))

EMBEDDED_APPLE_ROOT_PEM = """-----BEGIN CERTIFICATE-----
MIIEuzCCA6OgAwIBAgIBAjANBgkqhkiG9w0BAQUFADBiMQswCQYDVQQGEwJVUzET
MBEGA1UEChMKQXBwbGUgSW5jLjEmMCQGA1UECxMdQXBwbGUgQ2VydGlmaWNhdGlv
biBBdXRob3JpdHkxFjAUBgNVBAMTDUFwcGxlIFJvb3QgQ0EwHhcNMDYwNDI1MjE0
MDM2WhcNMzUwMjA5MjE0MDM2WjBiMQswCQYDVQQGEwJVUzETMBEGA1UEChMKQXBw
bGUgSW5jLjEmMCQGA1UECxMdQXBwbGUgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkx
FjAUBgNVBAMTDUFwcGxlIFJvb3QgQ0EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAw
ggEKAoIBAQDkkakJH5HbHkdQ6wXtXnmELes2oldMVeyLGYne+Uts9QerIjAC6Bg+
+FAJ039BqJj50cpmnCRrEdCju+QbKsMflZ56DKRHi1vUFjczy8QPTc4UadHJGXL1
XQ7Vf1+b8iUDulWPTV0N8WQ1IxVLFVkds5T39pyez1C6wVhQZ48ItCD3y6wsIG9w
tj8BMIy3Q88PnT3zK0koGsj+zrW5DtleHNbLPbU6rfQPDgCSC7EhFi501TwN22IW
q6NxkkdTVcGvL0Gz+PvjcM3mo0xFfh9Ma1CWQYnEdGILEINBhzOKgbEwWOxaBDKM
aLOPHd5lc/9nXmW8Sdh2nzMUZaF3lMktAgMBAAGjggF6MIIBdjAOBgNVHQ8BAf8E
BAMCAQYwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUK9BpR5R2Cf70a40uQKb3
R01/CF4wHwYDVR0jBBgwFoAUK9BpR5R2Cf70a40uQKb3R01/CF4wggERBgNVHSAE
ggEIMIIBBDCCAQAGCSqGSIb3Y2QFATCB8jAqBggrBgEFBQcCARYeaHR0cHM6Ly93
d3cuYXBwbGUuY29tL2FwcGxlY2EvMIHDBggrBgEFBQcCAjCBthqBs1JlbGlhbmNl
IG9uIHRoaXMgY2VydGlmaWNhdGUgYnkgYW55IHBhcnR5IGFzc3VtZXMgYWNjZXB0
YW5jZSBvZiB0aGUgdGhlbiBhcHBsaWNhYmxlIHN0YW5kYXJkIHRlcm1zIGFuZCBj
b25kaXRpb25zIG9mIHVzZSwgY2VydGlmaWNhdGUgcG9saWN5IGFuZCBjZXJ0aWZp
Y2F0aW9uIHByYWN0aWNlIHN0YXRlbWVudHMuMA0GCSqGSIb3DQEBBQUAA4IBAQBc
NplMLXi37Yyb3PN3m/J20ncwT8EfhYOFG5k9RzfyqZtAjizUsZAS2L70c5vu0mQP
y3lPNNiiPvl4/2vIB+x9OYOLUyDTOMSxv5pPCmv/K/xZpwUJfBdAVhEedNO3iyM7
R6PVbyTi69G3cN8PReEnyvFteO3ntRcXqNx+IjXKJdXZD9Zr1KIkIxH3oayPc4Fg
xhtbCS+SsvhESPBgOJ4V9T0mZyCKM2r3DYLP3uujL/lTaltkwGMzd/c6ByxW69oP
IQ7aunMZT7XZNn/Bh1XZp5m5MkL72NVxnn6hUrcbvZNCJBIqxw8dtk2cXmPIS4AX
UKqK1drk/NAJBzewdXUh
-----END CERTIFICATE-----"""

EMBEDDED_ANISETTE_STATE_B64 = "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPCFET0NUWVBFIHBsaXN0IFBVQkxJQyAiLS8vQXBwbGUvL0RURCBQTElTVCAxLjAvL0VOIiAiaHR0cDovL3d3dy5hcHBsZS5jb20vRFREcy9Qcm9wZXJ0eUxpc3QtMS4wLmR0ZCI+CjxwbGlzdCB2ZXJzaW9uPSIxLjAiPgo8ZGljdD4KCTxrZXk+a2V5Y2hhaW5faWRlbnRpZmllcjwva2V5PgoJPGRhdGE+CglZelU5SklnelVoWnBUdWduVzV2eHJBPT0KCTwvZGF0YT4KCTxrZXk+YWRpX3BiPC9rZXk+Cgk8ZGF0YT4KCVFVUkpRZ0FBQUFFQUFBQVBZV1JwTFRBd01EQXdNREF3TG5CaUFBQUNnd0FBQUFNQUFBQW5pWC9Fa2crUEdlMmZYdWYvCgltNkhvZkVsOWJRalM1OUQ2ay9hS3RXUXNQbTZvRVdyRXRqbWFYaGlZaUNtUkZjSHdONklVZGd5azVzcG5NcFArOGV2UQoJbGJXRmxVQzBiRE56R1JUaXRKN1kraTdVRFJoOVUwZHVlanRqRnpGNnREWDEyelhBYnRTd0FyTzhHVk5qU3REZG0vVmUKCWZTUEZXYWtyUi9TRHlIWE5nc29JUFlOZDFzdTZUcHpiSEZKcGN4Ri9vZDNCQnV1SUtDREEzZzVtbFI3NDNBL0M2TTF5CglTdFhoSUxGc2kxRlRJenlmYklwNEFGL2g5MldJU3o4REFFcWpCZ0NjS014aTM5SEhzKzdqS0RCTUJqMDI1aEIwYkJiQwoJcU51MkJIQitPNlErVGh2WUM2Kys1OWZtUVM2bk50czU0MGZEeUpvUGYxTTRiN3ZWa2lsTXFPdTNjcGprZ3BSOXVpWkgKCVpIeGgxek9EekdJQ0xjSWdGTzVlS2c3M3JyUnNYNmw3eVpwRnI5eEVGOFNhTjkvTmplYnZ6RS9oNklHWjJLTU9yTnoyCglnUGJXZTQrMUI5UlI1TEN4cWU1N3hOZzVBUFFUZXJXNDYwR3RQTzNWZ2R2OXRRZWRSVUJFaG9PSDJLUE4xaW1pMkRnaAoJRWE3b3NtZ3d4d3UxSVNrZ0FKd3UvU0ttWExuWXhBaHZWNXNGZGYvS2VoOGd6MWZHRlpud2RMUVQ1dkNRdVJ0YmFjVHYKCXJycVJPd3dEVFQxS0ljZGRUdzZTcXBDZnNZbjFKSXRIQVkwcjBxaUFNejFBeFZVbjdqRWtIWDhKUm4vY1ZSQWM3UVZQCglxbXp6cHhFcTZIc1A3UUUrU2orMnZ0K1AwZ1pNaEdVRTRzMnNsejVqak5kenM5UTkzR2l2NStUeWdqVVA2ZXFtekRKVgoJUmxDN0NpbWtTZzArbUE5NmJHRGNGS1hLaEJYRHZNV1NzbU9XcE8vMXhrcEVtUkI1dU1wQStBWWh6eXJDS0h6SC9qT0oKCTB5MzFkWENaWkxwMHN5MmdiNnUySWExVVpqeWZjTExwWWJCRmZmS3lHbWtuUzYzVjk5aTdNSCt4NUxGTStuUVc3M0NuCglRd0FHSng0ODZzc0h2dE09Cgk8L2RhdGE+CjwvZGljdD4KPC9wbGlzdD4="

def ensure_assets():
    local_dir = os.path.join(os.environ.get("LOCALAPPDATA", ""), "SideLink")
    os.makedirs(local_dir, exist_ok=True)
    pem_path = os.path.join(local_dir, "apple_root.pem")
    if not os.path.exists(pem_path):
        with open(pem_path, "w", encoding="utf-8") as f:
            f.write(EMBEDDED_APPLE_ROOT_PEM.strip() + "\n")
    bin_path = os.path.join(local_dir, "anisette_state.bin")
    if not os.path.exists(bin_path):
        with open(bin_path, "wb") as f:
            f.write(base64.b64decode(EMBEDDED_ANISETTE_STATE_B64))
    return pem_path, bin_path

APPLE_ROOT_PEM, ANISETTE_STATE_FILE = ensure_assets()
SESSION_CACHE_FILE = os.path.join(os.environ.get("LOCALAPPDATA", APP_ROOT), "SideLink", "session_cache.json")
IDENTITIES_BASE = os.path.join(os.environ.get("APPDATA", ""), "SideLink", "Identities")

ANI_SERVERS = [
    "https://ani.iloader.app",
    "https://mac-ani.jkcoxson.com",
    "https://new.ani.sidestore.io"
]

def sanitize_account_name(apple_id: str) -> str:
    return apple_id.strip().lower().replace("@", "_").replace(".", "_")

def get_anisette_headers(server_idx=0):
    """Fetch real Anisette headers using stored provisioned ADI state or remote provider."""
    state = None
    if os.path.exists(ANISETTE_STATE_FILE):
        try:
            with open(ANISETTE_STATE_FILE, "rb") as f:
                state = plistlib.loads(f.read())
        except Exception:
            state = None

    server = ANI_SERVERS[server_idx % len(ANI_SERVERS)]
    
    if state and "keychain_identifier" in state and "adi_pb" in state:
        keychain_id = state["keychain_identifier"]
        dev_id = str(uuid.UUID(bytes=keychain_id)).upper()
        md_lu = hashlib.sha256(keychain_id).hexdigest().upper()
        
        body_ani = {
            "identifier": base64.b64encode(keychain_id).decode(),
            "adi_pb": base64.b64encode(state["adi_pb"]).decode()
        }
        
        r = requests.post(f"{server}/v3/get_headers", json=body_ani, timeout=7)
        ani_res = r.json()
        
        r_info = requests.get(f"{server}/v3/client_info", timeout=7)
        client_info = r_info.json()
        
        cpd = {
            "bootstrap": "true",
            "icscrec": "true",
            "loc": "en_US",
            "pbe": "false",
            "prkgen": "true",
            "svct": "iCloud",
            "X-Mme-Device-Id": dev_id,
            "X-Apple-I-MD": ani_res["X-Apple-I-MD"],
            "X-Apple-I-MD-M": ani_res["X-Apple-I-MD-M"]
        }
        
        headers = {
            "Content-Type": "text/x-xml-plist",
            "Accept": "text/x-xml-plist",
            "User-Agent": client_info.get("user_agent", "Xcode"),
            "X-Xcode-Version": "27.0 (27A5218g)",
            "X-Apple-App-Info": "com.apple.gs.xcode.auth",
            "X-MMe-Client-Info": client_info.get("client_info", "<MacBookPro13,3> <Mac OS X;10.12.6;16G29> <com.apple.AuthKit/1 (com.apple.akd/1.0)>"),
            "Connection": "close"
        }
        return cpd, headers, dev_id
    else:
        # Fallback to direct anisette endpoint
        r = requests.get("https://ani.sidestore.io", timeout=7).json()
        cpd = {
            "bootstrap": "true",
            "icscrec": "true",
            "loc": "en_US",
            "pbe": "false",
            "prkgen": "true",
            "svct": "iCloud",
            "X-Mme-Device-Id": r["X-Mme-Device-Id"],
            "X-Apple-I-MD": r["X-Apple-I-MD"],
            "X-Apple-I-MD-M": r["X-Apple-I-MD-M"]
        }
        headers = {
            "Content-Type": "text/x-xml-plist",
            "Accept": "text/x-xml-plist",
            "User-Agent": "Xcode",
            "X-Xcode-Version": "27.0 (27A5218g)",
            "X-Apple-App-Info": "com.apple.gs.xcode.auth",
            "X-MMe-Client-Info": r["X-MMe-Client-Info"],
            "Connection": "close"
        }
        return cpd, headers, r["X-Mme-Device-Id"]

def create_session_key(usr, name):
    k = usr.get_session_key()
    if k is None:
        raise Exception("No session key")
    return hmac.new(k, name.encode(), hashlib.sha256).digest()

def decrypt_cbc(usr, data):
    extra_data_key = create_session_key(usr, "extra data key:")
    extra_data_iv = create_session_key(usr, "extra data iv:")[:16]
    cipher = Cipher(algorithms.AES(extra_data_key), modes.CBC(extra_data_iv))
    decryptor = cipher.decryptor()
    decrypted = decryptor.update(data) + decryptor.finalize()
    padder = padding.PKCS7(128).unpadder()
    return padder.update(decrypted) + padder.finalize()

def save_cached_session(apple_id: str, data: dict):
    os.makedirs(os.path.dirname(SESSION_CACHE_FILE), exist_ok=True)
    cache = {}
    if os.path.exists(SESSION_CACHE_FILE):
        try:
            with open(SESSION_CACHE_FILE, "r") as f:
                cache = json.load(f)
        except Exception:
            cache = {}
    cache[apple_id.lower()] = data
    with open(SESSION_CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2)

def load_cached_session(apple_id: str) -> dict:
    if not os.path.exists(SESSION_CACHE_FILE):
        return {}
    try:
        with open(SESSION_CACHE_FILE, "r") as f:
            cache = json.load(f)
            return cache.get(apple_id.lower(), {})
    except Exception:
        return {}

def login_apple_id(apple_id: str, password: str, code: str = None):
    """
    Perform complete SRP login against Apple GrandSlam.
    Handles 2FA challenge and code validation.
    """
    cpd, headers, dev_id = get_anisette_headers()

    # If code is supplied, check if we have a pending 2FA session
    if code:
        cached = load_cached_session(apple_id)
        if cached.get("pending_2fa") and cached.get("adsid") and cached.get("idms_token"):
            adsid = cached["adsid"]
            idms_token = cached["idms_token"]
            identity_token = base64.b64encode(f"{adsid}:{idms_token}".encode()).decode()
            
            headers_2fa = dict(headers)
            headers_2fa["X-Apple-Identity-Token"] = identity_token
            headers_2fa["security-code"] = code.strip()

            resp_val = requests.get(
                "https://gsa.apple.com/grandslam/GsService2/validate",
                headers=headers_2fa,
                verify=APPLE_ROOT_PEM if os.path.exists(APPLE_ROOT_PEM) else False,
                timeout=12
            )
            
            if resp_val.status_code != 200:
                return {
                    "success": False,
                    "requires_2fa": False,
                    "error": f"فشل التحقق من رمز 2FA (رمز الخطأ: {resp_val.status_code})"
                }
            
            # 2FA succeeded, proceed to complete authentication
            cached["pending_2fa"] = False
            save_cached_session(apple_id, cached)
            # Re-run login without code to get final session tokens
            return login_apple_id(apple_id, password)

    # Step 1: Init request
    usr = srp.User(apple_id, bytes(), hash_alg=srp.SHA256, ng_type=srp.NG_2048)
    _, A = usr.start_authentication()

    init_body = {
        "Header": {"Version": "1.0.1"},
        "Request": {
            "A2k": A,
            "ps": ["s2k", "s2k_fo"],
            "u": apple_id,
            "o": "init",
            "cpd": cpd
        }
    }

    resp1 = requests.post(
        "https://gsa.apple.com/grandslam/GsService2",
        headers=headers,
        data=plistlib.dumps(init_body),
        verify=APPLE_ROOT_PEM if os.path.exists(APPLE_ROOT_PEM) else False,
        timeout=15
    )

    if resp1.status_code != 200:
        return {"success": False, "requires_2fa": False, "error": f"Apple auth init returned HTTP {resp1.status_code}"}

    r1 = plistlib.loads(resp1.content).get("Response", {})
    status1 = r1.get("Status", {})
    if status1.get("ec", 0) != 0:
        em = status1.get("em", "Unknown error")
        return {"success": False, "requires_2fa": False, "error": f"Apple rejected login: {em} ({status1.get('ec')})"}

    salt = r1["s"]
    B = r1["B"]
    iterations = r1["i"]
    c = r1["c"]
    proto = r1["sp"]

    # Step 2: SRP password derivation
    p = hashlib.sha256(password.encode("utf-8")).digest()
    if proto == "s2k_fo":
        p = p.hex().encode("utf-8")
    
    usr.p = pbkdf2.PBKDF2(p, salt, iterations, SHA256).read(32)
    M1 = usr.process_challenge(salt, B)
    if M1 is None:
        return {"success": False, "requires_2fa": False, "error": "Failed to compute SRP proof"}

    complete_body = {
        "Header": {"Version": "1.0.1"},
        "Request": {
            "c": c,
            "M1": M1,
            "u": apple_id,
            "o": "complete",
            "cpd": cpd
        }
    }

    resp2 = requests.post(
        "https://gsa.apple.com/grandslam/GsService2",
        headers=headers,
        data=plistlib.dumps(complete_body),
        verify=APPLE_ROOT_PEM if os.path.exists(APPLE_ROOT_PEM) else False,
        timeout=15
    )

    if resp2.status_code != 200:
        return {"success": False, "requires_2fa": False, "error": f"Apple auth complete returned HTTP {resp2.status_code}"}

    r2 = plistlib.loads(resp2.content).get("Response", {})
    status2 = r2.get("Status", {})

    if status2.get("ec", 0) != 0:
        em = status2.get("em", "بيانات الحساب غير صحيحة")
        return {"success": False, "requires_2fa": False, "error": f"Apple rejected credentials: {em}"}

    usr.verify_session(r2["M2"])
    if not usr.authenticated():
        return {"success": False, "requires_2fa": False, "error": "Failed to verify Apple session key"}

    # Decrypt session data
    spd_raw = decrypt_cbc(usr, r2["spd"])
    PLIST_HEADER = b"<?xml version='1.0' encoding='UTF-8'?>\n<!DOCTYPE plist PUBLIC '-//Apple//DTD PLIST 1.0//EN' 'http://www.apple.com/DTDs/PropertyList-1.0.dtd'>\n"
    spd = plistlib.loads(PLIST_HEADER + spd_raw)

    auth_type = status2.get("au")
    if auth_type in ["trustedDeviceSecondaryAuth", "secondaryAuth"]:
        adsid = spd.get("adsid", "")
        idms_token = spd.get("GsIdmsToken", "")
        identity_token = base64.b64encode(f"{adsid}:{idms_token}".encode()).decode()

        # Trigger 2FA prompt on trusted Apple devices
        h_trusted = dict(headers)
        h_trusted["X-Apple-Identity-Token"] = identity_token
        requests.get(
            "https://gsa.apple.com/auth/verify/trusteddevice",
            headers=h_trusted,
            verify=APPLE_ROOT_PEM if os.path.exists(APPLE_ROOT_PEM) else False,
            timeout=10
        )

        save_cached_session(apple_id, {
            "pending_2fa": True,
            "adsid": adsid,
            "idms_token": idms_token,
            "apple_id": apple_id
        })

        return {
            "success": False,
            "requires_2fa": True,
            "message": "📱 تم بدء إجراء التحقق بخطوتين (2FA) بنجاح من خوادم Apple!\nيرجى التحقق من جهاز الآيفون الخاص بك، ثم إدخال الرمز المكون من 6 أرقام أدناه والضغط على 'تأكيد الرمز'."
        }

    # Extract tokens for Developer Services 2
    # GrandSlam requires an authorized app token (com.apple.gs.xcode.auth) to access Developer Services
    xcode_token = request_app_token(spd, "com.apple.gs.xcode.auth")
    if not xcode_token:
        xcode_token = request_app_token(spd, "xcode.auth")
    if not xcode_token:
        xcode_token = spd.get("t", {}).get("com.apple.gs.xcode.auth", {}).get("token")
    if not xcode_token:
        xcode_token = spd.get("t", {}).get("xcode.auth", {}).get("token")
    if not xcode_token and "GsIdmsToken" in spd:
        xcode_token = spd["GsIdmsToken"]
    
    adsid = str(spd.get("adsid", ""))
    sk = spd.get("sk")
    c = spd.get("c")

    session_info = {
        "pending_2fa": False,
        "adsid": adsid,
        "token": xcode_token,
        "apple_id": apple_id,
        "sk_b64": base64.b64encode(sk).decode() if isinstance(sk, (bytes, bytearray)) else "",
        "c_b64": base64.b64encode(c).decode() if isinstance(c, (bytes, bytearray)) else "",
        "idms_token": spd.get("GsIdmsToken", ""),
        "authenticated_at": time.time()
    }
    save_cached_session(apple_id, session_info)

    return {
        "success": True,
        "requires_2fa": False,
        "apple_id": apple_id,
        "adsid": adsid,
        "token": xcode_token,
        "message": "تم تسجيل الدخول إلى Apple ID بنجاح!"
    }


def request_app_token(spd: dict, app_name: str = "xcode.auth") -> str:
    """
    Request application token (e.g. xcode.auth) from Apple GrandSlam (GsService2)
    using master session proof (sk, c, GsIdmsToken, adsid) in spd.
    Decrypts the AES-256-GCM encrypted token response using the session key (sk).
    """
    try:
        dsid = str(spd.get("adsid", ""))
        auth_token = spd.get("GsIdmsToken", "")
        sk = spd.get("sk")
        c = spd.get("c")

        if not dsid or not auth_token or not sk or not c:
            return ""

        if isinstance(sk, str):
            sk = base64.b64decode(sk)
        if isinstance(c, str):
            c = base64.b64decode(c)

        h = hmac.new(sk, digestmod=hashlib.sha256)
        h.update(b"apptokens")
        h.update(dsid.encode("utf-8"))
        h.update(app_name.encode("utf-8"))
        checksum = h.digest()

        cpd, base_headers, _ = get_anisette_headers()

        body = {
            "Header": {"Version": "1.0.1"},
            "Request": {
                "app": [app_name],
                "c": c,
                "checksum": checksum,
                "cpd": cpd,
                "o": "apptokens",
                "u": dsid,
                "t": auth_token
            }
        }

        headers = dict(base_headers)
        headers["Connection"] = "close"

        resp = requests.post(
            "https://gsa.apple.com/grandslam/GsService2",
            headers=headers,
            data=plistlib.dumps(body),
            verify=APPLE_ROOT_PEM if os.path.exists(APPLE_ROOT_PEM) else False,
            timeout=15
        )

        if resp.status_code != 200:
            return ""

        resp_plist = plistlib.loads(resp.content).get("Response", {})
        et = resp_plist.get("et")
        if not et or len(et) < 35 or et[:3] != b"XYZ":
            return ""

        header = et[0:3]
        iv = et[3:19]
        ciphertext_and_tag = et[19:]

        aesgcm = AESGCM(sk)
        decrypted_bytes = aesgcm.decrypt(iv, ciphertext_and_tag, header)
        PLIST_HEADER = b"<?xml version='1.0' encoding='UTF-8'?>\n<!DOCTYPE plist PUBLIC '-//Apple//DTD PLIST 1.0//EN' 'http://www.apple.com/DTDs/PropertyList-1.0.dtd'>\n<plist version='1.0'>\n"
        decrypted_plist = plistlib.loads(PLIST_HEADER + decrypted_bytes + b"\n</plist>")

        if decrypted_plist.get("status-code") != 200:
            return ""

        tokens = decrypted_plist.get("t", {})
        app_dict = tokens.get(app_name, {})
        return app_dict.get("token", "")
    except Exception:
        return ""


def send_dev_request(endpoint: str, session: dict, body_dict: dict = None):
    """Send authenticated request to Apple Developer Services 2."""
    cpd, base_headers, dev_id = get_anisette_headers()
    prefix = "" if endpoint == "listTeams" else "ios/"
    url = f"https://developerservices2.apple.com/services/QH65B2/{prefix}{endpoint}.action?clientId=XABBG36SBA"

    headers = dict(base_headers)
    for k, v in cpd.items():
        if k.startswith("X-"):
            headers[k] = str(v)

    headers["X-Apple-GS-Token"] = session["token"]
    headers["X-Apple-I-Identity-Id"] = str(session["adsid"])
    headers["User-Agent"] = "Xcode"

    req_body = {
        "clientId": "XABBG36SBA",
        "protocolVersion": "QH65B2",
        "requestId": str(uuid.uuid4()).upper(),
        "userLocale": ["en_US"]
    }
    if body_dict:
        req_body.update(body_dict)

    resp = requests.post(
        url,
        headers=headers,
        data=plistlib.dumps(req_body),
        verify=False,
        timeout=25
    )

    if resp.status_code != 200:
        raise Exception(f"Developer Services returned HTTP {resp.status_code}: {resp.text[:200]}")

    plist_resp = plistlib.loads(resp.content)
    result_code = plist_resp.get("resultCode", 0)
    if result_code != 0:
        error_string = plist_resp.get("userString") or plist_resp.get("errorString") or f"Error {result_code}"
        raise Exception(f"Apple Developer Error [{result_code}]: {error_string}")

    return plist_resp


def provision_device_and_extract_certs(apple_id: str, device_udid: str, bundle_id: str = "*", password: str = None):
    """
    1. Fetch developer teams
    2. Register device UDID
    3. Generate RSA 2048 private key & CSR
    4. Submit CSR to Apple -> Receive Certificate (.cer)
    5. Export PKCS#12 (.p12) with password 'sidelink'
    6. Register App ID / Wildcard App ID
    7. Download MobileProvisioning Profile
    8. Save all files to %APPDATA%/SideLink/Identities/{account}
    """
    try:
        session = load_cached_session(apple_id)
        if (not session or not session.get("token") or not session.get("adsid")) and password:
            login_res = login_apple_id(apple_id, password)
            if login_res.get("success"):
                session = load_cached_session(apple_id)

        if not session or not session.get("token") or not session.get("adsid"):
            return {"success": False, "error": "لا توجد جلسة نشطة مسجلة لهذا الحساب. يرجى تسجيل الدخول أولاً."}

        # Auto-upgrade token to com.apple.gs.xcode.auth if needed
        if session.get("sk_b64") and session.get("c_b64") and session.get("idms_token"):
            if not session.get("token") or "gs.xcode.auth" not in session.get("token", ""):
                try:
                    spd_cached = {
                        "adsid": session.get("adsid"),
                        "GsIdmsToken": session.get("idms_token"),
                        "sk": base64.b64decode(session["sk_b64"]),
                        "c": base64.b64decode(session["c_b64"])
                    }
                    new_tok = request_app_token(spd_cached, "com.apple.gs.xcode.auth")
                    if new_tok:
                        session["token"] = new_tok
                        save_cached_session(apple_id, session)
                except Exception:
                    pass

        clean_account = sanitize_account_name(apple_id)
        out_dir = os.path.join(IDENTITIES_BASE, clean_account)
        os.makedirs(out_dir, exist_ok=True)

        # 1. List Teams (auto-renew if session 1100 expired)
        try:
            teams_resp = send_dev_request("listTeams", session)
        except Exception as e:
            if "1100" in str(e):
                refreshed = False
                if session.get("sk_b64") and session.get("c_b64") and session.get("idms_token"):
                    try:
                        spd_cached = {
                            "adsid": session.get("adsid"),
                            "GsIdmsToken": session.get("idms_token"),
                            "sk": base64.b64decode(session["sk_b64"]),
                            "c": base64.b64decode(session["c_b64"])
                        }
                        new_token = request_app_token(spd_cached, "com.apple.gs.xcode.auth")
                        if new_token:
                            session["token"] = new_token
                            save_cached_session(apple_id, session)
                            teams_resp = send_dev_request("listTeams", session)
                            refreshed = True
                    except Exception:
                        pass

                if not refreshed and password:
                    login_res = login_apple_id(apple_id, password)
                    if login_res.get("success"):
                        session = load_cached_session(apple_id)
                        teams_resp = send_dev_request("listTeams", session)
                    else:
                        raise e
                elif not refreshed:
                    raise e
            else:
                raise e

        teams = teams_resp.get("teams", [])
        if not teams:
            return {"success": False, "error": "لم يتم العثور على أي فريق مطور (Team) مرتبط بهذا الحساب."}
        
        team_id = teams[0].get("teamId")
        team_name = teams[0].get("name", "Personal Team")

        # 2. Register Device
        devices_resp = send_dev_request("listDevices", session, {"teamId": team_id})
        existing_devices = devices_resp.get("devices", [])
        device_found = any(d.get("deviceNumber", "").lower() == device_udid.lower() for d in existing_devices)

        if not device_found:
            try:
                send_dev_request("addDevice", session, {
                    "teamId": team_id,
                    "name": "SideLink-iPhone",
                    "deviceNumber": device_udid
                })
            except Exception as e:
                # Code 35 means device already registered
                if "35" not in str(e):
                    raise e

        # 3. Generate RSA 2048 Private Key & CSR
        private_key_path = os.path.join(out_dir, "key.p8")
        private_key = None
        if os.path.exists(private_key_path):
            try:
                with open(private_key_path, "rb") as f:
                    kb = f.read()
                try:
                    private_key = serialization.load_pem_private_key(kb, password=None)
                except Exception:
                    private_key = serialization.load_der_private_key(kb, password=None)
            except Exception:
                private_key = None

        cert_content = None
        # Check existing active certs FIRST: if an active cert matches our private key, reuse it!
        # This prevents revoking certificates, keeps installed apps working, and avoids unnecessary network requests.
        if private_key:
            try:
                all_certs_resp = send_dev_request("listAllDevelopmentCerts", session, {"teamId": team_id})
                for c in all_certs_resp.get("certificates", []):
                    if c.get("status") == "Issued" and c.get("certContent"):
                        try:
                            cand = x509.load_der_x509_certificate(c["certContent"])
                            if cand.public_key().public_numbers() == private_key.public_key().public_numbers():
                                cert_content = c["certContent"]
                                break
                        except Exception:
                            pass
            except Exception:
                pass

        if not cert_content:
            if not private_key:
                private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
                with open(private_key_path, "wb") as f:
                    f.write(private_key.private_bytes(
                        encoding=serialization.Encoding.DER,
                        format=serialization.PrivateFormat.PKCS8,
                        encryption_algorithm=serialization.NoEncryption()
                    ))

            csr = x509.CertificateSigningRequestBuilder().subject_name(x509.Name([
                x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
                x509.NameAttribute(NameOID.ORGANIZATION_NAME, "SideLink"),
                x509.NameAttribute(NameOID.COMMON_NAME, f"iPhone Developer: {apple_id}")
            ])).sign(private_key, hashes.SHA256())

            csr_pem = csr.public_bytes(serialization.Encoding.PEM).decode("utf-8")

            # 4. Submit CSR (handle error 7460 max certs)
            for attempt in range(3):
                try:
                    csr_resp = send_dev_request("submitDevelopmentCSR", session, {
                        "teamId": team_id,
                        "csrContent": csr_pem,
                        "machineName": "SideLink-PC",
                        "machineId": str(uuid.uuid4()).upper()
                    })
                    cert_req = csr_resp.get("certRequest", {})
                    cert_id = cert_req.get("certRequestId")

                    # Fetch certificate list to get the issued .cer bytes
                    all_certs_resp = send_dev_request("listAllDevelopmentCerts", session, {"teamId": team_id})
                    for c in all_certs_resp.get("certificates", []):
                        if c.get("certificateId") == cert_id or (c.get("machineName") == "SideLink-PC" and c.get("certContent")):
                            cert_content = c.get("certContent")
                            break
                    if cert_content:
                        break
                except Exception as e:
                    if "7460" in str(e):
                        # Revoke oldest cert
                        all_certs = send_dev_request("listAllDevelopmentCerts", session, {"teamId": team_id}).get("certificates", [])
                        if all_certs and all_certs[0].get("serialNumber"):
                            send_dev_request("revokeDevelopmentCert", session, {
                                "teamId": team_id,
                                "serialNumber": all_certs[0]["serialNumber"]
                            })
                            continue
                    raise e

            if not cert_content:
                # Check existing active certs
                all_certs = send_dev_request("listAllDevelopmentCerts", session, {"teamId": team_id}).get("certificates", [])
                for c in all_certs:
                    if c.get("certContent"):
                        cert_content = c.get("certContent")
                        break

        if not cert_content:
            return {"success": False, "error": "تعذر استخراج شهادة المطور من خوادم Apple."}

        # 5. Export PKCS#12 (.p12) and PEM (.pem)
        cert_obj = x509.load_der_x509_certificate(cert_content)
        p12_data = pkcs12.serialize_key_and_certificates(
            name=b"SideLink Developer",
            key=private_key,
            cert=cert_obj,
            cas=None,
            encryption_algorithm=serialization.BestAvailableEncryption(b"sidelink")
        )
        p12_path = os.path.join(out_dir, "identity.p12")
        with open(p12_path, "wb") as f:
            f.write(p12_data)

        pem_path = os.path.join(out_dir, "identity.pem")
        with open(pem_path, "wb") as f:
            f.write(cert_obj.public_bytes(serialization.Encoding.PEM) + b"\n")
            f.write(private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ))

        # 6. Register App ID / Match Application Identifier
        app_ids_resp = send_dev_request("listAppIds", session, {"teamId": team_id})
        app_ids = app_ids_resp.get("appIds", [])
        app_id_obj = None

        clean_bundle_id = bundle_id.strip() if bundle_id else "*"

        # Check if exact bundle ID already exists in developer account
        if clean_bundle_id != "*":
            for a in app_ids:
                if a.get("identifier", "").lower() == clean_bundle_id.lower():
                    app_id_obj = a
                    break

        # If wildcard requested or exact not found, check if a wildcard exists
        if not app_id_obj and clean_bundle_id == "*":
            for a in app_ids:
                if a.get("identifier") == "*":
                    app_id_obj = a
                    break

        # Try creating new App ID if not found
        if not app_id_obj:
            candidates = []
            if clean_bundle_id != "*":
                candidates.append(clean_bundle_id)
                # If clean_bundle_id is globally taken (e.g. original store bundle id), try namespaced fallbacks
                clean_acc_slug = re.sub(r'[^a-zA-Z0-9]', '', clean_account)
                suffix = clean_bundle_id.split(".")[-1] if "." in clean_bundle_id else clean_bundle_id
                candidates.append(f"com.sidelink.{clean_acc_slug}.{suffix}")
                candidates.append(f"{clean_bundle_id}.sidelink")
            else:
                candidates.append(f"com.sidelink.{clean_account}")

            for target_ident in candidates:
                try:
                    name_suffix = target_ident.split(".")[-1] if "." in target_ident else target_ident
                    add_app_resp = send_dev_request("addAppId", session, {
                        "teamId": team_id,
                        "identifier": target_ident,
                        "name": f"SideLink {name_suffix[:15]}"
                    })
                    app_id_obj = add_app_resp.get("appId")
                    if app_id_obj:
                        break
                except Exception:
                    # Identifier might be already registered globally by another developer, try next
                    continue

            # Fallback only if all registrations failed (e.g. 10 App ID weekly limit reached)
            if not app_id_obj and app_ids:
                app_id_obj = app_ids[0]

        if not app_id_obj:
            return {"success": False, "error": "تعذر تسجيل معرف التطبيق (App ID) لدى Apple."}

        # 7. Download Team Provisioning Profile
        prof_resp = send_dev_request("downloadTeamProvisioningProfile", session, {
            "teamId": team_id,
            "appIdId": app_id_obj["appIdId"]
        })
        
        prov_profile = prof_resp.get("provisioningProfile", {})
        encoded_bytes = prov_profile.get("encodedProfile")
        if not encoded_bytes:
            return {"success": False, "error": "خوادم Apple لم تقم بإرجاع ملف تعريف التثبيت (Mobileprovision)."}

        profile_path = os.path.join(out_dir, "embedded.mobileprovision")
        with open(profile_path, "wb") as f:
            f.write(encoded_bytes)

        allowed_bundle_id = app_id_obj.get("identifier", "*")

        # Save per-bundle profile in profiles/ directory so multiple apps never overwrite each other
        specific_profile_path = profile_path
        try:
            profiles_dir = os.path.join(out_dir, "profiles")
            os.makedirs(profiles_dir, exist_ok=True)
            safe_bundle = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', allowed_bundle_id)
            bundle_file = os.path.join(profiles_dir, f"{safe_bundle}.mobileprovision")
            with open(bundle_file, "wb") as f:
                f.write(encoded_bytes)
            specific_profile_path = bundle_file
        except Exception:
            pass

        return {
            "success": True,
            "apple_id": apple_id,
            "team_id": team_id,
            "team_name": team_name,
            "p12_path": p12_path,
            "pem_path": pem_path,
            "profile_path": specific_profile_path,
            "allowed_bundle_id": allowed_bundle_id,
            "expiration": str(prov_profile.get("dateExpire", ""))
        }
    except Exception as e:
        return {"success": False, "error": f"فشل استخراج الشهادة: {e}"}


def main():
    parser = argparse.ArgumentParser(description="SideLink Apple Provisioning CLI")
    subparsers = parser.add_subparsers(dest="command")

    # Login command
    login_parser = subparsers.add_parser("login")
    login_parser.add_argument("--apple-id", required=True)
    login_parser.add_argument("--password", required=True)
    login_parser.add_argument("--code", required=False, default=None)

    # Provision command
    prov_parser = subparsers.add_parser("provision")
    prov_parser.add_argument("--apple-id", required=True)
    prov_parser.add_argument("--udid", required=True)
    prov_parser.add_argument("--bundle-id", required=False, default="*")
    prov_parser.add_argument("--password", required=False, default=None)

    args = parser.parse_args()

    def output_json(obj):
        try:
            payload = json.dumps(obj, ensure_ascii=False, default=str).encode("utf-8")
            sys.stdout.buffer.write(payload + b"\n")
            sys.stdout.buffer.flush()
        except Exception:
            payload = json.dumps(obj, ensure_ascii=True, default=str).encode("ascii")
            sys.stdout.buffer.write(payload + b"\n")
            sys.stdout.buffer.flush()

    if args.command == "login":
        res = login_apple_id(args.apple_id, args.password, args.code)
        output_json(res)
        sys.exit(0 if res.get("success") or res.get("requires_2fa") else 1)

    elif args.command == "provision":
        res = provision_device_and_extract_certs(args.apple_id, args.udid, args.bundle_id, args.password)
        output_json(res)
        sys.exit(0 if res.get("success") else 1)

    else:
        parser.print_help()

if __name__ == "__main__":
    main()
