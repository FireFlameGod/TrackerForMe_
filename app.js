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
let trackerList = []; 
let gameList = [];    

const THEME_COLOR_KEY = 'trackerThemeColor';
const DEFAULT_COLOR = '#ff8c00'; 
const MEDIA_COLLECTION_NAME = 'media';
const GAME_COLLECTION_NAME = 'games';

// Kategória kezelés
let currentCategory = 'joint'; 
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
    localStorage.removeItem(ACCESS_KEY_LOCAL_STORAGE);
    window.location.reload(); 
}

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
            // Fontos: a thumbnailUrl beolvasása a dokumentum adataiból
            thumbnailUrl: doc.data().thumbnailUrl || null,
            ...doc.data()
        }));
        renderGameLists();
    }, (error) => {
        console.error("Hiba a játék lista lekérésekor: ", error);
    });
}

// === 5. MEDIA CRUD FUNKCIÓK (Változatlan a kérése szempontjából) ===

window.toggleMaxEpisodeInput = function() {
    const tipus = document.getElementById('tipus-select').value;
    const maxEpizodInput = document.getElementById('max-epizod-input');
    maxEpizodInput.style.display = (tipus === 'sorozat') ? 'block' : 'none';
    if (tipus === 'film') {
        maxEpizodInput.value = ''; // Törli az értéket filmnél
    }
}

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
    } catch (e) {
        console.error("Hiba az elem frissítésekor: ", e);
    }
}

window.toggleEditMode = function(firestoreId) {
    const titleDisplay = document.getElementById(`title-display-${firestoreId}`);
    const titleInput = document.getElementById(`title-edit-${firestoreId}`);
    const linkDisplayDiv = document.getElementById(`link-display-div-${firestoreId}`); 
    const linkInput = document.getElementById(`link-edit-${firestoreId}`);
    const maxEpInput = document.getElementById(`max-episode-edit-${firestoreId}`);
    const notesDisplay = document.getElementById(`notes-display-${firestoreId}`);
    const notesTextarea = document.getElementById(`notes-edit-${firestoreId}`);
    const thumbnailInput = document.getElementById(`thumbnail-edit-${firestoreId}`);
    const thumbnailContainer = document.getElementById(`thumbnail-container-${firestoreId}`);

    const sendBtn = document.getElementById(`send-btn-${firestoreId}`);
    const backBtn = document.getElementById(`back-btn-${firestoreId}`);
    const editBtn = document.getElementById(`edit-btn-${firestoreId}`);
    const saveBtn = document.getElementById(`save-btn-${firestoreId}`);
    const cancelBtn = document.getElementById(`cancel-btn-${firestoreId}`);
    const deleteBtn = document.getElementById(`delete-btn-${firestoreId}`);

    if (!titleDisplay || !titleInput || !editBtn || !saveBtn || !cancelBtn) { return; }

    const isEditing = titleDisplay.style.display === 'none';
    const currentItem = trackerList.find(item => item.firestoreId === firestoreId);

    if (!isEditing) {
        // Szerkesztési mód bekapcsolása
        titleDisplay.style.display = 'none';
        titleInput.style.display = 'block';
        titleInput.value = currentItem.cim; 

        if (linkInput) {
            if (linkDisplayDiv) linkDisplayDiv.style.display = 'none';
            linkInput.style.display = 'block';
            linkInput.value = currentItem.link || '';
        }

        if (maxEpInput) {
            maxEpInput.style.display = 'block';
            maxEpInput.value = currentItem.maxEpisodes || '';
        }

        if (notesTextarea) {
            if (notesDisplay) notesDisplay.style.display = 'none';
            notesTextarea.style.display = 'block';
            notesTextarea.value = currentItem.notes || '';
        }
        
        if (thumbnailInput) {
            thumbnailInput.style.display = 'block';
            thumbnailInput.value = currentItem.thumbnailUrl || '';
        }
        // **********************************************
        // KIJAVÍTVA: A thumbnailContainer (kép) nem tűnik el
        // if (thumbnailContainer) {
        //     thumbnailContainer.style.display = 'none';
        // }
        // **********************************************

        editBtn.style.display = 'none';
        saveBtn.style.display = 'block';
        cancelBtn.style.display = 'block';
        if (deleteBtn) deleteBtn.style.display = 'none';

        if (sendBtn) sendBtn.style.display = 'none';
        if (backBtn) backBtn.style.display = 'none';

    } else {
        // Normál mód bekapcsolása
        titleDisplay.style.display = 'inline-block';
        titleInput.style.display = 'none';

        if (linkInput) {
            if (linkDisplayDiv) linkDisplayDiv.style.display = 'block';
            linkInput.style.display = 'none';
        }

        if (maxEpInput) maxEpInput.style.display = 'none';

        if (notesTextarea) {
            if (notesDisplay) notesDisplay.style.display = 'block';
            notesTextarea.style.display = 'none';
        }

        if (thumbnailInput) thumbnailInput.style.display = 'none';
        // **********************************************
        // KIJAVÍTVA: A thumbnailContainer (kép) nem tűnik el, így nem kell visszakapcsolni
        // if (thumbnailContainer) thumbnailContainer.style.display = 'flex'; 
        // **********************************************

        editBtn.style.display = 'block';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'block';

        if (sendBtn && currentItem.category !== 'joint') sendBtn.style.display = 'block';
        if (backBtn && currentItem.category === 'joint') backBtn.style.display = 'block';
    }
}


// === 6. JÁTÉK CRUD FUNKCIÓK (Módosítva) ===

window.addNewGame = async function() {
    const cim = document.getElementById('game-cim-input').value.trim();
    // ÚJ: Kép URL beolvasása
    const thumbnailUrlInput = document.getElementById('game-thumbnail-input').value.trim();
    const platform = document.getElementById('game-platform-select').value;
    if (cim === "") { return; }
    
    const newItem = { 
        cim: cim, 
        platform: platform, 
        statusz: "játszandó",
        // ÚJ: thumbnail URL mentése
        thumbnailUrl: thumbnailUrlInput || null
    };
    
    try {
        await addDoc(getGameCollectionRef(), newItem);
    } catch (e) {
        console.error("Hiba a játék hozzáadásakor: ", e);
    }
    
    document.getElementById('game-cim-input').value = '';
    // ÚJ: Kép URL beviteli mező ürítése
    document.getElementById('game-thumbnail-input').value = ''; 
}

window.updateGameStatus = async function(firestoreId, newStatus) {
    try {
        await updateDoc(doc(getGameCollectionRef(), firestoreId), { 
            statusz: newStatus 
        });
    } catch (e) {
        console.error("Hiba a játék státusz frissítésekor: ", e);
    }
}

window.deleteGameItem = async function(firestoreId) {
    try {
        await deleteDoc(doc(getGameCollectionRef(), firestoreId));
    } catch (e) {
        console.error("Hiba a játék törlésekor: ", e);
    }
}

// === JÁTÉK CÍM, THUMBNAIL SZERKESZTÉSI LOGIKA (Módosítva) ===

window.saveGameItem = async function(firestoreId) {
    const titleInput = document.getElementById(`title-edit-game-${firestoreId}`);
    // ÚJ: Thumbnail input beolvasása
    const thumbnailInput = document.getElementById(`thumbnail-edit-game-${firestoreId}`); 

    const newTitle = titleInput ? titleInput.value.trim() : null;
    // ÚJ: Thumbnail URL értékének beolvasása
    const newThumbnailUrl = thumbnailInput ? thumbnailInput.value.trim() : null;

    if (!firestoreId || !titleInput) { return; }

    if (!newTitle || newTitle === "") { 
        window.toggleGameEditMode(firestoreId); 
        return; 
    }
    
    const updateData = {
        cim: newTitle,
        // ÚJ: thumbnail URL mentése
        thumbnailUrl: newThumbnailUrl || null
    };
    
    try {
        await updateDoc(doc(getGameCollectionRef(), firestoreId), updateData);
    } catch (e) {
        console.error("Hiba a játék elem frissítésekor: ", e);
    }
}

window.toggleGameEditMode = function(firestoreId) {
    // Cím mezők
    const titleDisplay = document.getElementById(`title-display-game-${firestoreId}`);
    const titleInput = document.getElementById(`title-edit-game-${firestoreId}`);
    // ÚJ: Thumbnail mező
    const thumbnailInput = document.getElementById(`thumbnail-edit-game-${firestoreId}`);
    const thumbnailContainer = document.getElementById(`thumbnail-container-game-${firestoreId}`);

    // Gombok
    const editBtn = document.getElementById(`edit-btn-game-${firestoreId}`);
    const saveBtn = document.getElementById(`save-btn-game-${firestoreId}`);
    const cancelBtn = document.getElementById(`cancel-btn-game-${firestoreId}`);
    const deleteBtn = document.getElementById(`delete-btn-game-${firestoreId}`); 

    if (!titleDisplay || !titleInput || !editBtn || !saveBtn || !cancelBtn) { return; }

    const isEditing = titleDisplay.style.display === 'none';
    const currentItem = gameList.find(item => item.firestoreId === firestoreId);

    if (!isEditing) {
        // Szerkesztési mód bekapcsolása
        titleDisplay.style.display = 'none';
        titleInput.style.display = 'block';
        titleInput.value = currentItem.cim; 
        
        if (thumbnailInput) {
            thumbnailInput.style.display = 'block';
            thumbnailInput.value = currentItem.thumbnailUrl || '';
        }
        // **********************************************
        // KIJAVÍTVA: A thumbnailContainer (kép) nem tűnik el
        // if (thumbnailContainer) {
        //      // Elrejtjük a képet szerkesztés alatt
        //      thumbnailContainer.style.display = 'none';
        // }
        // **********************************************
        
        editBtn.style.display = 'none';
        saveBtn.style.display = 'block';
        cancelBtn.style.display = 'block';
        if (deleteBtn) deleteBtn.style.display = 'none';
    } else {
        // Normál mód bekapcsolása
        titleDisplay.style.display = 'inline-block';
        titleInput.style.display = 'none';
        
        if (thumbnailInput) thumbnailInput.style.display = 'none';
        // **********************************************
        // KIJAVÍTVA: A thumbnailContainer (kép) nem tűnik el, így nem kell visszakapcsolni
        // if (thumbnailContainer) thumbnailContainer.style.display = 'flex'; 
        // **********************************************
        
        editBtn.style.display = 'block';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'block';
    }
}


// --- Segédfüggvények (Változatlan) ---

window.showMainTab = function(tabName) {
    const mediaContent = document.getElementById('media-content');
    const gameContent = document.getElementById('game-tracker-content');
    const mediaMainTab = document.getElementById('media-main-tab');
    const gameMainTab = document.getElementById('game-main-tab');

    mediaMainTab.classList.remove('active-main-tab');
    gameMainTab.classList.remove('active-main-tab');

    if (tabName === 'media') {
        mediaContent.style.display = 'block';
        gameContent.style.display = 'none';
        mediaMainTab.classList.add('active-main-tab');
        renderLists(); 
    } else {
        mediaContent.style.display = 'none';
        gameContent.style.display = 'block';
        gameMainTab.classList.add('active-main-tab');
        renderGameLists(); 
    }
}

window.showSubTab = function(category) {
    currentCategory = category;
    
    // Frissíti a címet a kiválasztott kategóriával
    document.getElementById('media-category-title').textContent = CATEGORY_MAP[category];

    // Frissíti a gombok állapotát
    const subTabs = document.getElementById('media-sub-tabs').querySelectorAll('button');
    subTabs.forEach(btn => {
        btn.classList.remove('active-sub-tab');
    });
    document.getElementById(category + '-sub-tab').classList.add('active-sub-tab');

    renderLists();
}

window.changeThemeColor = function(color) {
    document.documentElement.style.setProperty('--theme-color', color);
    localStorage.setItem(THEME_COLOR_KEY, color);
}

function loadThemeColor() {
    const color = localStorage.getItem(THEME_COLOR_KEY) || DEFAULT_COLOR;
    document.documentElement.style.setProperty('--theme-color', color);
    document.getElementById('color-picker').value = color;
}

// === 7. LISTA MEGJELENÍTÉSEK (Media) ===

window.renderLists = function() {
    const nezendoUl = document.getElementById('nezendo-lista');
    const megnezveUl = document.getElementById('megnezve-lista');
    
    nezendoUl.innerHTML = '';
    megnezveUl.innerHTML = '';
    
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    
    let filteredList = trackerList.filter(item => item.category === currentCategory);

    if (searchTerm.length > 0) {
        filteredList = filteredList.filter(item => 
            item.cim.toLowerCase().includes(searchTerm) || 
            (item.link && item.link.toLowerCase().includes(searchTerm)) || 
            (item.notes && item.notes.toLowerCase().includes(searchTerm))
        );
    }
    
    filteredList.sort((a, b) => a.cim.localeCompare(b.cim, 'hu', { sensitivity: 'base' }));

    const isJointCategory = currentCategory === 'joint';

    filteredList.forEach(item => {
        const li = document.createElement('li');
        li.className = `tracker-item ${item.statusz === 'megnézve' ? 'watched' : ''}`;

        // --- 1. BAL OLDAL: THUMBNAIL ---
        const thumbnailContainer = document.createElement('div');
        thumbnailContainer.id = `thumbnail-container-${item.firestoreId}`;
        thumbnailContainer.className = 'thumbnail-container';
        
        const imageUrl = item.thumbnailUrl;
        if (imageUrl) {
            const thumbnailImg = document.createElement('img');
            thumbnailImg.className = 'thumbnail-img';
            thumbnailImg.src = imageUrl;
            thumbnailImg.alt = `Thumbnail: ${item.cim}`;
            thumbnailImg.onerror = function() {
                this.onerror = null;
                this.parentElement.innerHTML = '<span>🎬</span>';
                this.parentElement.style.fontSize = '3em';
            };
            thumbnailContainer.appendChild(thumbnailImg);
        } else {
            thumbnailContainer.innerHTML = '<span>🎬</span>';
            thumbnailContainer.style.fontSize = '3em';
        }
        li.appendChild(thumbnailContainer);

        // --- 2. KÖZÉPSŐ: ITEM RÉSZLETEK ÉS SZERKESZTŐ INPUTOK ---
        const itemDetails = document.createElement('div');
        itemDetails.className = 'item-details';

        const titleContainer = document.createElement('div');
        titleContainer.className = 'item-title-container';

        const titleDisplay = document.createElement('strong');
        titleDisplay.id = `title-display-${item.firestoreId}`;
        titleDisplay.textContent = item.cim;
        titleDisplay.style.display = 'inline-block';
        titleDisplay.style.marginRight = '5px';

        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.id = `title-edit-${item.firestoreId}`;
        titleInput.value = item.cim;
        titleInput.className = 'title-edit-input';
        titleInput.style.display = 'none';
        titleInput.onkeypress = (e) => { if(e.key === 'Enter') { saveMediaItem(item.firestoreId); } };

        titleContainer.appendChild(titleDisplay);
        titleContainer.appendChild(titleInput);
        itemDetails.appendChild(titleContainer);

        const typeSpan = document.createElement('span');
        typeSpan.textContent = `(${item.tipus === 'sorozat' ? 'Sorozat' : 'Film'})${isJointCategory && item.previousCategory ? ' | Eredeti mappa: ' + CATEGORY_MAP[item.previousCategory] : ''}`;
        itemDetails.appendChild(typeSpan);

        const linkDisplayDiv = document.createElement('div');
        linkDisplayDiv.id = `link-display-div-${item.firestoreId}`;
        linkDisplayDiv.style.display = 'block';

        if (item.link) {
            const linkA = document.createElement('a');
            linkA.href = item.link;
            linkA.target = '_blank';
            linkA.textContent = 'Link megtekintése 🔗';
            linkDisplayDiv.appendChild(linkA);
        } else {
             const linkPlaceholder = document.createElement('span');
             linkPlaceholder.textContent = 'Nincs link hozzáadva.';
             linkPlaceholder.style.color = '#777';
             linkPlaceholder.style.fontSize = '0.9em';
             linkDisplayDiv.appendChild(linkPlaceholder);
        }
        itemDetails.appendChild(linkDisplayDiv);

        const linkInput = document.createElement('input');
        linkInput.type = 'text';
        linkInput.id = `link-edit-${item.firestoreId}`;
        linkInput.placeholder = 'Link (IMDb, MAL, stb.) szerkesztése...';
        linkInput.className = 'link-edit-input'; 
        linkInput.style.display = 'none';
        itemDetails.appendChild(linkInput);
        
        if (item.tipus === 'sorozat') {
            const maxEpInput = document.createElement('input');
            maxEpInput.type = 'number';
            maxEpInput.id = `max-episode-edit-${item.firestoreId}`;
            maxEpInput.placeholder = 'Max Epizód szerkesztése...';
            maxEpInput.className = 'max-episode-edit-input'; 
            maxEpInput.style.display = 'none';
            itemDetails.appendChild(maxEpInput);
        }
        
        const thumbnailEditInput = document.createElement('input');
        thumbnailEditInput.type = 'text';
        thumbnailEditInput.id = `thumbnail-edit-${item.firestoreId}`;
        thumbnailEditInput.placeholder = 'Bélyegkép URL szerkesztése...';
        thumbnailEditInput.className = 'thumbnail-edit-input'; 
        thumbnailEditInput.style.display = 'none';
        itemDetails.appendChild(thumbnailEditInput);

        const notesContainer = document.createElement('div');
        notesContainer.className = 'notes-container';

        const notesLabel = document.createElement('span');
        notesLabel.className = 'notes-label';
        notesLabel.textContent = 'Megjegyzés:';
        notesContainer.appendChild(notesLabel);

        const notesDisplay = document.createElement('div');
        notesDisplay.id = `notes-display-${item.firestoreId}`;
        notesDisplay.className = 'notes-display-area';
        notesDisplay.textContent = item.notes || 'Nincs megjegyzés.';
        notesContainer.appendChild(notesDisplay);

        const notesTextarea = document.createElement('textarea');
        notesTextarea.id = `notes-edit-${item.firestoreId}`;
        notesTextarea.className = 'notes-textarea';
        notesTextarea.style.display = 'none';
        notesTextarea.value = item.notes || '';
        notesContainer.appendChild(notesTextarea);
        
        itemDetails.appendChild(notesContainer);

        li.appendChild(itemDetails);

        // --- 3. JOBB OLDAL: VEZÉRLŐK ---
        const controls = document.createElement('div');
        controls.className = 'item-controls';

        const controlsRow = document.createElement('div');
        controlsRow.className = 'controls-row';
        
        if (item.tipus === 'sorozat') {
            const episodeControls = document.createElement('div');
            episodeControls.className = 'episode-controls';
            
            const watched = item.watchedEpisodes || 0;
            const max = item.maxEpisodes !== null && item.maxEpisodes !== undefined ? item.maxEpisodes : '?';
            const episodeProgress = (max !== '?') ? `/${max}` : '';
            const nextEpisode = watched + 1;

            episodeControls.innerHTML = `
                <span style="font-weight: 600;">Következő epizód: <span style="color: var(--theme-color); font-size: 1.1em;">${nextEpisode}</span></span>
                <span style="margin-left: 10px;">Epizódok: <strong>${watched}${episodeProgress}</strong></span>
                <button onclick="changeEpisodeCount('${item.firestoreId}', -1)">-</button>
                <button onclick="changeEpisodeCount('${item.firestoreId}', 1)">+</button>
            `;
            controlsRow.appendChild(episodeControls);
        }

        if (item.statusz === 'nézendő') {
            const button = document.createElement('button');
            button.textContent = 'Megnéztem';
            button.onclick = () => updateStatus(item.firestoreId, 'megnézve');
            controlsRow.appendChild(button);
        } else {
            const button = document.createElement('button');
            button.textContent = 'Mégse láttam';
            button.onclick = () => updateStatus(item.firestoreId, 'nézendő');
            controlsRow.appendChild(button);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Törlés 🗑️';
        deleteBtn.id = `delete-btn-${item.firestoreId}`;
        deleteBtn.className = 'delete-button-matched'; 
        deleteBtn.onclick = () => deleteItem(item.firestoreId);
        controlsRow.appendChild(deleteBtn);

        controls.appendChild(controlsRow);
        
        const editControlsContainer = document.createElement('div');
        editControlsContainer.style.display = 'flex';
        editControlsContainer.style.gap = '10px';
        editControlsContainer.style.marginTop = '5px';
        
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit'; // VÁLTOZTATVA: Eltávolítva az ikon
        editBtn.id = `edit-btn-${item.firestoreId}`;
        editBtn.className = 'title-action-btn';
        editBtn.onclick = () => toggleEditMode(item.firestoreId);
        editControlsContainer.appendChild(editBtn);

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Mentés ✅';
        saveBtn.id = `save-btn-${item.firestoreId}`;
        saveBtn.className = 'title-action-btn save-button';
        saveBtn.style.display = 'none';
        saveBtn.onclick = () => saveMediaItem(item.firestoreId);
        editControlsContainer.appendChild(saveBtn);
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Mégse ❌';
        cancelBtn.id = `cancel-btn-${item.firestoreId}`;
        cancelBtn.className = 'title-action-btn cancel-button';
        cancelBtn.style.display = 'none';
        cancelBtn.onclick = () => toggleEditMode(item.firestoreId);
        editControlsContainer.appendChild(cancelBtn);

        controls.appendChild(editControlsContainer);
        
        if (!isJointCategory) {
            const sendButton = document.createElement('button');
            sendButton.textContent = '➡️ Közös listára';
            sendButton.id = `send-btn-${item.firestoreId}`;
            sendButton.className = 'title-action-btn';
            sendButton.onclick = () => sendToJoint(item.firestoreId);
            controls.appendChild(sendButton);
        } else if (item.previousCategory) {
            const backButton = document.createElement('button');
            backButton.textContent = `⬅️ Vissza (${CATEGORY_MAP[item.previousCategory]})`;
            backButton.id = `back-btn-${item.firestoreId}`;
            backButton.className = 'title-action-btn';
            backButton.onclick = () => sendBackFromJoint(item.firestoreId);
            controls.appendChild(backButton);
        }

        li.appendChild(controls);

        if (item.statusz === 'nézendő') {
            nezendoUl.appendChild(li);
        } else {
            megnezveUl.appendChild(li);
        }
    });
}


// === 7. JÁTÉK LISTA MEGJELENÍTÉSE (Módosítva) ===

window.renderGameLists = function() {
    const nezendoUl = document.getElementById('game-nezendo-lista');
    const megnezveUl = document.getElementById('game-megnezve-lista');
    
    nezendoUl.innerHTML = '';
    megnezveUl.innerHTML = '';
    
    const searchTerm = document.getElementById('game-search-input').value.toLowerCase().trim();
    let filteredList = gameList;

    if (searchTerm.length > 0) {
        filteredList = filteredList.filter(item => item.cim.toLowerCase().includes(searchTerm));
    }

    filteredList.sort((a, b) => a.cim.localeCompare(b.cim, 'hu', { sensitivity: 'base' }));

    filteredList.forEach(item => {
        const li = document.createElement('li');
        li.className = `tracker-item ${item.statusz === 'kijátszottam' ? 'watched' : ''}`;

        // --- 1. BAL OLDAL: THUMBNAIL ---
        const thumbnailContainer = document.createElement('div');
        thumbnailContainer.id = `thumbnail-container-game-${item.firestoreId}`;
        thumbnailContainer.className = 'thumbnail-container';

        const imageUrl = item.thumbnailUrl;
        if (imageUrl) {
            const thumbnailImg = document.createElement('img');
            thumbnailImg.className = 'thumbnail-img';
            thumbnailImg.src = imageUrl;
            thumbnailImg.alt = `Thumbnail: ${item.cim}`;
            thumbnailImg.onerror = function() {
                this.onerror = null;
                this.parentElement.innerHTML = '<span>🎮</span>';
                this.parentElement.style.fontSize = '3em';
            };
            thumbnailContainer.appendChild(thumbnailImg);
        } else {
            thumbnailContainer.innerHTML = '<span>🎮</span>';
            thumbnailContainer.style.fontSize = '3em';
        }
        li.appendChild(thumbnailContainer);


        // --- 2. KÖZÉPSŐ: ITEM RÉSZLETEK ÉS SZERKESZTŐ INPUTOK ---
        const itemDetails = document.createElement('div');
        itemDetails.className = 'item-details';

        const titleContainer = document.createElement('div');
        titleContainer.className = 'item-title-container';

        const titleDisplay = document.createElement('strong');
        titleDisplay.id = `title-display-game-${item.firestoreId}`;
        titleDisplay.textContent = item.cim;
        titleDisplay.style.display = 'inline-block';
        titleDisplay.style.marginRight = '5px';

        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.id = `title-edit-game-${item.firestoreId}`;
        titleInput.value = item.cim;
        titleInput.className = 'title-edit-input'; 
        titleInput.style.display = 'none';
        titleInput.onkeypress = (e) => { 
            if(e.key === 'Enter') { window.saveGameItem(item.firestoreId); } 
        }; 
        
        titleContainer.appendChild(titleDisplay);
        titleContainer.appendChild(titleInput);
        itemDetails.appendChild(titleContainer);

        const platformSpan = document.createElement('span');
        platformSpan.textContent = `(${item.platform})`;
        itemDetails.appendChild(platformSpan);
        
        // ÚJ: Thumbnail URL szerkesztő mező (rejtett)
        const thumbnailEditInput = document.createElement('input');
        thumbnailEditInput.type = 'text';
        thumbnailEditInput.id = `thumbnail-edit-game-${item.firestoreId}`;
        thumbnailEditInput.placeholder = 'Bélyegkép URL szerkesztése...';
        thumbnailEditInput.className = 'thumbnail-edit-input'; 
        thumbnailEditInput.style.display = 'none';
        itemDetails.appendChild(thumbnailEditInput);
        
        li.appendChild(itemDetails);

        // --- 3. JOBB OLDAL: VEZÉRLŐK ---
        const controls = document.createElement('div');
        controls.className = 'item-controls';

        const controlsRow = document.createElement('div');
        controlsRow.className = 'controls-row';
        
        const editControlsContainer = document.createElement('div');
        editControlsContainer.style.display = 'flex';
        editControlsContainer.style.gap = '10px';
        editControlsContainer.style.marginTop = '5px';
        
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit'; // VÁLTOZTATVA: Eltávolítva az ikon
        editBtn.id = `edit-btn-game-${item.firestoreId}`;
        editBtn.className = 'title-action-btn';
        editBtn.onclick = () => window.toggleGameEditMode(item.firestoreId);
        editControlsContainer.appendChild(editBtn);

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Mentés ✅';
        saveBtn.id = `save-btn-game-${item.firestoreId}`;
        saveBtn.className = 'title-action-btn save-button';
        saveBtn.style.display = 'none';
        saveBtn.onclick = () => window.saveGameItem(item.firestoreId);
        editControlsContainer.appendChild(saveBtn);
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Mégse ❌';
        cancelBtn.id = `cancel-btn-game-${item.firestoreId}`;
        cancelBtn.className = 'title-action-btn cancel-button';
        cancelBtn.style.display = 'none';
        cancelBtn.onclick = () => window.toggleGameEditMode(item.firestoreId);
        editControlsContainer.appendChild(cancelBtn);

        controlsRow.appendChild(editControlsContainer);

        if (item.statusz === 'játszandó') {
            const button = document.createElement('button');
            button.textContent = 'Kijátszottam';
            button.onclick = () => updateGameStatus(item.firestoreId, 'kijátszottam');
            controlsRow.appendChild(button);
        } else {
            const button = document.createElement('button');
            button.textContent = 'Mégse játszottam';
            button.onclick = () => updateGameStatus(item.firestoreId, 'játszandó');
            controlsRow.appendChild(button);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Törlés 🗑️';
        deleteBtn.id = `delete-btn-game-${item.firestoreId}`;
        deleteBtn.className = 'delete-button-matched'; 
        deleteBtn.onclick = () => deleteGameItem(item.firestoreId);
        controlsRow.appendChild(deleteBtn);

        controls.appendChild(controlsRow);
        li.appendChild(controls);

        if (item.statusz === 'játszandó') {
            nezendoUl.appendChild(li);
        } else {
            megnezveUl.appendChild(li);
        }
    });
}

// Eseménykezelő a dinamikus gombokhoz
function handleListClick(event) {
    const target = event.target;
    const firestoreId = target.getAttribute('data-id');

    if (!firestoreId) return;

    if (target.matches('[data-action="edit-media"]')) {
        toggleEditMode(firestoreId);
    }
    
    if (target.matches('[data-action="save-media"]')) {
         saveMediaItem(firestoreId);
    }

    if (target.matches('[data-action="cancel-media"]')) {
         toggleEditMode(firestoreId); 
    }
}


// ESZEMÉNY DELEGÁCIÓ A DINAMIKUS GOMBOKHOZ
document.addEventListener('click', handleListClick);


// Indítsuk az alkalmazást, miután betöltött a DOM
checkInitialAccess();
