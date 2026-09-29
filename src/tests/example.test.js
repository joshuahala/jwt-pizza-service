const { add } = require("../add");

test("1 + 1 equals 2", () => {
  expect(1 + 1).toBe(2);
});

test("add two numbers", () => {
  expect(add(4, 5)).toBe(9);
});
