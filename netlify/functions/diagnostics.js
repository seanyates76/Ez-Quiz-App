exports.handler = async () => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "ok",
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      nodeVersion: process.version,
    })
  };
};