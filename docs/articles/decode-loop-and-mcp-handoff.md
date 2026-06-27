---
title: "The Decode Loop and the MCP Handoff"
date: 2026-06-27
hide:
  - navigation
#  - toc
---
# The Decode Loop and the MCP Handoff

*Field notes on what runs between a prompt and a tool result.*

A language model generates one token at a time and does nothing else. It reads a sequence of tokens, produces a probability distribution over the next one, and returns. Sampling, stopping, calling tools, and splicing results back into the conversation are all done by the program around the model, the harness. The distinction sounds academic until something breaks, at which point it is the only thing that matters: latency, caching, stop conditions, tool routing, and the security boundary most architecture diagrams leave out all live in the harness, not the model.

Interactive example of the decode loop and MCP tool call: **<a href="../files/decode-loop-and-mcp-handoff/decode-loop-mcp.html" target="_blank" rel="noopener">View Example</a>** 

## The loop is four steps

The decode loop is four steps and one exit: forward pass, sample, append, check for a stop.

```python
while True:
    logits = model.forward(context)       # the only neural step
    token  = sample(logits, temp, top_p)  # harness
    context.append(token)                 # harness
    if classify_stop(token, context):     # harness
        break
```

Streaming text in a chat window is this loop and not a feature; each token that appears is one full pass through it. The single non-obvious piece is the KV cache. The first pass computes every position in the context; every pass after it computes exactly one and reads the rest from cache. That is the whole reason a 2000-token reply does not get 2000 times slower by the end, and also the reason that inserting anything into the context mid-stream forces a recompute over the inserted span.

## A tool call is text the model wrote

When a model "calls a tool," it emits tokens that spell out a call and then stops: a marker, a name, some arguments, a closing marker. Those markers are ordinary vocabulary entries the model was trained to place in the right spot, no different in kind from the token for "the".

The model has no hands. It cannot send a request or run a function; it can only write the request as text and halt. Recognizing that it halted on a complete call is a string match in the harness, the same machinery that ends generation on a double newline or an end-of-sequence token.

```text
U>weather in Polson, MT?A>[call get_weather city=Polson state=MT]
```

That is one real prompt-and-call from the bundle, in compact format. Everything left of `[call` is the prompt; everything from `[call` to the closing bracket is tokens the model produced, one per loop iteration, with the loop checking after each whether the call is closed yet.

## The handoff is JSON-RPC

Once the harness sees a complete call, it parses the emitted tokens into a structured request and sends it to an MCP server as JSON-RPC 2.0 over a transport: stdio for a local server, HTTP plus SSE for a remote one. Two methods carry the runtime, `tools/list` at startup and `tools/call` per use.

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "get_weather",
    "arguments": {"city": "Polson", "state": "MT"}
  }
}
```

The arguments are text a probabilistic model wrote, so the `json.loads` that parses them throws often enough that the error path is not optional. A working harness hands the parse error back to the model as a tool result and lets it retry, which is the only reason "the model corrected its own malformed call" ever shows up in a log instead of a stack trace.

## Tool definitions are paragraphs until used

`tools/list` returns tool schemas, and the harness serializes them into the system prompt as plain text. Until the model emits a call, a tool is a paragraph describing a tool. Nothing connects that paragraph to the real function except the harness noticing a name it recognizes and routing it, which means a tool the harness forgets to register is, from the model's side, still perfectly callable and quietly inert.

## The result comes back as tokens

The server returns a result; the harness formats it as a tool-role message, appends it to the same buffer, prefills the KV cache over the new positions, and resumes the loop.

```python
name, args = parse_tool_call(context)     # tokens -> dict; can throw, by design
result     = mcp_client.call(name, args)  # JSON-RPC, out of process
context   += render_tool_message(result)  # result re-enters as plain tokens
prefill_kv_cache(context)                 # extend cache over the inserted span
# loop resumes; the model now reads the result as ordinary context
```

To the next forward pass, the tool result is indistinguishable from anything else in the context. There is no token-level column marked "data" and another marked "instructions"; there is one sequence. That is the whole mechanism behind prompt injection through tool output, and the reason that telling the model to ignore malicious tool results keeps almost working and never quite does.

## Reference

Who does what, per step:

| Step | Actor | Output |
|------|-------|--------|
| forward pass | model | logits over the vocabulary |
| sample | harness | one token |
| append | harness | token added to context |
| stop-check | harness | none / eos / stop sequence / complete tool call |
| parse + validate | harness | {name, arguments} or an error |
| tools/call | harness (MCP client) | JSON-RPC request on the wire |
| execute | MCP server | the real side effect |
| inject + prefill | harness | result as tokens, cache extended |

MCP methods worth keeping straight:

| Method | When | Returns |
|--------|------|---------|
| initialize | once, at connect | capabilities, protocol version |
| tools/list | at startup | tool schemas (these get pasted into the prompt) |
| tools/call | per tool use | content blocks (the result) |

Stop conditions the harness checks after every token:

- end-of-sequence token, the model signaling it is done
- a configured stop sequence, a plain string match such as a double newline
- a complete tool call, the closing marker, also a string match
- a hard cap on token count, the one that saves the bill when the other three fail

## Lab

The bundle runs on python3; numpy is needed only for the two transformer scripts. The first three steps cover the loop and the MCP handoff and need nothing but the standard library.

**Step 1, the bare loop.** `python3 decode_loop.py` streams one assistant turn, prints the four-step trace per token, halts on the tool call, runs a stubbed MCP round trip, injects the result, and resumes. The model is a hand-written table, which keeps the loop in view instead of under a framework.

**Step 2, inspect the handoff.** `python3 decode_loop.py --step` pauses at each iteration, which makes the stop-check and the parse, call, and inject sequence readable one frame at a time.

**Step 3, break the call on purpose.** `python3 decode_loop_ngram.py --order 4` swaps in a trained character model with a deliberately short memory; at order 4 it tends to emit a malformed or off-target call, exercising the harness error path that real systems hit when a production model writes invalid arguments.

**Step 4, note what did not change.** The same harness drives every model in the bundle; only `forward()` differs. The loop, the stop logic, the MCP round trip, and the injection are constant across all of them.

Out of scope for these notes: `decode_loop_transformer.py` and `attention_peek.py` carry a separate thread, namely why model quality changes what the loop can produce. That one includes a from-scratch numpy transformer that copies a value out of a tool result into its answer, and a heatmap of the single attention head doing the copying. Different page.

## The short version

The loop is about fifteen lines. The model is simple in one specific way, it emits tokens, and that simplicity is load-bearing: it pushes caching, stopping, validation, tool routing, result injection, and the entire trust boundary into the harness, where they can be read and changed. Most "the model did X" sentences are really "the harness did X in response to tokens the model wrote," and keeping that straight is the difference between debugging the loop and arguing with the weather.
