document.addEventListener('DOMContentLoaded', function() {
    // Set today's date as the minimum and default value for the date input field
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    dateInput.setAttribute('min', today);
    dateInput.setAttribute('value', today);
});

document.getElementById('depositForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevents the default form submission

    const form = event.target;
    const amountInNumbers = parseFloat(form.amountInNumbers.value);
    const totalAmount = parseFloat(form.totalAmount.value);
    const accountNumber = form.accountNumber.value.trim();
    const panNumber = form.panNumber.value.trim();
    const amountInWords = form.amountInWords.value.trim();
    const date = new Date(form.date.value);
    const today = new Date();

    // Basic validation
    if (isNaN(amountInNumbers) || isNaN(totalAmount)) {
        alert('Amount fields must be valid numbers.');
        return;
    }

    if (amountInNumbers <= 0 || totalAmount <= 0) {
        alert('Amount fields must be greater than zero.');
        return;
    }

    if (amountInNumbers !== totalAmount) {
        alert('Amount in Numbers and Total Amount must match.');
        return;
    }

    // Validate Denominations (should be either 100 or 500)
    const denomination = parseInt(form.denominations.value, 10);
    if (denomination !== 100 && denomination !== 500) {
        alert('Please enter a valid denomination (100 or 500 only).');
        return;
    }

    if (!/^[a-zA-Z0-9]{10,12}$/.test(accountNumber)) {
        alert('Account Number must be alphanumeric and 10 to 12 characters long.');
        return;
    }

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber)) {
        alert('PAN Number must be in the format ABCDE1234F.');
        return;
    }

    if (!isNaN(amountInWords)) {
        alert('Amount in Words must not be an integer.');
        return;
    }

    if (date.toISOString().split('T')[0] !== today.toISOString().split('T')[0]) {
        alert('Date must be today.');
        return;
    }

    const ifsc = form.ifsc.value.trim();
    const ifscPattern = /^[A-Z]{4}[0-9]{7}$/;
    if (!ifscPattern.test(ifsc)) {
        alert('Please enter a valid IFSC code (e.g., ABCD0123456).');
        return;
    }

    const mobileNumber = form.mobileNumber.value.trim();
    const mobilePattern = /^(?:\+?\d{1,3})?\d{10}$/; // Matches 10 digits, optionally prefixed with a country code
    if (!mobilePattern.test(mobileNumber)) {
        alert('Please enter a valid mobile number (10 digits, with optional country code).');
        return;
    }

    // If all validations pass, submit the form
    alert('Form submitted successfully!');
    
    // Redirect to Submission.html after a delay (optional)
    setTimeout(() => {
        window.location.href = 'Submission.html'; // Redirect to Submission.html
    }, 1000); // Delay for 1 second (1000 milliseconds)

    // Convert form data to URLSearchParams
    const formData = new URLSearchParams(new FormData(this)).toString();
    console.log('Form Data:', formData);

    fetch('/api/deposit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Deposit received') {
            // Uncomment the below line if you want to redirect only after a successful API response
            // window.location.href = 'Submission.html'; // Redirect to Submission.html
            form.reset(); // Clear form fields
            console.log("Form has been reset");
        } else {
            alert('Submission failed: ' + (data.message || 'Unknown error'));
        }
        console.log(data);
    })
    .catch(error => {
        alert('Error submitting deposit');
        console.error('Error:', error);
    });
});
