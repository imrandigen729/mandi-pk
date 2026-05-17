import { 
  Beef,
  Sprout,
  Smartphone, 
  Car, 
  Home, 
  Laptop, 
  Sofa, 
  Wrench, 
  Package,
  MoreHorizontal,
  Shirt,
  Bed,
  Apple,
  Dumbbell,
  Baby,
  BookOpen,
  Briefcase,
  Factory,
  Dog,
  Tractor,
  PartyPopper,
  Gem,
  Gift
} from 'lucide-react';

export const CATEGORIES = [
  { id: 'Mobiles', name: 'Mobiles', icon: Smartphone, count: 'New' },
  { id: 'Electronics', name: 'Electronics', icon: Laptop, count: 'New' },
  { id: 'Vehicles', name: 'Vehicles', icon: Car, count: 'Hot' },
  { id: 'Property', name: 'Property', icon: Home, count: 'New' },
  { id: 'Fashion & Beauty', name: 'Fashion', icon: Shirt, count: 'Hot' },
  { id: 'Home & Furniture', name: 'Furniture', icon: Bed, count: 'New' },
  { id: 'Grocery & Food', name: 'Grocery', icon: Apple, count: 'Fresh' },
  { id: 'Health & Sports', name: 'Sports', icon: Dumbbell, count: 'New' },
  { id: 'Kids & Babies', name: 'Kids', icon: Baby, count: 'New' },
  { id: 'Books & Education', name: 'Books', icon: BookOpen, count: 'New' },
  { id: 'Jobs & Services', name: 'Jobs', icon: Briefcase, count: 'Hiring' },
  { id: 'Business & Industrial', name: 'Industrial', icon: Factory, count: 'New' },
  { id: 'Pets & Animals', name: 'Pets', icon: Dog, count: 'New' },
  { id: 'Agriculture', name: 'Agriculture', icon: Tractor, count: 'Elite' },
  { id: 'Events & Entertainment', name: 'Events', icon: PartyPopper, count: 'New' },
  { id: 'Collectibles & Miscellaneous', name: 'Collectibles', icon: Gem, count: 'Rare' },
  { id: 'Free Stuff', name: 'Free', icon: Gift, count: 'Gift' },
  { id: 'Sold Out', name: 'Sold Out', icon: Package, count: 'Over' },
];

export const MARKETPLACE_CATEGORIES = [
  {
    name: "Mobiles",
    icon: Smartphone,
    subcategories: ["Mobile Phones", "Mobile Accessories", "Smart Watches"]
  },
  {
    name: "Electronics",
    icon: Laptop,
    subcategories: ["Laptops", "Computers", "Gaming Consoles", "Cameras", "TVs & Audio", "Printers", "Networking Devices"]
  },
  {
    name: "Vehicles",
    icon: Car,
    subcategories: ["Cars", "Motorcycles", "Bicycles", "Trucks", "Vans", "Rickshaws", "Auto Parts", "Tires & Rims"]
  },
  {
    name: "Property",
    icon: Home,
    subcategories: ["Houses for Sale", "Houses for Rent", "Apartments", "Commercial Property", "Shops", "Offices", "Plots", "Agricultural Land"]
  },
  {
    name: "Fashion & Beauty",
    icon: Shirt,
    subcategories: ["Men Clothing", "Women Clothing", "Kids Clothing", "Shoes", "Watches", "Jewelry", "Makeup", "Skincare", "Perfumes", "Handbags"]
  },
  {
    name: "Home & Furniture",
    icon: Bed,
    subcategories: ["Beds", "Sofas", "Chairs", "Tables", "Wardrobes", "Home Decor", "Kitchen Appliances", "Refrigerators", "Air Conditioners", "Washing Machines"]
  },
  {
    name: "Grocery & Food",
    icon: Apple,
    subcategories: ["Fruits", "Vegetables", "Meat", "Seafood", "Beverages", "Snacks", "Frozen Food", "Bakery Items"]
  },
  {
    name: "Health & Sports",
    icon: Dumbbell,
    subcategories: ["Gym Equipment", "Cricket", "Football", "Fitness Accessories", "Supplements", "Medical Equipment"]
  },
  {
    name: "Kids & Babies",
    icon: Baby,
    subcategories: ["Baby Products", "Toys", "Baby Clothing", "Strollers", "School Accessories"]
  },
  {
    name: "Books & Education",
    icon: BookOpen,
    subcategories: ["Academic Books", "Novels", "Islamic Books", "Stationery", "Online Courses", "Tutors"]
  },
  {
    name: "Jobs & Services",
    icon: Briefcase,
    subcategories: ["IT Jobs", "Marketing Jobs", "Home Services", "Repair Services", "Graphic Design", "Web Development", "Photography"]
  },
  {
    name: "Business & Industrial",
    icon: Factory,
    subcategories: ["Machinery", "Tools", "Generators", "Office Equipment", "Wholesale Products"]
  },
  {
    name: "Pets & Animals",
    icon: Dog,
    subcategories: ["Cats", "Dogs", "Birds", "Fish", "Pet Food", "Pet Accessories"]
  },
  {
    name: "Agriculture",
    icon: Tractor,
    subcategories: ["Tractors", "Seeds", "Fertilizers", "Livestock", "Poultry"]
  },
  {
    name: "Events & Entertainment",
    icon: PartyPopper,
    subcategories: ["Wedding Services", "Catering", "Musical Instruments", "DJ Equipment", "Party Supplies"]
  },
  {
    name: "Collectibles & Miscellaneous",
    icon: Gem,
    subcategories: ["Antiques", "Coins", "Art & Paintings", "Handmade Items", "Imported Products", "Gift Items", "Religious Items", "Vintage Products", "Hobby Items", "Other Items"]
  },
  {
    name: "Free Stuff",
    icon: Gift,
    subcategories: ["Giveaway Items", "Donations", "Used Free Items"]
  },
  {
    name: "Sold Out",
    icon: Package,
    subcategories: ["Previously Sold", "Out of Stock"]
  }
];

export const LOCATIONS = [
  'All Pakistan',
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Gujranwala',
  'Peshawar',
  'Quetta',
  'Sargodha',
  'Sialkot',
  'Bahawalpur',
  'Jhang',
  'Sukkur',
  'Larkana',
  'Sheikhupura',
  'Rahim Yar Khan',
  'Mardan',
  'Gujrat',
  'Kasur',
  'Mingora',
  'Dera Ghazi Khan',
  'Sahiwal',
  'Nawabshah',
  'Okara',
  'Mirpur Khas',
  'Chiniot',
  'Shahkot',
  'Kamoke',
  'Sadiqabad',
  'Burewala',
  'Jacobabad',
  'Muzaffargarh',
  'Muridke',
  'Jhelum',
  'Shikarpur',
  'Hafizabad',
  'Kohat',
  'Khanewal',
  'Dera Ismail Khan',
  'Khuzdar',
  'Wah Cantt',
  'Abbottabad',
  'Mandi Bahauddin',
  'Pattoki',
  'Tando Adam',
  'Jauharabad',
  'Mianwali',
  'Hasan Abdal',
  'Attock',
  'Nowshera',
  'Swabi',
  'Khairpur',
  'Taxila',
  'Chaman',
  'Zhob',
  'Sibbi',
  'Hangu',
  'Timargara',
  'Mirpur (AJK)',
  'Muzaffarabad (AJK)',
  'Gilgit',
  'Skardu'
];
