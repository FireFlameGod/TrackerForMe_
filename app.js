// Lista megjelenítése (JÁTÉK)
window.renderGameLists = function() {
    const nezendoUl = document.getElementById('game-nezendo-lista');
    const megnezveUl = document.getElementById('game-megnezve-lista');
    if (!nezendoUl || !megnezveUl) return; 
    nezendoUl.innerHTML = '';
    megnezveUl.innerHTML = '';
    
    const searchTerm = document.getElementById('game-search-input').value.toLowerCase().trim();

    let filteredList = gameList;
    
    if (searchTerm.length > 0) {
        filteredList = filteredList.filter(item => 
            item.cim.toLowerCase().includes(searchTerm)
        );
    }

    filteredList.sort((a, b) => a.cim.localeCompare(b.cim, 'hu', { sensitivity: 'base' }));


    filteredList.forEach(item => {
        const li = document.createElement('li');
        li.className = `tracker-item ${item.statusz === 'kijátszottam' ? 'watched' : ''}`;
        
        // JÁTÉK THUMBNAIL HELYŐRZŐ
        const thumbnailContainer = document.createElement('div');
        thumbnailContainer.className = 'thumbnail-container';
        thumbnailContainer.innerHTML = '<span>🎮</span>';
        thumbnailContainer.style.fontSize = '3em';
        li.appendChild(thumbnailContainer); 
        
        const itemDetails = document.createElement('div');
        itemDetails.className = 'item-details';
        
        // --- CÍM MEGJELENÍTÉS ÉS SZERKESZTÉS ---
        const titleContainer = document.createElement('div');
        titleContainer.className = 'item-title-container';
        
        // Cím Display
        const titleDisplay = document.createElement('strong');
        titleDisplay.id = `game-title-display-${item.firestoreId}`;
        titleDisplay.textContent = item.cim;
        titleDisplay.style.display = 'inline-block'; 
        titleContainer.appendChild(titleDisplay);
        
        // Cím Input
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.id = `game-title-edit-${item.firestoreId}`;
        titleInput.value = item.cim;
        titleInput.className = 'title-edit-input';
        titleInput.style.display = 'none'; 
        titleInput.onkeypress = (e) => { 
            if(e.key === 'Enter') {
                saveGameItem(item.firestoreId); 
            } 
        };
        titleContainer.appendChild(titleInput);
        
        itemDetails.appendChild(titleContainer);

        // --- PLATFORM MEGJELENÍTÉS ÉS SZERKESZTÉS ---

        // Platform Display
        const platformDisplay = document.createElement('span');
        platformDisplay.id = `game-platform-display-${item.firestoreId}`;
        platformDisplay.textContent = `(${item.platform})`;
        platformDisplay.style.display = 'inline-block';
        itemDetails.appendChild(platformDisplay);
        
        // Platform Select 
        const platformSelect = document.createElement('select');
        platformSelect.id = `game-platform-select-${item.firestoreId}`;
        platformSelect.className = 'link-edit-input'; 
        platformSelect.style.display = 'none';
        platformSelect.innerHTML = `
            <option value="PC">PC</option>
            <option value="PlayStation">PlayStation</option>
            <option value="Xbox">Xbox</option>
            <option value="Switch">Switch</option>
            <option value="Mobil">Mobil</option>
        `;
        platformSelect.value = item.platform;
        itemDetails.appendChild(platformSelect);

        li.appendChild(itemDetails);
        
        
        // --- VEZÉRLŐK KONTÉNER (ÚJ CSOMAGOLÁS A JÁTÉKOKNÁL IS) ---
        const controls = document.createElement('div');
        controls.className = 'item-controls';
        
        const controlsRow = document.createElement('div');
        controlsRow.className = 'controls-row';
        controlsRow.id = `game-status-controls-${item.firestoreId}`; 

        // Statusz gomb
        const statusButton = document.createElement('button');
        statusButton.className = 'title-action-btn'; 
        
        if (item.statusz === 'játszandó') {
            statusButton.textContent = 'Kijátszottam';
            statusButton.onclick = () => updateGameStatus(item.firestoreId, 'kijátszottam');
        } else {
            statusButton.textContent = 'Mégse játszottam';
            statusButton.onclick = () => updateGameStatus(item.firestoreId, 'játszandó');
        }
        controlsRow.appendChild(statusButton);
        
        // Törlés gomb
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Törlés 🗑️';
        deleteBtn.id = `game-delete-btn-${item.firestoreId}`;
        deleteBtn.className = 'title-action-btn delete-button-matched'; 
        deleteBtn.onclick = () => deleteGameItem(item.firestoreId);
        controlsRow.appendChild(deleteBtn);

        controls.appendChild(controlsRow);
        
        // --- Edit / Save / Cancel Gombok ---
        
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit'; 
        editButton.id = `game-edit-btn-${item.firestoreId}`;
        editButton.className = 'title-action-btn edit-button';
        editButton.title = 'Adatok szerkesztése';
        editButton.onclick = () => toggleGameEditMode(item.firestoreId); 
        controls.appendChild(editButton);

        const saveButton = document.createElement('button');
        saveButton.textContent = '✅ Mentés'; 
        saveButton.id = `game-save-btn-${item.firestoreId}`;
        saveButton.className = 'title-action-btn save-button';
        saveButton.style.display = 'none'; 
        saveButton.title = 'Adatok mentése';
        saveButton.onclick = () => saveGameItem(item.firestoreId); 
        controls.appendChild(saveButton); 

        const cancelButton = document.createElement('button');
        cancelButton.textContent = '❌ Mégse'; 
        cancelButton.id = `game-cancel-btn-${item.firestoreId}`;
        cancelButton.className = 'title-action-btn cancel-button';
        cancelButton.style.display = 'none'; 
        cancelButton.title = 'Szerkesztés megszakítása';
        cancelButton.onclick = () => toggleGameEditMode(item.firestoreId); 
        controls.appendChild(cancelButton); 
        
        li.appendChild(controls);
        
        if (item.statusz === 'játszandó') {
            nezendoUl.appendChild(li);
        } else {
            megnezveUl.appendChild(li);
        }
    });
}
