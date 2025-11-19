// Common CSS class combinations
export const CLASSES = {
    // Gradients
    gradientPrimary: 'bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600',
    gradientPrimaryHover: 'hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700',
    gradientSecondary: 'bg-gradient-to-r from-blue-500 to-indigo-600',
    gradientSuccess: 'bg-gradient-to-r from-green-500 to-emerald-600',
    gradientDanger: 'bg-gradient-to-r from-red-500 to-pink-600',
    gradientIndigo: 'bg-gradient-to-r from-indigo-500 to-purple-600',
    
    // Backgrounds
    glassBg: 'bg-white/80 backdrop-blur-xl',
    glassBgDark: 'bg-white/95 backdrop-blur-xl',
    
    // Shadows
    shadowLg: 'shadow-lg',
    shadowXl: 'shadow-xl',
    shadow2xl: 'shadow-2xl',
    
    // Transitions
    transitionAll: 'transition-all duration-300',
    transitionColors: 'transition-colors duration-200',
    
    // Transforms
    hoverScale: 'transform hover:scale-105',
    hoverScale110: 'transform hover:scale-110',
};

// Icon gradients
export const ICON_GRADIENTS = {
    primary: 'from-blue-500 to-indigo-600',
    success: 'from-green-500 to-emerald-600',
    indigo: 'from-indigo-500 to-purple-600',
    purple: 'from-purple-500 to-pink-600',
};

// Bucket name validation regex
export const BUCKET_NAME_REGEX = /^[a-z0-9.-]{3,63}$/;

