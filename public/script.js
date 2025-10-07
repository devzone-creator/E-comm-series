document.addEventListener('DOMContentLoaded', function () {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.main-nav');

    mobileMenuBtn.addEventListener('click', function () {
        navLinks.classList.toggle('show'); // Toggle the 'show' class
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
                // Close mobile menu if open
                navLinks.classList.remove('show');
            }
        });
    });
});

//------------------ shop.js ------------------------------

document.addEventListener('DOMContentLoaded', function () {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.main-nav');

    mobileMenuBtn.addEventListener('click', function () {
        navLinks.classList.toggle('show'); // Toggle the 'show' class
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                navLinks.classList.remove('show');
            }
        });
    });
});

// Simulated product data from admin
const products = []; // Initially empty to simulate no products uploaded

// Function to display products
function displayProducts() {
    const productsGrid = document.getElementById('products-grid');
    if (products.length > 0) {
        products.forEach(product => {
            productsGrid.innerHTML += `
                        <div class="product-card">
                            <div class="product-image">
                                <img src="${product.image}" alt="${product.name}">
                            </div>
                            <div class="product-info">
                                <h3>${product.name}</h3>
                                <p>${product.description}</p>
                                <span class="price">${product.price}</span>
                                <button class="cta-button" onclick="openModal('${product.name}', '${product.description}', '${product.price}', '${product.image}')">View Details</button>
                            </div>
                        </div>
                    `;
        });
    } else {
        document.getElementById('no-products-message').style.display = 'block';
    }
}

// Call the function to display products
displayProducts();

// Modal functionality
window.openModal = function (name, description, price, image) {
    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="this.parentElement.parentElement.remove();">&times;</span>
                    <img src="${image}" alt="${name}">
                    <h3>${name}</h3>
                    <p>${description}</p>
                    <span class="price">${price}</span>
                    <div class="sub-images">
                        <!-- Sub images can be added here -->
                    </div>
                </div>
            `;
    document.body.appendChild(modal);
};


//------------------ cart.js ------------------------------

document.addEventListener('DOMContentLoaded', function () {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.main-nav');

    mobileMenuBtn.addEventListener('click', function () {
        navLinks.classList.toggle('show'); // Toggle the 'show' class
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                navLinks.classList.remove('show');
            }
        });
    });
});

// Initialize an empty cart
const cart = [];

// Function to add items to the cart
function addToCart(name, price) {
    const item = { name, price, quantity: 1 };
    const existingItem = cart.find(cartItem => cartItem.name === name);

    if (existingItem) {
        existingItem.quantity += 1; // Increase quantity if item already exists
    } else {
        cart.push(item); // Add new item to cart
    }

    alert(`${name} has been added to your cart!`);
}

// Function to render cart items
function renderCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    cartItemsContainer.innerHTML = ''; // Clear existing items
    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
                    <div class="cart-item-details">
                        <h3>${item.name}</h3>
                        <p>Price: $${item.price.toFixed(2)}</p>
                        <p>Quantity: <input type="number" value="${item.quantity}" min="1" onchange="updateQuantity('${item.name}', this.value)"></p>
                        <p>Total: $${itemTotal.toFixed(2)}</p>
                    </div>
                    <button onclick="removeItem('${item.name}')" class="remove-button">Remove</button>
                `;
        cartItemsContainer.appendChild(cartItem);
    });

    document.getElementById('total-price').innerText = `$${total.toFixed(2)}`;
}

// Function to update item quantity
function updateQuantity(name, quantity) {
    const item = cart.find(cartItem => cartItem.name === name);
    if (item) {
        item.quantity = parseInt(quantity);
        renderCartItems();
    }
}

// Function to remove item from cart
function removeItem(name) {
    const index = cart.findIndex(item => item.name === name);
    if (index > -1) {
        cart.splice(index, 1);
        renderCartItems();
    }
}

// Initial render
renderCartItems();


//------------------ cart.js ------------------------------

document.addEventListener('DOMContentLoaded', function () {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.main-nav');

    mobileMenuBtn.addEventListener('click', function () {
        navLinks.classList.toggle('show'); // Toggle the 'show' class
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                navLinks.classList.remove('show');
            }
        });
    });
});