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
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_DOMAIN.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_BUCKET.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
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
function toggleMenu() {

    const dropdown =
        document.getElementById('mainDropdown');

    if (!dropdown) return;

    dropdown.classList.toggle('hidden');
}

function showSettings() {

    document
        .getElementById('mainDropdown')
        ?.classList.add('hidden');

    document
        .getElementById('settingsDropdown')
        ?.classList.remove('hidden');
}

function showMainMenu() {

    document
        .getElementById('settingsDropdown')
        ?.classList.add('hidden');

    document
        .getElementById('mainDropdown')
        ?.classList.remove('hidden');
}

document.addEventListener('click', (e) => {

    const menuHeader =
        document.querySelector('.menu-header');

    if (
        menuHeader &&
        !menuHeader.contains(e.target)
    ) {

        document
            .getElementById('mainDropdown')
            ?.classList.add('hidden');

        document
            .getElementById('settingsDropdown')
            ?.classList.add('hidden');
    }
});

// ==============================
// STATUS
// ==============================
function toggleStatus() {

    const toggle =
        document.getElementById('statusToggle');

    toggle?.classList.toggle('active');

    currentUser.isOnline =
        toggle.classList.contains('active');

    const profileStatus =
        document.querySelector('.profile-status');

    if (profileStatus) {

        profileStatus.textContent =
            currentUser.isOnline
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

    const toggle =
        document.getElementById('darkModeToggle');

    toggle?.classList.toggle('active');

    currentUser.darkMode =
        document.body.classList.contains('dark-mode');

    saveCurrentState();
}

// ==============================
// RIGHT SIDEBAR
// ==============================
function toggleRightSidebar() {

    const sidebar =
        document.getElementById('rightSidebar');

    sidebar?.classList.toggle('active');
}

// ==============================
// PROFILE VIEW
// ==============================
function updateProfileView() {

    const profileName =
        document.getElementById('profileName');

    const profileAvatar =
        document.getElementById('profileAvatar');

    const profileBio =
        document.getElementById('profileBio');

    if (profileName) {
        profileName.textContent = currentUser.name;
    }

    if (profileAvatar) {

        profileAvatar.textContent =
            currentUser.name.charAt(0).toUpperCase();

        if (currentUser.profilePic) {

            profileAvatar.style.backgroundImage =
                currentUser.profilePic;

            profileAvatar.style.backgroundSize = 'cover';

            profileAvatar.style.backgroundPosition = 'center';
        }
    }

    if (profileBio) {
        profileBio.textContent = currentUser.bio;
    }
}

// ==============================
// OPEN EDIT PROFILE
// ==============================
function openSidebarEditProfile() {

    document
        .getElementById('mainDropdown')
        ?.classList.add('hidden');

    document
        .getElementById('settingsDropdown')
        ?.classList.add('hidden');

    document
        .getElementById('rightSidebar')
        ?.classList.add('active');

    document
        .getElementById('sidebarViewMode')
        .style.display = 'none';

    document
        .getElementById('sidebarEditMode')
        .style.display = 'block';

    document
        .getElementById('editSidebarName')
        .value = currentUser.name;

    document
        .getElementById('editSidebarUsername')
        .value = currentUser.username;

    document
        .getElementById('editSidebarBio')
        .value = currentUser.bio;
}

// ==============================
// PREVIEW PROFILE PIC
// ==============================
function previewProfilePic(event) {

    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {

        const avatar =
            document.getElementById('editProfileAvatar');

        avatar.textContent = '';

        avatar.style.backgroundImage =
            `url(${e.target.result})`;

        avatar.style.backgroundSize = 'cover';

        avatar.style.backgroundPosition = 'center';
    };

    reader.readAsDataURL(file);
}

// ==============================
// SAVE PROFILE
// ==============================
function saveSidebarProfile() {

    const newName =
        document.getElementById('editSidebarName').value;

    const newUsername =
        document.getElementById('editSidebarUsername').value;

    const newBio =
        document.getElementById('editSidebarBio').value;

    const editAvatar =
        document.getElementById('editProfileAvatar');

    const profilePic =
        editAvatar.style.backgroundImage;

    if (!newName || !newUsername) {

        alert('Name and Username are required!');
        return;
    }

    currentUser.name = newName;
    currentUser.username = newUsername;
    currentUser.bio = newBio;

    if (
        profilePic &&
        profilePic !== 'none'
    ) {
        currentUser.profilePic = profilePic;
    }

    saveCurrentState();

    applyUserSettings();

    alert('Profile updated successfully!');

    closeSidebarEditMode();
}

// ==============================
// CLOSE SIDEBAR EDIT
// ==============================
function closeSidebarEditMode() {

    document
        .getElementById('sidebarEditMode')
        .style.display = 'none';

    document
        .getElementById('sidebarViewMode')
        .style.display = 'block';

    document
        .getElementById('rightSidebar')
        .classList.remove('active');
}

// ==============================
// SWITCH USER
// ==============================
function switchUser(userName) {

    const headerName =
        document.querySelector('.chat-header h3');

    const avatar =
        document.querySelector('.chat-header .avatar');

    if (headerName) {
        headerName.textContent = userName;
    }

    if (avatar) {
        avatar.textContent =
            userName.charAt(0).toUpperCase();
    }
}

// ==============================
// SEND MESSAGE
// ==============================
async function sendMessage() {

    const input =
        document.getElementById('messageInput');

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
// LOAD MESSAGES
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
// MESSAGE UI
// ==============================
function addMessageToUI(text, type) {

    const messagesContainer =
        document.querySelector('.chat-messages');

    if (!messagesContainer) return;

    const messageDiv =
        document.createElement('div');

    messageDiv.classList.add('message', type);

    const textSpan =
        document.createElement('span');

    textSpan.textContent = text;

    const timeSpan =
        document.createElement('span');

    timeSpan.classList.add('timestamp');

    timeSpan.textContent =
        new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

    messageDiv.appendChild(textSpan);
    messageDiv.appendChild(timeSpan);

    messagesContainer.appendChild(messageDiv);

    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
}

// ==============================
// ENTER KEY
// ==============================
function handleKeyPress(event) {

    if (event.key === 'Enter') {
        sendMessage();
    }
}

// ==============================
// IMAGE UPLOAD
// ==============================
const imageInput =
    document.getElementById('imageInput');

if (imageInput) {

    imageInput.addEventListener('change', (e) => {

        const file = e.target.files[0];

        if (!file) return;

        const reader = new FileReader();

        reader.onload = function(event) {

            const messagesContainer =
                document.querySelector('.chat-messages');

            const messageDiv =
                document.createElement('div');

            messageDiv.classList.add('message', 'sent');

            const img =
                document.createElement('img');

            img.src = event.target.result;

            img.style.maxWidth = '200px';

            img.style.borderRadius = '12px';

            messageDiv.appendChild(img);

            messagesContainer.appendChild(messageDiv);
        };

        reader.readAsDataURL(file);
    });
}

// ==============================
// EMOJI PICKER
// ==============================
const emojis = [
    '😀','😂','😍','😎','😭',
    '🔥','❤️','👍','🎉','😅'
];

function addEmoji() {

    const picker =
        document.getElementById('emojiPicker');

    picker?.classList.toggle('hidden');

    const grid =
        document.getElementById('emojiGrid');

    if (!grid || grid.innerHTML !== '') return;

    emojis.forEach((emoji) => {

        const span =
            document.createElement('span');

        span.textContent = emoji;

        span.classList.add('emoji-item');

        span.onclick = () => {

            document.getElementById('messageInput')
                .value += emoji;
        };

        grid.appendChild(span);
    });
}

function showEmojiTab(tab) {

    document
        .getElementById('emojiTab')
        ?.classList.remove('active');

    document
        .getElementById('gifTab')
        ?.classList.remove('active');

    if (tab === 'emoji') {

        document
            .getElementById('emojiTab')
            ?.classList.add('active');

    } else {

        document
            .getElementById('gifTab')
            ?.classList.add('active');
    }
}

function searchEmojiGif(value) {
    console.log('Searching:', value);
}

// ==============================
// AUDIO RECORDING
// ==============================
async function startRecording() {

    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });

        mediaRecorder =
            new MediaRecorder(stream);

        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {

            const audioBlob =
                new Blob(audioChunks, {
                    type: 'audio/mp3'
                });

            const audioUrl =
                URL.createObjectURL(audioBlob);

            console.log(audioUrl);

            alert('Voice message recorded!');
        };

        mediaRecorder.start();

        isRecording = true;

    } catch (error) {

        console.error(error);

        alert('Microphone permission denied');
    }
}

function stopRecording() {

    if (
        mediaRecorder &&
        isRecording
    ) {

        mediaRecorder.stop();

        isRecording = false;
    }
}

// ==============================
// CALLS
// ==============================
function startAudioCall() {
    alert('📞 Audio Call Started');
}

function startVideoCall() {
    alert('📹 Video Call Started');
}

// ==============================
// INIT
// ==============================
document.addEventListener('DOMContentLoaded', () => {

    loadSavedState();
    loadChatMessages();
    applyUserSettings();

    const splash =
        document.getElementById('splashScreen');

    if (splash) {

        splash.addEventListener('click', () => {
            startApp();
        });
    }
});

// ==============================
// WINDOW FUNCTIONS
// ==============================
window.toggleMenu = toggleMenu;
window.showSettings = showSettings;
window.showMainMenu = showMainMenu;
window.toggleStatus = toggleStatus;
window.toggleDarkMode = toggleDarkMode;
window.toggleRightSidebar = toggleRightSidebar;
window.openSidebarEditProfile = openSidebarEditProfile;
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