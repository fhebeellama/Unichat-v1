// ========== FIREBASE SETUP ==========
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth, createUserWithEmailAndPassword,
    signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore, collection, addDoc, onSnapshot,
    query, orderBy, serverTimestamp, doc, setDoc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDdVR0x17NB3ma4ulyL-Jdv3rukfNijwgs",
  authDomain: "unichat-v1.firebaseapp.com",
  projectId: "unichat-v1",
  storageBucket: "unichat-v1.firebasestorage.app",
  messagingSenderId: "1014572806433",
  appId: "1:1014572806433:web:d496a60f3011993217ce60"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ========== GLOBAL STATE ==========
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
let splashClicked = false;

// ========== LOCAL STORAGE ==========
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
        uid: "", name: "User", email: "", bio: "Hey there! I am using Unichat.",
        isOnline: true, darkMode: false, profilePic: ""
    };
}

// ========== SPLASH SCREEN ==========
function startApp() {
    if (splashClicked) return;
    splashClicked = true;
    document.getElementById("splashScreen").classList.add("hidden");
}

// ========== DASHBOARD ==========
function showDashboardLoggedIn() {
    document.querySelector(".auth-container").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
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

    document.getElementById("statusToggle").classList.toggle("active", currentUser.isOnline);
}

async function updateUserStatus(status) {
    if (!currentUser.email) return;
    try {
        await updateDoc(doc(db, "users", currentUser.email), { isOnline: status });
    } catch (e) {
        console.log("Status error:", e);
    }
}

// ========== LOAD USERS LIST ==========
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
            userDiv.addEventListener("click", () => switchUser(user));
            userDiv.innerHTML = `
                <div class="avatar-container">
                    <div class="avatar" style="background-image: ${user.profilePic ? `url(${user.profilePic})` : 'none'}; background-size:cover;">
                        ${!user.profilePic ? user.name.charAt(0).toUpperCase() : ""}
                    </div>
                    <span class="status-indicator ${user.isOnline ? "online" : "offline"}"></span>
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

// ========== AUTH SWITCH ==========
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

// ========== SIGN UP ==========
document.getElementById("signupFormElement").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim().toLowerCase();
    const password = document.getElementById("signupPassword").value;
    const confirm = document.getElementById("signupConfirmPassword").value;

    if (password !== confirm) return alert("Passwords do not match!");
    if (password.length < 6) return alert("Min 6 characters required!");

    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        currentUser.uid = userCred.user.uid;
        currentUser.name = name;
        currentUser.email = email;

        await setDoc(doc(db, "users", email), {
            uid: userCred.user.uid, name, email, bio: currentUser.bio,
            isOnline: true, profilePic: "", darkMode: false
        });
        saveCurrentState();
        alert("Account created!");
    } catch (err) {
        alert(err.message);
    }
});

// ========== SIGN IN ==========
document.getElementById("signinFormElement").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("signinEmail").value.trim().toLowerCase();
    const password = document.getElementById("signinPassword").value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        alert(err.message);
    }
});

// ========== AUTH STATE CHANGE ==========
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.email));
        if (userDoc.exists()) {
            const data = userDoc.data();
            currentUser = { ...currentUser, ...data };
            saveCurrentState();
            showDashboardLoggedIn();
        }
    } else {
        clearSession();
        document.getElementById("dashboard").classList.add("hidden");
        document.querySelector(".auth-container").classList.remove("hidden");
        document.getElementById("signinForm").classList.remove("hidden");
        document.getElementById("signupForm").classList.add("hidden");
        if (unsubscribeUsers) unsubscribeUsers();
        if (unsubscribeMessages) unsubscribeMessages();
        activeChatUser = null;
    }
});

// ========== LOGOUT ==========
async function logout() {
    try {
        await updateUserStatus(false);
        await signOut(auth);
    } catch (err) {
        alert(err.message);
    }
}

// ========== MENUS ==========
function toggleMenu(e) {
    e.stopPropagation();
    const main = document.getElementById("mainDropdown");
    const settings = document.getElementById("settingsDropdown");
    settings.classList.add("hidden");
    main.classList.toggle("hidden");
}

function showSettings(e) {
    e.stopPropagation();
    document.getElementById("mainDropdown").classList.add("hidden");
    document.getElementById("settingsDropdown").classList.remove("hidden");
}

function showMainMenu(e) {
    e.stopPropagation();
    document.getElementById("settingsDropdown").classList.add("hidden");
    document.getElementById("mainDropdown").classList.remove("hidden");
}

// ========== SETTINGS TOGGLES ==========
async function toggleDarkMode(e) {
    e.stopPropagation();
    document.body.classList.toggle("dark-mode");
    currentUser.darkMode = document.body.classList.contains("dark-mode");
    document.getElementById("darkModeToggle").classList.toggle("active");
    saveCurrentState();
    await updateDoc(doc(db, "users", currentUser.email), { darkMode: currentUser.darkMode });
}

async function toggleStatus(e) {
    e.stopPropagation();
    currentUser.isOnline = !currentUser.isOnline;
    document.getElementById("statusToggle").classList.toggle("active");
    const statusEl = document.getElementById("menuUserStatus");
    statusEl.textContent = currentUser.isOnline ? "● Online" : "○ Offline";
    statusEl.style.color = currentUser.isOnline ? "#55efc4" : "#95a5a6";
    saveCurrentState();
    await updateUserStatus(currentUser.isOnline);
}

// ========== CHAT FUNCTIONS ==========
function switchUser(user) {
    activeChatUser = user;
    document.querySelector(".chat-header h3").textContent = user.name;
    document.getElementById("chatHeaderStatus").className = `status-indicator ${user.isOnline ? "online" : "offline"}`;
    document.getElementById("chatHeaderStatusText").textContent = user.isOnline ? "Active Now" : "Offline";
    document.getElementById("chatMessages").innerHTML = "";
    loadMessages();
}

function getChatRoomId(u1, u2) {
    return [u1.email, u2.email].sort().join("_");
}

async function sendMessage() {
    const input = document.getElementById("messageInput");
    const text = input.value.trim();
    if (!text || !activeChatUser) return alert("Select a user first!");

    const roomId = getChatRoomId(currentUser, activeChatUser);
    try {
        await addDoc(collection(db, "chats", roomId, "messages"), {
            text, sender: currentUser.email, receiver: activeChatUser.email,
            createdAt: serverTimestamp()
        });
        input.value = "";
    } catch (err) {
        console.error("Send error:", err);
    }
}

function loadMessages() {
    if (!activeChatUser) return;
    if (unsubscribeMessages) unsubscribeMessages();

    const roomId = getChatRoomId(currentUser, activeChatUser);
    const qry = query(collection(db, "chats", roomId, "messages"), orderBy("createdAt", "asc"));

    unsubscribeMessages = onSnapshot(qry, (snapshot) => {
        const chatBox = document.getElementById("chatMessages");
        chatBox.innerHTML = "";
        if (snapshot.empty) {
            chatBox.innerHTML = '<p class="no-messages">No messages yet</p>';
            return;
        }

        snapshot.forEach((doc) => {
            const msg = doc.data();
            const div = document.createElement("div");
            div.className = msg.sender === currentUser.email ? "message sent" : "message received";
            const time = msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}) : "...";
            div.innerHTML = `<div class="message-content">${msg.text}</div><span class="timestamp">${time}</span>`;
            chatBox.appendChild(div);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    });
}

function handleEnter(e) {
    if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
    }
}

// ========== EMOJI ==========
function toggleEmojiPicker(e) {
    e.stopPropagation();
    const picker = document.getElementById("emojiPicker");
    picker.classList.toggle("hidden");
    picker.classList.toggle("active");
}

function showEmojiTab(tab) {
    const content = document.getElementById("emojiContent");
    const emojis = ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😜","🤪","😝","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","☹️"];

    if (tab === "emoji") {
        content.innerHTML = '<div class="emoji-grid">' + emojis.map(e => `<div class="emoji-item">${e}</div>`).join("") + "</div>";
        document.querySelectorAll(".emoji-item").forEach(el => el.addEventListener("click", () => {
            document.getElementById("messageInput").value += el.textContent;
            document.getElementById("emojiPicker").classList.add("hidden");
            document.getElementById("emojiPicker").classList.remove("active");
        }));
    } else {
        content.innerHTML = "<p style='text-align:center;padding:20px;color:var(--text)'>GIFs coming soon</p>";
    }
}

// ========== PROFILE / SIDEBAR ==========
function toggleRightSidebar(e) {
    if (e) e.stopPropagation();
    const side = document.getElementById("rightSidebar");
    side.classList.toggle("active");
    if (side.classList.contains("active")) {
        if (!activeChatUser || activeChatUser.email === currentUser.email) loadMyProfile();
        else loadUserProfile();
    } else closeEditMode();
}

function loadMyProfile() {
    document.getElementById("sidebarViewMode").classList.remove("hidden");
    document.getElementById("sidebarEditMode").classList.add("hidden");
    document.getElementById("profileName").textContent = currentUser.name;
    document.getElementById("profileBio").textContent = currentUser.bio;
    document.getElementById("editProfileBtn").classList.remove("hidden");
    document.getElementById("blockBtn").classList.add("hidden");
}

function loadUserProfile() {
    document.getElementById("sidebarViewMode").classList.remove("hidden");
    document.getElementById("sidebarEditMode").classList.add("hidden");
    document.getElementById("profileName").textContent = activeChatUser.name;
    document.getElementById("profileBio").textContent = activeChatUser.bio || "Hey there! I am using Unichat.";
    document.getElementById("editProfileBtn").classList.add("hidden");
    document.getElementById("blockBtn").classList.remove("hidden");
}

function openEditProfile(e) {
    if (e) e.stopPropagation();
    document.getElementById("mainDropdown").classList.add("hidden");
    document.getElementById("settingsDropdown").classList.add("hidden");
    activeChatUser = { ...currentUser };
    const side = document.getElementById("rightSidebar");
    if (!side.classList.contains("active")) side.classList.add("active");
    loadMyProfile();
    document.getElementById("sidebarViewMode").classList.add("hidden");
    document.getElementById("sidebarEditMode").classList.remove("hidden");
    document.getElementById("editSidebarName").value = currentUser.name;
    document.getElementById("editSidebarBio").value = currentUser.bio;
}

function closeEditMode() {
    document.getElementById("sidebarEditMode").classList.add("hidden");
    document.getElementById("sidebarViewMode").classList.remove("hidden");
}

function previewPic(e) {
    const reader = new FileReader();
    reader.onload = ev => {
        const ava = document.getElementById("editProfileAvatar");
        ava.style.backgroundImage = `url(${ev.target.result})`;
        ava.style.backgroundSize = "cover";
        ava.textContent = "";
    };
    reader.readAsDataURL(e.target.files[0]);
}

async function saveProfile(e) {
    if (e) e.stopPropagation();
    const newName = document.getElementById("editSidebarName").value.trim();
    const newBio = document.getElementById("editSidebarBio").value.trim();
    const picFile = document.getElementById("editProfilePic").files[0];

    if (newName) currentUser.name = newName;
    if (newBio) currentUser.bio = newBio;

    if (picFile) {
        const refPath = ref(storage, `profiles/${currentUser.uid}_${Date.now()}`);
        try {
            const snap = await uploadBytes(refPath, picFile);
            const url = await getDownloadURL(snap.ref);
            currentUser.profilePic = url;
            await updateProfileDB();
        } catch (err) {
            alert("Upload failed: " + err.message);
        }
    } else {
        await updateProfileDB();
    }
}

async function updateProfileDB() {
    try {
        await updateDoc(doc(db, "users", currentUser.email), {
            name: currentUser.name, bio: currentUser.bio, profilePic: currentUser.profilePic
        });
        saveCurrentState();
        applyUserSettings();
        closeEditMode();
        alert("Profile updated!");
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// ========== SEARCH ==========
function filterChat(keyword) {
    document.querySelectorAll(".user").forEach(el => {
        const name = el.querySelector("h4").textContent.toLowerCase();
        const mail = el.querySelector("p").textContent.toLowerCase();
        el.style.display = (name.includes(keyword.toLowerCase()) || mail.includes(keyword.toLowerCase())) ? "flex" : "none";
    });
}

// ========== CLOSE MENUS WHEN CLICK OUTSIDE ==========
document.addEventListener("click", () => {
    document.getElementById("mainDropdown").classList.add("hidden");
    document.getElementById("settingsDropdown").classList.add("hidden");
});

// ========== INITIALIZE EVENTS ==========
window.addEventListener("DOMContentLoaded", () => {
    // Splash
    document.getElementById("splashScreen").addEventListener("click", startApp);

    // Menu
    document.getElementById("headermenu").addEventListener("click", toggleMenu);
    document.getElementById("settingsBtn").addEventListener("click", showSettings);
    document.getElementById("backToMenuBtn").addEventListener("click", showMainMenu);
    document.getElementById("logoutBtn").addEventListener("click", logout);
    document.getElementById("editBtn").addEventListener("click", openEditProfile);

    // Settings
    document.getElementById("darkBtn").addEventListener("click", toggleDarkMode);
    document.getElementById("statusBtn").addEventListener("click", toggleStatus);

    // Sidebar
    document.getElementById("openProfileBtn").addEventListener("click", toggleRightSidebar);
    document.getElementById("closeSidebarBtn").addEventListener("click", toggleRightSidebar);
    document.getElementById("closeEditBtn").addEventListener("click", closeEditMode);
    document.getElementById("editProfileBtn").addEventListener("click", openEditProfile);

    // Profile Pic
    document.getElementById("editProfilePic").addEventListener("change", previewPic);
    document.getElementById("saveProfileBtn").addEventListener("click", saveProfile);

    // Chat
    document.getElementById("sendBtn").addEventListener("click", sendMessage);
    document.getElementById("messageInput").addEventListener("keydown", handleEnter);

    // Emoji
    document.getElementById("emojiBtn").addEventListener("click", toggleEmojiPicker);
    document.querySelectorAll(".emoji-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".emoji-tab-btn").forEach(t => t.classList.remove("active"));
            btn.classList.add("active");
            showEmojiTab(btn.dataset.tab);
        });
    });
    showEmojiTab("emoji");

    // Search
    document.getElementById("searchChat").addEventListener("input", (e) => filterChat(e.target.value));

    // Image Send
    document.getElementById("imageInput").addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file || !activeChatUser) return;
        const reader = new FileReader();
        reader.onload = async ev => {
            const roomId = getChatRoomId(currentUser, activeChatUser);
            await addDoc(collection(db, "chats", roomId, "messages"), {
                imageUrl: ev.target.result, sender: currentUser.email, receiver: activeChatUser.email,
                createdAt: serverTimestamp()
            });
        };
        reader.readAsDataURL(file);
    });

    // Load saved session
    if (loadSavedState()) {
        applyUserSettings();
    }
});