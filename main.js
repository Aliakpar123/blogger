document.addEventListener('DOMContentLoaded', () => {

    // alert("✅ SYSTEM ONLINE v9.9.80"); 
    console.log("SCRIPT STARTED v9.9.80");

    // Initialize Vercel Speed Insights
    try {
        const { injectSpeedInsights } = require('@vercel/speed-insights');
        injectSpeedInsights();
        console.log("Vercel Speed Insights initialized");
    } catch (e) {
        console.warn("Speed Insights not available:", e.message);
    }

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
        { id: 3, name: "Elena G.", username: "@elenag", avatar: FESTIVE_AVATARS.santa[2], donated: "10k ₸", bio: "Traveler ✈️", isPrivate: false, subscribers: 350 },
        { id: 4, name: "Dmitry K.", username: "@dimak", avatar: FESTIVE_AVATARS.elf[0], donated: "0 ₸", bio: "Developer 💻", isPrivate: false, subscribers: 5021 },
        { id: 5, name: "Olga V.", username: "@olgav", avatar: FESTIVE_AVATARS.santa[1], donated: "2M ₸", bio: "Art & Design 🎨", isPrivate: true, subscribers: 10500 },
        { id: 6, name: "Sergey P.", username: "@sergeyp", avatar: FESTIVE_AVATARS.elf[2], donated: "1.2M ₸", bio: "Crypto Enthusiast 🪙", isPrivate: false, subscribers: 8900 },
        { id: 7, name: "Maria L.", username: "@marial", avatar: FESTIVE_AVATARS.santa[0], donated: "750k ₸", bio: "Food Blogger 🍩", isPrivate: false, subscribers: 12000 },
        { id: 8, name: "Ivan T.", username: "@ivant", avatar: FESTIVE_AVATARS.elf[1], donated: "300k ₸", bio: "Sports & Fitness 🏋️", isPrivate: true, subscribers: 4500 },
        { id: 9, name: "Natalia R.", username: "@nataliar", avatar: FESTIVE_AVATARS.santa[2], donated: "100k ₸", bio: "Music is Life 🎵", isPrivate: false, subscribers: 2100 },
        { id: 10, name: "Timur S.", username: "@timurs", avatar: FESTIVE_AVATARS.elf[0], donated: "50k ₸", bio: "Tech Reviewer 📱", isPrivate: false, subscribers: 6700 },
        { id: 11, name: "Zuhra A.", username: "@zuhraa", avatar: FESTIVE_AVATARS.santa[1], donated: "3.5M ₸", bio: "Philanthropist ❤️", isPrivate: true, subscribers: 25000 },
        { id: 12, name: "Kairat N.", username: "@kairatn", avatar: FESTIVE_AVATARS.elf[2], donated: "1.5M ₸", bio: "Business & Startups 🚀", isPrivate: false, subscribers: 15000 }
    ];

    // Public View API
    let isPublicView = false;
    let isSubscribedMock = false;
    let visitedProfile = null;
    let currentCategory = 'Все'; // NEW: Category State

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

    // Category Logic
    const catPills = document.querySelectorAll('.cat-pill');
    catPills.forEach(pill => {
        pill.addEventListener('click', () => {
            // Update UI
            catPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            // Update State
            currentCategory = pill.dataset.cat;
            renderItems();
        });
    });

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
            const categoryInput = document.getElementById('new-item-category'); // NEW

            const newItem = {
                id: Date.now(),
                title: titleInput.value,
                collected: 0,
                goal: parseInt(priceInput.value) || 0,
                image: imageInput.src,
                category: categoryInput ? categoryInput.value : "Разное",
                isPrivate: document.getElementById('new-item-visibility')?.value === 'private' // NEW
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
            const url = kaspiInput.value;
            if (!url.includes('kaspi.kz')) {
                alert('Нужна ссылка на Kaspi.kz');
                return;
            }

            parseBtn.textContent = 'Загрузка...';
            parseBtn.disabled = true;

            try {
                let htmlContent = null;
                const isShortLink = url.includes('l.kaspi.kz');

                // 1. CorsProxy
                if (isShortLink) {
                    try {
                        let proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
                        let response = await fetch(proxyUrl);
                        htmlContent = await response.text();
                    } catch (e) {
                        console.warn("CorsProxy failed for short link", e);
                    }
                }

                // 2. AllOrigins
                if (!htmlContent) {
                    try {
                        let proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
                        let response = await fetch(proxyUrl);
                        let data = await response.json();
                        htmlContent = data.contents;
                    } catch (e) {
                        console.warn("AllOrigins failed", e);
                    }
                }

                // 3. Retry CorsProxy
                if (!htmlContent && !isShortLink) {
                    try {
                        let proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
                        let response = await fetch(proxyUrl);
                        htmlContent = await response.text();
                    } catch (e) { console.warn("CorsProxy retry failed", e); }
                }

                if (!htmlContent || htmlContent.length < 500) throw new Error('No content');

                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlContent, 'text/html');

                let title = doc.querySelector('meta[property="og:title"]')?.content || doc.querySelector('h1')?.innerText || 'Товар';
                title = title.replace(/\|.+$/, '').trim();

                let image = doc.querySelector('meta[property="og:image"]')?.content || 'https://placehold.co/600x400?text=Foto';

                let price = 0;
                // Try JSON-LD
                const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
                for (let s of scripts) {
                    try {
                        const json = JSON.parse(s.innerText);
                        if (json.offers && json.offers.price) { price = parseInt(json.offers.price); break; }
                    } catch (e) { }
                }

                // Fallback Regex
                if (!price) {
                    const match = htmlContent.match(/(\d{1,3}(?:\s\d{3})*)\s?[₸T]/);
                    if (match && match[1]) price = parseInt(match[1].replace(/\s/g, ''));
                }

                document.querySelector('.create-step-1').classList.add('hidden');
                document.getElementById('create-step-2').classList.remove('hidden');
                document.getElementById('new-item-title').value = title;
                document.getElementById('new-item-price').value = price || "";
                document.getElementById('new-item-image').src = image;

            } catch (e) {
                console.error("Parsing error:", e);
                const manual = confirm("Не удалось загрузить данные автоматически. Заполнить вручную?");
                if (manual) {
                    document.querySelector('.create-step-1').classList.add('hidden');
                    document.getElementById('create-step-2').classList.remove('hidden');
                    document.getElementById('new-item-image').src = 'https://placehold.co/600x400?text=Foto';
                }
            } finally {
                parseBtn.textContent = 'Далее';
                parseBtn.disabled = false;
            }
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

        // Logic to determine if we are on a top-level tab or a sub-view
        let isMainTab = ['home-view', 'profile-view', 'tasks-view'].includes(targetId);

        // "Profile" tab logic: 
        // If it's MY profile (visitedProfile is null) -> Main Tab (No Back Button)
        // If it's GUEST profile (visitedProfile is set) -> Sub View (Show Back Button)
        if (targetId === 'user-profile-view' && !visitedProfile) {
            isMainTab = true;
        }

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
        if (targetId === 'user-profile-view') {
            headerTitle.textContent = visitedProfile ? visitedProfile.name : 'Профиль';
        }
        if (targetId === 'tasks-view') headerTitle.textContent = 'Задания';

        if (targetId === 'user-profile-view') updateProfileUI();
    }

    navItems.forEach(nav => {
        nav.addEventListener('click', (e) => {
            const target = e.currentTarget.dataset.target;

            // "Return Immediately" / Reset Logic
            // Applied to Profile tab AND Rating tab (profile-view) as requested
            if (target === 'user-profile-view' || target === 'profile-view') {
                visitedProfile = null;
                isPublicView = false;
                isSubscribedMock = false;

                // Force immediate UI update to ensure we exit "Guest Mode"
                if (target === 'user-profile-view') {
                    updateProfileUI(); // Reset header/bio to self
                    renderItems();     // Reset wishes to self
                }
            }

            // If clicking Home tab, maybe also reset? 
            // Usually Home is "My Registry" OR "Guest Registry". 
            // If user wants to "exit" guest mode, they usually click Profile or a specific "Exit" button.
            // Let's stick to fixing Profile tab as requested.

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

    // Render Items
    function renderItems() {
        const listContainer = document.getElementById('wish-list-container');
        const guestContainer = document.getElementById('guest-wish-list-container');

        // Decide which container to render to based on view
        // If we are in public view (visiting someone), we render to guest container (in user-profile-view usually)
        // BUT wait, existing logic tries to switch views. 
        // Let's stick to standard behavior:

        // 1. Home View Render
        if (listContainer) {
            listContainer.innerHTML = '';

            // If in public view, we might want to hide Home or show "Guest Mode" on Home.
            // But per navigation logic, 'home-view' is hidden when 'user-profile-view' is active.
            // So we just render Home items from `wishListItems` always, unless we want to support "Preview" mode on Home.

            // Logic: Render User's Own Items
            if (!isPublicView) {
                // NEW: Filter by Category
                const filteredItems = currentCategory === 'Все'
                    ? wishListItems
                    : wishListItems.filter(item => item.category === currentCategory);

                // Render Items
                filteredItems.forEach(item => {
                    const card = createCard(item, false); // false = not read only
                    listContainer.appendChild(card);
                });

                // Render "Add New" Button if slots available
                if (wishListItems.length < maxSlots) {
                    const addBtn = document.createElement('div');
                    addBtn.className = 'wish-card empty-state';
                    addBtn.style.cursor = 'pointer';
                    addBtn.style.display = 'flex';
                    addBtn.style.flexDirection = 'column';
                    addBtn.style.justifyContent = 'center';
                    addBtn.style.alignItems = 'center';
                    addBtn.style.minHeight = '200px';
                    addBtn.innerHTML = `
                        <div style="margin-bottom: 15px; width: 80px; height: 80px; background: rgba(255,255,255,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <!-- Gift Outline (Dimmed) -->
                                <g stroke="rgba(255,255,255,0.3)" stroke-width="2">
                                    <rect x="3" y="8" width="18" height="4" rx="1"></rect>
                                    <path d="M12 8v13"></path>
                                    <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"></path>
                                    <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.9 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"></path>
                                </g>
                                
                                <!-- Bright Neon Plus -->
                                <path d="M12 11v7 M8.5 14.5h7" stroke="#00f2fe" stroke-width="3"></path>
                            </svg>
                        </div>
                        <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 5px;">Добавить желание</h3>
                        <p style="font-size: 13px; color: #888;">Доступно слотов: ${maxSlots - wishListItems.length}</p>
                    `;
                    addBtn.addEventListener('click', () => {
                        document.querySelector('[data-target="create-view"]').click();
                    });
                    listContainer.appendChild(addBtn);
                }
            } else {
                // Public View on Home Tab? Usually we redirect to profile-view for public.
                // If we are here, maybe we just show nothing or a message.
                // But let's check basic logic.
            }
        }

        // 2. Guest/Public View Render (in Profile Tab)
        // If isPublicView is true, we should render items into the Guest Container
        if (guestContainer && isPublicView) {
            guestContainer.innerHTML = '';

            // If visiting a mock profile
            if (visitedProfile) {
                // GENERATE MOCK ITEMS based on user rank maybe?
                // For now, just fixed mocks or empty
                if (visitedProfile.isPrivate && !isSubscribedMock) {
                    // Private & Not Subscribed logic handled by locking overlay in HTML usually, or we show nothing
                    document.getElementById('locked-overlay').classList.remove('hidden');
                    guestContainer.style.display = 'none';
                } else {
                    document.getElementById('locked-overlay').classList.add('hidden');
                    guestContainer.style.display = 'grid'; // or block

                    // Mock Items for Guest
                    const mockItems = [
                        { id: 901, title: "MacBook Pro", collected: 500000, goal: 1000000, image: "https://placehold.co/600x400?text=MacBook", category: "Tech" },
                        { id: 902, title: "Coffee Machine", collected: 20000, goal: 50000, image: "https://placehold.co/600x400?text=Coffee", category: "Home" }
                    ];

                    mockItems.forEach(item => {
                        const card = createCard(item, true); // true = read only (can pay, cannot delete)
                        guestContainer.appendChild(card);
                    });
                }
            } else {
                // Previewing OWN profile as Guest
                document.getElementById('locked-overlay').classList.add('hidden');
                guestContainer.style.display = 'grid';

                // Filter out private items for public preview
                wishListItems.filter(item => !item.isPrivate).forEach(item => {
                    const card = createCard(item, true);
                    guestContainer.appendChild(card);
                });
            }
        }
    }

    // Helper: Create Card HTML
    function createCard(item, isReadOnly) {
        const div = document.createElement('div');
        div.className = 'wish-card';

        const percent = Math.min(100, Math.floor((item.collected / item.goal) * 100));

        div.innerHTML = `
            <div class="card-image-container">
                <img src="${item.image}" class="card-image" onerror="this.src='https://placehold.co/600x400?text=No+Image'">
                <div class="image-overlay">
                    ${item.isPrivate ? '🔒 ' : ''}${item.category || 'Общее'}
                </div>
                ${!isReadOnly ? `<button class="delete-icon-btn" data-id="${item.id}">×</button>` : ''}
            </div>
            <div class="card-content">
                <h3>${item.title}</h3>
                <div class="progress-info">
                    <span>Собрано: ${formatCompactNumber(item.collected)}</span>
                    <span>${percent}%</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${percent}%"></div>
                </div>
                <div class="card-actions">
                    ${item.collected >= item.goal
                ? `<button class="btn" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; cursor: default; box-shadow: 0 4px 15px rgba(56, 239, 125, 0.3);">Исполнено ✨</button>`
                : `<button class="btn btn-primary pay-btn" data-id="${item.id}">Пополнить</button>`
            }
                    ${!isReadOnly ? `
                        <div class="privacy-toggle-container" title="Переключить видимость">
                            <label class="privacy-switch">
                                <input type="checkbox" class="privacy-checkbox" data-id="${item.id}" ${!item.isPrivate ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Event Listeners
        const payBtn = div.querySelector('.pay-btn');
        if (payBtn) payBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal(item.title, item.id);
        });

        if (!isReadOnly) {
            const delBtn = div.querySelector('.delete-icon-btn');
            if (delBtn) delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Удалить это желание?')) {
                    deleteItem(item.id);
                }
            });

            const toggleInput = div.querySelector('.privacy-checkbox');
            // Prevent click propagation on the label/input so it doesn't trigger card click (if any)
            if (toggleInput) {
                toggleInput.addEventListener('click', (e) => e.stopPropagation());
                toggleInput.addEventListener('change', (e) => {
                    // Checked = Public (!isPrivate)
                    // Unchecked = Private (isPrivate)
                    item.isPrivate = !e.target.checked;
                    saveState();
                    // We don't re-render entire list to avoid jitter, just update the lock indicator if we want?
                    // But renderItems() updates the lock icon in the overlay.
                    // Let's re-render for consistency.
                    renderItems();
                });
            }
        }

        return div;
    }

    // Server Users Logic - Using Mocks Only for Stability
    function renderGenerousUsers() {
        const listContainer = document.getElementById('generous-users-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';

        // Add Current User to the list dynamically so they feel "part of it"
        const currentUserEntry = {
            ...userProfile,
            donated: "0 ₸", // Default for now
            isCurrentUser: true
        };

        // Combine and Sort (Mock sorting logic)
        // We just randomly insert user or put at top for visibility
        // Let's put user as "You" at index 0 or similar
        const allUsers = [currentUserEntry, ...FIXED_MOCKS];

        allUsers.forEach((user, index) => {
            const div = document.createElement('div');
            div.className = 'user-card-item';
            // Highlight current user
            if (user.isCurrentUser) div.style.background = 'rgba(78, 140, 255, 0.1)';

            div.innerHTML = `
                <span class="uc-rank">${index + 1}</span>
                <img src="${user.avatar}" class="uc-avatar">
                <div class="uc-info">
                    <span class="uc-name">${user.isCurrentUser ? (user.name + ' (Вы)') : user.name}</span>
                    <span class="uc-donated">Подарил: ${user.donated}</span>
                </div>
            `;
            div.addEventListener('click', () => {
                // If clicking self
                if (user.isCurrentUser) {
                    document.querySelector('.nav-item.active')?.click(); // Go to home/profile
                    return;
                }

                visitedProfile = user;
                isPublicView = true;
                updateProfileUI();
                renderItems();
                // Call navigateTo directly to bypass the "Reset" logic in the nav click listener
                navigateTo('user-profile-view');
            });
            listContainer.appendChild(div);
        });
    }

    // TASKS SYSTEM
    const TASKS = [
        {
            id: 't_tg',
            title: 'Подписаться на канал Wish List',
            reward: '+1 слот',
            icon: '📢',
            link: 'https://t.me/wishlist_channel_placeholder',
            completed: false
        },
        {
            id: 't_inst',
            title: 'Подписаться на Instagram Wish List',
            reward: '+1 слот',
            icon: '📸',
            link: 'https://instagram.com/wishlist_placeholder',
            completed: false
        }
    ];

    function renderTasks() {
        const container = document.getElementById('tasks-list');
        if (!container) return;
        container.innerHTML = '';

        TASKS.forEach(task => {
            const isCompleted = localStorage.getItem('task_' + task.id) === 'true';
            const isPending = localStorage.getItem('task_pending_' + task.id) === 'true'; // New state

            const div = document.createElement('div');
            div.className = 'task-card';
            if (isCompleted) div.classList.add('completed');

            let btnText = 'Выполнить';
            let btnClass = '';
            if (isCompleted) {
                btnText = 'Выполнено';
                btnClass = 'done';
            } else if (isPending) {
                btnText = 'Проверить';
                btnClass = 'check'; // Yellow/Blue style
            }

            div.innerHTML = `
                <div class="task-icon">${task.icon}</div>
                <div class="task-info">
                    <div class="task-title">${task.title}</div>
                    <div class="task-reward">${task.reward}</div>
                </div>
                <button class="task-btn ${btnClass}">
                    ${btnText}
                </button>
            `;

            const btn = div.querySelector('.task-btn');
            if (!isCompleted) {
                btn.addEventListener('click', () => {
                    if (!isPending) {
                        // Step 1: Execute -> Open Link
                        window.open(task.link, '_blank');
                        // Set Pending State
                        localStorage.setItem('task_pending_' + task.id, 'true');
                        renderTasks(); // Re-render to show "Check"
                    } else {
                        // Step 2: Check -> Verify
                        // Simulate verification (or just instant success for now)
                        btn.textContent = 'Проверяю...';
                        setTimeout(() => {
                            localStorage.removeItem('task_pending_' + task.id);
                            localStorage.setItem('task_' + task.id, 'true');

                            maxSlots++;
                            localStorage.setItem('max_slots', maxSlots);
                            updateSlotsUI();
                            renderTasks();
                            alert(`Вы получили ${task.reward}!`);
                        }, 1500); // Short delay for "checking" feel
                    }
                });
            }

            container.appendChild(div);
        });
    }

    // Initial Render calls
    updateSlotsUI();
    updateProfileUI();
    renderGenerousUsers();
    updateSlotsUI();
    updateProfileUI();
    renderGenerousUsers();
    renderItems();
    renderTasks();

    document.querySelector('.nav-item.active')?.click();

});
