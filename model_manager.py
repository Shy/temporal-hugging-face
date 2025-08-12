# Type hints for better code documentation and IDE support
from typing import Dict, Any, Optional

# Hugging Face transformers library for loading AI models and tokenizers
from transformers import AutoModelForCausalLM, AutoTokenizer

# Ollama client for communicating with locally hosted large language models
from ollama import AsyncClient

# Python's built-in logging for tracking model loading and errors
import logging

# Create a logger specific to this module for debugging model operations
logger = logging.getLogger(__name__)


class ModelManager:
    """
    Centralized manager for AI models with pre-loading and caching capabilities.

    This class handles the initialization and management of different AI models:
    - Local models (like SmolLM3-3B) that run directly on this machine
    - Remote models (via Ollama) that are too large to run locally

    Key benefits:
    - Pre-loads models at startup to avoid loading delays during inference
    - Caches models in memory for fast repeated access
    - Provides a unified interface regardless of model type or hosting method
    - Handles errors gracefully with proper logging
    """

    def __init__(self):
        """
        Initialize the model manager with empty caches.

        We use dictionaries to cache models and tokenizers by name,
        allowing fast lookups without repeated loading from disk.
        """
        # Cache for loaded AI models (actual model objects)
        self.models: Dict[str, Any] = {}

        # Cache for tokenizers (convert text to/from tokens)
        self.tokenizers: Dict[str, Any] = {}

        # Ollama client for communicating with external model server
        self.ollama_client: Optional[AsyncClient] = None

    async def initialize_models(self):
        """
        Initialize and pre-load all available models at startup.

        This is called once when the Temporal worker starts up, ensuring
        models are ready before any workflow activities need them.
        Pre-loading prevents cold-start delays during actual inference.
        """
        logger.info("Initializing models...")

        # Load the local SmolLM3-3B model into memory
        await self._initialize_smol_model()

        # Set up connection to Ollama and verify model availability
        await self._initialize_ollama_model()

        logger.info("Model initialization complete")

    async def _initialize_smol_model(self):
        """
        Initialize the SmolLM3-3B model for local inference.

        SmolLM3 is a smaller (~3 billion parameter) language model that can
        run efficiently on CPU. It's part of Hugging Face's collection of
        lightweight models designed for resource-constrained environments.
        """
        # The model identifier from Hugging Face Hub
        model_name = "HuggingFaceTB/SmolLM3-3B"

        # Use CPU since this demo assumes no GPU (change to "cuda" if you have one)
        device = "cpu"

        try:
            logger.info(f"Loading {model_name}...")

            # Load tokenizer first - converts text to numbers the model understands
            # AutoTokenizer automatically picks the right tokenizer for this model
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.tokenizers["smol"] = tokenizer

            # Load the actual model weights and move to specified device
            # AutoModelForCausalLM is for text generation (predicting next tokens)
            model = AutoModelForCausalLM.from_pretrained(model_name).to(device)
            self.models["smol"] = model

            logger.info(f"Successfully loaded {model_name}")

        except Exception as e:
            # Re-raise the exception after logging - this will prevent the worker
            # from starting if the model fails to load
            logger.error(f"Failed to load {model_name}: {e}")
            raise

    async def _initialize_ollama_model(self):
        """
        Initialize Ollama client and check for gpt-oss model availability.

        Ollama is a tool that runs large language models locally. It handles
        model downloading, serving, and provides an API interface.
        The gpt-oss:20b is a 20 billion parameter open-source model that's
        too large to load directly but can be served via Ollama.
        """
        try:
            logger.info("Initializing Ollama client...")

            # Create async client - uses async/await for non-blocking API calls
            self.ollama_client = AsyncClient()

            # Verify the 20b model is actually available in Ollama
            try:
                # List all models currently installed in Ollama
                models = await self.ollama_client.list()
                available_models = [model.model for model in models.models]

                if "gpt-oss:20b" in available_models:
                    logger.info("gpt-oss:20b model found and ready")
                    # Mark as available (we don't store the model object itself)
                    self.models["20b"] = "available"
                else:
                    logger.warning(
                        "gpt-oss:20b model not found. "
                        "Run 'ollama pull gpt-oss:20b' to download it."
                    )

            except Exception as e:
                logger.warning(f"Could not check Ollama models: {e}")

        except Exception as e:
            # If Ollama isn't running or accessible, we'll continue without it
            logger.error(f"Failed to initialize Ollama client: {e}")
            self.ollama_client = None

    def is_model_ready(self, model_type: str) -> bool:
        """
        Check if a specific model is ready for inference.

        This is used by the activities to verify models are loaded before
        attempting to generate responses. It prevents runtime errors from
        trying to use uninitialized models.

        Args:
            model_type: Either "smolm3-3b" for local model or "20b" for Ollama

        Returns:
            bool: True if model is ready, False otherwise
        """
        if model_type == "smolm3-3b":
            # Local model needs both the model and tokenizer loaded
            return "smol" in self.models and "smol" in self.tokenizers
        elif model_type == "20b":
            # Ollama model needs client connection and model availability
            return self.ollama_client is not None and "20b" in self.models
        return False

    def get_smol_model(self):
        """
        Get the pre-loaded SmolLM3-3B model and tokenizer.

        Returns a tuple of (model, tokenizer) that can be used directly
        for text generation. Both objects are already loaded in memory
        and ready for immediate use.

        Returns:
            tuple: (model_object, tokenizer_object)

        Raises:
            RuntimeError: If the model hasn't been initialized properly
        """
        if not self.is_model_ready("smolm3-3b"):
            raise RuntimeError("SmolLM3-3B model not initialized")
        return self.models["smol"], self.tokenizers["smol"]

    def get_ollama_client(self) -> AsyncClient:
        """
        Get the Ollama async client for API communication.

        The client handles all communication with the Ollama server,
        including sending prompts and receiving generated responses.

        Returns:
            AsyncClient: Ready-to-use Ollama client

        Raises:
            RuntimeError: If Ollama client or 20b model isn't available
        """
        if not self.is_model_ready("20b"):
            raise RuntimeError(
                "Ollama client not initialized or gpt-oss:20b model not available"
            )
        if self.ollama_client is None:
            raise RuntimeError("Ollama client is None")
        return self.ollama_client


# Global model manager instance - shared across all activities
# Using a global instance ensures models are loaded once and reused,
# rather than reloading them for each request. This is a common pattern
# for expensive resources like AI models.
model_manager = ModelManager()
