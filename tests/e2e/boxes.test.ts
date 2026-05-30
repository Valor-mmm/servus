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
  await expect(page.locator("text=0").first()).toBeVisible();
});

// ── 12.2: Bulk-add items to a box ────────────────────────────────────────────

test("bulk-add three item names — all appear in box detail", async ({ page }) => {
  const boxLabel = `Küche-${RUN}`;
  const items = [
    `Teller-${RUN}`,
    `Tasse-${RUN}`,
    `Topf-${RUN}`,
  ];

  await createBox(page, boxLabel);

  // Fill bulk-add textarea
  await page.fill('[name="names"]', items.join("\n"));
  await Promise.all([
    page.waitForURL(/\/boxes\/[^/?]+\?added=\d+/),
    page.click("button.btn-primary"),
  ]);

  // All three items appear on the detail page
  for (const name of items) {
    await expect(page.locator(`text=${name}`)).toBeVisible();
  }

  // Navigate to each item's detail page to confirm box assignment
  await page.click(`text=${items[0]}`);
  await expect(page.locator("text=In Karton")).toBeVisible();
  await expect(page.locator(`text=${boxLabel}`)).toBeVisible();
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
  const boxLabel = `Schlafzimmer-${RUN}`;
  const itemName = `Kissen-${RUN}`;

  await createBox(page, boxLabel);

  // Bulk-add one item
  await page.fill('[name="names"]', itemName);
  await Promise.all([
    page.waitForURL(/\/boxes\/[^/?]+\?added=\d+/),
    page.click("button.btn-primary"),
  ]);
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
  const boxLabel = `Voll-${RUN}`;
  const itemName = `Lampe-${RUN}`;

  await createBox(page, boxLabel);

  // Add an item via bulk-add
  await page.fill('[name="names"]', itemName);
  await Promise.all([
    page.waitForURL(/\/boxes\/[^/?]+\?added=\d+/),
    page.click("button.btn-primary"),
  ]);
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
  const boxLabel = `Status-${RUN}`;

  await createBox(page, boxLabel);
  // Detail page: status is Leer initially
  await expect(page.locator("dd", { hasText: "Leer" })).toBeVisible();

  // Bulk-add one item
  await page.fill('[name="names"]', `Teller-${RUN}`);
  await Promise.all([
    page.waitForURL(/\/boxes\/[^/?]+\?added=\d+/),
    page.click("button.btn-primary"),
  ]);

  // Detail page: status is now Gepackt
  await expect(page.locator("dd", { hasText: "Gepackt" })).toBeVisible();

  // Box list also shows Gepackt
  await page.goto("/boxes");
  const boxRow = page.locator("li", { hasText: boxLabel });
  await expect(boxRow.locator("text=Gepackt")).toBeVisible();
});

// ── 8.2: Mark packed box as delivered ─────────────────────────────────────────

test("mark packed box as delivered — status shows Geliefert", async ({ page }) => {
  const boxLabel = `Delivered-${RUN}`;

  await createBox(page, boxLabel);

  // Add item to make box packed
  await page.fill('[name="names"]', `Item-${RUN}`);
  await Promise.all([
    page.waitForURL(/\/boxes\/[^/?]+\?added=\d+/),
    page.click("button.btn-primary"),
  ]);
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
  const roomName = `Küche-place-${RUN}`;
  const boxLabel = `PlaceBox-${RUN}`;
  const itemName = `Tasse-place-${RUN}`;

  await createRoom(page, roomName);
  await createBox(page, boxLabel);

  await page.fill('[name="names"]', itemName);
  await Promise.all([
    page.waitForURL(/\/boxes\/[^/?]+\?added=\d+/),
    page.click("button.btn-primary"),
  ]);

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
  const roomName = `Wohnzimmer-unpack-${RUN}`;
  const boxLabel = `UnpackAll-${RUN}`;

  await createRoom(page, roomName);
  await createBox(page, boxLabel, roomName);

  // Add two items
  await page.fill('[name="names"]', `Item1-${RUN}\nItem2-${RUN}`);
  await Promise.all([
    page.waitForURL(/\/boxes\/[^/?]+\?added=\d+/),
    page.click("button.btn-primary"),
  ]);

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
  const roomName = `Schlafzimmer-assign-${RUN}`;
  const boxLabel = `NoRoom-${RUN}`;

  await createRoom(page, roomName);
  // Create box WITHOUT destination room
  await createBox(page, boxLabel);

  // Add item and mark delivered
  await page.fill('[name="names"]', `Buch-${RUN}`);
  await Promise.all([
    page.waitForURL(/\/boxes\/[^/?]+\?added=\d+/),
    page.click("button.btn-primary"),
  ]);
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
  const roomName = `Küche-label-${RUN}`;
  const boxLabel = `LabelIcon-${RUN}`;

  await createRoom(page, roomName);
  await createBox(page, boxLabel, roomName);

  // Add 2 items
  await page.fill('[name="names"]', `Teller-${RUN}\nTasse-${RUN}`);
  await Promise.all([
    page.waitForURL(/\/boxes\/[^/?]+\?added=\d+/),
    page.click("button.btn-primary"),
  ]);

  const boxUrl = page.url().replace(/\?.*/, "");
  await page.goto(`${boxUrl}/label`);

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
