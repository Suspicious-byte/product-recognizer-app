// This is your secure backend function.
// It runs on Netlify's servers, not in the browser.

exports.handler = async function (event) {
  // 1. Get the API key from a secure environment variable
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API key is not set." }),
    };
  }

  // 2. Parse the data sent from the frontend
  const { action, imageBase64, productDetails } = JSON.parse(event.body);
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  
  let prompt;
  let parts = [];

  // 3. Determine the correct prompt and payload based on the action
  if (action === 'analyze') {
    if (!imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: "Image data is required for analysis." }) };
    }
    prompt = `Analyze the image and identify the product. Provide a clear, well-formatted response with: **Product Name**, **Brand**, **Model/Type**, a bulleted list for **Key Features**, and its main **Use Case**.`;
    parts = [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }];
  } else if (action === 'similar') {
    if (!productDetails) {
      return { statusCode: 400, body: JSON.stringify({ error: "Product details are required to find similar items." }) };
    }
    prompt = `Based on the following product details, suggest 3 similar or alternative products. For each, provide a name, a brief description, and why someone might choose it over the original.\n\n## Original Product:\n${productDetails}`;
    parts = [{ text: prompt }];
  } else {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid action." }) };
  }

  const payload = { contents: [{ role: "user", parts: parts }] };

  // 4. Securely call the Google Gemini API from the backend
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Google API Error:", errorBody);
      return { statusCode: response.status, body: JSON.stringify({ error: "Failed to get a response from the AI model." }) };
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return { statusCode: 500, body: JSON.stringify({ error: "Could not extract text from AI response." }) };
    }

    // 5. Send the successful result back to the frontend
    return {
      statusCode: 200,
      body: JSON.stringify({ text: text }),
    };

  } catch (error) {
    console.error("Handler Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};