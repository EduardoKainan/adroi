const { GoogleGenAI } = require('@google/genai');

async function check() {
  try {
    const ai = new GoogleGenAI({ apiKey: 'dummy_key_to_prevent_crash' });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "hello"
    });
    console.log(response);
  } catch (e) {
    console.error(e.message);
  }
}
check();
