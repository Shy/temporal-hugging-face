# Import Temporal activity decorator for defining workflow activities
from temporalio import activity

# Import our custom model manager for handling different AI models
from model_manager import model_manager

# Configuration dictionary for AI model generation parameters
# This centralizes settings to avoid duplication and make tuning easier
GENERATION_CONFIG = {
    # Settings for the smaller SMOL model (runs locally)
    "smol": {
        "max_new_tokens": 128,  # Maximum tokens to generate
        "temperature": 0.7,  # Controls randomness (0=deterministic, 1=random)
        "do_sample": True,  # Enable sampling for more diverse responses
        "top_p": 0.9,  # Nucleus sampling: consider top 90% probability mass
    },
    # Settings for the larger 20b model (via Ollama API)
    "20b": {
        "temperature": 0.7,  # Same temperature for consistency
        "top_p": 0.9,  # Same nucleus sampling
        "max_tokens": 100,  # Slightly fewer tokens for API efficiency
    },
}


def clean_prompt(prompt):
    """
    Normalize prompts by adding a period if they don't end with punctuation.
    This helps ensure consistent formatting for the AI models.
    """
    # Remove trailing whitespace and check if prompt ends with punctuation
    if not prompt.rstrip().endswith((".", "!", "?", ":")):
        return f"{prompt}."  # Add period for better prompt formatting
    return prompt


def build_planetarium_messages(prompt, system_content):
    """
    Create the message structure required by chat-based AI models.

    Chat models expect a list of messages with 'role' and 'content' fields:
    - 'system': Sets the AI's behavior and context
    - 'user': Contains the actual question/prompt
    """
    return [
        # AI personality and behavioral instructions
        {"role": "system", "content": system_content},
        # User's actual question or prompt
        {"role": "user", "content": prompt},
    ]


def get_smol_system_content():
    """
    Get system prompt for the SMOL model.

    The system prompt defines the AI's role and response style.
    '/no_think' is a special instruction for this model to skip
    internal reasoning steps and provide direct answers.
    """
    return (
        "/no_think You are a helpful librarian who works in a "
        "planetarium. Provide clear, accurate, and concise responses. "
        "Keep answers focused and informative.\n\n"
        "Examples:\n"  # Few-shot examples help guide response format
        "Q: What is gravity?\n"
        "A: Gravity is the force that attracts objects with mass "
        "toward each other.\n\n"
        "Q: How hot is the sun?\n"
        "A: The sun's surface temperature is about 5,500°C, "
        "while its core reaches 15 million°C."
    )


def get_20b_system_content():
    """
    Get system prompt for the 20b model.

    This model is larger and more capable, so we can request more
    sophisticated responses with connections between topics.
    """
    return (
        "You are a helpful librarian who works in a "
        "planetarium. Provide thoughtful, concise responses while "
        "remaining clear and engaging. Draw connections between "
        "topics when relevant.\n\n"
    )


@activity.defn  # Temporal decorator - makes this function a workflow activity
async def ask_question_SMOL(prompt):
    """
    Generate response using the SMOL model (runs locally on GPU/CPU).

    This function handles the complete pipeline:
    1. Load pre-initialized model and tokenizer
    2. Format the conversation using the model's chat template
    3. Generate response with configured parameters
    4. Extract and decode only the new response tokens
    """
    # Get the pre-loaded model and tokenizer from model manager
    model, tokenizer = model_manager.get_smol_model()

    # Build the conversation messages with system context
    messages = build_planetarium_messages(prompt, get_smol_system_content())

    # Convert messages to the model's expected format
    # add_generation_prompt=True adds the assistant's turn start token
    text = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )

    # Tokenize and move to the model's device (GPU or CPU)
    model_inputs = tokenizer([text], return_tensors="pt").to(model.device)

    # Generate response using the model with our predefined settings
    generated_ids = model.generate(
        **model_inputs,  # Input tokens
        **GENERATION_CONFIG["smol"],  # Temperature, top_p, etc.
        pad_token_id=tokenizer.eos_token_id,  # Handle padding properly
    )

    # Extract only the newly generated tokens (skip the input prompt)
    # This gives us just the AI's response, not the entire conversation
    output_ids = generated_ids[0][len(model_inputs.input_ids[0]) :]
    return tokenizer.decode(output_ids, skip_special_tokens=True)


@activity.defn  # Temporal decorator - makes this function a workflow activity
async def ask_question_20b(prompt):
    """
    Generate response using 20b model via Ollama API.

    This function uses Ollama client to communicate with a larger model
    that's too big to run directly on this worker. The API handles all the
    tokenization and generation complexity for us.
    """
    # Get the pre-initialized Ollama client
    client = model_manager.get_ollama_client()

    # Build conversation messages (same format as SMOL model)
    messages = build_planetarium_messages(prompt, get_20b_system_content())

    # Send request to Ollama API with our configuration
    response = await client.chat(
        model="gpt-oss:20b",  # Specify which model to use
        messages=messages,  # Conversation history
        options=GENERATION_CONFIG["20b"],  # Temperature, top_p, max_tokens
    )

    # Return just the text content from the API response
    return response.message.content


# Model routing configuration - maps model names to handler functions
# This dictionary pattern makes it easy to add new models without changing
# the main routing logic in ask_question()
MODEL_HANDLERS = {
    "smolm3-3b": ask_question_SMOL,  # Local small model
    "20b": ask_question_20b,  # Remote large model via Ollama
}


@activity.defn  # Temporal decorator - makes this function a workflow activity
async def ask_question(prompt, model):
    """
    Main entry point - routes questions to the appropriate model handler.

    This function acts as a dispatcher, choosing which AI model to use
    based on the 'model' parameter. It handles input validation and
    provides helpful error messages.
    """
    # Log the request for debugging/monitoring
    print(f"Prompt: {prompt}, Model: {model}")

    # Validate that we support the requested model
    if model not in MODEL_HANDLERS:
        # Provide helpful error with list of available options
        available = list(MODEL_HANDLERS.keys())
        raise ValueError(f"Unknown model: {model}. Available models: {available}")

    # Get the handler function for this model and call it
    handler = MODEL_HANDLERS[model]
    # Clean the prompt first (add punctuation if needed)
    return await handler(clean_prompt(prompt))
