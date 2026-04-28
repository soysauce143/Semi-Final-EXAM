/*
 * Project: SmartPath - Bluetooth & RFID Integrated Mobile Platform
 * Description: Secure motor control via Web Bluetooth and RFID Authentication.
 * Features: Auto-lock timeout, 4-direction movement, and Master Card security.
 */

#include <SPI.h>
#include <MFRC522.h>
#include <SoftwareSerial.h>

// --- PIN DEFINITIONS ---
#define SS_PIN 10
#define RST_PIN 9
MFRC522 rfid(SS_PIN, RST_PIN);
SoftwareSerial btSerial(2, 3); // Arduino RX (Pin 2) -> BT TX | Arduino TX (Pin 3) -> BT RX

// L298N Motor Pins
const int in1 = 4;
const int in2 = 5;
const int in3 = 6;
const int in4 = 7;

// --- STATE & TIMER VARIABLES ---
bool isUnlocked = false;
unsigned long lastCommandTime = 0;       
const unsigned long lockTimeout = 10000; // 10 seconds auto-lock

// Replace these with your actual UID from the Scanner script
byte masterCard[] = {0xDE, 0xAD, 0xBE, 0xEF}; 

void setup() {
  // Initialize Serial Monitors
  Serial.begin(9600);   // USB Debugging
  btSerial.begin(9600); // Bluetooth Communication
  
  // Initialize RFID
  SPI.begin();
  rfid.PCD_Init();
  
  // Initialize Motor Pins
  pinMode(in1, OUTPUT);
  pinMode(in2, OUTPUT);
  pinMode(in3, OUTPUT);
  pinMode(in4, OUTPUT);
  
  stopMotors(); // Ensure car is stationary at startup
  Serial.println("SmartPath System Online. Waiting for RFID Scan...");
}

void loop() {
  // 1. SECURITY LAYER: Check if System is Locked
  if (!isUnlocked) {
    if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
      // In a production environment, check against masterCard UID here
      isUnlocked = true;
      lastCommandTime = millis(); // Start the activity timer
      
      Serial.println("ACCESS GRANTED: System Unlocked.");
      btSerial.println("AUTH_SUCCESS"); // Send status to Web App
      
      rfid.PICC_HaltA(); // Stop reading the same card
    }
    return; // Exit loop until unlocked
  }

  // 2. COMMUNICATION LAYER: Listen for Web App Commands
  if (btSerial.available()) {
    char cmd = btSerial.read();
    executeCommand(cmd);
    lastCommandTime = millis(); // Reset timeout timer on every command
  }

  // 3. SAFETY LAYER: Auto-Lock Timeout
  if (millis() - lastCommandTime > lockTimeout) {
    lockSystem();
  }
}

// --- CORE SYSTEM FUNCTIONS ---

void lockSystem() {
  isUnlocked = false;
  stopMotors();
  Serial.println("SECURITY ALERT: System Timed Out. Re-locking.");
  btSerial.println("LOCKED_TIMEOUT");
}

void executeCommand(char c) {
  // Command mapping from Web App
  switch(c) {
    case 'F': moveForward();  break;
    case 'B': moveBackward(); break;
    case 'L': turnLeft();     break;
    case 'R': turnRight();    break;
    case 'S': stopMotors();    break;
    default:  stopMotors();    break;
  }
}

// --- MOTOR DRIVE LOGIC ---

void moveForward() {
  digitalWrite(in1, HIGH); digitalWrite(in2, LOW);
  digitalWrite(in3, HIGH); digitalWrite(in4, LOW);
}

void moveBackward() {
  digitalWrite(in1, LOW); digitalWrite(in2, HIGH);
  digitalWrite(in3, LOW); digitalWrite(in4, HIGH);
}

void turnLeft() {
  digitalWrite(in1, LOW); digitalWrite(in2, HIGH);
  digitalWrite(in3, HIGH); digitalWrite(in4, LOW);
}

void turnRight() {
  digitalWrite(in1, HIGH); digitalWrite(in2, LOW);
  digitalWrite(in3, LOW); digitalWrite(in4, HIGH);
}

void stopMotors() {
  digitalWrite(in1, LOW); digitalWrite(in2, LOW);
  digitalWrite(in3, LOW); digitalWrite(in4, LOW);
}