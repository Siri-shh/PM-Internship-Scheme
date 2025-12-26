import 'dotenv/config';

console.log("=== CHATBOT DEBUG ===");
console.log("GROQ_API_KEY:", process.env.GROQ_API_KEY ?
    `SET (${process.env.GROQ_API_KEY.substring(0, 15)}...)` :
    "NOT SET - Please check .env file");

// Test Groq API
async function testGroqAPI() {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        console.log("\n❌ Cannot test API - GROQ_API_KEY not set");
        return;
    }

    console.log("\n🔄 Testing Groq API...");

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "user", content: "Say 'Hello, I am working!' in exactly 5 words." }
                ],
                max_tokens: 50,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.log(`\n❌ Groq API Error: ${response.status}`);
            console.log("Error details:", errorText);
            return;
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;

        console.log("\n✅ Groq API Working!");
        console.log("Response:", reply);
    } catch (error: any) {
        console.log("\n❌ Request failed:", error.message);
    }
}

testGroqAPI();
