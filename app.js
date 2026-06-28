import { supabase } from "supabase.js";

// ----------------------------
// Startup
// ----------------------------

document.addEventListener("DOMContentLoaded", init);

async function init(){

    console.log("GearVault Started");

    await loadDashboard();

    registerButtons();

}

// ----------------------------
// Dashboard
// ----------------------------

async function loadDashboard(){

    loadEquipmentCount();

    loadCaseCount();

    loadMissingCount();

    loadRecentActivity();

}

// ----------------------------
// Equipment Count
// ----------------------------

async function loadEquipmentCount(){

    const { count, error } = await supabase

        .from("equipment")

        .select("*", {
            count:"exact",
            head:true
        });

    if(error){

        console.error(error);

        return;

    }

    document.getElementById("equipmentCount").textContent = count;

}

// ----------------------------
// Case Count
// ----------------------------

async function loadCaseCount(){

    const { count, error } = await supabase

        .from("cases")

        .select("*",{
            count:"exact",
            head:true
        });

    if(error){

        console.error(error);

        return;

    }

    document.getElementById("caseCount").textContent = count;

}

// ----------------------------
// Missing Count
// ----------------------------

async function loadMissingCount(){

    const { count } = await supabase

        .from("equipment")

        .select("*",{
            count:"exact",
            head:true
        })

        .eq("status","Missing");

    document.getElementById("missingCount").textContent = count;

}

// ----------------------------
// Recent Activity
// ----------------------------

async function loadRecentActivity(){

    const { data, error } = await supabase

        .from("history")

        .select("*")

        .order("created_at",{
            ascending:false
        })

        .limit(10);

    if(error){

        console.error(error);

        return;

    }

    const div = document.getElementById("recentActivity");

    div.innerHTML = "";

    data.forEach(item=>{

        div.innerHTML += `

        <div class="activity">

            ✅ ${item.action}

            <small>${item.created_at}</small>

        </div>

        `;

    });

}

// ----------------------------
// Buttons
// ----------------------------

function registerButtons(){

    document.getElementById("scanButton")
        .addEventListener("click",openScanner);

    document.getElementById("casesBtn")
        .addEventListener("click",openCases);

    document.getElementById("equipmentBtn")
        .addEventListener("click",openEquipment);

    document.getElementById("showBtn")
        .addEventListener("click",showChecker);

    document.getElementById("updateBtn")
        .addEventListener("click",updateInventory);

}

// ----------------------------
// Navigation
// ----------------------------

function openScanner(){

    alert("Scanner Coming Soon");

}

function openCases(){

    alert("Cases Page");

}

function openEquipment(){

    alert("Equipment Page");

}

function showChecker(){

    alert("Show Checker");

}

function updateInventory(){

    alert("Inventory Updater");

}

// ----------------------------
// Search
// ----------------------------

document
.getElementById("searchInput")
.addEventListener("keyup",search);

function search(e){

    if(e.key==="Enter"){

        console.log(e.target.value);

    }

}
