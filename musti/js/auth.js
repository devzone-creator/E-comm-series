const API_URL = 'http://localhost:5000/api';

if (window.location.pathname.includes('login.html')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = 'shopPage.html';
            } else {
                document.getElementById('message').innerHTML = `<p class="error">${data.error}</p>`;
            }
        } catch (error) {
            document.getElementById('message').innerHTML = '<p class="error">Login failed</p>';
        }
    });
}

if (window.location.pathname.includes('register.html')) {
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (password.length < 6) {
            document.getElementById('message').innerHTML = '<p class="error">Password must be at least 6 characters</p>';
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();
            if (response.ok) {
                document.getElementById('message').innerHTML = '<p class="success">Registration successful! Redirecting to login...</p>';
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                document.getElementById('message').innerHTML = `<p class="error">${data.error}</p>`;
            }
        } catch (error) {
            document.getElementById('message').innerHTML = '<p class="error">Registration failed. Please try again.</p>';
        }
    });
}
