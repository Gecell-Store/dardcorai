document.addEventListener('DOMContentLoaded', () => {
    const otpForm = document.getElementById('otpForm');
    const otpInput = document.getElementById('otp');

    if (otpInput) {
        otpInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
        otpInput.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData('text');
            this.value = pastedData.replace(/[^0-9]/g, '').slice(0, 6);
        });
    }
    
    if (otpForm) {
        otpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnVerify');
            const msg = document.getElementById('msg');
            const otpValue = otpInput.value.trim();
            const email = document.getElementById('userEmail').value;
            const originalBtnContent = '<span>Verifikasi</span><i class="fas fa-arrow-right"></i>';

            btn.disabled = true;
            btn.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Memproses...</span>';
            msg.classList.add('hidden');

            if (!/^\d{6}$/.test(otpValue)) {
                msg.innerText = "Masukkan 6 digit kode OTP yang valid.";
                msg.classList.remove('hidden');
                btn.disabled = false;
                btn.innerHTML = originalBtnContent;
                return;
            }
            
            try {
                const res = await fetch('/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, otp: otpValue })
                });

                const data = await res.json();
                if(data.success) {
                    btn.innerHTML = '<i class="fas fa-check"></i><span>Berhasil!</span>';
                    btn.classList.replace('bg-[#2e1065]', 'bg-green-600');
                    window.location.replace('/loading');
                } else {
                    throw new Error(data.message || 'OTP tidak valid.');
                }
            } catch (err) {
                msg.innerText = err.message;
                msg.classList.remove('hidden');
                btn.disabled = false;
                btn.innerHTML = originalBtnContent;
            }
        });
    }
});