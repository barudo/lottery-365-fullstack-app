export function getRandomDrawNumber(existingNumbers: number[]) {
  let number = (crypto.getRandomValues(new Uint32Array(1))[0] % 49) + 1;

  while (existingNumbers.includes(number)) {
    number = (crypto.getRandomValues(new Uint32Array(1))[0] % 49) + 1;
  }

  return number;
}
