let primed = false;

// iOS Safari/Chrome (both WebKit) require the first speechSynthesis.speak()
// call in a page session to happen inside a user-gesture handler. After one
// in-gesture speak(), subsequent async speak() calls are unlocked. Call this
// from onClick handlers (mic tap, chat open, etc.) to prime the queue.
export function primeSpeech(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  if (primed) return;
  const u = new SpeechSynthesisUtterance('');
  u.volume = 0;
  window.speechSynthesis.speak(u);
  primed = true;
}

export function speak(text: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  utterance.pitch = 1;
  // iOS sometimes auto-pauses the queue after idle; resume defensively.
  window.speechSynthesis.resume();
  window.speechSynthesis.speak(utterance);
}
