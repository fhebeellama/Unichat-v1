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
    serverTimestamp,
    doc,
    setDoc,
    updateDoc,
    getDoc
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
// INITIALIZE FIREBASE
// ==============================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==============================
// GLOBAL VARIABLES
// ==============================
let currentUser = null;
let activeChatUser = null;
let unsubscribeMessages = null;

// ==============================
// START APP
// ==============================
window.startApp = function () {
    document.getElementById("splashScreen").style.display = "none";
};

// ==============================
// AUTH STATE
// ==============================
onAuthStateChanged(auth, async (user) => {

    if (user) {

        const userRef = doc(db, "users", user.email);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            currentUser = userSnap.data();

            document.querySelector(".auth-container").classList.add("hidden");
            document.getElementById("dashboard").style.display = "flex";

            applyUserSettings();
            loadUsers();
        }

    } else {

        document.querySelector(".auth-container").classList.remove("hidden");
        document.getElementById("dashboard").style.display = "none";
    }
});

// ==============================
// APPLY USER SETTINGS
// ==============================
function applyUserSettings() {

    if (!currentUser) return;

    document.getElementById("menuUserName").textContent = currentUser.name;

    const avatar = document.getElementById("menuAvatar");

    avatar.textContent = currentUser.name.charAt(0).toUpperCase();

    if (currentUser.profilePic) {
        avatar.style.backgroundImage = `url(${currentUser.profilePic})`;
        avatar.style.backgroundSize = "cover";
        avatar.textContent = "";
    }

    document.getElementById("menuUserStatus").textContent =
        currentUser.isOnline ? "● Online" : "○ Offline";
}

// ==============================
// SIGN UP
// ==============================
document.getElementById("signupFormElement")
.addEventListener("submit", async (e) => {

    e.preventDefault();

    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("signupConfirmPassword").value;

    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    try {

        await createUserWithEmailAndPassword(auth, email, password);

        await setDoc(doc(db, "users", email), {
            name,
            email,
            bio: "Hey there! I am using Unichat.",
            profilePic: "",
            isOnline: true
        });

        alert("Account created successfully!");

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

    const email = document.getElementById("signinEmail").value.trim();
    const password = document.getElementById("signinPassword").value;

    try {

        await signInWithEmailAndPassword(auth, email, password);

        await updateDoc(doc(db, "users", email), {
            isOnline: true
        });

    } catch (error) {
        alert(error.message);
    }
});

// ==============================
// LOGOUT
// ==============================
window.logout = async function () {

    if (currentUser) {

        await updateDoc(doc(db, "users", currentUser.email), {
            isOnline: false
        });
    }

    await signOut(auth);
};

// ==============================
// LOAD USERS
// ==============================
function loadUsers() {

    const usersRef = collection(db, "users");

    onSnapshot(usersRef, (snapshot) => {

        const userList = document.getElementById("userList");

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

// ==============================
// SWITCH USER
// ==============================
window.switchUser = function (user) {

    activeChatUser = user;

    document.getElementById("chatHeaderName").textContent = user.name;

    document.getElementById("chatHeaderAvatar").textContent =
        user.name.charAt(0).toUpperCase();

    document.getElementById("profileName").textContent = user.name;

    document.getElementById("profileBio").textContent =
        user.bio || "Hey there! I am using Unichat.";

    document.getElementById("chatMessages").innerHTML = "";

    loadMessages();
};

// ==============================
// ROOM ID
// ==============================
function getChatRoomId(user1, user2) {

    return [user1.email, user2.email]
        .sort()
        .join("_");
}

// ==============================
// SEND MESSAGE
// ==============================
window.sendMessage = async function () {

    const input = document.getElementById("messageInput");

    const text = input.value.trim();

    if (!text || !activeChatUser) return;

    const roomId = getChatRoomId(currentUser, activeChatUser);

    try {

        await addDoc(
            collection(db, "chats", roomId, "messages"),
            {
                text,
                sender: currentUser.email,
                receiver: activeChatUser.email,
                createdAt: serverTimestamp()
            }
        );

        input.value = "";

    } catch (error) {

        console.error(error);
    }
};

// ==============================
// LOAD MESSAGES
// ==============================
function loadMessages() {

    if (!activeChatUser) return;

    if (unsubscribeMessages) {
        unsubscribeMessages();
    }

    const roomId = getChatRoomId(currentUser, activeChatUser);

    const q = query(
        collection(db, "chats", roomId, "messages"),
        orderBy("createdAt", "asc")
    );

    unsubscribeMessages = onSnapshot(q, (snapshot) => {

        const chatBox = document.getElementById("chatMessages");

        chatBox.innerHTML = "";

        snapshot.forEach((docSnap) => {

            const msg = docSnap.data();

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

// ==============================
// ENTER KEY
// ==============================
window.handleKeyPress = function (event) {

    if (event.key === "Enter") {

        event.preventDefault();

        sendMessage();
    }
};

// ==============================
// SEARCH USERS
// ==============================
window.filterChat = function (searchText) {

    const users = document.querySelectorAll(".user");

    users.forEach((user) => {

        const name =
            user.querySelector("h4").textContent.toLowerCase();

        if (name.includes(searchText.toLowerCase())) {

            user.style.display = "flex";

        } else {

            user.style.display = "none";
        }
    });
};

// ==============================
// PROFILE UPDATE
// ==============================
window.saveSidebarProfile = async function () {

    const newName =
        document.getElementById("editSidebarName").value;

    const newBio =
        document.getElementById("editSidebarBio").value;

    currentUser.name = newName;
    currentUser.bio = newBio;

    await updateDoc(
        doc(db, "users", currentUser.email),
        {
            name: newName,
            bio: newBio
        }
    );

    applyUserSettings();

    alert("Profile updated!");
};

// ==============================
// DARK MODE
// ==============================
window.toggleDarkMode = function () {

    document.body.classList.toggle("dark-mode");
};

// ==============================
// TOGGLE MENU
// ==============================
window.toggleMenu = function () {

    const menu = document.getElementById("mainDropdown");

    menu.style.display =
        menu.style.display === "block"
            ? "none"
            : "block";
};

// ==============================
// SETTINGS
// ==============================
window.showSettings = function () {

    document.getElementById("mainDropdown").style.display = "none";

    document.getElementById("settingsDropdown").style.display = "block";
};

window.showMainMenu = function () {

    document.getElementById("settingsDropdown").style.display = "none";

    document.getElementById("mainDropdown").style.display = "block";
};

// ==============================
// RIGHT SIDEBAR
// ==============================
window.toggleRightSidebar = function () {

    document.getElementById("rightSidebar")
        .classList.toggle("active");
};

// ==============================
// EMOJI PICKER
// ==============================
window.toggleEmojiPicker = function () {

    const picker = document.getElementById("emojiPicker");

    if (picker.style.display === "block") {

        picker.style.display = "none";

    } else {

        picker.style.display = "block";
    }
};

// ==============================
// IMAGE SEND
// ==============================
window.sendImage = function (input) {

    if (!input.files[0]) return;

    const reader = new FileReader();

    reader.onload = function (e) {

        const img = document.createElement("img");

        img.src = e.target.result;

        img.style.maxWidth = "200px";

        const div = document.createElement("div");

        div.className = "message sent";

        div.appendChild(img);

        document.getElementById("chatMessages")
            .appendChild(div);
    };

    reader.readAsDataURL(input.files[0]);
};