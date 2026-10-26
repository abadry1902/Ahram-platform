export function hasSupabaseConfiguration(){return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);}
// Explicit release gate, not an authentication bypass. Keep false until the documented security checks pass.
export function isWorkspaceEnabled(){return process.env.WORKSPACE_ENABLED==="true"&&hasSupabaseConfiguration();}
// Enquiries remain disabled until server-side CAPTCHA and durable rate limiting have been implemented and tested.
export function areEnquiriesEnabled(){return false;}
