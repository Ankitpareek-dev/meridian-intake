import pytest
from fastapi import HTTPException
from backend.services.validation import validate_transcript_input

def test_validate_empty_and_null():
    with pytest.raises(HTTPException) as exc:
        validate_transcript_input(None)
    assert exc.value.status_code == 400

    with pytest.raises(HTTPException) as exc:
        validate_transcript_input("   ")
    assert exc.value.status_code == 400

def test_validate_too_short():
    with pytest.raises(HTTPException) as exc:
        validate_transcript_input("Hello there")
    assert exc.value.status_code == 422
    assert "too short" in exc.value.detail.lower()

def test_validate_too_few_words():
    with pytest.raises(HTTPException) as exc:
        validate_transcript_input("ExtremelyLongSingleWordWithoutSpaces")
    assert exc.value.status_code == 422
    assert "word" in exc.value.detail.lower()

def test_validate_purely_numeric():
    with pytest.raises(HTTPException) as exc:
        validate_transcript_input("1234567890 987654321 0000")
    assert exc.value.status_code == 422
    assert "intelligible" in exc.value.detail.lower() or "numeric" in exc.value.detail.lower()

def test_validate_pure_punctuation_and_symbols():
    with pytest.raises(HTTPException) as exc:
        validate_transcript_input("??? !!! ??? !!! $$$ ###")
    assert exc.value.status_code == 422
    assert "intelligible" in exc.value.detail.lower()

def test_validate_repetitive_gibberish():
    with pytest.raises(HTTPException) as exc:
        validate_transcript_input("aaaaa aaaaa aaaaa aaaaa")
    assert exc.value.status_code == 422
    assert "repetitive" in exc.value.detail.lower()

def test_validate_valid_transcript():
    valid_text = "Hi, my name is Marcus Vance. We need tax filing support for our LLC before the deadline."
    result = validate_transcript_input(valid_text)
    assert result == valid_text
