import base64
import json
import urllib.request
import urllib.error
from typing import List
from backend.config import settings

CANDIDATE_AUDIO_MODELS: List[str] = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
    "gemini-flash-lite-latest"
]

TRANSCRIPTION_PROMPT = """You are an accurate audio transcription specialist for Meridian Tax & Advisory.
Transcribe the following client voicemail, call recording, or spoken audio note verbatim into clean English text.
Do not include any pleasantries, preamble, or metadata (such as 'Here is the transcription:'). Return ONLY the exact transcribed spoken words.
If the audio is completely silent or contains no discernible speech, return an empty string.
"""

def transcribe_audio_bytes(audio_bytes: bytes, mime_type: str = "audio/wav") -> str:
    """
    Transcribe raw audio bytes using Gemini multimodal audio models.
    Supports audio/wav, audio/mp3, audio/mpeg, audio/ogg, audio/webm, audio/m4a, audio/aac.
    """
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured in .env file.")

    if not audio_bytes or len(audio_bytes) < 100:
        raise ValueError("Audio payload is too small or empty.")

    # Normalize mime_type
    normalized_mime = mime_type.lower().strip()
    if normalized_mime in ["audio/mp3", "audio/mpeg"]:
        normalized_mime = "audio/mp3"
    elif "wav" in normalized_mime:
        normalized_mime = "audio/wav"
    elif "ogg" in normalized_mime:
        normalized_mime = "audio/ogg"
    elif "webm" in normalized_mime:
        normalized_mime = "audio/webm"
    elif "m4a" in normalized_mime or "mp4" in normalized_mime:
        normalized_mime = "audio/mp4"
    elif "aac" in normalized_mime:
        normalized_mime = "audio/aac"
    else:
        normalized_mime = "audio/mp3"

    b64_audio = base64.b64encode(audio_bytes).decode("utf-8")

    payload = json.dumps({
        "contents": [
            {
                "parts": [
                    {"text": TRANSCRIPTION_PROMPT},
                    {
                        "inlineData": {
                            "mimeType": normalized_mime,
                            "data": b64_audio
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 2048
        }
    }).encode("utf-8")

    last_error = None
    for model_name in CANDIDATE_AUDIO_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.GEMINI_API_KEY}"
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                candidates = data.get("candidates", [])
                if not candidates or "content" not in candidates[0]:
                    return ""
                parts = candidates[0]["content"].get("parts", [])
                if not parts or "text" not in parts[0]:
                    return ""
                transcription = parts[0]["text"].strip()
                return transcription
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            last_error = f"Gemini API Audio Error with {model_name} ({e.code}): {err_body}"
            if e.code in [404, 429, 503]:
                continue
            raise RuntimeError(last_error)
        except Exception as e:
            last_error = f"Network error during audio transcription ({model_name}): {str(e)}"
            continue

    raise RuntimeError(f"All audio transcription models failed: {last_error}")
