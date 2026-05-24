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
let currentUser = {
    name: "User",
    username: "user123",
    bio: "Hey there! I am using Unichat.",
    isOnline: true,
    darkMode: false,
    profilePic: ""
};

let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let chatMessages = {};

// ==============================
// LOCAL STORAGE
// ==============================
function saveCurrentState() {
    localStorage.setItem(
        'unichatUser',
        JSON.stringify(currentUser)
    );
}

function loadSavedState() {
    const savedUser =
        localStorage.getItem('unichatUser');

    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        return true;
    }

    return false;
}

function clearSession() {
    localStorage.removeItem('unichatUser');
}

function saveChatMessages() {
    localStorage.setItem(
        'unichatMessages',
        JSON.stringify(chatMessages)
    );
}

function loadChatMessages() {
    const saved =
        localStorage.getItem('unichatMessages');

    if (saved) {
        chatMessages = JSON.parse(saved);
    }
}

// ==============================
// SPLASH SCREEN
// ==============================
function startApp() {

    const splash =
        document.getElementById('splashScreen');

    if (splash) {
        splash.classList.add('hidden');
    }

    setTimeout(() => {

        loadChatMessages();

        if (loadSavedState()) {

            showDashboardLoggedIn();

        } else {

            document
                .querySelector('.auth-container')
                ?.classList.remove('hidden');
        }

    }, 500);
}

window.startApp = startApp;

// ==============================
// DASHBOARD
// ==============================
function showDashboardLoggedIn() {

    document
        .querySelector('.auth-container')
        ?.classList.add('hidden');

    const dashboard =
        document.getElementById('dashboard');

    if (dashboard) {
        dashboard.style.display = 'flex';
    }

    applyUserSettings();
}

function applyUserSettings() {

    const menuUserName =
        document.getElementById('menuUserName');

    const menuAvatar =
        document.getElementById('menuAvatar');

    if (menuUserName) {
        menuUserName.textContent = currentUser.name;
    }

    if (menuAvatar) {

        menuAvatar.textContent =
            currentUser.name.charAt(0).toUpperCase();

        if (currentUser.profilePic) {

            menuAvatar.style.backgroundImage =
                currentUser.profilePic;

            menuAvatar.style.backgroundSize = 'cover';

            menuAvatar.style.backgroundPosition = 'center';
        }
    }

    const profileStatus =
        document.querySelector('.profile-status');

    if (profileStatus) {

        profileStatus.textContent =
            currentUser.isOnline
                ? '● Online'
                : '○ Offline';
    }

    const darkToggle =
        document.getElementById('darkModeToggle');

    if (currentUser.darkMode) {

        document.body.classList.add('dark-mode');

        darkToggle?.classList.add('active');

    } else {

        document.body.classList.remove('dark-mode');

        darkToggle?.classList.remove('active');
    }

    updateProfileView();
}

// ==============================
// AUTH FORMS
// ==============================
document
    .getElementById('showSignin')
    ?.addEventListener('click', (e) => {

        e.preventDefault();

        document
            .getElementById('signupForm')
            .classList.add('hidden');

        document
            .getElementById('signinForm')
            .classList.remove('hidden');
    });

document
    .getElementById('showSignup')
    ?.addEventListener('click', (e) => {

        e.preventDefault();

        document
            .getElementById('signinForm')
            .classList.add('hidden');

        document
            .getElementById('signupForm')
            .classList.remove('hidden');
    });

// ==============================
// SIGNUP
// ==============================
const signupForm =
    document.getElementById('signupFormElement');

if (signupForm) {

    signupForm.addEventListener('submit', async (e) => {

        e.preventDefault();

        const name =
            document.getElementById('signupName').value.trim();

        const username =
            document.getElementById('signupUsername').value.trim();

        const email =
            document.getElementById('signupGmail').value.trim();

        const password =
            document.getElementById('signupPassword').value;

        const confirmPassword =
            document.getElementById('signupConfirmPassword').value;

        if (
            !name ||
            !username ||
            !email ||
            !password
        ) {
            alert('Please fill all fields!');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }

        try {

            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            currentUser.name = name;
            currentUser.username = username;

            saveCurrentState();

            alert('Account created successfully!');

            document
                .getElementById('signupForm')
                .classList.add('hidden');

            document
                .getElementById('signinForm')
                .classList.remove('hidden');

        } catch (error) {

            console.error(error);
            alert(error.message);
        }
    });
}

// ==============================
// LOGIN
// ==============================
const signinForm =
    document.getElementById('signinFormElement');

if (signinForm) {

    signinForm.addEventListener('submit', async (e) => {

        e.preventDefault();

        const email =
            document.getElementById('signinUsername').value.trim();

        const password =
            document.getElementById('signinPassword').value;

        try {

            const userCredential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            currentUser.name = userCredential.user.email;
            currentUser.username = userCredential.user.email;

            saveCurrentState();

            showDashboardLoggedIn();

            alert('Login successful!');

        } catch (error) {

            console.error(error);
            alert(error.message);
        }
    });
}

// ==============================
// LOGOUT
// ==============================
async function logout() {

    try {

        await signOut(auth);

        clearSession();

        document.getElementById('dashboard')
            .style.display = 'none';

        document
            .querySelector('.auth-container')
            ?.classList.remove('hidden');

        document
            .getElementById('signinForm')
            .classList.add('hidden');

        document
            .getElementById('signupForm')
            .classList.remove('hidden');

        alert('Logged out successfully!');

    } catch (error) {

        console.error(error);
        alert(error.message);
    }
}

window.logout = logout;

// ==============================
// AUTH STATE
// ==============================
onAuthStateChanged(auth, (user) => {

    if (user) {

        console.log('Logged in:', user.email);

    } else {

        console.log('No user');
    }
});

// ==============================
// MENU
// ==============================
// ==============================
// MENU FUNCTIONS
// ==============================

function toggleMenu() {
    const mainDropdown = document.getElementById('mainDropdown');
    const settingsDropdown = document.getElementById('settingsDropdown');

    if (!mainDropdown) return;

    // Close settings menu first
    settingsDropdown.style.display = 'none';

    if (mainDropdown.style.display === 'block') {
        mainDropdown.style.display = 'none';
    } else {
        mainDropdown.style.display = 'block';
    }
}

function showSettings() {
    document.getElementById('mainDropdown').style.display = 'none';
    document.getElementById('settingsDropdown').style.display = 'block';
}

function showMainMenu() {
    document.getElementById('settingsDropdown').style.display = 'none';
    document.getElementById('mainDropdown').style.display = 'block';
}

// Close dropdown if clicked outside
document.addEventListener('click', (e) => {
    const menuHeader = document.querySelector('.menu-header');

    if (menuHeader && !menuHeader.contains(e.target)) {
        document.getElementById('mainDropdown').style.display = 'none';
        document.getElementById('settingsDropdown').style.display = 'none';
    }
});

// ==============================
// STATUS TOGGLE
// ==============================

function toggleStatus() {
    const toggle = document.getElementById('statusToggle');

    if (!toggle) return;

    toggle.classList.toggle('active');

    currentUser.isOnline = toggle.classList.contains('active');

    const profileStatus = document.querySelector('.profile-status');

    if (profileStatus) {
        profileStatus.textContent = currentUser.isOnline
            ? '● Online'
            : '○ Offline';
    }

    saveCurrentState();
}

// ==============================
// DARK MODE
// ==============================

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');

    const toggle = document.getElementById('darkModeToggle');

    if (toggle) {
        toggle.classList.toggle('active');
    }

    currentUser.darkMode =
        document.body.classList.contains('dark-mode');

    saveCurrentState();
}

// ==============================
// RIGHT SIDEBAR
// ==============================

function toggleRightSidebar() {
    const sidebar = document.getElementById('rightSidebar');

    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

// ==============================
// EMOJI PICKER
// ==============================

const emojis = [
    '😀', '😂', '😍', '😎', '😭',
    '🔥', '❤️', '👍', '🎉', '😅',
    '🥳', '🤖', '😡', '😴', '💯',
    '✨', '😇', '🙌', '😜', '🤩'
];

function addEmoji() {
    const picker = document.getElementById('emojiPicker');

    if (!picker) return;

    picker.classList.toggle('active');

    const grid = document.getElementById('emojiGrid');

    if (!grid) return;

    // Prevent duplicate emojis
    if (grid.innerHTML !== '') return;

    emojis.forEach((emoji) => {
        const span = document.createElement('span');

        span.textContent = emoji;
        span.classList.add('emoji-item');

        span.addEventListener('click', () => {
            const input = document.getElementById('messageInput');

            input.value += emoji;
            input.focus();
        });

        grid.appendChild(span);
    });
}

function showEmojiTab(tab) {
    const emojiTab = document.getElementById('emojiTab');
    const gifTab = document.getElementById('gifTab');

    if (tab === 'emoji') {
        emojiTab.classList.add('active');
        gifTab.classList.remove('active');
    } else {
        gifTab.classList.add('active');
        emojiTab.classList.remove('active');
    }
}

function searchEmojiGif(value) {
    console.log("Searching:", value);
}

// ==============================
// SEND MESSAGE
// ==============================

async function sendMessage() {
    const input = document.getElementById('messageInput');

    if (!input) return;

    const messageText = input.value.trim();

    if (messageText === '') return;

    try {
        await addDoc(collection(db, 'messages'), {
            text: messageText,
            sender: currentUser.name,
            createdAt: serverTimestamp()
        });

        input.value = '';

    } catch (error) {
        console.error(error);
        alert('Failed to send message');
    }
}

// ==============================
// HANDLE ENTER KEY
// ==============================

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
}

// ==============================
// MESSAGE UI
// ==============================

function addMessageToUI(text, type) {
    const messagesContainer =
        document.querySelector('.chat-messages');

    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type);

    const textSpan = document.createElement('span');
    textSpan.textContent = text;

    const timeSpan = document.createElement('span');
    timeSpan.classList.add('timestamp');

    timeSpan.textContent = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    messageDiv.appendChild(textSpan);
    messageDiv.appendChild(timeSpan);

    messagesContainer.appendChild(messageDiv);

    // Auto scroll
    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
}

// ==============================
// LOAD MESSAGES REALTIME
// ==============================

const messagesQuery = query(
    collection(db, 'messages'),
    orderBy('createdAt', 'asc')
);

onSnapshot(messagesQuery, (snapshot) => {
    const messagesContainer =
        document.querySelector('.chat-messages');

    if (!messagesContainer) return;

    messagesContainer.innerHTML = '';

    snapshot.forEach((doc) => {
        const data = doc.data();

        const type =
            data.sender === currentUser.name
                ? 'sent'
                : 'received';

        addMessageToUI(data.text, type);
    });
});

// ==============================
// AUDIO RECORDING
// ==============================

async function startRecording() {
    try {
        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });

        mediaRecorder = new MediaRecorder(stream);

        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, {
                type: 'audio/webm'
            });

            const audioUrl =
                URL.createObjectURL(audioBlob);

            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = audioUrl;

            const messageDiv =
                document.createElement('div');

            messageDiv.classList.add('message', 'sent');
            messageDiv.appendChild(audio);

            document
                .querySelector('.chat-messages')
                .appendChild(messageDiv);
        };

        mediaRecorder.start();

        isRecording = true;

    } catch (error) {
        console.error(error);
        alert('Microphone permission denied');
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
    }
}

// ... existing code above ...

// ==============================
// CALL FUNCTIONS
// ==============================

function startAudioCall() {
    alert('📞 Audio Call Started');
}

function startVideoCall() {
    alert('📹 Video Call Started');
}

// ==============================
// INITIALIZE APP
// ==============================

document.addEventListener('DOMContentLoaded', () => {
    loadSavedState();
    loadChatMessages();
    applyUserSettings();

    const splash = document.getElementById('splashScreen');

    if (splash) {
        splash.addEventListener('click', startApp);
    }
});

// ==============================
// EDIT PROFILE LOGIC
// ==============================

function openSidebarEditProfile() {
    const sidebar = document.getElementById('rightSidebar');
    const viewMode = document.getElementById('sidebarViewMode');
    const editMode = document.getElementById('sidebarEditMode');

    // Open sidebar if not open
    if (sidebar) {
        sidebar.classList.add('active');
    }

    // Switch to Edit Mode
    if (viewMode) viewMode.style.display = 'none';
    if (editMode) editMode.style.display = 'block';

    // Populate fields with current user data
    const nameInput = document.getElementById('editSidebarName');
    const usernameInput = document.getElementById('editSidebarUsername');
    const bioInput = document.getElementById('editSidebarBio');
    const editAvatar = document.getElementById('editProfileAvatar');

    if (nameInput) nameInput.value = currentUser.name;
    if (usernameInput) usernameInput.value = currentUser.username;
    if (bioInput) bioInput.value = currentUser.bio;

    // Update avatar preview
    if (editAvatar) {
        if (currentUser.profilePic) {
            editAvatar.style.backgroundImage = `url(${currentUser.profilePic})`;
            editAvatar.style.backgroundSize = 'cover';
            editAvatar.textContent = '';
        } else {
            editAvatar.style.backgroundImage = 'none';
            editAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
        }
    }
}

function previewProfilePic(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const editAvatar = document.getElementById('editProfileAvatar');
            
            // Update preview instantly
            if (editAvatar) {
                editAvatar.style.backgroundImage = `url(${e.target.result})`;
                editAvatar.style.backgroundSize = 'cover';
                editAvatar.textContent = '';
            }
            
            // Temporarily save to current user object
            currentUser.profilePic = e.target.result;
        }

        reader.readAsDataURL(file);
    }
}

function saveSidebarProfile() {
    const nameInput = document.getElementById('editSidebarName');
    const usernameInput = document.getElementById('editSidebarUsername');
    const bioInput = document.getElementById('editSidebarBio');

    // Validation
    if (nameInput && nameInput.value.trim() === "") {
        alert("Name cannot be empty!");
        return;
    }

    // Update Global User Object
    if (nameInput) currentUser.name = nameInput.value;
    if (usernameInput) currentUser.username = usernameInput.value;
    if (bioInput) currentUser.bio = bioInput.value;

    // Save to Local Storage
    saveCurrentState();

    // Update UI (Header)
    applyUserSettings();

    // Close Sidebar
    closeSidebarEditMode();
    
    alert('Profile updated successfully!');
}

function closeSidebarEditMode() {
    const sidebar = document.getElementById('rightSidebar');
    const viewMode = document.getElementById('sidebarViewMode');
    const editMode = document.getElementById('sidebarEditMode');

    // Close sidebar
    if (sidebar) {
        sidebar.classList.remove('active');
    }

    // Switch back to View Mode for next time
    if (editMode) editMode.style.display = 'none';
    if (viewMode) viewMode.style.display = 'block';
}

function switchUser() {
    if (confirm("Are you sure you want to switch accounts? This will log you out.")) {
        logout();
    }
}

// ==============================
// GLOBAL WINDOW FUNCTIONS
// ==============================

window.toggleMenu = toggleMenu;
window.showSettings = showSettings;
window.showMainMenu = showMainMenu;
window.toggleStatus = toggleStatus;
window.toggleDarkMode = toggleDarkMode;
window.toggleRightSidebar = toggleRightSidebar;
window.openSidebarEditProfile = openSidebarEditProfile;         // NOW THIS WILL WORK
window.previewProfilePic = previewProfilePic;
window.saveSidebarProfile = saveSidebarProfile;
window.closeSidebarEditMode = closeSidebarEditMode;
window.switchUser = switchUser;
window.sendMessage = sendMessage;
window.handleKeyPress = handleKeyPress;
window.addEmoji = addEmoji;
window.showEmojiTab = showEmojiTab;
window.searchEmojiGif = searchEmojiGif;
window.startRecording = startRecording;
window.stopRecording = stopRecording;
window.startAudioCall = startAudioCall;
window.startVideoCall = startVideoCall;
window.logout = logout;