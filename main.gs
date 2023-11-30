/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */

/**Testing the addon */
var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

/**
 * Format the given URL by checking the protocol part and removing trailing "/".
 */
function formatUrl(url) {
    if (!url || !url.length) {
        return;
    }
    if (url.indexOf("http://") !== 0 && url.indexOf("https://") !== 0) {
        url = "https://" + url;
    }
    // Remove trailing "/"
    return url.replace(/\/+$/, "");
}
/**
 * Return the given string only if it's not null and not empty.
 */
function isTrue(value) {
    if (value && value.length) {
        return value;
    }
}
/**
 * Return the first element of an array if the array is not null and not empty.
 */
function first(value) {
    if (value && value.length) {
        return value[0];
    }
}
/**
 * Repeat the given string "n" times.
 */
function repeat(str, n) {
    var result = "";
    while (n > 0) {
        result += str;
        n--;
    }
    return result;
}
/**
 * Truncate the given text to not exceed the given length.
 */
function truncate(str, maxLength) {
    if (str.length > maxLength) {
        return str.substring(0, maxLength - 3) + "...";
    }
    return str;
}

/**
 * Make a JSON RPC call with the following parameters.
 */
function postJsonRpc(url, data, headers, options) {
    if (data === void 0) { data = {}; }
    if (headers === void 0) { headers = {}; }
    if (options === void 0) { options = {}; }
    // Make a valid "Odoo RPC" call
    data = {
        id: 0,
        jsonrpc: "2.0",
        method: "call",
        params: data,
    };
    var httpOptions = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(data),
        headers: headers,
    };
    try {
        var response = UrlFetchApp.fetch(url, httpOptions);
        if (options.returnRawResponse) {
            return response;
        }
        var responseCode = response.getResponseCode();
        if (responseCode > 299 || responseCode < 200) {
            return;
        }
        var textResponse = response.getContentText("UTF-8");
        var dictResponse = JSON.parse(textResponse);
        if (!dictResponse.result) {
            return;
        }
        return dictResponse.result;
    }
    catch (_a) {
        return;
    }
}
/**
 * Make a JSON RPC call with the following parameters.
 *
 * Try to first read the response from the cache, if not found,
 * make the call and cache the response.
 *
 * The cache key is based on the URL and the JSON data
 *
 * Store the result for 6 hours by default (maximum cache duration)
 *
 * This cache may be needed to make to many HTTP call to an external service (e.g. IAP).
 */
function postJsonRpcCached(url, data, headers, cacheTtl) {
    if (data === void 0) { data = {}; }
    if (headers === void 0) { headers = {}; }
    if (cacheTtl === void 0) { cacheTtl = 21600; }
    var cache = CacheService.getUserCache();
    // Max 250 characters, to hash the key to have a fixed length
    var cacheKey = "ODOO_HTTP_CACHE_" +
        Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify([url, data])));
    var cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
        return JSON.parse(cachedResponse);
    }
    var response = postJsonRpc(url, data, headers);
    if (response) {
        cache.put(cacheKey, JSON.stringify(response), cacheTtl);
    }
    return response;
}
/**
 * Take a dictionary and return the URL encoded parameters
 */
function encodeQueryData(parameters) {
    var queryParameters = [];
    for (var key in parameters) {
        queryParameters.push(encodeURIComponent(key) + "=" + encodeURIComponent(parameters[key]));
    }
    return "?" + queryParameters.join("&");
}

var URLS = {
    GET_TRANSLATIONS: "/mail_plugin/get_translations",
    LOG_EMAIL: "/mail_plugin/log_mail_content",
    // Partner
    GET_PARTNER: "/mail_plugin/partner/get",
    SEARCH_PARTNER: "/mail_plugin/partner/search",
    PARTNER_CREATE: "/mail_plugin/partner/create",
    CREATE_COMPANY: "/mail_plugin/partner/enrich_and_create_company",
    ENRICH_COMPANY: "/mail_plugin/partner/enrich_and_update_company",
    // CRM Lead
    CREATE_LEAD: "/mail_plugin/lead/create",
    // HELPDESK Ticket
    CREATE_TICKET: "/mail_plugin/ticket/create",
    // Project
    SEARCH_PROJECT: "/mail_plugin/project/search",
    CREATE_PROJECT: "/mail_plugin/project/create",
    CREATE_TASK: "/mail_plugin/task/create",
    //Maintenance Equipment
    CREATE_EQUIPMENT: "/mail_plugin/equipment/create",    /**CUSTOMIZATION **/
    // IAP
    IAP_COMPANY_ENRICHMENT: "https://iap-services.odoo.com/iap/mail_extension/enrich",
};
var ODOO_AUTH_URLS = {
    LOGIN: "/web/login",
    AUTH_CODE: "/mail_plugin/auth",
    CODE_VALIDATION: "/mail_plugin/auth/access_token",
    SCOPE: "outlook",
    FRIENDLY_NAME: "Gmail",
};

var errorPage = "\n<html>\n    <style>\n        .alert {\n            color: #721c24;\n            background-color: #f5c6cb;\n            padding: 20px;\n            max-width: 1000px;\n            margin: auto;\n            text-align: center;\n            font-family: -apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",\"Segoe UI Symbol\"\n        }\n        img {\n            max-width: 300px;\n            margin-left: calc(50% - 150px);\n            margin-bottom: 50px;\n        }\n        hr {\n            border- color: #721c24;\n        }\n    </style>\n    <img src=\"https://raw.githubusercontent.com/odoo/mail-client-extensions/master/outlook/assets/odoo-full.png\">\n    <div class=\"alert\">__ERROR_MESSAGE__</div>\n</html>";
/**
 * Callback function called during the OAuth authentication process.
 *
 * 1. The user click on the "Login button"
 *    We generate a state token (for this function)
 * 2. The user is redirected to Odoo and enter his login / password
 * 3. Then the user is redirected to the Google App-Script
 * 4. Thanks the the state token, the function "odooAuthCallback" is called with the auth code
 * 5. The auth code is exchanged for an access token with a RPC call
 */
function odooAuthCallback(callbackRequest) {
    Logger.log("Run authcallback");
    var success = callbackRequest.parameter.success;
    var authCode = callbackRequest.parameter.auth_code;
    if (success !== "1") {
        return HtmlService.createHtmlOutput(errorPage.replace("__ERROR_MESSAGE__", "Odoo did not return successfully."));
    }
    Logger.log("Get access token from auth code...");
    var userProperties = PropertiesService.getUserProperties();
    var odooUrl = userProperties.getProperty("ODOO_SERVER_URL");
    var response = postJsonRpc(odooUrl + ODOO_AUTH_URLS.CODE_VALIDATION, {
        auth_code: authCode,
    });
    if (!response || !response.access_token || !response.access_token.length) {
        return HtmlService.createHtmlOutput(errorPage.replace("__ERROR_MESSAGE__", "The token exchange failed. Maybe your token has expired or your database can not be reached by the Google server." +
            "<hr noshade>Contact your administrator or our support."));
    }
    var accessToken = response.access_token;
    userProperties.setProperty("ODOO_ACCESS_TOKEN", accessToken);
    return HtmlService.createHtmlOutput("Success ! <script>top.window.close()</script>");
}
/**
 * Generate the URL to redirect the user for the authentication to the Odoo database.
 *
 * This URL contains a state and the Odoo database should resend it.
 * The Google server use the state code to know which function to execute when the user
 * is redirected on their server.
 */
function getOdooAuthUrl() {
    var userProperties = PropertiesService.getUserProperties();
    var odooUrl = userProperties.getProperty("ODOO_SERVER_URL");
    var scriptId = ScriptApp.getScriptId();
    if (!odooUrl || !odooUrl.length) {
        throw new Error("Can not retrieve the Odoo database URL.");
    }
    if (!scriptId || !scriptId.length) {
        throw new Error("Can not retrieve the script ID.");
    }
    var stateToken = ScriptApp.newStateToken().withMethod(odooAuthCallback.name).withTimeout(3600).createToken();
    var redirectToAddon = "https://script.google.com/macros/d/".concat(scriptId, "/usercallback");
    var scope = ODOO_AUTH_URLS.SCOPE;
    var url = odooUrl +
        ODOO_AUTH_URLS.AUTH_CODE +
        encodeQueryData({
            redirect: redirectToAddon,
            friendlyname: "Gmail",
            state: stateToken,
            scope: scope,
        });
    return url;
}
/**
 * Return the access token saved in the user properties.
 */
var getAccessToken = function () {
    var userProperties = PropertiesService.getUserProperties();
    var accessToken = userProperties.getProperty("ODOO_ACCESS_TOKEN");
    if (!accessToken || !accessToken.length) {
        return;
    }
    return accessToken;
};
/**
 * Reset the access token saved in the user properties.
 */
var resetAccessToken = function () {
    var userProperties = PropertiesService.getUserProperties();
    userProperties.deleteProperty("ODOO_ACCESS_TOKEN");
};
/**
 * Make an HTTP request to "/mail_plugin/auth/access_token" (cors="*") on the Odoo
 * database to verify that the server is reachable and that the mail plugin module is
 * installed.
 *
 * Returns True if the Odoo database is reachable and if the "mail_plugin" module
 * is installed, false otherwise.
 */
var isOdooDatabaseReachable = function (odooUrl) {
    if (!odooUrl || !odooUrl.length) {
        return false;
    }
    var response = postJsonRpc(odooUrl + ODOO_AUTH_URLS.CODE_VALIDATION, { auth_code: null }, {}, { returnRawResponse: true });
    if (!response) {
        return false;
    }
    var responseCode = response.getResponseCode();
    if (responseCode > 299 || responseCode < 200) {
        return false;
    }
    return true;
};

function getOdooServerUrl() {
    return PropertiesService.getUserProperties().getProperty("ODOO_SERVER_URL");
}
function setOdooServerUrl(url) {
    PropertiesService.getUserProperties().setProperty("ODOO_SERVER_URL", url);
}

/**
 * Object which fetchs the translations on the Odoo database, puts them in cache.
 *
 * Done in a class and not in a simple function so we read only once the cache for all
 * translations.
 */
var Translate = /** @class */ (function () {
    function Translate() {
        var cache = CacheService.getUserCache();
        var cacheKey = "ODOO_TRANSLATIONS";
        var translationsStr = cache.get(cacheKey);
        var odooServerUrl = getOdooServerUrl();
        var odooAccessToken = getAccessToken();
        if (translationsStr) {
            this.translations = JSON.parse(translationsStr);
        }
        else if (odooServerUrl && odooAccessToken) {
            Logger.log("Download translations...");
            this.translations = postJsonRpc(odooServerUrl + URLS.GET_TRANSLATIONS, {}, { Authorization: "Bearer " + odooAccessToken });
            if (this.translations) {
                // Put in the cacher for 6 hours (maximum cache life time)
                cache.put(cacheKey, JSON.stringify(this.translations), 21600);
            }
        }
        this.translations = this.translations || {};
    }
    /**
     * Translate the given string.
     *
     * This method supports python like string format. You can use named parameters
     * (e.g.: "Hello %(name)s") or simple string format (e.g.: "Hello %s").
     */
    Translate.prototype._t = function (text, parameters) {
        if (parameters === void 0) { parameters = undefined; }
        var translated = this.translations[text];
        if (!translated) {
            if (this.translations && Object.keys(this.translations).length) {
                Logger.log("Translation missing for: " + text);
            }
            translated = text;
        }
        if (parameters === undefined) {
            return translated;
        }
        else if (typeof parameters === "string" || typeof parameters === "number") {
            // "%s" % variable
            return translated.replace(/%s/i, "" + parameters);
        }
        else {
            // "%(variable_1)s at %(variable_2)s" % {variable_1: value, variable_2: value}
            var re = new RegExp(Object.keys(parameters)
                .map(function (x) { return "%\\(".concat(x, "\\)s"); })
                .join("|"), "gi");
            return translated.replace(re, function (key) { return parameters[key.substring(2, key.length - 2)] || ""; });
        }
    };
    return Translate;
}());
var translate = new Translate();
// Can be used as a function without reading each time the cache
function _t(text, parameters) {
    if (parameters === void 0) { parameters = undefined; }
    return translate._t(text, parameters);
}
function clearTranslationCache() {
    var cache = CacheService.getUserCache();
    var cacheKey = "ODOO_TRANSLATIONS";
    cache.remove(cacheKey);
    translate.translations = {};
}

/**
 * Represent an error and translate its code to a message.
 */
var _ERROR_CODE_MESSAGES = {
    odoo: null,
    http_error_odoo: "Could not connect to database. Try to log out and in.",
    insufficient_credit: "Not enough credits to enrich.",
    company_created: null,
    company_updated: null,
    // IAP
    http_error_iap: "Our IAP server is down, please come back later.",
    exhausted_requests: "Oops, looks like you have exhausted your free enrichment requests. Please log in to try again.",
    missing_data: "No insights found for this address",
    unknown: "Something bad happened. Please, try again later.",
    // Attachment
    attachments_size_exceeded: "Attachments could not be logged in Odoo because their total size exceeded the allowed maximum.",
};
/**
 * Represent an error message which will be displayed on the add-on.
 * Translate the code into a message to display to the user.
 */
var ErrorMessage = /** @class */ (function () {
    function ErrorMessage(code, information) {
        if (code === void 0) { code = null; }
        if (information === void 0) { information = null; }
        // False if the error means that we can not contact the Odoo database
        // (e.g. HTTP error)
        this.canContactOdooDatabase = true;
        this.canCreateCompany = true;
        if (code) {
            this.setError(code, information);
        }
    }
    /**
     * Set the code error and find the appropriate message to display.
     */
    ErrorMessage.prototype.setError = function (code, information) {
        if (information === void 0) { information = null; }
        if (code === "no_data") {
            code = "missing_data";
            information = null;
        }
        this.code = code;
        this.information = information;
        this.message = _t(_ERROR_CODE_MESSAGES[this.code]);
        if (code === "http_error_odoo") {
            this.canContactOdooDatabase = false;
        }
    };
    /**
     * Unserialize the error object (reverse JSON.stringify).
     */
    ErrorMessage.fromJson = function (values) {
        var error = new ErrorMessage();
        error.code = values.code;
        error.message = values.message;
        error.canContactOdooDatabase = values.canContactOdooDatabase;
        error.canCreateCompany = values.canCreateCompany;
        error.information = values.information;
        return error;
    };
    return ErrorMessage;
}());

/**
 * Represent the current email open in the Gmail application.
 */
var Email = /** @class */ (function () {
    function Email(messageId, accessToken) {
        var _a;
        if (messageId === void 0) { messageId = null; }
        if (accessToken === void 0) { accessToken = null; }
        if (messageId) {
            var userEmail = Session.getEffectiveUser().getEmail().toLowerCase();
            this.accessToken = accessToken;
            this.messageId = messageId;
            var message = GmailApp.getMessageById(this.messageId);
            this.subject = message.getSubject();
            var fromHeaders = message.getFrom();
            var sent = fromHeaders.toLowerCase().indexOf(userEmail) >= 0;
            this.contactFullEmail = sent ? message.getTo() : message.getFrom();
            _a = this._emailSplitTuple(this.contactFullEmail), this.contactName = _a[0], this.contactEmail = _a[1];
        }
    }
    Object.defineProperty(Email.prototype, "body", {
        /**
         * Ask the email body only if the user asked for it (e.g. asked to log the email).
         */
        get: function () {
            GmailApp.setCurrentMessageAccessToken(this.accessToken);
            var message = GmailApp.getMessageById(this.messageId);
            return message.getBody();
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Parse a full FROM header and return the name part and the email part.
     *
     * E.G.
     *     "BOB" <bob@example.com> => ["BOB", "bob@example.com"]
     *     bob@example.com         => ["bob@example.com", "bob@example.com"]
     *
     */
    Email.prototype._emailSplitTuple = function (fullEmail) {
        var match = fullEmail.match(/(.*)<(.*)>/);
        fullEmail = fullEmail.replace("<", "").replace(">", "");
        if (!match) {
            return [fullEmail, fullEmail];
        }
        match[0]; var name = match[1], email = match[2];
        if (!name || !email) {
            return [fullEmail, fullEmail];
        }
        var cleanedName = name.replace(/\"/g, "").trim();
        if (!cleanedName || !cleanedName.length) {
            return [fullEmail, fullEmail];
        }
        return [cleanedName, email];
    };
    /**
     * Unserialize the email object (reverse JSON.stringify).
     */
    Email.fromJson = function (values) {
        var email = new Email();
        email.accessToken = values.accessToken;
        email.messageId = values.messageId;
        email.subject = values.subject;
        email.contactEmail = values.contactEmail;
        email.contactFullEmail = values.contactFullEmail;
        email.contactName = values.contactName;
        return email;
    };
    /**
     * Return the list of the attachments in the email.
     * Done in a getter and not as a property because this object is serialized and
     * given to the event handler.
     *
     * Returns:
     *     - Null and "attachments_size_exceeded" error, if the total attachment size limit
     *       is exceeded so we do not keep big files in memory.
     *     - If no attachment, return an empty array and an empty error message.
     *     - Otherwise, the list of attachments base 64 encoded and an empty error message
     */
    Email.prototype.getAttachments = function () {
        GmailApp.setCurrentMessageAccessToken(this.accessToken);
        var message = GmailApp.getMessageById(this.messageId);
        var gmailAttachments = message.getAttachments();
        var attachments = [];
        // The size limit of the POST request are 50 MB
        // So we limit the total attachment size to 40 MB
        var MAXIMUM_ATTACHMENTS_SIZE = 40 * 1024 * 1024;
        var totalAttachmentsSize = 0;
        for (var _i = 0, gmailAttachments_1 = gmailAttachments; _i < gmailAttachments_1.length; _i++) {
            var gmailAttachment = gmailAttachments_1[_i];
            var bytesSize = gmailAttachment.getSize();
            totalAttachmentsSize += bytesSize;
            if (totalAttachmentsSize > MAXIMUM_ATTACHMENTS_SIZE) {
                return [null, new ErrorMessage("attachments_size_exceeded")];
            }
            var name_1 = gmailAttachment.getName();
            var content = Utilities.base64Encode(gmailAttachment.getBytes());
            attachments.push([name_1, content]);
        }
        return [attachments, new ErrorMessage(null)];
    };
    return Email;
}());

var Company = /** @class */ (function () {
    function Company() {
    }
    /**
     * Parse the dictionary returned by IAP.
     */
    Company.fromIapResponse = function (values) {
        var company = new Company();
        company.name = isTrue(values.name);
        company.email = first(values.email);
        company.phone = first(values.phone_numbers);
        company.isEnriched = !!Object.keys(values).length;
        company.emails = isTrue(values.email) ? values.email.join("\n") : null;
        company.phones = isTrue(values.phone_numbers) ? values.phone_numbers.join("\n") : null;
        company.image = isTrue(values.logo);
        company.website = formatUrl(values.domain);
        company.description = isTrue(values.description);
        company.address = isTrue(values.location);
        // Social Medias
        company.facebook = isTrue(values.facebook);
        company.twitter = isTrue(values.twitter);
        company.linkedin = isTrue(values.linkedin);
        company.crunchbase = isTrue(values.crunchbase);
        // Additional Information
        company.employees = values.employees || null;
        company.annualRevenue = isTrue(values.estimated_annual_revenue);
        company.industry = isTrue(values.industry);
        company.twitterBio = isTrue(values.twitter_bio);
        company.twitterFollowers = values.twitter_followers || null;
        company.foundedYear = values.founded_year;
        company.timezone = isTrue(values.timezone);
        company.timezoneUrl = isTrue(values.timezone_url);
        company.tags = isTrue(values.tag) ? values.tag.join(", ") : null;
        company.companyType = isTrue(values.company_type);
        return company;
    };
    /**
     * Unserialize the company object (reverse JSON.stringify).
     */
    Company.fromJson = function (values) {
        var company = new Company();
        company.id = values.id;
        company.name = values.name;
        company.email = values.email;
        company.phone = values.phone;
        company.address = values.address;
        company.annualRevenue = values.annualRevenue;
        company.companyType = values.companyType;
        company.description = values.description;
        company.emails = values.emails;
        company.employees = values.employees;
        company.foundedYear = values.foundedYear;
        company.image = values.image;
        company.industry = values.industry;
        company.mobile = values.mobile;
        company.phones = values.phones;
        company.tags = values.tags;
        company.timezone = values.timezone;
        company.timezoneUrl = values.timezoneUrl;
        company.twitterBio = values.twitterBio;
        company.twitterFollowers = values.twitterFollowers;
        company.website = values.website;
        company.crunchbase = values.crunchbase;
        company.facebook = values.facebook;
        company.twitter = values.twitter;
        company.linkedin = values.linkedin;
        return company;
    };
    /**
     * Parse the dictionary returned by an Odoo database.
     */
    Company.fromOdooResponse = function (values) {
        if (!values.id || values.id < 0) {
            return null;
        }
        var iapInfo = values.additionalInfo || {};
        var company = this.fromIapResponse(iapInfo);
        // Overwrite IAP information with the Odoo client database information
        company.id = values.id;
        company.name = values.name;
        company.email = values.email;
        company.phone = values.phone;
        company.mobile = values.mobile;
        company.website = values.website;
        company.image = values.image ? "data:image/png;base64," + values.image : null;
        if (values.address) {
            company.address = "";
            if (isTrue(values.address.street)) {
                company.address += values.address.street + ", ";
            }
            if (isTrue(values.address.zip)) {
                company.address += values.address.zip + " ";
            }
            if (isTrue(values.address.city)) {
                company.address += values.address.city + " ";
            }
            if (isTrue(values.address.country)) {
                company.address += values.address.country;
            }
        }
        return company;
    };
    return Company;
}());

/**
 * Represent a "crm.lead" record.
 */
var Lead = /** @class */ (function () {
    function Lead() {
    }
    /**
     * Make a RPC call to the Odoo database to create a lead
     * and return the ID of the newly created record.
     */
    Lead.createLead = function (partnerId, emailBody, emailSubject) {
        var url = PropertiesService.getUserProperties().getProperty("ODOO_SERVER_URL") + URLS.CREATE_LEAD;
        var accessToken = getAccessToken();
        var response = postJsonRpc(url, { email_body: emailBody, email_subject: emailSubject, partner_id: partnerId }, { Authorization: "Bearer " + accessToken });
        return response ? response.lead_id || null : null;
    };
    /**
     * Unserialize the lead object (reverse JSON.stringify).
     */
    Lead.fromJson = function (values) {
        var lead = new Lead();
        lead.id = values.id;
        lead.name = values.name;
        lead.expectedRevenue = values.expectedRevenue;
        lead.probability = values.probability;
        lead.recurringRevenue = values.recurringRevenue;
        lead.recurringPlan = values.recurringPlan;
        return lead;
    };
    /**
     * Parse the dictionary returned by the Odoo database endpoint.
     */
    Lead.fromOdooResponse = function (values) {
        var lead = new Lead();
        lead.id = values.lead_id;
        lead.name = values.name;
        lead.expectedRevenue = values.expected_revenue;
        lead.probability = values.probability;
        if (isTrue(values.recurring_revenue) && isTrue(values.recurring_plan)) {
            lead.recurringRevenue = values.recurring_revenue;
            lead.recurringPlan = values.recurring_plan;
        }
        return lead;
    };
    return Lead;
}());


/** CUSTOMIZATION
 * Represent a "maintenance.equipment" record.
 */
var Equipment = /** @class */ (function () {
    function Equipment() {
    }
    /**
     * Make a RPC call to the Odoo database to create a Equipment
     * and return the ID of the newly created record.
     */
    Equipment.createEquipment = function (partnerId, emailBody, emailSubject) {
        var url = PropertiesService.getUserProperties().getProperty("ODOO_SERVER_URL") + URLS.CREATE_EQUIPMENT;
        var accessToken = getAccessToken();
        var response = postJsonRpc(url, { email_body: emailBody, email_subject: emailSubject, partner_id: partnerId }, { Authorization: "Bearer " + accessToken });
        return response ? response.equipment_id || null : null;
    };
    /**
     * Unserialize the Equipment object (reverse JSON.stringify).
     */
    Equipment.fromJson = function (values) {
        var equipment = new Equipment();
        equipment.id = values.id;
        equipment.name = values.name;    
        return equipment;
    };
    /**
     * Parse the dictionary returned by the Odoo database endpoint.
     */
    Equipment.fromOdooResponse = function (values) {
        var equipment = new Equipment();
        equipment.id = values.equipment_id;
        equipment.name = values.name;    
        return equipment;
    };
    return Equipment;
}());

/**End of CUSTOMIZATION */

/**
 * Represent a "project.task" record.
 */
var Task = /** @class */ (function () {
    function Task() {
    }
    /**
     * Unserialize the task object (reverse JSON.stringify).
     */
    Task.fromJson = function (values) {
        var task = new Task();
        task.id = values.id;
        task.name = values.name;
        task.projectName = values.projectName;
        return task;
    };
    /**
     * Parse the dictionary return by the Odoo endpoint.
     */
    Task.fromOdooResponse = function (values) {
        var task = new Task();
        task.id = values.task_id;
        task.name = values.name;
        task.projectName = values.project_name;
        return task;
    };
    /**
     * Make a RPC call to the Odoo database to create a task
     * and return the ID of the newly created record.
     */
    Task.createTask = function (partnerId, projectId, emailBody, emailSubject) {
        var url = PropertiesService.getUserProperties().getProperty("ODOO_SERVER_URL") + URLS.CREATE_TASK;
        var odooAccessToken = getAccessToken();
        var response = postJsonRpc(url, { email_subject: emailSubject, email_body: emailBody, project_id: projectId, partner_id: partnerId }, { Authorization: "Bearer " + odooAccessToken });
        var taskId = response ? response.task_id || null : null;
        if (!taskId) {
            return null;
        }
        return Task.fromJson({
            id: taskId,
            name: response.name,
        });
    };
    return Task;
}());

/**
 * Represent a "helpdesk.ticket" record.
 */
var Ticket = /** @class */ (function () {
    function Ticket() {
    }
    /**
     * Make a RPC call to the Odoo database to create a ticket
     * and return the ID of the newly created record.
     */
    Ticket.createTicket = function (partnerId, emailBody, emailSubject) {
        var url = PropertiesService.getUserProperties().getProperty("ODOO_SERVER_URL") + URLS.CREATE_TICKET;
        var odooAccessToken = getAccessToken();
        var response = postJsonRpc(url, { email_body: emailBody, email_subject: emailSubject, partner_id: partnerId }, { Authorization: "Bearer " + odooAccessToken });
        return response ? response.ticket_id || null : null;
    };
    /**
     * Unserialize the ticket object (reverse JSON.stringify).
     */
    Ticket.fromJson = function (values) {
        var ticket = new Ticket();
        ticket.id = values.id;
        ticket.name = values.name;
        return ticket;
    };
    /**
     * Parse the dictionary return by the Odoo endpoint.
     */
    Ticket.fromOdooResponse = function (values) {
        var ticket = new Ticket();
        ticket.id = values.ticket_id;
        ticket.name = values.name;
        return ticket;
    };
    return Ticket;
}());

/**
 * Represent the current partner and all the information about him.
 */
var Partner = /** @class */ (function () {
    function Partner() {
    }
    /**
     * Unserialize the partner object (reverse JSON.stringify).
     */
    Partner.fromJson = function (values) {
        var partner = new Partner();
        partner.id = values.id;
        partner.name = values.name;
        partner.email = values.email;
        partner.image = values.image;
        partner.isCompany = values.isCompany;
        partner.phone = values.phone;
        partner.mobile = values.mobile;
        partner.company = values.company ? Company.fromJson(values.company) : null;
        partner.isWriteable = values.isWriteable;
        partner.leads = values.leads ? values.leads.map(function (leadValues) { return Lead.fromJson(leadValues); }) : null;
        partner.equipments = values.equipments ? values.equipments.map(function (equipmentValues) { return Equipment.fromJson(equipmentValues); }) : null; /** Customization**/
        partner.tickets = values.tickets
            ? values.tickets.map(function (ticketValues) { return Ticket.fromJson(ticketValues); })
            : null;
        partner.tasks = values.tasks ? values.tasks.map(function (taskValues) { return Task.fromJson(taskValues); }) : null;
        return partner;
    };
    Partner.fromOdooResponse = function (values) {
        var partner = new Partner();
        if (values.id && values.id > 0) {
            partner.id = values.id;
        }
        partner.name = values.name;
        partner.email = values.email;
        partner.image = values.image ? "data:image/png;base64," + values.image : null;
        partner.isCompany = values.is_company;
        partner.phone = values.phone;
        partner.mobile = values.mobile;
        // Undefined should be considered as True for retro-compatibility
        partner.isWriteable = values.can_write_on_partner !== false;
        if (values.company && values.company.id && values.company.id > 0) {
            partner.company = Company.fromOdooResponse(values.company);
        }
        return partner;
    };
    /**
     * Try to find information about the given email /name.
     *
     * If we are not logged to an Odoo database, enrich the email domain with IAP.
     * Otherwise fetch the partner on the user database.
     *
     * See `getPartner`
     */
    Partner.enrichPartner = function (email, name) {
        var odooServerUrl = getOdooServerUrl();
        var odooAccessToken = getAccessToken();
        if (odooServerUrl && odooAccessToken) {
            return this.getPartner(email, name);
        }
        else {
            var _a = this._enrichFromIap(email, name), partner = _a[0], error = _a[1];
            return [partner, null, false, false, error];
        }
    };
    /**
     * Extract the email domain and send a request to IAP
     * to find information about the company.
     */
    Partner._enrichFromIap = function (email, name) {
        var odooSharedSecret = PropertiesService.getScriptProperties().getProperty("ODOO_SHARED_SECRET");
        var userEmail = Session.getEffectiveUser().getEmail();
        var senderDomain = email.split("@").pop();
        var response = postJsonRpcCached(URLS.IAP_COMPANY_ENRICHMENT, {
            email: userEmail,
            domain: senderDomain,
            secret: odooSharedSecret,
        });
        var error = new ErrorMessage();
        if (!response) {
            error.setError("http_error_iap");
        }
        else if (response.error && response.error.length) {
            error.setError(response.error);
        }
        var partner = new Partner();
        partner.name = name;
        partner.email = email;
        if (response && response.name) {
            partner.company = Company.fromIapResponse(response);
        }
        return [partner, error];
    };
    /**
     * Create a "res.partner" with the given values in the Odoo database.
     */
    Partner.savePartner = function (partnerValues) {
        var url = PropertiesService.getUserProperties().getProperty("ODOO_SERVER_URL") + URLS.PARTNER_CREATE;
        var odooAccessToken = getAccessToken();
        var response = postJsonRpc(url, partnerValues, {
            Authorization: "Bearer " + odooAccessToken,
        });
        return response && response.id;
    };
    /**
     * Fetch the given partner on the Odoo database and return all information about him.
     *
     * Return
     *      - The Partner related to the given email address
     *      - The list of Odoo companies in which the current user belongs
     *      - True if the current user can create partner in his Odoo database
     *      - True if the current user can create projects in his Odoo database
     *      - The error message if something bad happened
     */
    Partner.getPartner = function (email, name, partnerId) {
        if (partnerId === void 0) { partnerId = null; }
        var url = PropertiesService.getUserProperties().getProperty("ODOO_SERVER_URL") + URLS.GET_PARTNER;
        var odooAccessToken = getAccessToken();
        var response = postJsonRpc(url, { email: email, name: name, partner_id: partnerId }, { Authorization: "Bearer " + odooAccessToken });
        if (!response || !response.partner) {
            var error_1 = new ErrorMessage("http_error_odoo");
            var partner_1 = Partner.fromJson({ name: name, email: email });
            return [partner_1, null, false, false, error_1];
        }
        var error = new ErrorMessage();
        if (response.enrichment_info && response.enrichment_info.type) {
            error.setError(response.enrichment_info.type, response.enrichment_info.info);
        }
        else if (response.partner.enrichment_info && response.partner.enrichment_info.type) {
            error.setError(response.partner.enrichment_info.type, response.partner.enrichment_info.info);
        }
        var partner = Partner.fromOdooResponse(response.partner);
        // Parse leads
        if (response.leads) {
            partner.leads = response.leads.map(function (leadValues) { return Lead.fromOdooResponse(leadValues); });
        }

        //** Customization */
        // Parse equipments
        if (response.equipments) {
            partner.equipments = response.equipments.map(function (equipmentValues) { return Equipment.fromOdooResponse(equipmentValues); });
        }

        // Parse tickets
        if (response.tickets) {
            partner.tickets = response.tickets.map(function (ticketValues) { return Ticket.fromOdooResponse(ticketValues); });
        }
        // Parse tasks
        if (response.tasks) {
            partner.tasks = response.tasks.map(function (taskValues) { return Task.fromOdooResponse(taskValues); });
        }
        var canCreateProject = response.can_create_project !== false;
        var odooUserCompanies = response.user_companies || null;
        // undefined must be considered as true
        var canCreatePartner = response.can_create_partner !== false;
        return [partner, odooUserCompanies, canCreatePartner, canCreateProject, error];
    };
    /**
     * Perform a search on the Odoo database and return the list of matched partners.
     */
    Partner.searchPartner = function (query) {
        var url = PropertiesService.getUserProperties().getProperty("ODOO_SERVER_URL") + URLS.SEARCH_PARTNER;
        var odooAccessToken = getAccessToken();
        var response = postJsonRpc(url, { search_term: query }, { Authorization: "Bearer " + odooAccessToken });
        if (!response || !response.partners) {
            return [[], new ErrorMessage("http_error_odoo")];
        }
        return [response.partners.map(function (values) { return Partner.fromOdooResponse(values); }), new ErrorMessage()];
    };
    /**
     * Create and enrich the company of the given partner.
     */
    Partner.createCompany = function (partnerId) {
        return this._enrichOrCreateCompany(partnerId, URLS.CREATE_COMPANY);
    };
    /**
     * Enrich the existing company.
     */
    Partner.enrichCompany = function (companyId) {
        return this._enrichOrCreateCompany(companyId, URLS.ENRICH_COMPANY);
    };
    Partner._enrichOrCreateCompany = function (partnerId, endpoint) {
        var url = PropertiesService.getUserProperties().getProperty("ODOO_SERVER_URL") + endpoint;
        var odooAccessToken = getAccessToken();
        var response = postJsonRpc(url, { partner_id: partnerId }, { Authorization: "Bearer " + odooAccessToken });
        if (!response) {
            return [null, new ErrorMessage("http_error_odoo")];
        }
        if (response.error) {
            return [null, new ErrorMessage("odoo", response.error)];
        }
        var error = new ErrorMessage();
        if (response.enrichment_info && response.enrichment_info.type) {
            error.setError(response.enrichment_info.type, response.enrichment_info.info);
        }
        if (error.code) {
            error.canCreateCompany = false;
        }
        var company = response.company ? Company.fromOdooResponse(response.company) : null;
        return [company, error];
    };
    return Partner;
}());

/**
 * Represent a "project.project" record.
 */
var Project = /** @class */ (function () {
    function Project() {
    }
    /**
     * Unserialize the project object (reverse JSON.stringify).
     */
    Project.fromJson = function (values) {
        var project = new Project();
        project.id = values.id;
        project.name = values.name;
        project.partnerName = values.partnerName;
        return project;
    };
    /**
     * Parse the dictionary return by the Odoo endpoint.
     */
    Project.fromOdooResponse = function (values) {
        var project = new Project();
        project.id = values.project_id;
        project.name = values.name;
        project.partnerName = values.partner_name;
        return project;
    };
    /**
     * Make a RPC call to the Odoo database to search a project.
     */
    Project.searchProject = function (query) {
        var url = PropertiesService.getUserProperties().getProperty("ODOO_SERVER_URL") + URLS.SEARCH_PROJECT;
        var odooAccessToken = getAccessToken();
        var response = postJsonRpc(url, { search_term: query }, { Authorization: "Bearer " + odooAccessToken });
        if (!response) {
            return [[], new ErrorMessage("http_error_odoo")];
        }
        return [response.map(function (values) { return Project.fromOdooResponse(values); }), new ErrorMessage()];
    };
    /**
     * Make a RPC call to the Odoo database to create a project
     * and return the newly created record.
     */
    Project.createProject = function (name) {
        var url = PropertiesService.getUserProperties().getProperty("ODOO_SERVER_URL") + URLS.CREATE_PROJECT;
        var odooAccessToken = getAccessToken();
        var response = postJsonRpc(url, { name: name }, { Authorization: "Bearer " + odooAccessToken });
        var projectId = response ? response.project_id || null : null;
        if (!projectId) {
            return null;
        }
        return Project.fromJson({
            id: projectId,
            name: response.name,
        });
    };
    return Project;
}());

/**
 * Object which contains all data for the application.
 *
 * In App-Script, all event handler are function and not method. We can only pass string
 * as arguments. So this object is serialized, then given to the event handler and then
 * unserialize to retrieve the original object.
 *
 * That's how we manage the state of the application without performing a big amount of
 * read / write in the cache.
 */
var State = /** @class */ (function () {
    function State(partner, canCreatePartner, email, odooUserCompanies, partners, searchedProjects, canCreateProject, error) {
        this.partner = partner;
        this.canCreatePartner = canCreatePartner;
        this.email = email;
        this.odooUserCompanies = odooUserCompanies;
        this.searchedPartners = partners;
        this.searchedProjects = searchedProjects;
        this.canCreateProject = canCreateProject;
        this.error = error;
    }
    State.prototype.toJson = function () {
        return JSON.stringify(this);
    };
    /**
     * Unserialize the state object (reverse JSON.stringify).
     */
    State.fromJson = function (json) {
        var values = JSON.parse(json);
        var partnerValues = values.partner || {};
        var canCreatePartner = values.canCreatePartner;
        var emailValues = values.email || {};
        var errorValues = values.error || {};
        var partnersValues = values.searchedPartners;
        var projectsValues = values.searchedProjects;
        var canCreateProject = values.canCreateProject;
        var partner = Partner.fromJson(partnerValues);
        var email = Email.fromJson(emailValues);
        var error = ErrorMessage.fromJson(errorValues);
        var odooUserCompanies = values.odooUserCompanies;
        var searchedPartners = partnersValues
            ? partnersValues.map(function (partnerValues) { return Partner.fromJson(partnerValues); })
            : null;
        var searchedProjects = projectsValues
            ? projectsValues.map(function (projectValues) { return Project.fromJson(projectValues); })
            : null;
        // "isCompanyDescriptionUnfolded" is not copied
        // to re-fold the description if we go back / refresh
        return new State(partner, canCreatePartner, email, odooUserCompanies, searchedPartners, searchedProjects, canCreateProject, error);
    };
    Object.defineProperty(State.prototype, "odooCompaniesParameter", {
        /**
         * Return the companies of the Odoo user as a GET parameter to add in a URL or an
         * empty string if the information is missing.
         *
         * e.g.
         *     &cids=1,3,7
         */
        get: function () {
            if (this.odooUserCompanies && this.odooUserCompanies.length) {
                var cids = this.odooUserCompanies.sort().join(",");
                return "&cids=".concat(cids);
            }
            return "";
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(State, "accessToken", {
        /**
         * Cache / user properties management.
         *
         * Introduced with static getter / setter because they are shared between all the
         * application cards.
         */
        get: function () {
            var accessToken = getAccessToken();
            return isTrue(accessToken);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(State, "isLogged", {
        get: function () {
            return !!this.accessToken;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(State, "odooLoginUrl", {
        /**
         * Return the URL require to login to the Odoo database.
         */
        get: function () {
            var loginUrl = getOdooAuthUrl();
            return isTrue(loginUrl);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(State, "odooSharedSecret", {
        /**
         * Return the shared secret between the add-on and IAP
         * (which is used to authenticate the add-on to IAP).
         */
        get: function () {
            var scriptProperties = PropertiesService.getScriptProperties();
            var sharedSecret = scriptProperties.getProperty("ODOO_SHARED_SECRET");
            return isTrue(sharedSecret);
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Dictionary which inform us on which record we already logged the email.
     * So the user can not log 2 times the same email on the same record.
     * This is stored into the cache, so we don't need to modify the Odoo models.
     *
     * Note: the cache expire after 6 hours.
     *
     * Returns:
     *     {
     *         "partners": [3, 6], // email already logged on the partner 3 and 6
     *         "leads": [7, 14],
     *     }
     */
    State.getLoggingState = function (messageId) {
        var cache = CacheService.getUserCache();
        var loggingStateStr = cache.get("ODOO_LOGGING_STATE_" + getOdooServerUrl() + "_" + messageId);
        var defaultValues = {
            partners: [],
            leads: [],
            equipments: [],           //Customization//
            tickets: [],
            tasks: [],
        };
        if (!loggingStateStr || !loggingStateStr.length) {
            return defaultValues;
        }
        return __assign(__assign({}, defaultValues), JSON.parse(loggingStateStr));
    };
    /**
     * Save the fact that we logged the email on the record, in the cache.
     *
     * Returns:
     *     True if the record was not yet marked as "logged"
     *     False if we already logged the email on the record
     */
    State.setLoggingState = function (messageId, res_model, res_id) {
        var loggingState = this.getLoggingState(messageId);
        if (loggingState[res_model].indexOf(res_id) < 0) {
            loggingState[res_model].push(res_id);
            var cache = CacheService.getUserCache();
            // The cache key depend on the current email open and on the Odoo database
            var cacheKey = "ODOO_LOGGING_STATE_" + getOdooServerUrl() + "_" + messageId;
            cache.put(cacheKey, JSON.stringify(loggingState), 21600);
            return true;
        }
        return false;
    };
    /**
     * Check if the email has not been logged on the record.
     *
     * Returns:
     *     True if the record was not yet marked as "logged"
     *     False if we already logged the email on the record
     */
    State.checkLoggingState = function (messageId, res_model, res_id) {
        var loggingState = this.getLoggingState(messageId);
        return loggingState[res_model].indexOf(res_id) < 0;
    };
    return State;
}());

function escapeHtml(unsafe) {
    unsafe = unsafe || "";
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Remove all cards and push the new one
 */
function pushToRoot(card) {
    return CardService.newNavigation().popToRoot().updateCard(card);
}
/**
 * Remove the last card and push a new one.
 */
function updateCard(card) {
    return CardService.newNavigation().updateCard(card);
}
/**
 * Push a new card on the stack.
 */
function pushCard(card) {
    return CardService.newNavigation().pushCard(card);
}
/**
 * Build a widget "Key / Value / Icon"
 *
 * If the icon if not a valid URL, take the icon from:
 * https://github.com/webdog/octicons-png
 */
function createKeyValueWidget(label, content, icon, bottomLabel, button, action, wrap, iconLabel, iconCropStyle) {
    if (icon === void 0) { icon = null; }
    if (bottomLabel === void 0) { bottomLabel = null; }
    if (button === void 0) { button = null; }
    if (action === void 0) { action = null; }
    if (wrap === void 0) { wrap = true; }
    if (iconLabel === void 0) { iconLabel = null; }
    if (iconCropStyle === void 0) { iconCropStyle = CardService.ImageCropType.SQUARE; }
    var widget = CardService.newDecoratedText().setText(content).setWrapText(true);
    if (label && label.length) {
        widget.setTopLabel(escapeHtml(label));
    }
    if (bottomLabel) {
        widget.setBottomLabel(bottomLabel);
    }
    if (button) {
        widget.setButton(button);
    }
    if (action) {
        if (typeof action === "string") {
            widget.setOpenLink(CardService.newOpenLink().setUrl(action));
        }
        else {
            widget.setOnClickAction(action);
        }
    }
    if (icon && icon.length) {
        var isIconUrl = icon.indexOf("http://") === 0 || icon.indexOf("https://") === 0 || icon.indexOf("data:image/") === 0;
        if (!isIconUrl) {
            throw new Error("Invalid icon URL");
        }
        widget.setStartIcon(CardService.newIconImage()
            .setIconUrl(icon)
            .setImageCropType(iconCropStyle)
            .setAltText(escapeHtml(iconLabel || label)));
    }
    widget.setWrapText(wrap);
    return widget;
}
function _handleActionCall(event) {
    var functionName = event.parameters.functionName;
    var state = State.fromJson(event.parameters.state);
    var parameters = JSON.parse(event.parameters.parameters);
    var inputs = event.formInputs;
    return eval(functionName)(state, parameters, inputs);
}
/**
 * Create an action which will call the given function and pass the state in arguments.
 *
 * This is necessary because event handlers can call only function and all arguments
 * must be strings. Therefor we serialized the state and other arguments to clean the code
 * and to be able to access to it in the event handlers.
 */
function actionCall(state, functionName, parameters) {
    if (parameters === void 0) { parameters = {}; }
    return CardService.newAction()
        .setFunctionName(_handleActionCall.name)
        .setParameters({
        functionName: functionName,
        state: state.toJson(),
        parameters: JSON.stringify(parameters),
    });
}
function notify(message) {
    return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText(message))
        .build();
}
function openUrl(url) {
    return CardService.newActionResponseBuilder().setOpenLink(CardService.newOpenLink().setUrl(url)).build();
}

// Icon come from https://www.iconfinder.com/
// Store as PNG 64x64
var SOCIAL_MEDIA_ICONS = {
    facebook: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAEkElEQVR4XuWav2sUQRTH305yEQXRKkQQBFE7CxGi5qIoWMRaNLmk8EdhLuQf0EZiaSsS9hS08xLif2CTEO9iFbC0tUiE6yxsctmRvTAwWWfnvTezu7cXUx3ZNzPvfeY7773ZuwD6/Dc507gWAUwFUo5LEV0IIjEWCTgRAAwHBN9azTrFLHUmp8HxIElwLtVkaUlM/Bh7BBA9D0Bcok4Vr5l0uC8AqA4n7WLnx+fen61E3VUJwYRpHlOQtvVcAOgb6KQAVwC3ZsOLe91oQwyJM65zJMe5ANDnKAzA1QeNUyNCbgsB52MHuDudBswGgHJUUQBpk1Am152uzoQfIYDH3J3HQA2EAm7MNS6LaP87gECBY4CSQAYCwGQt/CABnmDBYUdDVR6dYqkBxI5O3Xtz7Pfp4Q6AOEkBwLUpBAD3vOv2k7Pv7koZfeEGRrGPFdEmNkK2XEZZy9pJ2Zqiai18CQCv9AmwxGZzqC85AFOA7Xl1uvEZhLzvRdkyOHkEMF9NzVlevvXmrdbCbQC4wl5EQksK+TbYE+1KZ3dnfX2py56DMIBUlrhU9XWvP1zeGUI6v6SspYTX7ZX5FwCB15UjLf5MWmEqlGot/AMAxwmbcWAiodVamb+ZZfBql000SQqgOJ8GpDod7oMAQZmjF38ga+1PCytUe187EgDqbpucqdZCnoy7wbnW2vxP38Co460AfAJXDnABVHZ/VXwSnsln9b+0Z1RYTnZcAL63O66TpCPAnVS35wKIOzvemTnsHVe1pQCgl0Hf3p5S+nSbUgDQHcoLgA1MqsJd5JSUL+cIcC43PsdyoBTA3QQuGPYRwHbU56bHdV7ZRyA7W82FUdN4DKARgPV2x21sXKNijIsA1rea9TvJIVjwsX1mCujHzh9cHQAgguX2an1RBcQpo5kBYGxY5qYBwOLXZn3ZZeLCAeShFAHi9mbz2cZAAHBxEhsjuiOjm2tPO5hdWpJkjbNVgTx2F3MurgDfmgujtnOfTIZeL0QUgH4Ea4KRVgEwcOp54TmA6hjVTmoVgDrGqxPEGiGqE1kpiFoB0nqCgVeATwUoXSOkq8KmEP2ZqgC2tz42VbIVQJW4sjMdGVtwthcilNYWCzZZLXIDoJzl5oxSvQ+g7naWlycugCxU0bsRcS4QnFvXf6EAm1LKCIDdCapE4aKSogFw1ZxbErRVAZtiuDmAmqfS7A4B4NLT++k0dVAVoEpjXwH40jSNpwJQY48sAGrvnzcA09WYtPGuxwNTQNa/+SEFoxkVngQxJegKsL3I4AZKSoJZTarPgykguabpCLiqjxJP4QrAnMo7B5i6WMynf55zGiNdAUr+qmSa6JcOgK/8sCPgmgR9/dJ7mN5nnwmzvA2qn766tN1sKbt8NcZdBFMAJQlia/punvGMYztAXbQIABgg23NSFaAGqy+U9xshm08cf0kAfAgPrAI4pc4GiAuA+ysxzm6b/MxMAWltKxdAFn1A8o0P9r2hj8LRsVwAXAWgDiAGmSkgbR0uANtlyCVY7IgUAgC7AeqBZXEEOKAKAaA7hME48gCw3SkawF+GJ7pQyLDl9gAAAABJRU5ErkJggg==",
    twitter: "data:image/png;base64,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",
    github: "data:image/png;base64,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",
    linkedin: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAFb0lEQVR4Xu2bTYgcRRTH/6+ys6u7giSQg8SDiKySQDwsiDcRE5LYM+JJ8evkJ2IOkqBmJuKSbE82EDWQkyJ4UCLEg6AzmwjmpKewKmg8bIQIStBAZJFk1cmmq6RnMjvdPV2f3fOxG+e0S1e9eu9X//fqdQ1DiH6m527HstgNiCI43dV6JH7GOlaDCI7BL12Ijc/wD4WWM8x3nZpcN/y/9SnXnoag98Awnm6cLwHsefjeJ8nngwrGFILKvxaAMHiijwwNPpkGwXDu0A0jhLJviIVw5412kosroJFJVHf+bjR+6EKOO0So1A8DeM3KT8IhzHhlqzkDHKxOgUrtJ4A2t/1rFwVlgeL8RxwqbY3OGURBS2Nqq0rCvnoDDKN2G8Qb8Es3mc6xdcrUbh7j+gLA5dToFzTCvtpZMNoSOmmx6A/wvXvz2IFB2yDsn5uFEK/bARBV+MXKoJ3PY31C5YtNABYANiEzmFDGZRQwiWnvjzwcsLFholCTMdE1W0W/Un8CwHGjXBV4HFXvhI3jWcfaBmWzXqcVDiFw8T4Y3SIxcBkCz7kEn2cAMluua3QAhFGXT90GFuxGwItgmGyBYAuAqKFAx7LIXueg7rnNrtqMjQOwmZlh7KCClTVO1qGkBTBMQdkENBAF2DjY67HOAPIuRkYnkCUNE1WGb4Op7zHayb6nhiexq40hze4bJ+/ACPcA3A8R3EOgTYJjPRjGwBGAsX8AfgVgv4HoPAT/Foy+xsGHzwCkfE+TAnByNDrJEQD5Xsfj8smtoGuzAHYCzF6thF8BfIjl0XdxePtf6UXQ0VEkdiqqmObfWe1Wai8D4ijACrrN0KoVWITAK6h6Kc1eVkdl3lXqwsCx7tkh2P21ZyHog/ZDWzvS8STexkxxb7wVzgBAeRy62iWxGUJ8D7CxZM+ez6WLeAt+8UAHrqujihRoGne1y/EVGLb14lRo2uTgYOwB+Lu+CTewL0XQVsK6nM/+PJiHX7ovPCH6AiC7wz2wINg2VHedXpMAkopLVSDx45gpPbUmARjqZRHnljYOFYBe14ou+yKY0gKQOtWjVjgPCMY2CC8RVerC9HyNGdYAsLErOfIuNL+sJX6a+NUFMba+1co2Fm8FG70bgj0EEi8CCO80HT90VKsAqeUcFCDfKfoMjXXP4MiOJWVke7+cwOi1j0F41ImAoM8zAVBKzbURAs6jML4F0w/+axTUqyduxvjEWQB3Go2PDzqTCYCyW3MHsAe+905o2ziXy3N7QOKINQCOX3IFEHPAFYAIplB95DurYN6sTYHTvNWccLDApeEDEIgNmC0u6oKJqWP61AYsB3/q5nQ95/jbGEB7wZWFMxRBpbTPLY3g08cCq2BemC9g48WrximzYpwvGwPockgBIJcLESsCrm+ffHAvQ84NlgyMY81xVkDs7i7NqYhDJtI0Tq1hAZC8E+zyy3FHona77hlVaeG4nrMCegGgGbCuuEoguLbePQGweopgzldisVx3lWT0e4HEbqtqSVQBJjWn3WnmroCVxTUAbE4Bo4BcgTvf3kpy1RSA81vmjXQKWPVCw6KAFacdHdKeLtcX6EoLx/VyrwH9ApDWdxjViq7C6khOu1O9sutYA2RwUhWgPG7av/TQNSx9BBD6GxZz07vNKMNVlwLJzWkGn+Hr+KECYNIKS9Vp+fLVVoExgK6FhygFmsEoUk6d0jnmah6tsLa4OhZB2TRjBdjcCOl2RNng6JRlAcDkWGwCMBm4GgGoQHfuOK+ngDUE3U7lmFrxY0vyg8vEep0A1T/QXNMpkKaA5C3TDQcgCeV/ADb3AbE6MaAaIC1sFjUnngYWE2OLr2IAub0LKE+OHMBanUyOx/l/kP2VV1CLLcMAAAAASUVORK5CYII=",
    crunchbase: "data:image/jpeg;base64,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XS0YMPCT2KLsPLwCK1qRkb/OsgupoM3qNP8AVfoKUfATUe9AEBAcUyNZb3empejL+6+Xf90M3kaf6oy8tIotKOpe9F3/ACX/AP/aAAwDAQACAAMAAAAQ8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888897y8888888888888888888888oBS8888888888888888888888oBC8888888888888888888888oBC888888888888888/x73288oBC/wCecfPPPPPPPPPPQwQQQP8AygEMAEFBDbzzzzzzz+sECkwBDegEEUCU8FPzzzzzzzYEfzzw4JugEL/zy6oB7zzzzzyEHzzzzzzygEHzzzz0FbzzzzzyEH7zzzvLWgFLzzzycFTzzzzzykGPfziHPugENHzyIIdfzzzzzz+MGCJIEF+gEFMFGEEPzzzzzzzyw4gEEDTyoEEMEEpJ/wA888888888MOec88888tOet888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888//EACkRAQAAAggGAwEBAAAAAAAAAAEAERAhMUFRYcHRcYGRseHwIDChQHD/2gAIAQMBAT8Q/wAJJsnIvSM31idyVTt/n9Rg0d9p/P6jBo77T+f1GDR32n8CgTYYkzOVfj9hmaBvDMlcRtOJQCZV0+owaO+0geYnfpbC8ibgbpDlYORvFUkuFj0frv3XF7FassBZ5+FVY/nMgTklzw2o9Rg0M2kpKcMFmtIysh0TNvN4OpMfosugnDvkGBhQcEzHQviQvOHmD1Zcqnp5hEZMA3kkCKsVPHzHqMGmuIYAmGQJ7QIt3Mlv2ipIzuedCkmk+foZZieBZ+9qEBzusXYgJVFKgaluZudoznSJ1DJlzKz3OPUYNAQ1rIgZa3uL7ZSnOYxcQWZl0DKJ82pXxKn5rIwDeggl5PrX8/UYNATVxdNfiUztrNTWhFLl2Pmg4hqUBKW1Hl4l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",
};
var UI_ICONS = {
    person: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0CAYAAAA9zQYyAAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4wMTDw0eHfVFPgAACUJJREFUeNrtnWt3mkoUhl8IdxAh5Pb//1trolEDqOAgw/lwlp6mJ01iahRm3metrvZbZeZxs/eei4aUsgMhimByCAiFJoRCE0KhCaHQhEITQqEJodCEUGhCKDSh0IRQaEIoNCEUmhAKTSg0IRSaEApNCIUmhEITCk0IhSaEQhNCoQmh0IRCE0KhCaHQhFBoQig0odCEUGhCKDQhFJoQABaH4Hi6rkPTNKjrGlVVoa5rCCEgpUTXdYc/b2EYBgzDOPzbNE0YhgHbtmFZFmzbRhAE8H0fV1dXHOwjMfgbK8dRVRXKskRVVWiaBrvdDlLKk/4ftm3D8zx4nocoiuC6LkyTL1MKfSKklCjLEvP5HHVdn/3/9zwPNzc3iKKIYlPoryOEQFmWKIoCVVVd/PP4vo/RaITxeAzbtjlBFPq4iDybzSCE6N3ncxwHd3d3iOOYk0WhP47K8/kcy+Wy9581TVNkWQbHcThxFPr/nYv1eo3Hx8deRuX30pCHhwf4vs9JpNCvZZ5MJmiaZnCf37ZtPDw8IAxD7YtG7YWWUiLPc0ynU7RtO9jnsG0b9/f32ufV2veAqqoavMwA0DQNJpNJL7oxFPpC1HWNp6enwcu8p21b/PjxQ2uptRVaCIHJZHKRhZLvfq7ZbHby1UsK3fMiMM9zZSPZarXCcrnUUmothd5ut3h5eVH6GWezGdbrNYVWHSnlYNtzxz7nYrFQ/jm1Flr1VON3qqrSrkDUSujdboeiKLR6G+mWS2sl9Ha7Va6r8RGbzQZlWVJoVdMNVXrOxzx3URTaPLc2Qm+3W6xWK+jI/ogYhVYoSpVlqV103tM0jTYtPC2E3u122kbnPev1+o8Hdyn0wBBCaPPKfS/t0KEnrY3Quu5t2NO2LTabDYVWRWgdXrefidKqj4MWQuu2/PveOKj+plJeaCmltt0NHb/YWkRoCv3fODBCcxKVgjk0J1Cp9IspB6VWahyYcjAyKcP+Gl8KTQiFJoRCE0KhCdFKaN56T6FZ3RMK3VfYh9ZnHPgu1oj9z8hR6IFPIlMOphyExTGFJoRCnyEqsW33OgWj0AOHm5MYoVnZcywodB/puo5dDkZo5oyq1hMUmkJzLCg0I1Nfx4FdDqJcTUGhBz6BjNCM0ErljcyjmUNzIjkOFJoRmikHhWZkOus4sChUJDIRRmgKrRhXV1cUmpFJnXSDS98KRSbd6boOlmVRaBWwLEv7CG2aJmzbptDMHdUZA6YcCk2mDtHpo7cUUw4KrQyO4zBCq5Q/uq6rrcyGYcDzPD1qBV0mNAxDbfvRFFpBfN/XNko7jgPHcSi0amnHaDTSstsRRZEWBaFWQgNAGIbaTOyvBXEcx9p8kbUS2nEcbXLJX7/EOqVaWgltmiaiKNLqeXVLs7QSet/t0GVvh+M48H1fqzeSdn0sx3GQJAlrBgqtDmmaahGl4zjWrveupdCWZSmfS0dRpGXfXUuh98WhqsWSaZrIskzLlVFtzyYFQaDshiXf97UrBrUX2rIspGmq3HMZhqH024dCvzPxSZIot8dB5yV+rYUG1FwWTpJE673f2p/vj+NYmV6tbdtI01Tr42baC+04DsIwVObLqcs2UQr9Ts6pwkKL4ziI4xjazycIXNfFaDQa9DMEQaD1MTMK/UaUHmoxdXV1hfF4zCvPKPTrKD3U5fAkSZSpAyj0CaN0kiSDy6Udx8F4POYEUuj/43ne4LaWjsdj7TsbFPoPGIaBm5ubwRzT2kdn5s4U+t0CK03T3ktimibu7u4YnSn0x8Rx3PvdanEcs+9MoT8fpfsc/RzHUXKnIIX+RnzfR5ZlvdsXYZombm9vtbuOgUKfgCiKevVaNwwDaZpqvT2UQv8Ftm0jy7LeRMMgCAZRsFLoniKlPGzJ7INEQRDAMAxIKTk5f3qLSSk7DsN/AnddByEEqqrCdruFEAJN00AI0Yti1bZtuK57uNbMdV3Yts0UhEL/S9d1kFKiqirkeY7VaoW2bYczgYaBIAgwGo0QRZH2cmspdNu2hyhcVRU2mw2aphl+/mia8H0fnucd/rYsS6ucWyuhm6bBarVCURSo63pQkfgrcluWhTAMkSQJXNfVQmylhe66DrvdDkIIFEWBoiiUlvg9wjA8rICq/ANCygothEBZliiKAkIIbUX+Pd+2bfuV3KqJrZTQUkrsdjvkeY7FYkGJPyCOY6RpqpTYSggtpcRms0FZlliv171osQ0p1/69S0KhL5gj13WN+XyOsizRdWyp/w2O4+Dm5mbQ1/AOUui2bVFV1SFHZmpx2jw7CAKMx+PDhelD6msPSmgpJbbbLebzOVarFZeAvxnf95EkyaBOxQxCaCklhBDI8xzL5ZIinzlih2GINE0RBEHvDxH3XmghBJbLJcqyZLF34eIxiqLed0V6K3TbtsjzHLPZjDlyz0jTFFmW9XLfSO+Ebtv2sKq3Xq9pT487IuPxuHfXKPRK6KqqMJ1OKfLAxM6yrDeF48WF3hd8y+USeZ6z4Bsoo9EI19fX8DzvooXjRYVmwade4TgajZBlGVzXvUh+fXah9xvqy7LE8/MzRVZU7DRNDze6nlPsswrdti3KskSe59hsNlyq1iC/TpLkrL8scDah1+s1ptMpqqriTGso9rn2iHyr0Ps9F3meoyxLFnyas9+HHYbht6Ui3yL0r7vguOeCvBLOMOC6LrIsw2g0OnnEPqnQ3HNBjo3YaZoiDMOTtfpOJnTTNFgsFiiKQokT1OQ8mKaJMAxxfX19uEjnokJLKbFarTCdTtmCI19mfy93mqZ/tQf7y0J3XYftdnuIykwvyCnY3/r61Qspvyx0URSMyuTb0pAkSXB7e3t0bn200E3T4OXlBfP5nFGZfCtRFOH29vaoX1M4SmghBKbTKQ+kkrPhOA7u7u4QRdGnWnyfEnqfL08mE670kYsUjPf3959aafxUV7uua8pMLkbbtnh6esLLy8uHae6HQjdNg8fHR8pMLi71Pt39stBCCEZm0huklJjNZu+eaDLfy5uXyyVWqxVHkvQGIQR+/vz5x3bxH4XebDZYLpccQdI7mqbB8/Pzm7cBmO+lGuwzk75SFMWbqbD5VvK9v1OZkL7n0x8Kvf/JBkL6zqci9GKxQF3XHC0ySMzPWE/IYIUmhEITQqEJodCEUGhCoQmh0IRQaEJOyD/96qPJT5V/3AAAAABJRU5ErkJggg==",
    phone: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAFTUlEQVR4XuWaR6hlRRCGv4NxZBSMmBBzQt0oBkwoLlREEBEDCop5Y9yKggEEUQQFFYygOx1wIQOOGJDBBCYwLNSFmBFRcczOlX8853Hene7TVX26730PezPzblf8q7q7uk43AA0waf/V39P/12+x0fF286m/h2TNY072msa0Y9NMqXmLkrEyUvyh+QUA+lmgDIhF1OLIcqKJZkAKzdpOltAfC2rf9uQSsAgpCUYJxz32JAHwCPPS1nDWK3OuAHgBq0G/rAHojO82bW/0uxIgdcbvAjwKnAJsaojCT8D9wM3AegP9BhKv8V76oTpm0MYGVk/gVKsjPbqLG3iif6RmyKjOYlkCfxkjP23sk8BF1T0YqWCjQiggLxeAp4FzRtrnXhpefZYMWAds5RUMrAZOH+IrtY7HVK0WAL4FdsoA4E3gqAy+qiyhy1pK4QfAwRk79ZfA7inh8563ZMCLwEkZAIhlZQPrQidB6fTPBbIx1PqqAS7JVHA08IZlH7AAYqHp67LQWzLgJuC2FAARZdcA96V4vfMWx6wyFzJggOEsYFVsPmGM+M62GFPSKYu+/smRot8H+CRFFJn/GdgR+DOTvzqbZQmI5jtgh0xrTgBetewDIZramWEBQHY9C5xZC4BMuUXYrABcC9ybofEd4Ejg7wzembAkAWhT8ADgY6dFH7X1gyrJ7DHTJRBT1kAz+Q+A/Y2nQRHnLaiNBSiZAT0jVAuoJkgNAaXK8ZsUYen5HDA8ABwEfJgwem7O54LpAUA6dJwdF1G27JyXH14ALgCeCgDwOaC6/+vcSNTiSy0LLwCbAZ8FrrlqmqhiHLXj1wIhVYR59V4P3BNgegi4yiosFRmrnC6Nc5uvlsvQtC0rGvh0AmqX94dsOAJ422P8vGmDABiio0g/EKBLVn59HkMvojo+G+0BIecDv+kDiZw9JGDhLcCtOalpAH6ROi99CE3vJtiXoVveKwGh/wAnAmtzwlfCKY/eMQBIz4PAlQGFaogebjkVZu3wtK3JTTBh4NbAu8DeARBeA04GfvdEZNa0wQxwRuWYtkLcJGD8M8C5gJbFkhxjl0Dn1A3A3REPHwMu83wpniVSJTKg2/BVIp8fMV6t9StGZMLmgDbd9Q2sncAfpUBK7gEORVsCLwDHRnhWNXDhBH5zyBTpbg2smYBuoxq/AC8BLwNvAe8DepOQNUotgU759q1hofpANK8DarNbewW7tvL2S3j3PfAF8EMLkEB+Hng8tfRKAyA7d27rg1j36CvgvFSnGJDzinS0C2UI+R2pJk4NADoQ1kQqRc3rVJBxtwN6f7Aw2hNI9wyluNv5qRPsR2DbbpOKfaOs9Qhhu7adHmugyK73gMvbtdyBoAyS82rElhiDQa6VAZ3h2hgfAdRIiQ0F5uH2UZVolPYHlvC8lVEXAEPRJJLrgLuAULHUZeCvgDazPQo632V/VGTtDOgrVsWoWmGvmDUGMHOwGc6AbnbsIwaj8dsAdwJXlwQhobvuEsgJCXB8+5jysNgObQTUoj4NQEFlFoM6Gu0HlwJqoOjMzxoG29MAZGkux7Si7SncWPJRVQ+YpQNAIlpquethpfqNWiKlxtIBwOGRiiDVDuoljCmI9FlewMaPQcMaWsTspXc4HSKVun2B09oPrqoqPS9VngPOGARgpIFV2QNg66c9gUPbe4Zacaor9JJVwKwEtmiN0m1QjZjBm+dgP6BmtHNl5/IN1R2zjmJVfV7h0R2yNNJew2ZFP8u7wKx8culZBIA36l56WZbD0/doLP80OiWboi7klwrxhgyIoTqEdulIzAuQ//0e8C801gVQTIQNawAAAABJRU5ErkJggg==",
    home: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAEV0lEQVR4XuWZu5qMQRCG3wlWRIhEhCtA4AJYp8xu4hBwC04X4cElICFaMmcXIMAVINqElIhgPDXb/zw9vX93V/XfPQc6md2d6qqvvq6u/rp3hBsjYBz83Pe3zl4+/e/7/Pi2lp/7/FrmW2wlVrUxT+BW0DFsEwKWGbg1Uat91QrQBNeQrbGJxbLOnRJgnahJtqVNLbxVK6AWqJbEhb5nCFjFBErICk83tQ8rQVZ7NZBKhoJvFIKcI2gJdc/lcsuTIZXS051uVXuABrkLuDaGx8BlN+cpcA34o/FR06aXgMZVsA94BpwOEnkHXAR+1Uww52vex+AB4BVwLALsE3Ae+OF/33JB5rkFjgKvgSOZVfkKnAHks/mYFwHHgZeAVIBmSAVIJUhFqEeqUpJ3gRbl5gVcd3t+rzqTHUPpBdITpDfsGp3/odujWgVEgFwBHgFrxuQ7czkVrgNPCudnp+3SAdkZegM52++6y+Z0VsGKyTPFbeC+PrTesloFeCE7gXNDA8NAyANgKpg64N0jjiZWbCuZ5yZA73El3wkcs+/MhMGCqU/51gIpAuc5cMrq0FAF4lqa4gbw0xpncAUkgB50x1xM4NTA6vv4DJwLBVMqwdhWGdQDHCEicN4Ah2tnmfEnQuks8GVI3EEEACeAFzGBYyztkjyKBJMfSE1A2HVHsD7eudRMBE6trhwr40S3F8EkPeFtCYOlOuAq8HCAwDFjzVRTsWBSV4CHuFfgaDPqS6TSVpEiueM9sqggWQgwCRxV9DZGM4IpF0JLgAgcecG5lHO4JN+LYJI7xO8cHg0BxQInF1zzfay5KrbNe3ebnAgm9XW4A+UmJAWOAkQ2xxo+EkFEMMm7wveYTaoCkgKnFfAafgMf39wLU69gihEgAkdecPZnl7CxQQ1CnGS+AHwMRZCmB/SluOXER+P0Te5FlG2GCeauyyYCvNVYCQI09JkI8Bz+WwQU7LNiArpYBTFzC7prC+QmTI7HQiBFBBTG0uQhNmUEaL0Hdlsj2Mg1mGDOh9TDZiB4bgInjdiejWDTiGl6izXGoqQCLCvU2v8038FN0PAOUI2AyFZK+jdL4UxJlGyBagREznqL/3wFZBpW6xJV+/dwZgnoy2nwFjA0jxmAIZjgdzUBXvwsAX1YzQQ4oK0Btvaf3wK5HpC6C5Q0qfCYLbhrLO8x6AixlOhqV0CkelQEzGmL1d8CftkvaguE12FNg540wQKNXq1EI0fT1njnnx2Woaqw0KH5FHAOogQkyLQArEZwjsHqBCQCRgnoIc1EQK7Jpip8hgDDVjABdKQUVUBGMPl8W/zXb4K5Uovd1yOkqwgO5poJkPmlW0Du6odiSUeS2gbkTUAzkv4jknZ7rPc/uAI0STSxMWxTVfzSClA5r2lUO/EO28oQUJNM39dCCGi1mmFimvfBhRBQspqtSFsZAkpI08xZCAGtVjOVcCymiYBFANes4hAbEwFDAi3r3P+egL/+zwVTPgWxUAAAAABJRU5ErkJggg==",
    people: "data:image/png;base64,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",
    project: "data:image/png;base64,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",
    work: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAD60lEQVR4Xu2bu4oUQRSGv8FLom8gvoCBl8xUQfGWeTdQH0FQBEVkDRQEQXwDDbzvZqIiamymKPgC4htoogsjNXYPPTVVXefUbWaWnWjZ/uuc/3x1urq2p3bAnH0GwDCDJ2kco6v20ZjqQrDHSeNICqsKQGKotMYFM1vOvpnJOWvZDAOqDpjXIlKAqABEJtoBHAR2A1uFMX4BX4B3wHfhmJFMu15MAMg8w5sGsDSEq8BGTRGtdgCrQ7gL3AL+SmNo6pjqAM3ggKHbwHWpaUGsG32aWN8jALGDewyZtv8KbHBpIvKtAru0t4MEfrY1wCrqEnBfYsCncUAyMR/knrBsAKxCHgIXrN/9BD4JoewFtlnaR8BF4fixLNRtpQAsA8ctsyvACWEB4/GdArzjQ0WG1g7n9ZSgQDYAHXMagELOyo2QOGoBAANYGVodlDhJ432DcwOhKNYl9XaAcKOS2kFi+3O5BgxgeZi2hsQBcLTUZuAKcKTZym4RRy4gbGdL8L7gd7OVfg3cA/70PW5918xjyATYWaAW8WMqQ+5vwFHgh29T5svxBjikNZBjYdLmFOg/AAdcL5t8a8A+4KOPmKAFSzxaBXX2Sg4Db22FD8A14I5LHFt8ivuUruqMNX9RLnkBWEnMtvN8K04xkFK4ZKzC2wvg9BQAT4DHwDmJgZBGYTAUKvX61E7SePPdAtkApLrOON65lV4H4CH8BDibkb73qWAutAtr4dtF1QFVAGgAZ4BTD4DErESjASTQlgUwg4IENf+XNN5UAJ4CZ8QZEoQVweUFUNF4At6JoXEAtIVq9bmqE8QZAXC9kJkY2wiq3QIC4yKJALyqA5659s0iJx2RwJQ2ZIpe1gFNhiwAUtxKxyog1+8AaRGldTGPQWcHdGm3PytmILrOTDlUHfAcONV17Fo9Z/FyJJoihAF0ipwCkJB4XoaGAXScBgFkasuacFQAzOujk7HuasJR5AoD6ARLAhALrvC4MICOgaoAXE+XAjAWA0CBwtuQfgCO++il4jBDQc+y0MJ1QNUBSQCEhmTV5VPpAdQspEKu+QKgLVirdzTOBIDuVn6ktRK4TmiomtFe2c3gGW+d+wFY1SUDUNFKFAu7Q/U+YLwVFgZPLKHKcPeXo57U5qvkm7Mu3uTPeOv0fz1ugTCHCczxmLX0GR2QCL4UbSo2uvfA/jVCQH1ExtS9HXhV+pBUBcDm1PqxmENSxps5Jne5OSa3B5jJMbmItcgck/vc3MbmmJzzny1M3HadqTAR85ViaiPU2tPS1upLYojxshAdEFOYFPRCAJAWE6NbBxCiVrL9QrlrXM/eAYsGrBdA7WJq5zMd9g+NYu1DLcGZ7wAAAABJRU5ErkJggg==",
    money: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAEgUlEQVR4XuWbv49NQRTHP5cWhQ67hRDR+Q+oET/KFQURJYmGkkRJIxHlhoLQ+RXU/AcqJESxfnQaWh7nvXv33XfvzJ0zM+e+u3Zvs9n3zsz5nu/5NTN3XsEGf4oNbj/rhAAxY5TkS2MC0oEkoTcYZEyAGtEicAM4VI54DVwGvoRnSCXZPW4IAhaAt8D2hrE/gAM6EsI0aSUMCVB75iGw5AH4CDilBR8nN5cIUJHwDdjhAf8d2BlnWJ60YQSogYTK9VwxzUFZKyo2GgGtyBiIAHUNqAS78lmV676cGIgAN5y+U0D6/QngMLC3LHBb1NXCLSiFMmLd4NM2cWImAd5I2AVcB84AmzMN9g33rBsqk0KBNpk2kwAntuPAfWBrT4bXp41YN6hrQBbsi8AtYFPWLGO/ND3oNCB73WAZAeL5J9OoyiqUWv7WDAGS8+9swj6KuIgUqHM61WEVAcvAOa3b8uXGBphsniIJcHpHWt3nHqt9ky9FG9RHUSQBTt9dAG53e7VYgdGVsn+LAWvmsSDgBXCkwyI55JB9voSs8aP3dNdySAGqqWjm/w/Avo5JZH8vxar2NBcr+YYojHCKWETAT6BreSv7+wHCXkfqHAmoA9KBS/VqzDgLAhQpUDxKPbb2G5NCYnufYEFAYhFMMSDGtzrZBgFJoBRtcHzcLcfebwA5E4x8knA5dLTnsYgA44VQ8QtGQtJH4BXwFFiJZEwtnkhAqy0uw6ivpfBv4B5wNS16Aku09tdJ4Sat7r3NZsgFeIxJ2u1p4LnavQrBxAhwzizb4ceTs4AkEhVw+QNcCi+9NVNNZCwJkPmMDkQ6DRASTlpFQiQBKs8eAx7o0kE1n4sNSYf9FjUhkgB1aElNkEPRsz1uk+UM4rwakUewLwIqddIipTbIbnFPeSxudVgq3WF3bovsmwCFg1ppIC9O5d7ATUBepXc9sgi7o1DiFSkJSM7FSN2VHp++mc/l/oDcI2iQMCPzEjgaCWJGvMcI0JAakimWYCT3CXyPbMSkGAYev56BCQgBH98V+Drt2K23PdINtnV8H1SQQUCd1ZAngzh8AjUCnCJDEpBslGLgaq0wSgG/yowIUNixKpIUIZ4iOKN3yCKYZFSDNeccEvYHp22wU49VG4zxpsg2QRWLMKru/fkuQMUqCckrFkJhJzlSIDyogcx37y9kQO37aJ0yVrkUds09/cyiBnTd+4s0shtsbbI+NkNJXhBMXff+IqJALTrkdtgJsgcCvM5YkwciyhRQe9gn2DgSS47YmfkNakCxAKPa5WcbYDWUUu3vAtemByCqzZSKcQMCxnqkE8j2VbaxgTYYJEg8LWn1CZCFzjP3nj84z1wJUCkrhWo7GqcRAafYeb9a0cSAt5ANXeCrEWDj5S7QHWz3ptxDwKo+q7RUOcuQgMqA5t8WjogIUNmQJTRXtkukG+UHE94USvjJTG/pmPtmKAlY5I+mknSo08KRAv0qLJHV1w3ykeL6ez+4hqgBau+0Be1J+M8I8HGXTsw6IKAyIdRd3eStAwIyMurf0L9kF/pBN2J/MgAAAABJRU5ErkJggg==",
    interrogation: "data:image/png;base64,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",
    industry: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAADwElEQVR4Xu2bLW8VURCGnyUhKIKuJXwmKFD9AyRNFQrTIAkoHAIFOCxBYkiobIJA9A/wD5oUAUGgCQrbJafde7PsPR8zc2bPbUlXtd2Zd955Z+bs2cPSAfeAj8AtgA7oww+jK/a30e3fwHPgfc6ugDGJaP9Vyz/YHy6St4flCLgG/ChhzCWEFVflVzDeAvZLAqTuq4hYg0T8PONWCeCYkwpqVgE8wRdYnpjRNa8igLkDKmKuVFuLpbXPtZdIAE1Aja2q7+VPOBWsSAANYjMBnAK5C5ATy4lzdN+jKdLY9lgA7UZkGswrsVIScyyqbh2gEUFjGxNlxb8C0CxAKWbpfqnaLUYpxDAJMGdyi8RDjHBN33GW+wAnEiYBaqpX4+u2BozEEwuQEtypEFFd1DElZCY2YgFqKidayBQBJHlKFd3qYD82Zwo+zU3FAuRaaFhgxB0gDtpADk8uYgEEed0HngK/gFfAT8dH2Q7wEPgOvJxFgArQC8AL4PVwOhe2qoc93IHjU6ea6xLwFng8AvlcwXWFS20HXAY+AA8iWV5dHLcZCW8Ae8DmBPvIiBcthEmAgcAN4BNwO1Hi68A3Y/lD0iH5IMLK1VyASMBtYBe4kknQKkBo93fAxRS2mwAdbPW6Q9GVeXcUIDbv0se5sdGGdwGhorl5jxHQdEBq3tsIIJCvNO9mATrY7GGvg43xhixXFGHBBGnJ3ga3O9jt8/NuFaA47+tcBDXzrhVAPO8L4HHVTR2QcEo9BovznntfH0in1oDqec8KoHyFjAmQnXeF+jEBks93Ba7/oeiof7PPdw1JYCqAad5brQG1855bA9TzXlq+l4VQViSGG0bgS2Y/X+KS26aGDviT2M8v/Sw5RH0sQMAz4ElmP68WYLRqP+rhTWo/bwZOfBBSgzf7bsubnLHY8U9pvMlp8SzJdB30nud4FhLaRD3t3fjWAsX8azElQrWIIeGxFpuQfFGAooGBugRTYiMJXcIRbYWrQCQsJzaleAbIpEvLWFW8S0RL91PBxX5iwyGS1r5KnQrns8KzIsW867kAie8GZlP8tAEnO2DdrdEqfqs4aym8JLljm6mhxHEtGc0QdPZcZw9QKYqKn8q4klgr9/8ip5okanxbFemfON6Eo3ieQTyxPBVf8Dqt/DxzzWKdC+B9Jlj92tms9ieBZl8D5szHo32jO0EP0mdld+khYpVeEgISGyuJObGtnNz8JMm5/8OIG3sjkCTpMXSw/wrcNMY7624HQYC7w3+fT32l6Z6ktkruBE4AD4Cdv6iQDeptbQw+AAAAAElFTkSuQmCC",
    twitter: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAGZklEQVR4XtWaZ8gdRRSGn7UrdgUrUWzRYI36RbCABo0NuwYr2LEEURCsCFZEEDH+ETtCIvZeQCPqD0ksMViioqJoBGvU2I2uvPfOhr377eyU3b1l4P65O3PKe8qcOTMJIzISIG1BVtEd2GhLKR+FMt4DBaBM0CIobYPUAcDGpG3mPpZqe06pB7SleFt064DUSAgMo2I2UMpCrDM3VIlRDpu87I14QB0XjFkbaqwqHlYAypg0ydhD8dWBo4CDgV2ATYFVgSXAp8DrwKPAHFuJUCLvcsB/ed4D94ASIVcBLgYuAtb2iOWFwGXA4xWgLg8cD2wHXO4LwJnAbODX4oI6FVmVFyUwKYWHjaAeTtIz5QHgDOC33L8bACcB5wJbAFMSmJeXv8cDcsKtB3yZwJwUjgCWhkoTMX8K8HyV1T284Q3gEmAMOBDYC5D1NR4Ephdp2ELgPOA283F22kWxJ3YiFKxaIutI+HXLBCxaLMIDvwZ2Br7zBeBp4JDcZLnXyS15ghKTEpqs1sb4CdgvgfkGOHnEmsDibPsvY7oI2Dj7YELjBeA44JcmpMyF26nA3U3tMAU6XwCHAe8r/rWrJDCWwqGZHmUhIIso5su+idDRwEdNgGBofAhMbJBeRkrb5UPABKO0rP47sCfwTt64Rd4rAn9XJJwlKShH3O8S2sOqYwnMjYhpF+uy7/+auuLJ/EdbEvwD0H48buSUegyYkcCiGgpcClwfo03gGnn0KWZb71lqA+BdYHsPJnIzKXAL8KdrfolHzDIFimtpne+qC1QEPWUzaNn/twNnBXBV0rwJuMPEme/Sl5Shs2xc9CSPEHLxUcmsnLWgIqRLPx0AKOsHjQQWp3AP3d97HotfBfb2mBc7RSXyDVWLbSGQJLAwrZedFUZPAM+ZIuefEkFUvx8eq53HuquAq2MA0JojzWnLuj7ARbX9vG1c8WPgM+Bb4GzgNA9FYqdEe0DGsB9JyqmcC+iK7zNU0od6QP7MvBqgRLWHU8rhnHBCfuuz9TiKom8CqFgQcopR7aGqqKa5dHRZyrW+he/7AK+FeoAKIMWs9FH19AHwOTAVkEeM0pAxdRKszGNlHz8BthwlTfOyGk/82ae3YNsG7wROH1UAjNzqFcprO8MWnqUAJDA1hRdHHIBrgSurlM++2fR8C5hchVyNQ1A/sFWJ/bKLkc0DdBWtEvUVS1/ARXfQ39W0WR8oqz57ZHO1xXXS05E1ejSxNUbQUAF3oo/QHQBsBULa/XSf6Qf60BuWOWp5PeMjjMsDMnyuM+1mK2BVzCIs6CO7Lbt/BWxuahgnnRCFlBPU+JjspNqnCRZglfm1A3gNHw8oEtrXdFh0WlSiGaah7s9mwA++QlkBKKCrc8HWpu21hrlmEqPoUZF3omkCN5pQ9abh6wG6pX3Em2qDEwPyhy46tgJ+LLKvojEOAMtk/T0X2L1B3ZomdQFwayhRXw8Q3R2AebZ2eSxjVzXp6QFvmp6FTq9BIwQAEdbtqooMNU2WDU8hgwQLmPwXsKuuv2Lk8A2BvLLTU7i3KU8IUNQ2Ncr1M2LeHlBAdyfT+tbTlUGOZXf+MdaX4N4AlGipMDiW7j2hLhx7wqIPqCju1fLSNV70qDoNhhBVQaTrZ73B0QsNvTBpM0fodlqV6bgHDyFC1/WAIq9J5uC0W6gQgfOlvM76lb0+X5reIZCPsUK8raUjcwIXprBSy5ZXk0YvV77xVdA1zxuAEkIbAecA5wPr5LOqa2+PBEnX8bri7nm15lLQ9T0UgA0TmJbCMeYV1gouBg18V1fnCnP7HIJth7Vrd8gDoEeJuqhUVhXTlY1l1VvfxhyDW2mV24RMYEHavTvUvaJ1uJR0rc1/3xa4GTgo1nJ1hMnx1MHmGmBmAktdZq/D0xYC2l91tdx5vBAy6ghjXm7NNEbonOpq0nOK7soBqvT0zFRnAPUB2hp6tXWX2Ub17KZvwwVAJoheaWv7UY7YH9Ab3DpDOUYvQ581F7BRB5k6AmRrfQEo8ppo3t7taBLkBAOKagJdripsdUrTlvW9KVr0KEIvu+cDKmPzj5rH6dK269cFoAnwh4JGrAc0KryPtX3mxAjlDYCvAL7zYoRtak2xrG+K7sDpxIDv7QE27TICrmIlvz5G0Cr+IbyLdGoDEGv2GBBi1rjkCwKgDQFcArb9PQiAtoUZBP3/AS0/RFD9AttDAAAAAElFTkSuQmCC",
    timezone: "data:image/png;base64,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",
    keywords: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAFZElEQVR4XuWaW8xdQxTHf1sI0odGvKhLBA99cL+VFxUvhCASvNTlDQ+oy0s1rVtbIo3E9aFuDyQIEiFUkCB4EGmoaqWJCOKeCCEhVHBk7W/Oydn7zOxZa2bPOacxyZfvO99Zs9b6/2fNmpk1UzE3rQIGU/dGrM6ozQZwG6yRgPlwOjxiGv+aMkYCxk1rjA3lLbIheH3omNSdQcCMZk7PZueYAN+ID//XXzTMiIAggMOBI4EDgSXAfsBPwPfu52Pgqz6DoBABphE6FrgYuMCBj+H7CHgBeBaqnXlLZ0UhAmIY6u+XAnc54IEOISLr/8um4WlgLfCFyqJHaBYE7APcDVwF7Jnq+Fi/v4B7gTXA31Z9jgBTyFptjMlXS2Ag4bssQ0mo61vARcDPln1C4QhoEHsc8DJwUAHwQ5WfAWcD8nuc+OA2O0BA7xEhoLe4zJ6Bv2tpHKkV8Kf4I2Gy/zQI2Bd4BzgpA7m165vAWZqcUHgK1H4/BFxpRRCQlySnTZwboVoVWyYTCDBNj6MBWbf3yCBgF3AH8BKwA9jfJdHbgBM69MrqsBSqL8MkqPYBJsAtf6rNMDgnA/x3wJnAJx4dEgmy/F3dof9J4NIu+wkRoIZzKvCeWtovKBn91Q4dewHvA8cHZGSzJFvrnSEdJQm4B7g+g4B3geWK/ucDL3bI3QqsmwUBnwOHLRhOmkZC4I0KAg5wB6WQna3NXNH0pVQEHANsUzjfJbIK2KjQIbngj8jqcGjoFNkDAe3RrT9fBjwRd74zMp4CLonrqOf/h365kf5zgc0+mR4I8JqW0ZOTXk6TFUBOjL+Fwck3g1uA2yOGrgAeLUBAcATvA1bmoHd9H4lsoiTDfwDsPZlrGr4JSesLEBCEKOvvih4IEBUycjd4IkGWyMeU54v7geumScADUF0T24YaVgeZDm+7xCpZ/0TgNAPBsmv0ThNDDjAtZauBOw0OlhaV4svDBSNggpzLgcfTUZnI1pg5z9UiJmQNEaCxM5KRQ4okp3lpRwCyMZsaAWLoa+Dgcgyoo0ROkHIq9bbMCBg64XXmOVejK8eBTvMG4OZCBAQ9kJLUG8AinY9FpeTeQS5UWm1h0DIjwOu4gH8NWFwUVjCgG28Mngcu7PKjbwIc+GpxfA9QnB4pn8lO8dNpEWAc+SH3llch6sQnmB8Ero3R3FcEGMHH3Mr+XqpEp0O1KxaJfRCQAd40olpWvgFOBn7QdMglwAi+c9nU+BuTkTODFGHVxZgcAozgY77nRkO1BQZyxS4kqFsqAT2DV/vrE/zXHZnluPunX1OYXA8B0ZGYEfhxv0Z/S5nrJndhksSiNQJKgP8deAWQe4RDFCjkUCNl8GfcnYCiS1jEQkAJ8L+6S0xZtqRJgfMod4Uu74TkGuxHN69lbkty225H7Itq21Y4EXzndGqD9+Dq6h+dqiqeNBGQCL62/21gPf7HFU2HIx9x1gLWIrtQlOtiPge86JXSWGZ5XAtIK9eE2xUB8o7n9bRT3ciZHghQRXKykCPAy94mqKSYmPOMPYOA8vNfkHVFwCb3lC2R3RqAIyAtPBMNm7plEhAFlhEBJhzJwpkERO1mEBAjN/Z91LdaIJID6tecrg0NejcVZ8DAd4kpR1PVsVTnblsqh4T4RsiSA+RV9y9NsrKSZxofCb36mgItAhI8mVGXwgRYQnToiqVGmM9aBgENcP+nCPCOqicH+EbSEhH5o6vR4ImAkZMroFoeq6o6I/KAQR4qtdr8AfZ5qCFqN5PRE9+VA3YD0ONAtaCbcnNEQAhAGjDt6M0RAVqXU+TCJPZEQEoopgDpv0/XKtA6A/RvvKlRG+pWP9p6m5//A7jZIFJ7/vJkAAAAAElFTkSuQmCC",
    company_type: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAEqElEQVR4Xt1bS4pUMRQ9AYeCGxDbRQjiZyTuoGm6RQeOBBHFjQgiogMHgg66GxoX4EQEv7gJvxvQYYsleZVK5+V3Py/16lVn1P1ucu/Nyc39JCmD8doZAO8B/ANwEcCvSDRFb6CpATDr8bFfFC1lxGCyDZg9p8AmgFfRmG0Ae+5bjs4QEXbh6agEQKjLvPsOgF03cgswB9FqRHQcqKT4QZMHIJlgYwB48EUWwEONxzrpRU2QoivEluZz9L3BFjAnANwBZhcA2L9L7TSA8474KeMEKXrI9xAwH4DZUwB/5wTd4gkAKAp4AuC2YnlaDHkM4O4QRgIAimL+ADiZp4ag6VaImNxvAKfkADTdAlFglWtTGEEB5umDFlExOFGsn1moAaAmXIzxxBzqfBUAJDPMAWAzvp80FrFyVWVtpmgdbdwGzWHQYKdJDoAtYBHnJStbhSwMk7E50FhXNpp6MA8ALnsSqHUHwFwGcN+lvw8AfIygcfTua46+7gDEtYA4FRYCQFqUT5+4NlraRbO4xAQQ+AA/jEp1JfSMD+BNuKEH9QIJJzgWAMUwWVlg0yXQitZDe8UAGJOxQPacmElE1by4YdCeAt1zmj0EYAuisFF0oQ/gYVAAQLSfuBbA06jcywGQ6GZklWB/vHIL9LQcGYAEoQFzIH1A1RKuArgO4GZm0XL1/lALCM8LQl7PAbwE8EYjQIuenfxrdwqhkRuMEW23jKxuvD1pvgLgbdqhSTGUMLGo51Z+IBiS4YlOzwDcknCwfbUWYE9s7dF12PbdyS9Dh6Gr3mWRA+QfqbgiABgY1busEwB+tTeCet6eF/yI5kjRw+4VABbyeFYWWcDiX/KQh6FAsoRErm92gFlwcVK9GFFYQB6QMbeApNjJFVNMC5BtrwYAeGQpJ3hcAfCIKwHwAFIATdUChgLgx4e5/jptATYAss1ZverqbpaPWx7ACVu+DyMKcPj5TJDXOVhChgLJgm8A5oI7vBDkAVndhPLL82sQBdhboOLkOgWPgxPskplSpUdNkKIvIQqQ5wFFvyU0wY4PNUGKvgQAxNWgxAlJU2ESoNCyFFFgLVJhs+u2UMM8oOmBiMYCZNUZM1nQbMEsa2YUSFBspgBzwnG3ZvKZACRqahSg6n2KPgUn6HUIAKCqQXaxsw5RQANAXOx0/zMvT4sOTGOBNR8wSipMZII2DNZOhHo6tgZA7IoyCph9l86WmFEmTtGn6gNa1AJUpri8KDRmFBCbWWVAyy0g3v9Wr4ICcTGkmTNLn5YAaJQMAaDCoOdv3/nZNwCc9o54ZzglAFQ+gAKhYS1QFzWmDyi98MhpOBAA1jbq5A4AwGxGb3Mkx+L2HWD8RObS/B1hMVFaRRhc4JNclWmcIBXnqd8UNQZgbiUDLKB0PV00PyEAre8G875gCQCUnA55+UkB1NgC5uxGBIA88lopAGcBnCN+9BSugHVWix9ALb7bx8+PykGnuxMI3wl+PurbbRv7W4ACPeGqkN/jcQjgC4DvVvI1AC/qk+eGFW4/Kg0YhW5BuGE1/gbAZmkTaaOC+HVUaRNBuKdGQwBasWrFhwd3QVr8maMUpw9PqTF7/QeNcNKF4P/ZKwAAAABJRU5ErkJggg==",
    email: "data:image/png;base64,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",
    odoo: "data:image/png;base64,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",
    foundation: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAADyklEQVR4Xu2aWYoUQRCGvxbUM7ggqHgCPYgLLoj4LCiK3kNBUXwWEXGdi8wVXFE8g/NgS1ZXdVdnVVZE5NLVY9lPM12RsXz5R2ZWzsyY+Gc2Tv0u7Hyc0F7UkQCMVXsb/OLnLQEwniIKAOgt5jBwFTgPnAWO1Br4BewCO8A74LdeG3mgFQDQKeEa8BA4KhT3E3gAvNVDaCytMFb2JQEcAJ4Bt4wFuTF3gT/yOGvhXY8eAItD0fZ5RPFNhg7CHRmAsxDzGHRTSgFO9q/7I6sTvlKvC4oi1T47KQUANF9H7dVuwfus6Hlpgn/A7DTM9yTDlOeRChgkfhN4oZt930/H7w3gVUqB0thIAINuPwIXFhbx0qwjvAcuS0Xon3fzUQLQFNLYzL4BJzIddb8CJ/UF2i2VAEyOXc8eNI0IGs/2YO7WlGKfAQCaWffzqsZ4AGL8LP06X2MB0ELv7Bh1C2jHD9p9AU7pPMWBLtECH4CLuqRFK/d+4M4DxT4lALit62U446GZ6jy7vn6gipvlIXo9AKQg0vOqZz8BxxKn7TtwBsh4EIreBkOlBGE42b5JBHAJcGcK5UecmF4/JVqgCfQUuK3LvpP8E+CebmyaVeZtcC0Z9zrsClFCWI59XN8LKF6H04p3o0sqoMnOHWUfAceFdF3P39+E7Nt5bAKAi3eoPtO7K7FzrTdFdwu0C7MdmLvtM+OCp1NHRgBxi5CcZim/i8gZAciljGvRD3JCAPzOX1z2TBTACkYOAPMMFx893bGUrCLH+HVC4Vzs3KiLQ9Fr3kkKhtunAOJn3CdRA0hyOHkF+FBzAwmotPk6LZznPEkJDYi0jLrdKrRpWs451oCMCvCLqX5PzHEYUKLz3sNFSwFps1N7z5ijWV6GzWpl6rVAMoT9DiAKYuCNNQZmlhYwBVYugmqf/xWQrKGBv1Ea6apmTakAdVkD54BQKP+MEM675VxVnCbrDQHQpNLYqADkcVjgPyCNKrXUUeY+YEsU0Dfr3e9K0N0SAENKWIGYKADTZYN5cdxyBazXk6iAXjg1gOaZGWDgzsK2uGmtEwH0hpniy9DaLBdogWQVFb0TVNwHWAro2GZWadY1QGoBbSf23iu0j3EGRxbYwYOQzYmXXYEWMNRvNM0sryp6IQBJk5JzDRATKQTAOLVK8y1XQAW7RI5LPEbnQwcfJfJ0M2POwwEjnHUg5Ja8hCgi57DLljOxt0P//v6vAJDAB59PDYBGKdEwlQPbL1ppO2/dAn5RYxVZKm7Yr3ENUE5QZVaqGEsOsm3WFVUOt30WfwGGoL9B4+zGTQAAAABJRU5ErkJggg==",
    location: "data:image/png;base64,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",
    search: "data:image/png;base64,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",
    website: "data:image/png;base64,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",
    no_result: "data:image/png;base64,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",
    save_in_odoo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAADGklEQVR4XuWa7VnDMAyElSVgL7ZgIrZgL1gCniYNzYcd3Ulnpy392cjS6dU5X+1gD/cZzOxHpvqS7Qk/OKSTAeBCy1PKrjc7GQBjvnyz62pTviQAtSgGSC0W1ZQGgBbKNKWusc9XcYC6cAZCaa1OX3ILqBuL5osDEQNghbDxW0DZ9bKrQF7I8ewV+cs5xA5ALdyuoWmm+J1iAgBXCEWjjfM1EgD8ZKT4NzP7uK55N7NPcr0knAAgqbdM8mVmL9cvvs2GV8a6mBp/aCQAPyEmbIxabNQx71WLtIYrhwTg5mMCNmeqYcAdoINEAtAVLpyqC1qk9YrDIQEwA/Zih5/NxDtpWUPtVLQIY3uxJrTonCE+8VDCEgCO3HWkYX+MoO5Zmj5+AIACSRS+CwB/Iho5gOBhsochpigKoJUL1lrFW4ASDTjAy+cd9weTAJAuDgDwG8hGJABkS++eWU/R0qjo0h0lp4zfJW6FI/DLjm0EABIo2ALpbRj9XQAtPPMtvqERAIjeEN3WbRxQa6xqY2jUlSACAAoclXPLtwAAF5nf5MwvM9CqizikFhKzKv1tZsSbpSl/5BzwZTa84M/uAT6hJWNDFwivzPIggL9XWUytHrFdACy2AG3TlhDILXCRMsxb4JRGiJNgO26RLaBS0wnA8XBBAFGHHK7rBGCyeu2kDQJQDX2VpyOAun7wRuhZAOydEHRA5M5wt4ZwQGQLYmuCACSOcABgDcSVxO8ErzU9gd7x7fsA5pehbdsRR045QAe4zUQGQWyBSHpsDQgAS3ZjCv1BofLjKFMrH9sAACzq0Rwg3wadAMwzLrvywAHyhrfWAADMGlpoSV8FYKvXAgEA6RpugkbnAGhiDQFA9efLIB7s4oQDxpqPeBWQwtr8SYp7lQWzdgIbbYFl1So04m9yUvArJB0AqGYVzXMMDwSwTNJuGtEWM+sAAM/VcOkxKgMwufb4Lo1Pzg8LcMAsg0/ON8Cs0OipANAkZ9o5K5ZwgELi/YHtDAC6P6iQbgPvRAAZGAo3TjnuBEC0oZorcLc8OAAGXBnKPwJQhvUL3euvQqZrBMEAAAAASUVORK5CYII=",
    open_in_odoo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAFM0lEQVR4XuWbPaseRRTHf1t4xfiKCEpqIY2ilRZqp6gkJmCuoNgKKmjlF8gnsBRF7ASFqGBU0NakCKkUbbTQVkEURA1qsXL27u6dZ3Zmz5mX3b3Bre599rz9/+fM6840/M+f5mjil7DaVUKzEHAMuBe4E9g7iKo4wD+AK8CvYZQT+7cDDwA3FbAijH4HfOvamCPgBHAOOAPcUAm46/s34DRwSQH1CHABuM0GXk3O68Brg60YAS8AbwDX2ZxapSbBfQ3cr2h/Bdxn9WCUk4ruKiFEgIB/22ioVOx34FbFiMjcXOrI098HPgwRIGX/Tf3MR8P/CDirgJNAn65MwDPAByEC3gOeTXemtjvf5J/AF8CLwC+KvzuAt4DHgRt3ZZP9DupBAqS3l2D6Dm90Jb9JoBKwBH6Un5OAVNWeMlIFCXgQuBxAJyUqRis+2ZmbGYKbk9D24NVQfQK6gGRI+jigKmPvNZR5FbwIBCtAesbzAXXLZCmitsRsblI9TtlPwvgbuD4Q3BoEmDJRKqSBl+b7aQUCStpsKcao/ql+LO+n5ztykvmz0Hx2sKiYVOJSFTBHlIVEi0wH1AAeAS9PqB3mEqAFqL1PqYaorRTwNQhomrWWpjo9zSloZWY4U/Zj5gdzNStAD3FBiT7zzV4gIf/00+Wh7N0wtiQgVMZZzeSpfu7uZH60EwC/48MhYPw9tw9YML+j6QlBAfCjsAa+Rh8QXDKvwYT48MDvkDNX9n18nXxJE+gMBGaCWWWcSlpi5qPmZfvNW0XyJPC5aLjgIlPhTUYBB/yEbCfzpkT4+wmyFXf3sB9pIKBWEzB3iFrmY9PbWAkM+wmPAj8Cr7j7kCsSMNcCRnJkRSoLstA4L5lPBa82uxUJUMt1QfBx35UJcB2pgN3snIbmPLSVMm/3XUiA3dFMLWZmPuY7LaZCAtQmpglkgtfM2t8rBMTmAXYHM5La9FaG5U8O9M0jiOfO15va8Qjo2qEfc2AiZCFgthTlO+P3wC0BS9Lb70PTg19iW+2Q1MwmMKhlByffHuQbhP/04IfMW4guk8kkoMwp8DBw0bNSCD5accNE6DHgB+BVaC4Olb4wAbPN4F3g+Z4E+f4nf4c2MEvZzpkK7wSe2QeY4n4IOA58Cfxs0kgXKl0M1VoLpEdeSaNkOTyOQZViWdPMWMVtYBh1d4RGwQpfhqyzMKucS1juXCBrW9zaB+QAWaoKorF4e4Livz3Ke4KxmV82cal9wITJJUeBbFQJJ9VSCZjE5BCQWvKuvEXXIqP1C5P4axIQWiakTIdTARYUyKHqkgRoAW4C2A9qaQJyQOboaGRH33sEdL63GAWyx/EE5EFiewJ23q1JwBrZnvVh+TbYGagwE0xIlnrguhpxS/cBKaA3ka1FQLWMrM1CLQJqxL0WiTt+rAQ0+9BWPCdYg7AqNqwEyE5szYOSJcFrleK/t44CY0zBYfBaPiobY1vOBciWmP+cgeaCbIy6K73Ew9JzrGsZLKmOJF35mtzdC/AewSp3lnYImDsu/1J/omKjQ9MxQqNNQTL/BPAmINvi7nO1/+0vnwD5P/PCRFJWthZ+H3huCMLf7Fj4ykxu07DqqXL/9lcA5fpc9/gEyG/GS1OqMyXTpfpZhSTY3nE1QwQMJCxwbS4r6BmlIfzYpsxIsmT+ZR98rAIGhyegOQetc3GyNoAa9mZHo6vQyi0YuQA6lr2lAlyZY9DcA+1dhstIAUSblLp8aP2pvxzZ9faHz248sSZQIzURG5sQEsWzIAFHC2iMgf8APqqFUJemp7AAAAAASUVORK5CYII=",
    email_in_odoo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAE20lEQVR4XuWaTagWVRjHf6MF6iJa5MWd6E6MdmK4FAraqSh+gkYkUgiCmNSmIEUXoiKCoiKR+LESFBdugkBoE0jQQkgIBBFRESMkimjiuXPGmTnvmZnnfLzvnes9cLncO8/H//mf55zzP8NkzPGRJalfouRA+TtJ0MkEiSdgFhZdp7adgFlemLZ/4jtAm0nsBkiqngAX+AEW5DMf5Zz4+YQWHernh87bWtcBAwXvXa3DQUrbAJwFFqcIOItiPAM+FQKezMHiy3l6qm9uveVkmiARnkRhhnnEaWZCQ8BtYKdZKpqYozaaLD6Ru+JVz5YA3wMfNEJbvlpoj4EdwA8+OGfQ9kPgEjDVJ75cBMipcBF42ypArjtHgK+Bf53Faen0YcYv5pvAt8BBR4rnwMfADfsuIIXZ/1sKXAHWOAL9BGwj48H0DTBm9BXX97yZexkZV8lZPQIp4w4524CH5t76yqRN4IrBG8A3wFdmi6vHfQF8AlyPqT+h7ybgAvCWFfM/0xGHal3bmLYuAspYa4HLgGwq9jgD7Af+mn5QRvObuRgeFgEngN2Otf4I2A786FjKqg6o+00B3wEfOdD+CmwG7sVUEuD7LnANWOnwvWXWu6g9e3h3QBlgHhn7yDkKyGZTH9IBe83mGbsz9HEh/bUbOEnGAmsf+gf4AjjVWOvNjmwhoDLquyCtMswvdyCVGdlDxh+tG2To8ij85GQ6D2x05L4PbAHu9jBYEGBwaPYAVzzZbOQCtdXx8HcD5Oe+qfR8/r4hXk4oe8iZ/znwZ2MvcJMdvATspBJ+F3AakM2oPkQnfAkcB2QnjhnzgAPAYWC+Fegl8JlRfNocyQgoE64wM/OeYyd2y2j9MnDL2SLzL2bz/U1bubELJKAb9ELgmJkNG89jMnaQe8voSs6OViibnGx2f3sWL+aBBOgyrW+V0RlHyDtkdBV/VM5W5Jdy9qYOjtNqrARIxn4ZDQ9aClgGXAWHnIU70xK8kLMxY+wECLgQGe0jZwdPQAlQI6OlwQs5a4+MR+ROOTtrCBDBMUVuyehqTUs7yo8cdfbokrN+BNhKsPb36N6ekUVfc0fhSYH7wMjotktT8f9CzmacIh8DkqSngP48LynpktFio5Wzfh3QtJ7IJtgFsE1GV3K27u1Pch85DgKaSfouQ30JNM9LGS03S5HK8gpLXmBWI33hZewZ7wANQW6bNKQMnIA0RXaRPHACwvtD61kRkLk/WZCD0DostLHHZJcWj7IDYpPG+guXKWKMzomSgDFNptdOXz+PXG8abYI0hInMq8VyvxLTBJoEQWWOFHia8vsVejcBvsXVo6QF64ukae/GErgEUhQWV06ct7oDxnMZSgU+Lk7hHdgBoamH1zmBBAyvkNApCSQgNN2Q/IpJTEhAaFeE+vWRqYubkIA+QJN6rit8wNfhtgL8CtPS/Rp2gLZ09TEYynyon6YAbex+VdrbARo4k7PRFq5B5IjlDp8yqQvYuONryDA2AuUp8I7aZ0Dg1ZjbDZ9IOeuAcxP/YjyWSI1/t418JT/9ufycHnEEaGYhlN6Y2FpdYV6KhkL094spyj9b06Mld1wHxIJK7W8X2fe34xvg1JCGGa9GTHcHzGTLxlCnwW1sJrMEFK0YU6+3r7oDulRcSd24vwz2rs7P4X9yK0qXsIoynwAAAABJRU5ErkJggg==",
    email_logged: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAFcUlEQVR4XuWaX8hnQxjHP7MoXMgFb+62dSesK5FLRblDxK4tJJs/qS2h5QKtbV0IbURI/sSqLSIXbpTacqMQSVFqS9tmJZJEXkfPe+a855z5zZx5Zuac9z0/O/X29vud5+93nnnmO3N+hpN8mFHyFysV0PwfxejGGCkHYAmT7kIbBmDJE9PWT3kFaD2J3AxB1QPgC36GCaXMRzMnaTq5SefqpUWXLK2rgJkGn5ytR0FSux54ETh3DINLZONn4E4B4KeTMPlmnk7oi1svuTFFMFI8I5mZ5xanmQkNAB8Bt9qlorG5KKPxkmJ5yF777DzgDeCqnmlHVxvacWAX8HFKnJsoezXwJrASI18+AGRXeBU420lAjjsHgEeBf7zJaeFMQSbN5mnAPuAhj4tfgNuB992zgCTmfrcVeBu4wmPoU2AnhqNrJ8CSEUsu9rzvexuGQ1RcthCS4QgVO4Ef7bl1XSREcEXgVOAx4GHb4rp2fwXuAN4tyX9E3RuBV4CzHJv/2op4olO1vWkbAqCxdSXwFiBNxR0vAPcDf649aKylzVwJDmcCzwC7PWv9GHAL8IlnKasqoKu3ArwGXOOJ9mvgJuDbkkwydC8C3gEu9Oh+aNe7sD13JFdAY2ALhj1UPAlIs+kOqYD7bPMs7QwxLKS+dgPPYjjd6UN/Aw8CB3trvV+RAQBaodgB6VKL/PmeSGVG7sLwW7BB5i6PWk92ppeBGzy+vwduBj6PIFgDYOPQ9ACfPWk2coDa4Xn4gw3ks9hUJj6/3AIvO5Q7ZM+/F/i91wv8YGcvAdepmL8NeA6QZtQdwhP2Ak8D0olLxhbgAWA/cIpj6A/gHsv4tD5GA6BxeIGdme2eTuyn0fpl4KeztecvbfP9Tpu5lcsEYDjoM4Cn7Gy48RzHsIsqmUa3dHYxQ2ly0uz+SkxexDMB0Hm6LkijDQeoBmh0a3+RzrbgN3T2A104XqlJARCPcRoNRwMJbAMOgYfOwpE1Cl7T2ZIxOQASXA6NTqGzswegCVBDo6XAazrrDsMxKi+dXRoAhHCsUDk0ul3TUo7yJ1udO4bobBoALhPsfF7s7QZTfMxdDE8S3AOWRocOTfX3NZ01HKSaIBIntlwmWJvR7+eN2yEaLTJaOptWAQPSZQDkhRGi0S2d7dpNBzkpqtp830nsMJTkICDc0Gg5WQpVlissucBsx8SJN442owLyASwDZTvw1eJG41BDz/VXfsA5mmVJhjzKjfbr9npMrvnWx3JVQA6g9XW+JN9stY/bu861Ju4HYJpZyAs/b7dpfLnJy/erwCXANyHTdRMsBaFUvzyGUPJyiXN4Hk0wBlJ3P/LdNLr67edw8obDXXr1f1wC/uQNO6jamR+3ArowxmZV0wnybfSTr+3Imu+Vfd4ukB+UJuUhGfF8sW8Pd5SG13wg/sWvpzkM5YIg8e3DsNcei+Xa3TdUDc+nOD0PyK+cOnl4xAYulFledbkgZCc/vA1qOGPuvOr0hLp+4dwVuCAUJZ8GgC7osaXkTY+8mO1emDQgyLVbl+E1JCfY8HzcpmwJ5JZ3mp4PBB/QqwS2uliH9f1AYuyZLLU3DIJhlSq81c0fgFBF9L8PgTC4z8eQL1sCMevjP3dBKEo+3ATT1mibZq6eBqjWtrwaf97eJt8NvNdTT2SlU4YcS6t71AnLjhmhx5bf/JhOw/RLB0AMxsLnEsQJ4By1nfHAmQ0A1wIvbfgvxkvPHJqJUMjMYhbU1TeBYBkACoSzYy6xreMV65ei2TEmK5YklezMUQj4LquA0qDG1neTjH3e9JcgYwOgtdcBZrgCNrNktcmEecawBZvbxiwBRSmW5Jusq66AIXQb6Kb+ZXBydmkK/wF/5W94wdW8qQAAAABJRU5ErkJggg==",
    reload: "data:image/png;base64,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",
    close: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAADhElEQVR4Xu2bS24UMRCGf+cOcC82SEgjWLLhOGxYJoqExIZ7wR0yyN2ebne3H/V094LZZWJX/fVV+RknoPgJAO7lX5l96+mDbju2PPFDF1oXqbORAOiM2BEcr+NiADQoZfBOHgJ5wLIANMhiXwGAc4TOgdr7FgCQMG8Jtw+Ko3AQAI6ksW0rAM7NykgE/yvgSNt6vNbsXaPKHCvgGgFuE3zUJAHwAcCPZPgbgF+0MesG5COA72mZ/Arcf7f1bHVIAPwB8C45eQPwBcArbY02h3AD8AzgKen5C+A9LSHrzqLSvio2BxD7ZhA4rtVt98FHg5YASgInKLHkfmbUz4BwA8IzcH9k/qHhE31IdiugmaES/VGVYOpbMgc8yOyETNXhDSHzuQxRgc91eGsARBCG2ehOkC6+GgC6giqVMH0tyMqoISdaBrswCtkJb8A9LZGaGT/cgHu+1BUAd/XtBHSHANfgZD9BCE/Zhaq2EgzLvpwE7Rywt2op2MhW+2xjDcBqYmwEH14tr+wDbQtb3RTVBrcmewbzCX0Ie1SAZnVw2lvUgWQA6NQYczqnEjhtiRL6MXlWAKcSHIKnMRIA6FMtzCu1w0vcJ8RPZ52nBSNpJQAgcZPvE5aze/zy8RfYXId278AS6AigWCmlUs8FV4Jvr+XbZZFSoatLRwDVREQIL0AIs/BFcPzh83y7NO4jBMCjvAsnATj8Wc4JQFsrAYAqWMpWObWZ/Awd/9ExAYBZOZbGf2cSlMKn9zMAQHLWuskZuAwetRoA6FYIZZNDaEMC3RWzb+AEYBFLCGyRxGnLDnTuMLYCJAFJ+ghhrEgKBtTlpgmE0Jejb9gyKCr7WvacjsW5u1mv9RxAyB65Yi1tVZ0yAHTLTnkpSj47mG6WGACamfPMlqdtkyHgKjBhd/OhrQA3YYV6c/ElAGA625NnRK9KEACYpLSuuArn+e4EygHROlew7xIkAJQPJExg7CBEftNResgDicYTGZPg8vuBVmWU5gTvJzKTnsojqeMui1PXwrZ7CEMACJ/JCUNsdpsqjvlMbmtQMgcYRmI5ZGSyTgYgE709yOr+ucsQwPnZlOBsALhqQLa6DCtAwv/8PoMA2GbtiI1qf+ydoCK91IAULrLtFsHKOEEEMY0mfJ2DhoAuLPveK6gLAOhlrfd7HR7FKzGd4/N6b4EqK8A3O/wnfDU9dZ3/AFrlSVG2PjV3AAAAAElFTkSuQmCC",
    check: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAADiUlEQVR4XuWZP27VQBDGP+cCIFG9MhXnoOAeFJHSUVAHIQQ1BV2kFNyDIudIRZkKCS6A0b7Yz2t7d+fv7rMh7dudme8333jXTgfzXwegN0c5V4BQ/X/9d0YAJee0c1UGQLsCzm0/hgOsMFL7czGtueQ4GQDGoO2Lk8uR7xAAkAdP79jG7Mdt9VK2yzgCB7TqnHTUlutldRIApMV4mUAiSpJzrUfgAFsiyW77Wn7jKgGQSOAXK4laXjvl3AAAP1maSAUA5+hMkGDK+wLAOwCXAL4D+Ea9qQ0ATEk14J33HOs/ALgH8DIK/hnA+1Kyf2UEUuKD7t8AnjcGYHGTam9OvBXAdl5YCh0siQ/bvEZA8kbnPN7JcNmZj1ffAbgG8MdxBFQWrUGE6jxL/Hjm1CiwUky/zgveBjfT9XBHOAD98qgT2z7esKdjcGH7VWPYtlcCGFlpPoFTLqJ+h9PMN3sbXDLWQDvFcBKffiwpR4DsmNdDkCG+uwb64lFnPAabiV3WWRB/7Nsd0JPnPNUJpgOaQ2B0nr7kUOK3eg/IiD81QfW0z8HoGO/fIfMbAK8B/ADwBcBPDt3ymuT1Ojrnk65zFZ9xwCrxJwA3kZgHAK8APNohzCJUtH3+XYbzDPgF4NlCrDeEKpccToO0AEJsLwjOnZc9sDkAliMQge0egN4yDpH4FjOvuwleALgFcPWkfHUlZjghKc658xzDr9dwHBB2LSCMIMYrrtgJmxAvvQckIMyIMpxwXH8Aunugj7/exoHcjzrjVXi2vQDhaPMCBP+PGdNI6l+2uCMQU9A6wcH2sic856nAuQmm4kghOIjnyJGv0ThgzMKFENYzP2PFHdZ0W75nAKBOTEEI/5kJf8ub5Aix6QMv5Q+LA4Z43QXQR/cEtg0bis87wwHA8TTNQMgmNohfxpTbPm6REcAsOTUOCtvbxHG8aASwSkFBMHSeI0e+xhvAcG3uboH+av6xpXP5hleWKHdMBEC+uVBMcMJHAG+HNV8BfHj6R6VrHqLldC6FA+igciPmdtTKNcVVAPCTt4VIOwFQywnT1w3nZtQr2LnQ0+cdY1wPwR4x5DIajoBWoHYfD4YzAKpY6nde0Z6rnAF4lkbF8oGpBOCTfC2xVtw8TCUAqjs1fq8DZ0cAakCtdg+oU6w96tpFO3aAz0jsGEDKD3IolQHIC7LbnIowr6kygFDMFiFMkP4CPzr8QVK5g/EAAAAASUVORK5CYII=",
    no_company: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0CAIAAACyr5FlAAAACXBIWXMAAABIAAAASABGyWs+AAAACXZwQWcAAAC0AAAAtAAUIIfWAABVF0lEQVR42u296ZJcx3YeulbmnmruGWjMIEACpEyGrSOFriIU4Sfwg/o+wHXYf/XDDlvSGRhHPOKIiQS60UPNtafMvD++vVdl7aoGSbAJEBYyeHCqa9w788u1vjUmO+fo/Xg/Ng31ti/g/fjtjvfgeD8uHO/B8X5cON6D4/24cLwHx/tx4XgPjvfjwvEeHO/HheM9ON6PC8d7cLwfF4734Hg/LhzvwfF+XDjeg+P9uHC8B8f7ceEI3tYPIxjsnGNm5upJY5y1tizLIAjCUK99xMo7XzmY6Ce97zcw7E9+51vYxvy2Qvb4WX+x/WecI2udc04ppRQ5h+cdkavfjAe8CS7vwXE54+2AQ35zfWnrl1z92DGzc0zklOL6Pc5a55xVwM778euMt6BWaoUifzoAFEKAGQ/YWjKmNMYwqyDQayBYSpH341cab1RyeICQB85aS2SJOAwrpOZ5vlhkRNTvd4GYPC+01kqxSBRmrvnKu6JB3r3x5sCxKiqIiKy1wjqdpclkenp6Nh5PRqPh0dFRmqYHBwe3bt06ODjY3dsiosUigwhRSr2HxBsYbxocjUU9Pjo9OjqazxYnpyfn5+eTySTPc2vtYrHIskxrzczb29v37t3769/9pytX9oxxzPyeZryZ8UvBAdkO3rBYLMIwjKIozwvnKAgCrdl7JxVFmabpaDQ6PT09OTmZTiej4WSxyIwxZVkYY4mImYuiMMY454wxeZ4bY7TW7Xayt7977969jz766Pr1aw2QWUtEBLuGiJjJGMPMYCp5nmuttdY//b4ufVhrfdoEfdq4JOfIOWpAHwuU53kYhvgGYwwR4bP4HtGwl0vPL0FyWGuxfkSklMKF4qWytLPZbDKZZFl2eno6nU6n0+l4PF4sFmVZOueYNLOimpZaa4moLEtjDOwRGfP5PMsXSRIPBoMbN27cu3fv5s2be7u7URwSUVEYZtaKrXNZlsVxJPNurS2KQmb2bQ2fdHtT57l5HAi2KwqjtdJ6ebVlaesN6LSuuLnMs7+CgOBl8bBLkBzwRuBPY0xRFKPRZDabjcdjaIr5fF4UBS7aesM5R6SZ2DlnLdDgiGCmVrgwxmBvaK2tNbPZbLFYEFG3242i6MaNG59++unt2zf6gx4RWUPEzphSKaW1Fqm2vkff/CiKgoh825uZnSOqPDqkFCv/Gh0VRVkURVnasiy7vVYURZhwCEW5QVkIY0wQXKb5eQmSYzqdKqXm8/n5+fnZ2dnp6el8vjDG5nlelqVSCrqmKArnHHawtTbP8yIviRSzcs7WrguHm8Qzxlhrja1fUKraT3mez+fz+XxeliaOo729/YcPH3zyySf7BzutpOUcYZazLIui6K2bM77MgLrEn0opwuIykSNjyJjSOTuZThfz/OjoxfPnz09PT+fz+WK++Ow/fnrz5rVr1671+318J+YW+00wt1E+vfZ4fXAAtt9///0f/vAHpdRsNoMuzPM8CEKtA3xzteCOmCt0W2uJWGsVBGFZWGOqt9WyhHzOIWJGa2ZmaJzl5BLleT6dTheLRRTF9+7d+0//6T/euHltMOi1262yLEUIv11kEBE0JiZNxJgpnTEmTbPxeHp2dnZ2djafz3/44YfFYpHneZZluFnFPE+nrVZ87dq1u3fv3rlzZ39/v9PpMLO1Ls+zIAiCIMCWC8PwssTkLwXHP/7jP/63//b/bW1tb21t7e7uaq1rukBlWWK9AXBcsbXWWOOsI3LklHPkHNfOciuSA+DwNIsTr5c4zchTanmej8djY0yv13348cN/+If/58qVK2EY+pf65mHhbw9YXpiB+Xw+HA7ni3Q8nM5mi/Pz89HofDabQ7haawX6oORlWRA7IlMURVEU7Vbr9p07t27dun///u7ubpIk+Fr83CUq0F+qouI4WSwyY87G48nJyWm73T48vGpKInZBEGqlHJExxhpjSktMzKxV4CqaQdYaa4mIrTUO8CDHTIHWtgKEAiaMKZ0lTLGxpiiKPM+10kora22v19va2lJKdbvdQb+/WKSQMVEUNejbGxsNB91kMpnNZsPh8PT0dDgczmazojB5VmJ/+goX4MBnIfmsjRbpXCnWQaCUns7nf/r88z/96fN+v394ePjw4cOHDx/u7e0CIg2z6Bfdws+RHOKxZnyQmf/X//w///W//r9RFCuliFmxUkpdvXql02lHURxFITMD/uBKZWmMKYhYKaWVLp01piTHthIblhwbY6yzipV11hpblEVZluSco0rRhGHYSlpxHPf6vTiK8yLHdChWnU6n02kHAbdayYMHD1qt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",
    empty_folder: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSItNjAgLTYwIDIzMCAxOTAiPgogICAgPGRlZnM+CiAgICAgICAgPHBhdGggaWQ9ImVtcHR5X3N0YXRlX2ZvbGRlcl9uZXV0cmFsLWEiIGQ9Ik04LjE1MTMzODUzLDIuMDMyNjY0OTQgQzE1LjExODE2NDYsMi4wNzEwMzk0MiAyMC4yNDU3NTIyLDIuMDkwMjI2NjYgMjMuNTM0MTAxMywyLjA5MDIyNjY2IEMyOS4yODgwNzI3LDIuNjcyNDYzMjYgMzEuNjkzNDAyNyw3LjY5OTU5MzA3IDMzLjMxMTgxMTMsNy44MDI2NjE2OCBDMzQuMzMxOTc5Niw3Ljg2NzYzMTI3IDU1Ljk5MzE3NDcsNy44NzExNzAyMiA5OC4yOTUzOTY1LDcuODEzMjc4NTMgTDk4LjI5NTM5NjQsNy44MTMyNzM4MyBDMTAyLjUyMDI1Nyw3LjgwNzQ5MiAxMDYuMDIxMzE0LDExLjA4NzkzNTEgMTA2LjI5MDEzOCwxNS4zMDQyMzgyIEwxMDkuODcyNTA3LDcxLjQ5MDk2NzUgTDEwOS44NzI1MDcsNzEuNDkwOTY3NSBDMTEwLjE1MzYzOCw3NS45MDAyOTIzIDEwNi44MDcwNzUsNzkuNzAyNjU4IDEwMi4zOTc3NSw3OS45ODM3ODg5IEMxMDIuMjI4Mjg4LDc5Ljk5NDU5MzYgMTAyLjA1ODUyNCw4MCAxMDEuODg4NzE4LDgwIEwxMy41OTE0MTE2LDgwIEwxMy41OTE0MTE2LDgwIEM5LjQ0NjQ1MzIyLDgwIDUuOTg3OTU5NzQsNzYuODM0MDY2NiA1LjYyMjU1Nzk1LDcyLjcwNTI0NTggTDAuMTM4NDIwMjA0LDEwLjczNzc4MzYgTDAuMTM4NDI1OTAxLDEwLjczNzc4MzEgQy0wLjI1MTA3MDMwOCw2LjMzNjcwOTk0IDMuMDAwOTU1MzgsMi40NTMxODYxMiA3LjQwMjAyODU3LDIuMDYzNjg5OTEgQzcuNjUxMTc2MjIsMi4wNDE2NDAyOCA3LjkwMTIyMDg4LDIuMDMxMjg3MjUgOC4xNTEzMzg1MywyLjAzMjY2NDk0IFoiLz4KICAgIDwvZGVmcz4KICAgIDxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMykiPgogICAgICAgIDxwYXRoIGZpbGw9IiNCM0JDQzciIGQ9Ik0yMC4xMDYxOTQ3LDUuMzE4ODg3NjFlLTE1IEwxMDUuMDA4NTUyLDEuNzcxOTc4MzZlLTE1IEwxMDUuMDA4NTUyLDAgQzEwOS40MjY4Myw3LjAzNjgxMzg0ZS0xNSAxMTMuMDA4NTUyLDMuNTgxNzIyIDExMy4wMDg1NTIsOCBDMTEzLjAwODU1Miw4LjExMTYyNjQ2IDExMy4wMDYyMTYsOC4yMjMyNDA3IDExMy4wMDE1NDUsOC4zMzQ3NjkzOSBMMTEwLjQwMTMwMiw3MC40MTg0NjE3IEwxMTAuNDAxMzAyLDcwLjQxODQ2MTcgQzExMC4xNzcwMDMsNzUuNzczODQ2NSAxMDUuNzcwMTQxLDgwIDEwMC40MTAwNjIsODAgTDIwLjEwNjE5NDcsODAgTDIwLjEwNjE5NDcsODAgQzE1LjY4NzkxNjcsODAgMTIuMTA2MTk0Nyw3Ni40MTgyNzggMTIuMTA2MTk0Nyw3MiBMMTIuMTA2MTk0Nyw4IEwxMi4xMDYxOTQ3LDggQzEyLjEwNjE5NDcsMy41ODE3MjIgMTUuNjg3OTE2Nyw3LjkxNzA1MTg2ZS0xNSAyMC4xMDYxOTQ3LDcuMTA1NDI3MzZlLTE1IFoiLz4KICAgICAgICA8dXNlIGZpbGw9IiNGRkYiIHhsaW5rOmhyZWY9IiNlbXB0eV9zdGF0ZV9mb2xkZXJfbmV1dHJhbC1hIi8+CiAgICAgICAgPHBhdGggc3Ryb2tlPSIjQTFBQ0JBIiBzdHJva2Utd2lkdGg9IjMiIGQ9Ik0yMy40NTU1NzU0LDMuNTkwMjIzMDUgQzIwLjE2MTAzMjcsMy41ODk5MjE1MiAxNS4wNTcyNjM0LDMuNTcwNzI2NzIgOC4xNDMwNzY0LDMuNTMyNjQyMTggQzcuOTM5ODU1ODQsMy41MzE1MjI4MSA3LjczNjY5NDU5LDMuNTM5OTM0NjUgNy41MzQyNjIxNiwzLjU1Nzg0OTk3IEMzLjk1ODM5MTE3LDMuODc0MzE1NTYgMS4zMTYxMTkyOCw3LjAyOTY3ODMgMS42MzI1ODAyNiwxMC42MDU1NTAxIEw3LjExNjcxOCw3Mi41NzMwMTIyIEM3LjQxMzYwNjk3LDc1LjkyNzY3OTEgMTAuMjIzNjMyOSw3OC41IDEzLjU5MTQxMTYsNzguNSBMMTAxLjg4ODcxOCw3OC41IEMxMDIuMDI2Njg2LDc4LjUgMTAyLjE2NDYxOCw3OC40OTU2MDczIDEwMi4zMDIzMDcsNzguNDg2ODI4NSBDMTA1Ljg4NDg4Myw3OC4yNTg0MDk3IDEwOC42MDM5NjUsNzUuMTY4OTg3NSAxMDguMzc1NTQ2LDcxLjU4NjQxMTEgTDEwNC43OTMxNzgsMTUuMzk5NjgxOCBDMTA0LjU3NDc1OCwxMS45NzM5MzQ3IDEwMS43MzAxNDksOS4zMDg1NzU1NyA5OC4yOTc0NDkyLDkuMzEzMjc3MTIgQzU1LjY2NTYzODIsOS4zNzE2MTk4NyAzNC4yOTIwNjI0LDkuMzY4MTI3OTEgMzMuMjE2NDc2Nyw5LjI5OTYyOTA1IEMzMi4zNjE2NzYxLDkuMjQ1MTkwOTQgMzEuNzM3NTY3MSw4LjgzMjc4NjYgMzAuODA3NjMzNCw3Ljk3MjI2MDQgQzMwLjY2OTI3OTMsNy44NDQyMzI1OSAzMC41MjY1MTI5LDcuNzA4MzkwMjYgMzAuMzI5ODk2MSw3LjUxODY3OTUgQzMwLjM2ODc1ODUsNy41NTYxNzY4OCAyOS45NTI1MzM3LDcuMTUzNjk0OSAyOS44MzU5MjMxLDcuMDQxODQwNSBDMjkuNDI1ODIyOSw2LjY0ODQ2Njc3IDI5LjEwMDMxMTgsNi4zNDkyOTU3MiAyOC43NjIyOTI2LDYuMDYwODIwOTQgQzI3LjA5NTE2NDgsNC42MzgwNDkgMjUuNDU2NjA2MiwzLjgwODMzNDUzIDIzLjQ1NTU3NTQsMy41OTAyMjMwNSBaIi8+CiAgICAgICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzEgMzApIj4KICAgICAgICAgICAgPGNpcmNsZSBjeD0iMy41IiBjeT0iMy41IiByPSIzLjUiIGZpbGw9IiNBMUFDQkEiLz4KICAgICAgICAgICAgPGNpcmNsZSBjeD0iNDIuNSIgY3k9IjMuNSIgcj0iMy41IiBmaWxsPSIjQTFBQ0JBIi8+CiAgICAgICAgICAgIDxwYXRoIHN0cm9rZT0iI0ExQUNCQSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2Utd2lkdGg9IjIiIGQ9Ik0xNSwxOSBMMzIsMTkiLz4KICAgICAgICA8L2c+CiAgICA8L2c+Cjwvc3ZnPgo=",
};
var IMAGES_LOGIN = {
    main_image: "data:image/png;base64,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yWTkpptukj/84Q/y3HPPyTvvvCP9/f0yYcIEQQ24++67ywknnCAbb7xR0ZxtTz31lJE+H3vsMZkzZ46kUimZPHmyfOADH5CDDjpIjjzySGlsbKzojihWWTR3S83IE8mGHKBEctoq2+nyAWWw/ZkzZ8r++3/WgMx73/tew8AHQYf/Ncjtt98uRx11lGHsxcqBBx5o7DGNjYkBxjgIKMHOAdde+2s55phBD7VvfvObAhBks1mrqaHvxmIxueCCCwxY+IsNKD/+8Y8ll8vJ1772NfMZVLbbbjt5+OGHZY011ljtZ8b7+c9/Xh544IGi4+bd2267Vfbcc6/VngM8Pv3pT8u//vWvonUAaldccYUcf/zxqz0H+Jxyyiny61//umgdW265pZmrTTfdtLILzNVWAwqEA54doNRgqsPeRGmAErxgYbScrhcuXGiG+dJLL8kWW2wxMGSkEWwrMDUKJ/qDDz7Y2EOWLVsqs2Y9Jd/97ndl0aJF5nckHCQdLQAD/8444wy57LLLzNdIOZ/4BDYUkXg8Lg0NXpAf0sqxxx5r/o9dhxiSPffcU7q6umTevLly9933yCWXXCLJZNI8c88998hnPvOZIdNjAwoqtttuu0222WYbmTFjhmy99damrSeffFK+//3vy9y5c827jAcg9Jejjz5abrjhBvM1Eg0ABgC1trbK//73P/nFL35hGDgFiQWb1JQpU6xqcvK5zx008My+++4rJ510kmy00UZGSkLa+dOf/iQA38qVKwWgpG9Ijbb67PDDDzcSDoUxfOMb35APfehDxhX8tddeM3T71a9+ZUATJwvAa6211gr7snX9qwgFKgtEDlAqMilhraS0xXLdddfK9OkeIy5uQwmuz2ZYqJqUqVMfqhhUXZRzzjlHvve9761GrNdff92AEIweRrlkyZLVbDEw9EsvvdS8G+zlJUaFpI4CgM4ee+yxWlu/+c1vjLRE4Xees4sNKHyPOgk7kV+t9eabbxqgWb58uXndD6SolDbYYAMDhjDnF1980QcWvJWT4447fkByAKSQyLRQ95prrimovD760Y/K448/PgCedp+feeYZozakLcZ2/fXXD/x85513yQEHIEGK7LLLLgaAWlqwcw2NtL/88svltNNOM9+fcML/yZVXXlnWoi5tpdlVlv9GWR1yD48JBUIAKONxYYVrzIMSSoMcd9yxRb28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",
    email: "data:image/png;base64,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",
    crm: "data:image/png;base64,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",
    project: "data:image/png;base64,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",
    search: "data:image/png;base64,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",
    ticket: "data:image/png;base64,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",
};

/**
 * Format the email body before sending it to Odoo.
 * Add error message at the end of the email, fix some CSS issues,...
 */
function _formatEmailBody(email, error) {
    var body = email.body;
    body = "<span>".concat(_t("From:"), " ").concat(escapeHtml(email.contactEmail), "</span><br/><br/>").concat(body);
    if (error.code === "attachments_size_exceeded") {
        body += "<br/><i>".concat(_t("Attachments could not be logged in Odoo because their total size exceeded the allowed maximum."), "</i>");
    }
    // Make the "attachment" links bigger, otherwise we need to scroll to fully see them
    // Can not add a <style/> tag because they are sanitized by Odoo
    body = body.replace(/class=\"gmail_chip gmail_drive_chip" style=\"/g, 'class="gmail_chip gmail_drive_chip" style=" min-height: 32px;');
    body += "<br/><br/>".concat(_t("Logged from"), "<b> ").concat(_t("Gmail Inbox"), "</b>");
    return body;
}
/**
 * Log the given email body in the chatter of the given record.
 */
function logEmail(recordId, recordModel, email) {
    var odooAccessToken = getAccessToken();
    var _a = email.getAttachments(), attachments = _a[0], error = _a[1];
    var body = _formatEmailBody(email, error);
    var url = PropertiesService.getUserProperties().getProperty("ODOO_SERVER_URL") + URLS.LOG_EMAIL;
    var response = postJsonRpc(url, { message: body, res_id: recordId, model: recordModel, attachments: attachments }, { Authorization: "Bearer " + odooAccessToken });
    if (!response) {
        error.setError("unknown");
    }
    return error;
}

function onLogEmailOnLead(state, parameters) {
    var leadId = parameters.leadId;
    if (State.checkLoggingState(state.email.messageId, "leads", leadId)) {
        state.error = logEmail(leadId, "crm.lead", state.email);
        if (!state.error.code) {
            State.setLoggingState(state.email.messageId, "leads", leadId);
        }
        return updateCard(buildView(state));
    }
    return notify(_t("Email already logged on the lead"));
}
function onEmailAlreradyLoggedOnLead(state) {
    return notify(_t("Email already logged on the lead"));
}
function onCreateLead(state) {
    var leadId = Lead.createLead(state.partner.id, state.email.body, state.email.subject);
    if (!leadId) {
        return notify(_t("Could not create the lead"));
    }
    var cids = state.odooCompaniesParameter;
    var leadUrl = PropertiesService.getUserProperties().getProperty("ODOO_SERVER_URL") +
        "/web#id=".concat(leadId, "&action=crm_mail_plugin.crm_lead_action_form_edit&model=crm.lead&view_type=form").concat(cids);
    return openUrl(leadUrl);
}
function buildLeadsView(state, card) {
    var odooServerUrl = getOdooServerUrl();
    var partner = state.partner;
    var leads = partner.leads;
    if (!leads) {
        // CRM module is not installed
        // otherwise leads should be at least an empty array
        return;
    }
    var loggingState = State.getLoggingState(state.email.messageId);
    var leadsSection = CardService.newCardSection().setHeader("<b>" + _t("Opportunities (%s)", leads.length) + "</b>");
    var cids = state.odooCompaniesParameter;
    if (state.partner.id) {
        leadsSection.addWidget(CardService.newTextButton().setText(_t("Create")).setOnClickAction(actionCall(state, onCreateLead.name)));
        for (var _i = 0, leads_1 = leads; _i < leads_1.length; _i++) {
            var lead = leads_1[_i];
            var leadRevenuesDescription = void 0;
            if (lead.recurringRevenue) {
                leadRevenuesDescription = _t("%(expected_revenue)s + %(recurring_revenue)s %(recurring_plan)s at %(probability)s%", {
                    expected_revenue: lead.expectedRevenue,
                    probability: lead.probability,
                    recurring_revenue: lead.recurringRevenue,
                    recurring_plan: lead.recurringPlan,
                });
            }
            else {
                leadRevenuesDescription = _t("%(expected_revenue)s at %(probability)s%", {
                    expected_revenue: lead.expectedRevenue,
                    probability: lead.probability,
                });
            }
            var leadButton = null;
            if (loggingState["leads"].indexOf(lead.id) >= 0) {
                leadButton = CardService.newImageButton()
                    .setAltText(_t("Email already logged on the lead"))
                    .setIconUrl(UI_ICONS.email_logged)
                    .setOnClickAction(actionCall(state, onEmailAlreradyLoggedOnLead.name));
            }
            else {
                leadButton = CardService.newImageButton()
                    .setAltText(_t("Log the email on the lead"))
                    .setIconUrl(UI_ICONS.email_in_odoo)
                    .setOnClickAction(actionCall(state, onLogEmailOnLead.name, {
                    leadId: lead.id,
                }));
            }
            leadsSection.addWidget(createKeyValueWidget(null, lead.name, null, leadRevenuesDescription, leadButton, odooServerUrl + "/web#id=".concat(lead.id, "&model=crm.lead&view_type=form").concat(cids)));
        }
    }
    else if (state.canCreatePartner) {
        leadsSection.addWidget(CardService.newTextParagraph().setText(_t("Save Contact to create new Opportunities.")));
    }
    else {
        leadsSection.addWidget(CardService.newTextParagraph().setText(_t("You can only create opportunities for existing customers.")));
    }
    card.addSection(leadsSection);
    return card;
}

/**** Maintanence Equipments Customization*****/

function onLogEmailOnEquipment(state, parameters) {
    var equipmentId = parameters.equipmentId;
    if (State.checkLoggingState(state.email.messageId, "equipments", equipmentId)) {
        state.error = logEmail(equipmentId, "maintenance.equipments", state.email);
        if (!state.error.code) {
            State.setLoggingState(state.email.messageId, "equipments", equipmentId);
        }
        return updateCard(buildView(state));
    }
    return notify(_t("Email already logged on the Equipment"));
}
function onEmailAlreradyLoggedOnEquipment(state) {
    return notify(_t("Email already logged on the equipment"));
}
function onCreateEquipment(state) {
    var equipmentId = Equipment.createEquipment(state.partner.id, state.email.body, state.email.subject);
    if (!equipmentId) {
        return notify(_t("Could not create the Equipment"));
    }
    var cids = state.odooCompaniesParameter;
    var equipmentUrl = PropertiesService.getUserProperties().getProperty("ODOO_SERVER_URL") +
        "/web#id=".concat(equipmentId, "&action=mainteance_equipment_plugin.maintenance_equipment_action_form_edit&model=maintenance.equipment&view_type=form").concat(cids);
    return openUrl(equipmentUrl);
}
function buildEquipmentsView(state, card) {
    var odooServerUrl = getOdooServerUrl();
    var partner = state.partner;
    var equipments = partner.equipments;
    if (!equipments) {       
        return;
    }
    var loggingState = State.getLoggingState(state.email.messageId);
    var equipmentsSection = CardService.newCardSection().setHeader("<b>" + _t("Equipments (%s)", equipments.length) + "</b>");
    var cids = state.odooCompaniesParameter;
    if (state.partner.id) {
        equipmentsSection.addWidget(CardService.newTextButton().setText(_t("Create")).setOnClickAction(actionCall(state, onCreateEquipment.name)));
        for (var _i = 0, equipments_1 = equipments; _i < equipments_1.length; _i++) {
            var equipment = equipments_1[_i];
           
            var equipmentButton = null;
            if (loggingState["equipments"].indexOf(equipment.id) >= 0) {
                equipmentButton = CardService.newImageButton()
                    .setAltText(_t("Email already logged on the equipment"))
                    .setIconUrl(UI_ICONS.email_logged)
                    .setOnClickAction(actionCall(state, onEmailAlreradyLoggedOnEquipment.name));
            }
            else {
                equipmentButton = CardService.newImageButton()
                    .setAltText(_t("Log the email on the Equipment"))
                    .setIconUrl(UI_ICONS.email_in_odoo)
                    .setOnClickAction(actionCall(state, onLogEmailOnEquipment.name, {
                    equipmentId: equipment.id,
                }));
            }
            equipmentsSection.addWidget(createKeyValueWidget(null, equipment.name, null, equipmentButton, odooServerUrl + "/web#id=".concat(equipment.id, "&model=maintenance.equipment&view_type=form").concat(cids)));
        }
    }
    else if (state.canCreatePartner) {
        equipmentsSection.addWidget(CardService.newTextParagraph().setText(_t("Save Contact to create new Equipments.")));
    }
    else {
        equipmentsSection.addWidget(CardService.newTextParagraph().setText(_t("You can only create Equipments for existing customers.")));
    }
    card.addSection(equipmentsSection);
    return card;
}

/*****End of Maintenance Equipments Customization */
function onSearchProjectClick(state, parameters, inputs) {
    var inputQuery = inputs.search_project_query;
    var query = (inputQuery && inputQuery.length && inputQuery[0]) || "";
    var _a = Project.searchProject(query), projects = _a[0], error = _a[1];
    state.error = error;
    state.searchedProjects = projects;
    var createTaskView = buildCreateTaskView(state, query, true);
    // If go back, show again the "Create Project" section, but do not show all old searches
    return parameters.hideCreateProjectSection ? updateCard(createTaskView) : pushCard(createTaskView);
}
function onCreateProjectClick(state, parameters, inputs) {
    var inputQuery = inputs.new_project_name;
    var projectName = (inputQuery && inputQuery.length && inputQuery[0]) || "";
    if (!projectName || !projectName.length) {
        return notify(_t("The project name is required"));
    }
    var project = Project.createProject(projectName);
    if (!project) {
        return notify(_t("Could not create the project"));
    }
    return onSelectProject(state, { project: project });
}
function onSelectProject(state, parameters) {
    var project = Project.fromJson(parameters.project);
    var task = Task.createTask(state.partner.id, project.id, state.email.body, state.email.subject);
    if (!task) {
        return notify(_t("Could not create the task"));
    }
    task.projectName = project.name;
    state.partner.tasks.push(task);
    var taskUrl = PropertiesService.getUserProperties().getProperty("ODOO_SERVER_URL") +
        "/web#id=".concat(task.id, "&action=project_mail_plugin.project_task_action_form_edit&model=project.task&view_type=form");
    // Open the URL to the Odoo task and update the card
    return CardService.newActionResponseBuilder()
        .setOpenLink(CardService.newOpenLink().setUrl(taskUrl))
        .setNavigation(pushToRoot(buildView(state)))
        .build();
}
function buildCreateTaskView(state, query, hideCreateProjectSection) {
    var _a;
    if (query === void 0) { query = ""; }
    if (hideCreateProjectSection === void 0) { hideCreateProjectSection = false; }
    var noProject = false;
    if (!state.searchedProjects) {
        // Initiate the search
        _a = Project.searchProject(""), state.searchedProjects = _a[0], state.error = _a[1];
        noProject = !state.searchedProjects.length;
    }
    getOdooServerUrl();
    var partner = state.partner;
    partner.tasks;
    var projects = state.searchedProjects;
    var card = CardService.newCardBuilder();
    if (!noProject) {
        var projectSection = CardService.newCardSection().setHeader("<b>" + _t("Create a Task in an existing Project") + "</b>");
        projectSection.addWidget(CardService.newTextInput()
            .setFieldName("search_project_query")
            .setTitle(_t("Search a Project"))
            .setValue(query || "")
            .setOnChangeAction(actionCall(state, onSearchProjectClick.name, {
            hideCreateProjectSection: hideCreateProjectSection,
        })));
        projectSection.addWidget(CardService.newTextButton()
            .setText(_t("Search"))
            .setOnClickAction(actionCall(state, onSearchProjectClick.name, {
            hideCreateProjectSection: hideCreateProjectSection,
        })));
        if (!projects.length) {
            projectSection.addWidget(CardService.newTextParagraph().setText(_t("No project found.")));
        }
        for (var _i = 0, projects_1 = projects; _i < projects_1.length; _i++) {
            var project = projects_1[_i];
            var projectCard = createKeyValueWidget(null, project.name, null, project.partnerName, null, actionCall(state, onSelectProject.name, { project: project }));
            projectSection.addWidget(projectCard);
        }
        card.addSection(projectSection);
    }
    if (!hideCreateProjectSection && state.canCreateProject) {
        var createProjectSection = CardService.newCardSection().setHeader("<b>" + _t("Create a Task in a new Project") + "</b>");
        createProjectSection.addWidget(CardService.newTextInput().setFieldName("new_project_name").setTitle(_t("Project Name")).setValue(""));
        createProjectSection.addWidget(CardService.newTextButton()
            .setText(_t("Create Project & Task"))
            .setOnClickAction(actionCall(state, onCreateProjectClick.name)));
        card.addSection(createProjectSection);
    }
    else if (noProject) {
        var noProjectSection = CardService.newCardSection();
        noProjectSection.addWidget(CardService.newImage().setImageUrl(UI_ICONS.empty_folder));
        noProjectSection.addWidget(CardService.newTextParagraph().setText("<b>" + _t("No project") + "</b>"));
        noProjectSection.addWidget(CardService.newTextParagraph().setText(_t("There are no project in your database. Please ask your project manager to create one.")));
        card.addSection(noProjectSection);
    }
    return card.build();
}

function onCreateTask(state) {
    return buildCreateTaskView(state);
}
function onLogEmailOnTask(state, parameters) {
    var taskId = parameters.taskId;
    if (State.checkLoggingState(state.email.messageId, "tasks", taskId)) {
        logEmail(taskId, "project.task", state.email);
        if (!state.error.code) {
            State.setLoggingState(state.email.messageId, "tasks", taskId);
        }
        return updateCard(buildView(state));
    }
    return notify(_t("Email already logged on the task"));
}
function onEmailAlreradyLoggedOnTask() {
    return notify(_t("Email already logged on the task"));
}
function buildTasksView(state, card) {
    var odooServerUrl = getOdooServerUrl();
    var partner = state.partner;
    var tasks = partner.tasks;
    if (!tasks) {
        return;
    }
    var loggingState = State.getLoggingState(state.email.messageId);
    var tasksSection = CardService.newCardSection().setHeader("<b>" + _t("Tasks (%s)", tasks.length) + "</b>");
    var cids = state.odooCompaniesParameter;
    if (state.partner.id) {
        tasksSection.addWidget(CardService.newTextButton().setText(_t("Create")).setOnClickAction(actionCall(state, onCreateTask.name)));
        for (var _i = 0, tasks_1 = tasks; _i < tasks_1.length; _i++) {
            var task = tasks_1[_i];
            var taskButton = null;
            if (loggingState["tasks"].indexOf(task.id) >= 0) {
                taskButton = CardService.newImageButton()
                    .setAltText(_t("Email already logged on the task"))
                    .setIconUrl(UI_ICONS.email_logged)
                    .setOnClickAction(actionCall(state, onEmailAlreradyLoggedOnTask.name));
            }
            else {
                taskButton = CardService.newImageButton()
                    .setAltText(_t("Log the email on the task"))
                    .setIconUrl(UI_ICONS.email_in_odoo)
                    .setOnClickAction(actionCall(state, onLogEmailOnTask.name, {
                    taskId: task.id,
                }));
            }
            tasksSection.addWidget(createKeyValueWidget(task.projectName, truncate(task.name, 35), null, null, taskButton, odooServerUrl + "/web#id=".concat(task.id, "&model=project.task&view_type=form").concat(cids)));
        }
    }
    else if (state.canCreatePartner) {
        tasksSection.addWidget(CardService.newTextParagraph().setText(_t("Save the contact to create new tasks.")));
    }
    else {
        tasksSection.addWidget(CardService.newTextParagraph().setText(_t("The Contact needs to exist to create Task.")));
    }
    card.addSection(tasksSection);
    return card;
}

function onCreateTicket(state) {
    var ticketId = Ticket.createTicket(state.partner.id, state.email.body, state.email.subject);
    if (!ticketId) {
        return notify(_t("Could not create the ticket"));
    }
    var cids = state.odooCompaniesParameter;
    var ticketUrl = PropertiesService.getUserProperties().getProperty("ODOO_SERVER_URL") +
        "/web#id=".concat(ticketId, "&action=helpdesk_mail_plugin.helpdesk_ticket_action_form_edit&model=helpdesk.ticket&view_type=form").concat(cids);
    return openUrl(ticketUrl);
}

function onLogEmailOnTicket(state, parameters) {
    const ticketId = parameters.ticketId;

    if (State.checkLoggingState(state.email.messageId, "tickets", ticketId)) {
        state.error = logEmail(ticketId, "helpdesk.ticket", state.email);
        if (!state.error.code) {
            State.setLoggingState(state.email.messageId, "tickets", ticketId);
        }
        return updateCard(buildView(state));
    }
    return notify(_t("Email already logged on the ticket"));
}


function onEmailAlreradyLoggedOnTicket() {
    return notify(_t("Email already logged on the ticket"));
}
function buildTicketsView(state, card) {
    var odooServerUrl = getOdooServerUrl();
    var partner = state.partner;
    var tickets = partner.tickets;
    if (!tickets) {
        return;
    }
    var loggingState = State.getLoggingState(state.email.messageId);
    var ticketsSection = CardService.newCardSection().setHeader("<b>" + _t("Tickets (%s)", tickets.length) + "</b>");
    if (state.partner.id) {
        ticketsSection.addWidget(CardService.newTextButton().setText(_t("Create")).setOnClickAction(actionCall(state, onCreateTicket.name)));
        var cids = state.odooCompaniesParameter;
        for (var _i = 0, tickets_1 = tickets; _i < tickets_1.length; _i++) {
            var ticket = tickets_1[_i];
            var ticketButton = null;
            if (loggingState["tickets"].indexOf(ticket.id) >= 0) {
                ticketButton = CardService.newImageButton()
                    .setAltText(_t("Email already logged on the ticket"))
                    .setIconUrl(UI_ICONS.email_logged)
                    .setOnClickAction(actionCall(state, onEmailAlreradyLoggedOnTicket.name));
            }
            else {
                ticketButton = CardService.newImageButton()
                    .setAltText(_t("Log the email on the ticket"))
                    .setIconUrl(UI_ICONS.email_in_odoo)
                    .setOnClickAction(actionCall(state, "onLogEmailOnTicket", {
                    ticketId: ticket.id,
                }));
            }
            ticketsSection.addWidget(createKeyValueWidget(null, ticket.name, null, null, ticketButton, odooServerUrl + "/web#id=".concat(ticket.id, "&model=helpdesk.ticket&view_type=form").concat(cids)));
        }
    }
    else if (state.canCreatePartner) {
        ticketsSection.addWidget(CardService.newTextParagraph().setText(_t("Save the contact to create new tickets.")));
    }
    else {
        ticketsSection.addWidget(CardService.newTextParagraph().setText(_t("The Contact needs to exist to create Ticket.")));
    }
    card.addSection(ticketsSection);
    return card;
}

function onSearchPartnerClick(state, parameters, inputs) {
    var inputQuery = inputs.search_partner_query;
    var query = (inputQuery && inputQuery.length && inputQuery[0]) || "";
    var _a = query && query.length ? Partner.searchPartner(query) : [[], new ErrorMessage()], partners = _a[0]; _a[1];
    state.searchedPartners = partners;
    return updateCard(buildSearchPartnerView(state, query));
}
function onLogEmailPartner(state, parameters) {
    var partnerId = parameters.partnerId;
    if (!partnerId) {
        throw new Error(_t("This contact does not exist in the Odoo database."));
    }
    if (State.checkLoggingState(state.email.messageId, "partners", partnerId)) {
        state.error = logEmail(partnerId, "res.partner", state.email);
        if (!state.error.code) {
            State.setLoggingState(state.email.messageId, "partners", partnerId);
        }
        return updateCard(buildSearchPartnerView(state, parameters.query));
    }
    return notify(_t("Email already logged on the contact"));
}
function onOpenPartner(state, parameters) {
    var partner = parameters.partner;
    var _a = Partner.getPartner(partner.email, partner.name, partner.id), newPartner = _a[0], odooUserCompanies = _a[1], canCreatePartner = _a[2], canCreateProject = _a[3], error = _a[4];
    var newState = new State(newPartner, canCreatePartner, state.email, odooUserCompanies, null, null, canCreateProject, error);
    return pushCard(buildView(newState));
}
function buildSearchPartnerView(state, query, initialSearch) {
    if (initialSearch === void 0) { initialSearch = false; }
    var loggingState = State.getLoggingState(state.email.messageId);
    var card = CardService.newCardBuilder();
    var partners = (state.searchedPartners || []).filter(function (partner) { return partner.id; });
    var searchValue = query;
    if (initialSearch && partners.length <= 1) {
        partners = [];
        searchValue = "";
    }
    var searchSection = CardService.newCardSection();
    searchSection.addWidget(CardService.newTextInput()
        .setFieldName("search_partner_query")
        .setTitle(_t("Search contact"))
        .setValue(searchValue)
        .setOnChangeAction(actionCall(state, onSearchPartnerClick.name)));
    searchSection.addWidget(CardService.newTextButton()
        .setText(_t("Search"))
        .setOnClickAction(actionCall(state, onSearchPartnerClick.name)));
    for (var _i = 0, partners_1 = partners; _i < partners_1.length; _i++) {
        var partner = partners_1[_i];
        var partnerCard = CardService.newDecoratedText()
            .setText(partner.name)
            .setWrapText(true)
            .setOnClickAction(actionCall(state, onOpenPartner.name, { partner: partner }))
            .setStartIcon(CardService.newIconImage()
            .setIconUrl(partner.image || (partner.isCompany ? UI_ICONS.no_company : UI_ICONS.person))
            .setImageCropType(CardService.ImageCropType.CIRCLE));
        if (partner.isWriteable) {
            partnerCard.setButton(loggingState["partners"].indexOf(partner.id) < 0
                ? CardService.newImageButton()
                    .setAltText(_t("Log email"))
                    .setIconUrl(UI_ICONS.email_in_odoo)
                    .setOnClickAction(actionCall(state, onLogEmailPartner.name, {
                    partnerId: partner.id,
                    query: query,
                }))
                : CardService.newImageButton()
                    .setAltText(_t("Email already logged on the contact"))
                    .setIconUrl(UI_ICONS.email_logged)
                    .setOnClickAction(actionCall(state, onEmailAlreadyLogged.name)));
        }
        if (partner.email) {
            partnerCard.setBottomLabel(partner.email);
        }
        searchSection.addWidget(partnerCard);
    }
    if ((!partners || !partners.length) && !initialSearch) {
        searchSection.addWidget(CardService.newTextParagraph().setText(_t("No contact found.")));
    }
    card.addSection(searchSection);
    return card.build();
}

function onNextLogin(event) {
    var validatedUrl = formatUrl(event.formInput.odooServerUrl);
    if (!validatedUrl) {
        return notify("Invalid URL");
    }
    clearTranslationCache();
    setOdooServerUrl(validatedUrl);
    if (!isOdooDatabaseReachable(validatedUrl)) {
        return notify("Could not connect to your database. Make sure the module is installed in Odoo (Settings > General Settings > Integrations > Mail Plugins)");
    }
    return CardService.newActionResponseBuilder()
        .setOpenLink(CardService.newOpenLink()
        .setUrl(State.odooLoginUrl)
        .setOpenAs(CardService.OpenAs.OVERLAY)
        .setOnClose(CardService.OnClose.RELOAD_ADD_ON))
        .build();
}
function buildLoginMainView() {
    var card = CardService.newCardBuilder();
    // Trick to make large centered button
    var invisibleChar = "⠀";
    var faqUrl = "https://www.odoo.com/documentation/master/applications/productivity/mail_plugins.html";
    card.addSection(CardService.newCardSection()
        .addWidget(CardService.newImage().setAltText("Connect to your Odoo database").setImageUrl(IMAGES_LOGIN.main_image))
        .addWidget(CardService.newTextInput()
        .setFieldName("odooServerUrl")
        .setTitle("Database URL")
        .setHint("e.g. company.odoo.com")
        .setValue(PropertiesService.getUserProperties().getProperty("ODOO_SERVER_URL") || ""))
        .addWidget(CardService.newTextButton()
        .setText(repeat(invisibleChar, 12) + "Login" + repeat(invisibleChar, 12))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setBackgroundColor("#00A09D")
        .setOnClickAction(CardService.newAction().setFunctionName(onNextLogin.name)))
        .addWidget(CardService.newTextParagraph().setText(repeat(invisibleChar, 13) + "<b>OR</b>"))
        .addWidget(CardService.newTextButton()
        .setText(repeat(invisibleChar, 11) + " Sign Up" + repeat(invisibleChar, 11))
        .setOpenLink(CardService.newOpenLink().setUrl("https://www.odoo.com/trial?selected_app=mail_plugin:crm:helpdesk:project")))
        .addWidget(createKeyValueWidget(null, "Create leads from emails sent to your email address.", IMAGES_LOGIN.email))
        .addWidget(createKeyValueWidget(null, "Create tickets from emails sent to your email address.", IMAGES_LOGIN.ticket))
        .addWidget(createKeyValueWidget(null, "Centralize Prospects' emails into CRM.", IMAGES_LOGIN.crm))
        .addWidget(createKeyValueWidget(null, "Generate Tasks from emails sent to your email address in any Odoo project.", IMAGES_LOGIN.project))
        .addWidget(createKeyValueWidget(null, "Search and store insights on your contacts.", IMAGES_LOGIN.search))
        .addWidget(createKeyValueWidget(null, "Attach email to the Maintenance Equipments.", IMAGES_LOGIN.search))      /**Customization**/
        .addWidget(CardService.newTextParagraph().setText(repeat(invisibleChar, 13) + "<a href=\"".concat(faqUrl, "\">FAQ</a>"))));
    return card.build();
}

function onSearchPartner(state) {
    if (!state.searchedPartners) {
        var _a = Partner.searchPartner(state.partner.email), partners = _a[0]; _a[1];
        state.searchedPartners = partners;
    }
    return buildSearchPartnerView(state, state.partner.email, true);
}
function onReloadPartner(state) {
    var _a;
    _a = Partner.getPartner(state.partner.email, state.partner.name, state.partner.id), state.partner = _a[0], state.odooUserCompanies = _a[1], state.canCreatePartner = _a[2], state.canCreateProject = _a[3], state.error = _a[4];
    return updateCard(buildView(state));
}
function buildPartnerActionView(state, partnerSection) {
    var isLogged = State.isLogged;
    var canContactOdooDatabase = state.error.canContactOdooDatabase && isLogged;
    if (canContactOdooDatabase) {
        var actionButtonSet = CardService.newButtonSet();
        if (state.partner.id) {
            actionButtonSet.addButton(CardService.newImageButton()
                .setAltText(_t("Refresh"))
                .setIconUrl(UI_ICONS.reload)
                .setOnClickAction(actionCall(state, onReloadPartner.name)));
        }
        actionButtonSet.addButton(CardService.newImageButton()
            .setAltText(_t("Search contact"))
            .setIconUrl(UI_ICONS.search)
            .setOnClickAction(actionCall(state, onSearchPartner.name)));
        partnerSection.addWidget(actionButtonSet);
    }
    else if (!isLogged) {
        // add button but it redirects to the login page
        var actionButtonSet = CardService.newButtonSet();
        actionButtonSet.addButton(CardService.newImageButton()
            .setAltText(_t("Search contact"))
            .setIconUrl(UI_ICONS.search)
            .setOnClickAction(actionCall(state, buildLoginMainView.name)));
        partnerSection.addWidget(actionButtonSet);
    }
}

function onLogEmail(state) {
    var partnerId = state.partner.id;
    if (!partnerId) {
        throw new Error(_t("This contact does not exist in the Odoo database."));
    }
    if (State.checkLoggingState(state.email.messageId, "partners", partnerId)) {
        state.error = logEmail(partnerId, "res.partner", state.email);
        if (!state.error.code) {
            State.setLoggingState(state.email.messageId, "partners", partnerId);
        }
        return updateCard(buildView(state));
    }
    return notify(_t("Email already logged on the contact"));
}
function onSavePartner(state) {
    var partnerValues = {
        name: state.partner.name,
        email: state.partner.email,
        company: state.partner.company && state.partner.company.id,
    };
    var partnerId = Partner.savePartner(partnerValues);
    if (partnerId) {
        state.partner.id = partnerId;
        state.searchedPartners = null;
        state.error = new ErrorMessage();
        return updateCard(buildView(state));
    }
    else {
        return notify(_t("Can not save the contact"));
    }
}
function onEmailAlreadyLogged(state) {
    return notify(_t("Email already logged on the contact"));
}
function buildPartnerView(state, card) {
    var partner = state.partner;
    var odooServerUrl = getOdooServerUrl();
    var canContactOdooDatabase = state.error.canContactOdooDatabase && State.isLogged;
    var loggingState = State.getLoggingState(state.email.messageId);
    var isEmailLogged = partner.id && loggingState["partners"].indexOf(partner.id) >= 0;
    var partnerSection = CardService.newCardSection().setHeader("<b>" + _t("Contact") + "</b>");
    var partnerButton = null;
    if (canContactOdooDatabase && !partner.id) {
        partnerButton = state.canCreatePartner
            ? CardService.newImageButton()
                .setAltText(_t("Save in Odoo"))
                .setIconUrl(UI_ICONS.save_in_odoo)
                .setOnClickAction(actionCall(state, onSavePartner.name))
            : null;
    }
    else if (canContactOdooDatabase && !isEmailLogged) {
        partnerButton = partner.isWriteable
            ? CardService.newImageButton()
                .setAltText(_t("Log email"))
                .setIconUrl(UI_ICONS.email_in_odoo)
                .setOnClickAction(actionCall(state, onLogEmail.name))
            : null;
    }
    else if (canContactOdooDatabase && isEmailLogged) {
        partnerButton = CardService.newImageButton()
            .setAltText(_t("Email already logged on the contact"))
            .setIconUrl(UI_ICONS.email_logged)
            .setOnClickAction(actionCall(state, onEmailAlreadyLogged.name));
    }
    else if (!State.isLogged) {
        // button "Log the email" but it redirects to the login page
        partnerButton = CardService.newImageButton()
            .setAltText(_t("Log email"))
            .setIconUrl(UI_ICONS.email_in_odoo)
            .setOnClickAction(actionCall(state, buildLoginMainView.name));
    }
    var partnerContent = [partner.email, partner.phone]
        .filter(function (x) { return x; })
        .map(function (x) { return "<font color=\"#777777\">".concat(x, "</font>"); });
    var cids = state.odooCompaniesParameter;
    var partnerCard = createKeyValueWidget(null, partner.name + "<br>" + partnerContent.join("<br>"), partner.image || (partner.isCompany ? UI_ICONS.no_company : UI_ICONS.person), null, partnerButton, partner.id
        ? odooServerUrl + "/web#id=".concat(partner.id, "&model=res.partner&view_type=form").concat(cids)
        : canContactOdooDatabase
            ? null
            : actionCall(state, buildLoginMainView.name), false, partner.email, CardService.ImageCropType.CIRCLE);
    partnerSection.addWidget(partnerCard);
    buildPartnerActionView(state, partnerSection);
    card.addSection(partnerSection);
    if (canContactOdooDatabase) {
        buildLeadsView(state, card);
        buildTicketsView(state, card);
        buildTasksView(state, card);
        buildEquipmentsView(state, card); /**Customization**/
    }
    return card;
}

function onCloseError(state) {
    state.error.code = null;
    return updateCard(buildView(state));
}
function _addError(message, state, icon) {
    if (icon === void 0) { icon = null; }
    var errorSection = CardService.newCardSection();
    errorSection.addWidget(createKeyValueWidget(null, message, icon, null, CardService.newImageButton()
        .setAltText(_t("Close"))
        .setIconUrl(UI_ICONS.close)
        .setOnClickAction(actionCall(state, onCloseError.name))));
    return errorSection;
}
function buildErrorView(state, card) {
    var error = state.error;
    var ignoredErrors = ["company_created", "company_updated"];
    if (ignoredErrors.indexOf(error.code) >= 0) {
        return;
    }
    if (error.code === "http_error_odoo") {
        var errorSection = _addError(error.message, state);
        errorSection.addWidget(CardService.newTextButton()
            .setText(_t("Login"))
            .setOnClickAction(CardService.newAction().setFunctionName(buildLoginMainView.name)));
        card.addSection(errorSection);
    }
    else if (error.code === "insufficient_credit") {
        var errorSection = _addError(error.message, state);
        errorSection.addWidget(CardService.newTextButton()
            .setText(_t("Buy new credits"))
            .setOpenLink(CardService.newOpenLink().setUrl(error.information)));
        card.addSection(errorSection);
    }
    else if (error.code === "missing_data") {
        card.addSection(_addError(error.message, state));
    }
    else {
        var errors = [error.message, error.information].filter(function (x) { return x; });
        var errorMessage = errors.join("\n");
        card.addSection(_addError(errorMessage, state));
    }
}

/**
 * Update the application state with the new company created / enriched.
 * IT could be necessary to also update the contact if the contact is the company itself.
 */
function _setContactCompany(state, company, error) {
    if (company) {
        state.partner.company = company;
        if (state.partner.id === company.id) {
            // The contact is the same partner as the company
            // update his information
            state.partner.isCompany = true;
            state.partner.image = company.image;
            state.partner.phone = company.phone;
            state.partner.mobile = company.mobile;
        }
    }
    state.error = error;
    return updateCard(buildView(state));
}
function onCreateCompany(state) {
    var _a = Partner.createCompany(state.partner.id), company = _a[0], error = _a[1];
    return _setContactCompany(state, company, error);
}
function onEnrichCompany(state) {
    var _a = Partner.enrichCompany(state.partner.company.id), company = _a[0], error = _a[1];
    return _setContactCompany(state, company, error);
}
function onUnfoldCompanyDescription(state) {
    state.isCompanyDescriptionUnfolded = true;
    return updateCard(buildView(state));
}
function buildCompanyView(state, card) {
    if (state.partner.company) {
        var odooServerUrl = getOdooServerUrl();
        var cids = state.odooCompaniesParameter;
        var company = state.partner.company;
        var companySection = CardService.newCardSection().setHeader("<b>" + _t("Company Insights") + "</b>");
        if (!state.partner.id || state.partner.id !== company.id) {
            var companyContent = [company.email, company.phone]
                .filter(function (x) { return x; })
                .map(function (x) { return "<font color=\"#777777\">".concat(x, "</font>"); });
            companySection.addWidget(createKeyValueWidget(null, company.name + "<br>" + companyContent.join("<br>"), company.image || UI_ICONS.no_company, null, null, company.id ? odooServerUrl + "/web#id=".concat(company.id, "&model=res.partner&view_type=form").concat(cids) : null, false, company.email, CardService.ImageCropType.CIRCLE));
        }
        _addSocialButtons(companySection, company);
        if (company.description) {
            var MAX_DESCRIPTION_LENGTH = 70;
            if (company.description.length < MAX_DESCRIPTION_LENGTH || state.isCompanyDescriptionUnfolded) {
                companySection.addWidget(createKeyValueWidget(_t("Description"), company.description));
            }
            else {
                companySection.addWidget(createKeyValueWidget(_t("Description"), company.description.substring(0, MAX_DESCRIPTION_LENGTH) +
                    "..." +
                    "<br/>" +
                    "<font color='#1a73e8'>" +
                    _t("Read more") +
                    "</font>", null, null, null, actionCall(state, onUnfoldCompanyDescription.name)));
            }
        }
        if (company.address) {
            companySection.addWidget(createKeyValueWidget(_t("Address"), company.address, UI_ICONS.location, null, null, "https://www.google.com/maps/search/" + encodeURIComponent(company.address).replace("/", " ")));
        }
        if (company.phones) {
            companySection.addWidget(createKeyValueWidget(_t("Phones"), company.phones, UI_ICONS.phone));
        }
        if (company.website) {
            companySection.addWidget(createKeyValueWidget(_t("Website"), company.website, UI_ICONS.website, null, null, company.website));
        }
        if (company.industry) {
            companySection.addWidget(createKeyValueWidget(_t("Industry"), company.industry, UI_ICONS.industry));
        }
        if (company.employees) {
            companySection.addWidget(createKeyValueWidget(_t("Employees"), _t("%s employees", company.employees), UI_ICONS.people));
        }
        if (company.foundedYear) {
            companySection.addWidget(createKeyValueWidget(_t("Founded Year"), "" + company.foundedYear, UI_ICONS.foundation));
        }
        if (company.tags) {
            companySection.addWidget(createKeyValueWidget(_t("Keywords"), company.tags, UI_ICONS.keywords));
        }
        if (company.companyType) {
            companySection.addWidget(createKeyValueWidget(_t("Company Type"), company.companyType, UI_ICONS.company_type));
        }
        if (company.annualRevenue) {
            companySection.addWidget(createKeyValueWidget(_t("Annual Revenue"), company.annualRevenue, UI_ICONS.money));
        }
        card.addSection(companySection);
        if (!company.isEnriched) {
            var enrichSection = CardService.newCardSection();
            enrichSection.addWidget(CardService.newTextParagraph().setText(_t("No insights for this company.")));
            if (state.error.canCreateCompany && state.canCreatePartner) {
                enrichSection.addWidget(CardService.newTextButton()
                    .setText(_t("Enrich Company"))
                    .setOnClickAction(actionCall(state, onEnrichCompany.name)));
            }
            card.addSection(enrichSection);
        }
    }
    else if (state.partner.id) {
        var companySection = CardService.newCardSection().setHeader("<b>" + _t("Company Insights") + "</b>");
        companySection.addWidget(CardService.newTextParagraph().setText(_t("No company attached to this contact.")));
        if (state.error.canCreateCompany && state.canCreatePartner) {
            companySection.addWidget(CardService.newTextButton()
                .setText(_t("Create a company"))
                .setOnClickAction(actionCall(state, onCreateCompany.name)));
        }
        card.addSection(companySection);
    }
}
function _addSocialButtons(section, company) {
    var socialMediaButtons = CardService.newButtonSet();
    var socialMedias = [
        {
            name: "Facebook",
            url: "https://facebook.com/",
            icon: SOCIAL_MEDIA_ICONS.facebook,
            key: "facebook",
        },
        {
            name: "Twitter",
            url: "https://twitter.com/",
            icon: SOCIAL_MEDIA_ICONS.twitter,
            key: "twitter",
        },
        {
            name: "LinkedIn",
            url: "https://linkedin.com/",
            icon: SOCIAL_MEDIA_ICONS.linkedin,
            key: "linkedin",
        },
        {
            name: "Github",
            url: "https://github.com/",
            icon: SOCIAL_MEDIA_ICONS.github,
            key: "github",
        },
        {
            name: "Crunchbase",
            url: "https://crunchbase.com/",
            icon: SOCIAL_MEDIA_ICONS.crunchbase,
            key: "crunchbase",
        },
    ];
    for (var _i = 0, socialMedias_1 = socialMedias; _i < socialMedias_1.length; _i++) {
        var media = socialMedias_1[_i];
        var url = company[media.key];
        if (url && url.length) {
            socialMediaButtons.addButton(CardService.newImageButton()
                .setAltText(media.name)
                .setIconUrl(media.icon)
                .setOpenLink(CardService.newOpenLink().setUrl(media.url + url)));
        }
    }
    section.addWidget(socialMediaButtons);
}

function buildDebugView() {
    var card = CardService.newCardBuilder();
    var odooServerUrl = getOdooServerUrl();
    var odooAccessToken = getAccessToken();
    card.setHeader(CardService.newCardHeader().setTitle(_t("Debug Zone")).setSubtitle(_t("Debug zone for development purpose.")));
    card.addSection(CardService.newCardSection().addWidget(createKeyValueWidget(_t("Odoo Server URL"), odooServerUrl)));
    card.addSection(CardService.newCardSection().addWidget(createKeyValueWidget(_t("Odoo Access Token"), odooAccessToken)));
    card.addSection(CardService.newCardSection().addWidget(CardService.newTextButton()
        .setText(_t("Clear Translations Cache"))
        .setOnClickAction(CardService.newAction().setFunctionName(clearTranslationCache.name))));
    return card.build();
}

function onLogout(state) {
    resetAccessToken();
    clearTranslationCache();
    var _a = Partner.enrichPartner(state.email.contactEmail, state.email.contactName), partner = _a[0], odooUserCompanies = _a[1], canCreatePartner = _a[2], canCreateProject = _a[3], error = _a[4];
    var newState = new State(partner, canCreatePartner, state.email, odooUserCompanies, null, null, canCreateProject, error);
    return pushToRoot(buildView(newState));
}
function buildCardActionsView(state, card) {
    state.error.canContactOdooDatabase && State.isLogged;
    if (State.isLogged) {
        card.addCardAction(CardService.newCardAction().setText(_t("Logout")).setOnClickAction(actionCall(state, onLogout.name)));
    }
    card.addCardAction(CardService.newCardAction().setText(_t("Debug")).setOnClickAction(actionCall(state, buildDebugView.name)));
}

function buildView(state) {
    var card = CardService.newCardBuilder();
    if (state.error.code) {
        buildErrorView(state, card);
    }
    buildPartnerView(state, card);
    buildCompanyView(state, card);
    buildCardActionsView(state, card);
    if (!State.isLogged) {
        card.setFixedFooter(CardService.newFixedFooter().setPrimaryButton(CardService.newTextButton()
            .setText(_t("Login"))
            .setBackgroundColor("#00A09D")
            .setOnClickAction(actionCall(state, buildLoginMainView.name))));
    }
    return card.build();
}

function onGmailMessageOpen(event) {
    GmailApp.setCurrentMessageAccessToken(event.messageMetadata.accessToken);
    const currentEmail = new Email(event.gmail.messageId, event.gmail.accessToken);
    const [partner, odooUserCompanies, canCreatePartner, canCreateProject, error] = Partner.enrichPartner(
        currentEmail.contactEmail,
        currentEmail.contactName
    );

    if (!partner) {
        // Should at least use the FROM headers to generate the partner
        throw new Error(_t("Error during enrichment"));
    }

    const state = new State(
        partner,
        canCreatePartner,
        currentEmail,
        odooUserCompanies,
        null,
        null,
        canCreateProject,
        error
    );
 return [buildView(state)];
   
   
}
//# sourceMappingURL=main.js.map