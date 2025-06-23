import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function summarizeReadme(readme: string) {
  const prompt = `
You are an assistant summarizing README files for a portfolio site. Given the README content, return:

1. A 2–3 sentence summary.
2. A deployed URL if mentioned.
3. A tech stack (list of technologies, languages, or frameworks mentioned).

README:
"""${readme}"""

Respond in this JSON format:
{
  "text": "...summary...",
  "deployedUrl": "...url or null...",
  "techStack": ["tech1", "tech2", ...]
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-nano",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const raw = response.choices[0].message.content;

  try {
    const json = JSON.parse(raw ?? "{}");
    return {
      text: json.text || "No summary available.",
      deployedUrl: json.deployedUrl || null,
      techStack: json.techStack || [],
    };
  } catch (e) {
    console.error("Failed to parse AI summary response:", raw);
    return {
      text: "Summary failed.",
      deployedUrl: null,
      techStack: [],
    };
  }
}
