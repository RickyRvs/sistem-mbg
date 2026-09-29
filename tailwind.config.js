import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.{js,jsx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Outfit', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                navy: { DEFAULT: '#0A1F4A', 700: '#132a5e', 800: '#0d2555', 900: '#071636' },
                gold: { DEFAULT: '#CFAE6A', light: '#e3cc9b', dark: '#b8944d' },
            },
        },
    },
    plugins: [forms],
};