/**
 * Test script to verify brute force protection is working
 */
import 'dotenv/config';

const BASE_URL = 'http://localhost:5000';

async function testBruteForce() {
    console.log('='.repeat(60));
    console.log('BRUTE FORCE PROTECTION TEST');
    console.log('='.repeat(60));
    console.log();

    // Test with invalid credentials
    const testEmail = 'test@invalid.com';
    const testPassword = 'wrongpassword';

    console.log(`Testing with: ${testEmail} / ${testPassword}`);
    console.log();

    for (let i = 1; i <= 7; i++) {
        console.log(`Attempt ${i}:`);

        try {
            const res = await fetch(`${BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: testEmail, password: testPassword })
            });

            const data = await res.json();

            console.log(`  Status: ${res.status}`);
            console.log(`  Response:`, JSON.stringify(data, null, 2));

            if (data.locked) {
                console.log(`  🔒 LOCKED OUT for ${data.remainingSeconds} seconds (${Math.ceil(data.remainingSeconds / 60)} min)`);
            } else if (data.attemptsRemaining !== undefined) {
                console.log(`  ⚠️ ${data.attemptsRemaining} attempts remaining`);
            }

        } catch (err: any) {
            console.log(`  Error: ${err.message}`);
        }

        console.log();

        // Small delay between attempts
        await new Promise(r => setTimeout(r, 500));
    }

    console.log('='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
}

testBruteForce();
