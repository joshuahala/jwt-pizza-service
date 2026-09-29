const request = require("supertest");
const app = require("../service");
const { DB } = require("../database/database.js");

beforeAll(async () => {
  const menu = await DB.getMenu();
  if (menu.length === 0) {
    await DB.addMenuItem({ title: "Veggie", image: "pizza1.png", price: 0.0038, description: "A garden of delight" });
    await DB.addMenuItem({ title: "Pepperoni", image: "pizza2.png", price: 0.0042, description: "Spicy treat" });
    await DB.addMenuItem({ title: "Margarita", image: "pizza3.png", price: 0.0042, description: "Essential classic" });
    await DB.addMenuItem({ title: "Crusty", image: "pizza4.png", price: 0.0028, description: "A dry mouthed favorite" });
    await DB.addMenuItem({ title: "Charred Leopard", image: "pizza5.png", price: 0.0099, description: "For those with a darker side" });
  }
});

test("hello", () => {
  expect(true).toBe(true);
});

test("get menu", async () => {
  const getMenuRes = await request(app).get("/api/order/menu");
  expect(getMenuRes.status).toBe(200);
  expect(getMenuRes.body).toMatchObject([
    {
      id: 1,
      title: "Veggie",
      image: "pizza1.png",
      price: 0.0038,
      description: "A garden of delight",
    },
    {
      id: 2,
      title: "Pepperoni",
      image: "pizza2.png",
      price: 0.0042,
      description: "Spicy treat",
    },
    {
      id: 3,
      title: "Margarita",
      image: "pizza3.png",
      price: 0.0042,
      description: "Essential classic",
    },
    {
      id: 4,
      title: "Crusty",
      image: "pizza4.png",
      price: 0.0028,
      description: "A dry mouthed favorite",
    },
    {
      id: 5,
      title: "Charred Leopard",
      image: "pizza5.png",
      price: 0.0099,
      description: "For those with a darker side",
    },
  ]);
});

test("add menu item without auth", async () => {
  const addMenuRes = await request(app).put("/api/order/menu").send({
    title: "Student",
    description: "No topping, no sauce, just carbs",
    image: "pizza9.png",
    price: 0.0001,
  });
  expect(addMenuRes.status).toBe(401);
  expect(addMenuRes.body).toMatchObject({ message: "unauthorized" });
});

test("add menu item as diner", async () => {
  const registerRes = await request(app)
    .post("/api/auth")
    .send({ name: "pizza diner", email: Math.random().toString(36).substring(2, 12) + "@test.com", password: "a" });
  const addMenuRes = await request(app)
    .put("/api/order/menu")
    .set("Authorization", `Bearer ${registerRes.body.token}`)
    .send({
      title: "Student",
      description: "No topping, no sauce, just carbs",
      image: "pizza9.png",
      price: 0.0001,
    });
  expect(addMenuRes.status).toBe(403);
  expect(addMenuRes.body).toMatchObject({ message: "unable to add menu item" });
});

test("get orders without auth", async () => {
  const getOrdersRes = await request(app).get("/api/order");
  expect(getOrdersRes.status).toBe(401);
  expect(getOrdersRes.body).toMatchObject({ message: "unauthorized" });
});

test("get orders", async () => {
  const registerRes = await request(app)
    .post("/api/auth")
    .send({ name: "pizza diner", email: Math.random().toString(36).substring(2, 12) + "@test.com", password: "a" });
  const getOrdersRes = await request(app)
    .get("/api/order")
    .set("Authorization", `Bearer ${registerRes.body.token}`);
  expect(getOrdersRes.status).toBe(200);
  expect(getOrdersRes.body).toMatchObject({
    dinerId: registerRes.body.user.id,
    orders: [],
    page: 1,
  });
});

test("create order without auth", async () => {
  const createOrderRes = await request(app)
    .post("/api/order")
    .send({ franchiseId: 1, storeId: 1, items: [{ menuId: 1, description: "Veggie", price: 0.0038 }] });
  expect(createOrderRes.status).toBe(401);
  expect(createOrderRes.body).toMatchObject({ message: "unauthorized" });
});

test("create order", async () => {
  const registerRes = await request(app)
    .post("/api/auth")
    .send({ name: "pizza diner", email: Math.random().toString(36).substring(2, 12) + "@test.com", password: "a" });
  const createOrderRes = await request(app)
    .post("/api/order")
    .set("Authorization", `Bearer ${registerRes.body.token}`)
    .send({ franchiseId: 1, storeId: 1, items: [{ menuId: 1, description: "Veggie", price: 0.0038 }] });
  expect(createOrderRes.status).toBe(200);
  expect(createOrderRes.body.order).toMatchObject({
    franchiseId: 1,
    storeId: 1,
    items: [{ menuId: 1, description: "Veggie", price: 0.0038 }],
  });
});
