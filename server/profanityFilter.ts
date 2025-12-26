/**
 * Server-Side Profanity Filter
 * Checks for explicit, vulgar, and restricted words in text.
 */

// Broad list of explicit/vulgar words and phrases to block
const EXPLICIT_WORDS: string[] = [
    // Common profanity
    'fuck', 'shit', 'damn', 'hell', 'ass', 'bitch', 'bastard', 'crap',
    'piss', 'cock', 'dick', 'pussy', 'cunt', 'whore', 'slut', 'hoe',

    // Vulgar terms
    'boob', 'boobs', 'tit', 'tits', 'penis', 'vagina', 'anus', 'butthole',
    'nude', 'naked', 'porn', 'porno', 'xxx', 'sex', 'sexy', 'horny',
    'orgasm', 'blowjob', 'handjob', 'milf', 'dildo', 'vibrator',

    // Slurs and offensive terms
    'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded', 'spic',
    'chink', 'gook', 'wetback', 'kike', 'dyke', 'tranny', 'homo',

    // Hate/violence
    'kill', 'murder', 'rape', 'terrorist', 'nazi', 'hitler', 'kkk',
    'jihad', 'bomb', 'suicide', 'pakistan',

    // Drug references
    'cocaine', 'heroin', 'meth', 'weed', 'marijuana', 'drugs',

    // Spam patterns (impersonation attempts)
    'admin', 'moderator', 'support', 'official', 'staff', 'helpdesk',
    'administrator', 'sysadmin', 'root', 'superuser',

    // Variations with numbers (l33t speak)
    'f4ck', 'sh1t', 'b1tch', 'a55', 'd1ck', 'p0rn', 'pr0n',
    'fuk', 'fck', 'sht', 'btch', 'azz', 'dik', 'prn',
];

// Common l33t speak substitutions
const LEET_MAP: Record<string, string> = {
    '0': 'o',
    '1': 'i',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '7': 't',
    '8': 'b',
    '@': 'a',
    '$': 's',
    '!': 'i',
};

/**
 * Normalize text by converting l33t speak to regular letters
 */
function normalizeLeetSpeak(text: string): string {
    let normalized = text.toLowerCase();
    for (const [leet, letter] of Object.entries(LEET_MAP)) {
        normalized = normalized.split(leet).join(letter);
    }
    return normalized;
}

/**
 * Check if text contains any explicit words (server-side)
 * Uses smart matching - only matches standalone words, not substrings
 */
export function checkForExplicitContent(text: string): {
    isExplicit: boolean;
    detectedWord?: string;
} {
    if (!text || text.trim().length === 0) {
        return { isExplicit: false };
    }

    // Normalize the text
    const normalizedText = normalizeLeetSpeak(text.trim());

    // Split into words (handle common separators)
    const words = normalizedText.split(/[\s._\-@+]+/).filter(w => w.length > 0);

    // Check each word against the explicit list
    for (const word of words) {
        if (EXPLICIT_WORDS.includes(word)) {
            return {
                isExplicit: true,
                detectedWord: word,
            };
        }
    }

    return { isExplicit: false };
}

/**
 * Validate name and email for explicit content (server-side)
 */
export function validateRegistrationContent(name: string, email: string): {
    isValid: boolean;
    field?: 'name' | 'email';
    detectedWord?: string;
    message?: string;
} {
    // Check name
    const nameCheck = checkForExplicitContent(name);
    if (nameCheck.isExplicit) {
        return {
            isValid: false,
            field: 'name',
            detectedWord: nameCheck.detectedWord,
            message: `Registration blocked: inappropriate content in name.`
        };
    }

    // Check email username (part before @)
    const emailUsername = email.split('@')[0] || '';
    const emailCheck = checkForExplicitContent(emailUsername);
    if (emailCheck.isExplicit) {
        return {
            isValid: false,
            field: 'email',
            detectedWord: emailCheck.detectedWord,
            message: `Registration blocked: inappropriate content in email.`
        };
    }

    return { isValid: true };
}
