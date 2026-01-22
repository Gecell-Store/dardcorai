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
            const otpValue = otpInput.value.trim();
            const email = document.getElementById('userEmail').value;
            const btn = document.getElementById('btnVerify');
            const msg = document.getElementById('msg');
            const originalBtnContent = '<span>Verifikasi</span><i class="fas fa-arrow-right"></i>';

            if (!/^\d{6}$/.test(otpValue)) {
                msg.innerText = "Masukkan 6 digit kode OTP yang valid.";
                msg.classList.remove('hidden');
                return;
            }
            
            btn.disabled = true;
            btn.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Memproses...</span>';
            msg.classList.add('hidden');

            try {
                const res = await fetch('/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ email, otp: otpValue }) 
                });

                if (res.status === 429) {
                    throw new Error('Terlalu banyak percobaan. Tunggu beberapa saat.');
                }

                const data = await res.json();

                if(data.success) {
                    btn.innerHTML = '<i class="fas fa-check"></i><span>Berhasil!</span>';
                    btn.classList.remove('bg-[#2e1065]', 'hover:bg-purple-900', 'border-purple-700');
                    btn.classList.add('bg-green-600', 'border-green-500');
                    
                    msg.innerText = "Mengalihkan ke Dardcor AI...";
                    msg.classList.remove('text-red-400', 'hidden');
                    msg.classList.add('text-green-400', 'mt-2', 'block');
                    
                    setTimeout(() => {
                        window.location.replace(data.redirectUrl || '/dardcorchat/dardcor-ai');
                    }, 1000);
                } else {
                    throw new Error(data.message || 'Kode OTP salah atau kadaluarsa.');
                }
            } catch (err) {
                msg.innerText = err.message;
                msg.classList.remove('hidden', 'text-green-400');
                msg.classList.add('text-red-400', 'mt-2', 'block');
                
                btn.disabled = false;
                btn.innerHTML = originalBtnContent;
                btn.classList.remove('bg-green-600', 'border-green-500');
                btn.classList.add('bg-[#2e1065]', 'border-purple-700');
            }
        });
    }
});