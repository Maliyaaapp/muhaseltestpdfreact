// Debug: Test if script is loading
console.log('Landing page script loaded successfully');

document.addEventListener('DOMContentLoaded', function() {
    // Debug: Log when DOM is loaded
    console.log('DOM fully loaded');
    
    // Screenshot slider functionality
    const slider = document.querySelector('.screenshot-slider');
    const slides = document.querySelectorAll('.screenshot');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    // Debug: Log slider elements
    console.log('Slider elements:', {
        slider: slider ? 'Found' : 'Not found',
        slides: slides.length + ' found',
        dots: dots.length + ' found',
        prevBtn: prevBtn ? 'Found' : 'Not found',
        nextBtn: nextBtn ? 'Found' : 'Not found'
    });
    
    let currentIndex = 0;
    let slideInterval;

    // Only initialize if elements exist
    if (slider && slides.length > 0) {
        console.log('Initializing slider');
        
        // Set up initial state
        updateActiveSlide();
        
        // Set up event listeners
        if (prevBtn) {
            console.log('Adding prev button listener');
            prevBtn.addEventListener('click', function(e) {
                console.log('Prev button clicked');
                e.preventDefault();
                goToPrevSlide();
                resetInterval();
            });
        }
        
        if (nextBtn) {
            console.log('Adding next button listener');
            nextBtn.addEventListener('click', function(e) {
                console.log('Next button clicked');
                e.preventDefault();
                goToNextSlide();
                resetInterval();
            });
        }
        
        // Set up dot navigation
        if (dots.length > 0) {
            dots.forEach((dot, index) => {
                dot.addEventListener('click', function() {
                    currentIndex = index;
                    updateActiveSlide();
                    resetInterval();
                });
            });
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft') {
                goToPrevSlide();
                resetInterval();
            } else if (e.key === 'ArrowRight') {
                goToNextSlide();
                resetInterval();
            }
        });
        
        // Start auto-rotation
        startInterval();
        
        // Pause on hover
        slider.addEventListener('mouseenter', function() {
            clearInterval(slideInterval);
        });
        
        slider.addEventListener('mouseleave', function() {
            startInterval();
        });
    }
    
    // Helper functions
    function updateActiveSlide() {
        // Update slider position
        if (slides.length > 0) {
            const slideWidth = slides[0].offsetWidth;
            const gap = 20; // Match the CSS gap
            slider.scrollTo({
                left: currentIndex * (slideWidth + gap),
                behavior: 'smooth'
            });
            
            // Update dots
            dots.forEach((dot, index) => {
                if (index === currentIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }
    }
    
    function goToNextSlide() {
        if (currentIndex < slides.length - 1) {
            currentIndex++;
        } else {
            currentIndex = 0;
        }
        updateActiveSlide();
    }
    
    function goToPrevSlide() {
        if (currentIndex > 0) {
            currentIndex--;
        } else {
            currentIndex = slides.length - 1;
        }
        updateActiveSlide();
    }
    
    function startInterval() {
        slideInterval = setInterval(goToNextSlide, 5000);
    }
    
    function resetInterval() {
        clearInterval(slideInterval);
        startInterval();
    }

    // Language toggle functionality
    const langEnBtn = document.getElementById('lang-en');
    const langArBtn = document.getElementById('lang-ar');
    let currentLang = localStorage.getItem('preferred_language') || 'en';

    // Apply saved language preference on page load
    setLanguage(currentLang);
    if (currentLang === 'ar') {
        langArBtn.classList.add('active');
        langEnBtn.classList.remove('active');
    } else {
        langEnBtn.classList.add('active');
        langArBtn.classList.remove('active');
    }

    if (langEnBtn && langArBtn) {
        langEnBtn.addEventListener('click', () => {
            setLanguage('en');
            langEnBtn.classList.add('active');
            langArBtn.classList.remove('active');
            localStorage.setItem('preferred_language', 'en');
        });

        langArBtn.addEventListener('click', () => {
            setLanguage('ar');
            langArBtn.classList.add('active');
            langEnBtn.classList.remove('active');
            localStorage.setItem('preferred_language', 'ar');
        });
    }

    // Set language function to update all text content
    function setLanguage(lang) {
        if (!translations || !translations[lang]) {
            console.error(`Translations not found for language: ${lang}`);
            return;
        }

        // Set HTML direction and language attributes
        if (lang === 'ar') {
            document.body.setAttribute('dir', 'rtl');
            document.documentElement.lang = 'ar';
            document.body.classList.add('rtl');
        } else {
            document.body.setAttribute('dir', 'ltr');
            document.documentElement.lang = 'en';
            document.body.classList.remove('rtl');
        }

        try {
            // Update navigation links
            const featuresLink = document.querySelector('nav ul li a[href="#features"]');
            const downloadLink = document.querySelector('nav ul li a[href="#download"]');
            const contactLink = document.querySelector('nav ul li a[href="#contact"]');
            
            if (featuresLink) featuresLink.textContent = translations[lang].features;
            if (downloadLink) downloadLink.textContent = translations[lang].download;
            if (contactLink) contactLink.textContent = translations[lang].contact;

            // Update hero section
            const heroTitle = document.querySelector('.hero-text h1');
            const heroDesc = document.querySelector('.hero-text p');
            if (heroTitle) heroTitle.textContent = translations[lang].hero_title;
            if (heroDesc) heroDesc.textContent = translations[lang].hero_description;
            
            updateButtonText('.cta-buttons .btn-primary', translations[lang].download_now);
            updateButtonText('.cta-buttons .btn-secondary', translations[lang].learn_more);

            // Update features section
            const featuresHeading = document.querySelector('#features h2');
            if (featuresHeading) featuresHeading.textContent = translations[lang].key_features;
            
            const featureCards = document.querySelectorAll('.feature-card');
            if (featureCards.length >= 6) {
                if (featureCards[0].querySelector('h3')) featureCards[0].querySelector('h3').textContent = translations[lang].financial_management;
                if (featureCards[0].querySelector('p')) featureCards[0].querySelector('p').textContent = translations[lang].financial_description;
                
                if (featureCards[1].querySelector('h3')) featureCards[1].querySelector('h3').textContent = translations[lang].student_records;
                if (featureCards[1].querySelector('p')) featureCards[1].querySelector('p').textContent = translations[lang].student_description;
                
                if (featureCards[2].querySelector('h3')) featureCards[2].querySelector('h3').textContent = translations[lang].professional_receipts;
                if (featureCards[2].querySelector('p')) featureCards[2].querySelector('p').textContent = translations[lang].receipts_description;
                
                if (featureCards[3].querySelector('h3')) featureCards[3].querySelector('h3').textContent = translations[lang].reports_analytics;
                if (featureCards[3].querySelector('p')) featureCards[3].querySelector('p').textContent = translations[lang].reports_description;
                
                if (featureCards[4].querySelector('h3')) featureCards[4].querySelector('h3').textContent = translations[lang].installment_planning;
                if (featureCards[4].querySelector('p')) featureCards[4].querySelector('p').textContent = translations[lang].installment_description;
                
                if (featureCards[5].querySelector('h3')) featureCards[5].querySelector('h3').textContent = translations[lang].works_offline;
                if (featureCards[5].querySelector('p')) featureCards[5].querySelector('p').textContent = translations[lang].offline_description;
            }

            // Update download section
            const downloadHeading = document.querySelector('#download h2');
            const downloadSubtitle = document.querySelector('#download > .container > p');
            
            if (downloadHeading) downloadHeading.textContent = translations[lang].download_muhasel;
            if (downloadSubtitle) downloadSubtitle.textContent = translations[lang].download_subtitle;
            
            const downloadCards = document.querySelectorAll('.download-card');
            if (downloadCards.length >= 3) {
                if (downloadCards[0].querySelector('p')) downloadCards[0].querySelector('p').textContent = translations[lang].for_windows;
                if (downloadCards[0].querySelector('.btn-download')) downloadCards[0].querySelector('.btn-download').textContent = translations[lang].download_windows;
                
                if (downloadCards[1].querySelector('p')) downloadCards[1].querySelector('p').textContent = translations[lang].for_macos;
                if (downloadCards[1].querySelector('.btn-download')) downloadCards[1].querySelector('.btn-download').textContent = translations[lang].download_mac;
                
                if (downloadCards[2].querySelector('p')) downloadCards[2].querySelector('p').textContent = translations[lang].for_linux;
                if (downloadCards[2].querySelector('.btn-download')) downloadCards[2].querySelector('.btn-download').textContent = translations[lang].download_linux;
            }

            // Update screenshots section
            const screenshotsHeading = document.querySelector('.screenshots h2');
            if (screenshotsHeading) screenshotsHeading.textContent = translations[lang].see_in_action;
            
            const screenshots = document.querySelectorAll('.screenshot');
            if (screenshots.length >= 4) {
                if (screenshots[0].querySelector('p')) screenshots[0].querySelector('p').textContent = translations[lang].intuitive_dashboard;
                if (screenshots[1].querySelector('p')) screenshots[1].querySelector('p').textContent = translations[lang].student_management;
                if (screenshots[2].querySelector('p')) screenshots[2].querySelector('p').textContent = translations[lang].receipts_screenshot;
                if (screenshots[3].querySelector('p')) screenshots[3].querySelector('p').textContent = translations[lang].comprehensive_reports;
            }

            // Update contact section
            const contactHeading = document.querySelector('#contact h2');
            if (contactHeading) contactHeading.textContent = translations[lang].get_in_touch;
            
            const nameLabel = document.querySelector('label[for="name"]');
            const emailLabel = document.querySelector('label[for="email"]');
            const messageLabel = document.querySelector('label[for="message"]');
            const sendButton = document.querySelector('#contact-form button');
            
            if (nameLabel) nameLabel.textContent = translations[lang].name;
            if (emailLabel) emailLabel.textContent = translations[lang].email;
            if (messageLabel) messageLabel.textContent = translations[lang].message;
            if (sendButton) sendButton.textContent = translations[lang].send_message;

            // Update footer
            const quickLinksHeading = document.querySelector('.footer-links h4');
            if (quickLinksHeading) quickLinksHeading.textContent = translations[lang].quick_links;
            
            const footerLinks = document.querySelectorAll('.footer-links li a');
            if (footerLinks.length >= 5) {
                if (footerLinks[0]) footerLinks[0].textContent = translations[lang].features;
                if (footerLinks[1]) footerLinks[1].textContent = translations[lang].download;
                if (footerLinks[2]) footerLinks[2].textContent = translations[lang].contact;
                if (footerLinks[3]) footerLinks[3].textContent = translations[lang].privacy_policy;
                if (footerLinks[4]) footerLinks[4].textContent = translations[lang].terms_of_service;
            }

            const newsletterHeading = document.querySelector('.footer-newsletter h4');
            const newsletterText = document.querySelector('.footer-newsletter p');
            const newsletterInput = document.querySelector('.footer-newsletter input');
            const newsletterButton = document.querySelector('.footer-newsletter button');
            
            if (newsletterHeading) newsletterHeading.textContent = translations[lang].stay_updated;
            if (newsletterText) newsletterText.textContent = translations[lang].newsletter_text;
            if (newsletterInput) newsletterInput.placeholder = translations[lang].your_email;
            if (newsletterButton) newsletterButton.textContent = translations[lang].subscribe;
            
            const copyright = document.querySelector('.footer-bottom p');
            if (copyright) copyright.textContent = translations[lang].copyright;
            
        } catch (error) {
            console.error('Error updating language:', error);
        }
    }

    // Helper function to update text content of an element
    function updateElementText(id, text) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = text;
        }
    }

    // Helper function to update button text while preserving icons
    function updateButtonText(selector, text) {
        try {
            const button = document.querySelector(selector);
            if (!button) return;
            
            // Save icon if exists
            const icon = button.querySelector('i');
            
            // Update text
            button.textContent = text;
            
            // Re-add icon if it existed
            if (icon) {
                button.prepend(icon);
            }
        } catch (error) {
            console.error(`Error updating button text for ${selector}:`, error);
        }
    }

    // Form submission handling
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(contactForm);
            const formDataObj = Object.fromEntries(formData.entries());
            
            // In a real application, you would send this data to your server
            console.log('Form submitted:', formDataObj);
            
            // Show success message in the current language
            const lang = document.documentElement.lang || 'en';
            alert(translations[lang].thank_you_message);
            
            // Reset form
            contactForm.reset();
        });
    }

    // Newsletter form handling
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = newsletterForm.querySelector('input[type="email"]').value;
            
            // In a real application, you would send this to your server
            console.log('Newsletter subscription:', email);
            
            // Show success message in the current language
            const lang = document.documentElement.lang || 'en';
            alert(translations[lang].thank_you_subscribe);
            
            // Reset form
            newsletterForm.reset();
        });
    }

    // Download tracking
    const downloadButtons = document.querySelectorAll('.btn-download');
    downloadButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const platform = this.closest('.download-card').querySelector('h3').textContent;
            console.log(`Download initiated for ${platform}`);
            
            // In a real application, you might want to track downloads
            // analyticsTrack('download', { platform });
        });
    });

    // Create directory structure for downloads
    function checkDownloadDirectory() {
        // This would typically be handled server-side
        console.log('Ensuring download directory exists');
    }

    // Check if running in Electron
    function isElectron() {
        return navigator.userAgent.indexOf('Electron') !== -1;
    }

    // Display appropriate platform download button
    function highlightPlatformDownload() {
        const platform = detectPlatform();
        const platformCards = document.querySelectorAll('.download-card');
        
        platformCards.forEach(card => {
            const cardPlatform = card.querySelector('h3').textContent.toLowerCase();
            if (cardPlatform.includes(platform)) {
                card.style.transform = 'scale(1.05)';
                card.style.boxShadow = 'var(--shadow-lg)';
                
                // Scroll to this card
                setTimeout(() => {
                    const downloadSection = document.getElementById('download');
                    if (downloadSection) {
                        downloadSection.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 1500);
            }
        });
    }

    // Detect user's platform
    function detectPlatform() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (userAgent.indexOf('win') !== -1) return 'windows';
        if (userAgent.indexOf('mac') !== -1) return 'macos';
        if (userAgent.indexOf('linux') !== -1) return 'linux';
        
        return 'windows'; // Default
    }

    // Highlight the appropriate download button based on user's platform
    setTimeout(highlightPlatformDownload, 1000);
}); 