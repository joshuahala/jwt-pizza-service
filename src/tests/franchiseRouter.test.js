const request = require("supertest");
const app = require("../service");

test("get franchises", async () => {
  const getFranchisesRes = await request(app).get("/api/franchise?page=0&limit=10&name=*");
  expect(getFranchisesRes.status).toBe(200);
  expect(Array.isArray(getFranchisesRes.body.franchises)).toBe(true);
  expect(typeof getFranchisesRes.body.more).toBe("boolean");
});

test("get franchises as admin", async () => {
  const loginRes = await request(app)
    .put("/api/auth")
    .send({ email: "a@jwt.com", password: "admin" });
  const getFranchisesRes = await request(app)
    .get("/api/franchise?page=0&limit=10&name=*")
    .set("Authorization", `Bearer ${loginRes.body.token}`);
  expect(getFranchisesRes.status).toBe(200);
  expect(Array.isArray(getFranchisesRes.body.franchises)).toBe(true);
});

test("create franchise without auth", async () => {
  const createFranchiseRes = await request(app)
    .post("/api/franchise")
    .send({ name: Math.random().toString(36).substring(2, 12), admins: [{ email: "a@jwt.com" }] });
  expect(createFranchiseRes.status).toBe(401);
  expect(createFranchiseRes.body).toMatchObject({ message: "unauthorized" });
});

test("create franchise as diner", async () => {
  const registerRes = await request(app)
    .post("/api/auth")
    .send({ name: "pizza diner", email: Math.random().toString(36).substring(2, 12) + "@test.com", password: "a" });
  const createFranchiseRes = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${registerRes.body.token}`)
    .send({ name: Math.random().toString(36).substring(2, 12), admins: [{ email: registerRes.body.user.email }] });
  expect(createFranchiseRes.status).toBe(403);
  expect(createFranchiseRes.body).toMatchObject({ message: "unable to create a franchise" });
});

test("create franchise with unknown admin", async () => {
  const loginRes = await request(app)
    .put("/api/auth")
    .send({ email: "a@jwt.com", password: "admin" });
  const unknownEmail = Math.random().toString(36).substring(2, 12) + "@unknown.com";
  const createFranchiseRes = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${loginRes.body.token}`)
    .send({ name: Math.random().toString(36).substring(2, 12), admins: [{ email: unknownEmail }] });
  expect(createFranchiseRes.status).toBe(404);
  expect(createFranchiseRes.body).toMatchObject({ message: `unknown user for franchise admin ${unknownEmail} provided` });
});

test("create and delete franchise", async () => {
  const loginRes = await request(app)
    .put("/api/auth")
    .send({ email: "a@jwt.com", password: "admin" });
  const registerRes = await request(app)
    .post("/api/auth")
    .send({ name: "pizza franchisee", email: Math.random().toString(36).substring(2, 12) + "@test.com", password: "a" });
  const franchiseName = Math.random().toString(36).substring(2, 12);
  const createFranchiseRes = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${loginRes.body.token}`)
    .send({ name: franchiseName, admins: [{ email: registerRes.body.user.email }] });
  expect(createFranchiseRes.status).toBe(200);
  expect(createFranchiseRes.body).toMatchObject({
    name: franchiseName,
    admins: [{ id: registerRes.body.user.id, name: "pizza franchisee", email: registerRes.body.user.email }],
  });

  const deleteFranchiseRes = await request(app)
    .delete(`/api/franchise/${createFranchiseRes.body.id}`)
    .set("Authorization", `Bearer ${loginRes.body.token}`);
  expect(deleteFranchiseRes.status).toBe(200);
  expect(deleteFranchiseRes.body).toMatchObject({ message: "franchise deleted" });
});

test("get user franchises without auth", async () => {
  const getUserFranchisesRes = await request(app).get("/api/franchise/1");
  expect(getUserFranchisesRes.status).toBe(401);
  expect(getUserFranchisesRes.body).toMatchObject({ message: "unauthorized" });
});

test("get user franchises", async () => {
  const loginRes = await request(app)
    .put("/api/auth")
    .send({ email: "a@jwt.com", password: "admin" });
  const registerRes = await request(app)
    .post("/api/auth")
    .send({ name: "pizza franchisee", email: Math.random().toString(36).substring(2, 12) + "@test.com", password: "a" });
  const franchiseName = Math.random().toString(36).substring(2, 12);
  await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${loginRes.body.token}`)
    .send({ name: franchiseName, admins: [{ email: registerRes.body.user.email }] });

  const getUserFranchisesRes = await request(app)
    .get(`/api/franchise/${registerRes.body.user.id}`)
    .set("Authorization", `Bearer ${registerRes.body.token}`);
  expect(getUserFranchisesRes.status).toBe(200);
  expect(getUserFranchisesRes.body).toMatchObject([
    {
      name: franchiseName,
      admins: [{ id: registerRes.body.user.id, name: "pizza franchisee", email: registerRes.body.user.email }],
      stores: [],
    },
  ]);
});

test("get user franchises with no franchises", async () => {
  const registerRes = await request(app)
    .post("/api/auth")
    .send({ name: "pizza diner", email: Math.random().toString(36).substring(2, 12) + "@test.com", password: "a" });
  const getUserFranchisesRes = await request(app)
    .get(`/api/franchise/${registerRes.body.user.id}`)
    .set("Authorization", `Bearer ${registerRes.body.token}`);
  expect(getUserFranchisesRes.status).toBe(200);
  expect(getUserFranchisesRes.body).toEqual([]);
});

test("get other user franchises as diner", async () => {
  const registerRes = await request(app)
    .post("/api/auth")
    .send({ name: "pizza diner", email: Math.random().toString(36).substring(2, 12) + "@test.com", password: "a" });
  const getUserFranchisesRes = await request(app)
    .get(`/api/franchise/${registerRes.body.user.id + 1000000}`)
    .set("Authorization", `Bearer ${registerRes.body.token}`);
  expect(getUserFranchisesRes.status).toBe(200);
  expect(getUserFranchisesRes.body).toEqual([]);
});

test("create and delete store as franchisee", async () => {
  const loginRes = await request(app)
    .put("/api/auth")
    .send({ email: "a@jwt.com", password: "admin" });
  const registerRes = await request(app)
    .post("/api/auth")
    .send({ name: "pizza franchisee", email: Math.random().toString(36).substring(2, 12) + "@test.com", password: "a" });
  const createFranchiseRes = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${loginRes.body.token}`)
    .send({ name: Math.random().toString(36).substring(2, 12), admins: [{ email: registerRes.body.user.email }] });

  const createStoreRes = await request(app)
    .post(`/api/franchise/${createFranchiseRes.body.id}/store`)
    .set("Authorization", `Bearer ${registerRes.body.token}`)
    .send({ franchiseId: createFranchiseRes.body.id, name: "SLC" });
  expect(createStoreRes.status).toBe(200);
  expect(createStoreRes.body).toMatchObject({ franchiseId: createFranchiseRes.body.id, name: "SLC" });

  const deleteStoreRes = await request(app)
    .delete(`/api/franchise/${createFranchiseRes.body.id}/store/${createStoreRes.body.id}`)
    .set("Authorization", `Bearer ${registerRes.body.token}`);
  expect(deleteStoreRes.status).toBe(200);
  expect(deleteStoreRes.body).toMatchObject({ message: "store deleted" });
});

test("create and delete store as other diner", async () => {
  const loginRes = await request(app)
    .put("/api/auth")
    .send({ email: "a@jwt.com", password: "admin" });
  const createFranchiseRes = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${loginRes.body.token}`)
    .send({ name: Math.random().toString(36).substring(2, 12), admins: [{ email: "a@jwt.com" }] });
  const registerRes = await request(app)
    .post("/api/auth")
    .send({ name: "pizza diner", email: Math.random().toString(36).substring(2, 12) + "@test.com", password: "a" });

  const createStoreRes = await request(app)
    .post(`/api/franchise/${createFranchiseRes.body.id}/store`)
    .set("Authorization", `Bearer ${registerRes.body.token}`)
    .send({ franchiseId: createFranchiseRes.body.id, name: "SLC" });
  expect(createStoreRes.status).toBe(403);
  expect(createStoreRes.body).toMatchObject({ message: "unable to create a store" });

  const deleteStoreRes = await request(app)
    .delete(`/api/franchise/${createFranchiseRes.body.id}/store/1`)
    .set("Authorization", `Bearer ${registerRes.body.token}`);
  expect(deleteStoreRes.status).toBe(403);
  expect(deleteStoreRes.body).toMatchObject({ message: "unable to delete a store" });
});

test("create and delete store without auth", async () => {
  const createStoreRes = await request(app)
    .post("/api/franchise/1/store")
    .send({ franchiseId: 1, name: "SLC" });
  expect(createStoreRes.status).toBe(401);

  const deleteStoreRes = await request(app).delete("/api/franchise/1/store/1");
  expect(deleteStoreRes.status).toBe(401);
});
