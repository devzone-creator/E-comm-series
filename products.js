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

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountEl = document.getElementById('cartCount');
    if (cartCountEl) cartCountEl.textContent = count;
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        const products = await response.json();
        
        const grid = document.getElementById('productsGrid');
        grid.innerHTML = products.map(product => `
            <div class="product-card">
                <img src="${product.imageUrl || 'https://via.placeholder.com/300'}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300'">
                <h3>${product.name}</h3>
                ${product.description ? `<p class="product-description">${product.description}</p>` : ''}
                <p class="price">$${product.price.toFixed(2)}</p>
                ${product.stockQuantity !== null ? `<p class="stock">Stock: ${product.stockQuantity}</p>` : ''}
                <button onclick="addToCart(${product.id}, '${product.name.replace(/'/g, "\\'")}}', ${product.price})">Add to Cart</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load products:', error);
    }
}

function addToCart(productId, productName, price) {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
        existingItem.quantity++;
        alert(`${productName} quantity updated in cart!`);
    } else {
        cart.push({ productId, productName, price, quantity: 1 });
        alert(`${productName} added to cart!`);
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = 'login.html';
});

if (checkAuth()) {
    loadProducts();
    updateCartCount();
}
