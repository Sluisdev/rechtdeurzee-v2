// Scroll behavior about us button\\

const overOnsNav = document.getElementById('about-us')
const overOnsSection = document.getElementById('about-section')

overOnsNav.addEventListener('click', () => {
    overOnsSection.scrollIntoView({ behavior: "smooth"})
})

// Mobile navigation toggle

const toggle = document.querySelector(".hamburger-menu");
const mobileMenu = document.querySelector(".nav-mobile");
const body = document.querySelector('#agenda-page');
const page = document.querySelector(".intro-events")



toggle.addEventListener("click", (event) => {
    mobileMenu.classList.toggle('show')
    event.stopPropagation()
    // const removeMenu = mobileMenu.classList.contains('show')
})

document.addEventListener("click", (e) => {
    if (mobileMenu.classList.contains("show") && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove("show");
    }
});

// Mobile nav menu is closed at 50% visibility when scrolling down\\
const ob = new IntersectionObserver((entries) => {
    if (entries[0].intersectionRatio <= 0.5) { //if statement is executed when less or equal to 50% is visible. 
        mobileMenu.classList.remove("show")
    }
    // console.log(entry)
},{
    threshold: 0.5 //function runs at 50% of target element
})
ob.observe(mobileMenu)


// To highlight which page the visitor is on\\
const currentLocation = window.location.pathname
const hrefHome = "https://rechtdeurzee.nl/"
const navContact = document.querySelector(".contact")
const navHome = document.querySelector(".home")
const navAgenda = document.querySelector(".agenda")
const repetoire = document.querySelector(".repertoire")

if ( currentLocation.includes("/contact")) {
    navContact.classList.add("NavColor")
}

else if (currentLocation.includes("/agenda") ) {
    navAgenda.classList.add("agendaColor")
}

else if (currentLocation.includes("/home") || window.location.href == hrefHome ) {
    navHome.classList.add("NavColor")
}

else if (currentLocation.includes("/repertoire")) {
    repetoire.classList.add("NavColor")
}


// AGENDA Page ----------------------------------------------------------------------- \\
console.log(window.location.pathname)

if (window.location.pathname === '/agenda' ) {
    const buttons = document.querySelectorAll('.month-button');
    const monthSections = document.querySelectorAll('.events');

for (let b of buttons) {
    const buttonValue = b.attributes[1].nodeValue
    let section
    for (let m of monthSections) {
        if (buttonValue === m.attributes[1].nodeValue) {
            section = m
        }
    }
    b.addEventListener('click', () => {
        section.scrollIntoView({ behavior: "smooth"})
    })
};

}

// Musicians image slider
const arrowLeft = document.querySelector('.left')
const arrowRight = document.querySelector('.right')
const musicianDivs = document.querySelector('.img-box');
const musiciansContainer = document.querySelector('#musicians')
const sliderContainer = document.querySelector('#musician-images')
const windowLocation = window.location.pathname
let indexDiv = 0;
let marginLeft = 20;

if (windowLocation.includes('/home') || windowLocation === '/') { /* code is only run on specific html page*/

    if (window.innerWidth > 499) {
        marginLeft = 10
        console.log('CHANGED MARGIN TO 10', marginLeft)
    }

    else if (window.innerWidth < 500) {
        marginLeft = 20
        console.log('CHANGED MARGIN TO 20', marginLeft)
    }

    else if ( window.innerWidth >= 768) {
        sliderContainer.style.transform = ''
    }



arrowRight.addEventListener('click', () => {
    if ( indexDiv == 5) {
        console.log('CANCELLED FUNCTION')
        return
    }
    
    indexDiv++
    const gap = 30
    const musicianDivWidth = parseInt(musicianDivs.offsetWidth) + gap/* plus gap in px */
    const musiciansContainerWidth = parseInt(musiciansContainer.clientWidth)
    let elementDistance = 
        /* first part calculates the div that needs to be moved to based on the index number*/
        indexDiv * musicianDivWidth  -
        /* second part calculates the space that goes on both sides for the div to be centered*/
        (musiciansContainerWidth - musicianDivWidth) /2
    let translateValue = -(elementDistance / musiciansContainerWidth) * 100 - marginLeft
    sliderContainer.style.transform = `translateX(${translateValue}%)`
    
    console.log('ARROW RIGHT:',translateValue, indexDiv, musiciansContainerWidth, marginLeft, musicianDivWidth)
})

arrowLeft.addEventListener('click', () => {
     if ( indexDiv == 0) {
        console.log('CANCELLED FUNCTION')
        return
    }
    indexDiv--
    const gap = 30
    const musicianDivWidth = parseInt(musicianDivs.offsetWidth) + gap/* plus gap in px */
    const musiciansContainerWidth = parseInt(musiciansContainer.clientWidth)   
    let elementDistance = 
        /* first part calculates the div that needs to be moved to based on the index number*/
        indexDiv * musicianDivWidth -
        /* second part calculates the space that goes on both sides for the div to be centered*/
        (musiciansContainerWidth - musicianDivWidth) /2
    let translateValue = -(elementDistance / musiciansContainerWidth) * 100 - marginLeft
    sliderContainer.style.transform = `translateX(${translateValue}%)`
    console.log('ARROW LEFT:',translateValue, indexDiv)
})
}

// cloning and adding all the logo imgs for the sponsor slider on the home page\\
const slider = document.querySelector(".logo-slider");
const track = document.querySelector(".logo-track");
const logos = Array.from(track.children);

for ( let i = 1; i <= 7; i++) {
    logos.forEach((logo) => {
    const clone = logo.cloneNode(true);
    track.appendChild(clone);
});
}


