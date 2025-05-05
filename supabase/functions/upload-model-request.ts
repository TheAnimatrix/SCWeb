import { createClient } from 'npm:@supabase/supabase-js@2';
// Environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // 1. Auth: Get user from JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({
        error: "Missing or invalid auth header"
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 401
      });
    }
    const jwt = authHeader.replace("Bearer ", "");
    const { data: user, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !user?.user) {
      return new Response(JSON.stringify({
        error: "Invalid or expired token"
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 401
      });
    }
    const user_id = user.user.id;
    // 2. Parse multipart form data
    const form = await req.formData();
    const modelFile = form.get("model_file");
    const maker_id = form.get("maker_id");
    const color = form.get("color");
    const material = form.get("material");
    const quality = form.get("quality");
    const scale = form.get("scale");
    const infill = form.get("infill");
    // Add more fields as needed
    if (!modelFile || !maker_id || !color || !material || !quality || !scale || !infill) {
      return new Response(JSON.stringify({
        error: "Missing required fields"
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // 3. File validation: Only allow .stl
    if (!modelFile.name.toLowerCase().endsWith(".stl")) {
      return new Response(JSON.stringify({
        error: "Only .stl files are allowed"
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // 4. Quota check
    // Get user's daily limit
    const { data: userRow, error: userRowErr } = await supabase.from("users").select("quote_daily_limit").eq("id", user_id).single();
    const quoteDailyLimit = userRow?.quote_daily_limit ?? 3;
    // Get today's printrequests count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count, error: countErr } = await supabase.from("printrequests").select("id", {
      count: "exact",
      head: true
    }).eq("user_id", user_id).gte("created_at", today.toISOString());
    if ((count ?? 0) >= quoteDailyLimit) {
      return new Response(JSON.stringify({
        error: "You have reached your daily quote request limit"
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 403
      });
    }
    // 5. Upload file to storage
    const fileName = `${user_id}_${Date.now()}_${modelFile.name}`;
    const arrayBuffer = await modelFile.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);
    const { data: uploadData, error: uploadErr } = await supabase.storage.from("models").upload(fileName, fileBytes, {
      upsert: true,
      contentType: modelFile.type || "application/sla"
    });
    if (uploadErr) {
      return new Response(JSON.stringify({
        error: "Failed to upload model file",
        details: uploadErr.message
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    const modelPath = uploadData?.path;
    // 6. Insert printrequest
    const { data: insertData, error: insertErr } = await supabase.from("printrequests").insert({
      user_id,
      creator_id: maker_id,
      model: modelPath,
      model_data: {
        color,
        material,
        quality,
        scale,
        infill
      },
      model_metadata: {
        fileName
      },
      request_stage: "requested"
    }).select().single();
    if (insertErr) {
      return new Response(JSON.stringify({
        error: "Failed to create print request",
        details: insertErr.message
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    // 7. Return the new printrequest row
    return new Response(JSON.stringify({
      success: true,
      printrequest: insertData
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: "Unexpected error",
      details: err.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
