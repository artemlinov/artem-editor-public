"""runstats.py: what one Claude Code editing run took, read from its chat log (read only, never writes to it).

  python3 pipeline/review/runstats.py <session.jsonl> [<session.jsonl> ...]

Chat logs live in ~/.claude/projects/<folder the chat ran in, dashes for slashes>/<session id>.jsonl. For each run it
prints every message the user typed (to prove a run came from one prompt), how long after the first prompt the model
handed the edit back (its first wrap-up, else its last reply before the next typed message), the effort, tokens and
cost at API list prices per model (each API call counted once, subagent logs in <session id>/subagents/ included; when
the user typed more messages, the first prompt's share is shown too), and Everygen credits charged. Claude Code's own cost counter is shown too when the
log has one; it also counts small side calls (web search, titles) that never reach the log.
"""
import collections, glob, json, os, re, sys
from datetime import datetime

# $ per million tokens: input, output, cache write 5 min, cache write 1 h, cache read (Claude API reference, 2026-11)
PRICE = {"claude-fable-5-2": (8, 40, 10, 16, 0.20), "claude-opus-5-5": (4, 20, 5, 8, 0.20),
         "claude-haiku-5-5": (0.10, 0.50, 0.125, 0.20, 0.01)}


def ts(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def typed(d):
    """The text of a message the user typed, or None for tool results, skill loads, images and task notices."""
    if d.get("type") != "user" or d.get("isMeta"):
        return None
    c = d["message"]["content"]
    text = c if isinstance(c, str) else " ".join(x.get("text", "") for x in c if x.get("type") == "text")
    text = text.strip()
    if not text or text.startswith(("<task-notification>", "<system-reminder>", "<local-command", "<command-")):
        return None
    return text


def run(path):
    files = [path] + sorted(glob.glob(os.path.join(path[:-6], "subagents", "*.jsonl")))
    calls, prompts, efforts, everygen, credits, counter = {}, [], set(), collections.Counter(), collections.Counter(), None
    tool_name, first_prompt, last_reply, wraps, replies = {}, None, None, [], []
    for f in files:
        for line in open(f):
            d = json.loads(line)
            t = d.get("type")
            if t == "cost-state" and f == path:
                counter = d["totalCostUSD"]
            elif t == "api-request":
                e = (d.get("params", {}).get("output_config") or {}).get("effort")
                efforts.add(f"{d['params'].get('model')} {e}")
            elif t == "assistant":
                m = d["message"]
                calls[(m.get("id"), d.get("requestId"))] = (m.get("model"), m.get("usage") or {}, d["timestamp"])
                if f == path:
                    last_reply = d["timestamp"]
                    replies.append(d["timestamp"])
                for c in m.get("content", []):
                    if c.get("type") == "tool_use":
                        tool_name[c["id"]] = c["name"]
                        if f == path and c["name"].endswith("wrap_up"):
                            wraps.append(d["timestamp"])
                        if "137f9a10" in c["name"]:
                            everygen[c["name"].split("__")[-1]] += 1
            elif t == "user":
                text = typed(d)
                if text and f == path:
                    prompts.append((d["timestamp"], text))
                    first_prompt = first_prompt or d["timestamp"]
                if isinstance(d["message"]["content"], list):
                    for c in d["message"]["content"]:
                        if c.get("type") == "tool_result" and "137f9a10" in tool_name.get(c.get("tool_use_id"), ""):
                            for n in re.findall(r'creditsCharged\\*"?\s*:\s*([0-9.]+)', json.dumps(c.get("content"))):
                                credits[tool_name[c["tool_use_id"]].split("__")[-1]] += float(n)
    second = prompts[1][0] if len(prompts) > 1 else "9999"
    handback = next((w for w in wraps if w < second), None) or max((r for r in replies if r < second), default=None)
    tok, first_cost = collections.defaultdict(lambda: [0] * 6), 0
    for model, u, when in calls.values():
        if not model or model.startswith("<"):
            continue
        cc, t = u.get("cache_creation") or {}, tok[model]
        if model in PRICE and when < second:
            first_cost += sum(a * b for a, b in zip(
                (u.get("input_tokens", 0), u.get("output_tokens", 0), cc.get("ephemeral_5m_input_tokens", 0),
                 cc.get("ephemeral_1h_input_tokens", u.get("cache_creation_input_tokens", 0) if not cc else 0),
                 u.get("cache_read_input_tokens", 0)), PRICE[model])) / 1e6
        t[0] += u.get("input_tokens", 0)
        t[1] += u.get("output_tokens", 0)
        t[2] += cc.get("ephemeral_5m_input_tokens", 0)
        t[3] += cc.get("ephemeral_1h_input_tokens", u.get("cache_creation_input_tokens", 0) if not cc else 0)
        t[4] += u.get("cache_read_input_tokens", 0)
        t[5] += 1

    print(f"== {os.path.basename(path)}" + (f" (+{len(files) - 1} subagent logs)" if len(files) > 1 else ""))
    print(f"   typed messages: {len(prompts)}")
    for when, text in prompts:
        print(f"     {when[11:19]} UTC  {text[:90]!r}")
    if first_prompt and handback:
        mins = (ts(handback) - ts(first_prompt)).total_seconds() / 60
        print(f"   handed back {mins:.0f} min after the first prompt ({first_prompt[:16]} to {handback[11:16]} UTC)"
              + ("" if wraps else ", no wrap-up yet: still running?"))
    if last_reply and handback and last_reply[:16] != handback[:16]:
        print(f"   last reply in the log: {last_reply[:16]} UTC")
    print(f"   effort: {', '.join(sorted(efforts))}")
    total = 0
    for model, t in sorted(tok.items()):
        p = PRICE.get(model)
        cost = sum(a * b for a, b in zip(t[:5], p)) / 1e6 if p else float("nan")
        total += cost if p else 0
        print(f"   {model}: {t[5]} API calls, output {t[1] / 1e3:.0f}k, cache write {(t[2] + t[3]) / 1e3:.0f}k, "
              f"cache read {t[4] / 1e6:.1f}M, input {t[0] / 1e3:.1f}k tokens: ${cost:.2f}" + ("" if p else " (no price)"))
    print(f"   API cost: ${total:.2f}" + (f" (Claude Code's own counter: ${counter:.2f})" if counter else "")
          + (f"; the first prompt's edit alone: ${first_cost:.2f}" if len(prompts) > 1 else ""))
    if everygen:
        print(f"   Everygen calls: {dict(everygen)}; credits charged: {sum(credits.values()):g} {dict(credits)}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    for p in sys.argv[1:]:
        run(p)
