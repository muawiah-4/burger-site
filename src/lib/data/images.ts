// Curated, verified Unsplash food photography.
// Helper builds a right-sized, cropped, quality-controlled URL per use case.
function u(id: string, w = 1200): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
}

export const img = {
  // Burgers
  burgerClassic: u("1550317138-10000687a72b"),
  burgerDoubleCheese: u("1607013251379-e6eecfffe234"),
  burgerBbqBacon: u("1586190848861-99aa4a171e90"),
  burgerSpicyFire: u("1568901346375-23c9450c58cd"),
  burgerCrispyChicken: u("1606755962773-d324e0a13086"),
  burgerMushroomSwiss: u("1547584370-2cc98b8b8dc8"),
  burgerUltimateStack: u("1553979459-d2229ba7433b"),

  // Pizza
  pizzaMargherita: u("1574071318508-1cdbab80d002"),
  pizzaPepperoni: u("1601924582970-9238bcb495d9"),
  pizzaBbqChicken: u("1565299624946-b28f40a0ae38"),
  pizzaFajita: u("1590947132387-155cc02f3212"),
  pizzaCheeseLovers: u("1513104890138-7c749659a591"),
  pizzaSupreme: u("1585238342024-78d387f4a707"),
  pizzaMexican: u("1571407970349-bc81e7e96d47"),

  // Chicken
  chickenFried: u("1562967914-608f82629710"),
  chickenWings: u("1626082927389-6cd097cdc6ec"),
  chickenTenders: u("1768204039907-77a974159ef0"),
  chickenNuggets: u("1626645738196-c2a7c87a8f58"),
  chickenSpicy: u("1608039755401-742074f0548d"),
  chickenBbqWings: u("1626082927389-6cd097cdc6ec"),

  // Wraps
  wrap: u("1626700051175-6818013e1d4f"),

  // Sandwiches
  sandwichClub: u("1553909489-cd47e0907980"),
  sandwichSteak: u("1509722747041-616f39b57569"),

  // Sides
  friesClassic: u("1585109649139-366815a0d713"),
  friesLoaded: u("1573080496219-bb080dd4f877"),
  friesCheese: u("1573080496219-bb080dd4f877"),
  onionRings: u("1639024471283-03518883512d"),
  mozzSticks: u("1531749668029-2db88e4276c7"),
  garlicBread: u("1540914124281-342587941389"),
  coleslaw: u("1546069901-ba9599a7e63c"),

  // Desserts
  dessertBrownie: u("1606313564200-e75d5e30476c"),
  dessertCake: u("1606890737304-57a1ca8a5b62"),
  dessertCookies: u("1499636136210-6f4ee915583e"),
  dessertIceCream: u("1560008581-09826d1de69e"),
  dessertSundae: u("1590080875515-8a3a8dc5735e"),
  dessertCheesecake: u("1551024506-0bccd828d307"),

  // Drinks
  drinkCola: u("1581636625402-29b2a704ef13"),
  drinkLemonade: u("1583064313642-a7c149480c7e"),
  drinkIcedTea: u("1560023907-5f339617ea30"),
  drinkMilkshake: u("1572490122747-3968b75cc699"),
  drinkChocShake: u("1541658016709-82535e94bc69"),
  drinkStrawberryShake: u("1595981267035-7b04ca84a82d"),
  drinkWater: u("1523362628745-0c100150b504"),

  // Editorial / marketing
  editorialBeef: u("1571091655789-405eb7a3a3a8"),
  editorialKnifeBurger: u("1499028344343-cd173ffc68a9"),

  // Category tiles: shots used nowhere else, so the home page doesn't repeat itself.
  tileBurgers: u("1572802419224-296b0aeee0d9", 800),
  tilePizza: u("1593560708920-61dd98c46a4e", 800),
  tileChicken: u("1569058242253-92a9c755a0ec", 800),
  tileWraps: u("1562059390-a761a084768e", 800),
  tileSandwiches: u("1481070414801-51fd732d7184", 800),
  tileSides: u("1630384060421-cb20d0e0649d", 800),
  tileDesserts: u("1578985545062-69928b1d9587", 800),
  tileDrinks: u("1553787499-6f9133860278", 800),

  // Deal cards
  dealTwoForOne: u("1603064752734-4c48eff53d05"),
  dealCouples: u("1594212699903-ec8a3eca50f5"),
  dealFamilyFeast: u("1604382354936-07c5d9983bd3"),
  dealPizzaSides: u("1594007654729-407eedc4be65"),
  dealChickenBucket: u("1567620832903-9fc6debc209f"),
  dealPartyBox: u("1561758033-d89a9ad46330"),
};
