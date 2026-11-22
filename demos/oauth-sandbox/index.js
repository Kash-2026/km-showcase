class BrowserOAuthTokenService {
    constructor(ttl = 3600) {
        this.tokens = new Map();
        this.defaultTtl = ttl;
    }

    issueToken(clientId, scope) {
        const token = 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        const record = {
            token: token,
            client_id: clientId,
            scope: scope,
            expires_in: this.defaultTtl,
            issued_at: Date.now()
        };
        this.tokens.set(token, record);
        return {
            token: token,
            client_id: clientId,
            scope: scope,
            expires_in: this.defaultTtl
        };
    }

    validateToken(bearerToken) {
        const record = this.tokens.get(bearerToken);
        if (!record) {
            return { error: 'invalid' };
        }
        const elapsedSec = (Date.now() - record.issued_at) / 1000;
        if (elapsedSec > record.expires_in) {
            this.tokens.delete(bearerToken);
            return { error: 'invalid' };
        }
        return {
            token: record.token,
            client_id: record.client_id,
            scope: record.scope,
            expires_in: Math.max(0, Math.floor(record.expires_in - elapsedSec))
        };
    }

    refreshToken(bearerToken) {
        const current = this.validateToken(bearerToken);
        if (current.error) {
            return { error: 'invalid' };
        }
        this.tokens.delete(bearerToken);
        return this.issueToken(current.client_id, current.scope);
    }
}

const service = new BrowserOAuthTokenService();

const clientIdInput = document.getElementById('clientId');
const scopeInput = document.getElementById('scope');
const bearerTokenInput = document.getElementById('bearerToken');
const outputPre = document.getElementById('output');

document.getElementById('btnIssue').addEventListener('click', () => {
    const res = service.issueToken(clientIdInput.value, scopeInput.value);
    bearerTokenInput.value = res.token;
    outputPre.textContent = JSON.stringify(res, null, 2);
});

document.getElementById('btnValidate').addEventListener('click', () => {
    const res = service.validateToken(bearerTokenInput.value);
    outputPre.textContent = JSON.stringify(res, null, 2);
});

document.getElementById('btnRefresh').addEventListener('click', () => {
    const res = service.refreshToken(bearerTokenInput.value);
    if (!res.error) {
        bearerTokenInput.value = res.token;
    }
    outputPre.textContent = JSON.stringify(res, null, 2);
});