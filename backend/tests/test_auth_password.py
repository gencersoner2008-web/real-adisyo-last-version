"""Auth: login, change-password, reset-password"""
import os
import pytest
import requests

from dotenv import dotenv_values
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/")

API = f"{BASE_URL}/api"
DEFAULT_PW = "1234"
NEW_PW = "kahve99"


def _login(pw):
    last = None
    for _ in range(3):
        try:
            return requests.post(f"{API}/auth/login", json={"password": pw}, timeout=30)
        except requests.exceptions.RequestException as e:
            last = e
    raise last


def _reset_to_default():
    # login with either default or NEW_PW to get token, then reset
    for pw in (DEFAULT_PW, NEW_PW):
        r = _login(pw)
        if r.status_code == 200:
            tok = r.json()["token"]
            requests.post(f"{API}/auth/reset-password", headers={"Authorization": f"Bearer {tok}"}, timeout=15)
            return
    raise RuntimeError("cannot restore default password")


@pytest.fixture(autouse=True)
def _ensure_default():
    _reset_to_default()
    yield
    _reset_to_default()


def test_login_default_password_success():
    r = _login(DEFAULT_PW)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("token") == "real-coffee-session-token"


def test_login_wrong_password_401():
    r = _login("wrong-pw")
    assert r.status_code == 401
    assert "hatal" in r.json().get("detail", "").lower()


def test_change_password_flow():
    # login default
    tok = _login(DEFAULT_PW).json()["token"]
    headers = {"Authorization": f"Bearer {tok}"}

    # change to new
    r = requests.put(f"{API}/auth/password",
                     json={"current_password": DEFAULT_PW, "new_password": NEW_PW},
                     headers=headers, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True

    # old must fail
    assert _login(DEFAULT_PW).status_code == 401
    # new must succeed
    r2 = _login(NEW_PW)
    assert r2.status_code == 200


def test_change_password_wrong_current():
    tok = _login(DEFAULT_PW).json()["token"]
    headers = {"Authorization": f"Bearer {tok}"}
    r = requests.put(f"{API}/auth/password",
                     json={"current_password": "nope", "new_password": "abcd"},
                     headers=headers, timeout=15)
    assert r.status_code == 401


def test_change_password_too_short():
    tok = _login(DEFAULT_PW).json()["token"]
    headers = {"Authorization": f"Bearer {tok}"}
    r = requests.put(f"{API}/auth/password",
                     json={"current_password": DEFAULT_PW, "new_password": "ab"},
                     headers=headers, timeout=15)
    assert r.status_code == 400


def test_change_password_requires_auth():
    r = requests.put(f"{API}/auth/password",
                     json={"current_password": DEFAULT_PW, "new_password": NEW_PW}, timeout=15)
    assert r.status_code == 401


def test_reset_password_requires_auth():
    r = requests.post(f"{API}/auth/reset-password", timeout=15)
    assert r.status_code == 401


def test_reset_password_restores_default():
    # change first
    tok = _login(DEFAULT_PW).json()["token"]
    headers = {"Authorization": f"Bearer {tok}"}
    requests.put(f"{API}/auth/password",
                 json={"current_password": DEFAULT_PW, "new_password": NEW_PW},
                 headers=headers, timeout=15)
    # verify default is broken
    assert _login(DEFAULT_PW).status_code == 401
    # reset using new-pw session
    tok2 = _login(NEW_PW).json()["token"]
    r = requests.post(f"{API}/auth/reset-password",
                      headers={"Authorization": f"Bearer {tok2}"}, timeout=15)
    assert r.status_code == 200
    # default works again
    assert _login(DEFAULT_PW).status_code == 200
    assert _login(NEW_PW).status_code == 401
