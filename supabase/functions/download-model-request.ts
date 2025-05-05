import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  try {
    // 1. Auth: Get user from JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid auth header" }), { status: 401 });
    }
    const jwt = authHeader.replace("Bearer ", "");
    const { data: user, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !user?.user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 401 });
    }
    const user_id = user.user.id;

    // 2. Parse input (support GET query or POST JSON)
    let model_url = null;
    if (req.method === 'GET') {
      const url = new URL(req.url);
      model_url = url.searchParams.get('model_url');
    } else if (req.method === 'POST') {
      const body = await req.json();
      model_url = body.model_url;
    }
    if (!model_url) {
      return new Response(JSON.stringify({ error: "Missing model_url" }), { status: 400 });
    }

    // 3. File validation: Only allow .stl
    if (!model_url.toLowerCase().endsWith('.stl')) {
      return new Response(JSON.stringify({ error: "Only .stl files are allowed" }), { status: 400 });
    }

    // 4. Check printrequests for access
    // Accept both full URL and storage path (strip domain if needed)
    let storagePath = model_url;
    if (storagePath.startsWith('http')) {
      // Extract path after /storage/v1/object/public/models/
      const match = storagePath.match(/\/models\/(.+\.stl)$/);
      if (match) storagePath = `models/${match[1]}`;
    }
    // Query printrequests for a row with this model and user as user_id or creator_id
    const { data: prRows, error: prErr } = await supabase
      .from('printrequests')
      .select('id')
      .or(`user_id.eq.${user_id},creator_id.eq.${user_id}`)
      .eq('model', storagePath)
      .limit(1);
    if (prErr || !prRows || prRows.length === 0) {
      return new Response(JSON.stringify({ error: "You do not have access to this file" }), { status: 403 });
    }

    // 5. Generate signed URL for download
    const { data: signedUrlData, error: signedUrlErr } = await supabase.storage
      .from('models')
      .createSignedUrl(storagePath.replace('models/', ''), 60 * 10); // 10 min expiry
    if (signedUrlErr || !signedUrlData?.signedUrl) {
      return new Response(JSON.stringify({ error: "Failed to generate signed URL", details: signedUrlErr?.message }), { status: 500 });
    }

    // 6. Return the signed URL
    return new Response(JSON.stringify({ success: true, url: signedUrlData.signedUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Unexpected error", details: err.message }), { status: 500 });
  }
}); 