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
    let wishListItems = safeParse('wishlist_items', []);

    // User Profile API
    let userProfile = safeParse('user_profile', {
        name: "Ali Akbar",
        bio: "Digital Creator & Blogger 📸",
        avatar: "https://media.giphy.com/media/l2YWs1NexTst9YmFG/giphy.gif", // Buddy the Elf
        isPrivate: false,
        subscribers: 1240
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
            if (visitedProfile && visitedProfile.username) {
                // If visiting, show their name actually, request was "nickname telegram" potentially?
                // User said: "стоит мое имя взде пусть имя пользовтеля ник телеграм тосит пусть"
                // "my name is everywhere, let user name nickname telegram stand"
                nameDisplay = visitedProfile.name || visitedProfile.username;
                // Using name for now as it's cleaner, but maybe nickname as secondary?
            } else if (!visitedProfile && window.Telegram?.WebApp?.initDataUnsafe?.user) {
                // If my profile, try to get from Telegram
                const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
                // Prefer username if available, else first_name
                nameDisplay = tgUser.username ? `@${tgUser.username}` : `${tgUser.first_name} ${tgUser.last_name || ''}`.trim();
            }

            profileNameEl.innerText = nameDisplay || data.name;
        }

        // Only show actual toggle state for MY profile, for guest just show visual or hide?
        // For simplicity, we just update the UI state to match data
        if (privateModeToggle) {
            privateModeToggle.checked = data.isPrivate;
            // Disable toggle if visiting
            privateModeToggle.disabled = !!visitedProfile;
        }

        if (statSubscribers) statSubscribers.innerText = formatCompactNumber(data.subscribers || 0);
        if (statWishes) statWishes.innerText = wishListItems.length; // Mocking same items for now

        // --- DYNAMIC ACTIONS (Edit vs Subscribe) ---
        const actionsContainer = document.querySelector('.insta-actions');
        if (actionsContainer) {
            if (visitedProfile) {
                // Visiting someone -> Show Subscribe
                const isSub = isSubscribedMock; // Use mock logic
                actionsContainer.innerHTML = `
                    <button class="btn-insta-edit ${isSub ? 'subscribed' : ''}" id="subscribe-action-btn" 
                        style="${isSub ? 'background: #333; color: white;' : 'background: #0095f6; color: white; border: none;'}">
                        ${isSub ? 'Вы подписаны' : 'Подписаться'}
                    </button>
                    <button class="btn-insta-share" id="message-action-btn">Сообщение</button>
                `;

                // Bind Subscribe Event
                document.getElementById('subscribe-action-btn').addEventListener('click', () => {
                    toggleSubscription(data);
                });

            } else {
                // My Profile -> Show Edit/Share (Default)
                actionsContainer.innerHTML = `
                    <button class="btn-insta-edit" id="edit-profile-btn">Редактировать</button>
                    <button class="btn-insta-share" id="share-profile-btn">Поделиться</button>
                `;
                // Re-bind default events if needed (though they might be lost if we overwrite innerHTML, 
                // ideally we should use discrete elements or re-bind. For simplicity we assume re-binding or global delegation)
                // Actually, re-binding IS needed if we overwrite logic.
                // Let's rely on event delegation or re-bind helper? 
                // For MVP: Re-bind Edit/Share here is good.
                document.getElementById('edit-profile-btn').addEventListener('click', () => {
                    // logic for edit (mock)
                    alert('Редактирование профиля (Скоро)');
                });
                document.getElementById('share-profile-btn').addEventListener('click', () => {
                    // logic for share
                    shareProfile();
                });
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
    }

    // --- SEARCH LOGIC ---
    // --- SEARCH LOGIC ---
    const MOCK_USERS = [
        { id: 1, name: "Anna Smirnova", username: "@annas", avatar: "https://media.giphy.com/media/3o6fJdYXEWgW3TfDwt/giphy.gif", bio: "Photography Lover 📷", isPrivate: true, subscribers: 5400 },
        { id: 2, name: "Max Payne", username: "@maxp", avatar: "https://media.giphy.com/media/xUySTxD71WmjOwi2I/giphy.gif", bio: "Gamer & Streamer 🎮", isPrivate: false, subscribers: 1200 },
        { id: 3, name: "Elena K.", username: "@elenak", avatar: "https://media.giphy.com/media/3otPoSefCKYjsiyIxW/giphy.gif", bio: "Traveler ✈️", isPrivate: true, subscribers: 8900 },
    ];

    // ... (lines 648-774 skipped in target to keep simple match if possible, but they are too far apart. I will do separate replaces if needed. Let's try to match just the arrays if the first one fails)

    // Actually, I'll do separate calls to be safe.
    // This call will fail because I put multiple unrelated blocks in ReplacementContent without matching TargetContent precisely including the gap.
    // I should use `multi_replace_file_content` OR separate calls.
    // I already sent a tool call above, which was risky because it spanned lines 39 to ~780+ which is HUGE.
    // The previous tool call will almost certainly fail or replace the WHOLE content in between with nothing if I matched start/end.
    // WAIT. My TargetContent in previous step was only the User Profile part:
    /*
    // User Profile API
    let userProfile = safeParse('user_profile', {
        name: "Ali Akbar",
        bio: "Digital Creator & Blogger 📸",
        avatar: "https://ui-avatars.com/api/?name=Ali+Akbar&background=random&color=fff",
        isPrivate: false,
        subscribers: 1240
    });
    */
    // But I provided replacement content that INCLUDED "MOCK_USERS" way down.
    // The `replace_file_content` tool REPLACES `TargetContent` with `ReplacementContent`.
    // So if I only matched the top part, I would be inserting the bottom part right there, DUPLICATING it and messing up the file structure.
    // I MUST ABORT OR CORRECT THIS.
    // I will assume the previous tool call might execute as is, which would be bad (inserting mock users at the top).
    // actually, I did not execute it yet technically in "thought", but I did output the tool call.
    // I should issue a NEW tool call to correct it if I can, but I can't "undo" a sent tool call in the same turn usually.
    // However, since I am generating the response, I can just output the correct tool calls now in sequence.
    // The previous `replace_file_content` only targeted lines 39-46 roughly.
    // If I replace that with code that includes `MOCK_USERS` arrays... the file will have `MOCK_USERS` defined twice (once at top, once at bottom).
    // AND I will have deleted the lines in between? NO. `replace_file_content` replaces specific block.
    // So I will just have `MOCK_USERS` defined at the top too. The bottom one remains.
    // That's messy but not fatal JS usually, unless `const` redeclaration throws error.
    // `const MOCK_USERS` redeclaration WILL throw error.

    // I must split this into 3 separate replaces: Profile, Search Users, Generous Users.
    // AND I should not use the huge block from the previous thought trace if I can avoid it.

    // RE-PLANNING:
    // I will issue 3 separate `replace_file_content` calls.
    // 1. User Profile Avatar
    // 2. Mock Users Avatars
    // 3. Generous Users Avatars

    // Since I cannot "take back" the tool call I visualized in thought, I just have to hope the system hasn't executed it. 
    // Wait, I am the model. I haven't output the JSON yet in the final response block.
    // Accessing `default_api`...

    // OK, I will emit correct multiple calls now.


    const searchInput = document.getElementById('user-search-input');
    const searchResults = document.getElementById('search-results');

    // State for viewing other profiles (Duplicate removed)
    // visitedProfile is declared at top

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
    const GENEROUS_USERS = [
        { id: 101, name: "Кристина W.", avatar: "https://media.giphy.com/media/3otPoSefCKYjsiyIxW/giphy.gif", donated: "2.5M ₸" },
        { id: 102, name: "Alex B.", avatar: "https://media.giphy.com/media/l2YWs1NexTst9YmFG/giphy.gif", donated: "1.8M ₸" },
        { id: 103, name: "Dana Life", avatar: "https://media.giphy.com/media/3o6fJdYXEWgW3TfDwt/giphy.gif", donated: "950k ₸" },
        { id: 104, name: "Mr. Beast KZ", avatar: "https://media.giphy.com/media/xUySTxD71WmjOwi2I/giphy.gif", donated: "500k ₸" },
        { id: 105, name: "Aigerim", avatar: "https://media.giphy.com/media/l2YWs1NexTst9YmFG/giphy.gif", donated: "320k ₸" },
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
                // alert('DEBUG: Clicked user ' + user.name); // Debug click removed
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

    // updateProfileUI functionality is handled by the main function definition above.
    // Duplicate removed.

    // REDEFINING renderItems slightly to use target's privacy
    function renderItems() {
        const container = document.getElementById('wish-list-container');
        if (!container) {
            console.error("Container #wish-list-container not found!");
            return;
        }
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

        // Delete listeners (Restored)
        document.querySelectorAll('.delete-icon-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm('Точно хотите удалить это желание?')) {
                    deleteItem(e.currentTarget.dataset.id);
                }
            });
        });
    } // End renderItems

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
