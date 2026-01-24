document.addEventListener('DOMContentLoaded', () => {
    const typingText = document.getElementById('typing-text');
    const messages = ["Initializing neural pathways...", "Syncing with the core...", "Preparing your experience..."];
    let messageIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    function typeWriter() {
        const currentMessage = messages[messageIndex];
        if (isDeleting) {
            typingText.textContent = currentMessage.substring(0, charIndex - 1);
            charIndex--;
        } else {
            typingText.textContent = currentMessage.substring(0, charIndex + 1);
            charIndex++;
        }
        if (!isDeleting && charIndex === currentMessage.length) {
            isDeleting = true;
            setTimeout(typeWriter, 1500);
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            messageIndex = (messageIndex + 1) % messages.length;
            setTimeout(typeWriter, 500);
        } else {
            setTimeout(typeWriter, isDeleting ? 30 : 50);
        }
    }
    typeWriter();
    setTimeout(() => {
        window.location.replace('/dardcorchat/dardcor-ai');
    }, 4500);
});