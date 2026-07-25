// SignalWire test — full AI conversation loop
// Same pattern as Ridgecall: caller speaks -> Claude Haiku replies -> loop
//
// Set this URL as the "Voice" webhook (POST) on your SignalWire trial number:
//   https://YOUR-SITE.netlify.app/.netlify/functions/voice
//
// Requires env var on Netlify: ANTHROPIC_API_KEY

exports.handler = async (event) => {
  const params = new URLSearchParams(event.body || "");
  const speechResult = params.get("SpeechResult");

  let sayText;

  if (!speechResult) {
    // First hit on the call — no speech yet, just greet and start listening
    sayText = "Hi, this is a test assistant running on SignalWire. Go ahead, say something.";
  } else {
    // Caller said something — send it to Claude and speak the reply
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 200,
          system:
            "You are a friendly test voice assistant running on a SignalWire trial number. " +
            "Keep every reply to 1-2 short sentences, plain conversational language, no markdown, " +
            "since this will be read aloud over the phone.",
          messages: [{ role: "user", content: speechResult }],
        }),
      });

      const data = await resp.json();
      sayText =
        data?.content?.[0]?.text ||
        "Sorry, I didn't quite catch that. Can you say it again?";
    } catch (err) {
      console.error("Claude API error:", err);
      sayText = "Sorry, I'm having trouble right now. Please try again in a moment.";
    }
  }

  const escaped = sayText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // LaML is SignalWire's TwiML-compatible markup — same verbs, same shape.
  // This function calls itself as the Gather action, so the conversation loops
  // until the caller stays silent or hangs up.
  const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="/.netlify/functions/voice" method="POST" speechTimeout="auto" timeout="6">
    <Say>${escaped}</Say>
  </Gather>
  <Say>Didn't hear anything, goodbye.</Say>
  <Hangup/>
</Response>`;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/xml" },
    body: laml,
  };
};
