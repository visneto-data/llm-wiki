#!/usr/bin/env python3
"""
Generate .wikirc.yaml with OpenRouter free LLMs configuration.
Supports interactive selection or command-line arguments.
Features: multi-LLM fallback, retry config, per-model temperature, env vars.
"""

import argparse
import os
import sys
import time

import requests

OPENROUTER_FREE_MODELS = {
    "nemotron-3-super": "nvidia/nemotron-3-super-120b-a12b:free",
    "trinity-large": "arcee-ai/trinity-large-preview:free",
    "minimax-m2.5": "minimax/minimax-m2.5:free",
    "gpt-oss-120b": "openai/gpt-oss-120b:free",
    "gpt-oss-20b": "openai/gpt-oss-20b:free",
    "openrouter-free": "openrouter/free",
    "step-3.5-flash": "stepfun/step-3.5-flash:free",
    "glm-4.5-air": "z-ai/glm-4.5-air:free",
    "nemotron-nano-30b": "nvidia/nemotron-3-nano-30b-a3b:free",
    "trinity-mini": "arcee-ai/trinity-mini:free",
    "nemotron-nano-9b-v2": "nvidia/nemotron-nano-9b-v2:free",
    "qwen3.6-plus": "qwen/qwen3.6-plus:free",
    "qwen3-next-80b": "qwen/qwen3-next-80b-a3b-instruct:free",
    "llama-3.3-70b": "meta-llama/llama-3.3-70b-instruct:free",
}

DEFAULT_FALLBACKS = [
    ("openrouter/free", 0.2),
    ("arcee-ai/trinity-large-preview:free", None),
]


def list_models():
    print("Available OpenRouter free models:")
    for key, model in OPENROUTER_FREE_MODELS.items():
        print(f"  {key:20} {model}")


def test_models(models, timeout=30):
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print("ERROR: OPENROUTER_API_KEY not set in environment")
        return

    print(f"\nTesting {len(models)} models with OPENROUTER_API_KEY...")
    print("-" * 60)

    for key, model_id in models:
        print(f"\nTesting {key} ({model_id})...")
        try:
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://github.com",
                },
                json={
                    "model": model_id,
                    "messages": [{"role": "user", "content": "Say 'OK' in one word"}],
                    "max_tokens": 10,
                },
                timeout=timeout,
            )
            if response.status_code == 200:
                data = response.json()
                choices = data.get("choices", [])
                if choices:
                    msg = choices[0].get("message", {})
                    content = msg.get("content")
                    reasoning = (
                        msg.get("reasoning")
                        or msg.get("reasoning_details", [{}])[0].get("text")
                        if msg.get("reasoning_details")
                        else None
                    )
                    if content:
                        print(f"  SUCCESS: {content[:50]}")
                    elif reasoning:
                        print(f"  SUCCESS (reasoning): {reasoning[:50]}...")
                    else:
                        print(f"  WARNING: Empty response - {data}")
                else:
                    print(f"  WARNING: No choices - {data}")
            else:
                print(f"  FAILED: {response.status_code} - {response.text[:200]}")
        except requests.exceptions.Timeout:
            print(f"  TIMEOUT after {timeout}s")
        except Exception as e:
            print(f"  ERROR: {type(e).__name__}: {e}")


def generate_yaml(
    primary_model, primary_temp, fallbacks, max_retries, retry_delay, retryable_errors
):
    fallbacks_yaml = ""
    for fb_model, fb_temp in fallbacks:
        if fb_temp is not None:
            fallbacks_yaml += f"""    - model: {fb_model}
      apiKey: ${{OPENROUTER_API_KEY}}
      baseUrl: https://openrouter.ai/api/v1
      temperature: {fb_temp}
"""
        else:
            fallbacks_yaml += f"""    - model: {fb_model}
      apiKey: ${{OPENROUTER_API_KEY}}
      baseUrl: https://openrouter.ai/api/v1
"""

    yaml_content = f"""# LLM Provider Configuration - OpenRouter Free Models
# With multi-LLM fallback, retry config, and env var support
llm:
  provider: openai
  model: {primary_model}
  apiKey: ${{OPENROUTER_API_KEY}}
  baseUrl: https://openrouter.ai/api/v1
  temperature: {primary_temp}
  thinking:
    type: disabled

  # Retry configuration
  maxRetries: {max_retries}
  retryDelay: {retry_delay}
  retryableErrors: {retryable_errors}

  # Fallback LLMs (tried sequentially if primary fails)
  # Each fallback can override temperature
  fallbacks:
{fallbacks_yaml}"""
    return yaml_content


def interactive_select():
    keys = list(OPENROUTER_FREE_MODELS.keys())

    print("Available models:")
    for i, key in enumerate(keys):
        print(f"  [{i}] {key}")

    primary_idx = (
        input(f"Select primary model [0-{len(keys) - 1}] (default: 0): ").strip() or "0"
    )
    try:
        primary_idx = int(primary_idx)
    except ValueError:
        primary_idx = 0

    primary_key = keys[primary_idx % len(keys)]
    primary_model = OPENROUTER_FREE_MODELS[primary_key]

    temp_input = (
        input("Primary temperature [0.0-2.0] (default: 0.3): ").strip() or "0.3"
    )
    try:
        primary_temp = float(temp_input)
    except ValueError:
        primary_temp = 0.3

    use_defaults = (
        input(f"Use default fallbacks (Qwen3.6 Plus + OpenRouter Free)? [Y/n]: ")
        .strip()
        .lower()
        or "y"
    )
    if use_defaults == "y":
        fallbacks = DEFAULT_FALLBACKS
    else:
        print(
            "\nSelect fallback models (enter numbers separated by commas, e.g., 1,3,4):"
        )
        for i, key in enumerate(keys):
            print(f"  [{i}] {key}")

        fb_input = input("Fallbacks: ").strip()
        fallbacks = []
        if fb_input:
            for idx_str in fb_input.split(","):
                try:
                    idx = int(idx_str.strip())
                    fb_key = keys[idx % len(keys)]
                    fb_model = OPENROUTER_FREE_MODELS[fb_key]
                    if fb_model != primary_model:
                        fb_temp_input = input(
                            f"Temperature for {fb_key} [0.0-2.0] or Enter for default: "
                        ).strip()
                        fb_temp = float(fb_temp_input) if fb_temp_input else None
                        fallbacks.append((fb_model, fb_temp))
                except (ValueError, IndexError):
                    pass

    if not fallbacks:
        fallbacks = DEFAULT_FALLBACKS

    retry_input = input("Max retries [0-3] (default: 1): ").strip() or "1"
    try:
        max_retries = int(retry_input)
    except ValueError:
        max_retries = 1

    delay_input = (
        input("Retry delay in ms [500-5000] (default: 1000): ").strip() or "1000"
    )
    try:
        retry_delay = int(delay_input)
    except ValueError:
        retry_delay = 1000

    return primary_model, primary_temp, fallbacks, max_retries, retry_delay


def main():
    parser = argparse.ArgumentParser(
        description="Generate .wikirc.yaml with OpenRouter free LLMs"
    )
    parser.add_argument(
        "-l", "--list", action="store_true", help="List available free models"
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Test all free models with OPENROUTER_API_KEY",
    )
    parser.add_argument(
        "-p", "--primary", help="Primary model (e.g., nemotron-3-super)"
    )
    parser.add_argument(
        "-t", "--temperature", type=float, default=0.3, help="Primary temperature"
    )
    parser.add_argument(
        "-f",
        "--fallbacks",
        help="Fallback models (comma-separated, e.g., llama-3.1-8b,mistral-7b)",
    )
    parser.add_argument(
        "--temp-fallbacks",
        help="Fallback temperatures (comma-separated for each fallback, e.g., 0.2,0.5)",
    )
    parser.add_argument(
        "--max-retries", type=int, default=1, help="Max retries per model"
    )
    parser.add_argument(
        "--retry-delay", type=int, default=1000, help="Retry delay in ms"
    )
    parser.add_argument("-o", "--output", default=".wikirc.yaml", help="Output file")
    parser.add_argument(
        "-i", "--interactive", action="store_true", help="Interactive mode"
    )

    args = parser.parse_args()

    if args.list:
        list_models()
        return

    if args.test:
        test_models(list(OPENROUTER_FREE_MODELS.items()))
        return

    if args.interactive or (
        not args.primary and not args.fallbacks and sys.stdin.isatty()
    ):
        primary_model, primary_temp, fallbacks, max_retries, retry_delay = (
            interactive_select()
        )
    else:
        default_model = list(OPENROUTER_FREE_MODELS.keys())[0]
        primary_model = (
            OPENROUTER_FREE_MODELS.get(
                args.primary, OPENROUTER_FREE_MODELS[default_model]
            )
            if args.primary
            else OPENROUTER_FREE_MODELS[default_model]
        )
        primary_temp = args.temperature
        max_retries = args.max_retries
        retry_delay = args.retry_delay

        fallbacks = []
        if args.fallbacks:
            fb_keys = args.fallbacks.split(",")
            fb_temps = args.temp_fallbacks.split(",") if args.temp_fallbacks else []
            for i, fb_key in enumerate(fb_keys):
                fb_key = fb_key.strip()
                if fb_key in OPENROUTER_FREE_MODELS:
                    fb_model = OPENROUTER_FREE_MODELS[fb_key]
                    if fb_model != primary_model:
                        fb_temp = None
                        if i < len(fb_temps):
                            try:
                                fb_temp = float(fb_temps[i].strip())
                            except ValueError:
                                pass
                        fallbacks.append((fb_model, fb_temp))

        if not fallbacks:
            fallbacks = DEFAULT_FALLBACKS

    retryable_errors = "[429, 500, 503]"
    yaml_content = generate_yaml(
        primary_model,
        primary_temp,
        fallbacks,
        max_retries,
        retry_delay,
        retryable_errors,
    )

    with open(args.output, "w") as f:
        f.write(yaml_content)

    print(f"\nCreated {args.output}")
    print(f"Primary model: {primary_model} (temp: {primary_temp})")
    print(f"Max retries: {max_retries}, Retry delay: {retry_delay}ms")
    print(f"Fallbacks ({len(fallbacks)}):")
    for fb_model, fb_temp in fallbacks:
        temp_str = f"temp: {fb_temp}" if fb_temp is not None else "default temp"
        print(f"  - {fb_model} ({temp_str})")
    print(f"\nEdit the file to customize or add your API key.")


if __name__ == "__main__":
    main()
