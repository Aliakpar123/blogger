document.addEventListener('DOMContentLoaded', () => {

    // alert("✅ SYSTEM ONLINE v9.9.80"); 
    console.log("SCRIPT STARTED v9.9.80");

    // Initialize Telegram
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        try {
            window.Telegram.WebApp.setHeaderColor('#0f1115');
        } catch (e) { }
    }

    // === CONFIGURATION ===
    const API_URL = 'http://localhost:3000/api'; // Local backend
    const KASPI_PAY_LINK = 'https://kaspi.kz/pay/YOUR_MERCHANT_NAME';

    // === API HELPERS ===
    async function apiFetch(endpoint, options = {}) {
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error('API Request Failed:', e);
            return null; // Fallback to handling null (i.e., offline/no server)
        }
    }

    // Safe JSON Parse
    function safeParse(key, defaultVal) {
        try {
            const val = localStorage.getItem(key);
            return val ? JSON.parse(val) : defaultVal;
        } catch (e) {
            console.error('Data error', e);
            return defaultVal;
        }
    }

    // State
    const DEFAULT_SLOTS = 3;
    let maxSlots = parseInt(localStorage.getItem('max_slots')) || DEFAULT_SLOTS;
    let wishListItems = safeParse('wishlist_items', []);

    const FESTIVE_AVATARS = {
        elf: [
            "https://media.giphy.com/media/3otPoSefCKYjsiyIxW/giphy.gif", // Will Ferrell Elf
            "https://media.giphy.com/media/l2YWs1NexTst9YmFG/giphy.gif", // Dancing Elf
            "https://media.giphy.com/media/xUySTxD71WmjOwi2I/giphy.gif" // Elf Cheering
        ],
        santa: [
            "https://media.giphy.com/media/l1AvyLF0kdgZEhLZS/giphy.gif", // Santa Waving
            "https://media.giphy.com/media/3o6fJdYXEWgW3TfDwt/giphy.gif", // Santa Dancing
            "https://media.giphy.com/media/4Tbi3JylIFpQQ/giphy.gif" // Bad Santa
        ]
    };

    let userProfile = safeParse('user_profile', {
        id: 'u_' + Date.now(),
        name: 'Guest',
        username: '@guest',
        avatar: FESTIVE_AVATARS.santa[0], // Default temp
        subscribers: 0,
        isPrivate: false
    });

    // MIGRATION: Force update avatar to random Festive one if generic/old
    const allFestive = [...FESTIVE_AVATARS.elf, ...FESTIVE_AVATARS.santa];
    if (userProfile.avatar.includes('ui-avatars.com') || !allFestive.includes(userProfile.avatar)) {
        const randomAv = allFestive[Math.floor(Math.random() * allFestive.length)];
        userProfile.avatar = randomAv;
        localStorage.setItem('user_profile', JSON.stringify(userProfile));
    }

    // --- MOVED FIXED_MOCKS HERE FOR GLOBAL ACCESS ---
    const FIXED_MOCKS = [
        { id: 101, name: "Кристина W.", username: "@kristina", avatar: FESTIVE_AVATARS.elf[0], donated: "2.5M ₸", bio: "Щедрый пользователь 🎁", isPrivate: false, subscribers: 5200 },
        { id: 102, name: "Alex B.", username: "@alexb", avatar: FESTIVE_AVATARS.santa[0], donated: "1.8M ₸", bio: "Investments 📈", isPrivate: false, subscribers: 3100 },
        { id: 103, name: "Dana Life", username: "@danalife", avatar: FESTIVE_AVATARS.elf[1], donated: "950k ₸", bio: "Lifestyle blog ✨", isPrivate: true, subscribers: 15400 },
        { id: 104, name: "Mr. Beast KZ", username: "@mrbeastkz", avatar: FESTIVE_AVATARS.santa[1], donated: "500k ₸", bio: "Charity & Fun", isPrivate: false, subscribers: 50000 },
        { id: 105, name: "Aigerim", username: "@aika", avatar: FESTIVE_AVATARS.elf[2], donated: "320k ₸", bio: "Student 📚", isPrivate: true, subscribers: 800 },
        { id: 1, name: "Anna Smirnova", username: "@annas", avatar: FESTIVE_AVATARS.santa[0], donated: "150k ₸", bio: "Photography Lover 📷", isPrivate: true, subscribers: 5400 },
        { id: 2, name: "Max Payne", username: "@maxp", avatar: FESTIVE_AVATARS.elf[1], donated: "5k ₸", bio: "Gamer & Streamer 🎮", isPrivate: false, subscribers: 1200 },
        { id: 3, name: "Elena K.", username: "@elenak", avatar: FESTIVE_AVATARS.santa[1], donated: "10k ₸", bio: "Traveler ✈️", isPrivate: true, subscribers: 8900 }
    ];

    // Public View API
    let isPublicView = false;
    let isSubscribedMock = false;
    let visitedProfile = null;

    // Elements
    const container = document.getElementById('wish-list-container');
    const paymentModal = document.getElementById('payment-modal');
    const amountInput = document.getElementById('payment-amount');

    // --- FUNCTIONS ---

    function saveState() {
        localStorage.setItem('wishlist_items', JSON.stringify(wishListItems));
        localStorage.setItem('user_profile', JSON.stringify(userProfile));
        localStorage.setItem('max_slots', maxSlots);
        updateSlotsUI();
        // Server Sync Disabled
    }

    // Debounce helper to prevent flooding server
    let debounceTimer;
    function syncUserWishes() {
        // DISABLED
    }

    // Sync User Profile to Server on Load
    async function syncUserProfile() {
        // DISABLED
    }

    function updateSlotsUI() {
        const counter = document.getElementById('slots-counter');
        const used = wishListItems.length;
        if (counter) counter.innerText = `${used}/${maxSlots}`;
    }

    function formatCurrency(num) {
        return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(num);
    }

    function formatCompactNumber(number) {
        return Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(number);
    }

    function deleteItem(id) {
        wishListItems = wishListItems.filter(item => item.id != id);
        saveState();
        renderItems();
    }

    function updateProfileUI() {
        const profileNameEl = document.getElementById('profile-name');
        const profileBioEl = document.getElementById('profile-bio');
        const profileAvatarEl = document.getElementById('profile-avatar');
        const privateModeToggle = document.getElementById('private-mode-toggle');
        const statSubscribers = document.getElementById('stat-subscribers');
        const statWishes = document.getElementById('stat-wishes');

        // USE VISITED PROFILE IF IN "GUEST" MODE
        const data = visitedProfile || userProfile;

        if (profileNameEl) {
            let nameDisplay = data.name;
            if (visitedProfile) {
                nameDisplay = visitedProfile.username || visitedProfile.name;
            } else {
                if (data.username && !data.name.startsWith('@')) {
                    nameDisplay = data.username;
                } else {
                    nameDisplay = data.name;
                }
            }
            if (nameDisplay && !nameDisplay.startsWith('@') && /^[a-zA-Z0-9_]+$/.test(nameDisplay)) {
            }
            if (!nameDisplay && window.Telegram?.WebApp?.initDataUnsafe?.user?.username) {
                nameDisplay = '@' + window.Telegram.WebApp.initDataUnsafe.user.username;
            }

            profileNameEl.innerText = nameDisplay || 'Пользователь';
            if (profileBioEl) profileBioEl.innerText = data.bio || 'Нет описания';

            if (profileAvatarEl) {
                profileAvatarEl.src = data.avatar;
                profileAvatarEl.onerror = () => {
                    profileAvatarEl.src = "https://media.giphy.com/media/l2YWs1NexTst9YmFG/giphy.gif";
                    profileAvatarEl.onerror = null;
                };
            }

            if (privateModeToggle) {
                privateModeToggle.checked = data.isPrivate;
                privateModeToggle.disabled = !!visitedProfile;
            }

            if (statSubscribers) statSubscribers.innerText = formatCompactNumber(data.subscribers || 0);
            if (statWishes) statWishes.innerText = wishListItems.length;

            const actionsContainer = document.querySelector('.insta-actions');
            if (actionsContainer) {
                if (visitedProfile) {
                    const isSub = isSubscribedMock;
                    actionsContainer.innerHTML = `
                        <button class="btn-insta-edit ${isSub ? 'subscribed' : ''}" id="subscribe-action-btn" 
                            style="${isSub ? 'background: #333; color: white;' : 'background: #0095f6; color: white; border: none;'}">
                            ${isSub ? 'Вы подписаны' : 'Подписаться'}
                        </button>
                    `;
                    const subBtn = document.getElementById('subscribe-action-btn');
                    if (subBtn) subBtn.addEventListener('click', () => {
                        toggleSubscription(data);
                    });

                } else {
                    actionsContainer.innerHTML = `
                        <button class="btn-insta-edit" id="edit-profile-btn">Редактировать</button>
                    `;
                    const editBtn = document.getElementById('edit-profile-btn');
                    if (editBtn) {
                        editBtn.addEventListener('click', () => {
                            const newName = prompt("Имя:", userProfile.name);
                            if (newName) {
                                userProfile.name = newName;
                                localStorage.setItem('user_profile', JSON.stringify(userProfile));
                                updateProfileUI();
                            }
                        });
                    }
                }
            }
        }
    }

    function toggleSubscription(user) {
        isSubscribedMock = !isSubscribedMock;
        if (isSubscribedMock) {
            user.subscribers = (user.subscribers || 0) + 1;
        } else {
            user.subscribers = Math.max(0, (user.subscribers || 0) - 1);
        }
        updateProfileUI();
        renderItems();
    }

    // --- MODAL & PAYMENT ---
    function openModal(itemTitle, itemId) {
        if (!paymentModal) return;
        paymentModal.dataset.itemId = itemId;
        paymentModal.classList.remove('hidden');
        amountInput.value = '';
        requestAnimationFrame(() => {
            paymentModal.classList.add('active');
            amountInput.focus();
        });
    }

    function closeModal() {
        if (!paymentModal) return;
        paymentModal.classList.remove('active');
        setTimeout(() => {
            paymentModal.classList.add('hidden');
            amountInput.blur();
        }, 300);
    }

    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (paymentModal) {
        paymentModal.addEventListener('click', (e) => {
            if (e.target === paymentModal) closeModal();
        });
    }

    const payBtn = document.getElementById('pay-kaspi-btn');
    if (payBtn) {
        payBtn.addEventListener('click', () => {
            const amount = amountInput.value;
            if (!amount || amount <= 0) {
                alert('Пожалуйста, введите сумму');
                return;
            }
            if (paymentModal.dataset.mode === 'donation') {
                alert(`Спасибо за поддержку! 💖\nСумма: ${formatCurrency(amount)}`);
                paymentModal.dataset.mode = ''; // Reset
                document.querySelector('#payment-modal h3').innerText = "Сумма пополнения";
                window.open(KASPI_PAY_LINK, '_blank');
                closeModal();
                return;
            }
            const itemId = paymentModal.dataset.itemId;
            const item = wishListItems.find(i => i.id == itemId);
            if (item) {
                const payAmount = parseInt(amount);
                item.collected += payAmount;
                saveState();
                renderItems();
                alert(`Успешно пополнено на ${formatCurrency(payAmount)}!`);
            }
            window.open('https://kaspi.kz/pay', '_blank');
            closeModal();
        });
    }

    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const addVal = parseInt(chip.dataset.amount);
            const currentVal = parseInt(amountInput.value) || 0;
            amountInput.value = currentVal + addVal;
        });
    });

    // --- CREATE WISHLIST ---
    // !!! CRITICAL FIX: Renamed variable to avoid collision with global ID
    const createListBtn = document.getElementById('confirm-create-btn');
    if (createListBtn) {
        createListBtn.addEventListener('click', () => {
            if (wishListItems.length >= maxSlots) {
                alert("Слоты заполнены! Выполните задания.");
                return;
            }
            const titleInput = document.getElementById('new-item-title');
            const priceInput = document.getElementById('new-item-price');
            const imageInput = document.getElementById('new-item-image');

            const newItem = {
                id: Date.now(),
                title: titleInput.value,
                collected: 0,
                goal: parseInt(priceInput.value) || 0,
                image: imageInput.src,
                category: "Разное"
            };

            wishListItems.unshift(newItem);
            saveState();
            renderItems();

            document.getElementById('create-step-2').classList.add('hidden');
            document.querySelector('.create-step-1').classList.remove('hidden');
            document.getElementById('kaspi-link').value = '';
            document.querySelector('[data-target="home-view"]').click();
        });
    }

    // Parser Logic
    const parseBtn = document.getElementById('parse-link-btn');
    const kaspiInput = document.getElementById('kaspi-link');
    if (parseBtn && kaspiInput) {
        kaspiInput.addEventListener('input', (e) => parseBtn.disabled = e.target.value.length < 5);
        parseBtn.addEventListener('click', async () => {
            alert("Kaspi Parser: Feature disabled temporarily for stability.");
            // Manual fallback
            document.querySelector('.create-step-1').classList.add('hidden');
            document.getElementById('create-step-2').classList.remove('hidden');
            document.getElementById('new-item-image').src = 'https://placehold.co/600x400?text=Foto';
        });
    }

    const cancelBtn = document.getElementById('cancel-create-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.getElementById('create-step-2').classList.add('hidden');
            document.querySelector('.create-step-1').classList.remove('hidden');
        });
    }

    // Profile Actions
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            const newName = prompt("Имя:", userProfile.name);
            if (newName) {
                userProfile.name = newName;
                localStorage.setItem('user_profile', JSON.stringify(userProfile));
                updateProfileUI();
            }
        });
    }

    const privateModeToggle = document.getElementById('private-mode-toggle');
    if (privateModeToggle) {
        privateModeToggle.addEventListener('change', (e) => {
            userProfile.isPrivate = e.target.checked;
            localStorage.setItem('user_profile', JSON.stringify(userProfile));
            updateProfileUI();
        });
    }

    const publicPreviewBtn = document.getElementById('public-preview-btn');
    const exitPublicViewLink = document.getElementById('exit-public-view');
    if (publicPreviewBtn) {
        publicPreviewBtn.addEventListener('click', () => {
            isPublicView = true;
            isSubscribedMock = false;
            document.querySelector('[data-target="home-view"]').click();
            renderItems();
        });
    }
    if (exitPublicViewLink) {
        exitPublicViewLink.addEventListener('click', (e) => {
            e.preventDefault();
            isPublicView = false;
            renderItems();
            document.querySelector('[data-target="profile-view"]').click();
        });
    }

    const subscribeBtn = document.getElementById('subscribe-btn');
    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', () => {
            isSubscribedMock = true;
            renderItems();
        });
    }

    // Invite & Channel
    const inviteBtn = document.getElementById('invite-btn');
    // ... invite logic skipped for brevity, standard ...

    // Share Button - REMOVED BY USER REQUEST
    // const mainShareBtn = ...;
    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.content-area, .view-section');
    const headerBackBtn = document.getElementById('header-back-btn');
    const headerUserInfo = document.getElementById('header-user-info');
    const headerTitle = document.getElementById('header-title');
    let historyStack = ['home-view'];

    function navigateTo(targetId) {
        if (targetId !== historyStack[historyStack.length - 1]) historyStack.push(targetId);

        navItems.forEach(item => {
            if (item.dataset.target === targetId) item.classList.add('active');
            else item.classList.remove('active');
        });
        views.forEach(view => {
            if (view.id === targetId) view.classList.remove('hidden');
            else view.classList.add('hidden');
        });

        const isMainTab = ['home-view', 'profile-view', 'user-profile-view', 'tasks-view'].includes(targetId);

        if (isMainTab) {
            headerBackBtn.classList.add('hidden');
            headerUserInfo.style.display = (targetId === 'home-view') ? 'flex' : 'none';
            if (targetId !== 'home-view') headerTitle.classList.remove('hidden');
            else headerTitle.classList.add('hidden');

            if (window.Telegram?.WebApp?.BackButton) window.Telegram.WebApp.BackButton.hide();
        } else {
            headerBackBtn.classList.remove('hidden');
            headerUserInfo.style.display = 'none';
            headerTitle.classList.remove('hidden');
            if (window.Telegram?.WebApp?.BackButton) {
                window.Telegram.WebApp.BackButton.show();
                window.Telegram.WebApp.BackButton.onClick(() => {
                    historyStack.pop();
                    navigateTo(historyStack[historyStack.length - 1] || 'home-view');
                });
            }
        }

        if (targetId === 'home-view' && visitedProfile) headerTitle.innerHTML = `В гостях: ${visitedProfile.name}`;
        if (targetId === 'create-view') headerTitle.textContent = 'Создать';
        if (targetId === 'profile-view') headerTitle.textContent = 'Рейтинг';
        if (targetId === 'user-profile-view') headerTitle.textContent = 'Профиль';
        if (targetId === 'tasks-view') headerTitle.textContent = 'Задания';

        if (targetId === 'user-profile-view') updateProfileUI();
    }

    navItems.forEach(nav => {
        nav.addEventListener('click', (e) => {
            const target = e.currentTarget.dataset.target;
            if (target) navigateTo(target);
        });
    });

    headerBackBtn.addEventListener('click', () => {
        historyStack.pop();
        navigateTo(historyStack[historyStack.length - 1] || 'home-view');
    });

    // Search Logic
    const searchInput = document.getElementById('user-search-input');
    const searchResults = document.getElementById('search-results');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (query.length < 2) {
                searchResults.classList.add('hidden');
                return;
            }
            const filtered = FIXED_MOCKS.filter(u => u.name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query));
            renderSearchResults(filtered);
        });
    }

    function renderSearchResults(users) {
        searchResults.innerHTML = '';
        if (users.length === 0) {
            searchResults.classList.add('hidden');
            return;
        }
        searchResults.classList.remove('hidden');
        users.forEach(user => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `<img src="${user.avatar}" class="result-avatar"><span>${user.name}</span>`;
            div.addEventListener('click', () => {
                visitedProfile = user;
                isPublicView = true;
                updateProfileUI();
                searchResults.classList.add('hidden');
                renderItems();
                document.querySelector('[data-target="user-profile-view"]').click();
            });
            searchResults.appendChild(div);
        });
    }

    // Server Users Logic - Using Mocks Only for Stability
    function renderGenerousUsers() {
        const listContainer = document.getElementById('generous-users-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';
        FIXED_MOCKS.forEach((user, index) => {
            const div = document.createElement('div');
            div.className = 'user-card-item';
            div.innerHTML = `<span class="uc-rank">${index + 1}</span><img src="${user.avatar}" class="uc-avatar"><div class="uc-info"><span class="uc-name">${user.name}</span><span class="uc-donated">Подарил: ${user.donated}</span></div>`;
            div.addEventListener('click', () => {
                visitedProfile = user;
                isPublicView = true;
                updateProfileUI();
                renderItems();
                document.querySelector('[data-target="user-profile-view"]').click();
            });
            listContainer.appendChild(div);
        });
    }

    // Initial Render calls
    updateSlotsUI();
    updateProfileUI();
    renderGenerousUsers();
    renderItems();

    document.querySelector('.nav-item.active')?.click();

});
