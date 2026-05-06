const cancelDeletion = document.querySelector('.alert-cancel')
const deleteWindow = document.querySelector('.delete')
const ntfnTrigger = document.querySelector('.delete-btn')
const ntfn = document.querySelector('.triggeralert')
const deleteBtn = document.querySelector('.alert-delete')
const filterMonth = document.querySelector('#filterMonth')
const filterYear = document.querySelector('#filterYear')
const allMonths = document.querySelector('#months-content')
const submitNew = document.querySelector('.submit-new')
const input = document.querySelector('#fileInput')
const uploadImg = document.querySelector('.upload-icon')
const fgPwBtn = document.querySelector('.forgot-pw')
const loginForm = document.querySelector('.login-form')
const loginBtn = document.querySelector('.login-btn')
const forgotPwForm = document.querySelector('.forgot-pw-f')

const path = window.location.pathname

if (path === '/portal/login') {
    console.log(path)
    fgPwBtn.addEventListener('click', (e) => {
        const visFgPw = document.querySelector('.hide-fg-pw')
        visFgPw.classList.toggle('vis-fg-pw')
    });

    loginBtn.addEventListener('click', (e) => {
        validateForm()
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        const pw = loginForm.password.value
        const username = loginForm.username.value
        const errPwUsern = document.getElementById('incorrect')
        try {
           const login = await axios.post('/portal/login', 
            {username: username, password: pw}, 
            {headers: 
                {'Content-Type': 'application/x-www-form-urlencoded'}});
            console.log(login)
            if (login.status === 204) {
                window.location.pathname = '/portal/agenda'
            }
        } catch (err) {
            if (err.status === 401) {
                errPwUsern.style.display = 'block'
            } else {
                console.log(err)
            }
        }
    });

    forgotPwForm.addEventListener('submit', async (e) => {
        console.log('submittteeedddd')
        e.preventDefault()
        const email = forgotPwForm.email.value
        const notFound = document.getElementById('notfound')
        const forgotPwBtn = document.querySelector('.forgot-pw-b')

        let errPwUsern = document.getElementById('incorrect')
        try {
            const reset = await axios.post('/portal/forgotpassword', 
                {email: email}, 
                {headers: {'Content-Type': 'application/x-www-form-urlencoded'}});
            if (reset.status === 204) {
                notFound.style.display = 'none'
                forgotPwBtn.style.backgroundColor = 'green'
                setTimeout(() => {
                    window.location.pathname = '/portal/login'
                }, 1500)
            }
        } catch (err) {
            if (err.status === 401) {
                if (errPwUsern.style.display === 'block') {
                    errPwUsern.style.display = 'none'
                }
                notFound.style.display = 'block'
            }
        }
    });
}

if (path === '/portal/agenda') {

    let month, year;

    async function filter (m, y) {
        try {
            const {data} =  await axios.get(`/portal/agenda/filter?m=${m}&y=${y}`)
            console.log(data)
            allMonths.innerHTML = data
        } catch (err) {
            console.log(err)
        }
    };

    filterMonth.addEventListener('change', async (e) => {
        month = e.target.value
        filter(month, year)
    });

    filterYear.addEventListener('change', async (e) => {
        year = e.target.value
        filter(month, year)
    });
};

if (path === '/portal/agenda/new') {
    submitNew.addEventListener('click', (e) => {
        validateForm()
    });

    input.addEventListener('change', (e) => {
        const isUploaded = document.querySelector('.file-input')
        if (input.validity.valueMissing === false) {
            isUploaded.textContent = 'Foto geupload!'
            isUploaded.style.color = 'green'
        }
    });
};

const itemId = deleteBtn.getAttribute('data-id')

if (path === `/portal/agenda/${itemId}`) {
    ntfnTrigger.addEventListener('click', (e) => {
        const classes = deleteWindow.classList
        if (classes.contains('cancelalert')) {
            classes.replace('cancelalert', 'triggeralert')
        } 
        else deleteWindow.classList.add('triggeralert')   
    });

    cancelDeletion.addEventListener('click', (e) => {
        deleteWindow.classList.replace('triggeralert', 'cancelalert' )
    });

    deleteBtn.addEventListener('click', async (e) => {
        e.preventDefault()
        try {
            await axios.delete(`/portal/agenda/${itemId}`)
            window.location.href = '/portal/agenda'
        } catch (err) {
            console.log(err)
        }
    });
};

function validateForm () {
    const vldteFields = document.querySelectorAll('[required]')
    vldteFields.forEach((i) => {
        const validityState = i.validity
        if (validityState.valueMissing) {
            i.setCustomValidity("Veld is niet ingevuld")
            if (i.type == "file" && uploadImg) {
                uploadImg.classList.add('not-uploaded')
            }
        } else {
        i.setCustomValidity("")
        if (uploadImg) {
            uploadImg.classList.remove('not-uploaded')
        }
        return
        }
    })
}








