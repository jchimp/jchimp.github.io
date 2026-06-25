---
title: Local LLMs - Field Notes on Picking and Running Them
hide:
  - navigation
#  - toc       # uncomment this to ALSO hide the right outline
---

# Local LLMs: Field Notes on Picking and Running Them

Working notes, kept for reference. Current as of mid-2026. The model names die fast; the method does not.

View the full page poster here: **POSTER**
## Selection rule

Two attributes decide a local model before any benchmark does: the job it has to do, and whether it fits in VRAM. Capability scores rank models against each other in a vacuum; they do not say which one runs on the hardware on hand. Answer those two first, then read benchmarks to break ties.

### Cheat block: pick by job

| Job | Fits one card | VRAM (Q4) | Bigger / frontier | Note |
|---|---|---|---|---|
| Coding agent | Devstral Small 24B | ~15 GB | GLM-5, DeepSeek-V4 (server) | dense survives long tool loops |
| Vision | Qwen3-VL 8B | ~9 GB | Qwen3-VL 32B (~21 GB, 24 GB card) | OCR and screenshots, not image-gen |
| Reading / RAG | Qwen3 8B | ~6 GB | DeepSeek-R1 32B distill (~20 GB) | set `"think": false` to stop the monologue |
| Embeddings | bge-m3 | <1 GB | qwen3-embedding 8B (~5 GB) | hybrid dense + sparse retrieval |
| Reranking | bge-reranker-v2-m3 | <1 GB | qwen3-reranker | serve via TEI / Infinity, not Ollama |

### Cheat block: VRAM at Q4

Weights only. Add KV cache, which grows with context length.

| Params | VRAM (Q4 weights) |
|---|---|
| 8B | ~6 GB |
| 14B | ~10 GB |
| 32B | ~20 GB |
| 70B | ~43 GB |

Rule of thumb: about 0.6 GB per 1B parameters at Q4. FP16 is 2x to 4x larger and buys almost nothing for inference.

## VRAM is the deciding constraint

A model that does not fit in VRAM offloads layers to system RAM and runs those layers on the CPU, dropping from tens of tokens per second to low single digits. It still produces output, which is the most that can be said for it. This is why the fit question outranks the capability question: a model that does not load is not a slow model, it is a non-option.

Q4_K_M is the working default. It cuts memory roughly 4x against FP16 with quality loss small enough that it rarely shows in normal use. Below Q4 the losses become visible, first as weaker instruction-following and then as malformed JSON, which is the failure that actually matters when the output feeds a parser.

## Mixture-of-Experts: read the total, not the active

MoE models advertise a small active parameter count next to a large total. The active count sets the speed; the total sets the memory bill, because every expert has to be resident to be selected. An "80B / 3B active" model is an 80B model on the VRAM budget and a 3B model on the stopwatch. That distinction is genuinely useful, right up until a spec sheet quietly reports only the active number.

The escape hatch is `--cpu-moe`, which keeps idle experts in system RAM and streams them in. It lets large MoE models run on modest cards at the cost of latency, which is a reasonable trade for batch work and a poor one for anything interactive.

## Coding agents

For agent work, tool-calling reliability matters more than raw coding score. The loop is read, edit, run, observe, retry, and it depends on the model emitting a valid tool call every iteration, not most iterations. A model can top HumanEval and still return a tool call as a string in the chat window, which ends the loop on the spot.

- Dense models hold up better than MoE across long tool-calling chains. MoE coders are faster per token but fall into repeated actions more often. Lesson paid for in wasted runs: I reach for the dense model whenever the agent runs unattended.
- Single card: **Devstral Small** (24B, ~15 GB at Q4). Dense, built for agent scaffolds, Apache 2.0.
- Frontier, server-class: **GLM-5** and **DeepSeek-V4** families. Stronger, and not loading on a 24 GB card. Budget for multi-GPU or rent the inference.

## Vision

A vision-language model reads images and reasons over them: screenshots, scanned documents, charts, UI mocks. It does not generate images. That is a separate model class, and conflating the two costs an afternoon before the error message admits it.

- Single card: **Qwen3-VL 8B** (~9 GB). Strong OCR, including non-Latin scripts. License is Tongyi Qianwen, not Apache; read it before anything commercial ships.
- 24 GB card: **Qwen3-VL 32B** (~21 GB). Better OCR on noisy and non-English input.
- **LLaVA** is the model most people name from memory and it has been passed for OCR and reasoning. Keep it where it is already wired in; do not start new work on it.

## Reading and research (RAG)

In retrieval-augmented generation the generation model is the easy half; retrieval is where quality is won or lost. The model can only reason over the chunks the retriever returned, and stronger weights do not repair weak recall.

- Default on one card: **Qwen3 8B** (~6 GB). Long context, dependable tool calls, valid JSON without coaxing.
- Gotcha: Qwen3 ships a reasoning mode that, left on, spends the token budget on visible chain-of-thought and can hand back an empty final answer under a tight `max_tokens`. Set `"think": false` for terse extraction work.
- More reasoning on the same 24 GB card: the **DeepSeek-R1 32B distill** (~20 GB). The full 671B R1 is server-class and not part of this conversation.

## Retrieval plumbing

Two small models do the retrieval work and sit on no leaderboard anyone forwards. They are cheap to run and they decide whether RAG is usable at all.

- **Embedder:** `bge-m3`. Multilingual, supports dense, sparse, and multi-vector retrieval from one model, fits under 1 GB. `nomic-embed-text` is the lighter, most-pulled alternative; set `num_ctx` or it silently truncates to a fraction of its 8K window.
- **Reranker:** `bge-reranker-v2-m3`. Re-scores the top 50 to 100 first-stage candidates and lifts precision by roughly 15 to 40 percent for almost no compute. Cross-encoders do not run through Ollama's embedding API, so serve them with Hugging Face TEI, Infinity, or FlagEmbedding.
- Two constraints worth pinning to the wall: the retriever sets the ceiling, since a reranker cannot surface a document recall never returned, and reranker size does not predict reranker quality. A 150M cross-encoder often matches models ten times its size, so start small and only scale on eval evidence.

## Runbook: local model in VS Code

Stack: Ollama serving the models, the Continue extension wiring them into the editor. Two models, because chat and autocomplete have different latency budgets and the same model rarely suits both.

```
# serve
curl -fsSL https://ollama.com/install.sh | sh

# pull one model for chat, one for autocomplete
# autocomplete wants a small base/FIM model for latency, not a chat model
ollama pull qwen3:8b
ollama pull qwen2.5-coder:1.5b-base
```

Point Continue at Ollama in `~/.continue/config.yaml`:

```
models:
  - name: Qwen3 8B
    provider: ollama
    model: qwen3:8b
    roles: [chat, edit]
  - name: Qwen Coder
    provider: ollama
    model: qwen2.5-coder:1.5b-base
    roles: [autocomplete]
```

Reload the window. Notes:

- Autocomplete has to answer in well under a second. If it lags, the model is too large for the role; drop to a smaller base model before changing anything else.
- Continue has moved its config format more than once (JSON to YAML, key renames). If the keys above are rejected, the installed version disagrees with these notes, and the docs win.

## Lessons that keep recurring

- The model that fits and returns parseable output beats the higher-scoring one that OOMs or emits prose where JSON was asked for. Every time.
- Most "the agent is broken" turns out to be the schema, not the weights: the model returned almost-valid JSON and the parser declined it.
- Benchmark rank is the last input to the decision, not the first.
