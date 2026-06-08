import subprocess
import json
import sys
import os

OLLAMA_MODEL = "llama3.1"

def generate_text(prompt, system_prompt=None):
    """Generates text using the local Ollama CLI."""
    
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False
    }
    
    if system_prompt:
        payload["system"] = system_prompt

    # We use curl to the local API because it's more stable than the CLI for scripts
    # and allows passing system prompts properly.
    
    curl_cmd = [
        "curl", "-s", "-X", "POST", "http://localhost:11434/api/generate",
        "-H", "Content-Type: application/json",
        "-d", json.dumps(payload)
    ]
    
    try:
        result = subprocess.run(curl_cmd, capture_output=True, text=True, check=True)
        response_data = json.loads(result.stdout)
        return response_data.get("response", "")
    except Exception as e:
        print(f"Error calling Ollama API: {e}", file=sys.stderr)
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 ollama_client.py 'your prompt here'")
        sys.exit(1)
        
    prompt = sys.argv[1]
    
    # Optional: Load system prompt from AGENT_INSTRUCTIONS.md if we want
    system_prompt = "Ти — корисний AI-асистент."
    
    response = generate_text(prompt, system_prompt=system_prompt)
    if response:
        print(response)
