export type WrapPriorTurn = { speaker: 'driver' | 'bot'; text: string };

export type WrapInput = {
  priorTurns: WrapPriorTurn[];
  driverMessage: string;
  latestAnnouncement?: string;
};

// Folds the untrusted client payload into a single JSON-encoded string suitable
// to send as one user-role message to Claude. JSON encoding makes attacks like
// </driver_message>, fake role tags, embedded fake tool_result blocks, or
// nested JSON documents impossible to syntactically escape — they all end up
// as ordinary string values inside the wrapper.
export function wrapDriverPayload(input: WrapInput): string {
  const payload: Record<string, unknown> = {
    prior_transcript: input.priorTurns.map((t) => ({
      speaker: t.speaker,
      utterance: t.text,
    })),
    current_driver_message: input.driverMessage,
  };
  if (input.latestAnnouncement !== undefined) {
    payload.recent_announcement = input.latestAnnouncement;
  }
  return JSON.stringify(payload);
}
