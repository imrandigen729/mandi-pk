export const CATEGORIES_WITH_SUBCATEGORIES: Record<string, string[]> = {
  'Mobiles': [
    "Mobile Phones", "Mobile Accessories", "Smart Watches"
  ],
  'Electronics': [
    "Laptops", "Computers", "Gaming Consoles", "Cameras", "TVs & Audio", "Printers", "Networking Devices"
  ],
  'Vehicles': [
    "Cars", "Motorcycles", "Bicycles", "Trucks", "Vans", "Rickshaws", "Auto Parts", "Tires & Rims"
  ],
  'Property': [
    "Houses for Sale", "Houses for Rent", "Apartments", "Commercial Property", "Shops", "Offices", "Plots", "Agricultural Land"
  ],
  'Fashion & Beauty': [
    "Men Clothing", "Women Clothing", "Kids Clothing", "Shoes", "Watches", "Jewelry", "Makeup", "Skincare", "Perfumes", "Handbags"
  ],
  'Home & Furniture': [
    "Beds", "Sofas", "Chairs", "Tables", "Wardrobes", "Home Decor", "Kitchen Appliances", "Refrigerators", "Air Conditioners", "Washing Machines"
  ],
  'Grocery & Food': [
    "Fruits", "Vegetables", "Meat", "Seafood", "Beverages", "Snacks", "Frozen Food", "Bakery Items"
  ],
  'Health & Sports': [
    "Gym Equipment", "Cricket", "Football", "Fitness Accessories", "Supplements", "Medical Equipment"
  ],
  'Kids & Babies': [
    "Baby Products", "Toys", "Baby Clothing", "Strollers", "School Accessories"
  ],
  'Books & Education': [
    "Academic Books", "Novels", "Islamic Books", "Stationery", "Online Courses", "Tutors"
  ],
  'Jobs & Services': [
    "IT Jobs", "Marketing Jobs", "Home Services", "Repair Services", "Graphic Design", "Web Development", "Photography"
  ],
  'Business & Industrial': [
    "Machinery", "Tools", "Generators", "Office Equipment", "Wholesale Products"
  ],
  'Pets & Animals': [
    "Cats", "Dogs", "Birds", "Fish", "Pet Food", "Pet Accessories"
  ],
  'Agriculture': [
    "Tractors", "Seeds", "Fertilizers", "Livestock", "Poultry"
  ],
  'Events & Entertainment': [
    "Wedding Services", "Catering", "Musical Instruments", "DJ Equipment", "Party Supplies"
  ],
  'Collectibles & Miscellaneous': [
    "Antiques", "Coins", "Art & Paintings", "Handmade Items", "Imported Products", "Gift Items", "Religious Items", "Vintage Products", "Hobby Items", "Other Items"
  ],
  'Free Stuff': [
    "Giveaway Items", "Donations", "Used Free Items"
  ],
  'Others': [
    'Anything else'
  ]
};

export const CATEGORIES = Object.keys(CATEGORIES_WITH_SUBCATEGORIES);

