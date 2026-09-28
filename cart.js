(function () {
    const CART_KEY = 'wakibi_market_cart';
    const DELIVERY_FEE = 18000;

    const defaultCart = [
        { id: 'laptop-14', name: 'Portable Laptop 14', price: 2900000, quantity: 1 },
        { id: 'smart-tv-55', name: 'Smart TV 55', price: 3600000, quantity: 1 }
    ];

    function formatUGX(value) {
        const amount = Number(value) || 0;
        return 'UGX ' + new Intl.NumberFormat('en-US').format(amount);
    }

    function getStoredCart() {
        try {
            const stored = JSON.parse(localStorage.getItem(CART_KEY) || 'null');
            if (Array.isArray(stored) && stored.length) {
                return stored.map(function (item) {
                    return {
                        id: item.id || String(Math.random()),
                        name: item.name || 'Product',
                        price: Number(item.price) || 0,
                        quantity: Math.max(1, Number(item.quantity) || 1)
                    };
                });
            }
        } catch (error) {
            // ignore invalid cart data
        }

        return defaultCart.map(function (item) {
            return { ...item };
        });
    }

    function saveCart(cart) {
        try {
            localStorage.setItem(CART_KEY, JSON.stringify(cart));
        } catch (error) {
            // localStorage may be unavailable in some restricted contexts.
        }
        updateCartDisplays();
        if (document.getElementById('cart-items')) {
            renderCartPage();
        }
    }

    function getCart() {
        return getStoredCart();
    }

    function getCartCount() {
        return getCart().reduce(function (sum, item) {
            return sum + Number(item.quantity || 0);
        }, 0);
    }

    function updateCartDisplays() {
        const value = getCartCount();
        document.querySelectorAll('.nav-cart strong').forEach(function (counter) {
            counter.textContent = String(value);
        });
    }

    function parseProductPrice(element) {
        if (!element) return 0;
        const text = (element.textContent || '').replace(/[^\d]/g, '');
        return Number(text || '0');
    }

    function getProductInfo(link) {
        const card = link.closest('.destination-card');
        const titleNode = card ? card.querySelector('h3') : null;
        const priceNode = card ? card.querySelector('.package-price strong, .product-price') : null;
        const name = (titleNode ? titleNode.textContent.trim() : (link.dataset.name || 'Product')) || 'Product';
        const price = parseProductPrice(priceNode || link);

        return {
            id: String((link.dataset.id || name).toLowerCase().replace(/\s+/g, '-')),
            name: name,
            price: price || Number(link.dataset.price || 0)
        };
    }

    function addToCartFromLink(link) {
        if (!link) return;

        const product = getProductInfo(link);
        const cart = getCart();
        const existing = cart.find(function (item) {
            return item.id === product.id || item.name === product.name;
        });

        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: Number(product.price) || 0,
                quantity: 1
            });
        }

        saveCart(cart);

        const originalText = link.textContent.trim();
        link.textContent = 'Added';
        link.classList.add('added');

        window.setTimeout(function () {
            link.textContent = originalText;
            link.classList.remove('added');
        }, 1000);
    }

    function attachCartHandler(link) {
        if (!link || link.dataset.cartBound === 'true') return;
        link.dataset.cartBound = 'true';

        link.addEventListener('click', function (event) {
            event.preventDefault();
            addToCartFromLink(link);
        });
    }

    function renderCartPage() {
        const cartItemsContainer = document.getElementById('cart-items');
        if (!cartItemsContainer) return;

        const cart = getCart();
        if (!cart.length) {
            cartItemsContainer.innerHTML = '<div class="empty-cart"><h3>Your cart is empty</h3><p>Add a few products to get started.</p><a href="index.html" class="btn-primary">Shop now</a></div>';
            document.getElementById('cart-subtotal').textContent = 'UGX 0';
            document.getElementById('cart-total').textContent = 'UGX 0';
            return;
        }

        const subtotal = cart.reduce(function (sum, item) {
            return sum + (Number(item.price || 0) * Number(item.quantity || 1));
        }, 0);
        const total = subtotal + DELIVERY_FEE;

        cartItemsContainer.innerHTML = cart.map(function (item) {
            const itemTotal = Number(item.price || 0) * Number(item.quantity || 1);
            return `
                <article class="cart-item" data-id="${item.id}">
                    <div class="cart-product-info">
                        <div class="cart-thumb" aria-hidden="true">▣</div>
                        <div>
                            <h3>${item.name}</h3>
                            <button type="button" class="link-button remove-item" data-id="${item.id}">Remove</button>
                        </div>
                    </div>
                    <div class="cart-price">${formatUGX(item.price)}</div>
                    <div class="cart-quantity">
                        <button type="button" class="qty-btn" data-id="${item.id}" data-change="-1">−</button>
                        <span>${item.quantity}</span>
                        <button type="button" class="qty-btn" data-id="${item.id}" data-change="1">+</button>
                    </div>
                    <div class="cart-total">${formatUGX(itemTotal)}</div>
                </article>
            `;
        }).join('');

        document.getElementById('cart-subtotal').textContent = formatUGX(subtotal);
        document.getElementById('cart-total').textContent = formatUGX(total);

        const removeButtons = document.querySelectorAll('.remove-item');
        removeButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                const nextCart = getCart().filter(function (item) {
                    return item.id !== button.dataset.id;
                });
                saveCart(nextCart);
            });
        });

        document.querySelectorAll('.qty-btn').forEach(function (button) {
            button.addEventListener('click', function () {
                const cartList = getCart();
                const item = cartList.find(function (entry) {
                    return entry.id === button.dataset.id;
                });

                if (!item) return;

                const change = Number(button.dataset.change || 0);
                item.quantity = Math.max(1, Number(item.quantity || 1) + change);

                if (item.quantity <= 0) {
                    const filtered = cartList.filter(function (entry) {
                        return entry.id !== item.id;
                    });
                    saveCart(filtered);
                    return;
                }

                saveCart(cartList);
            });
        });
    }

    function proceedToCheckout() {
        const cart = getCart();
        const subtotal = cart.reduce(function (sum, item) {
            return sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1));
        }, 0);
        const total = subtotal + DELIVERY_FEE;

        if (!cart.length) {
            alert('Your cart is empty. Add a product before checking out.');
            return;
        }

        const order = {
            orderId: 'WK-' + Date.now().toString().slice(-8),
            items: cart,
            subtotal: subtotal,
            delivery: DELIVERY_FEE,
            total: total,
            placedAt: new Date().toISOString()
        };

        try {
            localStorage.setItem('wakibi_market_last_order', JSON.stringify(order));
        } catch (error) {
            // continue without persistent order data if storage is blocked
        }

        saveCart([]);
        window.location.href = 'checkout.html';
    }

    document.addEventListener('DOMContentLoaded', function () {
        updateCartDisplays();

        if (document.getElementById('cart-items')) {
            renderCartPage();
        }

        const checkoutButton = document.querySelector('.checkout-btn');
        if (checkoutButton) {
            checkoutButton.addEventListener('click', proceedToCheckout);
        }

        document.querySelectorAll('.btn-link, a[href="#"], .add-to-cart').forEach(function (link) {
            const text = (link.textContent || '').toLowerCase();
            const isProductAction = text.includes('add to cart') || text.includes('shop now') || text.includes('book now') || text.includes('learn more');

            if (isProductAction) {
                attachCartHandler(link);
            }
        });
    });
})();
