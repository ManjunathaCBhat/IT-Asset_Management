// validation.js

// Validate model/brand (required, not empty)
export function validateModel(_, value) {
    if (!value || value.trim() === '') {
        return Promise.reject('Please enter model/brand!');
    }
    return Promise.resolve();
}

// Validate serial number (required, min 5 chars, alphanumeric + hyphen/_)
export function validateSerialNumber(_, value) {
    if (!value || value.trim() === '') {
        return Promise.reject('Please enter serial number!');
    }
    if (value.length < 5 || !/^[A-Za-z0-9_-]+$/.test(value)) {
        // Removed unnecessary escape before hyphen
        return Promise.reject('Serial number must be at least 5 characters and alphanumeric');
    }
    return Promise.resolve();
}

// Validate email (required, basic pattern)
export function validateEmail(_, value) {
    if (!value) return Promise.reject('Please enter employee email');
    // Basic email regex (you can upgrade as needed)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return Promise.reject('Invalid email format');
    }
    return Promise.resolve();
}

// Validate phone number (required, 8-15 digits)
export function validatePhoneNumber(_, value) {
    if (!value) return Promise.reject('Please enter phone number');
    if (!/^\d{8,15}$/.test(value)) {
        return Promise.reject('Invalid phone number');
    }
    return Promise.resolve();
}

// Validate search term (returns boolean, use for search input filtering)
export function validateSearchTerm(value) {
    // No special characters except space or hyphen
    return (!value || /^[a-zA-Z0-9\s-]*$/.test(value));
}

// Validate search text (same as above, used in other components)
export function validateSearchText(value) {
    return (!value || /^[a-zA-Z0-9\s-]*$/.test(value));
}
