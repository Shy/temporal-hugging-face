from temporalio import activity
from transformers import AutoModelForCausalLM, AutoTokenizer
from ollama import AsyncClient


@activity.defn
async def ask_question_SMOL(prompt):
    print(f"Prompt: {prompt}")

    model_name = "HuggingFaceTB/SmolLM3-3B"
    device = "cpu"

    # load the tokenizer and the model
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
    ).to(device)

    # prepare the model input
    prompt = f"{prompt}."
    messages = [
        {
            "role": "system",
            "content": "/no_think. Be brief and concise.",
        },
        {"role": "user", "content": prompt},
    ]

    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )
    model_inputs = tokenizer([text], return_tensors="pt").to(model.device)

    # Generate the output
    generated_ids = model.generate(**model_inputs, max_new_tokens=32)

    # Get and decode the output
    output_ids = generated_ids[0][len(model_inputs.input_ids[0]) :]
    return tokenizer.decode(output_ids, skip_special_tokens=True)


@activity.defn
async def ask_question(prompt, model):
    print(f"Prompt: {prompt}, Model: {model}")
    
    if model == "smolm3-3b":
        return await ask_question_SMOL(prompt)
    elif model == "20b":
        return await ask_question_20b(prompt)
    else:
        raise ValueError(f"Unknown model: {model}")


@activity.defn
async def ask_question_20b(prompt):
    print(f"Prompt: {prompt}")

    prompt = f"{prompt}."
    messages = [
        {
            "role": "system",
            "content": "Be brief and concise.",
        },
        {"role": "user", "content": prompt},
    ]
    response = await AsyncClient().chat(
        model="gpt-oss:20b",
        messages=messages,
    )
    return response.message.content
