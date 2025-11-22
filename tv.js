const IMAGE_STORAGE_KEY = 'tv_slideshow_images';
const imageElement = document.getElementById('current-image');
const blurredBackground = document.getElementById('blurred-background');
const noImageMessage = document.getElementById('no-image-message');

let images = [];
let currentImageIndex = 0;
let slideshowTimeout;

// Helper function: แปลงวันในสัปดาห์ปัจจุบันเป็นชื่อย่อ (e.g., 'Mon', 'Sun')
function getCurrentDayAbbrev() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[new Date().getDay()];
}

// 1. โหลดข้อมูลรูปภาพจาก Local Storage
function getImagesFromStorage() {
    const data = localStorage.getItem(IMAGE_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

// 2. กรองและเริ่มต้นสไลด์โชว์
function fetchAndFilterImages() {
    const allImages = getImagesFromStorage();
    
    // กรองรูปภาพที่พร้อมแสดงผลตามเงื่อนไขทั้งหมด
    images = allImages.filter(img => {
        const now = new Date();
        const todayAbbrev = getCurrentDayAbbrev();
        
        // 1. ตรวจสอบวันหมดอายุ (expiry_date)
        if (img.expiry_date && new Date(img.expiry_date) < now) {
            return false; 
        }
        
        // 2. ตรวจสอบตารางเวลา: วันที่วนซ้ำ (repeat_days, every_day)
        const schedule = img.display_schedule;
        const shouldDisplayToday = schedule.every_day || schedule.repeat_days.includes(todayAbbrev);
        if (!shouldDisplayToday) {
            return false; 
        }
        
        // 3. ตรวจสอบตารางเวลา: ช่วงเวลา (start_time, end_time)
        // สร้าง Date object เปรียบเทียบเวลา (แปลงเป็นวินาทีของวัน)
        const [hStart, mStart] = schedule.start_time.split(':').map(Number);
        const [hEnd, mEnd] = schedule.end_time.split(':').map(Number);
        
        const nowTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        const startTimeSec = hStart * 3600 + mStart * 60;
        const endTimeSec = hEnd * 3600 + mEnd * 60;

        if (nowTime < startTimeSec || nowTime > endTimeSec) {
            return false;
        }
        
        return true; // ผ่านทุกเงื่อนไข
    });

    // จัดเรียงรูปภาพตาม ID
    images.sort((a, b) => parseInt(a.id) - parseInt(b.id));

    if (images.length === 0) {
        stopSlideshow();
        imageElement.style.display = 'none';
        blurredBackground.style.backgroundImage = 'none';
        noImageMessage.style.display = 'block';
    } else {
        noImageMessage.style.display = 'none';
        imageElement.style.display = 'block';
        startSlideshow();
    }
}

// 3. เริ่มต้นและจัดการสไลด์โชว์
function startSlideshow() {
    if (images.length === 0) return;

    // เคลียร์ Timeout เก่าก่อน
    if (slideshowTimeout) clearTimeout(slideshowTimeout);

    // ตรวจสอบ Index หากเกินจำนวนรูปภาพที่กรองได้ 
    if (currentImageIndex >= images.length) {
        currentImageIndex = 0;
    }

    // แสดงรูปภาพปัจจุบัน
    displayImage(currentImageIndex);
    
    // ตั้งค่า Timeout ตามเวลาวนซ้ำของรูปภาพปัจจุบัน
    const currentDuration = images[currentImageIndex].display_schedule.duration_sec * 1000;
    
    slideshowTimeout = setTimeout(() => {
        currentImageIndex = (currentImageIndex + 1) % images.length;
        // เรียกใช้ startSlideshow ใหม่ เพื่อใช้ duration_sec ของรูปภาพถัดไป
        startSlideshow(); 
    }, currentDuration);
}

// 4. แสดงรูปภาพปัจจุบัน
function displayImage(index) {
    const imgData = images[index];
    if (!imgData) return;

    // ตั้งค่า URL ของรูปภาพหลักและพื้นหลังเบลอ
    blurredBackground.style.backgroundImage = `url('${imgData.url}')`;
    
    // ตั้งค่ารูปภาพหลัก
    imageElement.src = imgData.url;
}

// 5. หยุดสไลด์โชว์
function stopSlideshow() {
    if (slideshowTimeout) clearTimeout(slideshowTimeout);
}

// --- เริ่มต้นโปรแกรม ---

// โหลดและแสดงผลเมื่อเริ่มต้น
fetchAndFilterImages();

// ตรวจสอบข้อมูลซ้ำทุกๆ 5 นาที เพื่อรองรับการอัปเดตจากหน้า Admin 
setInterval(fetchAndFilterImages, 300000);
