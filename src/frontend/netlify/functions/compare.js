// Netlify Function: proxy /compare to your EC2 backend
const BACKEND_COMPARE_URL =
  "http://ec2-3-18-108-243.us-east-2.compute.amazonaws.com/compare";

exports.handler = async (event) => {
  try {
    const res = await fetch(BACKEND_COMPARE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: event.body, // just forward whatever the frontend sent
    });

    const text = await res.text();

    return {
      statusCode: res.status,
      body: text,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
      },
    };
  } catch (err) {
    console.error("Proxy /compare error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Proxy error calling backend /compare" }),
      headers: { "Content-Type": "application/json" },
    };
  }
};