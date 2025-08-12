import os
import asyncio
from typing import Dict, Any, Optional, Union
from transformers import AutoModelForCausalLM, AutoTokenizer
from ollama import AsyncClient
import logging

logger = logging.getLogger(__name__)


class ModelManager:
    """Manages AI models with pre-loading and caching capabilities."""

    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.tokenizers: Dict[str, Any] = {}
        self.ollama_client: Optional[AsyncClient] = None

    async def initialize_models(self):
        """Initialize and pre-load all available models."""
        logger.info("Initializing models...")

        # Initialize SmolLM3-3B
        await self._initialize_smol_model()

        # Initialize Ollama connection and check for gpt-oss model
        await self._initialize_ollama_model()

        logger.info("Model initialization complete")

    async def _initialize_smol_model(self):
        """Initialize the SmolLM3-3B model."""
        model_name = "HuggingFaceTB/SmolLM3-3B"
        device = "cpu"

        try:
            logger.info(f"Loading {model_name}...")

            # Load tokenizer
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.tokenizers["smol"] = tokenizer

            # Load model
            model = AutoModelForCausalLM.from_pretrained(model_name).to(device)
            self.models["smol"] = model

            logger.info(f"Successfully loaded {model_name}")

        except Exception as e:
            logger.error(f"Failed to load {model_name}: {e}")
            raise

    async def _initialize_ollama_model(self):
        """Initialize Ollama client and check for gpt-oss model availability."""
        try:
            logger.info("Initializing Ollama client...")
            self.ollama_client = AsyncClient()

            # Check if gpt-oss:20b model is available
            try:
                models = await self.ollama_client.list()
                available_models = [model.model for model in models.models]

                if "gpt-oss:20b" in available_models:
                    logger.info("gpt-oss:20b model found and ready")
                    self.models["20b"] = "available"
                else:
                    logger.warning(
                        "gpt-oss:20b model not found. Run 'ollama pull gpt-oss:20b' to download it."
                    )

            except Exception as e:
                logger.warning(f"Could not check Ollama models: {e}")

        except Exception as e:
            logger.error(f"Failed to initialize Ollama client: {e}")
            self.ollama_client = None

    def is_model_ready(self, model_type: str) -> bool:
        """Check if a specific model is ready for inference."""
        if model_type == "smolm3-3b":
            return "smol" in self.models and "smol" in self.tokenizers
        elif model_type == "20b":
            return self.ollama_client is not None and "20b" in self.models
        return False

    def get_smol_model(self):
        """Get the pre-loaded SmolLM3-3B model and tokenizer."""
        if not self.is_model_ready("smolm3-3b"):
            raise RuntimeError("SmolLM3-3B model not initialized")
        return self.models["smol"], self.tokenizers["smol"]

    def get_ollama_client(self) -> AsyncClient:
        """Get the Ollama client."""
        if not self.is_model_ready("20b"):
            raise RuntimeError(
                "Ollama client not initialized or gpt-oss:20b model not available"
            )
        if self.ollama_client is None:
            raise RuntimeError("Ollama client is None")
        return self.ollama_client


# Global model manager instance
model_manager = ModelManager()
