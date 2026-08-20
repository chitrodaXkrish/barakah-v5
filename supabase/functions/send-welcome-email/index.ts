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
          subject: "Welcome to Barakah, You're part of something special 🤍",
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
                    padding: 40px 35px;
                    text-align: left;
                  ">

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
                      Welcome to Barakah. 🤍
                    </p>

                    <p style="
                      margin: 0 0 20px;
                      font-size: 16px;
                      line-height: 1.7;
                      color: #555555;
                    ">
                      I just wanted to take a moment to say thank you.
                    </p>

                    <p style="
                      margin: 0 0 20px;
                      font-size: 16px;
                      line-height: 1.7;
                      color: #555555;
                    ">
                      You may have simply created an account today, but for me, your decision to be here means much more than that.
                    </p>

                    <p style="
                      margin: 0 0 20px;
                      font-size: 16px;
                      line-height: 1.7;
                      color: #555555;
                    ">
                      Barakah started with a simple dream — to build something that helps Muslims bring more faith, goodness and barakah into their everyday lives.
                    </p>

                    <p style="
                      margin: 0 0 20px;
                      font-size: 16px;
                      line-height: 1.7;
                      color: #555555;
                    ">
                      And honestly, a dream like this can never be built by one person. It is built by people like you — people who choose to be part of it, support it, use it, share their thoughts, and grow with us.
                    </p>

                    <div style="
                      margin: 0 0 24px;
                      padding: 20px 24px;
                      background-color: #f7f7f5;
                      border-radius: 12px;
                      text-align: center;
                    ">
                      <p style="
                        margin: 0 0 10px;
                        font-size: 15px;
                        color: #555555;
                      ">
                        Allah says:
                      </p>
                      <p style="
                        margin: 0 0 10px;
                        font-size: 20px;
                        line-height: 1.8;
                        color: #111111;
                        direction: rtl;
                      ">
                        وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ
                      </p>
                      <p style="
                        margin: 0;
                        font-size: 15px;
                        line-height: 1.6;
                        color: #555555;
                        font-style: italic;
                      ">
                        "And cooperate with one another in goodness and righteousness."<br />
                        — Qur'an 5:2
                      </p>
                    </div>

                    <p style="
                      margin: 0 0 20px;
                      font-size: 16px;
                      line-height: 1.7;
                      color: #555555;
                    ">
                      That is something I hope Barakah always stands for — people coming together for something good.
                    </p>

                    <p style="
                      margin: 0 0 20px;
                      font-size: 16px;
                      line-height: 1.7;
                      color: #555555;
                    ">
                      So, welcome to the family.
                    </p>

                    <p style="
                      margin: 0 0 30px;
                      font-size: 16px;
                      line-height: 1.7;
                      color: #555555;
                    ">
                      We're still at the very beginning of this journey, and I'm genuinely grateful that you're here with us from the start.
                      May Allah put barakah in this journey, in what we build together, and most importantly, in your life.
                    </p>

                    <p style="
                      margin: 0 0 4px;
                      font-size: 16px;
                      line-height: 1.6;
                      color: #333333;
                    ">
                      With gratitude,<br />
                      <strong>Mouaz</strong><br />
                      Founder, Barakah 🤍
                    </p>

                    <p style="
                      margin: 24px 0 0;
                      padding-top: 20px;
                      border-top: 1px solid #eeeeee;
                      font-size: 13px;
                      line-height: 1.6;
                      color: #888888;
                    ">
                      P.S. — If you ever have comments, suggestions, or simply want to say hello, I'd love to hear from you.
                    </p>

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