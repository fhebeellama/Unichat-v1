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

// ============================================
// INITIALIZE FIREBASE
// ============================================
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

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

// ============================================
// HELPER FUNCTIONS
// ============================================
function $(id) {
    return document.getElementById(id);
}

function addListener(id, event, callback) {
    const el = $(id);

    if (el) {
        el.addEventListener(event, callback);
    }
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {

    // Dark Mode
    if (darkMode) {
        document.body.classList.add('dark-mode');

        if ($('darkModeToggle')) {
            $('darkModeToggle').classList.add('active');
        }
    }

    // Splash Screen
    addListener('splashScreen', 'click', () => {
        $('splashScreen').classList.add('hidden');

        const authContainer = document.querySelector('.auth-container');

        if (authContainer) {
            authContainer.classList.remove('hidden');
        }
    });

    setupAuthForms();
    setupEventListeners();
    loadEmojis();

    // Auth Listener
    auth.onAuthStateChanged((user) => {

        if ($('splashScreen')) {
            $('splashScreen').classList.add('hidden');
        }

        if (user) {

            enterApp(user);

        } else {

            const authContainer = document.querySelector('.auth-container');

            if (authContainer) {
                authContainer.classList.remove('hidden');
            }

            if ($('dashboard')) {
                $('dashboard').style.display = 'none';
            }
        }
    });
});

// ============================================
// AUTH FORMS
// ============================================
function setupAuthForms() {

    addListener('showSignin', 'click', (e) => {
        e.preventDefault();

        $('signupForm').classList.add('hidden');
        $('signinForm').classList.remove('hidden');
    });

    addListener('showSignup', 'click', (e) => {
        e.preventDefault();

        $('signinForm').classList.add('hidden');
        $('signupForm').classList.remove('hidden');
    });

    // SIGN UP
    const signupForm = $('signupFormElement');

    if (signupForm) {

        signupForm.addEventListener('submit', async (e) => {

            e.preventDefault();

            const name = $('signupName').value.trim();
            const email = $('signupEmail').value.trim();
            const password = $('signupPassword').value;
            const confirm = $('signupConfirmPassword').value;

            if (!name) {
                alert('Please enter your name');
                return;
            }

            if (password !== confirm) {
                alert('Passwords do not match');
                return;
            }

            if (password.length < 6) {
                alert('Password must be at least 6 characters');
                return;
            }

            const btn = signupForm.querySelector('.btn');

            try {

                btn.disabled = true;
                btn.textContent = 'Creating...';

                const userCred = await auth.createUserWithEmailAndPassword(email, password);

                const uid = userCred.user.uid;

                await db.ref('users/' + uid).set({
                    uid,
                    name,
                    email,
                    bio: 'Hey there! I am using Unichat.',
                    pic: '',
                    status: 'online',
                    createdAt: Date.now()
                });

                btn.textContent = 'Create Account';
                btn.disabled = false;

            } catch (err) {

                alert(err.message);

                btn.textContent = 'Create Account';
                btn.disabled = false;
            }
        });
    }

    // SIGN IN
    const signinForm = $('signinFormElement');

    if (signinForm) {

        signinForm.addEventListener('submit', async (e) => {

            e.preventDefault();

            const email = $('signinEmail').value.trim();
            const password = $('signinPassword').value;

            if (!email || !password) {
                alert('Please enter email and password');
                return;
            }

            const btn = signinForm.querySelector('.btn');

            try {

                btn.disabled = true;
                btn.textContent = 'Signing in...';

                const userCred = await auth.signInWithEmailAndPassword(email, password);

                await db.ref('users/' + userCred.user.uid).update({
                    status: 'online'
                });

                btn.textContent = 'Sign In';
                btn.disabled = false;

            } catch (err) {

                alert(err.message);

                btn.textContent = 'Sign In';
                btn.disabled = false;
            }
        });
    }
}

// ============================================
// ENTER APP
// ============================================
function enterApp(user) {

    currentUser = user;

    const authContainer = document.querySelector('.auth-container');

    if (authContainer) {
        authContainer.classList.add('hidden');
    }

    if ($('dashboard')) {
        $('dashboard').style.display = 'flex';
    }

    loadUserProfile();
    loadUserList();
    setupEditProfile();
}

// ============================================
// LOAD USER PROFILE
// ============================================
function loadUserProfile() {

    if (!currentUser) return;

    db.ref('users/' + currentUser.uid).on('value', (snap) => {

        const data = snap.val();

        if (!data) return;

        currentUserData = data;

        const letter = data.name.charAt(0).toUpperCase();

        if ($('menuAvatar')) $('menuAvatar').textContent = letter;
        if ($('menuUserName')) $('menuUserName').textContent = data.name;

        if ($('menuUserStatus')) {
            $('menuUserStatus').textContent =
                data.status === 'online'
                    ? '● Online'
                    : '○ Offline';
        }

        if ($('editSidebarName')) {
            $('editSidebarName').value = data.name;
        }

        if ($('editSidebarBio')) {
            $('editSidebarBio').value =
                data.bio || 'Hey there! I am using Unichat.';
        }

        if ($('editProfileAvatar')) {
            $('editProfileAvatar').textContent = letter;
        }
    });
}

// ============================================
// LOAD USER LIST
// ============================================
function loadUserList() {

    const list = $('userList');

    if (!list) return;

    db.ref('users').off();

    db.ref('users').on('value', (snap) => {

        list.innerHTML = '';

        snap.forEach((child) => {

            const user = child.val();

            if (!user || user.uid === currentUser.uid) return;

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
    });
}

// ============================================
// OPEN CHAT
// ============================================
function openChat(user) {

    activeChatUser = user;

    const letter = user.name.charAt(0).toUpperCase();

    if ($('chatHeaderAvatar')) $('chatHeaderAvatar').textContent = letter;
    if ($('chatHeaderName')) $('chatHeaderName').textContent = user.name;

    if ($('chatHeaderStatus')) {
        $('chatHeaderStatus').className =
            'status-indicator ' +
            (user.status === 'online' ? 'online' : '');
    }

    if ($('chatHeaderStatusText')) {
        $('chatHeaderStatusText').textContent =
            user.status === 'online'
                ? 'Online'
                : 'Offline';
    }

    if ($('profileAvatar')) $('profileAvatar').textContent = letter;
    if ($('profileName')) $('profileName').textContent = user.name;

    if ($('profileBio')) {
        $('profileBio').textContent = user.bio || 'No bio';
    }

    if ($('profileStatus')) {
        $('profileStatus').textContent =
            user.status === 'online'
                ? '● Online'
                : '○ Offline';
    }

    if ($('profileStatusIndicator')) {
        $('profileStatusIndicator').className =
            'status-indicator ' +
            (user.status === 'online' ? 'online' : '');
    }

    loadMessages(user.uid);

    if ($('rightSidebar')) {
        $('rightSidebar').classList.remove('active');
    }
}

// ============================================
// LOAD MESSAGES
// ============================================
function loadMessages(chatUid) {

    const chatEl = $('chatMessages');

    if (!chatEl) return;

    chatEl.innerHTML = '';

    const chatId = [currentUser.uid, chatUid]
        .sort()
        .join('_');

    db.ref('chats/' + chatId).off();

    db.ref('chats/' + chatId)
        .orderByChild('createdAt')
        .on('value', (snap) => {

            chatEl.innerHTML = '';

            if (!snap.exists()) {

                chatEl.innerHTML =
                    '<p class="no-messages">No messages yet</p>';

                return;
            }

            snap.forEach((child) => {

                const msg = child.val();

                const isMe = msg.sender === currentUser.uid;

                const div = document.createElement('div');

                div.className =
                    'message ' + (isMe ? 'sent' : 'received');

                // IMAGE
                if (msg.type === 'image') {

                    div.innerHTML = `
                        <img 
                            src="${msg.fileUrl}" 
                            alt="image"
                            style="max-width:200px;border-radius:10px;"
                        >

                        <span class="time">
                            ${msg.time}
                        </span>
                    `;

                } else {

                    const text = document.createElement('span');
                    text.textContent = msg.text;

                    const time = document.createElement('span');
                    time.className = 'time';
                    time.textContent = msg.time;

                    div.appendChild(text);
                    div.appendChild(time);
                }

                chatEl.appendChild(div);
            });

            chatEl.scrollTop = chatEl.scrollHeight;
        });
}

// ============================================
// SEND MESSAGE
// ============================================
function sendMessage() {

    if (!activeChatUser) {
        alert('Select a user first');
        return;
    }

    const input = $('messageInput');

    if (!input) return;

    const text = input.value.trim();

    if (!text) return;

    const chatId = [currentUser.uid, activeChatUser.uid]
        .sort()
        .join('_');

    const time = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    db.ref('chats/' + chatId).push({
        sender: currentUser.uid,
        text,
        type: 'text',
        time,
        createdAt: Date.now()
    });

    input.value = '';
}

// ============================================
// SEND IMAGE
// ============================================
async function sendImage() {

    if (!activeChatUser) {
        alert('Select a user first');
        return;
    }

    const fileInput = $('imageInput');

    if (!fileInput || !fileInput.files[0]) return;

    const file = fileInput.files[0];

    const chatId = [currentUser.uid, activeChatUser.uid]
        .sort()
        .join('_');

    const time = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    try {

        const storageRef = storage.ref(
            'images/' + Date.now() + '_' + file.name
        );

        const snapshot = await storageRef.put(file);

        const url = await snapshot.ref.getDownloadURL();

        await db.ref('chats/' + chatId).push({
            sender: currentUser.uid,
            type: 'image',
            fileUrl: url,
            time,
            createdAt: Date.now()
        });

        fileInput.value = '';

    } catch (err) {

        alert(err.message);
    }
}

// ============================================
// EMOJI PICKER
// ============================================
function loadEmojis() {

    const emojis = [
        '😀','😁','😂','🤣','😃','😄','😅',
        '😆','😉','😊','😍','🥰','😘','😎',
        '😭','😡','😱','🤯','🥶','🥵','😴'
    ];

    const container = $('emojiContent');

    if (!container) return;

    container.innerHTML = '';

    emojis.forEach((emoji) => {

        const span = document.createElement('span');

        span.className = 'emoji-item';

        span.textContent = emoji;

        span.addEventListener('click', () => {

            if ($('messageInput')) {
                $('messageInput').value += emoji;
            }

            if ($('emojiPicker')) {
                $('emojiPicker').classList.add('hidden');
            }
        });

        container.appendChild(span);
    });
}

// ============================================
// EDIT PROFILE
// ============================================
function setupEditProfile() {

    if ($('editBtn')) {
        $('editBtn').onclick = openEditProfile;
    }

    if ($('editProfileBtn')) {
        $('editProfileBtn').onclick = openEditProfile;
    }

    if ($('saveProfileBtn')) {
        $('saveProfileBtn').onclick = saveProfileChanges;
    }

    if ($('closeEditBtn')) {

        $('closeEditBtn').onclick = () => {

            $('sidebarEditMode').classList.add('hidden');

            $('sidebarViewMode').classList.remove('hidden');
        };
    }
}

function openEditProfile() {

    $('sidebarViewMode').classList.add('hidden');

    $('sidebarEditMode').classList.remove('hidden');

    $('rightSidebar').classList.add('active');

    if ($('settingsDropdown')) {
        $('settingsDropdown').classList.remove('show');
    }
}

async function saveProfileChanges() {

    const newName = $('editSidebarName').value.trim();

    const newBio = $('editSidebarBio').value.trim();

    if (!newName) {
        alert('Name cannot be empty');
        return;
    }

    try {

        await db.ref('users/' + currentUser.uid).update({
            name: newName,
            bio: newBio
        });

        alert('Profile updated');

        $('sidebarEditMode').classList.add('hidden');

        $('sidebarViewMode').classList.remove('hidden');

    } catch (err) {

        alert(err.message);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {

    // SEND MESSAGE
    addListener('sendBtn', 'click', sendMessage);

    addListener('messageInput', 'keydown', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // SEND IMAGE
    addListener('imageInput', 'change', sendImage);

    // EMOJI
    addListener('emojiBtn', 'click', () => {
        $('emojiPicker').classList.toggle('hidden');
    });

    // SEARCH
    addListener('searchChat', 'input', (e) => {

        const value = e.target.value.toLowerCase();

        document.querySelectorAll('.user-item').forEach((item) => {

            const name = item
                .querySelector('h4')
                .textContent
                .toLowerCase();

            item.style.display =
                name.includes(value)
                    ? 'flex'
                    : 'none';
        });
    });

    // MENU
    addListener('headermenu', 'click', () => {

        $('mainDropdown').classList.toggle('show');

        $('settingsDropdown').classList.remove('show');
    });

    addListener('settingsBtn', 'click', () => {

        $('mainDropdown').classList.remove('show');

        $('settingsDropdown').classList.toggle('show');
    });

    addListener('backToMenuBtn', 'click', () => {

        $('settingsDropdown').classList.remove('show');

        $('mainDropdown').classList.add('show');
    });

    // DARK MODE
    addListener('darkBtn', 'click', () => {

        darkMode = !darkMode;

        document.body.classList.toggle('dark-mode', darkMode);

        if ($('darkModeToggle')) {
            $('darkModeToggle').classList.toggle('active', darkMode);
        }

        localStorage.setItem('unichat_dark', darkMode);

        $('settingsDropdown').classList.remove('show');
    });

    // STATUS
    addListener('statusBtn', 'click', async () => {

        activeStatus = !activeStatus;

        if ($('statusToggle')) {
            $('statusToggle').classList.toggle('active', activeStatus);
        }

        if (currentUser) {

            await db.ref('users/' + currentUser.uid).update({
                status: activeStatus
                    ? 'online'
                    : 'offline'
            });
        }

        $('settingsDropdown').classList.remove('show');
    });

    // LOGOUT
    addListener('logoutBtn', 'click', async () => {

        try {

            if (currentUser) {

                await db.ref('users/' + currentUser.uid).update({
                    status: 'offline'
                });

                await auth.signOut();
            }

            location.reload();

        } catch (err) {

            alert(err.message);
        }
    });

    // PROFILE SIDEBAR
    addListener('openProfileBtn', 'click', () => {

        $('sidebarViewMode').classList.remove('hidden');

        $('sidebarEditMode').classList.add('hidden');

        $('rightSidebar').classList.add('active');
    });

    addListener('closeSidebarBtn', 'click', () => {

        $('rightSidebar').classList.remove('active');
    });

    // CLOSE EMOJI PICKER
    document.addEventListener('click', (e) => {

        const picker = $('emojiPicker');

        const btn = $('emojiBtn');

        if (
            picker &&
            btn &&
            !picker.contains(e.target) &&
            !btn.contains(e.target)
        ) {
            picker.classList.add('hidden');
        }
    });
}