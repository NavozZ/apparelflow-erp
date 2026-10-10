
import "dotenv/config";

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL is not configured");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({ adapter });

const recipes = [
  {
    recipeCode: "REC-BL01",
    name: "Casual Blouse",
    category: "Blouse",
    stdFabricYards: "1.80",
    wastageCap: "5.00",
    components: [
      { componentName: "Front Body Panel", piecesPerGarment: 1 },
      { componentName: "Back Body Panel", piecesPerGarment: 1 },
      { componentName: "Sleeves (Left & Right)", piecesPerGarment: 2 },
      { componentName: "Collar & Stand", piecesPerGarment: 1 },
      { componentName: "Sleeve Cuffs", piecesPerGarment: 2 },
    ],
  },
  {
    recipeCode: "REC-CT02",
    name: "Crop Top",
    category: "Crop Top",
    stdFabricYards: "1.10",
    wastageCap: "8.00",
    components: [
      { componentName: "Front Chest Panel", piecesPerGarment: 1 },
      { componentName: "Back Support Panel", piecesPerGarment: 1 },
      { componentName: "Neck Binding Strip", piecesPerGarment: 1 },
      { componentName: "Hem Elastic Casing", piecesPerGarment: 1 },
      { componentName: "Side Strap Accents", piecesPerGarment: 2 },
    ],
  },
];

async function main() {
  await prisma.$transaction(async (tx) => {
    for (const recipeData of recipes) {
      const { components, ...recipeFields } = recipeData;

      const recipe = await tx.recipe.upsert({
        where: {
          recipeCode: recipeFields.recipeCode,
        },
        update: {
          name: recipeFields.name,
          category: recipeFields.category,
          stdFabricYards: recipeFields.stdFabricYards,
          wastageCap: recipeFields.wastageCap,
        },
        create: recipeFields,
      });

      for (const component of components) {
        await tx.recipeComponent.upsert({
          where: {
            recipeId_componentName: {
              recipeId: recipe.id,
              componentName: component.componentName,
            },
          },
          update: {
            piecesPerGarment: component.piecesPerGarment,
          },
          create: {
            recipeId: recipe.id,
            componentName: component.componentName,
            piecesPerGarment: component.piecesPerGarment,
          },
        });
      }

      console.log(`Seeded recipe: ${recipe.name}`);
    }
  });

  console.log("Recipe seeding completed successfully.");
}

main()
  .catch((error) => {
    console.error(
      "Seeding failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
