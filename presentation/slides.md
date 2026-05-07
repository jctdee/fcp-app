---
theme: default
title: Pluggo
info: |
  Pluggo — voice-first EV charging assistant for Filipino drivers.
  Hackathon retrospective.
class: text-center
transition: slide-left
mdc: true
---

# Pluggo

Voice-first EV charging assistant for Filipino drivers

<div class="text-sm opacity-60 mt-8">by Team FCP</div>

---
layout: default
---

# EVs are rising. Stations are always full.

<div class="mt-4 text-lg opacity-70">
Oil prices keep climbing — adoption is only accelerating.
</div>

<div class="mt-12 text-2xl">
Filipino drivers can't type or navigate while driving.
</div>

<div class="mt-4 text-2xl opacity-80">
They need answers, not raw data.
</div>

---

# The plan

<div grid="~ cols-2 gap-8" class="mt-8">

<div>

### What we set out to build

- Native mobile app, voice-first chatbot
- Powered by **Claude** — understands natural speech and driver intent
- Filters stations by your car's connector type — only what actually plugs in

</div>

<div>

### What we expected to be hard

- Voice across platforms — mic, permissions, speech synthesis

</div>

</div>

---

# We couldn't ship native.

<div class="mt-8 text-xl">

We're a team of web developers who planned to ship mobile native. We wanted to challenge ourselves. Get out of our comfort zone. Then we learned: TestFlight requires an Apple Developer account. Hackathon clock didn't wait.

</div>

<div class="mt-6 text-xl opacity-90">

→ Pivoted to a mobile-responsive web app. Same UX, no install friction.

</div>

<div class="mt-12 text-base opacity-60">

If we continued: ship native, properly.

</div>

---

# iOS broke voice and location.

<div class="mt-8 text-xl">

Mic, speech, and geolocation all behave differently on iOS Safari than on the desktop Chrome we built on.

We spent a lot of time debugging on iOS.

</div>

<div class="mt-8 text-base opacity-80">

→ Visible fallback notices instead of silent failures.

</div>

---

# Prompt injection isn't trivial.

<div class="mt-8 text-xl">

Bad actors can craft messages to **exploit the chatbot** — making it ignore its job, run unnecessary tool calls, and burn through our token budget.

</div>

<div class="mt-8 text-base opacity-80">

→ Every user message is treated as untrusted input. Guardrails keep it in its lane.

</div>

---
layout: center
class: text-center
---

# 🔌 Pluggo, live.

<h2><u>pluggo-two.vercel.app</u></h2>

---

# What's next

<div class="mt-8 space-y-4 text-xl">

1. **Ship native** — now that we know exactly what we'd build
2. **Live station data** — partner with Manila operators for real-time availability
3. **Charging time estimates** — tell drivers how long they'll be plugged in

</div>

<div class="mt-16 text-sm opacity-50">
Pluggo · Team FCP · 2026
</div>
