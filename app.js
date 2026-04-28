const UUIDS = {
    // Standard Serial Port Profile (SPP) UUID
    HC05_SERVICE: '00001101-0000-1000-8000-00805f9b34fb',
    // Common JDY/BLE Service
    JDY16_SERVICE: '0000ffe0-0000-1000-8000-00805f9b34fb'
};

let bluetoothDevice;
let smartPathCharacteristic;

// This function MUST be triggered by a button click
async function onConnectClick() {
    try {
        updateLog("Requesting Bluetooth Scan...");
        
        // Broadening filters to find more devices
        bluetoothDevice = await navigator.bluetooth.requestDevice({
            // acceptAllDevices: true, // Optional: Use this if filters fail
            filters: [
                { services: [UUIDS.HC05_SERVICE] },
                { services: [UUIDS.JDY16_SERVICE] }
            ],
            optionalServices: [UUIDS.HC05_SERVICE, UUIDS.JDY16_SERVICE]
        });

        updateLog("Device Selected. Connecting...");
        bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);
        
        const server = await bluetoothDevice.gatt.connect();
        updateLog("GATT Connected. Finding Service...");

        let service;
        try {
            service = await server.getPrimaryService(UUIDS.HC05_SERVICE);
        } catch (e) {
            service = await server.getPrimaryService(UUIDS.JDY16_SERVICE);
        }

        const characteristics = await service.getCharacteristics();
        // Automatically find the characteristic that allows writing
        smartPathCharacteristic = characteristics.find(c => 
            c.properties.write || c.properties.writeWithoutResponse
        );

        if (!smartPathCharacteristic) throw new Error("No write path found.");

        // UI Updates
        document.getElementById('status').innerText = "LINK ACTIVE";
        document.getElementById('status').style.color = "#2ed573";
        document.getElementById('controls').style.opacity = "1";
        document.getElementById('controls').style.pointerEvents = "auto";
        updateLog("System Ready!");

    } catch (error) {
        updateLog("System Error: " + error.message);
        console.log(error);
    }
}

async function handlePress(cmd) {
    if (window.navigator.vibrate) window.navigator.vibrate(50);
    await sendCmd(cmd);
}

async function sendCmd(command) {
    if (!smartPathCharacteristic) return;
    try {
        const data = new TextEncoder().encode(command);
        await smartPathCharacteristic.writeValue(data);
    } catch (error) {
        console.error("Send failed");
    }
}

function onDisconnected() {
    document.getElementById('status').innerText = "LINK LOST";
    document.getElementById('status').style.color = "#dc3545";
    document.getElementById('controls').style.opacity = "0.3";
    document.getElementById('controls').style.pointerEvents = "none";
}

function updateLog(msg) {
    document.getElementById('log').innerText = "CONSOLE: " + msg.toUpperCase();
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
