import { expect, test } from "@playwright/test";

const RUN = Date.now().toString(36);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createRoom(page: import("@playwright/test").Page, name: string) {
  await page.goto("/rooms");
  await page.fill('main [name="name"]', name);
  await page.click('main [type="submit"]');
  await expect(page.locator(`text=${name}`)).toBeVisible();
}

async function createCategory(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.goto("/categories");
  await page.fill('main [name="name"]', name);
  await page.click('main [type="submit"]');
  await expect(page.locator(`text=${name}`)).toBeVisible();
}

async function createBox(
  page: import("@playwright/test").Page,
  label?: string,
  roomLabel?: string,
) {
  await page.goto("/boxes");
  if (label) {
    await page.fill('[name="label"]', label);
  }
  if (roomLabel) {
    await page.selectOption('[name="destinationRoomId"]', { label: roomLabel });
  }
  await page.click('main [type="submit"]');
  // Redirect to /boxes/:id on creation
  await expect(page).toHaveURL(/\/boxes\/.+/);
}

/** Add a named item to a box via the /items/new form. Returns to /items on success. */
async function addItemToBox(
  page: import("@playwright/test").Page,
  boxId: string,
  itemName: string,
  catName: string,
) {
  await page.goto("/items/new");
  await page.fill('[name="name"]', itemName);
  await page.selectOption('[name="categoryId"]', { label: catName });
  await page.selectOption('[name="boxId"]', boxId);
  await page.click('main [type="submit"]');
  await expect(page).toHaveURL("/items");
}

// ── 12.1: Create box with label and destination room ─────────────────────────

test("create box with label and destination room — appears in list", async ({ page }) => {
  const roomName = `Wohnzimmer-${RUN}`;
  const boxLabel = `Bücher-${RUN}`;

  await createRoom(page, roomName);
  await createBox(page, boxLabel, roomName);

  await page.goto("/boxes");
  await expect(page.locator(`text=B-`).first()).toBeVisible();
  await expect(page.locator(`text=${boxLabel}`)).toBeVisible();
  await expect(page.locator("span.meta", { hasText: roomName })).toBeVisible();
  // Item count shows 0
  await expect(
    page.locator("li", { hasText: boxLabel }).locator("span.meta"),
  ).toContainText("Gegenstände: 0");
});

// ── 12.3: Label page — QR code and short code visible ────────────────────────

test("label page shows QR code SVG and short code", async ({ page }) => {
  const boxLabel = `Label-Test-${RUN}`;
  const roomName = `Keller-${RUN}`;

  await createRoom(page, roomName);
  await createBox(page, boxLabel, roomName);

  // Get the box id from URL
  const boxUrl = page.url();
  const labelUrl = `${boxUrl}/label`;
  await page.goto(labelUrl);

  // SVG QR code is present
  await expect(page.locator("svg")).toBeVisible();

  // Short code (B-NNN format) is in large text
  await expect(page.locator(".code")).toBeVisible();
  const codeText = await page.locator(".code").textContent();
  expect(codeText).toMatch(/^B-\d{3,}$/);

  // Box label text is visible
  await expect(page.locator(`text=${boxLabel}`)).toBeVisible();

  // Destination room is visible
  await expect(page.locator(`text=${roomName}`)).toBeVisible();

  // No navigation chrome (no <nav> element)
  await expect(page.locator("nav")).not.toBeVisible();
});

// ── 12.4: Unbox item from box detail ─────────────────────────────────────────

test("unbox item from box detail — item gone from box but still in item list", async ({ page }) => {
  const catName = `Kat-12-4-${RUN}`;
  const boxLabel = `Schlafzimmer-${RUN}`;
  const itemName = `Kissen-${RUN}`;

  await createCategory(page, catName);
  await createBox(page, boxLabel);
  const boxUrl = page.url();
  const boxId = new URL(boxUrl).pathname.split("/").pop()!;

  await addItemToBox(page, boxId, itemName, catName);
  await page.goto(boxUrl);
  await expect(page.locator(`text=${itemName}`)).toBeVisible();

  // Click remove button for the item
  const itemRow = page.locator("li.item-row", { hasText: itemName });
  await itemRow.locator("button", { hasText: "Entfernen" }).click();

  // Item no longer in box detail
  await expect(page.locator(`text=${itemName}`)).not.toBeVisible();

  // Item still in global item list
  await page.goto("/items");
  await expect(page.locator(`text=${itemName}`)).toBeVisible();
});

// ── 12.5: Assign existing item (with room) to box via edit form ───────────────

test("assign item with room to box — room cleared, item in box detail", async ({ page }) => {
  const catName = `Möbel-${RUN}`;
  const roomName = `Küche-${RUN}-assign`;
  const boxLabel = `Umzug-${RUN}`;
  const itemName = `Sessel-${RUN}`;

  await createCategory(page, catName);
  await createRoom(page, roomName);

  // Create item with room assigned
  await page.goto("/items/new");
  await page.fill('[name="name"]', itemName);
  await page.selectOption('[name="categoryId"]', { label: catName });
  await page.selectOption('[name="roomId"]', { label: roomName });
  await page.click('main [type="submit"]');

  // Create box
  await createBox(page, boxLabel);
  const boxDetailUrl = page.url();
  const boxId = new URL(boxDetailUrl).pathname.split("/").pop()!;

  // Edit item: assign to box
  await page.goto("/items");
  await page.click(`text=${itemName}`);
  await page.click(`a[href*="/edit"]`);
  await page.selectOption('[name="boxId"]', boxId);
  await page.click('main [type="submit"]');

  // Item detail shows box, not room
  await expect(page.locator("text=In Karton")).toBeVisible();
  await expect(page.locator("text=Kein Raum")).not.toBeVisible();

  // Box detail shows the item
  await page.goto(boxDetailUrl);
  await expect(page.locator(`text=${itemName}`)).toBeVisible();
});

// ── 12.6: Delete non-empty box — error shown, box persists ───────────────────

test("delete non-empty box shows error and box persists", async ({ page }) => {
  const catName = `Kat-12-6-${RUN}`;
  const boxLabel = `Voll-${RUN}`;
  const itemName = `Lampe-${RUN}`;

  await createCategory(page, catName);
  await createBox(page, boxLabel);
  const boxUrl = page.url();
  const boxId = new URL(boxUrl).pathname.split("/").pop()!;

  await addItemToBox(page, boxId, itemName, catName);
  await page.goto(boxUrl);
  await expect(page.locator(`text=${itemName}`)).toBeVisible();

  // Delete button should NOT be visible while items exist
  await expect(page.locator("button.btn-danger")).not.toBeVisible();

  // Verify box still in list
  await page.goto("/boxes");
  await expect(page.locator(`text=${boxLabel}`)).toBeVisible();
});

// ── 12.7: Delete empty box ────────────────────────────────────────────────────

test("delete empty box — box no longer in list", async ({ page }) => {
  const boxLabel = `Leer-${RUN}`;

  await createBox(page, boxLabel);

  // Delete button visible for empty box
  await page.click("button.btn-danger");

  // Redirected to /boxes, box gone
  await expect(page).toHaveURL("/boxes");
  await expect(page.locator(`text=${boxLabel}`)).not.toBeVisible();
});

// ── 8.1: Status changes to packed after item added ────────────────────────────

test("adding item to box changes status to Gepackt in detail and list", async ({ page }) => {
  const catName = `Kat-8-1-${RUN}`;
  const boxLabel = `Status-${RUN}`;

  await createCategory(page, catName);
  await createBox(page, boxLabel);
  const boxUrl = page.url();
  const boxId = new URL(boxUrl).pathname.split("/").pop()!;

  // Detail page: status is Leer initially
  await expect(page.locator("dd", { hasText: "Leer" })).toBeVisible();

  await addItemToBox(page, boxId, `Teller-${RUN}`, catName);
  await page.goto(boxUrl);

  // Detail page: status is now Gepackt
  await expect(page.locator("dd", { hasText: "Gepackt" })).toBeVisible();

  // Box list also shows Gepackt
  await page.goto("/boxes");
  const boxRow = page.locator("li", { hasText: boxLabel });
  await expect(boxRow.locator("text=Gepackt")).toBeVisible();
});

// ── 8.2: Mark packed box as delivered ─────────────────────────────────────────

test("mark packed box as delivered — status shows Geliefert", async ({ page }) => {
  const catName = `Kat-8-2-${RUN}`;
  const boxLabel = `Delivered-${RUN}`;

  await createCategory(page, catName);
  await createBox(page, boxLabel);
  const boxUrl = page.url();
  const boxId = new URL(boxUrl).pathname.split("/").pop()!;

  await addItemToBox(page, boxId, `Item-${RUN}`, catName);
  await page.goto(boxUrl);
  await expect(page.locator("dd", { hasText: "Gepackt" })).toBeVisible();

  // Click "Als geliefert markieren"
  await page.locator("button", { hasText: "Als geliefert markieren" }).click();
  await expect(page).toHaveURL(/\/boxes\/.+/);

  // Status is now Geliefert
  await expect(page.locator("dd", { hasText: "Geliefert" })).toBeVisible();
  // "Als geliefert markieren" button is gone
  await expect(
    page.locator("button", { hasText: "Als geliefert markieren" }),
  ).not.toBeVisible();
});

// ── 8.3: Place single item from delivered box into a room ─────────────────────

test("place item from delivered box into room — item leaves box, appears in items list", async ({ page }) => {
  const catName = `Kat-8-3-${RUN}`;
  const roomName = `Küche-place-${RUN}`;
  const boxLabel = `PlaceBox-${RUN}`;
  const itemName = `Tasse-place-${RUN}`;

  await createCategory(page, catName);
  await createRoom(page, roomName);
  await createBox(page, boxLabel);
  const boxUrl = page.url();
  const boxId = new URL(boxUrl).pathname.split("/").pop()!;

  await addItemToBox(page, boxId, itemName, catName);
  await page.goto(boxUrl);

  // Mark as delivered
  await page.locator("button", { hasText: "Als geliefert markieren" }).click();
  await expect(page.locator("dd", { hasText: "Geliefert" })).toBeVisible();

  // Use inline "place item" form: select room, click Einlagern
  const itemRow = page.locator("li.item-row", { hasText: itemName });
  await itemRow.locator("select[name='roomId']").selectOption({
    label: roomName,
  });
  await itemRow.locator("button", { hasText: "Einlagern" }).click();

  // Box is now empty → redirected to /boxes (box tombstoned)
  await expect(page).toHaveURL("/boxes");

  // Item still appears in global items list
  await page.goto("/items");
  await expect(page.locator(`text=${itemName}`)).toBeVisible();
});

// ── 8.4: Unpack all items from delivered box with destination room ─────────────

test("unpack all from delivered box — box gone, items in room", async ({ page }) => {
  const catName = `Kat-8-4-${RUN}`;
  const roomName = `Wohnzimmer-unpack-${RUN}`;
  const boxLabel = `UnpackAll-${RUN}`;

  await createCategory(page, catName);
  await createRoom(page, roomName);
  await createBox(page, boxLabel, roomName);
  const boxUrl = page.url();
  const boxId = new URL(boxUrl).pathname.split("/").pop()!;

  // Add two items
  await addItemToBox(page, boxId, `Item1-${RUN}`, catName);
  await addItemToBox(page, boxId, `Item2-${RUN}`, catName);
  await page.goto(boxUrl);

  // Mark as delivered
  await page.locator("button", { hasText: "Als geliefert markieren" }).click();
  await expect(page.locator("dd", { hasText: "Geliefert" })).toBeVisible();

  // Click "Alle entpacken nach [room]"
  await page.locator("button", { hasText: `Alle entpacken nach ${roomName}` })
    .click();

  // Redirected to /boxes, box is gone
  await expect(page).toHaveURL("/boxes");
  await expect(page.locator(`text=${boxLabel}`)).not.toBeVisible();

  // Items appear in global items list
  await page.goto("/items");
  await expect(page.locator(`text=Item1-${RUN}`)).toBeVisible();
  await expect(page.locator(`text=Item2-${RUN}`)).toBeVisible();
});

// ── 8.5: Delivered box without destination room — assign room flow ─────────────

test("delivered box without room: assign-room shown; after assign, unpack-all appears", async ({ page }) => {
  const catName = `Kat-8-5-${RUN}`;
  const roomName = `Schlafzimmer-assign-${RUN}`;
  const boxLabel = `NoRoom-${RUN}`;

  await createCategory(page, catName);
  await createRoom(page, roomName);
  // Create box WITHOUT destination room
  await createBox(page, boxLabel);
  const boxUrl = page.url();
  const boxId = new URL(boxUrl).pathname.split("/").pop()!;

  await addItemToBox(page, boxId, `Buch-${RUN}`, catName);
  await page.goto(boxUrl);
  await page.locator("button", { hasText: "Als geliefert markieren" }).click();
  await expect(page.locator("dd", { hasText: "Geliefert" })).toBeVisible();

  // "Alle entpacken" should NOT be visible (no destination room)
  await expect(
    page.locator("button", { hasText: "Alle entpacken nach" }),
  ).not.toBeVisible();

  // Assign-room section IS visible
  await expect(page.locator("h2", { hasText: "Zielraum festlegen" }))
    .toBeVisible();

  // Assign the room
  await page.selectOption('select[name="roomId"]', { label: roomName });
  await page.locator("button", { hasText: "Zielraum festlegen" }).click();

  // After assign, "Alle entpacken nach [room]" should now be visible
  await expect(
    page.locator("button", { hasText: `Alle entpacken nach ${roomName}` }),
  ).toBeVisible();
  // Assign-room section should be gone
  await expect(page.locator("h2", { hasText: "Zielraum festlegen" })).not
    .toBeVisible();
});

// ── 8.6: Label page shows room icon, room name, and item count badge ───────────

test("label page shows room icon, large room name, and item count badge", async ({ page }) => {
  const catName = `Kat-8-6-${RUN}`;
  const roomName = `Küche-label-${RUN}`;
  const boxLabel = `LabelIcon-${RUN}`;

  await createCategory(page, catName);
  await createRoom(page, roomName);
  await createBox(page, boxLabel, roomName);
  const boxUrl = page.url();
  const boxId = new URL(boxUrl).pathname.split("/").pop()!;

  // Add 2 items
  await addItemToBox(page, boxId, `Teller-${RUN}`, catName);
  await addItemToBox(page, boxId, `Tasse-${RUN}`, catName);

  const labelUrl = `${boxUrl}/label`;
  await page.goto(labelUrl);

  // Room icon element is present
  await expect(page.locator(".room-icon")).toBeVisible();
  // Room name is the large dominant element
  await expect(page.locator(".room-name", { hasText: roomName })).toBeVisible();
  // Item count badge visible
  await expect(page.locator(".item-count")).toBeVisible();
  const badgeText = await page.locator(".item-count").textContent();
  expect(badgeText).toContain("2");
  // QR code still present
  await expect(page.locator("svg")).toBeVisible();
});
