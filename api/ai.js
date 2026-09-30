export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const question = String(req.body?.message || "").trim();

  if (!question) {
    return res.status(400).json({
      error: "Question likhein."
    });
  }

  if (question.length > 4000) {
    return res.status(400).json({
      error: "Question bahut lamba hai."
    });
  }

  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return res.status(503).json({
      error: "AI API key configure nahi hai."
    });
  }

  try {
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are Prep Master educational doubt support. Explain school subjects clearly, step by step, in the language used by the student. Keep answers appropriate for school students."
            },
            {
              role: "user",
              content: question
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "OpenAI error:",
        data?.error?.message || response.status
      );

      return res.status(502).json({
        error: "AI service se response nahi mila."
      });
    }

    const reply =
      data?.choices?.[0]?.message?.content ||
      "Answer nahi mila.";

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("AI API:", error.message);

    return res.status(502).json({
      error: "AI service se connection nahi ho paaya."
    });
  }
}
