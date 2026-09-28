import re
from app.services.feature_registry import register_feature


VULNERABILITY_PATTERNS = {
    "sql_injection": [
        {
            "pattern": r"(?:SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE|TRUNCATE)\s+.*?(?:'|\"|\%27|\%22|\{).*?(?:\+|\.|\|\||CONCAT|concat)",
            "severity": "critical",
            "title": "SQL Injection via String Concatenation",
            "cwe": "CWE-89",
            "description": "SQL query built by string concatenation with user input. Allows attackers to inject arbitrary SQL commands.",
            "remediation": "Use parameterized queries (prepared statements) or an ORM. Never concatenate user input into SQL queries.",
        },
        {
            "pattern": r"(?:execute|query|exec|run|sql)\s*\(\s*[\"'].*\s*\+\s*\w+",
            "severity": "critical",
            "title": "Dynamic SQL Execution",
            "cwe": "CWE-89",
            "description": "SQL query executed using string concatenation. User input may be directly embedded.",
            "remediation": "Use parameterized queries instead of string concatenation.",
        },
        {
            "pattern": r"(?:execute|query|exec|run)\s*\(\s*[\"'].*\$\{(?:req|request|params|body|query)",
            "severity": "critical",
            "title": "SQL Injection via Template Literal",
            "cwe": "CWE-89",
            "description": "SQL query built using template literals with request parameters.",
            "remediation": "Use parameterized queries or an ORM.",
        },
        {
            "pattern": r"(?:execute|query|exec)\s*\(\s*[\"'].*\{(?:req|request|params|body|query)",
            "severity": "critical",
            "title": "SQL Injection via Object Property",
            "cwe": "CWE-89",
            "description": "SQL query built with object property interpolation.",
            "remediation": "Use parameterized queries.",
        },
        {
            "pattern": r"(?:ORDER\s+BY|GROUP\s+BY|HAVING|LIMIT|OFFSET)\s+['\"]?\s*(?:\+|\.)",
            "severity": "high",
            "title": "SQL Injection in Clause",
            "cwe": "CWE-89",
            "description": "SQL clause built with user-controlled input.",
            "remediation": "Use allowlists for column names and validated parameters.",
        },
    ],
    "xss": [
        {
            "pattern": r"innerHTML\s*=\s*(?:\$\{|req|params|body|query|document\.(URL|location|referrer))",
            "severity": "critical",
            "title": "XSS via innerHTML Assignment",
            "cwe": "CWE-79",
            "description": "innerHTML assigned with unsanitized data. Allows script injection.",
            "remediation": "Use textContent or innerText. If HTML is needed, sanitize with DOMPurify.",
        },
        {
            "pattern": r"document\.write\s*\(.*(?:req|params|body|query|URL|location)",
            "severity": "critical",
            "title": "XSS via document.write()",
            "cwe": "CWE-79",
            "description": "document.write() called with user-controlled data.",
            "remediation": "Avoid document.write(). Use DOM manipulation methods with sanitization.",
        },
        {
            "pattern": r"outerHTML\s*=",
            "severity": "high",
            "title": "XSS via outerHTML",
            "cwe": "CWE-79",
            "description": "outerHTML property being set, potentially with user input.",
            "remediation": "Sanitize all HTML before assignment.",
        },
        {
            "pattern": r"(?:href|src|action)\s*=\s*[\"']?\s*javascript\s*:",
            "severity": "critical",
            "title": "JavaScript Protocol Injection",
            "cwe": "CWE-79",
            "description": "javascript: protocol found in href/src/action attribute.",
            "remediation": "Validate URLs and disallow javascript: protocol.",
        },
        {
            "pattern": r"(?:v-html|dangerouslySetInnerHTML|__html)",
            "severity": "high",
            "title": "Raw HTML Rendering",
            "cwe": "CWE-79",
            "description": "Framework-specific raw HTML rendering detected.",
            "remediation": "Avoid raw HTML rendering. If required, sanitize input thoroughly.",
        },
        {
            "pattern": r"eval\s*\(.*(?:req|params|body|query|URL|location)",
            "severity": "critical",
            "title": "XSS via eval()",
            "cwe": "CWE-94",
            "description": "eval() called with user-controlled input.",
            "remediation": "Never use eval() with user input. Use JSON.parse() for data parsing.",
        },
        {
            "pattern": r"(?:setTimeout|setInterval)\s*\(\s*[\"'].*\+",
            "severity": "high",
            "title": "XSS via setTimeout/setInterval String",
            "cwe": "CWE-79",
            "description": "setTimeout/setInterval called with concatenated string.",
            "remediation": "Use function callbacks instead of string arguments.",
        },
        {
            "pattern": r"\.insertAdjacentHTML\s*\(",
            "severity": "medium",
            "title": "XSS via insertAdjacentHTML",
            "cwe": "CWE-79",
            "description": "insertAdjacentHTML used with potentially unsanitized input.",
            "remediation": "Sanitize HTML before insertion.",
        },
        {
            "pattern": r"(?:on(?:click|load|error|mouseover|focus|blur|submit|change))\s*=",
            "severity": "medium",
            "title": "Inline Event Handler",
            "cwe": "CWE-79",
            "description": "Inline event handler attribute detected.",
            "remediation": "Use addEventListener() instead of inline handlers.",
        },
    ],
    "command_injection": [
        {
            "pattern": r"(?:exec|execSync|spawn|spawnSync|execFile|child_process)\s*\(.*(?:\+|\`|\$\{|req|params|body|query)",
            "severity": "critical",
            "title": "Command Injection",
            "cwe": "CWE-78",
            "description": "System command execution with user-controlled input.",
            "remediation": "Use parameterized APIs. Avoid shell execution with user input.",
        },
        {
            "pattern": r"(?:system|popen|passthru|shell_exec|proc_open)\s*\(.*(?:\$_(?:GET|POST|REQUEST|SERVER))",
            "severity": "critical",
            "title": "PHP Command Injection",
            "cwe": "CWE-78",
            "description": "PHP command execution with superglobal input.",
            "remediation": "Avoid shell execution functions with user input.",
        },
        {
            "pattern": r"os\.system\s*\(.*(?:\+|\.format|f\")",
            "severity": "critical",
            "title": "Python Command Injection",
            "cwe": "CWE-78",
            "description": "os.system() called with formatted string.",
            "remediation": "Use subprocess.run() with argument lists, not shell=True.",
        },
        {
            "pattern": r"subprocess\.(?:call|run|Popen)\s*\(.*shell\s*=\s*True",
            "severity": "critical",
            "title": "Subprocess Shell Execution",
            "cwe": "CWE-78",
            "description": "subprocess called with shell=True and potential user input.",
            "remediation": "Avoid shell=True. Use argument lists instead.",
        },
    ],
    "path_traversal": [
        {
            "pattern": r"(?:readFileSync|readFile|fs\.|open|include|require|include_once|require_once|fopen|file_get_contents)\s*\(.*(?:\+|\.format|f\"|\$\{).*\.\./",
            "severity": "critical",
            "title": "Path Traversal",
            "cwe": "CWE-22",
            "description": "File path constructed with ../ sequences and user input.",
            "remediation": "Validate and sanitize file paths. Use path.resolve() and check allowed directories.",
        },
        {
            "pattern": r"(?:readFileSync|readFile|open|fopen)\s*\(.*(?:\$_(?:GET|POST|REQUEST)|req\.|params|body|query)",
            "severity": "high",
            "title": "Unrestricted File Access",
            "cwe": "CWE-22",
            "description": "File read operation with user-controlled path.",
            "remediation": "Implement path validation and restrict to allowed directories.",
        },
        {
            "pattern": r"\\.\\.(?:\\|/)",
            "severity": "high",
            "title": "Directory Traversal Sequence",
            "cwe": "CWE-22",
            "description": "../ or ..\\ sequence detected in user input.",
            "remediation": "Block or sanitize path traversal sequences.",
        },
    ],
    "ssrf": [
        {
            "pattern": r"(?:axios|fetch|request|http\.|urllib|requests)\.(?:get|post|put|delete|head)\s*\(.*(?:\+|\.format|f\"|\$\{|req|params|body|query)",
            "severity": "high",
            "title": "Server-Side Request Forgery (SSRF)",
            "cwe": "CWE-918",
            "description": "HTTP request with user-controlled URL.",
            "remediation": "Validate and restrict URLs. Use allowlists for allowed domains.",
        },
        {
            "pattern": r"(?:curl|curl_exec|curl_exec)\s*\(.*(?:\$_(?:GET|POST|REQUEST)|req\.|params|body)",
            "severity": "critical",
            "title": "SSRF via cURL",
            "cwe": "CWE-918",
            "description": "cURL execution with user-controlled URL.",
            "remediation": "Validate URLs and restrict to allowed domains/IPs.",
        },
        {
            "pattern": r"(?:127\.0\.0\.1|localhost|0\.0\.0\.0|169\.254\.169\.254|metadata\.google\.internal|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)",
            "severity": "high",
            "title": "Internal Network Address",
            "cwe": "CWE-918",
            "description": "Internal/private network address detected. Possible SSRF target.",
            "remediation": "Block requests to internal/private IP ranges.",
        },
    ],
    "deserialization": [
        {
            "pattern": r"pickle\.loads?\s*\(",
            "severity": "critical",
            "title": "Unsafe Deserialization (Python pickle)",
            "cwe": "CWE-502",
            "description": "Python pickle deserialization can execute arbitrary code.",
            "remediation": "Use JSON or other safe formats. Never unpickle untrusted data.",
        },
        {
            "pattern": r"yaml\.load\s*\(.*(?:Loader\s*=\s*(?:!yaml\.)?(?:FullLoader|BaseLoader|UnsafeLoader|Loader)|Loader\s*=\s*None)",
            "severity": "high",
            "title": "Unsafe YAML Loading",
            "cwe": "CWE-502",
            "description": "yaml.load() with unsafe loader can execute arbitrary code.",
            "remediation": "Use yaml.safe_load() with SafeLoader only.",
        },
        {
            "pattern": r"(?:unserialize|json_decode)\s*\(\s*\$_(?:GET|POST|REQUEST|COOKIE)",
            "severity": "critical",
            "title": "PHP Unsafe Deserialization",
            "cwe": "CWE-502",
            "description": "PHP unserialize() with user input can lead to RCE.",
            "remediation": "Use json_decode() instead of unserialize().",
        },
        {
            "pattern": r"ObjectInputStream\s*\(\s*.*\)\.readObject\s*\(",
            "severity": "critical",
            "title": "Java Unsafe Deserialization",
            "cwe": "CWE-502",
            "description": "Java ObjectInputStream.readObject() can execute arbitrary code.",
            "remediation": "Use allowlists for deserialized classes. Consider safer alternatives.",
        },
        {
            "pattern": r"marshal\.loads?\s*\(",
            "severity": "critical",
            "title": "Python Marshal Deserialization",
            "cwe": "CWE-502",
            "description": "marshal.loads() can execute arbitrary code.",
            "remediation": "Use JSON or other safe serialization formats.",
        },
    ],
    "secrets_exposure": [
        {
            "pattern": r"(?:api[_-]?key|apikey|API[_-]?KEY)\s*[:=]\s*[\"'][a-zA-Z0-9_\-]{20,40}[\"']",
            "severity": "critical",
            "title": "Hardcoded API Key",
            "cwe": "CWE-798",
            "description": "API key hardcoded in source code.",
            "remediation": "Use environment variables or a secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault).",
        },
        {
            "pattern": r"(?:secret[_-]?key|secretkey|SECRET[_-]?KEY)\s*[:=]\s*[\"'][a-zA-Z0-9_\-]{20,60}[\"']",
            "severity": "critical",
            "title": "Hardcoded Secret Key",
            "cwe": "CWE-798",
            "description": "Secret key hardcoded in source code.",
            "remediation": "Use environment variables or a secrets manager.",
        },
        {
            "pattern": r"(?:password|passwd|pwd)\s*[:=]\s*[\"'][^\"']{4,}[\"']",
            "severity": "critical",
            "title": "Hardcoded Password",
            "cwe": "CWE-798",
            "description": "Password hardcoded in source code.",
            "remediation": "Use environment variables or a secrets manager.",
        },
        {
            "pattern": r"(?:AWS|AMAZON)[_\s]*(?:ACCESS[_\s]*KEY|SECRET)\s*[:=]\s*[\"']?[A-Z0-9]{20}[\"']?",
            "severity": "critical",
            "title": "AWS Credentials Exposed",
            "cwe": "CWE-798",
            "description": "AWS access key or secret hardcoded.",
            "remediation": "Use IAM roles or environment variables. Never hardcode AWS credentials.",
        },
        {
            "pattern": r"(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}",
            "severity": "critical",
            "title": "GitHub Personal Access Token",
            "cwe": "CWE-798",
            "description": "GitHub personal access token detected in code.",
            "remediation": "Use environment variables or a secrets manager. Rotate immediately if exposed.",
        },
        {
            "pattern": r"sk-(?:test|prod|live|proj)_[a-zA-Z0-9]{20,48}",
            "severity": "critical",
            "title": "Stripe API Key",
            "cwe": "CWE-798",
            "description": "Stripe API key detected in code.",
            "remediation": "Use environment variables. Rotate immediately if exposed.",
        },
        {
            "pattern": r"AIza[a-zA-Z0-9_-]{35}",
            "severity": "critical",
            "title": "Google API Key",
            "cwe": "CWE-798",
            "description": "Google API key detected in code.",
            "remediation": "Use environment variables. Restrict API key usage and rotate if exposed.",
        },
        {
            "pattern": r"xox[pboa]-[a-zA-Z0-9-]{10,48}",
            "severity": "critical",
            "title": "Slack Token",
            "cwe": "CWE-798",
            "description": "Slack token detected in code.",
            "remediation": "Use environment variables. Rotate immediately if exposed.",
        },
        {
            "pattern": r"eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+",
            "severity": "critical",
            "title": "JWT Token Exposed",
            "cwe": "CWE-798",
            "description": "JWT token hardcoded in code.",
            "remediation": "Use environment variables or secure token storage.",
        },
        {
            "pattern": r"-----BEGIN\s+(?:RSA|DSA|EC|OPENSSH|PRIVATE)\s+KEY",
            "severity": "critical",
            "title": "Private Key Exposed",
            "cwe": "CWE-798",
            "description": "Private key hardcoded in source code.",
            "remediation": "Use environment variables or a secrets manager. Never commit private keys.",
        },
        {
            "pattern": r"(?:database|DATABASE|db|DB)[_-]?(?:URL|CONNECTION|URI)\s*[:=]\s*[\"'][^\"']{10,}[\"']",
            "severity": "high",
            "title": "Database Connection String Exposed",
            "cwe": "CWE-798",
            "description": "Database connection string with credentials hardcoded.",
            "remediation": "Use environment variables or a secrets manager.",
        },
        {
            "pattern": r"(?:DATABASE_URL|DB_URL|MONGO_URI|REDIS_URL)\s*=\s*[\"'][^\"']{10,}[\"']",
            "severity": "high",
            "title": "Database URL Exposed",
            "cwe": "CWE-798",
            "description": "Database URL with potential credentials hardcoded.",
            "remediation": "Use environment variables.",
        },
    ],
    "insecure_config": [
        {
            "pattern": r"(?:verify_ssl|verify_ssl_cert|verify)\s*=\s*False",
            "severity": "high",
            "title": "SSL/TLS Verification Disabled",
            "cwe": "CWE-295",
            "description": "SSL certificate verification disabled. Vulnerable to man-in-the-middle attacks.",
            "remediation": "Enable SSL verification. Only disable for local development.",
        },
        {
            "pattern": r"(?:debug|DEBUG)\s*[:=]\s*True",
            "severity": "medium",
            "title": "Debug Mode Enabled",
            "cwe": "CWE-489",
            "description": "Debug mode enabled in production. Can expose sensitive information.",
            "remediation": "Disable debug mode in production environments.",
        },
        {
            "pattern": r"(?:Access-Control-Allow-Origin|CORS)\s*:\s*[\"']?\\*[\"']?",
            "severity": "medium",
            "title": "Permissive CORS Policy",
            "cwe": "CWE-942",
            "description": "Wildcard CORS policy allows requests from any origin.",
            "remediation": "Restrict CORS to specific trusted origins.",
        },
        {
            "pattern": r"Helmet\s*\(\s*\)\s*;?\s*//\s*(?:disabled|removed|off)",
            "severity": "medium",
            "title": "Security Headers Disabled",
            "cwe": "CWE-693",
            "description": "Security headers middleware appears to be disabled.",
            "remediation": "Enable security headers (Helmet.js, Django SecurityMiddleware, etc.).",
        },
        {
            "pattern": r"(?:CSP|Content-Security-Policy).*(?:unsafe-inline|unsafe-eval|\*)",
            "severity": "medium",
            "title": "Weak Content Security Policy",
            "cwe": "CWE-693",
            "description": "Content Security Policy allows unsafe-inline or unsafe-eval.",
            "remediation": "Use strict CSP without unsafe-inline/unsafe-eval.",
        },
        {
            "pattern": r"(?:ALLOWED_HOSTS|allowed_hosts)\s*[:=]\s*\[?[\"']?\\*[\"']?\]?",
            "severity": "medium",
            "title": "Wildcard Allowed Hosts",
            "cwe": "CWE-644",
            "description": "ALLOWED_HOSTS set to wildcard allows host header injection.",
            "remediation": "Specify exact allowed hosts.",
        },
        {
            "pattern": r"(?:SECRET_KEY|secret_key)\s*[:=]\s*[\"'][^\"']{1,20}[\"']",
            "severity": "high",
            "title": "Weak Secret Key",
            "cwe": "CWE-1188",
            "description": "Secret key appears to be weak or short.",
            "remediation": "Use a strong, randomly generated secret key of at least 32 characters.",
        },
    ],
    "idor": [
        {
            "pattern": r"(?:findById|find_one|getById|findByPk|getUserById)\s*\(\s*(?:\$_(?:GET|POST)|req\.(?:params|body|query))",
            "severity": "high",
            "title": "Insecure Direct Object Reference (IDOR)",
            "cwe": "CWE-639",
            "description": "Direct object reference without authorization check.",
            "remediation": "Implement authorization checks for all object access.",
        },
        {
            "pattern": r"(?:SELECT|UPDATE|DELETE)\s+.*WHERE\s+.*(?:id|user_id|uuid)\s*=\s*(?:\$_(?:GET|POST)|req\.|params|query|body)",
            "severity": "high",
            "title": "Potential IDOR in Database Query",
            "cwe": "CWE-639",
            "description": "Database query uses user-controlled ID without ownership verification.",
            "remediation": "Verify the requesting user owns the resource being accessed.",
        },
    ],
    "authentication": [
        {
            "pattern": r"(?:jwt|token)\.(?:sign|create)\s*\(.*(?:expiresIn|exp)\s*:\s*[\"']?(?:0|9999|never|Infinity|infinity|-1)[\"']?",
            "severity": "high",
            "title": "JWT Token Never Expires",
            "cwe": "CWE-613",
            "description": "JWT token configured with no or extremely long expiration.",
            "remediation": "Set reasonable expiration times for JWT tokens (e.g., 15-60 minutes).",
        },
        {
            "pattern": r"(?:bcrypt|scrypt|argon2|hash).*rounds\s*[:=]\s*(?:0|1|2|3|4|5)\b",
            "severity": "high",
            "title": "Weak Password Hashing",
            "cwe": "CWE-916",
            "description": "Password hashing with insufficient rounds/cost factor.",
            "remediation": "Use at least 12 rounds for bcrypt or equivalent for other algorithms.",
        },
        {
            "pattern": r"(?:md5|sha1|crc32)\s*\(.*(?:password|passwd|pwd|secret)",
            "severity": "critical",
            "title": "Weak Hash Algorithm for Passwords",
            "cwe": "CWE-328",
            "description": "Weak hash algorithm used for password hashing.",
            "remediation": "Use bcrypt, scrypt, or argon2 for password hashing.",
        },
        {
            "pattern": r"session\.cookie\s*.*(?:secure|httpOnly|sameSite)\s*:\s*false",
            "severity": "medium",
            "title": "Insecure Session Cookie Configuration",
            "cwe": "CWE-1004",
            "description": "Session cookie missing security flags (secure, httpOnly, sameSite).",
            "remediation": "Set secure, httpOnly, and sameSite flags on session cookies.",
        },
    ],
    "open_redirect": [
        {
            "pattern": r"(?:redirect|res\.redirect|Response\.Redirect)\s*\(.*(?:\$_(?:GET|POST|REQUEST)|req\.(?:query|params|body))",
            "severity": "high",
            "title": "Open Redirect Vulnerability",
            "cwe": "CWE-601",
            "description": "Redirect using user-controlled URL without validation.",
            "remediation": "Use allowlists for redirect URLs. Validate against allowed domains.",
        },
    ],
    "information_disclosure": [
        {
            "pattern": r"(?:console\.(?:log|error|warn|info|debug)\s*\(.*(?:password|secret|key|token|credential|api))",
            "severity": "medium",
            "title": "Sensitive Data in Console Logs",
            "cwe": "CWE-532",
            "description": "Sensitive data being logged to console.",
            "remediation": "Never log sensitive data. Use structured logging with redaction.",
        },
        {
            "pattern": r"(?:stack.?trace|traceback|printStackTrace|getTrace)",
            "severity": "medium",
            "title": "Stack Trace Exposure",
            "cwe": "CWE-209",
            "description": "Stack trace may be exposed to users.",
            "remediation": "Catch exceptions and return generic error messages to users.",
        },
        {
            "pattern": r"(?:error_reporting|display_errors|expose_php)\s*[:=]\s*(?:E_ALL|On|1|true)",
            "severity": "medium",
            "title": "Verbose Error Reporting",
            "cwe": "CWE-209",
            "description": "Detailed error reporting enabled.",
            "remediation": "Disable detailed error reporting in production.",
        },
    ],
    "prototype_pollution": [
        {
            "pattern": r"(?:Object\.assign|extend|merge|deepExtend)\s*\(.*(?:req|params|body|query)",
            "severity": "high",
            "title": "Prototype Pollution Risk",
            "cwe": "CWE-1321",
            "description": "Object merge/assign with user input can lead to prototype pollution.",
            "remediation": "Use safe merge functions that filter __proto__ and constructor.",
        },
    ],
    "regex_dos": [
        {
            "pattern": r"(?:re\.compile|new\s+RegExp)\s*\(.*(?:\+|\.format|\$\{)",
            "severity": "medium",
            "title": "User-Controlled Regex Pattern",
            "cwe": "CWE-1333",
            "description": "Regular expression pattern controlled by user input.",
            "remediation": "Validate regex patterns. Set timeouts to prevent ReDoS.",
        },
        {
            "pattern": r"(?:\(\?:\.\*\))\+|(?:\(\.\*\))\{(?:\d+,)?\d+\}",
            "severity": "medium",
            "title": "ReDoS-Prone Regex Pattern",
            "cwe": "CWE-1333",
            "description": "Regex pattern vulnerable to catastrophic backtracking.",
            "remediation": "Simplify regex patterns. Avoid nested quantifiers.",
        },
    ],
    "crypto_issues": [
        {
            "pattern": r"(?:md5|sha1)\s*\(",
            "severity": "medium",
            "title": "Weak Cryptographic Hash",
            "cwe": "CWE-328",
            "description": "Weak hash algorithm (MD5/SHA1) used for security purposes.",
            "remediation": "Use SHA-256 or stronger for cryptographic purposes.",
        },
        {
            "pattern": r"(?:DES|3DES|RC4|ECB)",
            "severity": "high",
            "title": "Weak Encryption Algorithm",
            "cwe": "CWE-327",
            "description": "Outdated or weak encryption algorithm detected.",
            "remediation": "Use AES-256-GCM or ChaCha20-Poly1305 for encryption.",
        },
        {
            "pattern": r"(?:random|randint|random\.random)\s*\(.*(?:token|secret|key|password|csrf|session)",
            "severity": "high",
            "title": "Insecure Random Number Generation",
            "cwe": "CWE-330",
            "description": "Predictable random number generator used for security purposes.",
            "remediation": "Use secrets module (Python) or crypto.randomBytes (Node.js).",
        },
    ],
    "dos_prone": [
        {
            "pattern": r"(?:while|for)\s*\(\s*(?:true|1)\s*\)",
            "severity": "medium",
            "title": "Infinite Loop Risk",
            "cwe": "CWE-835",
            "description": "Potential infinite loop detected.",
            "remediation": "Add loop termination conditions and timeouts.",
        },
        {
            "pattern": r"(?:sleep|delay|wait|pause)\s*\(\s*(?:req|params|body|query)",
            "severity": "medium",
            "title": "User-Controlled Delay",
            "cwe": "CWE-400",
            "description": "Delay duration controlled by user input. Possible DoS.",
            "remediation": "Cap maximum delay duration.",
        },
    ],
}


def _map_code_scan_findings(findings: list) -> list:
    mapped = []
    for f in findings:
        mapped.append({
            "category": f.get("category", "unknown"),
            "type": f.get("id", "issue"),
            "title": f.get("title", "Issue") + (f" (line {f['line']})" if f.get("line") else ""),
            "description": f.get("remediation", ""),
            "severity": f.get("severity", "low"),
            "cwe": f.get("cwe", ""),
            "remediation": f.get("remediation", ""),
            "line": f.get("line"),
        })
    return mapped


@register_feature(
    key="vibe_code_security",
    name="Vibe Code Security",
    description="Scan web applications and code for 200+ security vulnerabilities including SQLi, XSS, RCE, SSRF, path traversal, deserialization, secrets exposure, and more.",
    tier="professional",
)
def vibe_code_security(payload: dict) -> dict:
    target = payload.get("target", "")
    code = payload.get("code", "")
    url = payload.get("url", "")
    if payload.get("target_type"):
        target_type = payload["target_type"]
    elif url or target:
        target_type = "url"
    else:
        # Nothing actionable supplied — default to code scanning rather than
        # fabricating an empty-URL scan that would always flag a false BLOCK.
        target_type = "code"

    vulnerabilities = []
    risk_score = 0.0

    if target_type == "url" or url:
        vulnerabilities.extend(_scan_url_security(url or target))
        try:
            from app.services.code_analyzer import run_code_scan

            deep = run_code_scan(target_type="url", target=url or target)
            vulnerabilities.extend(_map_code_scan_findings(deep["findings"]))
        except Exception:
            pass

    if target_type in ("code", "github", "file") and code:
        vulnerabilities.extend(_scan_code_security(code))
        try:
            from app.services.code_analyzer import run_code_scan

            deep = run_code_scan(target_type="code", code=code)
            vulnerabilities.extend(_map_code_scan_findings(deep["findings"]))
        except Exception:
            pass

    # de-duplicate by title so the same URL/code finding isn't reported twice
    seen_titles = set()
    deduped = []
    for v in vulnerabilities:
        t = v.get("title")
        if t in seen_titles:
            continue
        seen_titles.add(t)
        deduped.append(v)
    vulnerabilities = deduped

    for vuln in vulnerabilities:
        severity_score = {"critical": 0.9, "high": 0.6, "medium": 0.3, "low": 0.1}.get(vuln.get("severity", "low"), 0.1)
        risk_score += severity_score

    risk_score = min(risk_score, 1.0)

    if risk_score >= 0.7:
        severity = "critical"
    elif risk_score >= 0.4:
        severity = "medium"
    elif risk_score > 0:
        severity = "low"
    else:
        severity = "none"

    return {
        "target_type": target_type,
        "target": target or url,
        "vulnerabilities_found": len(vulnerabilities),
        "vulnerabilities": vulnerabilities,
        "findings": [
            f"[{v.get('severity', 'low')}] {v.get('title', 'Issue')}"
            + (f" (line {v['line']})" if v.get("line") else "")
            + f" — {v.get('remediation', '')}"
            for v in vulnerabilities
        ],
        "risk_score": round(risk_score, 3),
        "verdict": "block" if risk_score >= 0.6 else "flag" if risk_score >= 0.3 else "allow",
        "severity": severity,
        "categories_affected": list(set(v.get("category", "unknown") for v in vulnerabilities)),
        "critical_count": sum(1 for v in vulnerabilities if v.get("severity") == "critical"),
        "high_count": sum(1 for v in vulnerabilities if v.get("severity") == "high"),
        "recommendation": _get_code_recommendation(vulnerabilities),
    }


def _scan_url_security(url: str) -> list:
    vulns = []

    if not url.startswith("https://"):
        vulns.append({
            "category": "transport_security",
            "type": "insecure_transport",
            "title": "Insecure Transport (HTTP)",
            "description": f"URL '{url}' does not use HTTPS. Data transmitted can be intercepted and modified.",
            "severity": "high",
            "cwe": "CWE-319",
            "remediation": "Enable HTTPS and redirect all HTTP traffic to HTTPS. Use HSTS headers.",
        })

    if re.search(r"(?:\?|\&)(?:redirect|return|return_url|next|url|goto|continue|dest|destination|redir|return_to|return_url|success_url)\s*=", url, re.IGNORECASE):
        vulns.append({
            "category": "open_redirect",
            "type": "open_redirect_in_url",
            "title": "Open Redirect Parameter in URL",
            "description": "URL contains redirect parameter that could be abused for phishing.",
            "severity": "medium",
            "cwe": "CWE-601",
            "remediation": "Validate redirect URLs against an allowlist.",
        })

    dangerous_extensions = [".php", ".asp", ".aspx", ".jsp", ".cgi", ".pl", ".py", ".sh", ".exe", ".bat", ".cmd", ".ps1"]
    if any(url.lower().split("?")[0].endswith(ext) for ext in dangerous_extensions):
        vulns.append({
            "category": "technology_exposure",
            "type": "server_technology_exposure",
            "title": "Server Technology Exposure",
            "description": "URL reveals server-side technology. Helps attackers target known vulnerabilities.",
            "severity": "low",
            "cwe": "CWE-200",
            "remediation": "Remove technology indicators from URLs.",
        })

    return vulns


def _scan_code_security(code: str) -> list:
    vulnerabilities = []

    for category, patterns in VULNERABILITY_PATTERNS.items():
        for vuln_pattern in patterns:
            if re.search(vuln_pattern["pattern"], code, re.IGNORECASE):
                vulnerabilities.append({
                    "category": category,
                    "type": vuln_pattern["title"].lower().replace(" ", "_").replace("(", "").replace(")", ""),
                    "title": vuln_pattern["title"],
                    "description": vuln_pattern["description"],
                    "severity": vuln_pattern["severity"],
                    "cwe": vuln_pattern["cwe"],
                    "remediation": vuln_pattern["remediation"],
                })

    unique_vulns = []
    seen = set()
    for vuln in vulnerabilities:
        key = f"{vuln['category']}:{vuln['type']}"
        if key not in seen:
            seen.add(key)
            unique_vulns.append(vuln)

    return unique_vulns


def _get_code_recommendation(vulnerabilities: list) -> str:
    if not vulnerabilities:
        return "No critical vulnerabilities detected. Continue monitoring for new issues and conduct regular security assessments."

    critical = [v for v in vulnerabilities if v.get("severity") == "critical"]
    high = [v for v in vulnerabilities if v.get("severity") == "high"]

    if critical:
        categories = list(set(v["category"] for v in critical))
        return f"Found {len(critical)} CRITICAL vulnerabilities in categories: {', '.join(categories)}. Address these IMMEDIATELY before deployment. These vulnerabilities could lead to complete system compromise, data breach, or service disruption."
    elif high:
        return f"Found {len(high)} HIGH severity vulnerabilities. Review and fix these at the earliest convenience."

    return f"Found {len(vulnerabilities)} potential security issues. Review and address these in your next development cycle."
