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

    const profileStatus = document.querySelector('.profile-status');
    if (profileStatus) {
        profileStatus.textContent = currentUser.isOnline
            ? '● Online'
            : '○ Offline';
        
        // Add color for online status
        if (currentUser.isOnline) {
            profileStatus.style.color = '#55efc4';
        }
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
    const dropdown = document.getElementById('mainDropdown');
    if (dropdown.style.display === 'none' || dropdown.style.display === '') {
        dropdown.style.display = 'block';
    } else {
        dropdown.style.display = 'none';
    }
}

document.addEventListener('click', function(e) {
    const menuHeader = document.querySelector('.menu-header');
    if (!menuHeader.contains(e.target)) {
        document.getElementById('mainDropdown').style.display = 'none';
        document.getElementById('settingsDropdown').style.display = 'none';
        document.getElementById('editProfileDropdown').style.display = 'none';
    }
});

function showSettings() {
    document.getElementById('mainDropdown').style.display = 'none';
    document.getElementById('settingsDropdown').style.display = 'block';
}

function showMainMenu() {
    document.getElementById('settingsDropdown').style.display = 'none';
    document.getElementById('editProfileDropdown').style.display = 'none';
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

// ==============================
// STATUS TOGGLE - FIXED
// ==============================

function toggleStatus() {
    const toggle = document.getElementById('statusToggle');
    toggle.classList.toggle('active');
    
    currentUser.isOnline = toggle.classList.contains('active');
    
    document.querySelector('.profile-status').textContent = 
        currentUser.isOnline ? '● Online' : '○ Offline';

    updateSidebarIndicators();
    updateChatHeaderIndicators();
    saveCurrentState();
}
function toggleRightSidebar() {
    const sidebar = document.getElementById('rightSidebar');
    if (sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
    } else {
        sidebar.classList.add('active');
    }
    saveCurrentState();
}
function updateSidebarIndicators() {
    const indicators = document.querySelectorAll('.user .status-indicator');
    indicators.forEach(indicator => {
        if (currentUser.isOnline) {
            indicator.classList.add('online');
            indicator.classList.remove('hidden');
        } else {
            indicator.classList.remove('online');
            indicator.classList.add('hidden');
        }
    });
    saveCurrentState();
}
function updateChatHeaderIndicators() {
    const indicators = document.querySelectorAll('.avatar-container .status-indicator');
    indicators.forEach(indicator => {
        if (currentUser.isOnline) {
            indicator.classList.add('online');
            indicator.classList.remove('hidden');
        } else {
            indicator.classList.remove('online');
            indicator.classList.add('hidden');
        }
    });
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

const emojiCategories = {
   smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕'],
    gestures: ['👋', '💪', '👍', '👌', '✌', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '✋', '🤚', '🖐', '🖖', '👋', '💅', '🤳', '💍', '💎', '🤝', '🙏', '🙌', '👏', '👐', '🤲', '🗯', '💢', '😤', '😠', '😡', '🤬'],
    hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '♦️', '♣️', '♠️', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯', '☦️', '🛐', '⛎', '♈', '♉', '♊'],
    nature: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🌸', '💐', '🌹', '🥀', '🌺', '🌻', '🌼', '🏵️'],
    food: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕'],
    activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🎿', '🛷', '🥌', '🎯', '🪀', '🎮', '🎰', '🧩', '♟️', '🎲', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺'],
    objects: ['⌚', '📱', '📲', '💻', '⌨️', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽', '🎞', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙', '🎚', '🎛', '🧭', '⏱', '⏲', '⏰', '🕰', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯', '🪔', '🧯'],
    symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '✅', '❌', '💯', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔶', '🔷', '🔸', '🔹', '💠', '🔘', '🔳', '🔲', '▪️', '▫️']
};

const GIPHY_API_KEY = 'YOUR_GIPHY_API_KEY'; // Get free key at https://developers.giphy.com/
const TENOR_API_KEY = 'YOUR_TENOR_API_KEY'; // Get free key at https://tenor.com/developer/keyregistration

// Load emojis to grid
function loadEmojis() {
    const emojiGrid = document.getElementById('emojiGrid');
    emojiGrid.innerHTML = '';
    
    for (const category in emojiCategories) {
        emojiCategories[category].forEach(emoji => {
            const span = document.createElement('span');
            span.className = 'emoji-item';
            span.textContent = emoji;
            span.onclick = () => insertEmoji(emoji);
            emojiGrid.appendChild(span);
        });
    }
}

// Toggle emoji picker
function toggleEmojiPicker() {
    const picker = document.getElementById('emojiPicker');
    picker.classList.toggle('active');
    
    if (picker.classList.contains('active')) {
        loadEmojis();
        loadTrendingGifs();
    }
}

// Show emoji or GIF tab
function showEmojiTab(tab) {
    const buttons = document.querySelectorAll('.emoji-tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    const contents = document.querySelectorAll('.emoji-category');
    contents.forEach(content => content.classList.remove('active'));
    
    if (tab === 'emoji') {
        buttons[0].classList.add('active');
        document.getElementById('emojiTab').classList.add('active');
    } else {
        buttons[1].classList.add('active');
        document.getElementById('gifTab').classList.add('active');
    }
}

// Insert emoji into input
function insertEmoji(emoji) {
    const input = document.getElementById('messageInput');
    input.value += emoji;
    input.focus();
}

// Load trending GIFs from Tenor (free, no API key needed for basic usage)
async function loadTrendingGifs() {
    const gifGrid = document.getElementById('gifGrid');
    gifGrid.innerHTML = '<div style="grid-column: span 2; text-align: center; padding: 20px;">Loading GIFs...</div>';
    
    try {
        // Using Tenor API (free, no key required for basic)
        const response = await fetch('https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&limit=20');
        const data = await response.json();
        
        gifGrid.innerHTML = '';
        
        data.results.forEach(result => {
            const gifUrl = result.media_formats.gif.url;
            const div = document.createElement('div');
            div.className = 'gif-item';
            div.onclick = () => sendGif(gifUrl);
            
            const img = document.createElement('img');
            img.src = gifUrl;
            
            div.appendChild(img);
            gifGrid.appendChild(div);
        });
    } catch (error) {
        gifGrid.innerHTML = '<div style="grid-column: span 2; text-align: center; padding: 20px; color: red;">Failed to load GIFs</div>';
        console.error('GIF loading error:', error);
    }
}

// Send GIF as message
function sendGif(gifUrl) {
    const messagesContainer = document.querySelector('.chat-messages');
    const placeholder = messagesContainer.querySelector('p');
    if (placeholder) placeholder.remove();
    
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'sent');
    
    const img = document.createElement('img');
    img.src = gifUrl;
    img.style.maxWidth = '200px';
    img.style.borderRadius = '15px';
    
    const timeSpan = document.createElement('span');
    timeSpan.classList.add('timestamp');
    timeSpan.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.appendChild(img);
    messageDiv.appendChild(timeSpan);
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Close picker
    document.getElementById('emojiPicker').classList.remove('active');
}

// Search emoji or GIF
async function searchEmojiGif(query) {
    if (!query) {
        loadEmojis();
        return;
    }
    
    const emojiGrid = document.getElementById('emojiGrid');
    emojiGrid.innerHTML = '';
    
    // Search local emojis
    for (const category in emojiCategories) {
        emojiCategories[category].forEach(emoji => {
            if (emoji.includes(query)) {
                const span = document.createElement('span');
                span.className = 'emoji-item';
                span.textContent = emoji;
                span.onclick = () => insertEmoji(emoji);
                emojiGrid.appendChild(span);
            }
        });
    }
    
    // If more than 5 characters, search GIFs
    if (query.length > 2) {
        const gifGrid = document.getElementById('gifGrid');
        gifGrid.innerHTML = '<div style="grid-column: span 2; text-align: center; padding: 20px;">Searching GIFs...</div>';
        
        try {
            const response = await fetch(`https://tenor.googleapis.com/v2/search?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&q=${query}&limit=20`);
            const data = await response.json();
            
            gifGrid.innerHTML = '';
            
            data.results.forEach(result => {
                const gifUrl = result.media_formats.gif.url;
                const div = document.createElement('div');
                div.className = 'gif-item';
                div.onclick = () => sendGif(gifUrl);
                
                const img = document.createElement('img');
                img.src = gifUrl;
                
                div.appendChild(img);
                gifGrid.appendChild(div);
            });
        } catch (error) {
            gifGrid.innerHTML = '';
        }
    }
}

// Update the old addEmoji function
function addEmoji() {
    toggleEmojiPicker();
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

function previewProfilePic(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('editProfileAvatar').textContent = '';
            document.getElementById('editProfileAvatar').style.backgroundImage = `url(${event.target.result})`;
            document.getElementById('editProfileAvatar').style.backgroundSize = 'cover';
        };
        reader.readAsDataURL(file);
    }
}
// Save changes from sidebar edit mode (WITH PICTURE)
function saveSidebarProfile() {
    const newName = document.getElementById('editSidebarName').value;
    const newUsername = document.getElementById('editSidebarUsername').value;
    const newBio = document.getElementById('editSidebarBio').value;

    // Get the profile picture (background image)
    const editAvatar = document.getElementById('editProfileAvatar');
    const profilePic = editAvatar.style.backgroundImage;

    if (newName && newUsername) {
        // Update current user data
        currentUser.name = newName;
        currentUser.username = newUsername;
        currentUser.bio = newBio;
        
        // Save profile picture if changed
        if (profilePic && profilePic !== 'none') {
            currentUser.profilePic = profilePic;
        }

        // Update Header/Menu Avatar
        document.getElementById('menuUserName').textContent = currentUser.name;
        document.getElementById('menuAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
        
        // Update Profile View (View Mode)
        updateProfileView();

        alert('Profile updated successfully!');
        saveCurrentState();
        closeSidebarEditMode();
    } else {
        alert('Name and Username are required!');
    }
}
// Close the edit mode in right sidebar and go back to chat
function closeSidebarEditMode() {
    // First switch to view mode (show updated profile)
    document.getElementById('sidebarEditMode').style.display = 'none';
    document.getElementById('sidebarViewMode').style.display = 'block';
    
    // UPDATE PROFILE VIEW WITH NEW DATA
    updateProfileView();
    
    // Close the sidebar completely to go back to chat
    const sidebar = document.getElementById('rightSidebar');
    sidebar.classList.remove('active');
}
// Open edit mode in right sidebar
function openSidebarEditProfile() {
    // Close dropdowns
    document.getElementById('mainDropdown').style.display = 'none';
    document.getElementById('settingsDropdown').style.display = 'none';

    // Close right sidebar first if not open, or switch to view mode
    const sidebar = document.getElementById('rightSidebar');
    sidebar.classList.add('active');

    // Show edit mode
    document.getElementById('sidebarViewMode').style.display = 'none';
    document.getElementById('sidebarEditMode').style.display = 'block';

    // Pre-fill current data
    document.getElementById('editSidebarName').value = currentUser.name;
    document.getElementById('editSidebarUsername').value = currentUser.username;
    document.getElementById('editSidebarBio').value = currentUser.bio;
}
// Update profile view with current user data
function updateProfileView() {
    // Update Name
    document.getElementById('profileName').textContent = currentUser.name;
    
    // Update Avatar Initial
    document.getElementById('profileAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
    
    // Update Profile Picture if exists
    if (currentUser.profilePic) {
        document.getElementById('profileAvatar').style.backgroundImage = currentUser.profilePic;
        document.getElementById('profileAvatar').style.backgroundSize = 'cover';
        document.getElementById('profileAvatar').style.backgroundPosition = 'center';
    }
    
    // Update Bio
    document.getElementById('profileBio').textContent = currentUser.bio;
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