require("dotenv").config();

// Set this to your current ngrok forwarding URL + your webhook route
const NGROK_URL = "https://pasted-countable-bucked.ngrok-free.dev";

async function main() {
  const response = await fetch(
    "https://api.devrev.ai/internal/webhooks.create",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEVREV_API_KEY}`,
      },
      body: JSON.stringify({
        url: `${NGROK_URL}/api/devrev-webhook`,
        event_types: ["ai_agent_response"],
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed:", data);
    return;
  }

  console.log("Webhook created!");
  console.log("Webhook ID:", data.webhook.id);
  console.log("\nCopy this into your .env as DEVREV_WEBHOOK_ID:");
  console.log(data.webhook.id);
}

main();
