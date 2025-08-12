from temporalio import activity
from model_manager import model_manager


@activity.defn
async def ask_question_SMOL(prompt):

    # Use pre-loaded model and tokenizer
    model, tokenizer = model_manager.get_smol_model()

    # prepare the model input
    # Clean prompt - don't add period if it already ends with punctuation
    if not prompt.rstrip().endswith((".", "!", "?", ":")):
        prompt = f"{prompt}."

    messages = [
        {
            "role": "system",
            "content": (
                "/no_think You are a helpful librarian who works in a "
                "planetarium. Provide clear, accurate, and concise responses. "
                "Keep answers focused and informative.\n\n"
                "Examples:\n"
                "Q: What is gravity?\n"
                "A: Gravity is the force that attracts objects with mass "
                "toward each other.\n\n"
                "Q: How hot is the sun?\n"
                "A: The sun's surface temperature is about 5,500°C, "
                "while its core reaches 15 million°C."
            ),
        },
        {"role": "user", "content": prompt},
    ]

    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )
    model_inputs = tokenizer([text], return_tensors="pt").to(model.device)

    # Generate the output with better parameters
    generated_ids = model.generate(
        **model_inputs,
        max_new_tokens=128,
        temperature=0.7,
        do_sample=True,
        top_p=0.9,
        pad_token_id=tokenizer.eos_token_id,
    )

    # Get and decode the output
    output_ids = generated_ids[0][len(model_inputs.input_ids[0]) :]
    return tokenizer.decode(output_ids, skip_special_tokens=True)


@activity.defn
async def ask_question_20b(prompt):
    # Use pre-initialized Ollama client
    client = model_manager.get_ollama_client()

    # Clean prompt - don't add period if it already ends with punctuation
    if not prompt.rstrip().endswith((".", "!", "?", ":")):
        prompt = f"{prompt}."

    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful librarian who works in a "
                "planetarium. Provide thoughtful, detailed responses while "
                "remaining clear and engaging. Draw connections between "
                "topics when relevant.\n\n"
                "Examples:\n"
                "Q: What causes the northern lights?\n"
                "A: The northern lights (aurora borealis) are caused by "
                "charged particles from the sun interacting with Earth's "
                "magnetic field and atmosphere, creating beautiful displays "
                "of light in the polar regions.\n\n"
                "Q: Why do stars twinkle?\n"
                "A: Stars appear to twinkle because their light passes "
                "through Earth's turbulent atmosphere, which bends and "
                "distorts the light waves, creating the twinkling effect "
                "we see from the ground."
            ),
        },
        {"role": "user", "content": prompt},
    ]
    response = await client.chat(
        model="gpt-oss:20b",
        messages=messages,
        options={"temperature": 0.8, "top_p": 0.9, "max_tokens": 256},
    )
    return response.message.content


@activity.defn
async def ask_question(prompt, model):
    print(f"Prompt: {prompt}, Model: {model}")

    if model == "smolm3-3b":
        return await ask_question_SMOL(prompt)
    elif model == "20b":
        return await ask_question_20b(prompt)
    else:
        raise ValueError(f"Unknown model: {model}")
