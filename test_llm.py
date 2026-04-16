#!/usr/bin/env python3
import json
import urllib.request
import time

requests = [
    {'text': 'hello, how are you?', 'user_id': 'elder_001', 'session_id': 'test1', 'language': 'en'},
    {'text': 'I am feeling sad today', 'user_id': 'elder_002', 'session_id': 'test2', 'language': 'en'},
    {'text': 'Can you help me with my medication?', 'user_id': 'elder_003', 'session_id': 'test3', 'language': 'en'},
    {'text': 'hello again, how are you doing?', 'user_id': 'elder_001', 'session_id': 'test4', 'language': 'en'},
]

print("Testing AI responses with OpenRouter...\n")

for req in requests:
    try:
        d = json.dumps(req).encode()
        r = urllib.request.Request('http://127.0.0.1:8001/api/process', data=d, headers={'Content-Type':'application/json'})
        resp = urllib.request.urlopen(r, timeout=15)
        body = json.loads(resp.read().decode())
        response = body.get('response', '')[:120]
        print(f'Input: {req["text"][:50]}...')
        print(f'Response: {response}...')
        print('---')
        time.sleep(1)
    except Exception as e:
        print(f'Error: {e}')

print("\nTest complete! If responses are different, AI is working properly.")
