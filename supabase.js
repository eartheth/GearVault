// =======================================
// GearVault
// Supabase Configuration
// =======================================

const SUPABASE_URL = "https://bgvfjygpdcgcklfabjom.supabase.co";

const SUPABASE_KEY = "sb_publishable_ltcwyK9IDa-__0E2bFNsRA_hryjLZh8";

// Create client
const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// Export
export { supabase };
