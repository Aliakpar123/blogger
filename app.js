document.addEventListener('DOMContentLoaded', () => {
    alert("✅ SYSTEM ONLINE v9.9.78");
    console.log("SCRIPT STARTED v9.9.78");

    // === DEBUGGING FORCE REFRESH ===
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = `style.css?v=${Date.now()}`;
    document.head.appendChild(style);

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
    // We check if it is included in our new list, if not -> randomize (optional, or just randomize specific unwanted ones)
    const allFestive = [...FESTIVE_AVATARS.elf, ...FESTIVE_AVATARS.santa];
    // If avatar is "ui-avatars" or "random" or simply we want to refresh everyone to festive:
    if (userProfile.avatar.includes('ui-avatars.com') || !allFestive.includes(userProfile.avatar)) {
        const randomAv = allFestive[Math.floor(Math.random() * allFestive.length)];
        userProfile.avatar = randomAv;
        localStorage.setItem('user_profile', JSON.stringify(userProfile));
    }

    // ONE TIME DEFAULT ITEMS (If list is totally empty)
    // Removed by user request - list starts empty
    // if (wishListItems.length === 0) { ... }

    // User Profile API...

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

    // ... (keeping other lines same, but replace MOCK_USERS and GENEROUS_USERS below)

    // ... (keeping other lines)

    // Public View API

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

        // Sync to Server
        syncUserProfile();
        syncUserWishes();
    }

    // Debounce helper to prevent flooding server
    let debounceTimer;
    function syncUserWishes() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (userProfile && userProfile.id) {
                apiFetch('/wishes', {
                    method: 'POST',
                    body: JSON.stringify({ userId: userProfile.id, wishes: wishListItems })
                }).catch(err => console.error("Sync wishes fail", err));
            }
        }, 1000);
    }

    // Sync User Profile to Server on Load
    async function syncUserProfile() {
        // Ensure user has an ID (use Telegram ID or generated one)
        if (!userProfile.id) {
            userProfile.id = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || Date.now();
            localStorage.setItem('user_profile', JSON.stringify(userProfile));
        }

        const res = await apiFetch('/users', {
            method: 'POST',
            body: JSON.stringify(userProfile)
        });

        if (res && res.user) {
            console.log("User synced with server");
            // Could update local profile with server data if server is source of truth

            // Refresh the list so I appear immediately!
            setTimeout(fetchAllUsers, 500);
        }
    }

    // Call it
    syncUserProfile();

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

    // renderItems definition moved to prevent duplication and ensure latest logic is used.
    // See below around line 870.

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
            // Priority: Visited Profile Name -> User Profile Name -> Telegram User -> Default
            let nameDisplay = data.name;
            if (visitedProfile) {
                // If it's a visited profile, prefer username if available, else name
                nameDisplay = visitedProfile.username || visitedProfile.name;
            } else {
                // My profile: prefer username if set (from Telegram)
                if (data.username && !data.name.startsWith('@')) {
                    // If we have a username but name is "Ali Akbar", maybe show username?
                    // User asked: "сделай так что бы отраался телеграм ник"
                    nameDisplay = data.username;
                } else {
                    nameDisplay = data.name;
                }
            }

            // Ensure it starts with @ if it looks like a username
            if (nameDisplay && !nameDisplay.startsWith('@') && /^[a-zA-Z0-9_]+$/.test(nameDisplay)) {
                // heuristic: if single word latin, might be nick. But names can be too. 
                // Let's just trust the data source.
            }

            // Fallback
            if (!nameDisplay && window.Telegram?.WebApp?.initDataUnsafe?.user?.username) {
                nameDisplay = '@' + window.Telegram.WebApp.initDataUnsafe.user.username;
            }

            profileNameEl.innerText = nameDisplay || 'Пользователь';
            if (profileBioEl) profileBioEl.innerText = data.bio || 'Нет описания';

            if (profileAvatarEl) {
                profileAvatarEl.src = data.avatar;
                // Error handling for broken GIFs
                profileAvatarEl.onerror = () => {
                    profileAvatarEl.src = "https://media.giphy.com/media/l2YWs1NexTst9YmFG/giphy.gif";
                    profileAvatarEl.onerror = null;
                    profileAvatarEl.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(data.name) + "&background=random&color=fff";
                };
            }

            if (privateModeToggle) {
                privateModeToggle.checked = data.isPrivate;
                // Disable toggle if visiting
                privateModeToggle.disabled = !!visitedProfile;
            }

            if (statSubscribers) statSubscribers.innerText = formatCompactNumber(data.subscribers || 0);
            if (statWishes) statWishes.innerText = wishListItems.length;

            // --- DYNAMIC ACTIONS (Edit vs Subscribe) ---
            const actionsContainer = document.querySelector('.insta-actions');
            if (actionsContainer) {
                if (visitedProfile) {
                    // Visiting someone -> Show Subscribe
                    const isSub = isSubscribedMock;
                    actionsContainer.innerHTML = `
                        <button class="btn-insta-edit ${isSub ? 'subscribed' : ''}" id="subscribe-action-btn" 
                            style="${isSub ? 'background: #333; color: white;' : 'background: #0095f6; color: white; border: none;'}">
                            ${isSub ? 'Вы подписаны' : 'Подписаться'}
                        </button>
                        <button class="btn-insta-share" id="message-action-btn">Сообщение</button>
                    `;

                    // Bind Subscribe Event
                    const subBtn = document.getElementById('subscribe-action-btn');
                    if (subBtn) subBtn.addEventListener('click', () => {
                        toggleSubscription(data);
                    });

                } else {
                    // My Profile -> Show Edit/Share (Default)
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

        // Update data
        if (isSubscribedMock) {
            user.subscribers = (user.subscribers || 0) + 1;
        } else {
            user.subscribers = Math.max(0, (user.subscribers || 0) - 1);
        }

        updateProfileUI(); // Re-render buttons and stats
        renderItems(); // Re-render items (to unlock if needed)
    }



    // --- MODAL & PAYMENT ---
    function openModal(itemTitle, itemId) {
        if (!paymentModal) return;
        paymentModal.dataset.itemId = itemId; // Store ID for logic
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

            let finalLink = KASPI_PAY_LINK;

            // SIMULATE PAYMENT SUCCESS FOR DEMO
            if (paymentModal.dataset.mode === 'donation') {
                alert(`Спасибо за поддержку! 💖\nСумма: ${formatCurrency(amount)}`);
                paymentModal.dataset.mode = ''; // Reset
                document.querySelector('#payment-modal h3').innerText = "Сумма пополнения"; // Reset title
                window.open(finalLink, '_blank');
                closeModal();
                return;
            }

            // Normal Item Payment
            // In real app, this would happen via webhook
            const itemId = paymentModal.dataset.itemId;
            const item = wishListItems.find(i => i.id == itemId);
            if (item) {
                const payAmount = parseInt(amount);
                item.collected += payAmount;
                saveState();
                renderItems();
                alert(`Успешно пополнено на ${formatCurrency(payAmount)}!`);
            }

            if (finalLink.includes('YOUR_MERCHANT_NAME')) {
                // alert('Пожалуйста, настройте KASPI_PAY_LINK в файле script.js');
                window.open('https://kaspi.kz/pay', '_blank');
            } else {
                window.open(finalLink, '_blank');
            }
            closeModal();
        });
    }

    // Chips
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const addVal = parseInt(chip.dataset.amount);
            const currentVal = parseInt(amountInput.value) || 0;
            amountInput.value = currentVal + addVal;
        });
    });

    // --- CREATE WISHLIST ---
    const createListBtn = document.getElementById('confirm-create-btn');
    if (createListBtn) {
        createListBtn.addEventListener('click', () => {
            // Check Limits
            if (wishListItems.length >= maxSlots) {
                const limitModal = document.getElementById('limit-modal');
                const closeLimitBtn = document.querySelector('.close-limit-modal');
                const goToTasksBtn = document.getElementById('go-to-tasks-btn');

                limitModal.classList.remove('hidden');
                setTimeout(() => limitModal.classList.add('active'), 10);

                closeLimitBtn.onclick = () => {
                    limitModal.classList.remove('active');
                    setTimeout(() => limitModal.classList.add('hidden'), 300);
                };

                goToTasksBtn.onclick = () => {
                    limitModal.classList.remove('active');
                    setTimeout(() => limitModal.classList.add('hidden'), 300);
                    document.querySelector('[data-target="tasks-view"]').click();
                };
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

            // Reset UI
            document.getElementById('create-step-2').classList.add('hidden');
            document.querySelector('.create-step-1').classList.remove('hidden');
            document.getElementById('kaspi-link').value = '';

            // Go Home
            document.querySelector('[data-target="home-view"]').click();

            // SYNC
            syncUserWishes();
        });
    }

    // Parser Logic
    const parseBtn = document.getElementById('parse-link-btn');
    const kaspiInput = document.getElementById('kaspi-link');
    if (parseBtn && kaspiInput) {
        kaspiInput.addEventListener('input', (e) => parseBtn.disabled = e.target.value.length < 5);

        parseBtn.addEventListener('click', async () => {
            const url = kaspiInput.value;
            // Validation
            if (!url.includes('kaspi.kz')) {
                alert('Нужна ссылка на Kaspi.kz');
                return;
            }

            parseBtn.textContent = 'Загрузка...';
            parseBtn.disabled = true;

            try {
                let htmlContent = null;
                const isShortLink = url.includes('l.kaspi.kz');

                // Strategy 1: CorsProxy (Better for redirects & short links)
                // We use this FIRST for l.kaspi.kz, or if preferred
                if (isShortLink) {
                    try {
                        console.log("Using CorsProxy for short link...");
                        let proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
                        let response = await fetch(proxyUrl);
                        htmlContent = await response.text();
                    } catch (e) {
                        console.warn("CorsProxy failed for short link", e);
                    }
                }

                // Strategy 2: AllOrigins (Fallback or Primary for normal links)
                if (!htmlContent) {
                    try {
                        console.log("Using AllOrigins...");
                        let proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
                        let response = await fetch(proxyUrl);
                        let data = await response.json();
                        htmlContent = data.contents;
                    } catch (e) {
                        console.warn("AllOrigins failed", e);
                    }
                }

                // Strategy 3: CorsProxy Fallback (if AllOrigins failed and we haven't tried it yet)
                if (!htmlContent && !isShortLink) {
                    try {
                        console.log("Retry with CorsProxy...");
                        let proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
                        let response = await fetch(proxyUrl);
                        htmlContent = await response.text();
                    } catch (e) {
                        console.warn("CorsProxy retry failed", e);
                    }
                }

                if (!htmlContent || htmlContent.length < 500) throw new Error('No content or blocked');

                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlContent, 'text/html');

                // 1. Title (Try OG tag first, then h1)
                let title = doc.querySelector('meta[property="og:title"]')?.content ||
                    doc.querySelector('h1')?.innerText ||
                    'Товар';
                // Cleanup title (Kaspi adds " | Kaspi Магазин" etc)
                title = title.replace(/\|.+$/, '').trim();

                // 2. Image (Try OG tag first)
                let image = doc.querySelector('meta[property="og:image"]')?.content ||
                    doc.querySelector('.item__slider-thumb img')?.src ||
                    doc.querySelector('.gallery__poster img')?.src ||
                    'https://placehold.co/600x400';

                // 3. Price (Complex, classes change often)
                let price = 0;

                // Method A: JSON-LD (Most reliable if present)
                const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
                for (let s of scripts) {
                    try {
                        const json = JSON.parse(s.innerText);
                        if (json.offers && json.offers.price) {
                            price = parseInt(json.offers.price);
                            break;
                        }
                    } catch (e) { }
                }

                // Method B: CSS Selectors (Desktop & Mobile)
                if (!price) {
                    const priceSelectors = [
                        '.item__price-once',       // Desktop old
                        '.item__price-value',      // Desktop new
                        '.item__price',            // Generic
                        '.p-price__text',          // Mobile
                        '.product-price',          // Generic Mobile
                        '.current-price',          // Generic
                        '.price'                   // Very generic
                    ];

                    for (let selector of priceSelectors) {
                        const el = doc.querySelector(selector);
                        if (el) {
                            const val = parseInt(el.innerText.replace(/\D/g, ''));
                            if (val > 0) {
                                price = val;
                                break;
                            }
                        }
                    }
                }

                // Method C: Regex Fallback (Search in raw HTML)
                if (!price) {
                    // Look for "price": 12345 or "price": "12345"
                    const jsonMatch = htmlContent.match(/"price"\s*:\s*"?(\d+)"?/i);
                    if (jsonMatch && jsonMatch[1]) {
                        price = parseInt(jsonMatch[1]);
                    } else {
                        // Look for 12 345 ₸ pattern common in Kaspi (Russian & Kazakh)
                        // Matches: 123 456 ₸, 12 345 T, etc.
                        const textMatch = htmlContent.match(/(\d{1,3}(?:\s\d{3})*)\s?[₸T]/);
                        if (textMatch && textMatch[1]) {
                            price = parseInt(textMatch[1].replace(/\s/g, ''));
                        }
                    }
                }

                // Method D: Super Aggressive Search (Last Resort)
                // Search for ANY number sequence that looks like a price (e.g. > 500) near keywords like "price", "цена"
                if (!price) {
                    // scan for price patterns in a window around keywords
                    const lowerHTML = htmlContent.toLowerCase();
                    const keywords = ['price', 'цена', 'стоимость', 'kaspi-shop-price'];

                    for (let word of keywords) {
                        const idx = lowerHTML.indexOf(word);
                        if (idx !== -1) {
                            // Look at next 100 chars
                            const snippet = htmlContent.substring(idx, idx + 100);
                            const match = snippet.match(/(\d{1,3}(?:\s\d{3})*)/);
                            if (match && match[1]) {
                                const val = parseInt(match[1].replace(/\s/g, ''));
                                if (val > 500) { // Assume reasonable price > 500
                                    price = val;
                                    break;
                                }
                            }
                        }
                    }
                }

                // If price is STILL 0, ask user immediately? 
                // No, better to let them edit it on the next screen.
                // But we can prompt for it if we got Title but no Price.
                if (price === 0 && title !== 'Товар') {
                    // A small helper to parse price from title if they pasted it there? Unlikely.
                }

                document.querySelector('.create-step-1').classList.add('hidden');
                document.getElementById('create-step-2').classList.remove('hidden');

                document.getElementById('new-item-title').value = title;
                document.getElementById('new-item-price').value = price || "";
                document.getElementById('new-item-image').src = image;

            } catch (e) {
                console.error("Parsing error:", e);
                const manual = confirm("Не удалось загрузить данные автоматически (Kaspi включил защиту). Заполнить вручную?");
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

    // Cancel Button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.getElementById('create-step-2').classList.add('hidden');
            document.querySelector('.create-step-1').classList.remove('hidden');
        });
    }

    // --- PROFILE ACTIONS ---
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            const newName = prompt("Имя:", userProfile.name);
            if (newName) userProfile.name = newName;

            const newBio = prompt("Био:", userProfile.bio);
            if (newBio) userProfile.bio = newBio;

            localStorage.setItem('user_profile', JSON.stringify(userProfile));
            updateProfileUI();
            syncUserProfile(); // SYNC PROFILE UPDATE
        });
    }

    const privateModeToggle = document.getElementById('private-mode-toggle');
    if (privateModeToggle) {
        privateModeToggle.addEventListener('change', (e) => {
            userProfile.isPrivate = e.target.checked;
            localStorage.setItem('user_profile', JSON.stringify(userProfile));
            updateProfileUI(); // Sync UI
            syncUserProfile(); // SYNC PRIVACY UPDATE
        });
    }

    // Public View Logic
    const publicPreviewBtn = document.getElementById('public-preview-btn');
    const exitPublicViewLink = document.getElementById('exit-public-view');
    // const publicViewBanner = document.getElementById('public-view-banner'); // REMOVED

    if (publicPreviewBtn) {
        publicPreviewBtn.addEventListener('click', () => {
            isPublicView = true;
            isSubscribedMock = false;

            isSubscribedMock = false;

            // publicViewBanner.classList.remove('hidden'); // REMOVED
            document.querySelector('[data-target="home-view"]').click();
            renderItems();
        });
    }

    if (exitPublicViewLink) {
        exitPublicViewLink.addEventListener('click', (e) => {
            e.preventDefault();
            isPublicView = false;
            // publicViewBanner.classList.add('hidden'); // REMOVED
            renderItems();
            document.querySelector('[data-target="profile-view"]').click();
        });
    }

    const subscribeBtn = document.getElementById('subscribe-btn');
    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', () => {
            subscribeBtn.innerText = "Подписываемся...";
            setTimeout(() => {
                isSubscribedMock = true;
                renderItems();
                subscribeBtn.innerText = "Вы подписаны! ✅";
            }, 1000);
        });
    }

    // Invite Logic
    const inviteBtn = document.getElementById('invite-btn');
    if (inviteBtn) {
        inviteBtn.addEventListener('click', () => {
            window.open('https://t.me/share/url?url=https://t.me/BloggerWishListBot&text=MyWishList', '_blank');
            inviteBtn.innerText = "Проверка...";
            inviteBtn.disabled = true;
            setTimeout(() => {
                maxSlots += 5;
                saveState();
                alert('+5 Слотов получено!');
                inviteBtn.innerText = "Выполнить снова";
                inviteBtn.disabled = false;
            }, 3000);
        });
    }

    // Subscribe Channel Task
    const subChannelBtn = document.getElementById('subscribe-channel-btn');
    if (subChannelBtn) {
        subChannelBtn.addEventListener('click', () => {
            // Open Channel
            window.open('https://t.me/merciwishlist', '_blank');

            subChannelBtn.innerText = "Проверка...";
            subChannelBtn.disabled = true;

            // Artificial Delay for "Verification"
            setTimeout(() => {
                maxSlots += 3; // Reward
                saveState();
                alert('Спасибо! +3 Слота получено!');
                subChannelBtn.innerText = "Выполнено";
                subChannelBtn.classList.remove('btn-primary');
                subChannelBtn.classList.add('btn-secondary');
            }, 5000);
        });
    }

    // Donation Logic
    const donateBtn = document.getElementById('donate-dev-btn');
    if (donateBtn) {
        donateBtn.addEventListener('click', () => {
            // Open modal but set context for Donation
            if (paymentModal) {
                paymentModal.dataset.mode = 'donation'; // Set mode
                paymentModal.classList.remove('hidden');
                amountInput.value = '';
                document.querySelector('#payment-modal h3').innerText = "Поддержка проекта 🎁";
                requestAnimationFrame(() => {
                    paymentModal.classList.add('active');
                    amountInput.focus();
                });
            }
        });
    }

    // Main Share Button Logic
    const mainShareBtn = document.getElementById('main-share-btn');
    if (mainShareBtn) {
        mainShareBtn.addEventListener('click', shareProfile);
    }


    // --- NAVIGATION ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.content-area, .view-section');
    const headerBackBtn = document.getElementById('header-back-btn');
    const headerUserInfo = document.getElementById('header-user-info');
    const headerTitle = document.getElementById('header-title');
    let historyStack = ['home-view'];

    function navigateTo(targetId) {
        if (targetId !== historyStack[historyStack.length - 1]) {
            historyStack.push(targetId);
        }

        navItems.forEach(item => {
            if (item.dataset.target === targetId) item.classList.add('active');
            else item.classList.remove('active');
        });

        views.forEach(view => {
            if (view.id === targetId) view.classList.remove('hidden');
            else view.classList.add('hidden');
        });

        // MAIN TABS (No Back Button unless Guest Mode)
        const isMainTab = ['home-view', 'profile-view', 'user-profile-view', 'tasks-view'].includes(targetId);

        if (isMainTab) {
            // Check for Guest Mode Special Case
            if (visitedProfile && targetId !== 'profile-view') {
                // In Guest Mode: Show Back Button (Exit)
                headerBackBtn.classList.remove('hidden');
                headerUserInfo.classList.add('hidden');
                headerUserInfo.style.display = 'none';
                headerTitle.classList.remove('hidden');
                // headerTitle is set below based on view

                if (window.Telegram?.WebApp?.BackButton) {
                    window.Telegram.WebApp.BackButton.show();
                    window.Telegram.WebApp.BackButton.onClick(exitVisitedProfile);
                }

                headerBackBtn.onclick = () => exitVisitedProfile();

            } else {
                // Regular Mode: Hide Back Button
                headerBackBtn.classList.add('hidden');
                headerUserInfo.classList.remove('hidden'); // Only show on Home? Or all main tabs?
                // Logic: UserInfo only on Home. Title on others.

                if (targetId === 'home-view') {
                    headerUserInfo.style.display = 'flex';
                    headerTitle.classList.add('hidden');
                } else {
                    // Ratings, Profile, Tasks -> Show Title, Hide UserInfo
                    headerUserInfo.classList.add('hidden');
                    headerUserInfo.style.display = 'none';
                    headerTitle.classList.remove('hidden');
                }

                if (window.Telegram?.WebApp?.BackButton) window.Telegram.WebApp.BackButton.hide();
            }
        } else {
            // SUB VIEWS (Create, Details, etc) -> Show Back Button
            headerBackBtn.classList.remove('hidden');
            headerUserInfo.classList.add('hidden');
            headerUserInfo.style.display = 'none';
            headerTitle.classList.remove('hidden');

            headerBackBtn.onclick = () => {
                historyStack.pop();
                navigateTo(historyStack[historyStack.length - 1] || 'home-view');
            };

            if (window.Telegram?.WebApp?.BackButton) {
                window.Telegram.WebApp.BackButton.show();
                window.Telegram.WebApp.BackButton.onClick(() => {
                    historyStack.pop();
                    navigateTo(historyStack[historyStack.length - 1] || 'home-view');
                });
            }
        }

        // Set Titles
        if (targetId === 'home-view' && visitedProfile) headerTitle.innerHTML = `В гостях: ${visitedProfile.name}`;
        if (targetId === 'create-view') headerTitle.textContent = 'Создать';
        if (targetId === 'profile-view') headerTitle.textContent = 'Рейтинг';
        if (targetId === 'user-profile-view') headerTitle.textContent = 'Профиль';
        if (targetId === 'tasks-view') headerTitle.textContent = 'Задания';

        if (targetId === 'user-profile-view') {
            updateProfileUI();
        }
    } // End navigateTo

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

    // Telegram Init
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.expand();
        window.Telegram.WebApp.setHeaderColor('#0f1115');

        // Fetch Telegram User Data
        const tgUser = window.Telegram.WebApp.initDataUnsafe?.user;
        if (tgUser) {
            // Update userProfile with real Telegram data
            // User requested "telegram nick" -> username
            // If no username, use first_name + last_name
            let tgName = tgUser.username ? '@' + tgUser.username : tgUser.first_name;

            userProfile.name = tgName;
            if (tgUser.username) userProfile.username = '@' + tgUser.username;

            // Only update logic, don't overwrite if user already edited it? 
            // Actually, user asked to "reflect my telegram nick", so we force it or ensure it's default.
            // "сделай так что бы отраался телеграм ник свой у каждого" -> Implies for everyone.
            // Let's just update the name in the object.

            // Save to localStorage so it persists
            localStorage.setItem('user_profile', JSON.stringify(userProfile));
        }
    }

    // --- SEARCH LOGIC ---
    // --- SEARCH LOGIC ---
    // We used to have MOCK_USERS here, but now we use ALL_USERS_DB defined lower down.
    // However, ALL_USERS_DB is defined later in the file. To fix hoisting/scope issues without major refactor,
    // let's just define MOCK_USERS here as a subset or reference. 
    // Actually, let's just let search logic use ALL_USERS_DB and move the definition UP or wait until search runs.

    // BETTER FIX: We will access the global `GENEROUS_USERS` (which is now ALL_USERS_DB) inside the event listener.
    // So we don't need a separate MOCK_USERS array anymore.

    const searchInput = document.getElementById('user-search-input');
    const searchResults = document.getElementById('search-results');

    // State for viewing other profiles (Duplicate removed)
    // visitedProfile is declared at top

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchResults.innerHTML = '';
            const query = e.target.value.toLowerCase();
            if (query.length < 2) {
                searchResults.classList.add('hidden');
                return;
            }

            // Use GENEROUS_USERS which now contains everyone
            const filtered = GENEROUS_USERS.filter(u =>
                u.name.toLowerCase().includes(query) ||
                u.username.toLowerCase().includes(query)
            );

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
            div.innerHTML = `
                <img src="${user.avatar}" class="result-avatar">
                <div class="result-info">
                    <span class="result-name">${user.name}</span>
                    <span class="result-username">${user.username}</span>
                </div>
            `;
            div.addEventListener('click', () => {
                openVisitedProfile(user);
                searchResults.classList.add('hidden');
                searchInput.value = '';
            });
            searchResults.appendChild(div);
        });
    }

    async function openVisitedProfile(user) {
        visitedProfile = user;
        isPublicView = true;
        isSubscribedMock = false;

        // Update UI
        updateProfileUI();

        // Hide Create Button
        const fab = document.querySelector('.fab-wrapper');
        if (fab) fab.style.display = 'none';

        // FETCH WISHES FROM SERVER
        try {
            // Show loading state
            const container = document.getElementById('wish-list-container');
            if (container) container.innerHTML = '<div style="text-align:center; padding:20px; color: grey;">Загрузка желаний... ⏳</div>';

            // IF VISITING SELF (Preview Mode) -> Load Local Data
            if (user && userProfile && user.id === userProfile.id) {
                wishListItems = safeParse('wishlist_items', []);
                // Add a small delay to simulate load/render properly
                setTimeout(renderItems, 300);
                return;
            }

            const fetchedWishes = await apiFetch(`/wishes/${user.id}`);
            if (fetchedWishes && Array.isArray(fetchedWishes)) {
                wishListItems = fetchedWishes; // Temporarily override global list
            } else {
                wishListItems = [];
            }
        } catch (e) {
            console.error("Failed to fetch wishes", e);
            wishListItems = [];
        }

        renderItems();

        // Switch Tab
        const profileTab = document.querySelector('[data-target="user-profile-view"]');
        if (profileTab) {
            profileTab.click();
            setTimeout(() => updateProfileUI(), 50);
        }
    }

    function exitVisitedProfile() {
        visitedProfile = null;
        isPublicView = false;

        // RESTORE LOCAL WISHES
        wishListItems = safeParse('wishlist_items', []);

        // Restore Create Button
        const fab = document.querySelector('.fab-wrapper');
        if (fab) fab.style.display = 'flex';

        updateProfileUI();
        renderItems(); // Re-render my items

        // Go back to profile view
        document.querySelector('[data-target="profile-view"]').click();
    }

    // --- OVERRIDE/UPDATE FUNCTIONS ---

    // We need to update updateProfileUI to check visitedProfile first
    // const originalUpdateProfileUI = updateProfileUI; // we can't really super it in functional style easily without rewriting it.

    // --- GENEROUS USERS LOGIC ---

    // 1. Fixed "Community" Mocks (Always visible)
    // MOVED TO TOP SCOPE
    /*
    const FIXED_MOCKS = [
        ...
    ];
    */

    // 2. Dynamic Users from Server
    let serverUsers = [];

    async function fetchAllUsers() {
        const users = await apiFetch('/users');
        if (users && Array.isArray(users)) {
            serverUsers = users;
            renderGenerousUsers();
        }
    }

    // Initial fetch
    fetchAllUsers();

    // --- GENEROUS USERS LOGIC ---

    // DEFINE MOCKS LOCALLY TO BE 100% SURE (Moved to top scope for Deep Link access)
    // DEFINE MOCKS LOCALLY TO BE 100% SURE (Moved to top scope for Deep Link access)
    // ... already defined at top level ...

    function renderGenerousUsers() {
        const listContainer = document.getElementById('generous-users-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        // 1. Start with Fixed Mocks (from outer scope)
        let finalUserList = [...FIXED_MOCKS];

        // 2. Add Server Users (avoid duplicates based on ID)
        if (serverUsers && serverUsers.length > 0) {
            serverUsers.forEach(sUser => {
                const isFixed = finalUserList.some(m => m.id == sUser.id);
                if (!isFixed) {
                    finalUserList.push(sUser);
                }
            });
        }

        // 3. Add CURRENT USER (if not present)
        if (userProfile && userProfile.id) {
            const exists = finalUserList.some(u => u.id == userProfile.id);
            if (!exists) {
                finalUserList.push({
                    ...userProfile,
                    isSelf: true
                });
            } else {
                finalUserList = finalUserList.map(u => u.id == userProfile.id ? { ...u, isSelf: true } : u);
            }
        }

        console.log("Rendering users count:", finalUserList.length);

        finalUserList.forEach((user, index) => {
            const div = document.createElement('div');
            div.className = 'user-card-item';
            div.innerHTML = `
                <span class="uc-rank">${index + 1}</span>
                <img src="${user.avatar}" class="uc-avatar">
                <div class="uc-info">
                    <span class="uc-name">${user.name}</span>
                    <span class="uc-donated">Подарил(а): ${user.donated}</span>
                </div>
                <span class="uc-arrow"> ></span>
            `;
            // Mock visit on click
            div.addEventListener('click', () => {
                openVisitedProfile(user);
            });
            listContainer.appendChild(div);
        });
    }

    // --- OVERRIDE/UPDATE FUNCTIONS ---

    // updateProfileUI functionality is handled by the main function definition above.
    // Duplicate removed.

    // REDEFINING renderItems slightly to use target's privacy
    function renderItems() {
        let container;
        const settingsGroup = document.querySelector('.insta-settings-group');

        // Determine Container & Settings Visibility
        if (isPublicView && visitedProfile) {
            // Visitor Mode -> Render in Profile View
            container = document.getElementById('guest-wish-list-container');
            if (settingsGroup) settingsGroup.style.display = 'none'; // Hide settings for guest
        } else {
            // Home Mode -> Render in Home View
            container = document.getElementById('wish-list-container');
            // If we are in "My Profile" tab, we might want to show items too? 
            // For now, let's keep Home View as the main list.
            if (settingsGroup) settingsGroup.style.display = 'block'; // Show settings for me
        }

        if (!container) return; // Should not happen if HTML is correct

        container.innerHTML = '';

        const target = visitedProfile || userProfile;

        // PRIVACY CHECK
        if (isPublicView && target.isPrivate && !isSubscribedMock) {
            const overlay = document.getElementById('locked-overlay');
            if (overlay) {
                overlay.classList.remove('hidden');
                overlay.querySelector('h3').textContent = `Профиль ${target.name} закрыт`;
            }
            return;
        } else {
            const overlay = document.getElementById('locked-overlay');
            if (overlay) overlay.classList.add('hidden');
        }

        wishListItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'wish-card';

            const percent = item.goal > 0 ? Math.min(100, Math.round((item.collected / item.goal) * 100)) : 0;

            // Escape template literals potentially? No, just use standard backticks
            card.innerHTML = `
                <div class="card-image-container">
                    <img src="${item.image}" alt="Item" class="card-image" loading="lazy">
                    ${!isPublicView ? `<button class="delete-icon-btn" data-id="${item.id}">✕</button>` : ''}
                </div>
                <div class="card-content">
                    <h3>${item.title}</h3>
                    <div class="progress-info">
                        <span>Собрано ${formatCurrency(item.collected)}</span>
                        <span>Цель ${formatCurrency(item.goal)}</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${percent}%"></div>
                    </div>
                    <div class="card-actions">
                        ${item.collected >= item.goal
                    ? `<button class="btn btn-executed pay-btn" disabled>Исполнено ✅</button>`
                    : `<button class="btn btn-primary pay-btn" data-id="${item.id}">Пополнить</button>`
                }
                        <button class="btn btn-secondary details-btn">Детали</button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        // Re-attach listeners
        container.querySelectorAll('.pay-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const item = wishListItems.find(i => i.id == id);
                if (item) openModal(item.title, item.id);
            });
        });

        // Delete listeners
        container.querySelectorAll('.delete-icon-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Use simple confirm
                if (confirm('Удалить желание?')) {
                    const id = e.currentTarget.dataset.id;
                    if (typeof deleteItem === 'function') {
                        deleteItem(id);
                    } else {
                        // Fallback if deleteItem missing
                        wishListItems = wishListItems.filter(i => i.id != id);
                        localStorage.setItem('wishlist_items', JSON.stringify(wishListItems));
                        renderItems();
                        syncUserWishes(); // SYNC DELETE
                    }
                }
            });
        });
    }

    // --- TASKS LOGIC ---

    const TASKS_DB = [
        { id: 't1', title: 'Подписаться на канал Merci Wishlist', reward: 3, link: 'https://t.me/merciwishlist', type: 'link', icon: '📢' },
        { id: 't2', title: 'Пригласить друга', reward: 5, link: null, type: 'invite', icon: '🤝' },
        { id: 't3', title: 'Вступить в чат', reward: 2, link: 'https://t.me/telegram', type: 'link', icon: '💬' }
    ];

    let completedTasks = safeParse('completed_tasks', []);

    function renderTasks() {
        const container = document.getElementById('tasks-list');
        if (!container) return;

        container.innerHTML = '';
        const userCompleted = completedTasks; // simple array of IDs

        TASKS_DB.forEach(task => {
            const isDone = userCompleted.includes(task.id);

            const taskEl = document.createElement('div');
            taskEl.className = 'task-card';
            if (isDone) taskEl.style.opacity = '0.6';

            taskEl.innerHTML = `
                <div class="task-icon">${task.icon}</div>
                <div class="task-info">
                    <h4>${task.title}</h4>
                    <p class="task-desc">${isDone ? 'Выполнено ✅' : `Получи +${task.reward} слота`}</p>
                </div>
                ${isDone
                    ? '<button class="btn btn-sm btn-secondary" disabled>Готово</button>'
                    : `<button class="btn btn-sm btn-primary task-btn" data-id="${task.id}">Выполнить</button>`
                }
            `;

            if (!isDone) {
                const btn = taskEl.querySelector('.task-btn');
                btn.onclick = () => handleTaskClick(task, btn);
            }

            container.appendChild(taskEl);
        });
    }

    function handleTaskClick(task, btn) {
        // 1. Open Link
        if (task.link) {
            window.open(task.link, '_blank');
        }

        // 2. Change button to "Check"
        btn.innerText = "Проверить";
        btn.onclick = () => verifyTask(task, btn);
    }

    function verifyTask(task, btn) {
        btn.innerText = "⏳";
        btn.disabled = true;

        // Simulate API check
        setTimeout(() => {
            // Success
            if (!completedTasks.includes(task.id)) {
                completedTasks.push(task.id);
                localStorage.setItem('completed_tasks', JSON.stringify(completedTasks));

                // Award Logic
                maxSlots += task.reward;
                saveState(); // Saves new maxSlots

                alert(`Задание выполнено! Вы получили +${task.reward} слота 🎉`);
                renderTasks(); // Re-render to show DONE state
            }
        }, 1500);
    }

    // --- SOCIAL & DEEP LINKING ---

    // --- SOCIAL & DEEP LINKING ---

    // --- SOCIAL & DEEP LINKING ---

    const shareModal = document.getElementById('share-modal');
    const shareLinkInput = document.getElementById('share-link-input');
    const copyLinkBtn = document.getElementById('copy-link-btn');
    const shareTelegramBtn = document.getElementById('share-telegram-btn');
    const closeShareModalBtn = document.querySelector('.close-share-modal');

    // Close Modal Logic
    if (closeShareModalBtn) {
        closeShareModalBtn.addEventListener('click', () => {
            shareModal.classList.add('hidden');
        });
    }

    if (shareModal) {
        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) shareModal.classList.add('hidden');
        });
    }

    function shareProfile() {
        console.log("SHARE BUTTON CLICKED");
        // alert("Share Clicked!"); // Debug

        try {
            // Re-select elements here to be 100% sure they exist
            const sModal = document.getElementById('share-modal');
            const sInput = document.getElementById('share-link-input');

            const botUsername = "wishlist_bloggers_bot";
            const userId = userProfile && userProfile.id ? userProfile.id : "unknown";
            const shareUrl = `https://t.me/${botUsername}/app?startapp=user_${userId}`;

            // Populate Input
            if (sInput) {
                sInput.value = shareUrl;
            } else {
                console.error("Share input not found");
            }

            // Show Modal
            if (sModal) {
                sModal.classList.remove('hidden');
                // alert('Debug: Modal Opened?'); 
            } else {
                console.error("Share modal not found");
                alert("Ошибка: окно 'Поделиться' не найдено (ID share-modal)");
            }

        } catch (e) {
            console.error("Share modal failed", e);
            alert("Ошибка при открытии меню 'Поделиться': " + e.message);
        }
    }

    // Copy Link Action
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {
            const link = shareLinkInput.value;
            if (link) {
                navigator.clipboard.writeText(link).then(() => {
                    alert('Ссылка скопирована! 📋');
                }).catch(err => {
                    console.error('Failed to copy', err);
                    // Fallback using select
                    shareLinkInput.select();
                    document.execCommand('copy');
                    alert('Ссылка скопирована! 📋');
                });
            }
        });
    }

    // Telegram Share Action
    if (shareTelegramBtn) {
        shareTelegramBtn.addEventListener('click', () => {
            const link = shareLinkInput.value;
            const text = `Посмотри мой вишлист "Merci"! 🎁\n${link}`;

            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.switchInlineQuery) {
                window.Telegram.WebApp.switchInlineQuery(text, ['users', 'groups', 'channels']);
            } else {
                const safeUrl = encodeURIComponent(link);
                const safeText = encodeURIComponent(text);
                window.open(`https://t.me/share/url?url=${safeUrl}&text=${safeText}`, '_blank');
            }
            // Close modal after action
            // shareModal.classList.add('hidden'); 
        });
    }

    async function checkDeepLink() {
        // Parse start_param from Telegram WebApp
        const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;

        if (startParam && startParam.startsWith('user_')) {
            const hostUserId = startParam.replace('user_', '');

            // Don't open own profile as "visited" -> ENABLED FOR TESTING/SHARING PREVIEW
            // if (hostUserId == userProfile.id) return;

            console.log("Deep Link Detected:", hostUserId);

            // 1. Check Fixed Mocks first
            let foundUser = FIXED_MOCKS.find(u => u.id == hostUserId);

            // 2. If not found, fetch from server 
            // OR check if it IS the current user (self-visit)
            if (!foundUser) {
                if (userProfile && userProfile.id == hostUserId) {
                    foundUser = userProfile;
                } else {
                    const allUsers = await apiFetch('/users');
                    if (allUsers) {
                        foundUser = allUsers.find(u => u.id == hostUserId);
                    }
                }
            }

            // 3. Open if found
            if (foundUser) {
                // If it is ME, treating as visited to preview public view?
                // Or maybe just ensure correct Mode?
                // Let's open logic
                openVisitedProfile(foundUser);
            } else {
                console.log("Deep link user not found");
            }
        }
    }

    // Connect Share Button
    // Connect Share Button
    // --- GLOBAL EVENT DELEGATION (Fix for dynamic buttons) ---
    document.body.addEventListener('click', (e) => {
        // Share Button (Removed by user request)
        // Share Button (Home View) - DIRECT COPY ACTION
        if (e.target.id === 'main-share-btn' || e.target.closest('#main-share-btn')) {
            e.preventDefault();

            const botUsername = "wishlist_bloggers_bot";
            const userId = userProfile && userProfile.id ? userProfile.id : "unknown";
            const shareUrl = `https://t.me/${botUsername}/app?startapp=user_${userId}`;

            navigator.clipboard.writeText(shareUrl).then(() => {
                alert('Ссылка скопирована! 📋\nОтправьте её друзьям.');
            }).catch(err => {
                console.error('Failed to copy', err);
                // Fallback: Open the modal if direct copy fails
                shareProfile();
            });
        }
    });

    // Check if buttons exist statically (just in case)
    // --- SECRET ADMIN TRIGGER ---
    let adminClickCount = 0;
    let adminClickTimeout;
    const headerInfo = document.getElementById('header-user-info');

    if (headerInfo) {
        headerInfo.addEventListener('click', () => {
            adminClickCount++;

            clearTimeout(adminClickTimeout);
            adminClickTimeout = setTimeout(() => {
                adminClickCount = 0;
            }, 1000); // Reset if not fast enough

            if (adminClickCount >= 5) {
                // Admin Action

                // Calculate total users (Fixed + Server + Self)
                // We reuse logic roughly from renderGenerousUsers or just take what we know
                // Ideally we should have a global 'totalUsersCount' or re-calculate
                let total = 0;
                total += FIXED_MOCKS.length;
                if (serverUsers) total += serverUsers.length; // Might double count if overlap not handled, but essentially valid estimate
                // Actually let's just use the length of the rendered list if possible, or recalculate safely

                // Re-calculate robustly matches renderGenerousUsers logic:
                let list = [...FIXED_MOCKS];
                if (serverUsers) {
                    serverUsers.forEach(u => {
                        if (!list.some(m => m.id == u.id)) list.push(u);
                    });
                }
                if (userProfile && !list.some(u => u.id == userProfile.id)) {
                    list.push(userProfile);
                }

                alert(`👑 ADMIN INFO 👑\n\nВсего пользователей: ${list.length}\n(Включая моки и вас)`);
                adminClickCount = 0;
            }
        });
    }
    // If button doesn't exist yet, we might need to add it to Profile render

    // INITIAL RENDER
    try {
        updateSlotsUI();
        updateProfileUI();
        renderGenerousUsers();
        renderItems();
        renderTasks();

        // Sync critical data on load
        syncUserProfile();
        syncUserWishes();

        setTimeout(checkDeepLink, 500); // Check deep link after init
    } catch (e) {
        alert("Render Error: " + e.message);
        console.error(e);
    }

    // Tab switching fix for nav (ensure default active)
    document.querySelector('.nav-item.active')?.click();

}); // End DOMContentLoaded
