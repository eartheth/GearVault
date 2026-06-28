// ==========================================
// GearVault
// Supabase
// ==========================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ------------------------------
// CHANGE THESE
// ------------------------------

const SUPABASE_URL =
"https://YOUR_PROJECT.supabase.co";

const SUPABASE_KEY =
"YOUR_PUBLIC_ANON_KEY";

// ------------------------------

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ==========================================
// Search Item
// ==========================================

export async function getItem(barcode){

    const { data, error } = await supabase

    .from("inventory")

    .select("*")

    .eq("barcode", barcode)

    .single();

    if(error){

        console.log(error);

        return null;

    }

    return data;

}

// ==========================================
// Add Item
// ==========================================

export async function addItem(item){

    const { error } = await supabase

    .from("inventory")

    .insert([{

        barcode:item.barcode,

        name:item.name,

        case:item.case,

        location:item.location,

        quantity:item.quantity,

        have:item.have,

        last_scan:new Date().toISOString()

    }]);

    if(error){

        console.error(error);

        alert(error.message);

    }

}

// ==========================================
// Update Item
// ==========================================

export async function updateItem(id,item){

    const { error } = await supabase

    .from("inventory")

    .update({

        barcode:item.barcode,

        name:item.name,

        case:item.case,

        location:item.location,

        quantity:item.quantity,

        have:item.have,

        last_scan:new Date().toISOString()

    })

    .eq("id",id);

    if(error){

        console.error(error);

        alert(error.message);

    }

}

// ==========================================
// Get All
// ==========================================

export async function getInventory(){

    const { data,error } = await supabase

    .from("inventory")

    .select("*")

    .order("name");

    if(error){

        console.log(error);

        return [];

    }

    return data;

}

// ==========================================
// Recent Scans
// ==========================================

export async function getRecentScans(){

    const { data,error } = await supabase

    .from("inventory")

    .select("*")

    .order("last_scan",{ascending:false})

    .limit(10);

    if(error){

        return [];

    }

    return data;

}

// ==========================================
// Update Scan Time
// ==========================================

export async function touchItem(id){

    await supabase

    .from("inventory")

    .update({

        last_scan:new Date().toISOString()

    })

    .eq("id",id);

}

// ==========================================
// Mark Missing
// ==========================================

export async function markMissing(id){

    await supabase

    .from("inventory")

    .update({

        status:"Missing",

        last_scan:new Date().toISOString()

    })

    .eq("id",id);

}

// ==========================================
// Mark Found
// ==========================================

export async function markFound(id){

    await supabase

    .from("inventory")

    .update({

        status:"Available",

        last_scan:new Date().toISOString()

    })

    .eq("id",id);

}
