document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggleRegPassword');
    const passwordInput = document.getElementById('regPassword');
    const registerForm = document.getElementById('registerForm');

    if (toggleBtn && passwordInput) {
        const icon = toggleBtn.querySelector('i');
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            icon.className = type === 'password' ? 'fas fa-eye text-xs' : 'fas fa-eye-slash text-xs';
            passwordInput.focus();
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitBtn = document.getElementById('submitBtn');
            const btnText = submitBtn.querySelector('span');
            const btnLoader = document.getElementById('btnLoader');
            const errorMessage = document.getElementById('errorMessage');
            
            const email = this.email.value.trim();
            const username = this.username.value.trim();
            const password = this.password.value;

            errorMessage.classList.add('hidden');
            errorMessage.innerText = '';

            if (!email || !username || !password) {
                errorMessage.innerText = 'Semua data wajib diisi.';
                errorMessage.classList.remove('hidden');
                return;
            }

            submitBtn.disabled = true;
            btnText.innerText = 'Processing...';
            btnLoader.classList.remove('hidden');

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ email, username, password })
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    window.location.href = `/verify-otp?email=${encodeURIComponent(email)}`;
                } else {
                    throw new Error(result.message || 'Registrasi gagal.');
                }
            } catch (error) {
                errorMessage.innerText = error.message;
                errorMessage.classList.remove('hidden');
                submitBtn.disabled = false;
                btnText.innerText = 'Register';
                btnLoader.classList.add('hidden');
            }
        });
    }
});