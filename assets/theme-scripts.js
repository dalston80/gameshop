addEventListener('DOMContentLoaded', () => {
    const mobileMenu = document.querySelector('#mobile-menu')
    const mobileMenuBtn = document.querySelector('.gs-store-header .menu-btn')
    const mobileMenuCloseBtn = document.querySelector('.gs-store-header .btn-close')
    const mobileSearchForm = document.querySelector('.gs-store-header .mobile-search-form')
    const mobileSearchBtn = document.querySelector('.gs-store-header .cart-search .search')
    const mobileMenuLinks = document.querySelectorAll('.gs-store-header .mobile-menu .mobile-menu-link')
    
    mobileMenuBtn.addEventListener('click', (e) => {
        e.preventDefault()
        // let btnIcon = e.currentTarget.querySelector('i')

        // if (btnIcon.classList.contains('fa-bars')) {
        //     btnIcon.classList.add('fa-times')
        //     btnIcon.classList.remove('fa-bars')
        // } else {
        //     btnIcon.classList.add('fa-bars')
        //     btnIcon.classList.remove('fa-times')
        //}

        mobileMenu.classList.toggle('show-mobile-menu')
    })

    mobileMenuCloseBtn.addEventListener('click', (e) => {
        e.preventDefault()
        mobileMenu.classList.remove('show-mobile-menu')
    })

    mobileSearchBtn.addEventListener('click', (e) => {
        e.preventDefault()
        mobileSearchForm.classList.toggle('show-mobile-search')
    })

    mobileMenuLinks.forEach(linkContainer => {
        const btnToggleSubMenu = linkContainer.querySelector('.btn-toggle-sub-menu')
        const subMenu = linkContainer.nextElementSibling

        if (btnToggleSubMenu) {
            btnToggleSubMenu.addEventListener('click', (e) => {
                e.preventDefault()
                if (subMenu) {
                    subMenu.classList.toggle('show-sub-menu')
                }
            })
        }

        
    })

    
})

class Slideshow {
    constructor() {
        this.slider = document.querySelector('#gs-image-slider');
        this.slides = this.slider.querySelector('.slides');
        this.slideElements = this.slider.querySelectorAll('.slide');
        this.nextBtn = this.slider.querySelector('.slider-next');
        this.prevBtn = this.slider.querySelector('.slider-previous');
        this.indicatorBtns = this.slider.querySelectorAll('.btn-slider');
        this.currentSlide = 0;
        this.slideCount = this.slideElements.length;
        
        this.init();
    }

    init() {
        // Add event listeners
        this.nextBtn.addEventListener('click', () => this.moveSlide('next'));
        this.prevBtn.addEventListener('click', () => this.moveSlide('prev'));
        
        // Add click events to indicator buttons
        this.indicatorBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.slideIndex);
                this.goToSlide(index);
            });
        });

        // Set initial position
        this.updateSlidePosition();
    }

    moveSlide(direction) {
        if (direction === 'next') {
            this.currentSlide = (this.currentSlide + 1) % this.slideCount;
        } else {
            this.currentSlide = (this.currentSlide - 1 + this.slideCount) % this.slideCount;
        }
        
        this.goToSlide(this.currentSlide);
    }

    goToSlide(index) {
        this.currentSlide = index;
        this.updateSlidePosition();
        this.updateIndicators();
    }

    updateSlidePosition() {
        // Calculate the translation percentage based on slide width
        const slideWidth = 100 / this.slideCount;
        const translation = -(this.currentSlide * slideWidth);
        this.slides.style.transform = `translateX(${translation}%)`;
    }

    updateIndicators() {
        this.indicatorBtns.forEach((btn, index) => {
            if (index === this.currentSlide) {
                btn.classList.add('slide-active');
            } else {
                btn.classList.remove('slide-active');
            }
        });
    }
}

// Initialize the slideshow when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Slideshow();
});
