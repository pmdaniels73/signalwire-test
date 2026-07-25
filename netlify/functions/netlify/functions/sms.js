exports.handler = async (event) => {
  const params = new URLSearchParams(event.body || "");
  const incomingText = params.get("Body") || "";

  let replyText;

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
        max_tokens: 150,
        system:
          "You are a friendly test SMS assistant running on a SignalWire trial number. Keep every reply short and text-message-appropriate, ideally under 300 characters.",
        messages: [{ role: "user", content: incomingText }],
      }),
    });

    const data = await resp.json();
    replyText =
      data?.content?.[0]?.text ||
      "Sorry, I didn't quite get that. Try texting again.";
  } catch (err) {
    console.error("Claude API error:", err);
    replyText = "Sorry, having trouble right now. Try again in a bit.";
  }

  const escaped = replyText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const cxml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escaped}</Message>
</Response>`;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/xml" },
    body: cxml,
  };
};
