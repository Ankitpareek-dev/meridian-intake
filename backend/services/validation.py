import re
from fastapi import HTTPException, status

def validate_transcript_input(transcript: str) -> str:
    """
    Validates that a raw input transcript is clean, non-empty, meets minimum
    length/word counts, and contains intelligible human text before triggering
    downstream LLM and vector retrieval pipelines.
    
    Raises:
        HTTPException(400) if empty.
        HTTPException(422) if too short, purely numeric, repetitive noise, or unintelligible.
    """
    if transcript is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcript cannot be null."
        )
        
    cleaned = transcript.strip()
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcript cannot be empty."
        )

    # 1. Minimum Character Length (must be at least 15 characters)
    if len(cleaned) < 15:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Input transcript is too short ({len(cleaned)} chars). Minimum required length is 15 characters."
        )

    # 2. Numeric / Punctuation Noise Filter (reject purely digits or symbols)
    alpha_chars = re.findall(r"[a-zA-Z]", cleaned)
    if len(alpha_chars) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Input does not contain intelligible speech or text (purely numeric, symbols, or insufficient alphabetic content)."
        )

    # 3. Word Count Minimum (must be at least 3 distinct words)
    words = re.findall(r"\b[a-zA-Z0-9_\'-]+\b", cleaned)
    if len(words) < 3:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Input transcript contains only {len(words)} word(s). A minimum of 3 words is required."
        )

    # 4. Repetitive Character / Gibberish Detection (e.g., 'aaaaa', 'zzzzzz')
    unique_chars = set(cleaned.lower().replace(" ", ""))
    if len(unique_chars) <= 3 and len(cleaned) > 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Input does not contain intelligible speech or text (repetitive character noise detected)."
        )

    # 5. Linguistic Word Quality Check (must have at least two alphabetic words with length >= 2)
    valid_alpha_words = [w for w in words if re.match(r"^[a-zA-Z]+$", w) and len(w) >= 2]
    if len(valid_alpha_words) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Input does not contain intelligible speech or text (missing readable English words)."
        )

    return cleaned
