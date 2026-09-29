function add(...nums) {
  return nums.reduce((a, c) => (a += c), 0);
}

module.exports = { add };
