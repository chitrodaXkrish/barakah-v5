import { withSupabase } from "npm:@supabase/server@^1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const handler = async (req: Request): Promise<Response> => {
  try {
    // Make sure the request is a POST request
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Make sure Resend API key exists
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");

      return new Response(
        JSON.stringify({ error: "Email service is not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Read Supabase webhook payload
    const payload = await req.json();

    console.log("Received webhook:", JSON.stringify(payload));

    // Only process newly created users
    if (payload.type !== "INSERT") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Event ignored",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const user = payload.record;

    // Get user's email
    const email = user?.email;

    if (!email) {
      console.error("No email found for user");

      return new Response(
        JSON.stringify({ error: "User email not found" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get user's name from metadata if available
    const metadata = user?.raw_user_meta_data || {};

    const firstName =
      metadata.first_name ||
      metadata.firstName ||
      metadata.name?.split(" ")[0] ||
      "there";

    // Send welcome email through Resend
    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Barakah <hello@barakah.services>",
          to: [email],
          subject: "Welcome to Barakah 🌙",
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Welcome to Barakah</title>
              </head>

              <body style="
                margin: 0;
                padding: 0;
                background-color: #f7f7f5;
                font-family: Arial, Helvetica, sans-serif;
              ">
                <div style="
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 40px 20px;
                ">

                  <div style="
                    background-color: #ffffff;
                    border-radius: 16px;
                    padding: 40px 30px;
                    text-align: center;
                  ">

                    <h1 style="
                      margin: 0 0 20px;
                      font-size: 32px;
                      color: #111111;
                    ">
                      Welcome to Barakah! 🌙
                    </h1>

                    <p style="
                      margin: 0 0 20px;
                      font-size: 18px;
                      line-height: 1.6;
                      color: #333333;
                    ">
                      Assalamu Alaikum ${firstName},
                    </p>

                    <p style="
                      margin: 0 0 20px;
                      font-size: 16px;
                      line-height: 1.7;
                      color: #555555;
                    ">
                      We're so glad to have you with us.
                      Welcome to Barakah — your space for faith,
                      lifestyle, community and meaningful experiences.
                    </p>

                    <p style="
                      margin: 0 0 30px;
                      font-size: 16px;
                      line-height: 1.7;
                      color: #555555;
                    ">
                      Your Barakah journey starts now. 🤍
                    </p>

                    <a
                      href="https://barakah.services"
                      style="
                        display: inline-block;
                        padding: 14px 28px;
                        background-color: #111111;
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: bold;
                      "
                    >
                      Explore Barakah
                    </a>

                  </div>

                  <p style="
                    margin: 25px 0 0;
                    text-align: center;
                    font-size: 13px;
                    color: #888888;
                  ">
                    © ${new Date().getFullYear()} Barakah. All rights reserved.
                  </p>

                </div>
              </body>
            </html>
          `,
        }),
      }
    );

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend error:", resendData);

      return new Response(
        JSON.stringify({
          error: "Failed to send email",
          details: resendData,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("Welcome email sent successfully:", resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Welcome email sent successfully",
        emailId: resendData.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

// This function is called by a Supabase database webhook,
// not directly by a signed-in user.
export default {
  fetch: withSupabase(
    {
      auth: "none",
    },
    handler
  ),
};