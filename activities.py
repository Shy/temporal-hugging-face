from temporalio import activity
from transformers import AutoModelForCausalLM, AutoTokenizer


@activity.defn
async def ask_question(prompt):
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
