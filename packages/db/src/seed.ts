import { eq } from "drizzle-orm";
import { createDb, menuCategories, menuItems } from "./index.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://seatdash:seatdash@localhost:5432/seatdash";

const seedData = [
  {
    category: "Food",
    sortOrder: 1,
    items: [
      { name: "Classic Stadium Hot Dog", description: "All-beef frank with mustard and onions", priceCents: 899 },
      { name: "Loaded Nachos", description: "Tortilla chips, cheese, jalapeños, salsa", priceCents: 1299 },
      { name: "Chicken Tenders Basket", description: "Crispy tenders with fries and dipping sauce", priceCents: 1499 },
      { name: "Pretzel Bites", description: "Warm salted pretzel bites with cheese cup", priceCents: 799 },
    ],
  },
  {
    category: "Drinks",
    sortOrder: 2,
    items: [
      { name: "Draft Beer", description: "16 oz domestic draft", priceCents: 1099 },
      { name: "Bottled Water", description: "20 oz spring water", priceCents: 499 },
      { name: "Fountain Soda", description: "24 oz — Coke, Diet Coke, Sprite", priceCents: 599 },
      { name: "Premium Lemonade", description: "Fresh-squeezed style lemonade", priceCents: 699 },
    ],
  },
  {
    category: "Snacks",
    sortOrder: 3,
    items: [
      { name: "Roasted Peanuts", description: "Warm stadium peanuts", priceCents: 599 },
      { name: "Popcorn", description: "Large butter popcorn", priceCents: 699 },
      { name: "Soft Pretzel", description: "Jumbo salted pretzel", priceCents: 749 },
    ],
  },
];

async function main() {
  const db = createDb(connectionString);

  for (const group of seedData) {
    const [existing] = await db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.name, group.category))
      .limit(1);

    let categoryId = existing?.id;
    if (!categoryId) {
      const [inserted] = await db
        .insert(menuCategories)
        .values({ name: group.category, sortOrder: group.sortOrder })
        .returning();
      categoryId = inserted.id;
    }

    for (const item of group.items) {
      const [existingItem] = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.name, item.name))
        .limit(1);

      if (!existingItem) {
        await db.insert(menuItems).values({
          categoryId,
          name: item.name,
          description: item.description,
          priceCents: item.priceCents,
          available: true,
        });
      }
    }
  }

  console.log("Seed complete");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
