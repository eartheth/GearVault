// ======================================
// GearVault - supabase.js
// ======================================

// ---------- CONFIG ----------

const SUPABASE_URL = "https://bgvfjygpdcgcklfabjom.supabase.co";

const SUPABASE_KEY = "sb_publishable_ltcwyK9IDa-__0E2bFNsRA_hryjLZh8";


// ---------- CLIENT ----------

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ---------- TABLES ----------

const TABLES = {

    CASES: "cases",

    EQUIPMENT: "equipment",

    SCAN_LOGS: "scan_logs",

    MAINTENANCE: "maintenance",

    MISSING: "missing_items"

};


// ---------- GLOBALS ----------

window.db = db;

window.TABLES = TABLES;


// ---------- CONNECTION ----------

async function connectSupabase(){

    try{

        const { error } = await db
            .from(TABLES.CASES)
            .select("*")
            .limit(1);

        if(error) throw error;

        return true;

    }catch(e){

        console.error(e);

        return false;

    }

}

window.connectSupabase = connectSupabase;
