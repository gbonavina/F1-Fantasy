export const getUserData = () => {
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return undefined;
    }
    
    const userId = getCookie('userId');
    const userUsername = getCookie('userUsername');
        
    return {
        id: userId || '',
        username: userUsername || ''
    };
};

export const getUserId = () => {
    return getUserData().id;
};

export const isLoggedIn = () => {
    const id = getUserData().id;
    return !!id && id !== 'undefined'; 
};

export const logout = () => {
    document.cookie = "userId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "userUsername=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
};