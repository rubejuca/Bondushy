/// <reference lib="deno.ns" />
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import "jsr:@supabase/functions-js@2.4.5/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
if (!RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY environment variable");
}

Deno.serve(async (req) => {
  // ✅ Manejar preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return new Response(
        JSON.stringify({ error: "Request must be JSON" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const body = await req.json();
    console.log("📩 Request body:", body);

    const { to, subject, html, fromName = "Bondusy Spa" } = body;

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, html" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // ✅ Llamada a la API de Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `"${fromName}" <team@bondushy.pruebascr.online>`,
        to,
        subject,
        html,
      }),
    });

    const data = await resendResponse.text();
    console.log("📨 Resend raw response:", data);

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(data);
    } catch {
      jsonResponse = { raw: data };
    }

    if (!resendResponse.ok) {
      return new Response(
        JSON.stringify({
          error:
            jsonResponse.error ||
            jsonResponse.message ||
            "Resend API error",
        }),
        {
          status: resendResponse.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: jsonResponse }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    console.error("🔥 Error sending email:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
