document.addEventListener('DOMContentLoaded', () => {
    // alert("VERSION 8.0 LOADED - SYNTAX OK ✅"); 
    console.log("SCRIPT STARTED");

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

    // ONE TIME DEFAULT ITEMS (If list is totally empty)
    // Removed by user request - list starts empty
    // if (wishListItems.length === 0) { ... }

    // User Profile API
    let userProfile = safeParse('user_profile', {
        name: "Ali Akbar",
        bio: "Digital Creator & Blogger 📸",
        avatar: "https://media.giphy.com/media/l2YWs1NexTst9YmFG/giphy.gif", // Buddy the Elf
        isPrivate: false,
        subscribers: 0 // Reset to 0 as requested ("factually appearing")
    });

    // MIGRATION: Force update avatar if it's the old static one or random placeholder
    if (userProfile.avatar.includes('ui-avatars.com') || userProfile.avatar.includes('random')) {
        userProfile.avatar = "https://media.giphy.com/media/l2YWs1NexTst9YmFG/giphy.gif";
        localStorage.setItem('user_profile', JSON.stringify(userProfile));
    }

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
        localStorage.setItem('max_slots', maxSlots);
        updateSlotsUI();

        // Sync with API
        if (userProfile && userProfile.id) {
            apiFetch('/wishes', {
                method: 'POST',
                body: JSON.stringify({ userId: userProfile.id, wishes: wishListItems })
            });
        }
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
                        <button class="btn-insta-share" id="share-profile-btn">Поделиться</button>
                    `;
                    const editBtn = document.getElementById('edit-profile-btn');
                    if (editBtn) editBtn.addEventListener('click', () => {
                        // Re-bind edit logic (defined globally later, or prompt here)
                        // We can trigger the global global listener if we make it a function or just re-implement
                        const newName = prompt("Имя:", userProfile.name);
                        if (newName) {
                            userProfile.name = newName;
                            localStorage.setItem('user_profile', JSON.stringify(userProfile));
                            updateProfileUI();
                        }
                    });

                    const shareBtn = document.getElementById('share-profile-btn');
                    if (shareBtn) shareBtn.addEventListener('click', () => {
                        shareProfile();
                    });
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

    function shareProfile() {
        if (navigator.share) {
            navigator.share({
                title: 'Мой Wishlist',
                text: 'Посмотрите мой список желаний!',
                url: window.location.href
            });
        } else {
            alert('Ссылка скопирована!');
        }
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
    const confirmCreateBtn = document.getElementById('confirm-create-btn');
    if (confirmCreateBtn) {
        confirmCreateBtn.addEventListener('click', () => {
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
    const cancelBtn = document.getElementById('cancel-create-btn');
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
        });
    }

    const privateModeToggle = document.getElementById('private-mode-toggle');
    if (privateModeToggle) {
        privateModeToggle.addEventListener('change', (e) => {
            userProfile.isPrivate = e.target.checked;
            localStorage.setItem('user_profile', JSON.stringify(userProfile));
            updateProfileUI(); // Sync UI
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
    const views = document.querySelectorAll('.content-area');
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

            // NOTE: We only update if it's the default "Ali Akbar" to avoid overwriting custom changes?
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

    function openVisitedProfile(user) {
        // alert('DEBUG: Opening profile for ' + user.name); // REMOVED
        visitedProfile = user;

        // Enter "Public View" mode for this user
        isPublicView = true;
        isSubscribedMock = false; // Reset sub state for new profile

        // Update header logic to show we are in search
        // For simplicity, we reuse Public View Banner but change text?
        // Actually, let's keep it simple: Just switch to Public View

        // Update User Profile Data temporarily for UI
        // We need updateProfileUI to accept data OR read from visitedProfile
        updateProfileUI(); // Will now read visitedProfile

        // Show Banner - REMOVED BY REQUEST
        // const banner = document.getElementById('public-view-banner');

        // Hide Create Button (FAB) in Guest Mode
        const fab = document.querySelector('.fab-wrapper');
        if (fab) fab.style.display = 'none';

        // Show their wishlist (Mocking different wishlists for demo)
        // We will just clear current list or show random subset? 
        // For demo, let's show ALL items but randomized status? 
        // Or just keep same items for MVP.

        // Go to Profile to see their profile first
        // Go to Profile to see their profile first
        const profileTab = document.querySelector('[data-target="user-profile-view"]');
        if (profileTab) {
            profileTab.click();
            // Force update UI AFTER tab switch to ensure it renders correctly
            setTimeout(() => {
                updateProfileUI();
            }, 50);
        }
    }

    function exitVisitedProfile() {
        visitedProfile = null;
        isPublicView = false;

        isPublicView = false;

        isPublicView = false;

        // Banner hidden logic removed

        // Restore Create Button (FAB)
        const fab = document.querySelector('.fab-wrapper');
        if (fab) fab.style.display = 'flex';

        // Restore My Profile UI
        updateProfileUI();

        // Go back to profile search
        document.querySelector('[data-target="profile-view"]').click();
    }

    // --- OVERRIDE/UPDATE FUNCTIONS ---

    // We need to update updateProfileUI to check visitedProfile first
    // const originalUpdateProfileUI = updateProfileUI; // we can't really super it in functional style easily without rewriting it.

    // --- GENEROUS USERS LOGIC ---

    // 1. Fixed "Community" Mocks (Always visible)
    const FIXED_MOCKS = [
        { id: 101, name: "Кристина W.", username: "@kristina", avatar: "https://media.giphy.com/media/3otPoSefCKYjsiyIxW/giphy.gif", donated: "2.5M ₸", bio: "Щедрый пользователь 🎁", isPrivate: false, subscribers: 5200 },
        { id: 102, name: "Alex B.", username: "@alexb", avatar: "https://media.giphy.com/media/l2YWs1NexTst9YmFG/giphy.gif", donated: "1.8M ₸", bio: "Investments 📈", isPrivate: false, subscribers: 3100 },
        { id: 103, name: "Dana Life", username: "@danalife", avatar: "https://media.giphy.com/media/3o6fJdYXEWgW3TfDwt/giphy.gif", donated: "950k ₸", bio: "Lifestyle blog ✨", isPrivate: true, subscribers: 15400 },
        { id: 104, name: "Mr. Beast KZ", username: "@mrbeastkz", avatar: "https://media.giphy.com/media/xUySTxD71WmjOwi2I/giphy.gif", donated: "500k ₸", bio: "Charity & Fun", isPrivate: false, subscribers: 50000 },
        { id: 105, name: "Aigerim", username: "@aika", avatar: "https://media.giphy.com/media/l2YWs1NexTst9YmFG/giphy.gif", donated: "320k ₸", bio: "Student 📚", isPrivate: true, subscribers: 800 },
        { id: 1, name: "Anna Smirnova", username: "@annas", avatar: "https://media.giphy.com/media/3o6fJdYXEWgW3TfDwt/giphy.gif", donated: "150k ₸", bio: "Photography Lover 📷", isPrivate: true, subscribers: 5400 },
        { id: 2, name: "Max Payne", username: "@maxp", avatar: "https://media.giphy.com/media/xUySTxD71WmjOwi2I/giphy.gif", donated: "5k ₸", bio: "Gamer & Streamer 🎮", isPrivate: false, subscribers: 1200 },
        { id: 3, name: "Elena K.", username: "@elenak", avatar: "https://media.giphy.com/media/3otPoSefCKYjsiyIxW/giphy.gif", donated: "10k ₸", bio: "Traveler ✈️", isPrivate: true, subscribers: 8900 }
    ];

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

    function renderGenerousUsers() {
        const listContainer = document.getElementById('generous-users-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        // DEFINE MOCKS LOCALLY TO BE 100% SURE
        const LOCAL_MOCKS = [
            { id: 101, name: "Кристина W.", username: "@kristina", avatar: "https://media.giphy.com/media/3otPoSefCKYjsiyIxW/giphy.gif", donated: "2.5M ₸", bio: "Щедрый пользователь 🎁", isPrivate: false, subscribers: 5200 },
            { id: 102, name: "Alex B.", username: "@alexb", avatar: "https://media.giphy.com/media/l2YWs1NexTst9YmFG/giphy.gif", donated: "1.8M ₸", bio: "Investments 📈", isPrivate: false, subscribers: 3100 },
            { id: 103, name: "Dana Life", username: "@danalife", avatar: "https://media.giphy.com/media/3o6fJdYXEWgW3TfDwt/giphy.gif", donated: "950k ₸", bio: "Lifestyle blog ✨", isPrivate: true, subscribers: 15400 },
            { id: 104, name: "Mr. Beast KZ", username: "@mrbeastkz", avatar: "https://media.giphy.com/media/xUySTxD71WmjOwi2I/giphy.gif", donated: "500k ₸", bio: "Charity & Fun", isPrivate: false, subscribers: 50000 },
            { id: 105, name: "Aigerim", username: "@aika", avatar: "https://media.giphy.com/media/l2YWs1NexTst9YmFG/giphy.gif", donated: "320k ₸", bio: "Student 📚", isPrivate: true, subscribers: 800 },
            { id: 1, name: "Anna Smirnova", username: "@annas", avatar: "https://media.giphy.com/media/3o6fJdYXEWgW3TfDwt/giphy.gif", donated: "150k ₸", bio: "Photography Lover 📷", isPrivate: true, subscribers: 5400 },
            { id: 2, name: "Max Payne", username: "@maxp", avatar: "https://media.giphy.com/media/xUySTxD71WmjOwi2I/giphy.gif", donated: "5k ₸", bio: "Gamer & Streamer 🎮", isPrivate: false, subscribers: 1200 },
            { id: 3, name: "Elena K.", username: "@elenak", avatar: "https://media.giphy.com/media/3otPoSefCKYjsiyIxW/giphy.gif", donated: "10k ₸", bio: "Traveler ✈️", isPrivate: true, subscribers: 8900 }
        ];

        // 1. Start with Local Mocks
        let finalUserList = [...LOCAL_MOCKS];

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
        const container = document.getElementById('wish-list-container');
        if (!container) return;

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
                        <button class="btn btn-primary pay-btn" data-id="${item.id}">Пополнить</button>
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
                    }
                }
            });
        });
    }

    // INITIAL RENDER
    try {
        updateSlotsUI();
        updateProfileUI();
        renderGenerousUsers();
        renderItems();
    } catch (e) {
        alert("Render Error: " + e.message);
        console.error(e);
    }

    // Tab switching fix for nav (ensure default active)
    document.querySelector('.nav-item.active')?.click();

}); // End DOMContentLoaded
