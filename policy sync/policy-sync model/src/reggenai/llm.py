import os
from typing import Optional

# OpenAI (including Azure OpenAI compatibility)
import openai

# For local HF fallback (import lazily to avoid heavy imports during test collection)


class LLMWrapper:
    """Wrapper that prefers Azure OpenAI / OpenAI when available, otherwise falls back to HF."""

    def __init__(self, use_openai: Optional[bool] = None):
        env_use = os.getenv("USE_OPENAI")
        if use_openai is None:
            use_openai = (env_use is None) or env_use.lower() in ["1", "true", "yes"]
        self.use_openai = use_openai

        # Azure OpenAI detection
        azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        azure_key = os.getenv("AZURE_OPENAI_KEY")
        if azure_endpoint and azure_key:
            # Configure openai client for Azure
            openai.api_type = "azure"
            openai.api_base = azure_endpoint
            openai.api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-10-01")
            openai.api_key = azure_key
            self.azure_deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
        else:
            # Standard OpenAI
            openai.api_key = os.getenv("OPENAI_API_KEY")
            self.azure_deployment = None

        if not self.use_openai:
            # Import transformers pipeline lazily to avoid importing heavy deps at module import time
            try:
                from transformers import pipeline as _pipeline
                model = os.getenv("HF_MODEL", "gpt2")
                self.generator = _pipeline("text-generation", model=model)
            except Exception:
                # Fallback generator that returns input prompt if transformers isn't available
                self.generator = lambda prompt, **kwargs: [{"generated_text": prompt}]
        # Ensure a local generator always exists so generate() can fall back to it when OpenAI isn't configured
        if not hasattr(self, 'generator'):
            self.generator = lambda prompt, **kwargs: [{"generated_text": prompt}]

    def generate(self, prompt: str, max_tokens: int = 512) -> str:
        if self.use_openai and openai.api_key:
            # Use Azure deployment name if configured, otherwise the OpenAI model name
            if self.azure_deployment:
                model = self.azure_deployment
            else:
                model = "gpt-4o" if os.getenv("PREFER_GPT4O") else "gpt-4o-mini"

            resp = openai.ChatCompletion.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=float(os.getenv("LLM_TEMPERATURE", "0.0")),
            )
            return resp['choices'][0]['message']['content'].strip()
        else:
            out = self.generator(prompt, max_length=min(2048, len(prompt.split()) + max_tokens), do_sample=False)
            return out[0]['generated_text']
