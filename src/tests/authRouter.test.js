const request = require("supertest");
const app = require("../service");

test("register", async () => {
  const email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app)
    .post("/api/auth")
    .send({ name: "pizza diner", email: email, password: "a" });
  expect(registerRes.status).toBe(200);
  expect(registerRes.body.user).toMatchObject({
    name: "pizza diner",
    email: email,
    roles: [{ role: "diner" }],
  });
  expect(registerRes.body.user.password).toBeUndefined();
  expect(registerRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
});

test("register missing fields", async () => {
  const registerRes = await request(app)
    .post("/api/auth")
    .send({ name: "pizza diner", email: Math.random().toString(36).substring(2, 12) + "@test.com" });
  expect(registerRes.status).toBe(400);
  expect(registerRes.body).toMatchObject({ message: "name, email, and password are required" });
});

test("login", async () => {
  const email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app)
    .post("/api/auth")
    .send({ name: "pizza diner", email: email, password: "a" });
  const loginRes = await request(app)
    .put("/api/auth")
    .send({ email: email, password: "a" });
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.user).toMatchObject({
    id: registerRes.body.user.id,
    name: "pizza diner",
    email: email,
    roles: [{ role: "diner" }],
  });
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
});

test("login with wrong password", async () => {
  const email = Math.random().toString(36).substring(2, 12) + "@test.com";
  await request(app)
    .post("/api/auth")
    .send({ name: "pizza diner", email: email, password: "a" });
  const loginRes = await request(app)
    .put("/api/auth")
    .send({ email: email, password: "wrong" });
  expect(loginRes.status).toBe(404);
  expect(loginRes.body).toMatchObject({ message: "unknown user" });
});

test("logout", async () => {
  const registerRes = await request(app)
    .post("/api/auth")
    .send({ name: "pizza diner", email: Math.random().toString(36).substring(2, 12) + "@test.com", password: "a" });
  const logoutRes = await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${registerRes.body.token}`);
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body).toMatchObject({ message: "logout successful" });

  const getMeRes = await request(app)
    .get("/api/user/me")
    .set("Authorization", `Bearer ${registerRes.body.token}`);
  expect(getMeRes.status).toBe(401);
});

test("logout without auth", async () => {
  const logoutRes = await request(app).delete("/api/auth");
  expect(logoutRes.status).toBe(401);
  expect(logoutRes.body).toMatchObject({ message: "unauthorized" });
});

test("bad token", async () => {
  const getMeRes = await request(app)
    .get("/api/user/me")
    .set("Authorization", "Bearer bad.token.value");
  expect(getMeRes.status).toBe(401);
  expect(getMeRes.body).toMatchObject({ message: "unauthorized" });
});
