const request = require("supertest");
const app = require("../service");

test("get me without auth", async () => {
  const getMeRes = await request(app).get("/api/user/me");
  expect(getMeRes.status).toBe(401);
  expect(getMeRes.body).toMatchObject({ message: "unauthorized" });
});

test("get me", async () => {
  const email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app)
    .post("/api/auth")
    .send({ name: "pizza diner", email: email, password: "a" });
  const getMeRes = await request(app)
    .get("/api/user/me")
    .set("Authorization", `Bearer ${registerRes.body.token}`);
  expect(getMeRes.status).toBe(200);
  expect(getMeRes.body).toMatchObject({
    id: registerRes.body.user.id,
    name: "pizza diner",
    email: email,
    roles: [{ role: "diner" }],
  });
});

test("update user without auth", async () => {
  const updateUserRes = await request(app)
    .put("/api/user/1")
    .send({ name: "new name", email: "new@test.com", password: "a" });
  expect(updateUserRes.status).toBe(401);
  expect(updateUserRes.body).toMatchObject({ message: "unauthorized" });
});

test("update user", async () => {
  const registerRes = await request(app)
    .post("/api/auth")
    .send({ name: "pizza diner", email: Math.random().toString(36).substring(2, 12) + "@test.com", password: "a" });
  const newEmail = Math.random().toString(36).substring(2, 12) + "@test.com";
  const updateUserRes = await request(app)
    .put(`/api/user/${registerRes.body.user.id}`)
    .set("Authorization", `Bearer ${registerRes.body.token}`)
    .send({ name: "new name", email: newEmail, password: "b" });
  expect(updateUserRes.status).toBe(200);
  expect(updateUserRes.body.user).toMatchObject({
    id: registerRes.body.user.id,
    name: "new name",
    email: newEmail,
  });
  expect(updateUserRes.body.token).toBeDefined();
});

test("update other user as diner", async () => {
  const registerRes = await request(app)
    .post("/api/auth")
    .send({ name: "pizza diner", email: Math.random().toString(36).substring(2, 12) + "@test.com", password: "a" });
  const updateUserRes = await request(app)
    .put(`/api/user/${registerRes.body.user.id + 1000000}`)
    .set("Authorization", `Bearer ${registerRes.body.token}`)
    .send({ name: "new name", email: "new@test.com", password: "b" });
  expect(updateUserRes.status).toBe(403);
  expect(updateUserRes.body).toMatchObject({ message: "unauthorized" });
});

test("delete user", async () => {
  const registerRes = await request(app)
    .post("/api/auth")
    .send({ name: "pizza diner", email: Math.random().toString(36).substring(2, 12) + "@test.com", password: "a" });
  const deleteUserRes = await request(app)
    .delete(`/api/user/${registerRes.body.user.id}`)
    .set("Authorization", `Bearer ${registerRes.body.token}`);
  expect(deleteUserRes.status).toBe(200);
  expect(deleteUserRes.body).toMatchObject({ message: "not implemented" });
});

test("list users", async () => {
  const registerRes = await request(app)
    .post("/api/auth")
    .send({ name: "pizza diner", email: Math.random().toString(36).substring(2, 12) + "@test.com", password: "a" });
  const listUsersRes = await request(app)
    .get("/api/user")
    .set("Authorization", `Bearer ${registerRes.body.token}`);
  expect(listUsersRes.status).toBe(200);
  expect(listUsersRes.body).toMatchObject({ message: "not implemented", users: [], more: false });
});
