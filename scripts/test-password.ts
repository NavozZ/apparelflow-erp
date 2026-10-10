import { hashPassword, verifyPassword } from "../lib/password-core";

async function main() {
  const password = "TestPassword123!";

  // Test 1: Hash the password
  const hashedPassword = await hashPassword(password);

  console.log(
    "Test 1 - Argon2id hash created:",
    hashedPassword.startsWith("$argon2id$")
  );

  // Test 2: Verify correct password
  const correctPassword = await verifyPassword(
    hashedPassword,
    password
  );

  console.log(
    "Test 2 - Correct password accepted:",
    correctPassword
  );

  // Test 3: Verify incorrect password
  const incorrectPassword = await verifyPassword(
    hashedPassword,
    "WrongPassword123!"
  );

  console.log(
    "Test 3 - Incorrect password rejected:",
    !incorrectPassword
  );

  // Test 4: Reject a short password
  let shortPasswordRejected = false;

  try {
    await hashPassword("short");
  } catch {
    shortPasswordRejected = true;
  }

  console.log(
    "Test 4 - Short password rejected:",
    shortPasswordRejected
  );

  if (
    !hashedPassword.startsWith("$argon2id$") ||
    !correctPassword ||
    incorrectPassword ||
    !shortPasswordRejected
  ) {
    throw new Error("Password security test failed");
  }

  console.log("All password security tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
