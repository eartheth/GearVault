// ==========================================
// GearVault
// script.js
// ==========================================

import {
    getItem,
    addItem,
    updateItem,
    getInventory,
    getRecentScans,
    touchItem,
    markFound,
    markMissing
} from "./supabase.js";

// --------------------------
// DOM
// --------------------------

const barcodeInput = document.getElementById("barcodeInput");

const scanBtn = document.getElementById("scanBtn");

const saveBtn = document.getElementById("saveBtn");

const foundBtn = document.getElementById("foundBtn");

const missingBtn = document.getElementById("missingBtn");

const totalItems = document.getElementById("totalItems");

const availableItems = document.getElementById("availableItems");

const missingItems = document.getElementById("missingItems");

const recentTable = document.getElementById("recentTable");

const itemName = document.getElementById("itemName");

const itemBarcode = document.getElementById("itemBarcode");

const itemCategory = document.getElementById("itemCategory");

const itemCase = document.getElementById("itemCase");

const itemLocation = document.getElementById("itemLocation");

const itemQty = document.getElementById("itemQty");

// --------------------------

let currentItem = null;

// ==========================================
// Startup
// ==========================================

loadDashboard();

loadRecent();

// ==========================================
// Barcode Scan
// ==========================================

scanBtn.onclick = searchBarcode;

barcodeInput.addEventListener("keypress", e=>{

    if(e.key==="Enter"){

        searchBarcode();

    }

});

// ==========================================

async function searchBarcode(){

    const code = barcodeInput.value.trim();

    if(code==="") return;

    const item = await getItem(code);

    if(item){

        currentItem=item;

        fillForm(item);

        await touchItem(item.id);

        loadRecent();

        alert("Item Found");

    }

    else{

        currentItem=null;

        clearForm();

        itemBarcode.value=code;

        alert("Item not found.\nFill in details then press Save.");

    }

}

// ==========================================

function fillForm(item){

    itemName.value=item.name;

    itemBarcode.value=item.barcode;

    itemCategory.value=item.category;

    itemCase.value=item.case_name;

    itemLocation.value=item.location;

    itemQty.value=item.quantity;

}

// ==========================================

function clearForm(){

    itemName.value="";

    itemCategory.value="";

    itemCase.value="";

    itemLocation.value="";

    itemQty.value=1;

}

// ==========================================
// Save
// ==========================================

saveBtn.onclick=async()=>{

    const item={

        barcode:itemBarcode.value,

        name:itemName.value,

        category:itemCategory.value,

        case_name:itemCase.value,

        location:itemLocation.value,

        quantity:Number(itemQty.value),

        status:"Available",

        last_scan:new Date().toISOString()

    };

    if(currentItem){

        await updateItem(currentItem.id,item);

        alert("Updated!");

    }

    else{

        await addItem(item);

        alert("Added!");

    }

    currentItem=null;

    barcodeInput.value="";

    clearForm();

    loadDashboard();

    loadRecent();

};

// ==========================================
// Found
// ==========================================

foundBtn.onclick=async()=>{

    if(!currentItem){

        alert("Search an item first.");

        return;

    }

    await markFound(currentItem.id);

    loadDashboard();

    loadRecent();

    alert("Marked Available.");

};

// ==========================================
// Missing
// ==========================================

missingBtn.onclick=async()=>{

    if(!currentItem){

        alert("Search an item first.");

        return;

    }

    await markMissing(currentItem.id);

    loadDashboard();

    loadRecent();

    alert("Marked Missing.");

};

// ==========================================
// Dashboard
// ==========================================

async function loadDashboard(){

    const items=await getInventory();

    totalItems.textContent=items.length;

    availableItems.textContent=

    items.filter(i=>i.status==="Available").length;

    missingItems.textContent=

    items.filter(i=>i.status==="Missing").length;

}

// ==========================================
// Recent Table
// ==========================================

async function loadRecent(){

    const scans=await getRecentScans();

    recentTable.innerHTML="";

    scans.forEach(item=>{

        recentTable.innerHTML+=`

        <tr>

            <td>

            ${new Date(item.last_scan).toLocaleString()}

            </td>

            <td>${item.name}</td>

            <td>${item.barcode}</td>

            <td>${item.status}</td>

        </tr>

        `;

    });

}

// ==========================================
// Camera Scanner Placeholder
// ==========================================

document
.getElementById("cameraBtn")
.onclick=()=>{

    alert(
`Camera scanning will be added next.

Recommended library:

html5-qrcode

It works directly inside your browser
and updates the barcodeInput automatically.`
    );

};
