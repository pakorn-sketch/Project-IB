const AUTH_API_URL =
"https://script.google.com/macros/s/AKfycbygoGaD3WHdIS7RV3jcC3yER2VLVZb3H_AFjifrXXwYSyeohaZYs5HADcBxoheNzGo/exec";
const GOOGLE_CLIENT_ID = "PASTE_GOOGLE_CLIENT_ID_HERE";
const ALLOWED_EMAIL_DOMAIN = "mrdiy.com";
const AUTH_STORAGE_KEY = "ibPendingAuthSession";

let currentAuthSession = null;
let authResolve = null;

function requireAuth() {
    return new Promise(resolve => {
        authResolve = resolve;
        initAuth();
    });
}

function getAuthToken() {
    return currentAuthSession ? currentAuthSession.idToken : "";
}

function getAuthUserEmail() {
    return currentAuthSession ? currentAuthSession.email : "";
}

function getAuthCacheKeySuffix() {
    const email = getAuthUserEmail();

    return email ? `:${email.toLowerCase()}` : "";
}

function initAuth() {
    renderAuthState();

    const savedSession = readSavedAuthSession();

    if (savedSession && isAllowedEmail(savedSession.email)) {
        currentAuthSession = savedSession;
        showAppForUser(savedSession);
        finishAuth(true);
        return;
    }

    showLogin();
    initGoogleSignIn();
}

function initGoogleSignIn() {
    const button = document.getElementById("googleSignInButton");
    const message = document.getElementById("authMessage");

    if (!button || !message) return;

    if (GOOGLE_CLIENT_ID === "PASTE_GOOGLE_CLIENT_ID_HERE") {
        message.textContent = "กรุณาใส่ Google Client ID ในไฟล์ api/auth.js ก่อนใช้งาน Login";
        return;
    }

    if (!window.google || !google.accounts || !google.accounts.id) {
        message.textContent = "Google Sign-In ยังโหลดไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง";
        return;
    }

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        hosted_domain: ALLOWED_EMAIL_DOMAIN
    });

    google.accounts.id.renderButton(button, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        width: 280
    });
}

async function handleGoogleCredential(response) {
    const message = document.getElementById("authMessage");
    const profile = parseJwt(response.credential);

    if (!profile || !isAllowedEmail(profile.email)) {
        setAuthMessage(`อนุญาตเฉพาะบัญชี @${ALLOWED_EMAIL_DOMAIN} เท่านั้น`, true);
        return;
    }

    setAuthMessage("กำลังตรวจสอบสิทธิ์กับ Server...");

    try {
        const verified = await verifyAuthWithServer(response.credential);

        if (!verified.ok) {
            setAuthMessage(verified.message || "บัญชีนี้ไม่มีสิทธิ์เข้าใช้งาน", true);
            return;
        }

        currentAuthSession = {
            idToken: response.credential,
            email: profile.email,
            name: profile.name || profile.email,
            picture: profile.picture || "",
            signedInAt: Date.now()
        };

        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentAuthSession));
        showAppForUser(currentAuthSession);
        finishAuth(true);
    } catch (error) {
        console.error(error);
        if (message) {
            message.textContent = "ตรวจสอบสิทธิ์กับ Server ไม่สำเร็จ กรุณาลองใหม่";
        }
    }
}

async function verifyAuthWithServer(idToken) {
    const url = new URL(AUTH_API_URL);

    url.searchParams.set("action", "verify");
    url.searchParams.set("idToken", idToken);
    url.searchParams.set("domain", ALLOWED_EMAIL_DOMAIN);

    const response = await fetch(url.toString(), {
        cache: "no-store"
    });

    if (!response.ok) {
        return {
            ok: false,
            message: `Auth server error: ${response.status}`
        };
    }

    const text = await response.text();

    try {
        return JSON.parse(text);
    } catch (error) {
        return {
            ok: false,
            message: "Auth server ยังไม่ได้เปิด action=verify ให้ตอบ JSON"
        };
    }
}

function logout() {
    currentAuthSession = null;
    localStorage.removeItem(AUTH_STORAGE_KEY);

    if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
    }

    location.reload();
}

function readSavedAuthSession() {
    try {
        const rawSession = localStorage.getItem(AUTH_STORAGE_KEY);

        return rawSession ? JSON.parse(rawSession) : null;
    } catch (error) {
        return null;
    }
}

function parseJwt(token) {
    try {
        const payload = token.split(".")[1];
        const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
        const json = decodeURIComponent(
            atob(normalized)
                .split("")
                .map(char => `%${("00" + char.charCodeAt(0).toString(16)).slice(-2)}`)
                .join("")
        );

        return JSON.parse(json);
    } catch (error) {
        return null;
    }
}

function isAllowedEmail(email) {
    return String(email || "").toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

function showLogin() {
    document.body.classList.add("auth-locked");
    document.getElementById("authGate").hidden = false;
    document.querySelector(".layout").setAttribute("aria-hidden", "true");
}

function showAppForUser(session) {
    document.body.classList.remove("auth-locked");
    document.getElementById("authGate").hidden = true;
    document.querySelector(".layout").removeAttribute("aria-hidden");
    updateUserBadge(session);
}

function updateUserBadge(session) {
    const badge = document.getElementById("userBadge");

    if (!badge) return;

    badge.hidden = false;
    badge.querySelector(".user-email").textContent = session.email;
}

function setAuthMessage(message, isError = false) {
    const el = document.getElementById("authMessage");

    if (!el) return;

    el.textContent = message;
    el.classList.toggle("auth-error", isError);
}

function finishAuth(isReady) {
    if (authResolve) {
        authResolve(isReady);
        authResolve = null;
    }
}

function renderAuthState() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", logout);
    }
}
