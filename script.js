// ==========================================
// GearVault
// script.js
// Part 1 / 3
// ==========================================

import {
    getItem,
    addItem,
    updateItem,
    getInventory,
    getRecentScans
} from "./supabase.js";

// ==========================================
// Shortcuts
// ==========================================

const $ = id => document.getElementById(id);

// ==========================================
// DOM Elements
// ==========================================

const barcodeInput = $("barcodeInput");
const scanBtn      = $("scanBtn");
const saveBtn      = $("saveBtn");
const cameraBtn    = $("cameraBtn");

// Dashboard

const totalItems     = $("totalItems");
const availableItems = $("availableItems");
const missingItems   = $("missingItems");

// Inputs

const itemName     = $("itemName");
const itemBarcode  = $("itemBarcode");
const itemCase     = $("itemCase");
const itemLocation = $("itemLocation");
const itemQty      = $("itemQty");

// NEW INPUT (change Quantity label to Have in HTML)
const itemHave     = $("itemHave");

// Recent Table

const recentTable = $("recentTable");

// ==========================================

let currentItem = null;

// ==========================================
// Startup
// ==========================================

window.addEventListener("load", async ()=>{

    await refreshDashboard();

    await refreshRecent();

    barcodeInput.focus();

});

// ==========================================
// Events
// ==========================================

scanBtn.addEventListener("click", searchBarcode);

barcodeInput.addEventListener("keydown",(e)=>{

    if(e.key==="Enter"){

        e.preventDefault();

        searchBarcode();

    }

});

// Save button

saveBtn.addEventListener("click", saveItem);

// Camera button (Part 3)

cameraBtn.addEventListener("click", startCameraScanner);

// ==========================================
// Search Barcode
// ==========================================

async function searchBarcode(){

    const barcode = barcodeInput.value.trim();

    if(barcode===""){

        alert("Scan a barcode first.");

        return;

    }

    const item = await getItem(barcode);

    // ----------------------------
    // FOUND
    // ----------------------------

    if(item){

        currentItem = item;

        fillForm(item);

        await updateItem(item.id,{

            ...item,

            last_scan:new Date().toISOString()

        });

        await refreshDashboard();

        await refreshRecent();

        barcodeInput.select();

        return;

    }

    // ----------------------------
    // NOT FOUND
    // ----------------------------

    currentItem = null;

    clearForm();

    itemBarcode.value = barcode;

    itemHave.value = 1;

    alert("Item not found.\nEnter the details then press SAVE.");

}

// ==========================================
// Fill Form
// ==========================================

function fillForm(item){

    itemName.value = item.name ?? "";

    itemBarcode.value = item.barcode ?? "";

    itemCase.value = item.case ?? "";

    itemLocation.value = item.location ?? "";

    itemQty.value = item.quantity ?? 1;

    itemHave.value = item.have ?? 0;

}

// ==========================================
// Clear Form
// ==========================================

function clearForm(){

    itemName.value = "";

    itemBarcode.value = "";

    itemCase.value = "";

    itemLocation.value = "";

    itemQty.value = 1;

    itemHave.value = 0;

}

// ==========================================
// Status Helper
// ==========================================

function getStatus(quantity,have){

    quantity = Number(quantity);

    have = Number(have);

    if(have === quantity){

        return "Complete";

    }

    if(have < quantity){

        return `Missing ${quantity-have}`;

    }

    return `Over +${have-quantity}`;

}

// ==========================================
// Part 2
// Save + Dashboard + Recent Scans
// ==========================================

// ------------------------------------------
// Save Item
// ------------------------------------------

async function saveItem(){

    const item={

        barcode:Number(itemBarcode.value),

        name:itemName.value.trim(),

        case:itemCase.value.trim(),

        location:itemLocation.value.trim(),

        quantity:Number(itemQty.value),

        have:Number(itemHave.value),

        last_scan:new Date().toISOString()

    };

    // Basic validation

    if(item.name===""){

        alert("Please enter an item name.");

        return;

    }

    if(item.barcode===""){

        alert("Please scan a barcode.");

        return;

    }

    if(item.quantity<0){

        alert("Quantity cannot be negative.");

        return;

    }

    if(item.have<0){

        alert("Have cannot be negative.");

        return;

    }

    // -----------------------------
    // Existing Item
    // -----------------------------

    if(currentItem){

        await updateItem(currentItem.id,item);

    }

    // -----------------------------
    // New Item
    // -----------------------------

    else{

        await addItem(item);

    }

    alert("Saved Successfully");

    currentItem=null;

    barcodeInput.value="";

    clearForm();

    barcodeInput.focus();

    await refreshDashboard();

    await refreshRecent();

}

// ------------------------------------------
// Dashboard
// ------------------------------------------

async function refreshDashboard(){

    const items=await getInventory();

    totalItems.textContent=items.length;

    let complete=0;

    let missing=0;

    items.forEach(item=>{

        if(Number(item.have)==Number(item.quantity)){

            complete++;

        }

        else{

            missing++;

        }

    });

    availableItems.textContent=complete;

    missingItems.textContent=missing;

}

// ------------------------------------------
// Recent Scans
// ------------------------------------------

async function refreshRecent(){

    const items=await getRecentScans();

    recentTable.innerHTML="";

    items.forEach(item=>{

        let badge="🟢";

        let status="Complete";

        if(Number(item.have)<Number(item.quantity)){

            badge="🔴";

            status=`Missing ${item.quantity-item.have}`;

        }

        if(Number(item.have)>Number(item.quantity)){

            badge="🟠";

            status=`Over +${item.have-item.quantity}`;

        }

        recentTable.innerHTML+=`

        <tr>

            <td>

                ${
                    item.last_scan
                    ? new Date(item.last_scan).toLocaleString()
                    : "-"
                }

            </td>

            <td>${item.name}</td>

            <td>${item.barcode}</td>

            <td>${item.have}/${item.quantity}</td>

            <td>${badge} ${status}</td>

        </tr>

        `;

    });

}

// ==========================================
// End of Part 2
// ==========================================

// ==========================================
// Part 3
// Camera Scanner
// ==========================================

let scanner;

// ------------------------------------------

async function startCameraScanner(){

    document.getElementById("scannerModal").style.display="flex";

    scanner = new Html5Qrcode("reader");

    try{

        await scanner.start(

            {

                facingMode:"environment"

            },

            {

                fps:10,

                qrbox:250

            },

            onScanSuccess

        );

    }

    catch(err){

        alert("Unable to access camera.");

        console.error(err);

    }

}

// ------------------------------------------

async function onScanSuccess(code){

    barcodeInput.value=code;

    await stopScanner();

    searchBarcode();

}

// ------------------------------------------

async function stopScanner(){

    if(scanner){

        try{

            await scanner.stop();

            await scanner.clear();

        }

        catch(e){}

    }

    document.getElementById("scannerModal").style.display="none";

}

// ------------------------------------------

document
.getElementById("closeScanner")
.onclick=stopScanner;

// ==========================================
// USB Barcode Scanner
// ==========================================

let buffer="";

let timer;

document.addEventListener("keydown",(e)=>{

    if(e.key==="Enter"){

        if(buffer.length>2){

            barcodeInput.value=buffer;

            buffer="";

            searchBarcode();

        }

        return;

    }

    if(e.key.length===1){

        buffer+=e.key;

    }

    clearTimeout(timer);

    timer=setTimeout(()=>{

        buffer="";

    },80);

});

// ==========================================
// End of script.js
// ==========================================
