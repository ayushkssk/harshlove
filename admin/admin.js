// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// DOM Elements
const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const imageInput = document.getElementById('imageInput');
const imageList = document.getElementById('imageList');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendMessage = document.getElementById('sendMessage');

// Check authentication state
auth.onAuthStateChanged((user) => {
    if (user) {
        userName.textContent = user.email;
        loadImages();
        loadMessages();
    } else {
        window.location.href = '/login.html';
    }
});

// Logout functionality
logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// Image upload handling
imageInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files.length) return;

    const file = files[0];
    const storageRef = storage.ref(`images/${Date.now()}_${file.name}`);
    
    try {
        const snapshot = await storageRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        await db.collection('images').add({
            url: downloadURL,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            uploadedBy: auth.currentUser.email
        });

        loadImages(); // Refresh image list
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image');
    }
});

// Load images from Firebase
async function loadImages() {
    imageList.innerHTML = '';
    
    try {
        const snapshot = await db.collection('images')
            .orderBy('timestamp', 'desc')
            .get();

        snapshot.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.className = 'image-preview';
            div.innerHTML = `
                <img src="${data.url}" alt="Uploaded image">
                <button class="delete-btn" data-id="${doc.id}">&times;</button>
            `;
            imageList.appendChild(div);

            // Add delete functionality
            div.querySelector('.delete-btn').addEventListener('click', () => deleteImage(doc.id, data.url));
        });
    } catch (error) {
        console.error('Error loading images:', error);
    }
}

// Delete image
async function deleteImage(docId, imageUrl) {
    try {
        await db.collection('images').doc(docId).delete();
        await storage.refFromURL(imageUrl).delete();
        loadImages(); // Refresh image list
    } catch (error) {
        console.error('Error deleting image:', error);
        alert('Failed to delete image');
    }
}

// Chat functionality
sendMessage.addEventListener('click', sendNewMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendNewMessage();
});

async function sendNewMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    try {
        await db.collection('messages').add({
            text: message,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            sender: auth.currentUser.email
        });
        
        messageInput.value = '';
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message');
    }
}

// Load and listen for new messages
function loadMessages() {
    db.collection('messages')
        .orderBy('timestamp')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const div = document.createElement('div');
                    div.className = `message ${data.sender === auth.currentUser.email ? 'sent' : 'received'}`;
                    div.textContent = data.text;
                    chatMessages.appendChild(div);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            });
        });
}
