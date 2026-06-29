// ================================
// GearVault - Supabase Connection
// ================================

// Replace with your own if needed
const SUPABASE_URL = "https://bgvfjygpdcgcklfabjom.supabase.co";

const SUPABASE_KEY =
"YOUR_PUBLISHABLE_KEY_HERE";

// Create client
const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// Make it available everywhere
window.supabase = supabase;


// -------------------------------
// Connection Test
// -------------------------------
async function testConnection() {

    try {

        const { error } = await supabase
            .from("cases")
            .select("*")
            .limit(1);

        if (error) throw error;

        console.log("✅ Connected to Supabase");

        const btn = document.getElementById("btn-sync-trigger");
        const txt = document.getElementById("sync-status-txt");

        if (btn) btn.classList.add("connected");
        if (txt) txt.textContent = "Connected";

    } catch (err) {

        console.error(err);

        const txt = document.getElementById("sync-status-txt");

        if (txt) txt.textContent = "Offline";

    }

}

document.addEventListener("DOMContentLoaded", testConnection);
