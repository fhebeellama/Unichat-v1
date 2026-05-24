// ==============================
// FIREBASE IMPORTS
// ==============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==============================
// FIREBASE CONFIG
// ==============================
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "unichat-v1.firebaseapp.com",
    projectId: "unichat-v1",
    storageBucket: "unichat-v1.appspot.com",
    messagingSenderId: "1014572806433",
    appId: "1:1014572806433:web:d496a60f3011993217ce60"
};

// ==============================
// INITIALIZE FIREBASE
// ==============================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==============================
// GLOBAL VARIABLES
// ==============================
let currentUser = {
    name: "User",
    username: "user123",
    bio: "Hey there! I am using Unichat.",
    isOnline: true,
    darkMode: false,
    profilePic: ""
};

let mediaRecorder;
let audioChunks = [];

// ==============================
// LOCAL STORAGE
// ==============================
function saveCurrentState() {
    localStorage.setItem("unichatUser", JSON.stringify(currentUser));
}

function loadSavedState() {
    const saved = localStorage.getItem("unichatUser");

    if (saved) {
        currentUser = JSON.parse(saved);
        return true;
    }

    return false;
}

function clearSession() {
    localStorage.removeItem("unichatUser");
}

// ==============================
// SPLASH SCREEN
// ==============================
function startApp() {
    const splash = document.getElementById("splashScreen");

    if (splash) {
        splash.style.display = "none";
    }

    if (loadSavedState()) {
        showDashboardLoggedIn();
    } else {
        document.querySelector(".auth-container").classList.remove("hidden");
    }
}

window.startApp = startApp;

// ==============================
// DASHBOARD
// ==============================
function showDashboardLoggedIn() {
    document.querySelector(".auth-container").classList.add("hidden");

    const dashboard = document.getElementById("dashboard");

    dashboard.style.display = "flex";

    applyUserSettings();
}

function applyUserSettings() {
    document.getElementById("menuUserName").textContent = currentUser.name;

    const avatar = document.getElementById("menuAvatar");

    avatar.textContent = currentUser.name.charAt(0).toUpperCase();

    if (currentUser.profilePic) {
        avatar.style.backgroundImage = `url(${currentUser.profilePic})`;
        avatar.style.backgroundSize = "cover";
    }

    updateProfileView();

    if (currentUser.darkMode) {
        document.body.classList.add("dark-mode");
        document.getElementById("darkModeToggle").classList.add("active");
    }
}

// ==============================
// AUTH SWITCH
// ==============================
document.getElementById("showSignin").addEventListener("click", (e) => {
    e.preventDefault();

    document.getElementById("signupForm").classList.add("hidden");
    document.getElementById("signinForm").classList.remove("hidden");
});

document.getElementById("showSignup").addEventListener("click", (e) => {
    e.preventDefault();

    document.getElementById("signinForm").classList.add("hidden");
    document.getElementById("signupForm").classList.remove("hidden");
});

// ==============================
// SIGNUP
// ==============================
document.getElementById("signupFormElement")
.addEventListener("submit", async (e) => {

    e.preventDefault();

    const name = document.getElementById("signupName").value.trim();
    const username = document.getElementById("signupUsername").value.trim();
    const email = document.getElementById("signupGmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("signupConfirmPassword").value;

    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    try {
        await createUserWithEmailAndPassword(auth, email, password);

        currentUser.name = name;
        currentUser.username = username;

        saveCurrentState();

        alert("Account created!");

        document.getElementById("signupForm").classList.add("hidden");
        document.getElementById("signinForm").classList.remove("hidden");

    } catch (error) {
        alert(error.message);
    }
});

// ==============================
// LOGIN
// ==============================
document.getElementById("signinFormElement")
.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email = document.getElementById("signinUsername").value;
    const password = document.getElementById("signinPassword").value;

    try {
        const userCredential =
            await signInWithEmailAndPassword(auth, email, password);

        currentUser.name = userCredential.user.email;
        currentUser.username = userCredential.user.email;

        saveCurrentState();

        showDashboardLoggedIn();

    } catch (error) {
        alert(error.message);
    }
});

// ==============================
// LOGOUT
// ==============================
async function logout() {
    try {
        await signOut(auth);

        clearSession();

        document.getElementById("dashboard").style.display = "none";

        document.querySelector(".auth-container")
            .classList.remove("hidden");

    } catch (error) {
        alert(error.message);
    }
}

window.logout = logout;

// ==============================
// FIRESTORE REALTIME CHAT
// ==============================
const messagesContainer = document.querySelector(".chat-messages");

const q = query(
    collection(db, "messages"),
    orderBy("createdAt", "asc")
);

onSnapshot(q, (snapshot) => {

    messagesContainer.innerHTML = "";

    snapshot.forEach((doc) => {

        const data = doc.data();

        const type =
            data.sender === currentUser.name
                ? "sent"
                : "received";

        addMessageToUI(data.text, type);
    });

    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
});

// ==============================
// SEND MESSAGE
// ==============================
async function sendMessage() {

    const input = document.getElementById("messageInput");

    const text = input.value.trim();

    if (!text) return;

    try {

        await addDoc(collection(db, "messages"), {
            text,
            sender: currentUser.name,
            createdAt: serverTimestamp()
        });

        input.value = "";

    } catch (error) {
        alert("Failed to send message");
    }
}

window.sendMessage = sendMessage;

// ==============================
// ADD MESSAGE UI
// ==============================
function addMessageToUI(text, type) {

    const div = document.createElement("div");

    div.className = `message ${type}`;

    div.innerHTML = `
        <div class="message-content">${text}</div>
        <div class="timestamp">
            ${new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            })}
        </div>
    `;

    messagesContainer.appendChild(div);
}

// ==============================
// ENTER KEY
// ==============================
function handleKeyPress(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
}

window.handleKeyPress = handleKeyPress;

// ==============================
// MENU
// ==============================
function toggleMenu() {
    const menu = document.getElementById("mainDropdown");

    menu.style.display =
        menu.style.display === "block"
            ? "none"
            : "block";
}

window.toggleMenu = toggleMenu;

function showSettings() {
    document.getElementById("mainDropdown").style.display = "none";
    document.getElementById("settingsDropdown").style.display = "block";
}

window.showSettings = showSettings;

function showMainMenu() {
    document.getElementById("settingsDropdown").style.display = "none";
    document.getElementById("mainDropdown").style.display = "block";
}

window.showMainMenu = showMainMenu;

// ==============================
// DARK MODE
// ==============================
function toggleDarkMode() {

    document.body.classList.toggle("dark-mode");

    const enabled =
        document.body.classList.contains("dark-mode");

    currentUser.darkMode = enabled;

    document.getElementById("darkModeToggle")
        .classList.toggle("active");

    saveCurrentState();
}

window.toggleDarkMode = toggleDarkMode;

// ==============================
// RIGHT SIDEBAR
// ==============================
function toggleRightSidebar() {
    document.getElementById("rightSidebar")
        .classList.toggle("active");
}

window.toggleRightSidebar = toggleRightSidebar;

// ==============================
// PROFILE
// ==============================
function updateProfileView() {

    document.getElementById("profileName")
        .textContent = currentUser.name;

    document.getElementById("profileBio")
        .textContent = currentUser.bio;

    const avatar =
        document.getElementById("profileAvatar");

    avatar.textContent =
        currentUser.name.charAt(0).toUpperCase();

    if (currentUser.profilePic) {
        avatar.style.backgroundImage =
            `url(${currentUser.profilePic})`;

        avatar.style.backgroundSize = "cover";
    }
}

// ==============================
// EDIT PROFILE
// ==============================
function openSidebarEditProfile() {

    document.getElementById("rightSidebar")
        .classList.add("active");

    document.getElementById("sidebarViewMode")
        .style.display = "none";

    document.getElementById("sidebarEditMode")
        .style.display = "block";

    document.getElementById("editSidebarName")
        .value = currentUser.name;

    document.getElementById("editSidebarUsername")
        .value = currentUser.username;

    document.getElementById("editSidebarBio")
        .value = currentUser.bio;
}

window.openSidebarEditProfile = openSidebarEditProfile;

function closeSidebarEditMode() {

    document.getElementById("sidebarViewMode")
        .style.display = "block";

    document.getElementById("sidebarEditMode")
        .style.display = "none";

    document.getElementById("rightSidebar")
        .classList.remove("active");
}

window.closeSidebarEditMode = closeSidebarEditMode;

function saveSidebarProfile() {

    currentUser.name =
        document.getElementById("editSidebarName").value;

    currentUser.username =
        document.getElementById("editSidebarUsername").value;

    currentUser.bio =
        document.getElementById("editSidebarBio").value;

    saveCurrentState();

    applyUserSettings();

    alert("Profile updated!");

    closeSidebarEditMode();
}

window.saveSidebarProfile = saveSidebarProfile;

// ==============================
// AUDIO RECORDING
// ==============================
async function startRecording() {

    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });

        mediaRecorder =
            new MediaRecorder(stream);

        audioChunks = [];

        mediaRecorder.ondataavailable = e => {
            audioChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {

            const blob =
                new Blob(audioChunks, {
                    type: "audio/webm"
                });

            const url =
                URL.createObjectURL(blob);

            const audio =
                document.createElement("audio");

            audio.controls = true;
            audio.src = url;

            const div =
                document.createElement("div");

            div.className = "message sent";

            div.appendChild(audio);

            messagesContainer.appendChild(div);
        };

        mediaRecorder.start();

    } catch (error) {
        alert("Microphone permission denied");
    }
}

window.startRecording = startRecording;

function stopRecording() {

    if (mediaRecorder &&
        mediaRecorder.state !== "inactive") {

        mediaRecorder.stop();
    }
}

window.stopRecording = stopRecording;

// ==============================
// CALLS
// ==============================
function startAudioCall() {
    alert("Audio Call Started");
}

function startVideoCall() {
    alert("Video Call Started");
}

window.startAudioCall = startAudioCall;
window.startVideoCall = startVideoCall;

// ==============================
// START APP
// ==============================
document.addEventListener("DOMContentLoaded", () => {

    applyUserSettings();

    document.addEventListener("click", (e) => {

        const menu =
            document.querySelector(".menu-header");

        if (menu && !menu.contains(e.target)) {

            document.getElementById("mainDropdown")
                .style.display = "none";

            document.getElementById("settingsDropdown")
                .style.display = "none";
        }
    });
});