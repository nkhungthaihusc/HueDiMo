require('dotenv').config();
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const cleanConn = (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]+/, "");
const pool = new Pool({
  connectionString: cleanConn,
  ssl: { rejectUnauthorized: false }
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'huedimo-media';

// Dictionary từ khóa tìm kiếm chính xác cho từng loại địa điểm để có ảnh đẹp nhất
const SEARCH_KEYWORDS = {
  'dai-noi': 'Dai Noi Hue Imperial City Ngọ Môn',
  'lang-co': 'Khai Dinh Tomb Hue',
  'lang-tu-duc': 'Tu Duc Tomb Hue',
  'lang-minh-mang-hieu-lang': 'Minh Mang Tomb Hue',
  'lang-gia-long-thien-tho-lang': 'Gia Long Tomb Hue',
  'lang-dong-khanh-tu-lang': 'Dong Khanh Tomb Hue',
  'lang-thieu-tri-xuong-lang': 'Thieu Tri Tomb Hue',
  'chua-thien-mu': 'Thien Mu Pagoda Hue',
  'chua-tu-hieu': 'Tu Hieu Pagoda Hue',
  'chua-huyen-khong-son-thuong': 'Huyen Khong Son Thuong Pagoda Hue',
  'chua-huyen-khong-1-huyen-khong-son-trung': 'Huyen Khong Pagoda Hue',
  'chua-bao-quoc': 'Bao Quoc Pagoda Hue',
  'chua-dieu-de': 'Dieu De Pagoda Hue',
  'cung-an-dinh': 'An Dinh Palace Hue',
  'cau-truong-tien': 'Trang Tien Bridge Hue',
  'cau-ngoi-thanh-toan-cho-que': 'Thanh Toan Bridge Hue',
  'doi-vong-canh': 'Vong Canh Hill Hue',
  'phong-nha-nho': 'Thuy Tien Lake Abandoned Water Park Hue',
  'dan-vien-thien-an': 'Thien An Monastery Hue',
  'dien-hon-chen': 'Hon Chen Temple Hue',
  'nha-tho-phu-cam': 'Phu Cam Cathedral Hue',
  'hai-van-quan': 'Hai Van Pass Quan',
  'vinh-lang-co': 'Lang Co Bay Hue',
  'dam-lap-an': 'Lap An Lagoon Hue',
  'dam-chuon-pha-tam-giang': 'Tam Giang Lagoon Hue Dam Chuon',
  'vuon-quoc-gia-bach-ma': 'Bach Ma National Park Hue',
  'thien-vien-truc-lam-bach-ma': 'Truc Lam Bach Ma Zen Monastery',
  'suoi-voi-khu-du-lich-suoi-voi': 'Elephant Springs Hue Suoi Voi',
  'suoi-khoang-nong-thanh-tan': 'Alba Thanh Tan Hot Springs Hue',
  'bai-bien-thuan-an': 'Thuan An Beach Hue',
  'bai-bien-vinh-thanh': 'Vinh Thanh Beach Hue',
  'bien-canh-duong': 'Canh Duong Beach Hue',
  'ho-truoi': 'Truoi Lake Hue',
  'ho-khe-ngang': 'Khe Ngang Lake Hue',
  'nui-ngu-binh': 'Ngu Binh Mountain Hue',
  'lang-huong-thuy-xuan': 'Thuy Xuan Incense Village Hue',
  'lang-hoa-giay-thanh-tien': 'Thanh Tien Paper Flower Village Hue',
  'lang-co-phuoc-tich': 'Phuoc Tich Ancient Village Hue',
  'lang-co-kim-long': 'Kim Long Ancient Village Hue',
  'lang-duong-no': 'Duong No Village Hue',
  'phuong-duc-dong-hue': 'Phuong Duc Bronze Casting Hue',
  'an-hien': 'An Hien Garden House Hue',
  'bao-tang-co-vat-cung-dinh-hue': 'Hue Museum of Royal Antiquities',
  'duyet-thi-duong': 'Duyet Thi Duong Royal Theater Hue',
  'ky-dai-phu-van-lau-nghenh-luong-dinh': 'Phu Van Lau Hue Flag Tower',
  'trung-tam-van-hoa-huyen-tran': 'Huyen Tran Cultural Center Hue',
  'khong-gian-luu-niem-le-ba-dang-lebadang-memory-space': 'Lebadang Memory Space Hue',
  'cho-dong-ba': 'Dong Ba Market Hue',
  'khu-pho-tay-hue': 'Hue Walking Street Pham Ngu Lao',
  'pho-di-bo-hai-ba-trung': 'Hai Ba Trung Walking Street Hue',
  'pho-co-bao-vinh': 'Bao Vinh Ancient Town Hue',
  'bun-bo': 'Bun Bo Hue beef noodle soup',
  'com-hen': 'Com hen Hue baby clam rice',
  'banh-beo-nam-loc-ba-do': 'Banh beo Hue water fern cake',
  'banh-khoai-hanh': 'Banh khoai Hue crispy pancake',
  'banh-ep-chi-hue': 'Banh ep Hue savory pancake',
  'nem-lui-tai-phu': 'Nem lui Hue grilled pork skewer',
  'che-hem-hung-vuong': 'Che Hue sweet dessert soup',
  'ca-phe-muoi-goc-dang-thai-than': 'Ca phe muoi Salt coffee Hue',
  'ca-phe-giao': 'Ca phe Giao Hue vintage coffee',
  'azerai-la-residence-hue': 'Azerai La Residence Hue hotel',
  'melia-vinpearl-hue': 'Melia Vinpearl Hue hotel',
  'khach-san': 'Silk Path Grand Hue Hotel',
  'pilgrimage-village-boutique-resort-spa-lang-hanh-huong': 'Pilgrimage Village Resort Hue',
  'sahi-wabi-sabi-hostel-retreat': 'Sahi Wabi Sabi Retreat Hue',
  'ho-trai-tim-7357': 'Ho Trai Tim Hue entertainment park'
};

// Fallback high quality Hue images by category
const CATEGORY_FALLBACKS = {
  ancient: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80',
  spiritual: 'https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&w=1200&q=80',
  nature: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  food: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=80',
  cultural: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  entertainment: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80'
};

async function searchWikimediaImage(query) {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=filetype:bitmap ${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=3&prop=imageinfo&iiprop=url`;
    const res = await fetch(url, { headers: { 'User-Agent': 'HueDiMoTravelApp/1.0 (contact@huedimo.vn)' } });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = Object.values(data.query?.pages || {});
    if (pages.length > 0 && pages[0].imageinfo?.[0]?.url) {
      // Remove query string if any
      return pages[0].imageinfo[0].url.split('?')[0];
    }
  } catch (err) {
    // ignore
  }
  return null;
}

async function downloadAndUploadImage(placeId, imageUrl, category) {
  try {
    let sourceUrl = imageUrl;
    if (!sourceUrl) {
      sourceUrl = CATEGORY_FALLBACKS[category] || CATEGORY_FALLBACKS.ancient;
    }

    const res = await fetch(sourceUrl, {
      headers: { 'User-Agent': 'HueDiMoTravelApp/1.0 (contact@huedimo.vn)' },
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());

    // File name
    const filePath = `places/${placeId}.jpg`;
    const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, buffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err) {
    console.warn(`  ⚠️ Failed to upload image from ${imageUrl} for ${placeId}: ${err.message}. Trying category fallback...`);
    try {
      const fallbackUrl = CATEGORY_FALLBACKS[category] || CATEGORY_FALLBACKS.ancient;
      const res = await fetch(fallbackUrl, { signal: AbortSignal.timeout(10000) });
      const buffer = Buffer.from(await res.arrayBuffer());
      const filePath = `places/${placeId}.jpg`;
      await supabase.storage.from(BUCKET_NAME).upload(filePath, buffer, { contentType: 'image/jpeg', upsert: true });
      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
      return data.publicUrl;
    } catch (e2) {
      console.error(`  ❌ Fallback also failed: ${e2.message}`);
      return null;
    }
  }
}

async function main() {
  console.log('🚀 Bắt đầu tiến trình cập nhật ảnh cho tất cả địa điểm trong database...');
  const placesRes = await pool.query('SELECT id, name, category FROM public.places ORDER BY id ASC');
  const places = placesRes.rows;
  console.log(`📋 Tổng cộng: ${places.length} địa điểm.`);

  let updatedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    console.log(`\n[${i + 1}/${places.length}] Đang xử lý: ${p.name} (id: ${p.id})`);

    // 1. Tìm ảnh Wikimedia tương ứng
    const query = SEARCH_KEYWORDS[p.id] || `${p.name} Hue Vietnam`;
    let foundUrl = await searchWikimediaImage(query);

    if (foundUrl) {
      console.log(`  ✓ Tìm thấy ảnh Wikimedia: ${foundUrl.substring(0, 75)}...`);
    } else {
      console.log(`  ℹ Dùng ảnh chất lượng cao chuyên biệt theo danh mục: ${p.category}`);
    }

    // 2. Tải về và đẩy lên Supabase Storage
    const publicUrl = await downloadAndUploadImage(p.id, foundUrl, p.category);

    if (publicUrl) {
      // 3. Cập nhật vào DB
      await pool.query(
        `UPDATE public.places 
         SET image_url = $1, images = $2, updated_at = NOW() 
         WHERE id = $3`,
        [publicUrl, [publicUrl], p.id]
      );
      console.log(`  ✅ Đã cập nhật DB: ${publicUrl}`);
      updatedCount++;
    } else {
      console.error(`  ❌ Không thể cập nhật ảnh cho ${p.id}`);
      failedCount++;
    }

    // Nghỉ 300ms tránh rate limit
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n🎉 HOÀN THÀNH TIẾN TRÌNH! Thành công: ${updatedCount}, Lỗi: ${failedCount}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
