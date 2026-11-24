document.addEventListener('DOMContentLoaded', () => {
    // --- GESTION DES DONNÉES ---
    let data = JSON.parse(localStorage.getItem('budgetData')) || {
        provisions: [], // {id, name, amount}
        expenses: [],   // {id, provId, desc, amount, date}
        incomes: [],    // {id, name, amount}
        fixed: []       // {id, name, amount, isExceptional}
    };

    const saveData = () => localStorage.setItem('budgetData', JSON.stringify(data));

    // --- NAVIGATION ---
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
            updateUI(); // Rafraichir l'UI au changement d'onglet
        });
    });

    // --- LOGIQUE PROVISIONS ---
    const addProvBtn = document.getElementById('add-prov-btn');
    
    addProvBtn.addEventListener('click', () => {
        const name = document.getElementById('prov-name').value;
        const amount = parseFloat(document.getElementById('prov-amount').value);

        if (name && amount) {
            data.provisions.push({
                id: Date.now(),
                name: name,
                amount: amount
            });
            document.getElementById('prov-name').value = '';
            document.getElementById('prov-amount').value = '';
            saveData();
            updateUI();
        }
    });

    // --- LOGIQUE DÉPENSES RÉELLES ---
    const addRealBtn = document.getElementById('add-real-btn');

    addRealBtn.addEventListener('click', () => {
        const provId = document.getElementById('expense-category').value;
        const desc = document.getElementById('real-desc').value;
        const amount = parseFloat(document.getElementById('real-amount').value);

        if ((provId || provId === 'unplanned') && desc && amount) {
            data.expenses.push({
                id: Date.now(),
                provId: provId, // Soit l'ID de la provision, soit 'unplanned'
                desc: desc,
                amount: amount,
                date: new Date().toLocaleDateString()
            });
            
            document.getElementById('real-desc').value = '';
            document.getElementById('real-amount').value = '';
            saveData();
            updateUI();
        }
    });

    // --- LOGIQUE REVENUS & FIXES ---
    document.getElementById('add-inc-btn').addEventListener('click', () => {
        addItemToList('incomes', 'inc-name', 'inc-amount');
    });

    document.getElementById('add-fix-btn').addEventListener('click', () => {
        const name = document.getElementById('fix-name').value;
        const amount = parseFloat(document.getElementById('fix-amount').value);
        const isExc = document.getElementById('is-exceptional').checked;

        if (name && amount) {
            data.fixed.push({ id: Date.now(), name, amount, isExceptional: isExc });
            clearInputs(['fix-name', 'fix-amount']);
            saveData();
            updateUI();
        }
    });

    function addItemToList(arrayKey, inputNameId, inputAmtId) {
        const name = document.getElementById(inputNameId).value;
        const amount = parseFloat(document.getElementById(inputAmtId).value);
        if (name && amount) {
            data[arrayKey].push({ id: Date.now(), name, amount });
            clearInputs([inputNameId, inputAmtId]);
            saveData();
            updateUI();
        }
    }

    function clearInputs(ids) {
        ids.forEach(id => document.getElementById(id).value = '');
    }

    // --- MISE À JOUR DE L'INTERFACE (RENDERING) ---
    function updateUI() {
        renderProvisions();
        renderExpenses();
        renderGlobal();
        updateCategoryDropdown();
    }

    function renderProvisions() {
        const list = document.getElementById('provisions-list');
        list.innerHTML = '';
        let total = 0;

        data.provisions.forEach(prov => {
            // Calculer ce qui a été dépensé pour cette provision
            const spent = data.expenses
                .filter(e => e.provId == prov.id)
                .reduce((sum, e) => sum + e.amount, 0);
            
            const remaining = prov.amount - spent;
            total += prov.amount;

            const li = document.createElement('li');
            li.className = remaining < 0 ? 'negative' : '';
            li.innerHTML = `
                <div class="item-info">
                    <strong>${prov.name}</strong>
                    <small>Budget: ${prov.amount}€ | Dépensé: ${spent}€</small>
                </div>
                <div class="item-amount ${remaining < 0 ? 'neg' : ''}">
                    Reste: ${remaining.toFixed(2)}€
                </div>
                <button onclick="deleteItem('provisions', ${prov.id})" class="del-btn">×</button>
            `;
            list.appendChild(li);
        });
        document.getElementById('total-prov').innerText = total.toFixed(2) + ' €';
    }

    function renderExpenses() {
        const list = document.getElementById('real-expenses-list');
        list.innerHTML = '';
        let totalSpent = 0;
        let totalUnplanned = 0;

        // Trier par date récente
        const sortedExpenses = [...data.expenses].reverse();

        sortedExpenses.forEach(exp => {
            totalSpent += exp.amount;
            if(exp.provId === 'unplanned') totalUnplanned += exp.amount;

            let label = exp.provId === 'unplanned' 
                ? '<span class="badge-unplanned">Non Prévu</span>' 
                : `<small>${getProvNameById(exp.provId)}</small>`;

            const li = document.createElement('li');
            li.innerHTML = `
                <div class="item-info">
                    ${label}
                    <div>${exp.desc}</div>
                </div>
                <div class="item-amount">-${exp.amount.toFixed(2)}€</div>
                <button onclick="deleteItem('expenses', ${exp.id})" class="del-btn">×</button>
            `;
            list.appendChild(li);
        });

        document.getElementById('total-spent').innerText = totalSpent.toFixed(2) + ' €';
        document.getElementById('total-unplanned').innerText = totalUnplanned.toFixed(2) + ' €';
    }

    function renderGlobal() {
        // Revenus
        const incList = document.getElementById('income-list');
        incList.innerHTML = '';
        let totalInc = 0;
        data.incomes.forEach(inc => {
            totalInc += inc.amount;
            incList.innerHTML += `<li>${inc.name}: ${inc.amount}€ <button onclick="deleteItem('incomes', ${inc.id})" class="del-btn">×</button></li>`;
        });

        // Fixes & Exceptionnels
        const fixList = document.getElementById('fixed-list');
        fixList.innerHTML = '';
        let totalFix = 0;
        data.fixed.forEach(fix => {
            totalFix += fix.amount;
            const tag = fix.isExceptional ? '<span class="tag-exc">EXC</span>' : '';
            fixList.innerHTML += `<li>${tag} ${fix.name}: ${fix.amount}€ <button onclick="deleteItem('fixed', ${fix.id})" class="del-btn">×</button></li>`;
        });

        // Calcul Reste à vivre
        // Reste = Revenus - (Total Provisions + Fixes) 
        // Note: On ne soustrait pas les dépenses réelles ici car elles sont censées être couvertes par les provisions ou les fixes.
        // Mais pour être précis, on peut afficher: Revenus - Fixes - Total Dépensé (Réel)
        
        const totalRealSpent = data.expenses.reduce((sum, e) => sum + e.amount, 0);
        const remaining = totalInc - totalFix - totalRealSpent;
        
        const remEl = document.getElementById('remaining-budget');
        remEl.innerText = remaining.toFixed(2) + ' €';
        remEl.style.color = remaining < 0 ? 'red' : 'green';
    }

    function updateCategoryDropdown() {
        const select = document.getElementById('expense-category');
        // Garder l'option "Non prévu"
        select.innerHTML = '<option value="">Choisir une catégorie...</option>';
        
        data.provisions.forEach(prov => {
            const option = document.createElement('option');
            option.value = prov.id;
            option.innerText = prov.name;
            select.appendChild(option);
        });
        
        const unplanned = document.createElement('option');
        unplanned.value = 'unplanned';
        unplanned.innerText = '⚠️ Non Prévu';
        select.appendChild(unplanned);
    }

    function getProvNameById(id) {
        const prov = data.provisions.find(p => p.id == id);
        return prov ? prov.name : 'Inconnu';
    }

    // Fonction globale pour suppression
    window.deleteItem = (arrayKey, id) => {
        if(confirm('Supprimer cet élément ?')) {
            data[arrayKey] = data[arrayKey].filter(item => item.id !== id);
            saveData();
            updateUI();
        }
    };

    // --- INSTALLATION PWA ---
    let deferredPrompt;
    const installBtn = document.getElementById('install-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    const closeModal = document.querySelector('.close-modal');

    settingsBtn.addEventListener('click', () => modal.classList.remove('hidden'));
    closeModal.addEventListener('click', () => modal.classList.add('hidden'));

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.classList.remove('hidden');
    });

    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                installBtn.classList.add('hidden');
            }
            deferredPrompt = null;
        }
    });

    // Initialisation
    updateUI();
});
