import type { MenuItem, TicketTier, HotelDetails, Place } from "@/lib/types";

export interface PlaceSpecifics {
  // Food & Coffee
  menu?: MenuItem[];
  cuisineType?: string;
  priceRangeText?: string;

  // Ancient, Cultural, Spiritual
  tickets?: TicketTier[];
  dressCode?: string;
  rules?: string[];

  // Hotel
  hotel?: HotelDetails;

  // Nature, Beach, Craft Village, Shopping
  activities?: string[];
  specialtiesToBuy?: string[];
  amenities?: string[];
}

/**
 * Dữ liệu chi tiết đặc thù cho các địa điểm nổi tiếng tại Huế
 */
const SPECIFICS_DICTIONARY: Record<string, PlaceSpecifics> = {
  // --- DI TÍCH CỔ & LĂNG TẨM ---
  "dai-noi": {
    tickets: [
      { type: "Vé người lớn", price: 200000, note: "Toàn bộ khu vực Hoàng thành & Tử Cấm thành" },
      { type: "Trẻ em (7 - 12 tuổi)", price: 40000, note: "Giảm 80% giá vé" },
      { type: "Trẻ em dưới 6 tuổi", price: 0, note: "Miễn phí vé tham quan" },
      { type: "Tuyến 04 điểm (Đại Nội + 3 Lăng)", price: 530000, note: "Tiết kiệm 120.000đ" },
    ],
    dressCode: "Trang phục lịch sự, kín đáo, che vai và đầu gối khi vào các điện thờ",
    rules: [
      "Không sờ tay vào các hiện vật cổ và tranh sơn son thếp vàng",
      "Cấm hút thuốc lá trong toàn bộ khuôn viên di tích gỗ",
      "Không quay phim, chụp ảnh có đèn flash trong khu vực Chánh điện Thái Hòa",
    ],
    amenities: [
      "Xe điện trung chuyển nội khu",
      "Thuyết minh tự động (Audio Guide đa ngôn ngữ)",
      "Quầy cho thuê trang phục Cung đình chụp ảnh",
      "Phòng giữ hành lý miễn phí tại cổng Ngọ Môn",
    ],
    activities: [
      "Chiêm ngưỡng lễ Đổi gác Ngọ Môn (09:00 hàng ngày)",
      "Thưởng thức Nhã nhạc Cung đình Huế tại Duyệt Thị Đường",
      "Khám phá kiến trúc hoàng cung triều Nguyễn",
    ],
  },
  "lang-co": {
    // Lăng Khải Định
    tickets: [
      { type: "Vé người lớn", price: 150000, note: "Tham quan Điện Khải Thành & sân Bái Đính" },
      { type: "Trẻ em (7 - 12 tuổi)", price: 30000, note: "Giảm 80%" },
      { type: "Trẻ em dưới 6 tuổi", price: 0, note: "Miễn phí" },
    ],
    dressCode: "Trang phục trang nhã, giày đế thấp phù hợp leo 127 bậc thang đá",
    rules: [
      "Không chạm tay vào các mảnh ghép sành sứ và tranh 'Cửu Long Ẩn Vân'",
      "Giữ gìn trật tự, tôn nghiêm nơi an nghỉ của bậc tiền nhân",
    ],
    amenities: ["Bãi đỗ ô tô và xe máy rộng rãi", "Quầy giải khát & nón che nắng", "Cửa hàng bán đồ lưu niệm Huế"],
    activities: ["Chiêm ngưỡng nghệ thuật khảm sành sứ tinh xảo", "Check-in hàng tượng quan viên đá uy nghiêm"],
  },
  "lang-tu-duc": {
    tickets: [
      { type: "Vé người lớn", price: 150000, note: "Tham quan Khiêm Lăng, hồ Lưu Khiêm, nhà hát Minh Khiêm" },
      { type: "Trẻ em (7 - 12 tuổi)", price: 30000 },
      { type: "Trẻ em dưới 6 tuổi", price: 0 },
    ],
    dressCode: "Trang phục lịch sự, thanh nhã",
    rules: ["Không vứt rác xuống hồ sen Lưu Khiêm", "Không leo trèo lên lan can gỗ các đình tạ"],
    amenities: ["Quầy bán trà sen và nón bài thơ", "Băng ghế đá nghỉ chân bóng mát dưới rừng thông"],
    activities: ["Ngồi ngắm sen nở tại Xung Khiêm Tạ", "Tìm hiểu thi phú lãng mạn của vua Tự Đức"],
  },
  "lang-minh-mang": {
    tickets: [
      { type: "Vé người lớn", price: 150000, note: "Tham quan Hiếu Lăng trên núi Cẩm Kê" },
      { type: "Trẻ em (7 - 12 tuổi)", price: 30000 },
      { type: "Trẻ em dưới 6 tuổi", price: 0 },
    ],
    dressCode: "Trang phục lịch sự",
    rules: ["Giữ yên tĩnh tại khu vực Bửu Thành", "Không hái sen và hoa cây cảnh"],
    amenities: ["Bãi đậu xe rộng có bóng cây", "Hướng dẫn viên tại điểm"],
    activities: ["Khám phá trục kiến trúc đăng đối chuẩn Nho giáo", "Dạo quanh hồ Trừng Minh và hồ Tân Nguyệt"],
  },
  "cung-an-dinh": {
    tickets: [
      { type: "Vé người lớn", price: 50000, note: "Lâu đài kiến trúc Pháp - Việt bên sông An Cựu" },
      { type: "Trẻ em", price: 0, note: "Miễn phí" },
    ],
    dressCode: "Trang phục thanh lịch, phong cách hoài cổ rất hợp chụp ảnh",
    rules: ["Không dựa vào tranh tường bích họa vẽ 6 lăng tẩm", "Không đi giày đinh gây trầy xước sàn gỗ cổ"],
    amenities: ["Khuôn viên vườn hoa check-in", "Tài liệu giới thiệu song ngữ"],
    activities: ["Chụp ảnh phong cách quý tộc tân cổ điển", "Chiêm ngưỡng các bức bích họa nguyên bản thời Khải Định"],
  },

  // --- CHÙA & TÂM LINH ---
  "chua-thien-mu": {
    tickets: [{ type: "Vé tham quan", price: 0, note: "Miễn phí 100% cho mọi du khách" }],
    dressCode: "Trang phục trang nghiêm, che kín vai và đầu gối, không mặc váy ngắn / áo sát nách",
    rules: [
      "Tháo giày dép trước khi bước vào Chánh điện Đại Hùng",
      "Nói khẽ, bước nhẹ, tắt chuông điện thoại di động",
      "Không chụp ảnh đối diện tượng Phật đang thờ phụng",
    ],
    amenities: ["Bến thuyền rồng cập sát chân chùa", "Quầy bán đậu hũ (tàu hũ đá gừng) nổi tiếng dưới chân dốc", "Bãi xe máy"],
    activities: ["Chiêm bái tháp Phước Duyên 7 tầng", "Lắng nghe tiếng chuông chùa Thiên Mụ ngân vang trên sông Hương"],
  },
  "chua-tu-hieu": {
    tickets: [{ type: "Vé tham quan", price: 0, note: "Miễn phí" }],
    dressCode: "Trang phục giản dị, kín đáo, thanh tịnh",
    rules: ["Giữ im lặng tuyệt đối tại nghĩa trang các Thái giám triều Nguyễn", "Không xả rác quanh hồ bán nguyệt"],
    amenities: ["Không gian thiền định dưới rừng thông", "Nước chè xanh miễn phí tại trai đường"],
    activities: ["Thiền hành dưới tán thông già", "Tìm hiểu câu chuyện đạo hiếu và lịch sử chùa Thái Giám"],
  },
  "chua-huyen-khong-son-thuong": {
    tickets: [{ type: "Vé tham quan", price: 0, note: "Miễn phí" }],
    dressCode: "Trang phục lịch sự, trang nghiêm chốn thiền môn",
    rules: ["Tuyệt đối giữ yên lặng để tăng chúng tu tập", "Đi chậm, nói khẽ"],
    amenities: ["Vườn thư pháp thiền tự", "Rừng thông bạt ngàn mát mẻ"],
    activities: ["Thưởng lãm thư pháp chữ Việt của sư thầy", "Hít thở không khí thanh tịnh vùng đồi núi"],
  },

  // --- ẨM THỰC & NHÀ HÀNG ---
  "com-hen-hoa-dong": {
    cuisineType: "Đặc sản Hến cồn Hến nguyên bản",
    priceRangeText: "15.000đ - 45.000đ / người",
    menu: [
      { name: "Cơm hến chuẩn vị Huế", price: 15000, isSignature: true, description: "Hến xào ruốc, tóp mỡ giòn, hoa chuối, ớt xào" },
      { name: "Bún hến nước dùng thanh ngọt", price: 15000, isSignature: true, description: "Ăn kèm nước canh hến nghi ngút khói" },
      { name: "Mì hến tóp mỡ giòn rụm", price: 15000, description: "Mì tôm xào hến và rau gia vị chua ngọt" },
      { name: "Hến xào xúc bánh tráng nướng", price: 40000, isSignature: true, description: "Đĩa hến đậm đà kèm bánh tráng mè nướng giòn" },
      { name: "Chè bắp Cồn Hến ngọt mát", price: 10000, description: "Bắp non ngọt bùi nấu đường phèn thanh mát" },
    ],
    amenities: ["Chỗ ngồi sân vườn thoáng đãng ven sông", "Trà đá & nước ngô miễn phí", "Thanh toán quét mã QR", "Mua mang về đóng hộp kỹ"],
  },
  "bun-bo-mu-roi": {
    cuisineType: "Bún bò Huế truyền thống nước dùng hầm xương ruốc sả",
    priceRangeText: "40.000đ - 65.000đ / tô",
    menu: [
      { name: "Bún bò giò heo chả cua", price: 45000, isSignature: true, description: "Khoanh giò gân béo ngậy, viên chả cua quết tay thơm lừng" },
      { name: "Bún bò tái nạm gân bò", price: 50000, isSignature: true, description: "Thịt bò tươi mềm ngọt, gân dẻo giòn sần sật" },
      { name: "Bún bò thập cẩm đặc biệt", price: 60000, isSignature: true, description: "Đầy đủ giò, bò, chả cua, huyết, chả cây ăn no nê" },
      { name: "Chả cây gói lá chuối thêm", price: 8000, description: "Chả lụa tiêu đậm đà chuẩn vị Cố đô" },
    ],
    amenities: ["Chỗ để xe máy an toàn", "Có bàn trong nhà và quạt mát", "Phục vụ nhanh chóng", "Thanh toán chuyển khoản"],
  },
  "banh-beo-ba-do": {
    cuisineType: "Bánh Cố đô Huế gia truyền",
    priceRangeText: "40.000đ - 85.000đ / người",
    menu: [
      { name: "Khay bánh bèo tôm cháy (10 chén)", price: 45000, isSignature: true, description: "Bột gạo dẻo, tôm chấy đỏ cam kèm da heo chiên giòn" },
      { name: "Bánh nậm gói lá chuối (5 cái)", price: 35000, isSignature: true, description: "Bột gạo mịn màng nhân tôm thịt mộc nhĩ thơm nức" },
      { name: "Bánh bột lọc tôm thịt trong veo (10 cái)", price: 45000, isSignature: true, description: "Bột lọc dai giòn bao bọc tôm sông rim đậm đà" },
      { name: "Nem lụi nướng sả (10 cây)", price: 75000, description: "Thịt nướng thơm lừng cuộn bánh tráng và nước lèo gan đậu phộng" },
      { name: "Bánh ram ít dẻo giòn", price: 40000, description: "Đế ram chiên giòn rụm bên trên là viên bánh ít mềm mại" },
    ],
    amenities: ["Chỗ đỗ xe ô tô và xe máy rộng rãi", "Nhận đóng gói chân không gửi máy bay", "Không gian rộng phục vụ khách đoàn"],
  },
  "nem-lui-tai-phu": {
    cuisineType: "Nem lụi nướng than & Bánh khoái xứ Huế",
    priceRangeText: "45.000đ - 90.000đ / người",
    menu: [
      { name: "Phần nem lụi nướng sả thơm lừng", price: 65000, isSignature: true, description: "Ăn kèm đĩa rau sống, vả chua ngọt và nước lèo đặc chế" },
      { name: "Bánh khoái tôm thịt nấm giòn rụm", price: 35000, isSignature: true, description: "Chiên vàng ruộm giòn tan chấm sốt tương gan" },
      { name: "Bún thịt nướng tương đậu", price: 40000, description: "Thịt ba chỉ ướp sả nướng than thơm phức" },
    ],
    amenities: ["Vị trí trung tâm ngã tư dễ tìm", "Thanh toán thẻ và QR Code", "Phòng ăn sạch sẽ quạt mát"],
  },

  // --- CÀ PHÊ & TRÀ ---
  "ca-phe-muoi": {
    cuisineType: "Cà phê đặc sản xứ Huế",
    priceRangeText: "22.000đ - 38.000đ / ly",
    menu: [
      { name: "Cà phê Muối đá truyền thống", price: 25000, isSignature: true, description: "Lớp kem sữa béo mặn hòa quyện cà phê phin đậm đà" },
      { name: "Cà phê Muối nóng cốt dừa", price: 28000, isSignature: true, description: "Ấm nồng vị béo ngậy thích hợp buổi sáng sớm" },
      { name: "Bạc xỉu muối ba tầng", price: 28000, description: "Dành cho người thích ngọt dịu và thơm béo" },
      { name: "Trà sen long nhãn hạt chia", price: 35000, description: "Thanh mát giải nhiệt thơm mùi sen Cố đô" },
    ],
    amenities: ["Sân vườn bóng mát cây xanh", "Wifi tốc độ cao", "Chỗ đậu xe máy có người trông", "Cho phép chụp ảnh check-in"],
  },
  "ca-phe-giao": {
    cuisineType: "Cà phê phong cách cổ kính phố cổ Chi Lăng",
    priceRangeText: "20.000đ - 40.000đ / món",
    menu: [
      { name: "Cà phê phin Cố đô", price: 22000, isSignature: true, description: "Pha phin chậm rãi chuẩn phong cách người Huế" },
      { name: "Trà hoa cúc mật ong ấm", price: 30000, description: "Thơm dịu thư thái tâm hồn" },
      { name: "Cà phê trứng kem béo", price: 35000, isSignature: true, description: "Trứng đánh bông mịn như mây không tanh" },
    ],
    amenities: ["Không gian vintage nhà rường cổ kính", "Nhạc acoustic nhẹ nhàng", "Rất yên tĩnh để đọc sách"],
  },

  // --- KHÁCH SẠN & RESORT ---
  "silk-path-grand-hue": {
    hotel: {
      checkInTime: "14:00",
      checkOutTime: "12:00",
      priceRange: "1.600.000đ - 4.200.000đ / đêm",
      roomTypes: [
        "Phòng Deluxe giường đôi nhìn ra sông An Cựu",
        "Phòng Classic Suite phong cách Quý tộc Pháp",
        "Phòng Gia đình Executive ban công rộng",
      ],
    },
    amenities: [
      "Hồ bơi ngoài trời xanh mát",
      "Bữa sáng Buffet Á - Âu tiêu chuẩn 5 sao",
      "Chi Spa trị liệu thảo mộc cung đình",
      "Phòng tập thể hình Gym miễn phí",
      "Xe đạp miễn phí dạo phố Huế",
    ],
  },
  "sahi-wabi-sabi-hostel": {
    hotel: {
      checkInTime: "14:00",
      checkOutTime: "11:30",
      priceRange: "350.000đ - 950.000đ / đêm",
      roomTypes: ["Giường Dorm gỗ tự nhiên", "Phòng đôi Studio phong cách Wabi Sabi", "Phòng Gia đình mái ngói"],
    },
    amenities: ["Hồ bơi mini sân trong", "Không gian xanh yên tĩnh", "Bếp chung tự nấu ăn", "Cho thuê xe máy giá rẻ"],
  },

  // --- LÀNG NGHỀ & MUA SẮM ---
  "lang-huong-thuy-xuan": {
    tickets: [{ type: "Vé tham quan", price: 0, note: "Miễn phí chụp ảnh và trải nghiệm tại các quầy hương" }],
    activities: [
      "Tự tay học se tăm hương và bó hương trầm truyền thống",
      "Chụp ảnh check-in rực rỡ sắc màu với nón lá và quạt giấy",
      "Thưởng thức mùi trầm hương tự nhiên lan tỏa khắp xóm",
    ],
    specialtiesToBuy: [
      "Bó hương bài, hương quế, hương trầm thơm dịu tự nhiên",
      "Nụ trầm đốt thư giãn và đế đốt gốm sứ",
      "Nón bài thơ Huế vẽ thủ công",
      "Tinh dầu tràm và tinh dầu sả nguyên chất",
    ],
    amenities: ["Cho thuê nón lá và trang phục cổ trang", "Các cô chú nghệ nhân hướng dẫn vui vẻ, mến khách"],
  },
  "cho-dong-ba": {
    cuisineType: "Thiên đường ẩm thực chợ truyền thống",
    priceRangeText: "10.000đ - 50.000đ / món ăn vặt",
    activities: [
      "Khám phá khu ẩm thực tầng 1 với bún nghệ, bánh canh cá lóc, chè bột lọc bọc heo quay",
      "Mua sắm vải áo dài và nón bài thơ tại tầng 2 và 3",
      "Trải nghiệm nhịp sống buôn bán tấp nập của người dân xứ Huế",
    ],
    specialtiesToBuy: [
      "Mè xửng Thiên Hương (mè dẻo & mè giòn)",
      "Tôm chua Trọng Đức, mắm cá rò Thuận An",
      "Hạt sen tươi hồ Tịnh Tâm bùi ngọt",
      "Trà Cung Đình 16 vị thảo mộc quý",
      "Dầu tràm nguyên chất cho trẻ nhỏ và người già",
    ],
    rules: [
      "Nên hỏi giá trước và trả giá lịch sự, vui vẻ",
      "Tự bảo quản tư trang cẩn thận khi chợ đông khách",
    ],
  },

  // --- THIÊN NHIÊN & BÃI BIỂN ---
  "doi-vong-canh": {
    tickets: [{ type: "Vé vào cổng", price: 0, note: "Địa điểm công cộng, không thu phí" }],
    activities: [
      "Ngắm toàn cảnh khúc uốn lượn đẹp nhất của dòng sông Hương",
      "Chụp ảnh bình minh và hoàng hôn buông trên đồi thông",
      "Cắm trại dã ngoại cuối tuần cùng bạn bè",
    ],
    rules: [
      "Tuyệt đối không đốt lửa trại dưới tán rừng thông khô",
      "Thu dọn toàn bộ rác thải trước khi ra về để giữ cảnh quan sạch đẹp",
    ],
    amenities: ["Đường đi lát đá sạch đẹp", "Lan can ngắm cảnh an toàn", "Bãi gửi xe có bảo vệ"],
  },
  "bien-thuan-an": {
    tickets: [{ type: "Tắm biển", price: 0, note: "Miễn phí bãi tắm công cộng" }],
    activities: [
      "Tắm biển với làn nước trong xanh và bãi cát thoai thoải",
      "Thưởng thức hải sản mực nhảy nướng, cá dìa hấp hành tại các chòi ven biển",
      "Ngắm bình minh rực rỡ trên biển Đông",
    ],
    rules: ["Chỉ tắm biển trong khu vực có phao an toàn và cờ cứu hộ", "Tuân thủ hướng dẫn của đội cứu hộ"],
    amenities: ["Dịch vụ tắm nước ngọt", "Chòi lá nghỉ ngơi và ăn uống sát biển", "Bãi giữ xe rộng rãi"],
  },
};

/**
 * Trả về đặc điểm riêng chi tiết của địa điểm.
 * Nếu chưa có sẵn trong từ điển, tự động sinh dữ liệu hợp lý và chính xác theo category!
 */
export function getPlaceSpecifics(place: Place): PlaceSpecifics {
  // 1. Kiểm tra nếu place đã có dữ liệu cấu hình sẵn
  if (place.menu || place.tickets || place.hotel || place.activities) {
    return {
      menu: place.menu,
      tickets: place.tickets,
      hotel: place.hotel,
      activities: place.activities,
      specialtiesToBuy: place.specialtiesToBuy,
      amenities: place.amenities,
      dressCode: place.dressCode,
      rules: place.rules,
      cuisineType: place.cuisineType,
      priceRangeText: place.priceRangeText,
    };
  }

  // 2. Tìm trong từ điển các điểm nổi tiếng
  if (SPECIFICS_DICTIONARY[place.id]) {
    return SPECIFICS_DICTIONARY[place.id];
  }

  // 3. Dự đoán thông minh theo danh mục (Category)
  const cat = place.category;

  if (cat === "food") {
    return {
      cuisineType: `Ẩm thực Huế · ${place.name}`,
      priceRangeText: place.price ? `~${place.price.toLocaleString("vi-VN")} đ / phần` : "~25.000đ - 65.000đ / người",
      menu: [
        { name: `Món đặc sản tại ${place.name}`, price: place.price || 35000, isSignature: true, description: "Hương vị đậm đà thơm ngon nức tiếng" },
        { name: "Món ăn kèm chuẩn vị Cố đô", price: Math.round((place.price || 35000) * 0.7), description: "Rau sống tươi sạch ăn kèm nước chấm riêng" },
        { name: "Đồ uống giải khát / Trà thảo mộc", price: 15000, description: "Thanh mát giải nhiệt" },
      ],
      amenities: ["Chỗ để xe máy an toàn", "Thanh toán chuyển khoản / QR", "Phục vụ thân thiện"],
    };
  }

  if (cat === "coffee") {
    return {
      cuisineType: `Cà phê & Đồ uống Cố đô`,
      priceRangeText: place.price ? `~${place.price.toLocaleString("vi-VN")} đ / ly` : "~20.000đ - 40.000đ / ly",
      menu: [
        { name: "Cà phê đặc sản quán", price: place.price || 28000, isSignature: true, description: "Cà phê pha phin thơm đượm nồng nàn" },
        { name: "Trà thảo mộc cung đình", price: 32000, isSignature: true, description: "Trà sen long nhãn hoặc hoa cúc mật ong" },
        { name: "Nước ép trái cây tươi", price: 35000, description: "Hoa quả tươi thanh nhiệt" },
      ],
      amenities: ["Không gian yên tĩnh chill", "Wifi miễn phí tốc độ cao", "Có chỗ ngồi ngoài trời ngắm phố"],
    };
  }

  if (cat === "ancient" || cat === "cultural") {
    const isFree = place.price === 0;
    return {
      tickets: isFree
        ? [{ type: "Vé tham quan", price: 0, note: "Địa điểm mở cửa tự do" }]
        : [
            { type: "Vé người lớn", price: place.price || 150000, note: "Vé vào cửa tham quan di tích" },
            { type: "Trẻ em (7 - 12 tuổi)", price: Math.round((place.price || 150000) * 0.2), note: "Giảm 80%" },
            { type: "Trẻ em dưới 6 tuổi", price: 0, note: "Miễn phí vé" },
          ],
      dressCode: "Trang phục lịch sự, trang nhã, không mặc đồ phản cảm nơi di tích",
      rules: ["Không sờ vào hiện vật", "Không xả rác bừa bãi", "Giữ gìn cảnh quan di sản"],
      amenities: ["Bãi đỗ xe", "Thuyết minh hướng dẫn", "Khuôn viên chụp ảnh lưu niệm"],
      activities: ["Tìm hiểu kiến trúc lịch sử", "Chụp ảnh lưu niệm hoài niệm"],
    };
  }

  if (cat === "spiritual" || cat === "temple") {
    return {
      tickets: [{ type: "Vé viếng chùa", price: 0, note: "Miễn phí toàn bộ du khách" }],
      dressCode: "Trang phục trang nghiêm kín đáo (quần dài, áo có tay), không mặc váy ngắn",
      rules: [
        "Tháo giày dép trước khi vào Chánh điện",
        "Nói khẽ, đi nhẹ, giữ thanh tịnh cửa Phật",
        "Không tự ý chạm vào tượng và đồ thờ cúng",
      ],
      amenities: ["Khuôn viên cây xanh thanh tịnh", "Bãi gửi xe máy", "Nước uống miễn phí"],
      activities: ["Cầu an cho gia đình", "Chiêm bái cảnh chùa cổ kính bình yên"],
    };
  }

  if (cat === "hotel") {
    return {
      hotel: {
        checkInTime: "14:00",
        checkOutTime: "12:00",
        priceRange: place.price ? `~${place.price.toLocaleString("vi-VN")} đ / đêm` : "~500.000đ - 1.800.000đ / đêm",
        roomTypes: ["Phòng tiêu chuẩn Standard", "Phòng cao cấp Deluxe City View", "Phòng Suite Gia đình"],
      },
      amenities: ["Wifi tốc độ cao miễn phí", "Lễ tân 24/7", "Bữa sáng ngon miệng", "Hỗ trợ thuê xe máy/ô tô"],
    };
  }

  if (cat === "nature" || cat === "beach") {
    return {
      tickets: [{ type: "Vé vào cửa", price: place.price || 0, note: place.price ? "Vé bảo tồn sinh thái" : "Miễn phí tự do" }],
      activities: ["Ngắm cảnh thiên nhiên tươi đẹp", "Check-in sống ảo", "Hít thở không khí trong lành", "Dã ngoại cắm trại"],
      rules: ["Bảo vệ môi trường, không xả rác bừa bãi", "Đảm bảo an toàn khi bơi hoặc leo đồi"],
      amenities: ["Bãi giữ xe", "Điểm ngắm cảnh có rào chắn"],
    };
  }

  if (cat === "craft_village" || cat === "shopping") {
    return {
      tickets: [{ type: "Vé tham quan", price: 0, note: "Miễn phí" }],
      activities: ["Trải nghiệm làm nghề truyền thống", "Giao lưu cùng nghệ nhân địa phương", "Chụp ảnh lưu niệm"],
      specialtiesToBuy: ["Mè xửng Huế", "Nón bài thơ", "Tôm chua", "Trà sen Cung Đình", "Đồ thủ công mỹ nghệ"],
      rules: ["Nên hỏi giá trước khi mua sắm", "Bảo quản tư trang cẩn thận"],
    };
  }

  // Mặc định
  return {
    tickets: [{ type: "Vé tham quan", price: place.price || 0, note: place.price ? "Vé vào cửa" : "Miễn phí" }],
    amenities: ["Chỗ để xe máy", "Điểm chụp ảnh lưu niệm"],
  };
}
