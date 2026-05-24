
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
    name: "",
    username: "",
    bio: "Hey there! I am using Unichat",
    isOnline: true,
    darkMode: false,
    profilePic: ""
};

let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let isBlocked = false;
let chatMessages = {};

// ==============================
// LOCAL STORAGE
// ==============================
function saveCurrentState() {
    localStorage.setItem('unichatUser', JSON.stringify(currentUser));
}

function loadSavedState() {
    const savedUser = localStorage.getItem('unichatUser');

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
    localStorage.setItem('unichatMessages', JSON.stringify(chatMessages));
}

function loadChatMessages() {
    const savedMessages = localStorage.getItem('unichatMessages');

    if (savedMessages) {
        chatMessages = JSON.parse(savedMessages);
    }
}

// ==============================
// START APP
// ==============================
function startApp() {
    const splash = document.getElementById('splashScreen');

    if (splash) {
        splash.classList.add('hidden');
    }

    setTimeout(() => {
        loadChatMessages();

        if (loadSavedState()) {
            showDashboardLoggedIn();
        } else {
            document.querySelector('.auth-container')?.classList.remove('hidden');
        }
    }, 500);
}

window.startApp = startApp;

// ==============================
// DASHBOARD
// ==============================
function showDashboardLoggedIn() {
    document.querySelector('.auth-container')?.classList.add('hidden');

    const dashboard = document.getElementById('dashboard');

    if (dashboard) {
        dashboard.style.display = 'flex';
    }

    applyUserSettings();
}

function applyUserSettings() {
    const menuUserName = document.getElementById('menuUserName');
    const menuAvatar = document.getElementById('menuAvatar');

    if (menuUserName) {
        menuUserName.textContent = currentUser.name;
    }

    if (menuAvatar) {
        menuAvatar.textContent = currentUser.name.charAt(0).toUpperCase();

        if (currentUser.profilePic) {
            menuAvatar.style.backgroundImage = currentUser.profilePic;
            menuAvatar.style.backgroundSize = 'cover';
            menuAvatar.style.backgroundPosition = 'center';
        }
    }

    const profileStatus = document.querySelector('.profile-status');

    if (profileStatus) {
        profileStatus.textContent = currentUser.isOnline
            ? '● Online'
            : '○ Offline';
    }

    if (currentUser.darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }

    updateProfileView();
}

// ==============================
// SIGN UP
// ==============================
const signupForm = document.getElementById('signupFormElement');

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('signupName').value.trim();
        const username = document.getElementById('signupUsername').value.trim();
        const email = document.getElementById('signupGmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;

        if (!name || !username || !email || !password) {
            alert('Please fill all fields!');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }

        if (password.length < 6) {
            alert('Password must be at least 6 characters!');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            currentUser.name = name;
            currentUser.username = username;

            saveCurrentState();

            alert('Account created successfully!');

            document.getElementById('signupForm').classList.add('hidden');
            document.getElementById('signinForm').classList.remove('hidden');

        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    });
}

// ==============================
// LOGIN
// ==============================
const signinForm = document.getElementById('signinFormElement');

if (signinForm) {
    signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('signinUsername').value.trim();
        const password = document.getElementById('signinPassword').value;

        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            const user = userCredential.user;

            currentUser.name = user.email;
            currentUser.username = user.email;

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

        document.getElementById('dashboard').style.display = 'none';

        document.querySelector('.auth-container')
            ?.classList.remove('hidden');

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
        console.log('User logged in:', user.email);
    } else {
        console.log('No user logged in');
    }
});

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

window.sendMessage = sendMessage;

// ==============================
// LOAD REALTIME MESSAGES
// ==============================
const messagesQuery = query(
    collection(db, 'messages'),
    orderBy('createdAt', 'asc')
);

onSnapshot(messagesQuery, (snapshot) => {
    const messagesContainer = document.querySelector('.chat-messages');

    if (!messagesContainer) return;

    messagesContainer.innerHTML = '';

    snapshot.forEach((doc) => {
        const data = doc.data();

        const type = data.sender === currentUser.name
            ? 'sent'
            : 'received';

        addMessageToUI(data.text, type);
    });
});

// ==============================
// MESSAGE UI
// ==============================
function addMessageToUI(text, type) {
    const messagesContainer = document.querySelector('.chat-messages');

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

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ==============================
// ENTER KEY
// ==============================
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

window.handleKeyPress = handleKeyPress;

// ==============================
// DARK MODE
// ==============================
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');

    currentUser.darkMode = document.body.classList.contains('dark-mode');

    saveCurrentState();
}

window.toggleDarkMode = toggleDarkMode;

// ==============================
// PROFILE VIEW
// ==============================
function updateProfileView() {
    const profileName = document.getElementById('profileName');
    const profileAvatar = document.getElementById('profileAvatar');
    const profileBio = document.getElementById('profileBio');

    if (profileName) {
        profileName.textContent = currentUser.name;
    }

    if (profileAvatar) {
        profileAvatar.textContent = currentUser.name.charAt(0).toUpperCase();

        if (currentUser.profilePic) {
            profileAvatar.style.backgroundImage = currentUser.profilePic;
            profileAvatar.style.backgroundSize = 'cover';
            profileAvatar.style.backgroundPosition = 'center';
        }
    }

    if (profileBio) {
        profileBio.textContent = currentUser.bio;
    }
}

// ==============================
// IMAGE UPLOAD
// ==============================
const imageInput = document.getElementById('imageInput');

if (imageInput) {
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];

        if (!file) return;

        const reader = new FileReader();

        reader.onload = function(event) {
            const messagesContainer = document.querySelector('.chat-messages');

            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', 'sent');

            const img = document.createElement('img');
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
// AUDIO RECORDING
// ==============================
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true
        });

        mediaRecorder = new MediaRecorder(stream);

        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, {
                type: 'audio/mp3'
            });

            const audioUrl = URL.createObjectURL(audioBlob);

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
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
    }
}

window.startRecording = startRecording;
window.stopRecording = stopRecording;

// ==============================
// AUDIO & VIDEO CALL
// ==============================
function startAudioCall() {
    alert('📞 Audio Call Started');
}

function startVideoCall() {
    alert('📹 Video Call Started');
}

window.startAudioCall = startAudioCall;
window.startVideoCall = startVideoCall;

// ==============================
// INIT
// ==============================
document.addEventListener('DOMContentLoaded', () => {
    loadSavedState();
    loadChatMessages();
    applyUserSettings();
});

// ==============================
// INIT
// ==============================
document.addEventListener('DOMContentLoaded', () => {

    loadSavedState();
    loadChatMessages();
    applyUserSettings();

    // START SPLASH SCREEN
    const splash = document.getElementById('splashScreen');

    if (splash) {

        // Tap anywhere on splash
        splash.addEventListener('click', () => {
            startApp();
        });

    }

});

function toggleMenu() {}
function showSettings() {}
function showMainMenu() {}
function toggleStatus() {}
function openSidebarEditProfile() {}
function toggleRightSidebar() {}
function addEmoji() {}
function switchUser() {}
function searchEmojiGif() {}
function showEmojiTab() {}
function previewProfilePic() {}
function saveSidebarProfile() {}
function closeSidebarEditMode() {}

window.startApp = startApp;
window.toggleMenu = toggleMenu;
window.showSettings = showSettings;
window.showMainMenu = showMainMenu;
window.toggleStatus = toggleStatus;
window.toggleDarkMode = toggleDarkMode;
window.openSidebarEditProfile = openSidebarEditProfile;
window.toggleRightSidebar = toggleRightSidebar;
window.startAudioCall = startAudioCall;
window.startVideoCall = startVideoCall;
window.sendMessage = sendMessage;
window.handleKeyPress = handleKeyPress;
window.addEmoji = addEmoji;
window.startRecording = startRecording;
window.stopRecording = stopRecording;
window.switchUser = switchUser;
window.searchEmojiGif = searchEmojiGif;
window.showEmojiTab = showEmojiTab;
window.previewProfilePic = previewProfilePic;
window.saveSidebarProfile = saveSidebarProfile;
window.closeSidebarEditMode = closeSidebarEditMode;
window.logout = logout;
