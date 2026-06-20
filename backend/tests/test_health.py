# backend/tests/test_health.py

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_root_health():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "TrueMark Backend API"
