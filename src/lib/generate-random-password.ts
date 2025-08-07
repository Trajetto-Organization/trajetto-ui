function generateRandomPassword(length: number = 10): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  const randomValues = new Uint8Array(length);

  window.crypto.getRandomValues(randomValues);
  let password = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = randomValues[i] % charset.length;
    password += charset[randomIndex];
  }

  return password;
}

export { generateRandomPassword };
