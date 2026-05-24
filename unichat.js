// ==============================
// FIREBASE IMPORTS
// ==============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth, createUserWithEmailAndPassword,
    signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore, collection, addDoc, onSnapshot,
    query, orderBy, serverTimestamp, doc, setDoc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==============================
// FIREBASE CONFIG
// ==============================
const firebaseConfig = {
  apiKey: "AIzaSyDdVR0x17NB3ma4ulyL-Jdv3rukfNijwgs",
  authDomain: "unichat-v1.firebaseapp.com",
  projectId: "unichat-v1",
  storageBucket: "unichat-v1.firebasestorage.app",
  messagingSenderId: "1014572806433",
  appId: "1:1014572806433:web:d496a60f3011993217ce60"
};
// ==============================
// INITIALIZE
// ==============================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==============================
// GLOBAL VARIABLES
// ==============================
// ==============================
// LOAD USERS
// ==============================
function loadUsers() {
    const usersRef = collection(db, "users");

    onSnapshot(usersRef, (snapshot) => {
        const userList = document.querySelector(".user-list");

        // Clear old list
        userList.innerHTML = "";

        snapshot.forEach((docSnap) => {
            const user = docSnap.data();

            // Don't show yourself
            if (user.email === currentUser.email) return;

            const userDiv = document.createElement("div");
            userDiv.className = "user";

            userDiv.onclick = () => {
                switchUser(user);
            };

            userDiv.innerHTML = `
                <div class="avatar">
                    ${user.name.charAt(0).toUpperCase()}
                    <span class="status-indicator online"></span>
                </div>

                <div class="user-info">
                    <h4>${user.name}</h4>
                    <p>${user.email}</p>
                </div>
            `;

            userList.appendChild(userDiv);
        });
    });
}

let currentUser = {
    name: "User",
    email: "",
    bio: "Hey there! I am using Unichat.",
    isOnline: true,
    darkMode: false,
    profilePic: ""
};

let mediaRecorder;
let audioChunks = [];
let activeChatUser = null;
let blockedUsers = [];

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
    document.getElementById("dashboard").style.display = "flex";
    applyUserSettings();
    loadUsers();
}

function applyUserSettings() {
    document.getElementById("menuUserName").textContent = currentUser.name;
    const menuAvatar = document.getElementById("menuAvatar");
    menuAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
    
    if (currentUser.profilePic) {
        menuAvatar.style.backgroundImage = `url(${currentUser.profilePic})`;
        menuAvatar.style.backgroundSize = "cover";
    }
    
    const statusEl = document.getElementById("menuUserStatus");
    statusEl.textContent = currentUser.isOnline ? "● Online" : "○ Offline";
    statusEl.style.color = currentUser.isOnline ? "#55efc4" : "#95a5a6";
    
    if (currentUser.darkMode) {
        document.body.classList.add("dark-mode");
        document.getElementById("darkModeToggle").classList.add("active");
    } else {
        document.body.classList.remove("dark-mode");
        document.getElementById("darkModeToggle").classList.remove("active");
    }
    
    if (currentUser.isOnline) {
        document.getElementById("statusToggle").classList.add("active");
    } else {
        document.getElementById("statusToggle").classList.remove("active");
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
document.getElementById("signupFormElement").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("signupConfirmPassword").value;
    
    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }
    
    if (password.length < 6) {
        alert("Password must be at least 6 characters!");
        return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        currentUser.name = name;
        currentUser.email = email;
        
        await setDoc(doc(db, "users", email), {
            name: name,
            email: email,
            bio: currentUser.bio,
            isOnline: true,
            profilePic: ""
        });
        
        saveCurrentState();
        alert("Account created!");
        showDashboardLoggedIn();
        
    } catch (error) {
        alert(error.message);
    }
});

// ==============================
// LOGIN
// ==============================
document.getElementById("signinFormElement").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = document.getElementById("signinEmail").value.trim();
    const password = document.getElementById("signinPassword").value;
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        const userDoc = await getDoc(doc(db, "users", email));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            currentUser.name = userData.name;
            currentUser.bio = userData.bio || currentUser.bio;
            currentUser.email = email;
            currentUser.isOnline = userData.isOnline;
        }
        
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
        document.querySelector(".auth-container").classList.remove("hidden");
    } catch (error) {
        alert(error.message);
    }
}
window.logout = logout;

// ==============================
// MENU
// ==============================
function toggleMenu() {
    const menu = document.getElementById("mainDropdown");
    menu.style.display = menu.style.display === "block" ? "none" : "block";
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
// SETTINGS TOGGLES
// ==============================
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    currentUser.darkMode = document.body.classList.contains("dark-mode");
    document.getElementById("darkModeToggle").classList.toggle("active");
    saveCurrentState();
}
window.toggleDarkMode = toggleDarkMode;

function toggleMyStatus() {
    currentUser.isOnline = !currentUser.isOnline;
    document.getElementById("statusToggle").classList.toggle("active");
    
    const statusEl = document.getElementById("menuUserStatus");
    statusEl.textContent = currentUser.isOnline ? "● Online" : "○ Offline";
    statusEl.style.color = currentUser.isOnline ? "#55efc4" : "#95a5a6";
    
    document.getElementById("chatHeaderStatus").className = "status-indicator " + (currentUser.isOnline ? "online" : "offline");
    document.getElementById("chatHeaderStatusText").textContent = currentUser.isOnline ? "Active Now" : "Offline";
    
    saveCurrentState();
}
window.toggleMyStatus = toggleMyStatus;

// ==============================
// CHAT FUNCTIONS
// ==============================
// ==============================
// SWITCH USER
// ==============================
function switchUser(user) {

    activeChatUser = user;

    document.querySelector(".chat-header h3").textContent = user.name;

    document.getElementById("profileName").textContent = user.name;

    document.getElementById("profileBio").textContent =
        user.bio || "Hey there! I am using Unichat.";

    document.getElementById("chatMessages").innerHTML = "";

    loadMessages();
}

window.switchUser = switchUser;

// ==============================
// CHAT ROOM ID
// ==============================
function getChatRoomId(user1, user2) {

    return [user1.email, user2.email]
        .sort()
        .join("_");
}

// ==============================
// SEND MESSAGE
// ==============================
f// ==============================
// SEND MESSAGE
// ==============================
async function sendMessage() {

    const input = document.getElementById("messageInput");

    const text = input.value.trim();

    if (!text || !activeChatUser) return;

    const roomId = getChatRoomId(
        currentUser,
        activeChatUser
    );

    try {

        await addDoc(
            collection(db, "chats", roomId, "messages"),
            {
                text: text,
                sender: currentUser.email,
                receiver: activeChatUser.email,
                createdAt: serverTimestamp()
            }
        );

        input.value = "";

    } catch (error) {

        console.error(error);

    }
}

window.sendMessage = sendMessage;

// ==============================
// LOAD MESSAGES
// ==============================
function loadMessages() {

    const roomId = getChatRoomId(
        currentUser,
        activeChatUser
    );

    const messagesRef = query(
        collection(db, "chats", roomId, "messages"),
        orderBy("createdAt", "asc")
    );

    onSnapshot(messagesRef, (snapshot) => {

        const chatBox =
            document.getElementById("chatMessages");

        chatBox.innerHTML = "";

        snapshot.forEach((doc) => {

            const msg = doc.data();

            const div = document.createElement("div");

            div.className =
                msg.sender === currentUser.email
                    ? "message sent"
                    : "message received";

            div.innerHTML = `
                <div class="message-content">
                    ${msg.text}
                </div>
            `;

            chatBox.appendChild(div);
        });

        chatBox.scrollTop = chatBox.scrollHeight;
    });
}

function addMessageToUI(text, type) {
    const container = document.getElementById("chatMessages");
    const div = document.createElement("div");
    div.className = "message " + type;
    div.innerHTML = `
        <div class="message-content">${text}</div>
        <div class="timestamp">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function handleKeyPress(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
}
window.handleKeyPress = handleKeyPress;

// ==============================
// EMOJI PICKER
// ==============================
function toggleEmojiPicker() {
    document.getElementById("emojiPicker").classList.toggle("active");
}
window.toggleEmojiPicker = toggleEmojiPicker;

function showEmojiTab(tab) {
    const content = document.getElementById("emojiContent");
    const emojis = [
        "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣",
        "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰",
        "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪",
        "😝", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐",
        "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌",
        "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢",
        "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠",
        "🥳", "😎", "🤓", "🧐", "😕", "😟", "🙁", "☹️"
    ];
    
    if (tab === "emoji") {
        content.innerHTML = '<div class="emoji-grid">' +
            emojis.map(e => `<div class="emoji-item" onclick="addEmoji('${e}')">${e}</div>`).join('') +
            '</div>';
    } else {
        content.innerHTML = '<p style="text-align:center;padding:20px;">GIF search coming soon!</p>';
    }
}

function addEmoji(emoji) {
    const input = document.getElementById("messageInput");
    input.value += emoji;
    document.getElementById("emojiPicker").classList.remove("active");
}
window.addEmoji = addEmoji;
window.showEmojiTab = showEmojiTab;

// Initialize emojis
showEmojiTab("emoji");

// ==============================
// VOICE RECORDING
// ==============================
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = e => {
            audioChunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: "audio/webm" });
            const url = URL.createObjectURL(blob);
            
            const container = document.getElementById("chatMessages");
            const div = document.createElement("div");
            div.className = "message sent";
            div.innerHTML = `<audio controls src="${url}" style="width:200px;"></audio>`;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        };
        
        mediaRecorder.start();
    } catch (error) {
        alert("Microphone permission denied");
    }
}
window.startRecording = startRecording;

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }
}
window.stopRecording = stopRecording;

// ==============================
// IMAGE SEND
// ==============================
function sendImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const container = document.getElementById("chatMessages");
            const div = document.createElement("div");
            div.className = "message sent";
            div.innerHTML = `<img src="${e.target.result}" style="max-width:200px;border-radius:10px;">`;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        };
        reader.readAsDataURL(input.files[0]);
    }
}
window.sendImage = sendImage;

// ==============================
// CALLS
// ==============================
function startAudioCall() {
    alert("Audio Call Started (Feature coming soon)");
}
window.startAudioCall = startAudioCall;

function startVideoCall() {
    alert("Video Call Started (Feature coming soon)");
}
window.startVideoCall = startVideoCall;

// ==============================
// RIGHT SIDEBAR
// ==============================
function toggleRightSidebar() {
    document.getElementById("rightSidebar").classList.toggle("active");
}
window.toggleRightSidebar = toggleRightSidebar;

function openSidebarEditProfile() {
    document.getElementById("rightSidebar").classList.add("active");
    document.getElementById("sidebarViewMode").style.display = "none";
    document.getElementById("sidebarEditMode").style.display = "block";
    
    document.getElementById("editSidebarName").value = currentUser.name;
    document.getElementById("editSidebarBio").value = currentUser.bio;
}
window.openSidebarEditProfile = openSidebarEditProfile;

function closeSidebarEditMode() {
    document.getElementById("sidebarViewMode").style.display = "block";
    document.getElementById("sidebarEditMode").style.display = "none";
    document.getElementById("rightSidebar").classList.remove("active");
}
window.closeSidebarEditMode = closeSidebarEditMode;

function saveSidebarProfile() {
    currentUser.name = document.getElementById("editSidebarName").value;
    currentUser.bio = document.getElementById("editSidebarBio").value;
    
    saveCurrentState();
    applyUserSettings();
    alert("Profile updated!");
    closeSidebarEditMode();
}
window.saveSidebarProfile = saveSidebarProfile;

function previewProfilePic(event) {
    if (event.target.files && event.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const avatar = document.getElementById("editProfileAvatar");
            avatar.textContent = "";
            avatar.style.backgroundImage = `url(${e.target.result})`;
            avatar.style.backgroundSize = "cover";
            currentUser.profilePic = e.target.result;
        };
        reader.readAsDataURL(event.target.files[0]);
    }
}
window.previewProfilePic = previewProfilePic;

// ==============================
// BLOCK USER
// ==============================

// ==============================
// BLOCK USER
// ==============================
// ==============================
// BLOCK USER - FIXED!
// ==============================
function toggleBlockUser() {
    const blockBtn = document.getElementById("blockBtn");
    
    if (blockedUsers.includes(activeChatUser)) {
        // Unblock
        blockedUsers = blockedUsers.filter(u => u !== activeChatUser);
        blockBtn.innerHTML = '<i class="fas fa-ban"></i> Block User';
        blockBtn.style.background = "#e74c3c";
        alert("User unblocked!");
    } else {
        // Block
        blockedUsers.push(activeChatUser);
        blockBtn.innerHTML = '<i class="fas fa-check"></i> Unblock User';
        blockBtn.style.background = "#27ae60";
        alert("User blocked!");
    }
}
window.toggleBlockUser = toggleBlockUser;

// ==============================
// CREATE GROUP
// ==============================
function createGroup() {
    const groupName = prompt("Enter group name:");
    if (groupName) {
        const userList = document.getElementById("userList");
        const newUser = document.createElement("div");
        newUser.className = "user";
        newUser.onclick = function() { switchUser(groupName); };
        newUser.innerHTML = `
            <div class="avatar-container">
                <div class="avatar" style="background:#e74c3c;">${groupName.charAt(0)}</div>
            </div>
            <div class="user-info">
                <h4>${groupName}</h4>
                <p>Group Chat</p>
            </div>
        `;
        userList.appendChild(newUser);
        alert("Group created: " + groupName);
    }
}
window.createGroup = createGroup;

// ==============================
// FILTER CHAT
// ==============================
function filterChat(searchText) {
    const users = document.querySelectorAll(".user");
    users.forEach(user => {
        const name = user.querySelector("h4").textContent.toLowerCase();
        if (name.includes(searchText.toLowerCase())) {
            user.style.display = "flex";
        } else {
            user.style.display = "none";
        }
    });
}
window.filterChat = filterChat;

// ==============================
// INIT
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    applyUserSettings();
    
    // Close menus when clicking outside
    document.addEventListener("click", (e) => {
        const menu = document.querySelector(".menu-header");
        if (menu && !menu.contains(e.target)) {
            document.getElementById("mainDropdown").style.display = "none";
            document.getElementById("settingsDropdown").style.display = "none";
        }
    });
});