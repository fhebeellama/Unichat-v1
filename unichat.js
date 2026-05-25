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
let splashClicked = false;

// ---------- GLOBAL STATE ----------
let currentUser = null;
let activeChatUser = null;
let darkMode = false;
let activeStatus = true;

// ---------- SPLASH SCREEN ----------
document.getElementById('splashScreen').addEventListener('click', () => {
    document.getElementById('splashScreen').classList.add('hidden');
    document.querySelector('.auth-container').classList.remove('hidden');
});

// ---------- AUTH FORM SWITCH ----------
document.getElementById('showSignin').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('signupForm').classList.add('hidden');
    document.getElementById('signinForm').classList.remove('hidden');
});

document.getElementById('showSignup').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('signinForm').classList.add('hidden');
    document.getElementById('signupForm').classList.remove('hidden');
});

// ---------- SIGN UP ----------
document.getElementById('signupFormElement').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;

    if (password !== confirmPassword) return alert('Passwords do not match!');

    const users = JSON.parse(localStorage.getItem('unichat_users')) || [];
    if (users.find(u => u.email === email)) return alert('Email already registered!');

    const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password,
        bio: 'Hey there! I am using Unichat.',
        avatarLetter: name.charAt(0).toUpperCase(),
        online: true
    };
    users.push(newUser);
    localStorage.setItem('unichat_users', JSON.stringify(users));

    currentUser = newUser;
    enterApp();
});

// ---------- SIGN IN ----------
document.getElementById('signinFormElement').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signinEmail').value.trim();
    const password = document.getElementById('signinPassword').value;

    const users = JSON.parse(localStorage.getItem('unichat_users')) || [];
    const found = users.find(u => u.email === email && u.password === password);
    if (!found) return alert('Invalid email or password!');

    found.online = true;
    localStorage.setItem('unichat_users', JSON.stringify(users));
    currentUser = found;
    enterApp();
});

// ---------- ENTER APP ----------
function enterApp() {
    document.querySelector('.auth-container').classList.add('hidden');
    document.getElementById('dashboard').style.display = 'flex';
    updateHeaderMenu();
    loadUserList();
}

// ---------- HEADER MENU ----------
document.getElementById('headermenu').addEventListener('click', () => {
    document.getElementById('mainDropdown').classList.toggle('hidden');
    document.getElementById('settingsDropdown').classList.add('hidden');
});

document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('mainDropdown').classList.add('hidden');
    document.getElementById('settingsDropdown').classList.remove('hidden');
});

document.getElementById('backToMenuBtn').addEventListener('click', () => {
    document.getElementById('settingsDropdown').classList.add('hidden');
    document.getElementById('mainDropdown').classList.remove('hidden');
});

// ---------- DARK MODE ----------
document.getElementById('darkBtn').addEventListener('click', () => {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode', darkMode);
    document.getElementById('darkModeToggle').classList.toggle('active', darkMode);
    localStorage.setItem('unichat_dark', darkMode);
});

// ---------- ACTIVE STATUS ----------
document.getElementById('statusBtn').addEventListener('click', () => {
    activeStatus = !activeStatus;
    document.getElementById('statusToggle').classList.toggle('active', activeStatus);
    if (currentUser) {
        currentUser.online = activeStatus;
        saveUsers();
        loadUserList();
    }
});

// ---------- LOGOUT ----------
document.getElementById('logoutBtn').addEventListener('click', () => {
    if (currentUser) {
        currentUser.online = false;
        saveUsers();
    }
    currentUser = null;
    activeChatUser = null;
    document.getElementById('dashboard').style.display = 'none';
    document.querySelector('.auth-container').classList.remove('hidden');
    document.getElementById('signinForm').classList.add('hidden');
    document.getElementById('signupForm').classList.remove('hidden');
});

// ---------- UPDATE HEADER MENU ----------
function updateHeaderMenu() {
    if (!currentUser) return;
    document.getElementById('menuAvatar').textContent = currentUser.avatarLetter;
    document.getElementById('menuUserName').textContent = currentUser.name;
    document.getElementById('menuUserStatus').textContent = activeStatus ? '● Online' : '● Offline';
    document.getElementById('statusToggle').classList.toggle('active', activeStatus);
    document.getElementById('darkModeToggle').classList.toggle('active', darkMode);
}

// ---------- LOAD USER LIST ----------
function loadUserList() {
    const users = JSON.parse(localStorage.getItem('unichat_users')) || [];
    const listEl = document.getElementById('userList');
    listEl.innerHTML = '';

    users
        .filter(u => u.id !== currentUser.id)
        .forEach(user => {
            const el = document.createElement('div');
            el.className = 'user-item';
            el.dataset.id = user.id;
            el.innerHTML = `
                <div class="user-avatar">${user.avatarLetter}
                    <span class="status-indicator ${user.online ? 'online' : ''}"></span>
                </div>
                <div class="user-info">
                    <h4>${user.name}</h4>
                    <p>Last message...</p>
                </div>
            `;
            el.addEventListener('click', () => openChat(user));
            listEl.appendChild(el);
        });
}

// ---------- OPEN CHAT ----------
function openChat(user) {
    activeChatUser = user;

    // Update header
    document.getElementById('chatHeaderAvatar').textContent = user.avatarLetter;
    document.getElementById('chatHeaderStatus').classList.toggle('online', user.online);
    document.getElementById('chatHeaderName').textContent = user.name;
    document.getElementById('chatHeaderStatusText').textContent = user.online ? 'Online' : 'Offline';

    // Load messages
    const messages = JSON.parse(localStorage.getItem('unichat_messages')) || [];
    const chatEl = document.getElementById('chatMessages');
    chatEl.innerHTML = '';

    const convo = messages.filter(m => 
        (m.from === currentUser.id && m.to === user.id) ||
        (m.from === user.id && m.to === currentUser.id)
    );

    if (convo.length === 0) {
        chatEl.innerHTML = '<p class="no-messages">No messages yet. Say hi!</p>';
    } else {
        convo.forEach(msg => {
            const div = document.createElement('div');
            div.className = `message ${msg.from === currentUser.id ? 'sent' : 'received'}`;
            div.textContent = msg.text;
            chatEl.appendChild(div);
        });
        chatEl.scrollTop = chatEl.scrollHeight;
    }
}

// ---------- SEND MESSAGE ----------
document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('messageInput').addEventListener('keydown', e => e.key === 'Enter' && sendMessage());

function sendMessage() {
    if (!activeChatUser) return;
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;

    const messages = JSON.parse(localStorage.getItem('unichat_messages')) || [];
    messages.push({
        from: currentUser.id,
        to: activeChatUser.id,
        text,
        time: Date.now()
    });
    localStorage.setItem('unichat_messages', JSON.stringify(messages));

    input.value = '';
    openChat(activeChatUser);
}

// ---------- PROFILE SIDEBAR ----------
document.getElementById('openProfileBtn').addEventListener('click', () => {
    const sidebar = document.getElementById('rightSidebar');
    sidebar.classList.remove('hidden');

    document.getElementById('profileAvatar').textContent = activeChatUser.avatarLetter;
    document.getElementById('profileName').textContent = activeChatUser.name;
    document.getElementById('profileStatusIndicator').classList.toggle('online', activeChatUser.online);
    document.getElementById('profileStatus').textContent = activeChatUser.online ? '● Online' : '● Offline';
    document.getElementById('profileBio').textContent = activeChatUser.bio;

    document.getElementById('sidebarViewMode').classList.remove('hidden');
    document.getElementById('sidebarEditMode').classList.add('hidden');
});

document.getElementById('closeSidebarBtn').addEventListener('click', () => {
    document.getElementById('rightSidebar').classList.add('hidden');
});

// ---------- EDIT PROFILE ----------
document.getElementById('editProfileBtn').addEventListener('click, #editBtn').addEventListener('click', () => {
    document.getElementById('sidebarViewMode').classList.add('hidden');
    document.getElementById('sidebarEditMode').classList.remove('hidden');

    document.getElementById('editSidebarName').value = currentUser.name;
    document.getElementById('editSidebarBio').value = currentUser.bio;
});

document.getElementById('saveProfileBtn').addEventListener('click', () => {
    currentUser.name = document.getElementById('editSidebarName').value.trim() || currentUser.name;
    currentUser.bio = document.getElementById('editSidebarBio').value.trim() || currentUser.bio;
    currentUser.avatarLetter = currentUser.name.charAt(0).toUpperCase();

    saveUsers();
    updateHeaderMenu();
    loadUserList();
    document.getElementById('rightSidebar').classList.add('hidden');
});

document.getElementById('closeEditBtn').addEventListener('click', () => {
    document.getElementById('sidebarEditMode').classList.add('hidden');
    document.getElementById('sidebarViewMode').classList.remove('hidden');
});

// ---------- EMOJI PICKER ----------
document.getElementById('emojiBtn').addEventListener('click', () => {
    document.getElementById('emojiPicker').classList.toggle('hidden');
    loadEmojis();
});

function loadEmojis() {
    const emojis = ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','🥰','😘','😗','😙','😚','🙂','🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','☹️','🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨','😩','🤯','😬','😰','😱','🥶','🥵','😳','🤪','😵','😡','😠','🤬','😷','🤒','🤕','🤢','🤮','🤧','😇','💋','💌','💘','💝','💖','💗','💓','💞','💕','💟','❣️','💔','❤️','🧡','💛','💚','💙','💜','🤎','🖤','🤍','💯','💢','💥','💫','💦','💨','🕳️','💣','💬','🗨️','🗯️','💭','💤'];
    const cont = document.getElementById('emojiContent');
    if (cont.children.length) return;

    emojis.forEach(e => {
        const span = document.createElement('span');
        span.className = 'emoji-item';
        span.textContent = e;
        span.addEventListener('click', () => {
            document.getElementById('messageInput').value += e;
        });
        cont.appendChild(span);
    });
}

// ---------- SEARCH USERS ----------
document.getElementById('searchChat').addEventListener('input', e => {
    const val = e.target.value.toLowerCase();
    document.querySelectorAll('.user-item').forEach(el => {
        const name = el.querySelector('h4').textContent.toLowerCase();
        el.style.display = name.includes(val) ? 'flex' : 'none';
    });
});

// ---------- HELPER ----------
function saveUsers() {
    const all = JSON.parse(localStorage.getItem('unichat_users')) || [];
    const idx = all.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) all[idx] = currentUser;
    localStorage.setItem('unichat_users', JSON.stringify(all));
}

// Load saved dark mode
if (localStorage.getItem('unichat_dark') === 'true') {
    darkMode = true;
    document.body.classList.add('dark-mode');
}