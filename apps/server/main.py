import asyncio
import json
import base64
import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
from transformers import (
    AutoModelForImageTextToText,
    TextIteratorStreamer,
    GenerationConfig,
)
import numpy as np
import logging
import sys
import io
from PIL import Image
import time
import os
import requests
import soundfile as sf
from datetime import datetime
from pathlib import Path
from threading import Thread
import re
import shutil
from typing import Optional, Dict, Any, Tuple
from huggingface_hub import snapshot_download

# Project-local Hugging Face cache to avoid corrupted global cache
SERVER_DIR = Path(__file__).resolve().parent
PROJECT_HF_CACHE = SERVER_DIR / ".cache" / "huggingface"
# Force all Hugging Face hub operations to use our cache (avoids broken global cache)
os.environ.setdefault("HF_HUB_CACHE", str(PROJECT_HF_CACHE))
import uvicorn

# FastAPI imports
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from contextlib import asynccontextmanager

# Import Kokoro TTS library
from kokoro import KPipeline

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# --- Multilingual chatbot integration (AI Chat Bot project, used as-is) ---
CHATBOT_BASE_URL = "http://127.0.0.1:5000"
if CHATBOT_BASE_URL:
    logger.info(f"Chatbot integration enabled: {CHATBOT_BASE_URL} (voice/text -> STT/chat/TTS -> avatar)")


def chatbot_available() -> bool:
    return CHATBOT_BASE_URL is not None and len(CHATBOT_BASE_URL) > 0


def _pcm_to_wav_bytes(pcm_bytes: bytes, sample_rate: int = 16000) -> bytes:
    """Build WAV bytes from raw PCM (mono, 16-bit) for chatbot STT."""
    buf = io.BytesIO()
    samples = np.frombuffer(pcm_bytes, dtype=np.int16)
    sf.write(buf, samples, sample_rate, format="WAV", subtype="PCM_16")
    buf.seek(0)
    return buf.read()


def _tts_mpeg_to_pcm_24k(mpeg_bytes: bytes) -> Tuple[Optional[np.ndarray], list]:
    """Convert TTS audio bytes (from chatbot, usually audio/mpeg) to mono 24kHz PCM for avatar lip-sync. Returns (samples, []) - no word timings from Sarvam."""
    try:
        from pydub import AudioSegment
        buf = io.BytesIO(mpeg_bytes)
        try:
            seg = AudioSegment.from_file(buf, format="mp3")
        except Exception:
            buf.seek(0)
            seg = AudioSegment.from_file(buf)
        seg = seg.set_frame_rate(24000).set_channels(1)
        samples = np.array(seg.get_array_of_samples(), dtype=np.float32) / 32768.0
        return samples, []
    except Exception as e:
        logger.warning(f"Chatbot TTS to PCM conversion failed: {e}")
        return None, []


async def _chatbot_stt(audio_wav_bytes: bytes) -> Tuple[Optional[str], Optional[str]]:
    """Call chatbot /speech-to-text. Returns (transcription, language_code) or (None, None)."""
    if not CHATBOT_BASE_URL:
        return None, None
    try:
        url = f"{CHATBOT_BASE_URL.rstrip('/')}/speech-to-text"
        files = {"audio": ("audio.wav", audio_wav_bytes, "audio/wav")}
        resp = requests.post(url, files=files, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data.get("transcription", "").strip(), data.get("language_code", "en-IN")
    except Exception as e:
        logger.error(f"Chatbot STT request failed: {e}")
        return None, None


async def _chatbot_chat(message: str, session_id: str) -> Optional[str]:
    """Call chatbot /chat. Returns response text or None."""
    if not CHATBOT_BASE_URL:
        return None
    try:
        url = f"{CHATBOT_BASE_URL.rstrip('/')}/chat"
        payload = {"message": message, "role": "user", "session_id": session_id}
        resp = requests.post(url, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        return (data.get("response") or "").strip()
    except Exception as e:
        logger.error(f"Chatbot /chat request failed: {e}")
        return None


async def _chatbot_tts(text: str, target_language_code: str, source_language_code: str) -> Optional[bytes]:
    """Call chatbot /text-to-speech. Returns raw audio bytes (MPEG) or None."""
    if not CHATBOT_BASE_URL:
        return None
    try:
        url = f"{CHATBOT_BASE_URL.rstrip('/')}/text-to-speech"
        payload = {
            "inputs": [text],
            "target_language_code": target_language_code,
            "source_language_code": source_language_code,
        }
        resp = requests.post(url, json=payload, timeout=60)
        resp.raise_for_status()
        return resp.content
    except Exception as e:
        logger.error(f"Chatbot TTS request failed: {e}")
        return None


# Add compatibility for Python < 3.10 where anext is not available
try:
    anext
except NameError:

    async def anext(iterator):
        """Get the next item from an async iterator, or raise StopAsyncIteration."""
        try:
            return await iterator.__anext__()
        except StopAsyncIteration:
            raise


class ImageManager:
    """Manages image saving and verification"""

    def __init__(self, save_directory="received_images"):
        self.save_directory = Path(save_directory)
        self.save_directory.mkdir(exist_ok=True)
        logger.info(f"Image save directory: {self.save_directory.absolute()}")

    def save_image(self, image_data: bytes, client_id: str, prefix: str = "img") -> str:
        """Save image data and return the filename"""
        try:
            # Create timestamp-based filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]  # milliseconds
            filename = f"{prefix}_{client_id}_{timestamp}.jpg"
            filepath = self.save_directory / filename

            # Save the image
            with open(filepath, "wb") as f:
                f.write(image_data)

            # Log file info
            file_size = len(image_data)
            logger.info(f"💾 Saved image: {filename} ({file_size:,} bytes)")

            return str(filepath)

        except Exception as e:
            logger.error(f"❌ Error saving image: {e}")
            return None

    def verify_image(self, filepath: str) -> dict:
        """Verify saved image and return info"""
        try:
            if not os.path.exists(filepath):
                return {"error": "File not found"}

            # Get file stats
            stat = os.stat(filepath)
            file_size = stat.st_size

            # Try to open with PIL to verify it's a valid image
            with Image.open(filepath) as img:
                info = {
                    "filepath": filepath,
                    "file_size": file_size,
                    "format": img.format,
                    "mode": img.mode,
                    "size": img.size,
                    "width": img.width,
                    "height": img.height,
                    "valid": True,
                }

            logger.info(f"✅ Image verified: {info}")
            return info

        except Exception as e:
            logger.error(f"❌ Error verifying image {filepath}: {e}")
            return {"error": str(e), "valid": False}


class WhisperProcessor:
    """Handles speech-to-text using Whisper model"""

    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.device = "cuda:0" if torch.cuda.is_available() else "cpu"
        self.torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

        logger.info(f"Using device for Whisper: {self.device}")

        model_id = "openai/whisper-tiny"
        # Use a flat local_dir so we never touch the broken hub cache structure
        local_whisper_dir = PROJECT_HF_CACHE / "whisper-tiny"
        config_path = local_whisper_dir / "config.json"
        # openai/whisper-tiny has pytorch_model.bin, not model.safetensors
        weights_ok = (local_whisper_dir / "model.safetensors").exists() or (
            local_whisper_dir / "pytorch_model.bin"
        ).exists()

        if not config_path.exists() or not weights_ok:
            logger.info(f"Downloading {model_id} to {local_whisper_dir}...")
            if local_whisper_dir.exists():
                try:
                    shutil.rmtree(local_whisper_dir)
                except Exception as e:
                    logger.warning(f"Could not remove old dir: {e}")
            snapshot_download(
                repo_id=model_id,
                local_dir=str(local_whisper_dir),
                local_dir_use_symlinks=False,
                force_download=True,
            )
            logger.info(f"Downloaded {model_id}")

        load_path = str(local_whisper_dir)
        logger.info(f"Loading Whisper from {load_path}...")

        # Use safetensors only if present; otherwise use pytorch_model.bin
        use_safetensors = (local_whisper_dir / "model.safetensors").exists()
        self.model = AutoModelForSpeechSeq2Seq.from_pretrained(
            load_path,
            torch_dtype=self.torch_dtype,
            low_cpu_mem_usage=True,
            use_safetensors=use_safetensors,
            local_files_only=True,
        )
        self.model.to(self.device)

        self.processor = AutoProcessor.from_pretrained(
            load_path,
            local_files_only=True,
        )

        # Create pipeline
        self.pipe = pipeline(
            "automatic-speech-recognition",
            model=self.model,
            tokenizer=self.processor.tokenizer,
            feature_extractor=self.processor.feature_extractor,
            torch_dtype=self.torch_dtype,
            device=self.device,
        )

        logger.info("Whisper model ready for transcription")
        self.transcription_count = 0

    async def transcribe_audio(self, audio_bytes):
        """Transcribe audio bytes to text"""
        try:
            # Convert audio bytes to numpy array
            audio_array = (
                np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
            )

            # Run transcription in executor to avoid blocking
            result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: self.pipe(audio_array)
            )

            transcribed_text = result["text"].strip()
            self.transcription_count += 1

            logger.info(
                f"Transcription #{self.transcription_count}: '{transcribed_text}'"
            )

            # Check for noise/empty transcription
            if not transcribed_text or len(transcribed_text) < 3:
                return "NO_SPEECH"

            # Check for common noise indicators
            noise_indicators = ["thank you", "thanks for watching", "you", ".", ""]
            if transcribed_text.lower().strip() in noise_indicators:
                return "NOISE_DETECTED"

            return transcribed_text

        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return None


class SmolVLMProcessor:
    """Handles image + text processing using SmolVLM2 model"""

    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @staticmethod
    def _smolvlm_cache_subdir() -> Path:
        return PROJECT_HF_CACHE / "models--HuggingFaceTB--SmolVLM2-256M-Video-Instruct"

    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device for SmolVLM2: {self.device}")

        model_id = "HuggingFaceTB/SmolVLM2-256M-Video-Instruct"
        logger.info(f"Loading {model_id}...")

        def _load():
            self.processor = AutoProcessor.from_pretrained(model_id)
            self.model = AutoModelForImageTextToText.from_pretrained(
                model_id,
                torch_dtype=torch.bfloat16,
                attn_implementation="flash_attention_2",
                device_map="auto",
            )

        try:
            _load()
        except (FileNotFoundError, OSError, ValueError) as e:
            logger.warning(f"SmolVLM load failed ({e}). Clearing cache and re-downloading...")
            cache_subdir = self._smolvlm_cache_subdir()
            if cache_subdir.exists():
                try:
                    shutil.rmtree(cache_subdir)
                    logger.info(f"Cleared {cache_subdir}")
                except Exception as rm_e:
                    logger.warning(f"Could not clear cache: {rm_e}")
            self.processor = AutoProcessor.from_pretrained(model_id, force_download=True)
            self.model = AutoModelForImageTextToText.from_pretrained(
                model_id,
                force_download=True,
                torch_dtype=torch.bfloat16,
                attn_implementation="flash_attention_2",
                device_map="auto",
            )

        logger.info("SmolVLM2 model ready for multimodal generation")

        # Cache for most recent image
        self.last_image = None
        self.last_image_timestamp = 0
        self.lock = asyncio.Lock()

        # Message history management
        self.message_history = []
        self.max_history_messages = 4  # Keep last 4 exchanges

        # Counter
        self.generation_count = 0

    async def set_image(self, image_data):
        """Cache the most recent image received"""
        async with self.lock:
            try:
                # Convert image data to PIL Image
                image = Image.open(io.BytesIO(image_data))

                # Resize to 75% of original size for efficiency
                new_size = (int(image.size[0] * 0.75), int(image.size[1] * 0.75))
                image = image.resize(new_size, Image.Resampling.LANCZOS)

                # Clear message history when new image is set
                self.message_history = []
                self.last_image = image
                self.last_image_timestamp = time.time()
                logger.info("Image cached successfully")
                return True
            except Exception as e:
                logger.error(f"Error processing image: {e}")
                return False

    async def process_text_with_image(self, text, initial_chunks=3):
        """Process text with image context using SmolVLM2"""
        async with self.lock:
            try:
                if not self.last_image:
                    messages = [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": text},
                            ],
                        },
                    ]
                else:
                    messages = [
                        {
                            "role": "user",
                            "content": [
                                {"type": "image", "url": self.last_image},
                                {"type": "text", "text": text},
                            ],
                        },
                    ]

                # Apply chat template
                inputs = self.processor.apply_chat_template(
                    messages,
                    add_generation_prompt=True,
                    tokenize=True,
                    return_dict=True,
                    return_tensors="pt",
                ).to(self.device, dtype=torch.bfloat16)

                # Create a streamer for token-by-token generation
                streamer = TextIteratorStreamer(
                    tokenizer=self.processor.tokenizer,
                    skip_special_tokens=True,
                    skip_prompt=True,
                    clean_up_tokenization_spaces=False,
                )

                # Configure generation parameters
                generation_kwargs = dict(
                    **inputs,
                    do_sample=False,
                    max_new_tokens=1200,
                    streamer=streamer,
                )

                # Start generation in a separate thread
                thread = Thread(target=self.model.generate, kwargs=generation_kwargs)
                thread.start()

                # Collect initial text until we have a complete sentence or enough content
                initial_text = ""
                min_chars = 50  # Minimum characters to collect for initial chunk
                sentence_end_pattern = re.compile(r"[.!?]")
                has_sentence_end = False
                initial_collection_stopped_early = False

                # Collect the first sentence or minimum character count
                for chunk in streamer:
                    initial_text += chunk
                    logger.info(f"Streaming chunk: '{chunk}'")

                    # Check if we have a sentence end
                    if sentence_end_pattern.search(chunk):
                        has_sentence_end = True
                        # If we have at least some content, break after sentence end
                        if len(initial_text) >= min_chars / 2:
                            initial_collection_stopped_early = True
                            break

                    # If we have enough content, break
                    if len(initial_text) >= min_chars and (
                        has_sentence_end or "," in initial_text
                    ):
                        initial_collection_stopped_early = True
                        break

                    # Safety check - if we've collected a lot of text without sentence end
                    if len(initial_text) >= min_chars * 2:
                        initial_collection_stopped_early = True
                        break

                # Return initial text and the streamer for continued generation
                self.generation_count += 1
                logger.info(
                    f"SmolVLM2 initial generation: '{initial_text}' ({len(initial_text)} chars)"
                )

                # Store user message and initial response
                self.pending_user_message = text
                self.pending_response = initial_text

                return streamer, initial_text, initial_collection_stopped_early

            except Exception as e:
                logger.error(f"SmolVLM2 streaming generation error: {e}")
                return None, f"Error processing: {text}", False

    def update_history_with_complete_response(
        self, user_text, initial_response, remaining_text=None
    ):
        """Update message history with complete response, including any remaining text"""
        # Combine initial and remaining text if available
        complete_response = initial_response
        if remaining_text:
            complete_response = initial_response + remaining_text

        # Add to history for context in future exchanges
        self.message_history.append({"role": "user", "text": user_text})

        self.message_history.append({"role": "assistant", "text": complete_response})

        # Trim history to keep only recent messages
        if len(self.message_history) > self.max_history_messages:
            self.message_history = self.message_history[-self.max_history_messages :]

        logger.info(
            f"Updated message history with complete response ({len(complete_response)} chars)"
        )


class KokoroTTSProcessor:
    """Handles text-to-speech conversion using Kokoro model"""

    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        logger.info("Initializing Kokoro TTS processor...")
        try:
            # Initialize Kokoro TTS pipeline
            self.pipeline = KPipeline(lang_code="a")

            # Set voice
            self.default_voice = "af_sarah"

            logger.info("Kokoro TTS processor initialized successfully")
            # Counter
            self.synthesis_count = 0
        except Exception as e:
            logger.error(f"Error initializing Kokoro TTS: {e}")
            self.pipeline = None

    async def synthesize_initial_speech_with_timing(self, text):
        """Convert initial text to speech using Kokoro TTS data"""
        if not text or not self.pipeline:
            return None, []

        try:
            logger.info(f"Synthesizing initial speech for text: '{text}'")

            # Run TTS in a thread pool to avoid blocking
            audio_segments = []
            all_word_timings = []
            time_offset = 0  # Track cumulative time for multiple segments

            # Use the executor to run the TTS pipeline with minimal splitting
            generator = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.pipeline(
                    text,
                    voice=self.default_voice,
                    speed=1,
                    split_pattern=None,  # No splitting for initial text to process faster
                ),
            )

            # Process all generated segments and extract NATIVE timing
            for i, result in enumerate(generator):
                # Extract the components as shown in your screenshot
                gs = result.graphemes  # str - the text graphemes
                ps = result.phonemes  # str - the phonemes
                audio = result.audio.cpu().numpy()  # numpy array
                tokens = result.tokens  # List[en.MToken] - THE TIMING GOLD!

                logger.info(
                    f"Segment {i}: {len(tokens)} tokens, audio shape: {audio.shape}"
                )

                # Extract word timing from native tokens with null checks
                for token in tokens:
                    # Check if timing data is available
                    if token.start_ts is not None and token.end_ts is not None:
                        word_timing = {
                            "word": token.text,
                            "start_time": (token.start_ts + time_offset)
                            * 1000,  # Convert to milliseconds
                            "end_time": (token.end_ts + time_offset)
                            * 1000,  # Convert to milliseconds
                        }
                        all_word_timings.append(word_timing)
                        logger.debug(
                            f"Word: '{token.text}' Start: {word_timing['start_time']:.1f}ms End: {word_timing['end_time']:.1f}ms"
                        )
                    else:
                        # Log when timing data is missing
                        logger.debug(
                            f"Word: '{token.text}' - No timing data available (start_ts: {token.start_ts}, end_ts: {token.end_ts})"
                        )

                # Add audio segment
                audio_segments.append(audio)

                # Update time offset for next segment
                if len(audio) > 0:
                    segment_duration = len(audio) / 24000  # seconds
                    time_offset += segment_duration

            # Combine all audio segments
            if audio_segments:
                combined_audio = np.concatenate(audio_segments)
                self.synthesis_count += 1
                logger.info(
                    f"✨ Initial speech synthesis complete: {len(combined_audio)} samples, {len(all_word_timings)} word timings"
                )
                return combined_audio, all_word_timings
            return None, []

        except Exception as e:
            logger.error(f"Initial speech synthesis with timing error: {e}")
            return None, []

    async def synthesize_remaining_speech_with_timing(self, text):
        """Convert remaining text to speech using Kokoro TTS data"""
        if not text or not self.pipeline:
            return None, []

        try:
            logger.info(
                f"Synthesizing chunk speech for text: '{text[:50]}...' if len(text) > 50 else text"
            )

            # Run TTS in a thread pool to avoid blocking
            audio_segments = []
            all_word_timings = []
            time_offset = 0  # Track cumulative time for multiple segments

            # Determine appropriate split pattern based on text length
            if len(text) < 100:
                split_pattern = None  # No splitting for very short chunks
            else:
                split_pattern = r"[.!?。！？]+"

            # Use the executor to run the TTS pipeline with optimized splitting
            generator = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.pipeline(
                    text, voice=self.default_voice, speed=1, split_pattern=split_pattern
                ),
            )

            # Process all generated segments and extract NATIVE timing
            for i, result in enumerate(generator):
                # Extract the components with NATIVE timing
                gs = result.graphemes  # str
                ps = result.phonemes  # str
                audio = result.audio.cpu().numpy()  # numpy array
                tokens = result.tokens  # List[en.MToken] - THE TIMING GOLD!

                logger.info(
                    f"Chunk segment {i}: {len(tokens)} tokens, audio shape: {audio.shape}"
                )

                # Extract word timing from native tokens with null checks
                for token in tokens:
                    # Check if timing data is available
                    if token.start_ts is not None and token.end_ts is not None:
                        word_timing = {
                            "word": token.text,
                            "start_time": (token.start_ts + time_offset)
                            * 1000,  # Convert to milliseconds
                            "end_time": (token.end_ts + time_offset)
                            * 1000,  # Convert to milliseconds
                        }
                        all_word_timings.append(word_timing)
                        logger.debug(
                            f"Chunk word: '{token.text}' Start: {word_timing['start_time']:.1f}ms End: {word_timing['end_time']:.1f}ms"
                        )
                    else:
                        # Log when timing data is missing
                        logger.debug(
                            f"Chunk word: '{token.text}' - No timing data available (start_ts: {token.start_ts}, end_ts: {token.end_ts})"
                        )

                # Add audio segment
                audio_segments.append(audio)

                # Update time offset for next segment
                if len(audio) > 0:
                    segment_duration = len(audio) / 24000  # seconds
                    time_offset += segment_duration

            # Combine all audio segments
            if audio_segments:
                combined_audio = np.concatenate(audio_segments)
                self.synthesis_count += 1
                logger.info(
                    f"✨ Chunk speech synthesis complete: {len(combined_audio)} samples, {len(all_word_timings)} word timings"
                )
                return combined_audio, all_word_timings
            return None, []

        except Exception as e:
            logger.error(f"Chunk speech synthesis with timing error: {e}")
            return None, []


async def collect_remaining_text(streamer, chunk_size=80):
    """Collect remaining text from the streamer in smaller chunks

    Args:
        streamer: The text streamer object
        chunk_size: Maximum characters per chunk before yielding

    Yields:
        Text chunks as they become available
    """
    current_chunk = ""

    if streamer:
        try:
            for chunk in streamer:
                current_chunk += chunk
                logger.info(f"Collecting remaining text chunk: '{chunk}'")

                # Check if we've reached a good breaking point (sentence end)
                if len(current_chunk) >= chunk_size and (
                    current_chunk.endswith(".")
                    or current_chunk.endswith("!")
                    or current_chunk.endswith("?")
                    or "." in current_chunk[-15:]
                ):
                    logger.info(f"Yielding text chunk of length {len(current_chunk)}")
                    yield current_chunk
                    current_chunk = ""

            # Yield any remaining text
            if current_chunk:
                logger.info(f"Yielding final text chunk of length {len(current_chunk)}")
                yield current_chunk

        except asyncio.CancelledError:
            # If there's text collected before cancellation, yield it
            if current_chunk:
                logger.info(
                    f"Yielding partial text chunk before cancellation: {len(current_chunk)} chars"
                )
                yield current_chunk
            raise


# Store active connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        # Track current processing tasks for each client
        self.current_tasks: Dict[str, Dict[str, asyncio.Task]] = {}
        # Add image manager
        self.image_manager = ImageManager()
        # Track statistics
        self.stats = {
            "audio_segments_received": 0,
            "images_received": 0,
            "audio_with_image_received": 0,
            "last_reset": datetime.now(),
        }

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.current_tasks[client_id] = {"processing": None, "tts": None}
        logger.info(f"Client {client_id} connected")

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.current_tasks:
            del self.current_tasks[client_id]
        logger.info(f"Client {client_id} disconnected")

    async def cancel_current_tasks(self, client_id: str):
        """Cancel any ongoing processing tasks for a client"""
        if client_id in self.current_tasks:
            tasks = self.current_tasks[client_id]

            # Cancel processing task
            if tasks["processing"] and not tasks["processing"].done():
                logger.info(f"Cancelling processing task for client {client_id}")
                tasks["processing"].cancel()
                try:
                    await tasks["processing"]
                except asyncio.CancelledError:
                    pass

            # Cancel TTS task
            if tasks["tts"] and not tasks["tts"].done():
                logger.info(f"Cancelling TTS task for client {client_id}")
                tasks["tts"].cancel()
                try:
                    await tasks["tts"]
                except asyncio.CancelledError:
                    pass

            # Reset tasks
            self.current_tasks[client_id] = {"processing": None, "tts": None}

    def set_task(self, client_id: str, task_type: str, task: asyncio.Task):
        """Set a task for a client"""
        if client_id in self.current_tasks:
            self.current_tasks[client_id][task_type] = task

    def update_stats(self, event_type: str):
        """Update statistics"""
        if event_type in self.stats:
            self.stats[event_type] += 1

    def get_stats(self) -> dict:
        """Get current statistics"""
        uptime = datetime.now() - self.stats["last_reset"]
        return {
            **self.stats,
            "uptime_seconds": uptime.total_seconds(),
            "active_connections": len(self.active_connections),
        }


manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing models on startup...")
    try:
        # Initialize processors to load models
        whisper_processor = WhisperProcessor.get_instance()
        smolvlm_processor = SmolVLMProcessor.get_instance()
        tts_processor = KokoroTTSProcessor.get_instance()
        logger.info("All models initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing models: {e}")
        raise

    yield  # Server is running

    # Shutdown
    logger.info("Shutting down server...")
    # Close any remaining connections
    for client_id in list(manager.active_connections.keys()):
        try:
            await manager.active_connections[client_id].close()
        except Exception as e:
            logger.error(f"Error closing connection for {client_id}: {e}")
        manager.disconnect(client_id)
    logger.info("Server shutdown complete")


# Initialize FastAPI app
app = FastAPI(
    title="Whisper + SmolVLM2 Voice Assistant",
    description="Real-time voice assistant with speech recognition, image processing, and text-to-speech",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/stats")
async def get_stats():
    """Get server statistics"""
    return manager.get_stats()


@app.get("/images")
async def list_saved_images():
    """List all saved images"""
    try:
        images_dir = manager.image_manager.save_directory
        if not images_dir.exists():
            return {"images": [], "message": "No images directory found"}

        images = []
        for image_file in images_dir.glob("*.jpg"):
            stat = image_file.stat()
            images.append(
                {
                    "filename": image_file.name,
                    "path": str(image_file),
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                }
            )

        images.sort(key=lambda x: x["created"], reverse=True)  # Most recent first
        return {"images": images, "count": len(images)}

    except Exception as e:
        logger.error(f"Error listing images: {e}")
        return {"error": str(e)}


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for real-time multimodal interaction"""
    await manager.connect(websocket, client_id)

    # Get instances of processors
    whisper_processor = WhisperProcessor.get_instance()
    smolvlm_processor = SmolVLMProcessor.get_instance()
    tts_processor = KokoroTTSProcessor.get_instance()

    try:
        # Send initial configuration confirmation
        await websocket.send_text(
            json.dumps({"status": "connected", "client_id": client_id})
        )

        async def send_keepalive():
            """Send periodic keepalive pings"""
            while True:
                try:
                    await websocket.send_text(
                        json.dumps({"type": "ping", "timestamp": time.time()})
                    )
                    await asyncio.sleep(10)  # Send ping every 10 seconds
                except Exception:
                    break

        async def process_audio_segment(audio_data, image_data=None, user_text=None):
            """Process a complete audio segment or user text through the pipeline with optional image"""
            try:
                # --- Multilingual: use only AI Chat Bot folder (STT, chat, TTS) when configured ---
                # Avatar speaks the response using that folder's TTS; no Whisper/SmolVLM/Kokoro fallback.
                if chatbot_available():
                    if user_text is not None:
                        # Text input: AI Chat Bot /chat -> /text-to-speech -> avatar speaks that audio
                        response_text = await _chatbot_chat(user_text, client_id)
                        if not response_text:
                            await websocket.send_text(
                                json.dumps({
                                    "assistant_text": "Sorry, the assistant could not respond. Please check the AI Chat Bot is running.",
                                    "error": "chatbot_chat_failed",
                                })
                            )
                            return
                        tts_bytes = await _chatbot_tts(
                            response_text, "en-IN", "en-IN"
                        )
                        if not tts_bytes:
                            await websocket.send_text(
                                json.dumps({
                                    "assistant_text": response_text,
                                    "error": "chatbot_tts_failed",
                                })
                            )
                            return
                        pcm_24k, _ = _tts_mpeg_to_pcm_24k(tts_bytes)
                        if pcm_24k is None or len(pcm_24k) == 0:
                            await websocket.send_text(
                                json.dumps({
                                    "assistant_text": response_text,
                                    "error": "chatbot_tts_decode_failed",
                                })
                            )
                            return
                        audio_bytes = (pcm_24k * 32767).astype(np.int16).tobytes()
                        base64_audio = base64.b64encode(audio_bytes).decode("utf-8")
                        await websocket.send_text(
                            json.dumps({
                                "audio": base64_audio,
                                "word_timings": [],
                                "sample_rate": 24000,
                                "method": "chatbot_tts",
                                "assistant_text": response_text,
                            })
                        )
                        await websocket.send_text(json.dumps({"audio_complete": True}))
                        logger.info("Chatbot text response: avatar speaking via AI Chat Bot TTS")
                        return
                    elif audio_data is not None and len(audio_data) > 0:
                        # Voice input: AI Chat Bot /speech-to-text -> /chat -> /text-to-speech -> avatar speaks
                        await websocket.send_text(json.dumps({"interrupt": True}))
                        wav_bytes = _pcm_to_wav_bytes(audio_data, 16000)
                        transcribed_text, lang_code = await _chatbot_stt(wav_bytes)
                        if not transcribed_text or not transcribed_text.strip():
                            await websocket.send_text(
                                json.dumps({
                                    "assistant_text": "I couldn't catch that. Please try again.",
                                    "error": "chatbot_stt_empty",
                                })
                            )
                            return
                        response_text = await _chatbot_chat(transcribed_text, client_id)
                        if not response_text:
                            await websocket.send_text(
                                json.dumps({
                                    "user_transcript": transcribed_text,
                                    "assistant_text": "Sorry, the assistant could not respond.",
                                    "error": "chatbot_chat_failed",
                                })
                            )
                            return
                        tts_bytes = await _chatbot_tts(
                            response_text, lang_code or "en-IN", lang_code or "en-IN"
                        )
                        if not tts_bytes:
                            await websocket.send_text(
                                json.dumps({
                                    "user_transcript": transcribed_text,
                                    "assistant_text": response_text,
                                    "error": "chatbot_tts_failed",
                                })
                            )
                            return
                        pcm_24k, _ = _tts_mpeg_to_pcm_24k(tts_bytes)
                        if pcm_24k is None or len(pcm_24k) == 0:
                            await websocket.send_text(
                                json.dumps({
                                    "user_transcript": transcribed_text,
                                    "assistant_text": response_text,
                                    "error": "chatbot_tts_decode_failed",
                                })
                            )
                            return
                        audio_bytes = (pcm_24k * 32767).astype(np.int16).tobytes()
                        base64_audio = base64.b64encode(audio_bytes).decode("utf-8")
                        await websocket.send_text(
                            json.dumps({
                                "audio": base64_audio,
                                "word_timings": [],
                                "sample_rate": 24000,
                                "method": "chatbot_tts",
                                "assistant_text": response_text,
                                "user_transcript": transcribed_text,
                            })
                        )
                        await websocket.send_text(json.dumps({"audio_complete": True}))
                        logger.info("Chatbot voice response: avatar speaking via AI Chat Bot STT/chat/TTS")
                        return

                # When chatbot not configured: use built-in Whisper / SmolVLM / Kokoro
                # Determine input text: either from user (chat) or from Whisper transcription
                if user_text is not None:
                    transcribed_text = user_text
                    logger.info(f"Processing text message: '{transcribed_text[:50]}...'")
                else:
                    # Log what we received
                    if image_data:
                        logger.info(
                            f"🎥 Processing audio+image segment: audio={len(audio_data)} bytes, image={len(image_data)} bytes"
                        )
                        manager.update_stats("audio_with_image_received")

                        # Save the image for verification
                        saved_path = manager.image_manager.save_image(
                            image_data, client_id, "multimodal"
                        )
                        if saved_path:
                            verification = manager.image_manager.verify_image(saved_path)
                            if verification.get("valid"):
                                logger.info(
                                    f"📸 Image verified successfully: {verification['size']} pixels"
                                )
                            else:
                                logger.warning(
                                    f"⚠️ Image verification failed: {verification}"
                                )

                    else:
                        logger.info(
                            f"🎤 Processing audio-only segment: {len(audio_data)} bytes"
                        )
                        manager.update_stats("audio_segments_received")

                    # Send interrupt immediately since frontend determined this is valid speech
                    logger.info("Sending interrupt signal")
                    interrupt_message = json.dumps({"interrupt": True})
                    await websocket.send_text(interrupt_message)

                    # Step 1: Transcribe audio with Whisper
                    logger.info("Starting Whisper transcription")
                    transcribed_text = await whisper_processor.transcribe_audio(audio_data)
                    logger.info(f"Transcription result: '{transcribed_text}'")

                    # Check if transcription indicates noise
                    if transcribed_text in ["NOISE_DETECTED", "NO_SPEECH", None]:
                        logger.info(
                            f"Noise detected in transcription: '{transcribed_text}'. Skipping further processing."
                        )
                        return

                # Step 2: Set image if provided, then process text
                if image_data:
                    await smolvlm_processor.set_image(image_data)
                    logger.info("🖼️ Image set for multimodal processing")

                # Process transcribed text with image using SmolVLM2
                logger.info("Starting SmolVLM2 generation")
                streamer, initial_text, initial_collection_stopped_early = (
                    await smolvlm_processor.process_text_with_image(transcribed_text)
                )
                logger.info(
                    f"SmolVLM2 initial text: '{initial_text[:50]}...' ({len(initial_text)} chars)"
                )

                # Check if VLM response indicates noise
                if initial_text.startswith("NOISE:"):
                    logger.info(
                        f"Noise detected in VLM processing: '{initial_text}'. Skipping TTS."
                    )
                    return

                # Step 3: Generate TTS for initial text WITH NATIVE TIMING
                if initial_text:
                    logger.info("Starting TTS for initial text")
                    tts_task = asyncio.create_task(
                        tts_processor.synthesize_initial_speech_with_timing(
                            initial_text
                        )
                    )
                    manager.set_task(client_id, "tts", tts_task)

                    # FIXED: Properly unpack the tuple
                    tts_result = await tts_task
                    if isinstance(tts_result, tuple) and len(tts_result) == 2:
                        initial_audio, initial_timings = tts_result
                    else:
                        # Fallback for legacy method
                        initial_audio = tts_result
                        initial_timings = []
                        logger.warning(
                            "TTS returned single value instead of tuple - no timing data available"
                        )

                    logger.info(
                        f"Initial TTS complete: {len(initial_audio) if initial_audio is not None else 0} samples, {len(initial_timings)} word timings"
                    )

                    if initial_audio is not None and len(initial_audio) > 0:
                        # Convert to base64 and send to client WITH TIMING DATA
                        audio_bytes = (initial_audio * 32767).astype(np.int16).tobytes()
                        base64_audio = base64.b64encode(audio_bytes).decode("utf-8")

                        # Send audio with native timing information
                        audio_message = {
                            "audio": base64_audio,
                            "word_timings": initial_timings,  # 🎉 NATIVE TIMING DATA!
                            "sample_rate": 24000,
                            "method": "native_kokoro_timing",
                            "modality": "multimodal" if image_data else "audio_only",
                        }

                        await websocket.send_text(json.dumps(audio_message))
                        logger.info(
                            f"✨ Initial audio sent to client with {len(initial_timings)} NATIVE word timings [{audio_message['modality']}]"
                        )

                        # Step 4: Process remaining text chunks if available
                        if initial_collection_stopped_early:
                            logger.info("Processing remaining text chunks")
                            collected_chunks = []

                            try:
                                text_iterator = collect_remaining_text(streamer)

                                while True:
                                    try:
                                        text_chunk = await anext(text_iterator)
                                        logger.info(
                                            f"Processing text chunk: '{text_chunk[:30]}...' ({len(text_chunk)} chars)"
                                        )
                                        collected_chunks.append(text_chunk)

                                        # Generate TTS for this chunk WITH NATIVE TIMING
                                        chunk_tts_task = asyncio.create_task(
                                            tts_processor.synthesize_remaining_speech_with_timing(
                                                text_chunk
                                            )
                                        )
                                        manager.set_task(
                                            client_id, "tts", chunk_tts_task
                                        )

                                        # FIXED: Properly unpack the tuple for chunks too
                                        chunk_tts_result = await chunk_tts_task
                                        if (
                                            isinstance(chunk_tts_result, tuple)
                                            and len(chunk_tts_result) == 2
                                        ):
                                            chunk_audio, chunk_timings = (
                                                chunk_tts_result
                                            )
                                        else:
                                            # Fallback for legacy method
                                            chunk_audio = chunk_tts_result
                                            chunk_timings = []
                                            logger.warning(
                                                "Chunk TTS returned single value instead of tuple"
                                            )

                                        logger.info(
                                            f"Chunk TTS complete: {len(chunk_audio) if chunk_audio is not None else 0} samples, {len(chunk_timings)} word timings"
                                        )

                                        if (
                                            chunk_audio is not None
                                            and len(chunk_audio) > 0
                                        ):
                                            # Convert to base64 and send to client WITH TIMING DATA
                                            audio_bytes = (
                                                (chunk_audio * 32767)
                                                .astype(np.int16)
                                                .tobytes()
                                            )
                                            base64_audio = base64.b64encode(
                                                audio_bytes
                                            ).decode("utf-8")

                                            # Send chunk audio with native timing information
                                            chunk_audio_message = {
                                                "audio": base64_audio,
                                                "word_timings": chunk_timings,  # 🎉 NATIVE TIMING DATA!
                                                "sample_rate": 24000,
                                                "method": "native_kokoro_timing",
                                                "chunk": True,
                                                "modality": (
                                                    "multimodal"
                                                    if image_data
                                                    else "audio_only"
                                                ),
                                            }

                                            await websocket.send_text(
                                                json.dumps(chunk_audio_message)
                                            )
                                            logger.info(
                                                f"✨ Chunk audio sent to client with {len(chunk_timings)} NATIVE word timings [{chunk_audio_message['modality']}]"
                                            )

                                    except StopAsyncIteration:
                                        logger.info("All text chunks processed")
                                        break
                                    except asyncio.CancelledError:
                                        logger.info("Text chunk processing cancelled")
                                        raise

                                # Update history with complete response
                                if collected_chunks:
                                    complete_remaining_text = "".join(collected_chunks)
                                    smolvlm_processor.update_history_with_complete_response(
                                        transcribed_text,
                                        initial_text,
                                        complete_remaining_text,
                                    )

                            except asyncio.CancelledError:
                                logger.info("Remaining text processing cancelled")
                                # Update history with partial response
                                if collected_chunks:
                                    partial_remaining_text = "".join(collected_chunks)
                                    smolvlm_processor.update_history_with_complete_response(
                                        transcribed_text,
                                        initial_text,
                                        partial_remaining_text,
                                    )
                                else:
                                    smolvlm_processor.update_history_with_complete_response(
                                        transcribed_text, initial_text
                                    )
                                return
                        else:
                            # No remaining text, just update history with initial response
                            smolvlm_processor.update_history_with_complete_response(
                                transcribed_text, initial_text
                            )

                        # Signal end of audio stream
                        await websocket.send_text(json.dumps({"audio_complete": True}))
                        logger.info("Audio processing complete")

            except asyncio.CancelledError:
                logger.info("Audio processing cancelled")
                raise
            except Exception as e:
                logger.error(f"Error processing audio segment: {e}")
                # Add more detailed error info
                import traceback

                logger.error(f"Full traceback: {traceback.format_exc()}")

        async def receive_and_process():
            """Receive and process messages from the client"""
            try:
                while True:
                    data = await websocket.receive_text()
                    try:
                        message = json.loads(data)

                        # Handle complete audio segments from frontend
                        if "audio_segment" in message:
                            # Cancel any current processing
                            await manager.cancel_current_tasks(client_id)

                            # Decode audio data
                            audio_data = base64.b64decode(message["audio_segment"])

                            # Check if image is also included
                            image_data = None
                            if "image" in message:
                                image_data = base64.b64decode(message["image"])
                                logger.info(
                                    f"Received audio+image: audio={len(audio_data)} bytes, image={len(image_data)} bytes"
                                )
                            else:
                                logger.info(
                                    f"Received audio-only: {len(audio_data)} bytes"
                                )

                            # Start processing the audio segment with optional image
                            processing_task = asyncio.create_task(
                                process_audio_segment(audio_data, image_data)
                            )
                            manager.set_task(client_id, "processing", processing_task)

                        # Handle standalone images (only if not currently processing)
                        elif "image" in message:
                            if not (
                                client_id in manager.current_tasks
                                and manager.current_tasks[client_id]["processing"]
                                and not manager.current_tasks[client_id][
                                    "processing"
                                ].done()
                            ):
                                image_data = base64.b64decode(message["image"])
                                manager.update_stats("images_received")

                                # Save standalone image
                                saved_path = manager.image_manager.save_image(
                                    image_data, client_id, "standalone"
                                )
                                if saved_path:
                                    verification = manager.image_manager.verify_image(
                                        saved_path
                                    )
                                    logger.info(
                                        f"📸 Standalone image saved and verified: {verification}"
                                    )

                                await smolvlm_processor.set_image(image_data)
                                logger.info("Image updated")

                        # Handle text message (typed in chat)
                        elif "text" in message:
                            await manager.cancel_current_tasks(client_id)
                            text = message["text"].strip()
                            if not text:
                                continue
                            logger.info(f"Received text message: '{text[:50]}...'")
                            processing_task = asyncio.create_task(
                                process_audio_segment(None, None, user_text=text)
                            )
                            manager.set_task(client_id, "processing", processing_task)

                        # Handle realtime input (for backward compatibility)
                        elif "realtime_input" in message:
                            for chunk in message["realtime_input"]["media_chunks"]:
                                if chunk["mime_type"] == "audio/pcm":
                                    # Treat as complete audio segment
                                    await manager.cancel_current_tasks(client_id)

                                    audio_data = base64.b64decode(chunk["data"])
                                    processing_task = asyncio.create_task(
                                        process_audio_segment(audio_data)
                                    )
                                    manager.set_task(
                                        client_id, "processing", processing_task
                                    )

                                elif chunk["mime_type"] == "image/jpeg":
                                    # Only process image if not currently processing audio
                                    if not (
                                        client_id in manager.current_tasks
                                        and manager.current_tasks[client_id][
                                            "processing"
                                        ]
                                        and not manager.current_tasks[client_id][
                                            "processing"
                                        ].done()
                                    ):
                                        image_data = base64.b64decode(chunk["data"])
                                        manager.update_stats("images_received")

                                        # Save image from realtime input
                                        saved_path = manager.image_manager.save_image(
                                            image_data, client_id, "realtime"
                                        )
                                        if saved_path:
                                            verification = (
                                                manager.image_manager.verify_image(
                                                    saved_path
                                                )
                                            )
                                            logger.info(
                                                f"📸 Realtime image saved and verified: {verification}"
                                            )

                                        await smolvlm_processor.set_image(image_data)

                    except json.JSONDecodeError as e:
                        logger.error(f"Error decoding JSON: {e}")
                        await websocket.send_text(
                            json.dumps({"error": "Invalid JSON format"})
                        )
                    except KeyError as e:
                        logger.error(f"Missing key in message: {e}")
                        await websocket.send_text(
                            json.dumps({"error": f"Missing required field: {e}"})
                        )
                    except Exception as e:
                        logger.error(f"Error processing message: {e}")
                        await websocket.send_text(
                            json.dumps({"error": f"Processing error: {str(e)}"})
                        )

            except WebSocketDisconnect:
                logger.info("WebSocket connection closed during receive loop")

        # Run tasks concurrently
        receive_task = asyncio.create_task(receive_and_process())
        keepalive_task = asyncio.create_task(send_keepalive())

        # Wait for any task to complete (usually due to disconnection or error)
        done, pending = await asyncio.wait(
            [receive_task, keepalive_task],
            return_when=asyncio.FIRST_COMPLETED,
        )

        # Cancel pending tasks
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        # Log results of completed tasks
        for task in done:
            try:
                result = task.result()
            except Exception as e:
                logger.error(f"Task finished with error: {e}")

    except WebSocketDisconnect:
        logger.info(f"Client {client_id} disconnected normally")
    except Exception as e:
        logger.error(f"WebSocket session error for client {client_id}: {e}")
    finally:
        # Cleanup
        logger.info(f"Cleaning up resources for client {client_id}")
        await manager.cancel_current_tasks(client_id)
        manager.disconnect(client_id)


def main():
    """Main function to start the FastAPI server"""
    logger.info("Starting FastAPI Whisper + SmolVLM2 Voice Assistant server...")

    # Configure uvicorn
    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=True,
        ws_ping_interval=20,
        ws_ping_timeout=60,
        timeout_keep_alive=30,
    )

    server = uvicorn.Server(config)

    try:
        server.run()
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")


if __name__ == "__main__":
    main()
