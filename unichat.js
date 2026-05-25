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

// ============================================
// FIREBASE CONFIGURATION
// ============================================
// 🔴 Replace with your Firebase config from Console
const firebaseConfig = {
  apiKey: "AIzaSyDdVR0x17NB3ma4ulyL-Jdv3rukfNijwgs",
  authDomain: "unichat-v1.firebaseapp.com",
  projectId: "unichat-v1",
  storageBucket: "unichat-v1.firebasestorage.app",
  messagingSenderId: "1014572806433",
  appId: "1:1014572806433:web:d496a60f3011993217ce60"
};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();

// ============================================
// GLOBAL VARIABLES
// ============================================
let currentUser = null;
let currentUserData = null;
let activeChatUser = null;
let darkMode = localStorage.getItem('unichat_dark') === 'true';
let activeStatus = true;
let messagesListener = null;
let userListListener = null;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Apply saved dark mode
    if (darkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle').classList.add('active');
    }

    // Splash screen click
    document.getElementById('splashScreen').addEventListener('click', () => {
        document.getElementById('splashScreen').classList.add('hidden');
        document.querySelector('.auth-container').classList.remove('hidden');
    });

    // Auth form switching
    setupAuthForms();

    // Setup all event listeners
    setupEventListeners();
});

// ============================================
// AUTH FORMS
// ============================================
function setupAuthForms() {
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

    // Sign Up
    document.getElementById('signupFormElement').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirm = document.getElementById('signupConfirmPassword').value;

        if (!name) return alert('Please enter your name');
        if (password !== confirm) return alert('Passwords do not match!');
        if (password.length < 6) return alert('Password must be at least 6 characters');

        try {
            const btn = document.querySelector('#signupFormElement .btn');
            btn.textContent = 'Creating...';
            btn.disabled = true;

            const userCred = await firebase.auth().createUserWithEmailAndPassword(auth, email, password);
            const uid = userCred.user.uid;

            // Save user profile
            await db.ref('users/' + uid).set({
                uid: uid,
                name: name,
                email: email,
                bio: 'Hey there! I am using Unichat.',
                pic: `https://i.pravatar.cc/150?u=${uid}`,
                status: 'online',
                createdAt: Date.now()
            });

            btn.textContent = 'Create Account';
            btn.disabled = false;
            enterApp(userCred.user);

        } catch (err) {
            alert(err.message);
            const btn = document.querySelector('#signupFormElement .btn');
            btn.textContent = 'Create Account';
            btn.disabled = false;
        }
    });

    // Sign In
    document.getElementById('signinFormElement').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signinEmail').value.trim();
        const password = document.getElementById('signinPassword').value;

        if (!email || !password) return alert('Please enter email and password');

        try {
            const btn = document.querySelector('#signinFormElement .btn');
            btn.textContent = 'Signing in...';
            btn.disabled = true;

            const userCred = await firebase.auth().signInWithEmailAndPassword(auth, email, password);

            // Update online status
            await db.ref('users/' + userCred.user.uid).update({ status: 'online' });

            btn.textContent = 'Sign In';
            btn.disabled = false;
            enterApp(userCred.user);

        } catch (err) {
            alert(err.message);
            const btn = document.querySelector('#signinFormElement .btn');
            btn.textContent = 'Sign In';
            btn.disabled = false;
        }
    });
}

// ============================================
// ENTER APP
// ============================================
function enterApp(user) {
    currentUser = user;
    document.querySelector('.auth-container').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');

    loadUserProfile();
    loadUserList();
    loadEmojis();
}

// ============================================
// LOAD USER PROFILE
// ============================================
function loadUserProfile() {
    if (!currentUser) return;

    db.ref('users/' + currentUser.uid).on('value', (snap) => {
        const data = snap.val();
        if (data) {
            currentUserData = data;

            // Header menu
            const letter = data.name.charAt(0).toUpperCase();
            document.getElementById('menuAvatar').textContent = letter;
            document.getElementById('menuUserName').textContent = data.name;
            document.getElementById('menuUserStatus').textContent = data.status === 'online' ? '● Online' : '○ Offline';

            // Edit profile fields
            document.getElementById('editSidebarName').value = data.name;
            document.getElementById('editSidebarBio').value = data.bio || 'Hey there! I am using Unichat.';
            document.getElementById('editProfileAvatar').textContent = letter;
        }
    });
}

// ============================================
// LOAD USER LIST
// ============================================
function loadUserList() {
    const list = document.getElementById('userList');
    list.innerHTML = '';

    if (userListListener) userListListener();

    userListListener = db.ref('users').orderByChild('status').on('child_added', (snap) => {
        const user = snap.val();
        if (user.uid === currentUser.uid) return;

        const el = document.createElement('div');
        el.className = 'user-item';
        const letter = user.name.charAt(0).toUpperCase();
        el.innerHTML = `
            <div class="user-avatar">
                ${letter}
                <span class="${user.status === 'online' ? 'online' : ''}"></span>
            </div>
            <div class="user-info">
                <h4>${user.name}</h4>
                <p>${user.status === 'online' ? 'Online' : 'Offline'}</p>
            </div>
        `;
        el.addEventListener('click', () => openChat(user));
        list.appendChild(el);
    });
}

// ============================================
// OPEN CHAT
// ============================================
function openChat(user) {
    activeChatUser = user;

    // Chat header
    const letter = user.name.charAt(0).toUpperCase();
    document.getElementById('chatHeaderAvatar').textContent = letter;
    document.getElementById('chatHeaderName').textContent = user.name;
    document.getElementById('chatHeaderStatus').className = 'status-indicator ' + (user.status === 'online' ? 'online' : '');
    document.getElementById('chatHeaderStatusText').textContent = user.status === 'online' ? 'Online' : 'Offline';

    // Right sidebar profile
    document.getElementById('profileAvatar').textContent = letter;
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileBio').textContent = user.bio || 'No bio';
    document.getElementById('profileStatus').textContent = user.status === 'online' ? '● Online' : '○ Offline';
    document.getElementById('profileStatusIndicator').className = 'status-indicator ' + (user.status === 'online' ? 'online' : '');

    // Load messages
    loadMessages(user.uid);

    // Close sidebar if open
    document.getElementById('rightSidebar').classList.remove('active');
}

// ============================================
// LOAD MESSAGES
// ============================================
function loadMessages(chatUid) {
    const chatEl = document.getElementById('chatMessages');
    chatEl.innerHTML = '<p class="no-messages">Loading messages...</p>';

    if (messagesListener) messagesListener();

    const chatId = [currentUser.uid, chatUid].sort().join('_');

    messagesListener = db.ref('chats/' + chatId).orderByChild('createdAt').on('child_added', (snap) => {
        const msg = snap.val();
        const isMe = msg.sender === currentUser.uid;

        if (chatEl.querySelector('.no-messages')) {
            chatEl.innerHTML = '';
        }

        const div = document.createElement('div');
        div.className = `message ${isMe ? 'sent' : 'received'}`;

        if (msg.type === 'image') {
            div.innerHTML = `<img src="${msg.fileUrl}" alt="image"><span class="time">${msg.time}</span>`;
        } else {
            div.innerHTML = `${msg.text}<span class="time">${msg.time}</span>`;
        }

        chatEl.appendChild(div);
        chatEl.scrollTop = chatEl.scrollHeight;
    });
}

// ============================================
// SEND MESSAGE
// ============================================
function sendMessage() {
    if (!activeChatUser) return alert('Select a user first');
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;

    const chatId = [currentUser.uid, activeChatUser.uid].sort().join('_');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    db.ref('chats/' + chatId).push({
        sender: currentUser.uid,
        text: text,
        type: 'text',
        time: time,
        createdAt: Date.now()
    });

    input.value = '';
}

// ============================================
// SEND IMAGE
// ============================================
async function sendImage() {
    if (!activeChatUser) return alert('Select a user first');
    const fileInput = document.getElementById('imageInput');
    const file = fileInput.files[0];
    if (!file) return;

    const chatId = [currentUser.uid, activeChatUser.uid].sort().join('_');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Upload to Firebase Storage
    const storageRef = storage.ref('images/' + Date.now() + '_' + file.name);

    try {
        const snapshot = await storageRef.put(file);
        const url = await snapshot.ref.getDownloadURL();

        db.ref('chats/' + chatId).push({
            sender: currentUser.uid,
            type: 'image',
            fileUrl: url,
            time: time,
            createdAt: Date.now()
        });

    } catch (err) {
        alert('Error uploading image: ' + err.message);
    }

    fileInput.value = '';
}

// ============================================
// EMOJI PICKER
// ============================================
function loadEmojis() {
    const emojis = [
        '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊',
        '😋', '😎', '😍', '🥰', '😘', '😗', '😙', '😚', '🙂', '🤗',
        '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥',
        '😮', '🤐', '😯', '😪', '😫', '🥱', '😴', '😌', '😛', '😜',
        '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️',
        '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨',
        '😩', '🤯', '😬', '😰', '😱', '🥶', '🥵', '😳', '🤪', '😵',
        '😡', '😠', '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '😇'
    ];

    const container = document.getElementById('emojiContent');
    container.innerHTML = '';

    emojis.forEach(emoji => {
        const span = document.createElement('span');
        span.className = 'emoji-item';
        span.textContent = emoji;
        span.addEventListener('click', () => {
            const input = document.getElementById('messageInput');
            input.value += emoji;
            document.getElementById('emojiPicker').classList.add('hidden');
        });
        container.appendChild(span);
    });
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Message input
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Image input
    document.getElementById('imageInput').addEventListener('change', sendImage);

    // Emoji picker
    document.getElementById('emojiBtn').addEventListener('click', () => {
        document.getElementById('emojiPicker').classList.toggle('hidden');
    });

    // Close emoji picker when clicking outside
    document.addEventListener('click', (e) => {
        const picker = document.getElementById('emojiPicker');
        const btn = document.getElementById('emojiBtn');
        if (!picker.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
            picker.classList.add('hidden');
        }
    });

    // Search users
    document.getElementById('searchChat').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        document.querySelectorAll('.user-item').forEach(el => {
            const name = el.querySelector('h4').textContent.toLowerCase();
            el.style.display = name.includes(val) ? 'flex' : 'none';
        });
    });

    // Header menu
    document.getElementById('headermenu').addEventListener('click', () => {
        document.getElementById('mainDropdown').classList.toggle('show');
        document.getElementById('settingsDropdown').classList.remove('show');
    });

    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', () => {
        document.getElementById('mainDropdown').classList.remove('show');
        document.getElementById('settingsDropdown').classList.toggle('show');
    });

    // Back to menu
    document.getElementById('backToMenuBtn').addEventListener('click', () => {
        document.getElementById('settingsDropdown').classList.remove('show');
        document.getElementById('mainDropdown').classList.toggle('show');
    });

    // Dark mode toggle
    document.getElementById('darkBtn').addEventListener('click', () => {
        darkMode = !darkMode;
        document.body.classList.toggle('dark-mode', darkMode);
        document.getElementById('darkModeToggle').classList.toggle('active', darkMode);
        localStorage.setItem('unichat_dark', darkMode);

        // Close menu
        document.getElementById('settingsDropdown').classList.remove('show');
    });

    // Active status toggle
    document.getElementById('statusBtn').addEventListener('click', async () => {
        activeStatus = !activeStatus;
        document.getElementById('statusToggle').classList.toggle('active', activeStatus);

        if (currentUser) {
            await db.ref('users/' + currentUser.uid).update({
                status: activeStatus ? 'online' : 'offline'
            });
        }

        // Close menu
        document.getElementById('settingsDropdown').classList.remove('show');
    });

    // Edit profile from header menu
    document.getElementById('editBtn').addEventListener('click', () => {
        document.getElementById('settingsDropdown').classList.remove('show');
        openEditProfile();
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        if (currentUser) {
            await db.ref('users/' + currentUser.uid).update({ status: 'offline' });
            await auth.signOut();
        }
        location.reload();
    });

    // Right sidebar - open profile
    document.getElementById('openProfileBtn').addEventListener('click', () => {
        document.getElementById('sidebarViewMode').classList.remove('hidden');
        document.getElementById('sidebarEditMode').classList.add('hidden');
        document.getElementById('rightSidebar').classList.add('active');
    });

    // Right sidebar - close
    document.getElementById('closeSidebarBtn').addEventListener('click', () => {
        document.getElementById('rightSidebar').classList.remove('active');
    });
// right sidebar - edit profile button
document.getElementById('editProfileBtn').addEventListener('click', () => {
    openEditProfile();
});

// Open edit profile
function openEditProfile() {
    if (!currentUserData) return;

    document.getElementById('sidebarViewMode').classList.add('hidden');
    document.getElementById('sidebarEditMode').classList.remove('hidden');
    document.getElementById('rightSidebar').classList.add('active');

    document.getElementById('editSidebarName').value = currentUserData.name;
    document.getElementById('editSidebarBio').value = currentUserData.bio || 'Hey there! I am using Unichat.';
    document.getElementById('editProfileAvatar').textContent = currentUserData.name.charAt(0).toUpperCase();
}

// Save profile
document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    const name = document.getElementById('editSidebarName').value.trim();
    const bio = document.getElementById('editSidebarBio').value.trim();

    if (!name) return alert('Name cannot be empty');

    try {
        await db.ref('users/' + currentUser.uid).update({
            name: name,
            bio: bio
        });

        alert('Profile updated successfully!');
        document.getElementById('rightSidebar').classList.remove('active');
    } catch (err) {
        alert('Error updating profile: ' + err.message);
    }
});

// Close edit sidebar
document.getElementById('closeEditBtn').addEventListener('click', () => {
    document.getElementById('sidebarEditMode').classList.add('hidden');
    document.getElementById('sidebarViewMode').classList.remove('hidden');
    document.getElementById('rightSidebar').classList.remove('active');
});

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    const menu = document.getElementById('headermenu');
    const mainDropdown = document.getElementById('mainDropdown');
    const settingsDropdown = document.getElementById('settingsDropdown');

    if (!menu.contains(e.target) && !e.target.closest('.dropdown-menu')) {
        mainDropdown.classList.remove('show');
        settingsDropdown.classList.remove('show');
    }
});

// ============================================
// AUDIO CALL (Simulation)
// ============================================
document.querySelector('.call-btn.audio').addEventListener('click', () => {
    if (!activeChatUser) return alert('Select a user first');
    const confirmCall = confirm(`Call ${activeChatUser.name}?`);
    if (confirmCall) {
        alert(`Calling ${activeChatUser.name}... (Feature coming soon)`);
    }
});

// ============================================
// VIDEO CALL (Simulation)
// ============================================
document.querySelector('.call-btn.video').addEventListener('click', () => {
    if (!activeChatUser) return alert('Select a user first');
    const confirmCall = confirm(`Video call ${activeChatUser.name}?`);
    if (confirmCall) {
        alert(`Starting video call with ${activeChatUser.name}... (Feature coming soon)`);
    }
});

// ============================================
// CREATE GROUP (Simulation)
// ============================================
document.getElementById('createGroupBtn').addEventListener('click', () => {
    const groupName = prompt('Enter group name:');
    if (groupName) {
        alert(`Group "${groupName}" created! (Feature coming soon)`);
    }
});

// ============================================
// BLOCK USER (Simulation)
// ============================================
document.getElementById('blockBtn').addEventListener('click', () => {
    if (!activeChatUser) return;
    const confirm = confirm(`Block ${activeChatUser.name}?`);
    if (confirm) {
        alert(`${activeChatUser.name} has been blocked.`);
        document.getElementById('rightSidebar').classList.remove('active');
    }
});

// ============================================
// MICROPHONE (Simulation)
// ============================================
document.getElementById('micBtn').addEventListener('click', () => {
    alert('Voice message feature coming soon!');
});

// ============================================
// AUTH STATE CHANGE
// ============================================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // User is logged in
        console.log('User logged in:', user.email);
    } else {
        // User is logged out
        console.log('User logged out');
    }
});