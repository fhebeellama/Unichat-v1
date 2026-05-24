// =====================================
// FIREBASE IMPORTS
// =====================================
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
    serverTimestamp,
    doc,
    setDoc,
    updateDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =====================================
// FIREBASE CONFIG
// =====================================
const firebaseConfig = {
  apiKey: "AIzaSyDdVR0x17NB3ma4ulyL-Jdv3rukfNijwgs",
  authDomain: "unichat-v1.firebaseapp.com",
  projectId: "unichat-v1",
  storageBucket: "unichat-v1.firebasestorage.app",
  messagingSenderId: "1014572806433",
  appId: "1:1014572806433:web:d496a60f3011993217ce60"
};

// =====================================
// INITIALIZE FIREBASE
// =====================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =====================================
// GLOBAL VARIABLES
// =====================================
let currentUser = null;
let activeChatUser = null;
let unsubscribeMessages = null;

// =====================================
// SPLASH SCREEN
// =====================================
window.startApp = function () {
    document.getElementById("splashScreen").style.display = "none";
};

// =====================================
// AUTH STATE
// =====================================
onAuthStateChanged(auth, async (user) => {

    if (user) {

        const userRef = doc(db, "users", user.email);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {

            currentUser = userSnap.data();

            showDashboard();
            applyUserSettings();
            loadUsers();
        }

    } else {

        showAuth();
    }
});

// =====================================
// SHOW AUTH
// =====================================
function showAuth() {

    document.querySelector(".auth-container")
        .classList.remove("hidden");

    document.getElementById("dashboard")
        .style.display = "none";
}

// =====================================
// SHOW DASHBOARD
// =====================================
function showDashboard() {

    document.querySelector(".auth-container")
        .classList.add("hidden");

    document.getElementById("dashboard")
        .style.display = "flex";
}

// =====================================
// APPLY USER SETTINGS
// =====================================
function applyUserSettings() {

    if (!currentUser) return;

    document.getElementById("menuUserName").textContent =
        currentUser.name;

    document.getElementById("menuAvatar").textContent =
        currentUser.name.charAt(0).toUpperCase();

    document.getElementById("menuUserStatus").textContent =
        currentUser.isOnline
            ? "● Online"
            : "○ Offline";

    if (currentUser.darkMode) {
        document.body.classList.add("dark-mode");
    }
}

// =====================================
// SIGNUP
// =====================================
document.getElementById("signupFormElement")
.addEventListener("submit", async (e) => {

    e.preventDefault();

    const name =
        document.getElementById("signupName").value.trim();

    const email =
        document.getElementById("signupEmail").value.trim();

    const password =
        document.getElementById("signupPassword").value;

    const confirmPassword =
        document.getElementById("signupConfirmPassword").value;

    if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
    }

    try {

        await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        await setDoc(doc(db, "users", email), {
            name,
            email,
            bio: "Hey there! I am using Unichat.",
            profilePic: "",
            isOnline: true,
            darkMode: false,
            createdAt: serverTimestamp()
        });

        alert("Account created!");

    } catch (error) {

        alert(error.message);
    }
});

// =====================================
// LOGIN
// =====================================
document.getElementById("signinFormElement")
.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email =
        document.getElementById("signinEmail").value.trim();

    const password =
        document.getElementById("signinPassword").value;

    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        await updateDoc(doc(db, "users", email), {
            isOnline: true
        });

    } catch (error) {

        alert(error.message);
    }
});

// =====================================
// LOGOUT
// =====================================
window.logout = async function () {

    if (currentUser) {

        await updateDoc(
            doc(db, "users", currentUser.email),
            {
                isOnline: false
            }
        );
    }

    await signOut(auth);
};

// =====================================
// LOAD USERS
// =====================================
function loadUsers() {

    const usersRef = collection(db, "users");

    onSnapshot(usersRef, (snapshot) => {

        const userList =
            document.getElementById("userList");

        userList.innerHTML = "";

        snapshot.forEach((docSnap) => {

            const user = docSnap.data();

            if (user.email === currentUser.email) return;

            const div = document.createElement("div");

            div.className = "user";

            div.innerHTML = `
                <div class="avatar-container">
                    <div class="avatar">
                        ${user.name.charAt(0).toUpperCase()}
                    </div>

                    <span class="status-indicator ${user.isOnline ? "online" : "offline"}"></span>
                </div>

                <div class="user-info">
                    <h4>${user.name}</h4>
                    <p>${user.isOnline ? "Online" : "Offline"}</p>
                </div>
            `;

            div.onclick = () => switchUser(user);

            userList.appendChild(div);
        });
    });
}

// =====================================
// SWITCH USER
// =====================================
window.switchUser = function (user) {

    activeChatUser = user;

    document.getElementById("chatHeaderName")
        .textContent = user.name;

    document.getElementById("chatHeaderAvatar")
        .textContent =
            user.name.charAt(0).toUpperCase();

    document.getElementById("profileName")
        .textContent = user.name;

    document.getElementById("profileBio")
        .textContent =
            user.bio || "";

    loadMessages();
};

// =====================================
// ROOM ID
// =====================================
function getChatRoomId(user1, user2) {

    return [user1.email, user2.email]
        .sort()
        .join("_");
}

// =====================================
// SEND MESSAGE
// =====================================
window.sendMessage = async function () {

    const input =
        document.getElementById("messageInput");

    const text = input.value.trim();

    if (!text || !activeChatUser) return;

    const roomId =
        getChatRoomId(currentUser, activeChatUser);

    await addDoc(
        collection(db, "chats", roomId, "messages"),
        {
            type: "text",
            text,
            sender: currentUser.email,
            createdAt: serverTimestamp()
        }
    );

    input.value = "";
};

// =====================================
// LOAD MESSAGES
// =====================================
function loadMessages() {

    if (!activeChatUser) return;

    if (unsubscribeMessages) {
        unsubscribeMessages();
    }

    const roomId =
        getChatRoomId(currentUser, activeChatUser);

    const q = query(
        collection(db, "chats", roomId, "messages"),
        orderBy("createdAt")
    );

    unsubscribeMessages = onSnapshot(q, (snapshot) => {

        const chatBox =
            document.getElementById("chatMessages");

        chatBox.innerHTML = "";

        snapshot.forEach((docSnap) => {

            const msg = docSnap.data();

            const div =
                document.createElement("div");

            div.className =
                msg.sender === currentUser.email
                    ? "message sent"
                    : "message received";

            if (msg.type === "image") {

                div.innerHTML = `
                    <img src="${msg.imageUrl}"
                    style="max-width:200px;border-radius:10px;">
                `;

            } else {

                div.innerHTML = `
                    <div class="message-content">
                        ${msg.text}
                    </div>
                `;
            }

            chatBox.appendChild(div);
        });

        chatBox.scrollTop = chatBox.scrollHeight;
    });
}

// =====================================
// ENTER KEY
// =====================================
window.handleKeyPress = function (event) {

    if (event.key === "Enter") {

        event.preventDefault();

        sendMessage();
    }
};

// =====================================
// SEND IMAGE
// =====================================
window.sendImage = async function (input) {

    if (!input.files[0] || !activeChatUser) return;

    const reader = new FileReader();

    reader.onload = async function (e) {

        const roomId =
            getChatRoomId(currentUser, activeChatUser);

        await addDoc(
            collection(db, "chats", roomId, "messages"),
            {
                type: "image",
                imageUrl: e.target.result,
                sender: currentUser.email,
                createdAt: serverTimestamp()
            }
        );
    };

    reader.readAsDataURL(input.files[0]);
};

// =====================================
// EMOJIS
// =====================================
const emojis = [
    "😀","😂","😍","🥰","😎",
    "😭","😡","👍","❤️","🔥",
    "🎉","🤖","💯","😴","😅"
];

window.toggleEmojiPicker = function () {

    const picker =
        document.getElementById("emojiPicker");

    picker.classList.toggle("hidden");

    const content =
        document.getElementById("emojiContent");

    content.innerHTML = "";

    emojis.forEach((emoji) => {

        const span =
            document.createElement("span");

        span.textContent = emoji;

        span.style.fontSize = "28px";
        span.style.cursor = "pointer";
        span.style.margin = "5px";

        span.onclick = () => {

            document.getElementById("messageInput")
                .value += emoji;
        };

        content.appendChild(span);
    });
};

// =====================================
// GROUP CHAT
// =====================================
window.createGroup = function () {

    const groupName =
        prompt("Enter Group Name");

    if (!groupName) return;

    const userList =
        document.getElementById("userList");

    const div =
        document.createElement("div");

    div.className = "user";

    div.innerHTML = `
        <div class="avatar-container">
            <div class="avatar">
                ${groupName.charAt(0).toUpperCase()}
            </div>
        </div>

        <div class="user-info">
            <h4>${groupName}</h4>
            <p>Group Chat</p>
        </div>
    `;

    userList.appendChild(div);

    alert("Group Created!");
};

// =====================================
// RIGHT SIDEBAR
// =====================================
window.toggleRightSidebar = function () {

    document.getElementById("rightSidebar")
        .classList.toggle("active");
};

// =====================================
// OPEN EDIT PROFILE
// =====================================
window.openSidebarEditProfile = function () {

    document.getElementById("sidebarViewMode")
        .classList.add("hidden");

    document.getElementById("sidebarEditMode")
        .classList.remove("hidden");

    document.getElementById("rightSidebar")
        .classList.add("active");

    document.getElementById("editSidebarName")
        .value = currentUser.name;

    document.getElementById("editSidebarBio")
        .value = currentUser.bio;
};

// =====================================
// CLOSE EDIT PROFILE
// =====================================
window.closeSidebarEditMode = function () {

    document.getElementById("sidebarViewMode")
        .classList.remove("hidden");

    document.getElementById("sidebarEditMode")
        .classList.add("hidden");
};

// =====================================
// SAVE PROFILE
// =====================================
window.saveSidebarProfile = async function () {

    const name =
        document.getElementById("editSidebarName")
            .value;

    const bio =
        document.getElementById("editSidebarBio")
            .value;

    currentUser.name = name;
    currentUser.bio = bio;

    await updateDoc(
        doc(db, "users", currentUser.email),
        {
            name,
            bio
        }
    );

    applyUserSettings();

    alert("Profile Updated!");
};

// =====================================
// PREVIEW PROFILE IMAGE
// =====================================
window.previewProfilePic = function (event) {

    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {

        document.getElementById("editProfileAvatar")
            .style.backgroundImage =
                `url(${e.target.result})`;

        document.getElementById("editProfileAvatar")
            .style.backgroundSize = "cover";

        currentUser.profilePic = e.target.result;
    };

    reader.readAsDataURL(file);
};

// =====================================
// FILTER CHAT
// =====================================
window.filterChat = function (search) {

    const users =
        document.querySelectorAll(".user");

    users.forEach((user) => {

        const text =
            user.innerText.toLowerCase();

        user.style.display =
            text.includes(search.toLowerCase())
                ? "flex"
                : "none";
    });
};

// =====================================
// STATUS TOGGLE
// =====================================
window.toggleMyStatus = async function () {

    currentUser.isOnline =
        !currentUser.isOnline;

    await updateDoc(
        doc(db, "users", currentUser.email),
        {
            isOnline: currentUser.isOnline
        }
    );

    applyUserSettings();
};

// =====================================
// AUDIO + VIDEO CALL
// =====================================
window.startAudioCall = function () {

    alert("Audio call feature coming soon!");
};

window.startVideoCall = function () {

    alert("Video call feature coming soon!");
};

// =====================================
// DARK MODE
// =====================================
window.toggleDarkMode = async function () {

    document.body.classList.toggle("dark-mode");

    currentUser.darkMode =
        document.body.classList.contains("dark-mode");

    await updateDoc(
        doc(db, "users", currentUser.email),
        {
            darkMode: currentUser.darkMode
        }
    );
};

// =====================================
// AUTH SWITCH
// =====================================
document.getElementById("showSignin")
.addEventListener("click", (e) => {

    e.preventDefault();

    document.getElementById("signupForm")
        .classList.add("hidden");

    document.getElementById("signinForm")
        .classList.remove("hidden");
});

document.getElementById("showSignup")
.addEventListener("click", (e) => {

    e.preventDefault();

    document.getElementById("signinForm")
        .classList.add("hidden");

    document.getElementById("signupForm")
        .classList.remove("hidden");
});