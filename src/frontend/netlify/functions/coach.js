// Netlify Function: proxy /coach to your EC2 backend
const BACKEND_COACH_URL =
  "http://ec2-3-18-108-243.us-east-2.compute.amazonaws.com/coach";

exports.handler = async (event) => {
  try {
    const res = await fetch(BACKEND_COACH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: event.body,
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
    console.error("Proxy /coach error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Proxy error calling backend /coach" }),
      headers: { "Content-Type": "application/json" },
    };
  }
};