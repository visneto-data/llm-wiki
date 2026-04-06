#!/usr/bin/env python3
"""
Generate .wikirc.yaml with OpenRouter free LLMs configuration.
Supports interactive selection or command-line arguments.
"""

import argparse
import os
import sys

OPENROUTER_FREE_MODELS = {
    "gemma-3-27b": "google/gemma-3-27b-it",
    "gemma-3-8b": "google/gemma-3-8b-it",
    "llama-3.2-11b": "meta-llama/llama-3.2-11b-vision-instruct",
    "llama-3.1-8b": "meta-llama/llama-3.1-8b-instruct",
    "mistral-7b": "mistralai/mistral-7b-instruct",
    "deepseek-chat": "deepseek/deepseek-chat",
    "claude-3-haiku": "anthropic/claude-3-haiku",
    "qwen-72b": "qwen/qwen2.5-72b-instruct",
}

DEFAULT_FALLBACKS = [
    "meta-llama/llama-3.1-8b-instruct",
    "mistralai/mistral-7b-instruct",
]


def list_models():
    print("Available OpenRouter free models:")
    for key, model in OPENROUTER_FREE_MODELS.items():
        print(f"  {key:20} {model}")


def generate_yaml(primary_model, fallbacks):
    fallbacks_yaml = ""
    for fb in fallbacks:
        fallbacks_yaml += f"""    - model: {fb}
      apiKey: YOUR_OPENROUTER_API_KEY
      baseUrl: https://openrouter.ai/api/v1
"""

    yaml_content = f"""# LLM Provider Configuration - OpenRouter Free Models
# With multi-LLM fallback support
llm:
  provider: openai
  model: {primary_model}
  apiKey: YOUR_OPENROUTER_API_KEY
  baseUrl: https://openrouter.ai/api/v1
  temperature: 0.3
  thinking:
    type: disabled

  # Fallback LLMs (tried sequentially if primary fails)
  fallbacks:
{fallbacks_yaml}"""
    return yaml_content


def interactive_select():
    print("Available models:")
    print("  [0] Gemma 3 27B (default)")
    print("  [1] Gemma 3 8B")
    print("  [2] Llama 3.2 11B Vision")
    print("  [3] Llama 3.1 8B")
    print("  [4] Mistral 7B")
    print("  [5] DeepSeek Chat")
    print("  [6] Claude 3 Haiku")
    print("  [7] Qwen 2.5 72B")

    primary_idx = input("Select primary model [0-7] (default: 0): ").strip() or "0"
    try:
        primary_idx = int(primary_idx)
    except ValueError:
        primary_idx = 0

    keys = list(OPENROUTER_FREE_MODELS.keys())
    primary_key = keys[primary_idx % len(keys)]
    primary_model = OPENROUTER_FREE_MODELS[primary_key]

    use_defaults = (
        input(f"Use default fallbacks (Llama 3.1 + Mistral)? [Y/n]: ").strip().lower()
        or "y"
    )
    if use_defaults == "y":
        fallbacks = DEFAULT_FALLBACKS
    else:
        print(
            "\nSelect fallback models (enter numbers separated by commas, e.g., 1,3,4):"
        )
        print("  [0] Gemma 3 27B")
        print("  [1] Gemma 3 8B")
        print("  [2] Llama 3.2 11B Vision")
        print("  [3] Llama 3.1 8B")
        print("  [4] Mistral 7B")
        print("  [5] DeepSeek Chat")
        print("  [6] Claude 3 Haiku")
        print("  [7] Qwen 2.5 72B")

        fb_input = input("Fallbacks: ").strip()
        fallbacks = []
        if fb_input:
            for idx_str in fb_input.split(","):
                try:
                    idx = int(idx_str.strip())
                    fb_key = keys[idx % len(keys)]
                    fb_model = OPENROUTER_FREE_MODELS[fb_key]
                    if fb_model != primary_model and fb_model not in fallbacks:
                        fallbacks.append(fb_model)
                except (ValueError, IndexError):
                    pass

    if not fallbacks:
        fallbacks = DEFAULT_FALLBACKS

    return primary_model, fallbacks


def main():
    parser = argparse.ArgumentParser(
        description="Generate .wikirc.yaml with OpenRouter free LLMs"
    )
    parser.add_argument(
        "-l", "--list", action="store_true", help="List available free models"
    )
    parser.add_argument("-p", "--primary", help="Primary model (e.g., gemma-3-27b)")
    parser.add_argument(
        "-f",
        "--fallbacks",
        help="Fallback models (comma-separated, e.g., llama-3.1-8b,mistral-7b)",
    )
    parser.add_argument("-o", "--output", default=".wikirc.yaml", help="Output file")
    parser.add_argument(
        "-i", "--interactive", action="store_true", help="Interactive mode"
    )

    args = parser.parse_args()

    if args.list:
        list_models()
        return

    if args.interactive or (
        not args.primary and not args.fallbacks and sys.stdin.isatty()
    ):
        primary_model, fallbacks = interactive_select()
    else:
        if args.primary:
            primary_model = OPENROUTER_FREE_MODELS.get(
                args.primary, OPENROUTER_FREE_MODELS["gemma-3-27b"]
            )
        else:
            primary_model = OPENROUTER_FREE_MODELS["gemma-3-27b"]

        if args.fallbacks:
            fallbacks = []
            for fb_key in args.fallbacks.split(","):
                fb_key = fb_key.strip()
                if fb_key in OPENROUTER_FREE_MODELS:
                    fb_model = OPENROUTER_FREE_MODELS[fb_key]
                    if fb_model != primary_model and fb_model not in fallbacks:
                        fallbacks.append(fb_model)
        else:
            fallbacks = DEFAULT_FALLBACKS

    yaml_content = generate_yaml(primary_model, fallbacks)

    with open(args.output, "w") as f:
        f.write(yaml_content)

    print(f"\nCreated {args.output}")
    print(f"Primary model: {primary_model}")
    print(f"Fallbacks ({len(fallbacks)}):")
    for fb in fallbacks:
        print(f"  - {fb}")
    print(f"\nEdit the file to customize or add your API key.")


if __name__ == "__main__":
    main()
