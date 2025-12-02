const API_URL = 'http://localhost:5000/api';

function checkAdmin() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'ADMIN') {
        window.location.href = 'shopPage.html';
        return false;
    }
    return true;
}

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const stats = await response.json();
        
        document.getElementById('statsGrid').innerHTML = `
            <div class="stat-card"><h3>${stats.totalProducts}</h3><p>Products</p></div>
            <div class="stat-card"><h3>${stats.totalOrders}</h3><p>Orders</p></div>
            <div class="stat-card"><h3>${stats.totalUsers}</h3><p>Users</p></div>
            <div class="stat-card"><h3>$${stats.totalRevenue.toFixed(2)}</h3><p>Revenue</p></div>
        `;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        const products = await response.json();
        
        document.getElementById('adminProducts').innerHTML = products.map(product => `
            <div class="admin-product-item">
                <img src="${product.imageUrl || 'https://via.placeholder.com/100'}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/100'">
                <div>
                    <h4>${product.name}</h4>
                    <p>${product.description || 'No description'}</p>
                    <p><strong>$${product.price.toFixed(2)}</strong> - Stock: ${product.stockQuantity || 'N/A'}</p>
                </div>
                <div>
                    <button onclick="editProduct(${product.id})" class="btn-primary" style="margin-right: 10px;">Edit</button>
                    <button onclick="deleteProduct(${product.id})" class="btn-danger">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load products:', error);
        document.getElementById('adminProducts').innerHTML = '<p class="error">Failed to load products</p>';
    }
}

async function loadOrders() {
    try {
        const response = await fetch(`${API_URL}/admin/orders`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const orders = await response.json();
        
        document.getElementById('adminOrders').innerHTML = orders.slice(0, 10).map(order => `
            <div class="order-item">
                <p><strong>Order #${order.id}</strong> - ${order.customerName}</p>
                <p>Total: $${order.totalAmount.toFixed(2)} - Status: ${order.status}</p>
                <select onchange="updateOrderStatus(${order.id}, this.value)">
                    <option value="PENDING" ${order.status === 'PENDING' ? 'selected' : ''}>Pending</option>
                    <option value="CONFIRMED" ${order.status === 'CONFIRMED' ? 'selected' : ''}>Confirmed</option>
                    <option value="SHIPPED" ${order.status === 'SHIPPED' ? 'selected' : ''}>Shipped</option>
                    <option value="DELIVERED" ${order.status === 'DELIVERED' ? 'selected' : ''}>Delivered</option>
                    <option value="CANCELLED" ${order.status === 'CANCELLED' ? 'selected' : ''}>Cancelled</option>
                </select>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load orders:', error);
    }
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const editId = form.dataset.editId;
    const isEdit = !!editId;
    
    const formData = new FormData();
    formData.append('name', document.getElementById('productName').value);
    formData.append('description', document.getElementById('productDescription').value);
    formData.append('price', document.getElementById('productPrice').value);
    formData.append('stockQuantity', document.getElementById('productStock').value);
    
    const imageFile = document.getElementById('productImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    try {
        const url = isEdit ? `${API_URL}/products/${editId}` : `${API_URL}/products`;
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });
        
        if (response.ok) {
            alert(isEdit ? 'Product updated successfully!' : 'Product added successfully!');
            document.getElementById('productForm').reset();
            delete form.dataset.editId;
            document.querySelector('.admin-section h3').textContent = 'Add New Product';
            document.querySelector('#productForm button[type="submit"]').textContent = 'Add Product';
            loadProducts();
            loadStats();
        } else {
            alert(isEdit ? 'Failed to update product' : 'Failed to add product');
        }
    } catch (error) {
        alert('Error saving product');
    }
});

async function editProduct(id) {
    try {
        const response = await fetch(`${API_URL}/products/${id}`);
        const product = await response.json();
        
        document.getElementById('productName').value = product.name;
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productStock').value = product.stockQuantity || '';
        
        const form = document.getElementById('productForm');
        form.dataset.editId = id;
        document.querySelector('.admin-section h3').textContent = 'Edit Product';
        document.querySelector('#productForm button[type="submit"]').textContent = 'Update Product';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        alert('Failed to load product details');
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        const response = await fetch(`${API_URL}/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            alert('Product deleted successfully!');
            loadProducts();
            loadStats();
        }
    } catch (error) {
        alert('Failed to delete product');
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        await fetch(`${API_URL}/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status })
        });
        alert('Order status updated!');
    } catch (error) {
        alert('Failed to update order status');
    }
}

document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = 'login.html';
});

document.getElementById('productForm').addEventListener('reset', function() {
    delete this.dataset.editId;
    document.querySelector('.admin-section h3').textContent = 'Add New Product';
    document.querySelector('#productForm button[type="submit"]').textContent = 'Add Product';
});

async function loadSiteImages() {
    try {
        const response = await fetch(`${API_URL}/settings`);
        const settings = await response.json();
        
        if (settings.heroImage) document.getElementById('heroPreview').src = settings.heroImage;
        if (settings.collection1Image) document.getElementById('collection1Preview').src = settings.collection1Image;
        if (settings.collection2Image) document.getElementById('collection2Preview').src = settings.collection2Image;
        if (settings.collection3Image) document.getElementById('collection3Preview').src = settings.collection3Image;
    } catch (error) {
        console.error('Failed to load site images:', error);
    }
}

document.getElementById('siteImagesForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    const fields = ['heroImage', 'collection1Image', 'collection2Image', 'collection3Image'];
    
    fields.forEach(field => {
        const file = document.getElementById(field).files[0];
        if (file) formData.append(field, file);
    });
    
    try {
        const response = await fetch(`${API_URL}/settings`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });
        
        if (response.ok) {
            alert('Site images updated successfully!');
            loadSiteImages();
        } else {
            alert('Failed to update site images');
        }
    } catch (error) {
        alert('Error updating site images');
    }
});

if (checkAdmin()) {
    loadStats();
    loadProducts();
    loadOrders();
    loadSiteImages();
}
