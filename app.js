const UUIDS = {
    HC05_SERVICE: '00001101-0000-1000-8000-00805f9b34fb',
    JDY16_SERVICE: '0000ffe0-0000-1000-8000-00805f9b34fb'
};

let bluetoothDevice;
let smartPathCharacteristic;

// Wrap command sending with haptic feedback
async function handlePress(cmd) {
    if (window.navigator.vibrate) window.navigator.vibrate(50); // Vibrate on press
    await sendCmd(cmd);
}

async function onConnectClick() {
    try {
        updateLog("Searching for SmartPath...");
        bluetoothDevice = await navigator.bluetooth.requestDevice({
            filters: [{ services: [UUIDS.HC05_SERVICE] }, { services: [UUIDS.JDY16_SERVICE] }],
            optionalServices: [UUIDS.HC05_SERVICE, UUIDS.JDY16_SERVICE]
        });

        bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);

        const server = await bluetoothDevice.gatt.connect();
        updateLog("Authenticated. Mapping services...");

        // Try HC-05 then JDY-16
        let service;
        try {
            service = await server.getPrimaryService(UUIDS.HC05_SERVICE);
        } catch (e) {
            service = await server.getPrimaryService(UUIDS.JDY16_SERVICE);
        }

        const characteristics = await service.getCharacteristics();
        smartPathCharacteristic = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);

        if (!smartPathCharacteristic) throw new Error("Hardware Link Failed.");

        // UI Success State
        document.getElementById('status').innerText = "LINK ACTIVE";
        document.getElementById('status').style.color = "#2ed573";
        document.getElementById('controls').style.opacity = "1";
        document.getElementById('controls').style.pointerEvents = "auto";
        updateLog(`Control assigned to ${bluetoothDevice.name}`);

    } catch (error) {
        updateLog("Error: " + error.message);
    }
}

function onDisconnected() {
    document.getElementById('status').innerText = "CONNECTION LOST";
    document.getElementById('status').style.color = "#dc3545";
    document.getElementById('controls').style.opacity = "0.3";
    document.getElementById('controls').style.pointerEvents = "none";
}

async function sendCmd(command) {
    if (!smartPathCharacteristic) return;
    try {
        await smartPathCharacteristic.writeValue(new TextEncoder().encode(command));
    } catch (error) {
        console.error("Command failed");
    }
}

function updateLog(msg) {
    document.getElementById('log').innerText = "LOG: " + msg.toUpperCase();
}

// Service Worker for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
