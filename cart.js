const API_URL = 'http://localhost:5000/api';

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.role === 'ADMIN') {
        document.getElementById('adminLink').style.display = 'inline';
    }
    return true;
}

function loadCart() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartItemsEl = document.getElementById('cartItems');
    
    if (!cart || cart.length === 0) {
        cartItemsEl.innerHTML = '<p>Your cart is empty. <a href="shopPage.html">Continue shopping</a></p>';
        document.getElementById('cartTotal').textContent = '0.00';
        document.getElementById('checkoutBtn').disabled = true;
        return;
    }
    
    document.getElementById('checkoutBtn').disabled = false;
    
    cartItemsEl.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <h4>${item.productName}</h4>
            <p>Price: $${item.price.toFixed(2)}</p>
            <div class="quantity-controls">
                <button onclick="updateQuantity(${index}, -1)">-</button>
                <span>${item.quantity}</span>
                <button onclick="updateQuantity(${index}, 1)">+</button>
            </div>
            <p>Subtotal: $${(item.price * item.quantity).toFixed(2)}</p>
            <button onclick="removeItem(${index})" class="btn-danger">Remove</button>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('cartTotal').textContent = total.toFixed(2);
}

function updateQuantity(index, change) {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart[index].quantity += change;
    
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart();
}

function removeItem(index) {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart();
}

document.getElementById('checkoutBtn')?.addEventListener('click', () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }
    window.location.href = 'checkout.html';
});

document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = 'login.html';
});

if (checkAuth()) {
    loadCart();
}
