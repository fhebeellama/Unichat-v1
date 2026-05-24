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
    query, orderBy, serverTimestamp, doc, setDoc, updateDoc, getDoc, where
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
let currentUser = {
    uid: "",
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
let unsubscribeUsers = null;
let unsubscribeMessages = null;

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
    currentUser = {
        uid: "",
        name: "User",
        email: "",
        bio: "Hey there! I am using Unichat.",
        isOnline: true,
        darkMode: false,
        profilePic: ""
    };
}

// ==============================
// SPLASH SCREEN
// ==============================
function startApp() {
    const splash = document.getElementById("splashScreen");
    if (splash) {
        splash.style.display = "none";
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
    if (unsubscribeUsers) unsubscribeUsers();
    loadUsers();
    updateUserStatus(true);
}

function applyUserSettings() {
    document.getElementById("menuUserName").textContent = currentUser.name || "User";
    const menuAvatar = document.getElementById("menuAvatar");
    menuAvatar.textContent = (currentUser.name || "U").charAt(0).toUpperCase();
    
    if (currentUser.profilePic) {
        menuAvatar.style.backgroundImage = `url(${currentUser.profilePic})`;
        menuAvatar.style.backgroundSize = "cover";
    } else {
        menuAvatar.style.backgroundImage = "";
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
// UPDATE USER STATUS IN FIRESTORE
// ==============================
async function updateUserStatus(status) {
    if (!currentUser.email) return;
    try {
        await updateDoc(doc(db, "users", currentUser.email), {
            isOnline: status
        });
    } catch (e) {
        console.log("Status update error:", e);
    }
}

// ==============================
// LOAD USERS
// ==============================
function loadUsers() {
    const usersRef = collection(db, "users");

    unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
        const userList = document.querySelector(".user-list");
        if (!userList) return;

        userList.innerHTML = "";

        snapshot.forEach((docSnap) => {
            const user = docSnap.data();

            if (user.email === currentUser.email) return;

            const userDiv = document.createElement("div");
            userDiv.className = "user";

            userDiv.onclick = () => {
                switchUser(user);
            };

            userDiv.innerHTML = `
                <div class="avatar-container">
                    <div class="avatar" style="background-image: ${user.profilePic ? `url(${user.profilePic})` : 'none'}; background-size:cover;">
                        ${!user.profilePic ? user.name.charAt(0).toUpperCase() : ''}
                    </div>
                    <span class="status-indicator ${user.isOnline ? 'online' : 'offline'}"></span>
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
    const email = document.getElementById("signupEmail").value.trim().toLowerCase();
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
        
        currentUser.uid = userCredential.user.uid;
        currentUser.name = name;
        currentUser.email = email;
        
        await setDoc(doc(db, "users", email), {
            uid: userCredential.user.uid,
            name: name,
            email: email,
            bio: currentUser.bio,
            isOnline: true,
            profilePic: ""
        });
        
        saveCurrentState();
        alert("Account created successfully!");
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
    
    const email = document.getElementById("signinEmail").value.trim().toLowerCase();
    const password = document.getElementById("signinPassword").value;
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        const userDoc = await getDoc(doc(db, "users", email));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            currentUser.uid = userCredential.user.uid;
            currentUser.name = userData.name;
            currentUser.bio = userData.bio || currentUser.bio;
            currentUser.email = email;
            currentUser.isOnline = userData.isOnline;
            currentUser.profilePic = userData.profilePic || "";
            currentUser.darkMode = userData.darkMode || false;
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
        await updateUserStatus(false);
        await signOut(auth);
        clearSession();
        document.getElementById("dashboard").style.display = "none";
        document.querySelector(".auth-container").classList.remove("hidden");
        document.getElementById("signinForm").classList.remove("hidden");
        document.getElementById("signupForm").classList.add("hidden");
        if (unsubscribeUsers) unsubscribeUsers();
        if (unsubscribeMessages) unsubscribeMessages();
        activeChatUser = null;
    } catch (error) {
        alert(error.message);
    }
}
window.logout = logout;

// ==============================
// ✅ FIXED MENU FUNCTIONS
// ==============================
function toggleMenu() {
    const mainMenu = document.getElementById("mainDropdown");
    const settingsMenu = document.getElementById("settingsDropdown");

    // Close settings first
    settingsMenu.classList.add("hidden");

    // Toggle main menu visibility
    mainMenu.classList.toggle("hidden");
}
window.toggleMenu = toggleMenu;

function showSettings() {
    document.getElementById("mainDropdown").classList.add("hidden");
    document.getElementById("settingsDropdown").classList.remove("hidden");
}
window.showSettings = showSettings;

function showMainMenu() {
    document.getElementById("settingsDropdown").classList.add("hidden");
    document.getElementById("mainDropdown").classList.remove("hidden");
}
window.showMainMenu = showMainMenu;

// ==============================
// SETTINGS TOGGLES
// ==============================
async function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    currentUser.darkMode = document.body.classList.contains("dark-mode");
    document.getElementById("darkModeToggle").classList.toggle("active");
    saveCurrentState();
    try {
        await updateDoc(doc(db, "users", currentUser.email), {
            darkMode: currentUser.darkMode
        });
    } catch (e) {}
}
window.toggleDarkMode = toggleDarkMode;

async function toggleMyStatus() {
    currentUser.isOnline = !currentUser.isOnline;
    document.getElementById("statusToggle").classList.toggle("active");
    
    const statusEl = document.getElementById("menuUserStatus");
    statusEl.textContent = currentUser.isOnline ? "● Online" : "○ Offline";
    statusEl.style.color = currentUser.isOnline ? "#55efc4" : "#95a5a6";
    
    if (activeChatUser) {
        document.getElementById("chatHeaderStatus").className = "status-indicator " + (activeChatUser.isOnline ? "online" : "offline");
        document.getElementById("chatHeaderStatusText").textContent = activeChatUser.isOnline ? "Active Now" : "Offline";
    }
    
    saveCurrentState();
    await updateUserStatus(currentUser.isOnline);
}
window.toggleMyStatus = toggleMyStatus;

// ==============================
// SWITCH USER
// ==============================
function switchUser(user) {
    activeChatUser = user;

    document.querySelector(".chat-header h3").textContent = user.name;
    document.getElementById("profileName").textContent = user.name;
    document.getElementById("profileBio").textContent = user.bio || "Hey there! I am using Unichat.";
    
    const chatAvatar = document.getElementById("chatHeaderAvatar");
    chatAvatar.textContent = !user.profilePic ? user.name.charAt(0).toUpperCase() : '';
    chatAvatar.style.backgroundImage = user.profilePic ? `url(${user.profilePic})` : 'none';
    chatAvatar.style.backgroundSize = "cover";

    const profileAvatar = document.getElementById("profileAvatar");
    profileAvatar.textContent = !user.profilePic ? user.name.charAt(0).toUpperCase() : '';
    profileAvatar.style.backgroundImage = user.profilePic ? `url(${user.profilePic})` : 'none';
    profileAvatar.style.backgroundSize = "cover";

    document.getElementById("chatHeaderStatus").className = "status-indicator " + (user.isOnline ? "online" : "offline");
    document.getElementById("chatHeaderStatusText").textContent = user.isOnline ? "Active Now" : "Offline";

    document.getElementById("chatMessages").innerHTML = "";

    loadMessages();
}
window.switchUser = switchUser;

// ==============================
// CHAT ROOM ID
// ==============================
function getChatRoomId(user1, user2) {
    return [user1.email, user2.email].sort().join("_");
}

// ==============================
// ✅ FIXED SEND MESSAGE
// ==============================
async function sendMessage() {
    const input = document.getElementById("messageInput");
    const text = input.value.trim();

    if (!activeChatUser) {
        alert("⚠️ Select a user first!");
        return;
    }
    if (!text) return;

    const roomId = getChatRoomId(currentUser, activeChatUser);

    try {
        await addDoc(collection(db, "chats", roomId, "messages"), {
            text: text,
            sender: currentUser.email,
            receiver: activeChatUser.email,
            createdAt: serverTimestamp()
        });
        input.value = "";
    } catch (err) {
        console.error(err);
        alert("Failed to send message");
    }
}
window.sendMessage = sendMessage;

// ==============================
// ✅ FIXED LOAD MESSAGES
// ==============================
function loadMessages() {
    if (!activeChatUser) return;

    if (unsubscribeMessages) unsubscribeMessages();

    const roomId = getChatRoomId(currentUser, activeChatUser);
    const q = query(
        collection(db, "chats", roomId, "messages"),
        orderBy("createdAt", "asc")
    );

    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        const chatBox = document.getElementById("chatMessages");
        chatBox.innerHTML = "";

        if (snapshot.empty) {
            chatBox.innerHTML = `<p class="no-messages">No messages yet. Say hi!</p>`;
            return;
        }

        snapshot.forEach(docSnap => {
            const msg = docSnap.data();
            const isMine = msg.sender === currentUser.email;

            const msgEl = document.createElement("div");
            msgEl.className = `message ${isMine ? "sent" : "received"}`;
            msgEl.innerHTML = `
                <div class="message-content">${msg.text}</div>
                <span class="timestamp">${msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ""}</span>
            `;
            chatBox.appendChild(msgEl);
        });

        chatBox.scrollTop = chatBox.scrollHeight;
    });
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
    document.getElementById("emojiPicker").classList.toggle("hidden");
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
        content.innerHTML = '<p style="text-align:center;padding:20px;color:var(--text);">GIF coming soon!</p>';
    }
}

function addEmoji(emoji) {
    document.getElementById("messageInput").value += emoji;
    document.getElementById("emojiPicker").classList.add("hidden");
}
window.addEmoji = addEmoji;
window.showEmojiTab = showEmojiTab;

showEmojiTab("emoji");

// ==============================
// VOICE RECORDING
// ==============================
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: "audio/webm" });
            const url = URL.createObjectURL(blob);
            const div = document.createElement("div");
            div.className = "message sent";
            div.innerHTML = `<audio controls src="${url}" style="width:200px;">`;
            document.getElementById("chatMessages").appendChild(div);
            document.getElementById("chatMessages").scrollTop = document.getElementById("chatMessages").scrollHeight;
        };
        mediaRecorder.start();
    } catch { alert("Microphone access denied"); }
}
window.startRecording = startRecording;

function stopRecording() {
    if (mediaRecorder?.state !== "inactive") mediaRecorder.stop();
}
window.stopRecording = stopRecording;

// ==============================
// IMAGE SEND
// ==============================
function sendImage(input) {
    if (input.files?.[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            const div = document.createElement("div");
            div.className = "message sent";
            div.innerHTML = `<img src="${e.target.result}" style="max-width:200px;border-radius:10px;">`;
            const chat = document.getElementById("chatMessages");
            chat.appendChild(div);
            chat.scrollTop = chat.scrollHeight;
        };
        reader.readAsDataURL(input.files[0]);
    }
}
window.sendImage = sendImage;

// ==============================
// CALLS
// ==============================
function startAudioCall() { alert("Audio call coming soon"); }
window.startAudioCall = startAudioCall;
function startVideoCall() { alert("Video call coming soon"); }
window.startVideoCall = startVideoCall;

// ==============================
// RIGHT SIDEBAR
// ==============================
function toggleRightSidebar() {
    const sidebar = document.getElementById("rightSidebar");
    sidebar.classList.toggle("active");
    if (sidebar.classList.contains("active") && activeChatUser) {
        if (activeChatUser.email === currentUser.email) loadMyProfileToSidebar();
        else loadUserProfileToSidebar();
    }
}
window.toggleRightSidebar = toggleRightSidebar;

function loadMyProfileToSidebar() {
    document.getElementById("sidebarViewMode").classList.remove("hidden");
    document.getElementById("sidebarEditMode").classList.add("hidden");
    document.getElementById("profileName").textContent = currentUser.name;
    document.getElementById("profileBio").textContent = currentUser.bio;
    const avatar = document.getElementById("profileAvatar");
    avatar.textContent = currentUser.name.charAt(0).toUpperCase();
    avatar.style.backgroundImage = currentUser.profilePic ? `url(${currentUser.profilePic})` : "";
    document.getElementById("blockBtn").classList.add("hidden");
}

function loadUserProfileToSidebar() {
    document.getElementById("sidebarViewMode").classList.remove("hidden");
    document.getElementById("sidebarEditMode").classList.add("hidden");
    document.getElementById("profileName").textContent = activeChatUser.name;
    document.getElementById("profileBio").textContent = activeChatUser.bio || "Hey there! I am using Unichat.";
    const avatar = document.getElementById("profileAvatar");
    avatar.textContent = activeChatUser.name.charAt(0).toUpperCase();
    avatar.style.backgroundImage = activeChatUser.profilePic ? `url(${activeChatUser.profilePic})` : "";
    document.getElementById("blockBtn").classList.remove("hidden");
}

function openSidebarEditProfile() {
    document.getElementById("sidebarViewMode").classList.add("hidden");
    document.getElementById("sidebarEditMode").classList.remove("hidden");
    document.getElementById("editSidebarName").value = currentUser.name;
    document.getElementById("editSidebarBio").value = currentUser.bio;
}
window.openSidebarEditProfile = openSidebarEditProfile;

function closeSidebarEditMode() {
    document.getElementById("sidebarEditMode").classList.add("hidden");
    document.getElementById("sidebarViewMode").classList.remove("hidden");
}
window.closeSidebarEditMode = closeSidebarEditMode;

function previewProfilePic(e) {
    const reader = new FileReader();
    reader.onload = ev => {
        const av = document.getElementById("editProfileAvatar");
        av.style.backgroundImage = `url(${ev.target.result})`;
        av.textContent = "";
    };
    reader.readAsDataURL(e.target.files[0]);
}
window.previewProfilePic = previewProfilePic;

async function saveSidebarProfile() {
    currentUser.name = document.getElementById("editSidebarName").value.trim() || currentUser.name;
    currentUser.bio = document.getElementById("editSidebarBio").value.trim() || currentUser.bio;
    const pic = document.getElementById("editProfilePic").files[0];
    if (pic) {
        const reader = new FileReader();
        reader.onload = e => {
            currentUser.profilePic = e.target.result;
            updateProfileInFirestore();
        };
        reader.readAsDataURL(pic);
    } else updateProfileInFirestore();
}
window.saveSidebarProfile = saveSidebarProfile;

async function updateProfileInFirestore() {
    try {
        await updateDoc(doc(db, "users", currentUser.email), {
            name: currentUser.name,
            bio: currentUser.bio,
            profilePic: currentUser.profilePic
        });
        saveCurrentState();
        applyUserSettings();
        closeSidebarEditMode();
        alert("Profile updated");
    } catch { alert("Update failed"); }
}

// ==============================
// BLOCK USER
// ==============================
function toggleBlockUser() {
    if (!activeChatUser) return;
    const idx = blockedUsers.indexOf(activeChatUser.email);
    if (idx === -1) {
        blockedUsers.push(activeChatUser.email);
        document.getElementById("blockBtn").innerHTML = `<i class="fas fa-ban"></i> Unblock`;
        alert("User blocked");
    } else {
        blockedUsers.splice(idx, 1);
        document.getElementById("blockBtn").innerHTML = `<i class="fas fa-ban"></i> Block`;
        alert("User unblocked");
    }
}
window.toggleBlockUser = toggleBlockUser;

// ==============================
// SEARCH USERS
// ==============================
function filterChat(keyword) {
    keyword = keyword.toLowerCase();
    document.querySelectorAll(".user").forEach(el => {
        const name = el.querySelector("h4").textContent.toLowerCase();
        const email = el.querySelector("p").textContent.toLowerCase();
        el.style.display = (name.includes(keyword) || email.includes(keyword)) ? "flex" : "none";
    });
}
window.filterChat = filterChat;

// ==============================
// GROUP CHAT
// ==============================
function createGroup() { alert("Group chat coming soon"); }
window.createGroup = createGroup;

// ==============================
// INIT
// ==============================
window.addEventListener("DOMContentLoaded", () => {
    if (loadSavedState()) showDashboardLoggedIn();
});

// ==============================
// ✅ FIXED CLICK OUTSIDE CLOSE
// ==============================
document.addEventListener("click", (e) => {
    const menuBtn = document.querySelector(".menu-header");
    const mainMenu = document.getElementById("mainDropdown");
    const settingsMenu = document.getElementById("settingsDropdown");

    if (!menuBtn.contains(e.target) && !mainMenu.contains(e.target)) {
        mainMenu.classList.add("hidden");
        settingsMenu.classList.add("hidden");
    }

    const emojiPicker = document.getElementById("emojiPicker");
    const emojiBtn = document.querySelector(".icon-btn[onclick='toggleEmojiPicker()']");
    if (emojiPicker && !emojiPicker.classList.contains("hidden") && !emojiPicker.contains(e.target) && !emojiBtn.contains(e.target)) {
        emojiPicker.classList.add("hidden");
    }
});