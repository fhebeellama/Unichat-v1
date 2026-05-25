// ============================================
// FIREBASE CONFIGURATION
// ============================================
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
    if (darkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle').classList.add('active');
    }

    // Splash screen click — NOW WORKS
    document.getElementById('splashScreen').addEventListener('click', () => {
        document.getElementById('splashScreen').classList.add('hidden');
        document.querySelector('.auth-container').classList.remove('hidden');
    });

    setupAuthForms();
    setupEventListeners();

    // ✅ FIXED Auth state listener — splash no longer blocks screen
    auth.onAuthStateChanged(user => {
        // Always hide splash first
        document.getElementById('splashScreen').classList.add('hidden');

        if (user) {
            // Already logged in → go straight to app
            enterApp(user);
        } else {
            // Not logged in → show login/register
            document.querySelector('.auth-container').classList.remove('hidden');
        }
    });
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

            const userCred = await auth.createUserWithEmailAndPassword(email, password);
            const uid = userCred.user.uid;

            await db.ref('users/' + uid).set({
                uid: uid,
                name: name,
                email: email,
                bio: 'Hey there! I am using Unichat.',
                pic: 'https://i.pravatar.cc/150?u=' + uid,
                status: 'online',
                createdAt: Date.now()
            });

            btn.textContent = 'Create Account';
            btn.disabled = false;
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

            const userCred = await auth.signInWithEmailAndPassword(email, password);
            await db.ref('users/' + userCred.user.uid).update({ status: 'online' });

            btn.textContent = 'Sign In';
            btn.disabled = false;
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
    document.getElementById('dashboard').style.display = 'flex';
    loadUserProfile();
    loadUserList();
    loadEmojis();
    setupEditProfile();
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
            const letter = data.name.charAt(0).toUpperCase();
            document.getElementById('menuAvatar').textContent = letter;
            document.getElementById('menuUserName').textContent = data.name;
            document.getElementById('menuUserStatus').textContent = data.status === 'online' ? '● Online' : '○ Offline';
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

    userListListener = db.ref('users').on('child_added', (snap) => {
        const user = snap.val();
        if (user.uid === currentUser.uid) return;

        const el = document.createElement('div');
        el.className = 'user-item';
        const letter = user.name.charAt(0).toUpperCase();
        el.innerHTML = `
            <div class="user-avatar">
                ${letter}
                <span class="status-indicator ${user.status === 'online' ? 'online' : ''}"></span>
            </div>
            <div class="user-info">
                <h4>${user.name}</h4>
                <p>${user.status === 'online' ? 'Online' : 'Offline'}</p>
            </div>
        `;
        el.addEventListener('click', () => openChat(user));
        list.appendChild(el);
    });

    // Update status in realtime
    db.ref('users').on('child_changed', (snap) => {
        const user = snap.val();
        if (user.uid === currentUser.uid) return;
        const items = list.querySelectorAll('.user-item');
        items.forEach(item => {
            if (item.querySelector('h4').textContent === user.name) {
                item.querySelector('.status-indicator').className = 'status-indicator ' + (user.status === 'online' ? 'online' : '');
                item.querySelector('p').textContent = user.status === 'online' ? 'Online' : 'Offline';
            }
        });
    });
}

// ============================================
// OPEN CHAT
// ============================================
function openChat(user) {
    activeChatUser = user;
    const letter = user.name.charAt(0).toUpperCase();

    document.getElementById('chatHeaderAvatar').textContent = letter;
    document.getElementById('chatHeaderName').textContent = user.name;
    document.getElementById('chatHeaderStatus').className = 'status-indicator ' + (user.status === 'online' ? 'online' : '');
    document.getElementById('chatHeaderStatusText').textContent = user.status === 'online' ? 'Online' : 'Offline';

    document.getElementById('profileAvatar').textContent = letter;
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileBio').textContent = user.bio || 'No bio';
    document.getElementById('profileStatus').textContent = user.status === 'online' ? '● Online' : '○ Offline';
    document.getElementById('profileStatusIndicator').className = 'status-indicator ' + (user.status === 'online' ? 'online' : '');

    loadMessages(user.uid);
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
        div.className = 'message ' + (isMe ? 'sent' : 'received');

        if (msg.type === 'image') {
            div.innerHTML = `<img src="${msg.fileUrl}" alt="image" style="max-width: 200px; border-radius: 8px;"><span class="time">${msg.time}</span>`;
        } else {
            div.innerHTML = msg.text + '<span class="time">' + msg.time + '</span>';
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
    const emojis = ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '🥰', '😘', '😗', '😙', '😚', '🙂', '🤗', '🤩', '🤔', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '🥱', '😴', '😌', '😛', '😜', '😝', '😒', '😓', '😔', '😕', '🤑', '😲', '☹️', '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '🤯', '😬', '😰', '😱', '🥶', '🥵', '😳', '😡', '😠', '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '😇'];

    const container = document.getElementById('emojiContent');
    container.innerHTML = '';

    emojis.forEach(emoji => {
        const span = document.createElement('span');
        span.className = 'emoji-item';
        span.textContent = emoji;
        span.addEventListener('click', () => {
            document.getElementById('messageInput').value += emoji;
            document.getElementById('emojiPicker').classList.add('hidden');
        });
        container.appendChild(span);
    });
}

// ============================================
// EDIT PROFILE FUNCTIONS
// ============================================
function setupEditProfile() {
    // Open edit from menu
    document.getElementById('editBtn').addEventListener('click', openEditProfile);
    // Open edit from sidebar
    document.getElementById('editProfileBtn').addEventListener('click', openEditProfile);
    // Save changes
    document.getElementById('saveProfileBtn').addEventListener('click', saveProfileChanges);
    // Close edit
    document.getElementById('closeEditBtn').addEventListener('click', () => {
        document.getElementById('sidebarEditMode').classList.add('hidden');
        document.getElementById('sidebarViewMode').classList.remove('hidden');
    });
}

function openEditProfile() {
    document.getElementById('sidebarViewMode').classList.add('hidden');
    document.getElementById('sidebarEditMode').classList.remove('hidden');
    document.getElementById('rightSidebar').classList.add('active');
    document.getElementById('settingsDropdown').classList.remove('show');
}

async function saveProfileChanges() {
    const newName = document.getElementById('editSidebarName').value.trim();
    const newBio = document.getElementById('editSidebarBio').value.trim();

    if (!newName) return alert('Name cannot be empty');

    try {
        await db.ref('users/' + currentUser.uid).update({
            name: newName,
            bio: newBio
        });
        alert('Profile updated!');
        document.getElementById('sidebarEditMode').classList.add('hidden');
        document.getElementById('sidebarViewMode').classList.remove('hidden');
    } catch (err) {
        alert('Error updating: ' + err.message);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Send message
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Send image
    document.getElementById('imageInput').addEventListener('change', sendImage);

    // Emoji picker
    document.getElementById('emojiBtn').addEventListener('click', () => {
        document.getElementById('emojiPicker').classList.toggle('hidden');
    });

    // Close emoji picker
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

    // ✅ FIXED Header menu — dropdown now works
    document.getElementById('headermenu').addEventListener('click', () => {
        document.getElementById('mainDropdown').classList.toggle('show');
        document.getElementById('settingsDropdown').classList.remove('show');
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
        document.getElementById('mainDropdown').classList.remove('show');
        document.getElementById('settingsDropdown').classList.toggle('show');
    });

    document.getElementById('backToMenuBtn').addEventListener('click', () => {
        document.getElementById('settingsDropdown').classList.remove('show');
        document.getElementById('mainDropdown').classList.toggle('show');
    });

    // Dark mode
    document.getElementById('darkBtn').addEventListener('click', () => {
        darkMode = !darkMode;
        document.body.classList.toggle('dark-mode', darkMode);
        document.getElementById('darkModeToggle').classList.toggle('active', darkMode);
        localStorage.setItem('unichat_dark', darkMode);
        document.getElementById('settingsDropdown').classList.remove('show');
    });

    // Active status
    document.getElementById('statusBtn').addEventListener('click', async () => {
        activeStatus = !activeStatus;
        document.getElementById('statusToggle').classList.toggle('active', activeStatus);
        if (currentUser) {
            await db.ref('users/' + currentUser.uid).update({
                status: activeStatus ? 'online' : 'offline'
            });
        }
        document.getElementById('settingsDropdown').classList.remove('show');
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
}