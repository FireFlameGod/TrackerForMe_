// --- FIREBASE IMPORT ÉS KONFIGURÁCIÓ ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, deleteField } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// AZ ÁLTALAD MEGADOTT FIREBASE KONFIGURÁCIÓ
const firebaseConfig = {
    apiKey: "AIzaSyAKEKZzgKSTFQ3_K6Yhm7aPvTX5plMzXYg",
    authDomain: "tracker-fbe21.firebaseapp.com",
    projectId: "tracker-fbe21",
    storageBucket: "tracker-fbe21.firebasestorage.app",
    messagingSenderId: "402979419538",
    appId: "1:402979419538:web:ff7924c73c3066ff8527d4b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); 

// --- BIZTONSÁGI KONFIGURÁCIÓ ---

// !!! A titkos kulcs Base64-ben kódolva: "0013" (MDAxMw==) !!!
const ENCODED_ACCESS_KEY = "MDAxMw=="; 
const ACCESS_KEY_LOCAL_STORAGE = "trackerAccessGranted";

// Ez a KÖZÖS mappa neve a Firestore-ban.
const SHARED_UID = "SHARED_FRIENDS_GROUP"; 

// --- GLOBÁLIS VÁLTOZÓK ---
let trackerList = []; // Tartalmazza az összes médiaelemet
let gameList = [];    

const THEME_COLOR_KEY = 'trackerThemeColor';
const DEFAULT_COLOR = '#ff8c00'; 
const MEDIA_COLLECTION_NAME = 'media';
const GAME_COLLECTION_NAME = 'games';

// Kategória kezelés
let currentCategory = 'joint'; // Alapértelmezett kategória: Közös nézés
const CATEGORY_MAP = {
    'joint': '🧑‍🤝‍🧑 Közös nézés', 
    'cdrama': '🇨🇳 C-Drama',
    'kdrama': '🇰🇷 K-Drama',
    'anime': '🇯🇵 Anime',
    'donghua': '🎎 Donghua',
    'other': '🌍 Egyéb',
};
const CATEGORIES = Object.keys(CATEGORY_MAP); 

// === 1. HOZZÁFÉRÉS ÉS BELÉPTETÉS ===

window.checkAccessKey = function() {
    const inputKey = document.getElementById('access-key-input').value.trim();
    const errorDiv = document.getElementById('login-error');

    // A KULCS DEKÓDOLÁSA Base64-ből az összehasonlításhoz
    const SECRET_ACCESS_KEY = atob(ENCODED_ACCESS_KEY);

    if (inputKey === SECRET_ACCESS_KEY) {
        localStorage.setItem(ACCESS_KEY_LOCAL_STORAGE, 'true');
        errorDiv.textContent = '';
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app-content').style.display = 'block';
        
        initAuthAndApp(); 
    } else {
        errorDiv.textContent = 'Hibás titkos kulcs!';
        localStorage.removeItem(ACCESS_KEY_LOCAL_STORAGE);
    }
}

function checkInitialAccess() {
    if (localStorage.getItem(ACCESS_KEY_LOCAL_STORAGE) === 'true') {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app-content').style.display = 'block';
        initAuthAndApp();
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('main-app-content').style.display = 'none';
    }
}

window.logout = function() {
    // Törli a helyi kulcsot, és újra betölti az oldalt
    localStorage.removeItem(ACCESS_KEY_LOCAL_STORAGE);
    window.location.reload(); 
}

// Haladó információk megjelenítése/elrejtése
window.toggleAdvancedInfo = function() {
    const content = document.getElementById('advanced-info-content');
    const icon = document.getElementById('toggle-icon');
    const isHidden = content.style.display === 'none';
    content.style.display = isHidden ? 'block' : 'none';
    icon.textContent = isHidden ? '▲' : '▼';
}

// === 2. ADATBÁZIS ELÉRÉSI HELYEK DINAMIKUS LÉTREHOZÁSA ===

function getMediaCollectionRef() {
    return collection(db, 'users', SHARED_UID, MEDIA_COLLECTION_NAME);
}

function getGameCollectionRef() {
    return collection(db, 'users', SHARED_UID, GAME_COLLECTION_NAME);
}

// === 3. FIREBASE AZONOSÍTÁS ÉS APP INDÍTÁS ===

async function initAuthAndApp() {
    try {
        const userCredential = await signInAnonymously(auth);
        const actualUserId = userCredential.user.uid;
        
        document.getElementById('shared-id-info').querySelector('strong').textContent = SHARED_UID;
        document.getElementById('user-id-info').querySelector('strong').textContent = actualUserId;

        loadThemeColor();
        startFirestoreListeners();
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app-content-container').style.display = 'block';
        
        showMainTab('media');

    } catch (error) {
        console.error("Azonosítási hiba:", error);
        document.getElementById('shared-id-info').querySelector('strong').textContent = "HIBA: Ellenőrizze a konzolt!";
        document.getElementById('user-id-info').querySelector('strong').textContent = `Auth hiba: ${error.message}`;
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app-content-container').style.display = 'block';
    }
}

// === 4. FIREBASE ADAT BETÖLTÉSE ÉS FIGYELÉSE ===

function startFirestoreListeners() {
    // Media lista figyelése
    onSnapshot(getMediaCollectionRef(), (snapshot) => {
        trackerList = snapshot.docs.map(doc => ({
            firestoreId: doc.id,
            category: doc.data().category || 'joint', 
            notes: doc.data().notes || '', 
            previousCategory: doc.data().previousCategory || null,
            thumbnailUrl: doc.data().thumbnailUrl || null, 
            ...doc.data()
        }));
        renderLists(); 
    }, (error) => {
        console.error("Hiba a media lista lekérésekor: ", error);
    });

    // Játék lista figyelése
    onSnapshot(getGameCollectionRef(), (snapshot) => {
        gameList = snapshot.docs.map(doc => ({
            firestoreId: doc.id,
            ...doc.data()
        }));
        renderGameLists();
    }, (error) => {
        console.error("Hiba a játék lista lekérésekor: ", error);
    });
}

// === 5. MEDIA CRUD FUNKCIÓK ===

window.addNewItem = async function() {
    const cim = document.getElementById('cim-input').value.trim();
    const thumbnailInput = document.getElementById('thumbnail-input').value.trim(); 
    const tipus = document.getElementById('tipus-select').value;
    const maxEpizodInput = document.getElementById('max-epizod-input').value;
    const linkInput = document.getElementById('link-input').value.trim();
    
    if (cim === "") { return; }
    
    const newItem = {
        cim: cim,
        tipus: tipus,
        statusz: "nézendő",
        watchedEpisodes: (tipus === 'sorozat' ? 0 : null),
        maxEpisodes: (tipus === 'sorozat' && maxEpizodInput ? parseInt(maxEpizodInput) : null),
        link: (linkInput || null),
        thumbnailUrl: (thumbnailInput || null),
        category: currentCategory, 
        notes: "", 
        previousCategory: null 
    };

    try {
        await addDoc(getMediaCollectionRef(), newItem); 
    } catch (e) {
        console.error("Kritikus hiba az elem hozzáadásakor: ", e);
    }
    
    document.getElementById('cim-input').value = '';
    document.getElementById('thumbnail-input').value = ''; 
    document.getElementById('max-epizod-input').value = '';
    document.getElementById('link-input').value = '';
}

window.deleteItem = async function(firestoreId) {
    try {
        await deleteDoc(doc(getMediaCollectionRef(), firestoreId));
    } catch (e) {
        console.error("Hiba az elem törlésekor: ", e);
    }
}

window.updateStatus = async function(firestoreId, newStatus) {
    try {
        await updateDoc(doc(getMediaCollectionRef(), firestoreId), {
            statusz: newStatus
        });
    } catch (e) {
        console.error("Hiba a státusz frissítésekor: ", e);
    }
}

window.sendToJoint = async function(firestoreId) {
    const item = trackerList.find(i => i.firestoreId === firestoreId);
    if (!item) return;
    
    if (item.category === 'joint') return; 

    try {
        await updateDoc(doc(getMediaCollectionRef(), firestoreId), {
            category: 'joint',
            previousCategory: item.category 
        });
    } catch (e) {
        console.error("Hiba az elem közös listára küldésekor: ", e);
    }
}

window.sendBackFromJoint = async function(firestoreId) {
    const item = trackerList.find(i => i.firestoreId === firestoreId);
    if (!item || item.category !== 'joint' || !item.previousCategory) return;
    
    const originalCategory = item.previousCategory;
    
    try {
        await updateDoc(doc(getMediaCollectionRef(), firestoreId), {
            category: originalCategory,
            previousCategory: deleteField() 
        });
    } catch (e) {
        console.error("Hiba az elem visszaküldésekor: ", e);
    }
}

window.changeEpisodeCount = async function(firestoreId, delta) {
    const item = trackerList.find(item => item.firestoreId === firestoreId);
    
    if (item && item.tipus === 'sorozat') {
        let newCount = item.watchedEpisodes + delta;
        newCount = Math.max(0, newCount);
        if (item.maxEpisodes !== null && item.maxEpisodes > 0) {
            newCount = Math.min(newCount, item.maxEpisodes);
        }
        let newStatus = item.statusz;
        if (item.maxEpisodes !== null && item.maxEpisodes > 0 && newCount === item.maxEpisodes) {
            newStatus = 'megnézve';
        } else if (newStatus === 'megnézve' && newCount < item.maxEpisodes) {
             newStatus = 'nézendő'; 
        }

        try {
            await updateDoc(doc(getMediaCollectionRef(), firestoreId), {
                watchedEpisodes: newCount,
                statusz: newStatus
            });
        } catch (e) {
            console.error("Hiba az epizód frissítésekor: ", e);
        }
    }
}

// === CÍM, LINK, MAX EPIZÓD, THUMBNAIL ÉS MEGJEGYZÉS SZERKESZTÉSI LOGIKA ===

window.saveMediaItem = async function(firestoreId) {
    const titleInput = document.getElementById(`title-edit-${firestoreId}`);
    const linkInput = document.getElementById(`link-edit-${firestoreId}`);
    const maxEpInput = document.getElementById(`max-episode-edit-${firestoreId}`); 
    const notesTextarea = document.getElementById(`notes-edit-${firestoreId}`); 
    const thumbnailInput = document.getElementById(`thumbnail-edit-${firestoreId}`);
    
    const newTitle = titleInput ? titleInput.value.trim() : null;
    const newLink = linkInput ? linkInput.value.trim() : null;
    const newMaxEpisodes = maxEpInput ? parseInt(maxEpInput.value) : null; 
    const newNotes = notesTextarea ? notesTextarea.value : null;
    const newThumbnailUrl = thumbnailInput ? thumbnailInput.value.trim() : null;

    if (!firestoreId || !titleInput) { return; }

    if (!newTitle || newTitle === "") { 
        toggleEditMode(firestoreId); 
        return; 
    }
    
    const updateData = {
        cim: newTitle,
        link: newLink || null, 
        notes: newNotes || "",
        thumbnailUrl: newThumbnailUrl || null
    };

    const currentItem = trackerList.find(item => item.firestoreId === firestoreId);

    if (currentItem && currentItem.tipus === 'sorozat') {
         updateData.maxEpisodes = newMaxEpisodes && newMaxEpisodes > 0 ? newMaxEpisodes : null;
         
         if (updateData.maxEpisodes && currentItem.watchedEpisodes >= updateData.maxEpisodes) {
             updateData.statusz = 'megnézve';
         } else if (currentItem.statusz === 'megnézve' && currentItem.watchedEpisodes < (updateData.maxEpisodes || 0)) {
             updateData.statusz = 'nézendő';
         }
    }
    
    try {
        await updateDoc(doc(getMediaCollectionRef(), firestoreId), updateData);
        toggleEditMode(firestoreId); 
    } catch (e) {
        console.error("Hiba az elem frissítésekor: ", e);
    }
}

window.toggleEditMode = function(firestoreId) {
    // Cím mezők
    const titleDisplay = document.getElementById(`title-display-${firestoreId}`);
    const titleInput = document.getElementById(`title-edit-${firestoreId}`);
    
    // Link mezők
    const linkDisplayDiv = document.getElementById(`link-display-div-${firestoreId}`); 
    const linkInput = document.getElementById(`link-edit-${firestoreId}`);
    
    // Max epizód mező (Csak input)
    const maxEpInput = document.getElementById(`max-episode-edit-${firestoreId}`);

    // Megjegyzés mezők
    const notesDisplay = document.getElementById(`notes-display-${firestoreId}`);
    const notesTextarea = document.getElementById(`notes-edit-${firestoreId}`);
    
    // Thumbnail mező
    const thumbnailInput = document.getElementById(`thumbnail-edit-${firestoreId}`);
    
    // Vezérlő Gombok és konténerek
    const controlsRow = document.querySelector(`#media-item-${firestoreId} .controls-row`);
    const sendBtn = document.getElementById(`send-btn-${firestoreId}`);
    const backBtn = document.getElementById(`back-btn-${firestoreId}`); 
    const editBtn = document.getElementById(`edit-btn-${firestoreId}`);
    const saveBtn = document.getElementById(`save-btn-${firestoreId}`);
    const cancelBtn = document.getElementById(`cancel-btn-${firestoreId}`);
    
    if (!titleDisplay || !titleInput || !editBtn || !saveBtn || !cancelBtn) { return; } 

    const isEditing = titleDisplay.style.display === 'none';
    const currentItem = trackerList.find(item => item.firestoreId === firestoreId);

    if (!isEditing) {
        // Szerkesztési mód bekapcsolása
        titleDisplay.style.display = 'none';
        titleInput.style.display = 'inline-block';
        
        if (linkDisplayDiv) linkDisplayDiv.style.display = 'none'; 
        if (linkInput) {
             linkInput.style.display = 'inline-block';
             linkInput.value = currentItem.link || ''; 
        }
        
        if (thumbnailInput) {
            thumbnailInput.style.display = 'inline-block';
            thumbnailInput.value = currentItem.thumbnailUrl || ''; 
        }

        if (currentItem.tipus === 'sorozat') {
            if (maxEpInput) maxEpInput.style.display = 'inline-block';
        }

        if (notesDisplay) notesDisplay.style.display = 'none';
        if (notesTextarea) {
            notesTextarea.style.display = 'block';
            notesTextarea.value = currentItem.notes || ''; 
        }
        
        titleInput.value = currentItem.cim; 
        if (maxEpInput) maxEpInput.value = currentItem.maxEpisodes || ''; 
        
        if (controlsRow) controlsRow.style.display = 'none'; // Státusz és törlés elrejtése
        if (sendBtn) sendBtn.style.display = 'none'; 
        if (backBtn) backBtn.style.display = 'none'; 
        editBtn.style.display = 'none'; 
        saveBtn.style.display = 'block'; 
        cancelBtn.style.display = 'block'; 
        
        titleInput.focus();
        const len = titleInput.value.length;
        titleInput.setSelectionRange(len, len); 
    } else {
        // Szerkesztési mód kikapcsolása (Mégse/Mentés után)
        titleDisplay.style.display = 'inline-block';
        titleInput.style.display = 'none';
        
        if (linkDisplayDiv) linkDisplayDiv.style.display = 'block'; 
        if (linkInput) linkInput.style.display = 'none';
        
        if (thumbnailInput) thumbnailInput.style.display = 'none';

        if (currentItem.tipus === 'sorozat') {
