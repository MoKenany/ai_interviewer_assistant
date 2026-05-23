import pytest
from app.core.security import (
    hash_password, verify_password,
    create_access_token, decode_access_token
)

def test_hash_and_verify_password():
    plain = "MySecurePass123!"
    hashed = hash_password(plain)
    assert hashed != plain
    assert verify_password(plain, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_create_and_decode_token():
    payload = {"sub": "42", "role": "admin"}
    token = create_access_token(payload)
    assert isinstance(token, str)
    decoded = decode_access_token(token)
    assert decoded["sub"] == "42"
    assert decoded["role"] == "admin"

def test_decode_invalid_token():
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        decode_access_token("this.is.not.valid")
    assert exc_info.value.status_code == 401
