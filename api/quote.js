// Vercel serverless function: /api/quote
// Required Vercel environment variables:
// SUPABASE_URL=https://YOUR_PROJECT.supabase.co
// SUPABASE_SERVICE_ROLE_KEY=the private service_role JWT from Supabase API settings

const ALLOWED_FREQUENCIES = new Set(["weekly", "fortnightly", "monthly"]);

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase environment variables");
    return res.status(500).json({ error: "Server configuration error. Please try again later." });
  }

  try {
    const body = req.body || {};
    // The client also blocks honeypot submissions; this is a second check.
    if (body.website) return res.status(200).json({ success: true });

    const text = (value, max) => String(value == null ? "" : value).trim().slice(0, max);
    const name = text(body.name, 120);
    const company = text(body.company, 180);
    const email = text(body.email, 254).toLowerCase();
    const phone = text(body.phone, 30).replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
    const city = text(body.city, 120);
    const notes = text(body.notes, 3000);
    const subscription = text(body.subscription, 1000);
    const frequency = text(body.frequency, 20);
    const formUsed = text(body.formUsed, 40) || "hero";
    const pageUrl = text(body.page, 2000);
    const tracking = body.tracking && typeof body.tracking === "object" && !Array.isArray(body.tracking) ? body.tracking : {};

    if (!name || !company || !email || !phone || !city || !ALLOWED_FREQUENCIES.has(frequency)) {
      return res.status(400).json({ error: "Please complete all required fields correctly." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: "Please enter a valid 10-digit Indian mobile number." });
    }

    const insertResponse = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/flower_quote_requests`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        name,
        company,
        email,
        phone,
        city,
        frequency,
        whole_year: body.wholeYear === true,
        notes: notes || null,
        subscription: subscription || null,
        source: formUsed,
        page_url: pageUrl || null,
        tracking
      })
    });

    if (!insertResponse.ok) {
      const details = await insertResponse.text();
      console.error("Supabase insert failed:", insertResponse.status, details);
      return res.status(500).json({ error: "We could not save your request. Please try again." });
    }

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("Quote API error:", error);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};
