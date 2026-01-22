document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('passwordInput');
    const loginForm = document.getElementById('loginForm');

    if (toggleBtn && passwordInput) {
        const icon = toggleBtn.querySelector('i');
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitBtn = document.getElementById('submitBtn');
            const btnText = submitBtn.querySelector('span');
            const btnLoader = document.getElementById('btnLoader');
            const errorMessage = document.getElementById('errorMessage');
            
            const email = this.email.value.trim();
            const password = this.password.value;

            errorMessage.classList.add('hidden');
            errorMessage.innerText = '';

            if (!email || !password) {
                errorMessage.innerText = 'Email dan Password harus diisi.';
                errorMessage.classList.remove('hidden');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                errorMessage.innerText = 'Format email tidak valid.';
                errorMessage.classList.remove('hidden');
                return;
            }

            submitBtn.disabled = true;
            btnText.innerText = 'Signing In...';
            btnLoader.classList.remove('hidden');

            try {
                const response = await fetch('/dardcor-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ email, password })
                });

                if (response.status === 429) {
                    throw new Error('Terlalu banyak percobaan login. Tunggu sebentar.');
                }

                const result = await response.json();

                if (response.ok && result.success) {
                    window.location.replace(result.redirectUrl || '/dardcorchat/dardcor-ai');
                } else {
                    throw new Error(result.message || 'Login gagal.');
                }
            } catch (error) {
                errorMessage.innerText = error.message;
                errorMessage.classList.remove('hidden');
                submitBtn.disabled = false;
                btnText.innerText = 'Sign In';
                btnLoader.classList.add('hidden');
            }
        });
    }
});