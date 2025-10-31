
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const inventoryTable = document.getElementById('inventoryTable').getElementsByTagName('tbody')[0];
    const paginationContainer = document.querySelector('.pagination');

    let currentPage = 1;
    let currentSearch = '';

    const fetchInventory = async (page = 1, search = '') => {
        try {
            const response = await fetch(`/api/inventory?page=${page}&search=${search}`);
            if (!response.ok) {
                throw new Error('Failed to fetch inventory');
            }
            const data = await response.json();
            renderTable(data.inventory);
            renderPagination(data.pagination);
        } catch (error) {
            console.error('Error fetching inventory:', error);
            inventoryTable.innerHTML = `<tr><td colspan="7">Error loading data.</td></tr>`;
        }
    };

    const renderTable = (inventory) => {
        inventoryTable.innerHTML = '';
        if (inventory.length === 0) {
            inventoryTable.innerHTML = `<tr><td colspan="7">No products found.</td></tr>`;
            return;
        }

        inventory.forEach(product => {
            const row = inventoryTable.insertRow();
            row.innerHTML = `
                <td>${product.id}</td>
                <td>${product.name}</td>
                <td>${product.sku || 'N/A'}</td>
                <td>${product.category_name || 'N/A'}</td>
                <td>$${product.price.toFixed(2)}</td>
                <td><input type="number" class="stock-input" data-id="${product.id}" value="${product.stock_quantity}"></td>
                <td><button class="update-stock-btn" data-id="${product.id}">Update</button></td>
            `;
        });
    };

    const renderPagination = (pagination) => {
        paginationContainer.innerHTML = '';
        if (pagination.pages <= 1) return;

        for (let i = 1; i <= pagination.pages; i++) {
            const button = document.createElement('button');
            button.innerText = i;
            button.disabled = i === pagination.page;
            button.addEventListener('click', () => {
                currentPage = i;
                fetchInventory(currentPage, currentSearch);
            });
            paginationContainer.appendChild(button);
        }
    };

    const updateStock = async (productId, quantity) => {
        try {
            const response = await fetch(`/api/inventory/${productId}/stock`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ quantity: parseInt(quantity, 10), operation: 'set' })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update stock');
            }

            // Optionally, show a success message
            console.log('Stock updated successfully');
            // Re-fetch to show updated data
            fetchInventory(currentPage, currentSearch);

        } catch (error) {
            console.error('Error updating stock:', error);
            // Optionally, show an error message to the user
            alert(error.message);
        }
    };

    searchButton.addEventListener('click', () => {
        currentPage = 1;
        currentSearch = searchInput.value;
        fetchInventory(currentPage, currentSearch);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchButton.click();
        }
    });

    inventoryTable.addEventListener('click', (e) => {
        if (e.target.classList.contains('update-stock-btn')) {
            const productId = e.target.dataset.id;
            const stockInput = document.querySelector(`.stock-input[data-id="${productId}"]`);
            const newQuantity = stockInput.value;
            updateStock(productId, newQuantity);
        }
    });

    // Initial fetch
    fetchInventory();
});
