---
title: How an LLM Actually Works Reference Notes
date: 2026-06-27
hide:
  - navigation
#  - toc
---
# How an LLM Actually Works: Reference Notes

Working notes on what a large language model is doing between the prompt box and the reply.
Interactive diagrams for each section live in the [reference set](index.html); this is the text that sits next to them.

View the full interactive dashboard here: [Dashboard](../files/file.html){ .md-button .md-button--primary }

## It is two systems, not one

A deployed LLM is two largely separate machines. One builds the model and runs for weeks. One serves the model and runs in milliseconds. They meet at exactly one point: a file of frozen weights.

This matters because nearly every popular misconception collapses once the split is clear. The model answering a request had its weights fixed before that request existed, and nothing typed into the box edits them, whatever the product copy implies.

- Training writes weights. Serving only reads them.
- Conversation history is stored per account so the product can show it and rebuild context. That storage is not a wire back into training.
- Anything learned from usage reaches the model only through a later, deliberate training run, never the live one.

Interactive: [the two-machine overview](claude-system-map.html).

## Building the model: knowledge, then behavior

Pretraining loads knowledge. Post-training installs behavior. Both are gradient descent on the same weights; the only differences are the data and the objective.

A freshly pretrained base model is a document completer, not an assistant. Ask it for help with a cover letter and it is about as likely to continue with three more cover-letter questions as to answer, because that is what the surrounding text usually did.

Post-training fixes that in stages:

| Stage | What it does | What it adds |
|---|---|---|
| SFT | Imitate written demonstrations of good answers | The assistant format, instruction following |
| Reward model | Learn a scorer of answer quality from ranked preferences | A stand-in for "good" |
| RLHF | Optimize the model to score well, leashed to the SFT model | Helpfulness, calibration |
| Constitutional AI | Use written principles and AI feedback for harmlessness | Scalable, readable values |
| Reasoning RL | Reward chains of thought a verifier confirms are correct | The habit of thinking first |

The reward model is the load-bearing trick. Nobody can write a loss function for "helpful," so the system learns one from human rankings and then optimizes against it. Left unleashed, the policy reliably discovers that the scorer can be satisfied by text no human would tolerate, which is the entire reason for the KL penalty that keeps it near the SFT model.

Reasoning is trained, not bolted on. For tasks with a checkable answer, the reward comes from a verifier instead of a person, so the model is paid for landing on the right result and left to work out which intermediate steps helped. It converges on writing them down.

Interactive: [post-training, stage by stage](post-training-a4.html).

## Serving: a stateless function in a loop

The served model is a pure function: tokens in, one token out, no memory of the call once it returns. Everything that looks like an agent is a loop wrapped around it.

Two loops, nested:

- Inner loop (generation): run the forward pass, sample one token, append it, run again, until a stop token. The KV cache makes this affordable by storing each past token's keys and values so they are not recomputed every step.
- Outer loop (the harness): assemble the context, call the model, check whether it asked for a tool, run the tool, append the result, call again.

The harness is where agency lives, and it is ordinary backend code. The model does not run the tool any more than a function signature runs itself; it emits a structured request, the harness executes it, and "injecting" the result means appending a message to a list and re-tokenizing. That list is the entire memory of the conversation. The model carries none of its own between calls.

Interactive: [the two loops](b5-tool-loop.html).

## The forward pass: attention is the hunt for context

Inside the forward pass, each token computes three vectors and goes looking. Query is what it wants, Key is what each token advertises, Value is what gets handed over. A token's Query is scored against every Key, the scores are normalized, and the token pulls in a weighted blend of the Values. That comparison, repeated at every layer, is the whole mechanism for relating one part of the input to another.

This is why context works at all. Any token can reach any other token in a single step, regardless of distance, which is how a pronoun connects to a noun several hundred tokens earlier and how an injected tool result gets read like any other input.

Two details worth keeping:

- Causal mask: during generation a token attends only to itself and earlier tokens. The useful side effect is that past keys and values never change, which is precisely what makes the KV cache valid.
- Multi-head: the comparison runs many times in parallel, each head with its own projections. One head may track subject-verb agreement while another resolves references, in the same pass.

Interactive: [attention and the forward pass](attention-forward-pass.html).

## Position: attention is order-blind by default

Self-attention treats the context as an unordered bag. On its own it cannot tell "the dog bit the man" from the arrangement the man recalls less fondly, so position has to be supplied separately.

The current method, rotary position embedding (RoPE), encodes position as rotation. Each Query and Key is rotated by an angle proportional to its position, and the rotations are set up so that when two are compared, the absolute positions cancel and only their difference remains. Relative distance falls out of the dot product for free, at every layer, with no added parameters.

This is also why long context is expensive. Every token attends to every other, so doubling the window roughly quadruples the work, which makes "just make it bigger" a budget decision rather than a config flag. RoPE's relative, multi-frequency design is also what lets the window be stretched past its trained length at all.

Interactive: [position and RoPE](positional-encoding-rope.html).

## Cheat block

Terms, and where each one actually lives:

| Term | One line | Where it lives |
|---|---|---|
| Weights | The trained parameters | Frozen file, read-only at serving |
| Base model | Pretrained completer, pre-behavior | End of pretraining |
| SFT / RLHF / CAI | Post-training stages | Write weights, offline |
| Reward model | Learned scorer of answer quality | Training only |
| KV cache | Stored keys/values of past tokens | Per request, discarded after |
| Context window | Tokens visible to attention at once | Per request |
| Q / K / V | Want / advertise / payload vectors | Inside each attention layer |
| Tool harness | Loop that runs tools and appends results | Backend code, not the weights |
| messages list | The conversation's whole state | Per request, rebuilt each turn |

Misconceptions, corrected:

- Chatting does not train the model. The live weights are read-only.
- The model does not execute tools. The harness does.
- The embedding layer inside the model is not the same thing as a vector database bolted on for retrieval.
- Bigger context is not free. Cost grows with the square of the length.
- Reasoning is a trained habit reinforced by verifiers, not a separate engine.

Full set of interactive diagrams: [dashboard](index.html).
