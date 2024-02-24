const MAX_LENGTH = 5;

export function generate() {
  let res = "";
  const subset = "123456789abcdefghijklmnopqrstuvwxyz"
  for (let i = 0; i < MAX_LENGTH; i++) {
    res += subset[Math.floor(Math.random() * subset.length)];
  }
  return res;
}