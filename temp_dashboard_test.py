import os
from fastapi.testclient import TestClient
from app.main import app

os.chdir(r'd:/Program Files/User Program/Antigravity/AI-4/New folder/interview-platform')
client = TestClient(app)
res = client.get('/api/v1/dashboard/metrics')
print('status', res.status_code)
print(res.text)
