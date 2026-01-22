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
            icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
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

            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(email)) {
                errorMessage.innerText = 'Format email tidak valid.';
                errorMessage.classList.remove('hidden');
                return;
            }

            const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
            if (!usernameRegex.test(username)) {
                errorMessage.innerText = 'Username hanya boleh huruf, angka, garis bawah (3-20 karakter).';
                errorMessage.classList.remove('hidden');
                return;
            }

            if (password.length < 8) {
                errorMessage.innerText = 'Password minimal 8 karakter.';
                errorMessage.classList.remove('hidden');
                return;
            }

            submitBtn.disabled = true;
            btnText.innerText = 'Memproses...';
            btnLoader.classList.remove('hidden');

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ email, username, password })
                });

                if (response.status === 429) {
                    throw new Error('Terlalu banyak permintaan. Coba lagi nanti.');
                }

                const result = await response.json();

                if (response.ok && result.success) {
                    window.location.href = result.redirectUrl || '/verify-otp';
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