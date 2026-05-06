// Pure unit tests for the /api/chat response validator. Lives next to the
// helper because it's the one client-consumed boundary in lib/chatbot — the
// route tests cover the server-side helpers integration-style, but the
// Chatbot relies on isChatResponse to gate UI rendering, and there's no
// component test rig to exercise it through.

import { describe, it, expect } from 'vitest';
import { isChatResponse } from './response';

describe('isChatResponse — accepts valid shapes', () => {
  it.each([
    ['minimal: just reply', { reply: 'hi' }],
    ['reply + actions', { reply: 'go here', actions: [{ label: 'Maps', href: 'https://maps.google.com/?q=1,2' }] }],
    ['reply + multiple actions', { reply: 'r', actions: [{ label: 'Maps', href: 'a' }, { label: 'Waze', href: 'b' }] }],
    ['reply + actions + focusStationId', { reply: 'r', actions: [{ label: 'Maps', href: 'a' }], focusStationId: 'st-1' }],
    ['reply + focusStationId only', { reply: 'r', focusStationId: 'st-1' }],
    ['reply + empty actions array', { reply: 'r', actions: [] }],
    ['extra unknown fields ignored', { reply: 'r', someFutureField: 'fine' }],
  ])('%s', (_label, input) => {
    expect(isChatResponse(input)).toBe(true);
  });
});

describe('isChatResponse — rejects invalid shapes', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['array', []],
    ['number', 42],
    ['string', 'just a string'],
    ['empty object', {}],
    ['reply not a string', { reply: 123 }],
    ['reply is null', { reply: null }],
    ['actions not an array', { reply: 'r', actions: 'oops' }],
    ['actions is an object', { reply: 'r', actions: {} }],
    ['action missing label', { reply: 'r', actions: [{ href: 'a' }] }],
    ['action missing href', { reply: 'r', actions: [{ label: 'Maps' }] }],
    ['action label not a string', { reply: 'r', actions: [{ label: 1, href: 'a' }] }],
    ['action href not a string', { reply: 'r', actions: [{ label: 'Maps', href: 99 }] }],
    ['actions: one valid + one bad', { reply: 'r', actions: [{ label: 'Maps', href: 'a' }, { label: 'Waze' }] }],
    ['focusStationId not a string', { reply: 'r', focusStationId: 7 }],
    ['focusStationId is null', { reply: 'r', focusStationId: null }],
  ])('%s', (_label, input) => {
    expect(isChatResponse(input)).toBe(false);
  });
});

describe('isChatResponse — narrows correctly', () => {
  it('exposes typed fields on accepted values', () => {
    const raw: unknown = {
      reply: 'r',
      actions: [{ label: 'Maps', href: 'https://x' }],
      focusStationId: 'st-1',
    };
    expect(isChatResponse(raw)).toBe(true);
    if (isChatResponse(raw)) {
      // No casts needed — the type guard narrows raw.
      expect(raw.reply).toBe('r');
      expect(raw.actions?.[0].href).toBe('https://x');
      expect(raw.focusStationId).toBe('st-1');
    }
  });
});
