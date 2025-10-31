// Order History JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    const cancelButtons = document.querySelectorAll('.cancel-order');
    const modal = document.getElementById('cancelModal');
    const closeModal = document.querySelectorAll('.close, #cancelModalClose');
    const confirmCancel = document.getElementById('confirmCancel');
    let currentOrderId = null;

    // Cancel order functionality
    cancelButtons.forEach(button => {
        button.addEventListener('click', function() {
            currentOrderId = this.dataset.orderId;
            modal.style.display = 'block';
        });
    });

    closeModal.forEach(element => {
        element.addEventListener('click', function() {
            modal.style.display = 'none';
            currentOrderId = null;
            document.getElementById('cancelReason').value = '';
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            currentOrderId = null;
            document.getElementById('cancelReason').value = '';
        }
    });

    confirmCancel.addEventListener('click', async function() {
        if (!currentOrderId) r