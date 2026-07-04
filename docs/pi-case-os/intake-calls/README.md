# Intake call transcripts (text only)

**No raw audio in repo** — only Whisper `.txt` transcripts. Source audio was removed after extraction.

## Files

| Transcript | Source (historical) | Pulled into |
|------------|---------------------|-------------|
| `Intake Class 8.28.19.txt` | Intake class session | `../articles/17-in-office-intake-coaching.md` |
| `Intake.txt` | In-office intake roleplay | same |
| `Intake 2.txt` | In-office intake roleplay | same |
| `Intake herman.txt` | In-office intake roleplay | same |

Content is **in-office intake coaching** (facts of loss, priors, PD, treatment, fee agreement) — not a cold phone lead greeting script.

## Re-transcribe rule

If new intake audio is added locally for transcription:

1. Run Whisper → save `*.txt` here only  
2. Extract operational content into `../articles/` and specs  
3. **Delete the audio** — do not commit media files (see `../.gitignore`)
