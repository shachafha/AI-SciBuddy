import os
import httpx
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("DATABRICKS_TOKEN") or os.getenv("DATABRICS_TOKEN")
base_url = "https://7474660200307946.ai-gateway.cloud.databricks.com/mlflow/v1"

try:
    response = httpx.post(
        f"{base_url}/chat/completions",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"model": "databricks-qwen3-next-80b-a3b-instruct", "messages": [{"role": "user", "content": "Hello! Reply with 'Auth works'."}], "max_tokens": 10},
        timeout=30
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Response: {response.json()['choices'][0]['message']['content']}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Exception: {e}")
