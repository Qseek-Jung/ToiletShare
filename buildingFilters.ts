export const ALLOW_PRIMARY_TYPES = [
    "premise"
];

export const CONDITIONAL_TYPES = [
    "point_of_interest",
    "establishment"
];

export const EXCLUDE_TYPES = [
    // Commercial
    "restaurant", "cafe", "bar", "store",
    "convenience_store", "supermarket", "shopping_mall",
    "clothing_store", "electronics_store", "furniture_store",
    "home_goods_store", "jewelry_store", "liquor_store",
    "pet_store", "shoe_store", "department_store", "wholesaler",

    // Services
    "pharmacy", "hospital", "bank", "atm",
    "hair_care", "gym", "beauty_salon", "spa",
    "laundry", "real_estate_agency", "travel_agency",
    "veterinary_care", "doctor", "dentist",

    // Lodging
    "lodging", "hotel", "motel", "guest_house",

    // Education/Religion
    "school", "church", "temple", "synagogue", "university",
    "primary_school", "secondary_school",

    // Transport
    "bus_station", "subway_station", "parking", "taxi_stand",
    "train_station", "transit_station", "airport"
];

export const EXCLUDE_KEYWORDS = [
    "점", "지점", "본점", "분점", "호점",
    "매장", "샵", "스토어",
    "편의점", "마트",
    "카페", "커피",
    "치킨", "피자", "버거",
    "약국", "병원", "의원",
    "미용", "헤어", "네일",
    "식당", "주점", "호프",
    "센터점",
    "(주)", "주식회사", "유한회사", "파트너스",
    "Inc", "Corp", "LLC", "Co", "Ltd"
];

export const BUILDING_SUFFIX = [
    "빌딩", "타워", "플라자", "센터",
    "몰", "스퀘어", "관", "회관",
    "청", "파크", "아파트", "오피스텔", "케이에스"
];
