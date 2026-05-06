// Wire-format types + runtime validator for the /api/chat response.
// Lives here so both the Chatbot client and the route can import the same
// shape, and so the validator can be unit-tested as a pure function without
// needing the React/component test stack.

export type Action = { label: string; href: string };

export type ChatResponse = {
  reply: string;
  actions?: Action[];
  focusStationId?: string;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

function isAction(x: unknown): x is Action {
  return (
    isRecord(x) &&
    typeof x.label === 'string' &&
    typeof x.href === 'string'
  );
}

// Narrow runtime validation. The Chatbot uses this to gate UI rendering of
// `actions` (so a malformed response can't get arbitrary hrefs onto the page)
// and to fall into the existing fetch catch path on any shape mismatch. The
// route should always emit a valid shape — this guards against transport
// corruption, intermediary rewriting, or future contract drift.
export function isChatResponse(x: unknown): x is ChatResponse {
  if (!isRecord(x)) return false;
  if (typeof x.reply !== 'string') return false;
  if (x.actions !== undefined) {
    if (!Array.isArray(x.actions)) return false;
    if (!x.actions.every(isAction)) return false;
  }
  if (x.focusStationId !== undefined && typeof x.focusStationId !== 'string') {
    return false;
  }
  return true;
}
