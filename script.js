document.addEventListener('DOMContentLoaded', () => {
    // alert("VERSION 5.0 LOADED ✅"); // Uncomment if needed for hard check

    // === DEBUGGING FORCE REFRESH ===
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = `style.css?v=${Date.now()}`;
    document.head.appendChild(style);

    window.onerror = function (msg, url, line, col, error) {
        alert("Error: " + msg + "\nLine: " + line);
    };

    // Initialize Telegram
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        try {
            window.Telegram.WebApp.setHeaderColor('#0f1115');
        } catch (e) { }
    }

    // === CONFIGURATION ===
    const KASPI_PAY_LINK = 'https://kaspi.kz/pay/YOUR_MERCHANT_NAME';

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
    let wishListItems = safeParse('wishlist_items', [
        {
            id: 1,
            title: "Дрон DJI Mini 3 Pro",
            collected: 279000,
            goal: 382500,
            image: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            category: "Техника"
        }
    ]);

    // --- TEST: FORCE ADD COMPLETED ITEM (v5.5) ---
    // This ensures you see the green button immediately
    if (!wishListItems.find(i => i.id === 999)) {
        wishListItems.unshift({
            id: 999,
            title: "Тест: Уже Исполнено ✅",
            collected: 5000,
            goal: 5000,
            image: "https://images.unsplash.com/photo-1461800919507-79b16743b257?auto=format&fit=crop&w=800&q=80",
            category: "Тест"
        });
        // We do not saveState() immediately to avoid polluting storage permanently if not desired, 
        // but for this user request we want to persist it so they see it.
        localStorage.setItem('wishlist_items', JSON.stringify(wishListItems));
    }

    // User Profile API
    let userProfile = safeParse('user_profile', {
        name: "Ali Akbar",
        bio: "Digital Creator & Blogger 📸",
        avatar: "https://ui-avatars.com/api/?name=Ali+Akbar&background=random&color=fff",
        isPrivate: false,
        subscribers: 1240
    });

    // Public View API
    let isPublicView = false;
    let isSubscribedMock = false;

    // Elements
    const container = document.getElementById('wish-list-container');
    const paymentModal = document.getElementById('payment-modal');
    const amountInput = document.getElementById('payment-amount');

    // --- FUNCTIONS ---

    function saveState() {
        localStorage.setItem('wishlist_items', JSON.stringify(wishListItems));
        localStorage.setItem('max_slots', maxSlots);
        updateSlotsUI();
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

    function renderItems() {
        if (!container) return;
        container.innerHTML = '';

        // PRIVACY CHECK: Public View + Private Profile + Not Subscribed
        if (isPublicView && userProfile.isPrivate && !isSubscribedMock) {
            const overlay = document.getElementById('locked-overlay');
            if (overlay) overlay.classList.remove('hidden');
            return; // Hide items
        } else {
            const overlay = document.getElementById('locked-overlay');
            if (overlay) overlay.classList.add('hidden');
        }

        wishListItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'wish-card';

            const percent = item.goal > 0 ? Math.min(100, Math.round((item.collected / item.goal) * 100)) : 0;

            card.innerHTML = `
                <div class="card-image-container">
                    <img src="${item.image}" alt="${item.title}" class="card-image" loading="lazy">
                    <div class="image-overlay">${item.category || 'Разное'}</div>
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
        document.querySelectorAll('.pay-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.wish-card');
                const title = card.querySelector('h3').innerText;
                const id = e.target.dataset.id;
                openModal(title, id);
            });
        });

        // Delete listeners (updated class)
        document.querySelectorAll('.delete-icon-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm('Точно хотите удалить это желание?')) {
                    deleteItem(e.currentTarget.dataset.id);
                }
            });
        });
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

        if (profileNameEl) profileNameEl.innerText = userProfile.name;
        if (profileBioEl) profileBioEl.innerText = userProfile.bio;
        if (profileAvatarEl) profileAvatarEl.src = userProfile.avatar;
        if (privateModeToggle) privateModeToggle.checked = userProfile.isPrivate;

        if (statSubscribers) statSubscribers.innerText = formatCompactNumber(userProfile.subscribers);
        if (statWishes) statWishes.innerText = wishListItems.length;
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
                // Strategy 1: AllOrigins
                let proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
                let response = await fetch(proxyUrl);
                let data = await response.json();
                let htmlContent = data.contents;

                // Strategy 2: CorsProxy (Fallback if 1 fails or returns empty)
                if (!htmlContent) {
                    // console.log("Retrying with fallback proxy...");
                    // proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
                    // response = await fetch(proxyUrl);
                    // htmlContent = await response.text();
                    throw new Error('Proxy failed');
                }

                if (!htmlContent) throw new Error('No content');

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
                // Try searching for JSON-LD script which is most reliable if present
                let price = 0;

                // Method A: JSON-LD
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

                // Method B: Common classes if Method A failed
                if (!price) {
                    const priceText = doc.querySelector('.item__price-once')?.innerText ||
                        doc.querySelector('.item__price-value')?.innerText ||
                        '0';
                    price = parseInt(priceText.replace(/\D/g, '')) || 0;
                }

                document.querySelector('.create-step-1').classList.add('hidden');
                document.getElementById('create-step-2').classList.remove('hidden');

                document.getElementById('new-item-title').value = title;
                document.getElementById('new-item-price').value = price || "";
                document.getElementById('new-item-image').src = image;

            } catch (e) {
                console.error("Parsing error:", e);
                alert("Не удалось загрузить данные автоматически (Kaspi защита). Заполните вручную.");

                // Fail gracefully to manual mode
                document.querySelector('.create-step-1').classList.add('hidden');
                document.getElementById('create-step-2').classList.remove('hidden');
                document.getElementById('new-item-image').src = 'https://placehold.co/600x400?text=Foto';
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
    const publicViewBanner = document.getElementById('public-view-banner');

    if (publicPreviewBtn) {
        publicPreviewBtn.addEventListener('click', () => {
            isPublicView = true;
            isSubscribedMock = false;

            publicViewBanner.classList.remove('hidden');
            document.querySelector('[data-target="home-view"]').click();
            renderItems();
        });
    }

    if (exitPublicViewLink) {
        exitPublicViewLink.addEventListener('click', (e) => {
            e.preventDefault();
            isPublicView = false;
            publicViewBanner.classList.add('hidden');
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

        // Header Logic
        if (targetId === 'home-view') {
            if (visitedProfile) {
                // GUEST MODE
                headerBackBtn.classList.remove('hidden');
                headerUserInfo.classList.add('hidden');
                headerUserInfo.style.display = 'none';
                headerTitle.classList.remove('hidden');
                headerTitle.innerHTML = `В гостях: ${visitedProfile.name}`;

                // Back button acts as Exit
                headerBackBtn.onclick = () => {
                    // Override default history pop
                    exitVisitedProfile();
                };

                if (window.Telegram?.WebApp?.BackButton) {
                    window.Telegram.WebApp.BackButton.show();
                    window.Telegram.WebApp.BackButton.onClick(exitVisitedProfile);
                }
            } else {
                // NORMAL HOME
                headerBackBtn.classList.add('hidden');
                headerTitle.classList.add('hidden');
                headerUserInfo.classList.remove('hidden');
                headerUserInfo.style.display = 'flex';
                if (window.Telegram?.WebApp?.BackButton) window.Telegram.WebApp.BackButton.hide();

                // Reset back button listener just in case
                headerBackBtn.onclick = () => {
                    historyStack.pop();
                    navigateTo(historyStack[historyStack.length - 1] || 'home-view');
                };
            }
        } else {
            // OTHER VIEWS
            headerBackBtn.classList.remove('hidden');
            headerUserInfo.classList.add('hidden');
            headerUserInfo.style.display = 'none';
            headerTitle.classList.remove('hidden');
            // Restore default listener
            headerBackBtn.onclick = () => {
                historyStack.pop();
                navigateTo(historyStack[historyStack.length - 1] || 'home-view');
            };

            if (targetId === 'create-view') headerTitle.textContent = 'Создать';
            if (targetId === 'profile-view') headerTitle.textContent = 'Рейтинг';
            if (targetId === 'user-profile-view') headerTitle.textContent = 'Профиль';
            if (targetId === 'tasks-view') headerTitle.textContent = 'Задания';

            if (window.Telegram?.WebApp?.BackButton) {
                window.Telegram.WebApp.BackButton.show();
                window.Telegram.WebApp.BackButton.onClick(() => {
                    historyStack.pop();
                    navigateTo(historyStack[historyStack.length - 1] || 'home-view');
                });
            }
        }
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

    // Telegram Init
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.expand();
        window.Telegram.WebApp.setHeaderColor('#0f1115');
    }

    // --- SEARCH LOGIC ---
    const MOCK_USERS = [
        { id: 1, name: "Anna Smirnova", username: "@annas", avatar: "https://ui-avatars.com/api/?name=Anna+S&background=random&color=fff", bio: "Photography Lover 📷", isPrivate: true, subscribers: 5400 },
        { id: 2, name: "Max Payne", username: "@maxp", avatar: "https://ui-avatars.com/api/?name=Max+P&background=random&color=fff", bio: "Gamer & Streamer 🎮", isPrivate: false, subscribers: 1200 },
        { id: 3, name: "Elena K.", username: "@elenak", avatar: "https://ui-avatars.com/api/?name=Elena+K&background=random&color=fff", bio: "Traveler ✈️", isPrivate: true, subscribers: 8900 },
    ];

    const searchInput = document.getElementById('user-search-input');
    const searchResults = document.getElementById('search-results');

    // State for viewing other profiles
    let visitedProfile = null; // If set, we are viewing this user

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (query.length < 2) {
                searchResults.classList.add('hidden');
                return;
            }

            const filtered = MOCK_USERS.filter(u =>
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

        // Show Banner
        const banner = document.getElementById('public-view-banner');
        if (banner) {
            banner.querySelector('p').innerHTML = `В гостях у <b>${user.name}</b>. <a href="#" id="exit-visited-btn">Вернуться</a>`;
            banner.classList.remove('hidden');

            // Re-bind exit button for this case
            document.getElementById('exit-visited-btn').onclick = (e) => {
                e.preventDefault();
                exitVisitedProfile();
            };
        }

        // Show their wishlist (Mocking different wishlists for demo)
        // We will just clear current list or show random subset? 
        // For demo, let's show ALL items but randomized status? 
        // Or just keep same items for MVP.

        // Go to Home to see items
        document.querySelector('[data-target="home-view"]').click();
        renderItems();
    }

    function exitVisitedProfile() {
        visitedProfile = null;
        isPublicView = false;

        document.getElementById('public-view-banner').classList.add('hidden');

        // Restore My Profile UI
        updateProfileUI();

        // Go back to profile search
        document.querySelector('[data-target="profile-view"]').click();
    }

    // --- OVERRIDE/UPDATE FUNCTIONS ---

    // We need to update updateProfileUI to check visitedProfile first
    // const originalUpdateProfileUI = updateProfileUI; // we can't really super it in functional style easily without rewriting it.

    // --- GENEROUS USERS LOGIC ---
    const GENEROUS_USERS = [
        { id: 101, name: "Кристина W.", avatar: "https://ui-avatars.com/api/?name=Kristina&background=random", donated: "2.5M ₸" },
        { id: 102, name: "Alex B.", avatar: "https://ui-avatars.com/api/?name=Alex&background=random", donated: "1.8M ₸" },
        { id: 103, name: "Dana Life", avatar: "https://ui-avatars.com/api/?name=Dana&background=random", donated: "950k ₸" },
        { id: 104, name: "Mr. Beast KZ", avatar: "https://ui-avatars.com/api/?name=Mr+Beast&background=random", donated: "500k ₸" },
        { id: 105, name: "Aigerim", avatar: "https://ui-avatars.com/api/?name=Aigerim&background=random", donated: "320k ₸" },
    ];

    function renderGenerousUsers() {
        const listContainer = document.getElementById('generous-users-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        GENEROUS_USERS.forEach((user, index) => {
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
                openVisitedProfile({
                    ...user,
                    bio: "Щедрый пользователь 🎁",
                    isPrivate: false,
                    subscribers: Math.floor(Math.random() * 5000)
                });
            });
            listContainer.appendChild(div);
        });
    }

    // --- OVERRIDE/UPDATE FUNCTIONS ---

    // REDEFINING updateProfileUI for Community View
    function updateProfileUI() {
        const target = visitedProfile || userProfile; // View visited or Self

        // Elements for new design
        const profileNameEl = document.getElementById('profile-name');
        const profileBioEl = document.getElementById('profile-bio');
        const profileAvatarEl = document.getElementById('profile-avatar');

        if (profileNameEl) profileNameEl.innerText = target.name;
        if (profileBioEl) profileBioEl.innerText = target.bio;
        if (profileAvatarEl) profileAvatarEl.src = target.avatar;
    }

    // REDEFINING renderItems slightly to use target's privacy
    function renderItems() {
        if (!container) return;
        container.innerHTML = '';

        const target = visitedProfile || userProfile;

        // PRIVACY CHECK
        if (isPublicView && target.isPrivate && !isSubscribedMock) {
            const overlay = document.getElementById('locked-overlay');
            if (overlay) {
                overlay.classList.remove('hidden');
                // Update text
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

            card.innerHTML = `
                <div class="card-image-container">
                    <img src="${item.image}" alt="${item.title}" class="card-image" loading="lazy">
                    <div class="image-overlay">${item.category || 'Разное'}</div>
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

        document.querySelectorAll('.pay-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const title = e.target.closest('.wish-card').querySelector('h3').innerText;
                openModal(title);
            });
        });
    }

    // INITIAL RENDER
    updateSlotsUI();
    updateProfileUI(); // Call the new version
    renderGenerousUsers(); // NEW
    renderItems();     // Call the new version

    // Tab switching fix for nav (ensure default active)
    document.querySelector('.nav-item.active')?.click();
});
