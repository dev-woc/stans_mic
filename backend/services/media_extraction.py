"""
Media extraction service.
Uses yt-dlp to download audio from YouTube, TikTok, Vimeo URLs.
Uses FFmpeg to extract audio from video files.
"""
import os
import subprocess
import tempfile
from pathlib import Path


async def extract_audio_from_url(url: str, output_dir: Optional[str] = None) -> str:
    """
    Download audio from a YouTube/TikTok/Vimeo URL using yt-dlp.
    Returns path to the extracted audio file (mp3).
    """
    if output_dir is None:
        output_dir = tempfile.mkdtemp()

    output_template = os.path.join(output_dir, "%(id)s.%(ext)s")

    cmd = [
        "yt-dlp",
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "--output", output_template,
        "--no-playlist",
        "--max-filesize", "500m",
        url,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp failed: {result.stderr}")

    # Find the downloaded file
    files = list(Path(output_dir).glob("*.mp3"))
    if not files:
        raise RuntimeError("yt-dlp did not produce an mp3 file")

    return str(files[0])


async def extract_audio_from_video(video_path: str) -> str:
    """
    Extract audio track from a video file using FFmpeg.
    Returns path to the extracted audio file (mp3).
    """
    output_path = video_path.rsplit(".", 1)[0] + "_audio.mp3"

    cmd = [
        "ffmpeg",
        "-i", video_path,
        "-vn",                    # no video
        "-acodec", "libmp3lame",
        "-q:a", "2",              # high quality
        "-ar", "16000",           # 16kHz — optimal for Whisper
        "-ac", "1",               # mono
        output_path,
        "-y",                     # overwrite if exists
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg extraction failed: {result.stderr}")

    return output_path


from typing import Optional
