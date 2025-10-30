// utils/cookieUtils.js
export const cookieUtils = {
  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  },

  setCookie(name, value, days = 7) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax; Secure`;
  },

  deleteCookie(name) {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  },

  // Check if cookies are enabled
  areCookiesEnabled() {
    try {
      this.setCookie('test-cookie', 'test');
      const enabled = this.getCookie('test-cookie') === 'test';
      this.deleteCookie('test-cookie');
      return enabled;
    } catch (e) {
      return false;
    }
  }
};