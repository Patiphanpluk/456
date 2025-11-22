const IMAGE_STORAGE_KEY = 'tv_slideshow_images';
const imageElement = document.getElementById('current-image');
const blurredBackground = document.getElementById('blurred-background');
const noImageMessage = document.getElementById('no-image-message');
const floatingAdminBtn = document.getElementById('floating-admin-btn');

let images = [];
let currentImageIndex = 0;
let slideshowTimeout;

// ... (ฟังก์ชัน getCurrentDayAbbrev, getImagesFromStorage, displayImage, stopSlideshow เหมือนเดิม)

// Helper function: แปลงวันในสัปดาห์ปัจจุบันเป็นชื่อย่อ (e.g., 'Mon', 'Sun')
function getCurrentDayAbbrev() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[new Date().getDay()];
}

function getImagesFromStorage() {
    const data = localStorage.getItem(IMAGE_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function displayImage(index) {
    const imgData = images[index];
    if (!imgData) return;
    blurredBackground.style.backgroundImage = `url('${imgData.url}')`;
    imageElement.src = imgData.url;
}

function stopSlideshow() {
    if (slideshowTimeout) clearTimeout(slideshowTimeout);
}
// ... (จบฟังก์ชันที่เหมือนเดิม)

// 2. กรองและเริ่มต้นสไลด์โชว์ (แก้ไขการจัดการเมื่อไม่มีรูปภาพ)
function fetchAndFilterImages() {
    const allImages = getImagesFromStorage();
    
    // หากไม่มีข้อมูลใน Local Storage เลย ให้เปลี่ยนเส้นทางไปยังหน้า Admin
    if (allImages.length === 0) {
        // เปลี่ยนเส้นทางหลังจาก 3 วินาที เพื่อให้ผู้ใช้เห็นหน้าจอทีวีก่อน
        setTimeout(() => {
             window.location.href = 'admin.html';
        }, 3000); 
        floatingAdminBtn.style.display = 'none'; // ซ่อนปุ่มลอย
        return;
    }

    images = allImages.filter(img => {
        const now = new Date();
        const todayAbbrev = getCurrentDayAbbrev();
        
        // 1. ตรวจสอบวันหมดอายุ (expiry_date)
        if (img.expiry_date && new Date(img.expiry_date) < now) { return false; } 
        
        // 2. ตรวจสอบตารางเวลา: วันที่วนซ้ำ (repeat_days, every_day)
        const schedule = img.display_schedule;
        const shouldDisplayToday = schedule.every_day || schedule.repeat_days.includes(todayAbbrev);
        if (!shouldDisplayToday) { return false; } 
        
        // 3. ตรวจสอบตารางเวลา: ช่วงเวลา (start_time, end_time)
        const [hStart, mStart] = schedule.start_time.split(':').map(Number);
        const [hEnd, mEnd] = schedule.end_time.split(':').map(Number);
        const nowTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        const startTimeSec = hStart * 3600 + mStart * 60;
        const endTimeSec = hEnd * 3600 + mEnd * 60;

        if (nowTime < startTimeSec || nowTime > endTimeSec) { return false; }
        
        return true; 
    });

    images.sort((a, b) => parseInt(a.id) - parseInt(b.id));

    if (images.length === 0) {
        stopSlideshow();
        imageElement.style.display = 'none';
        blurredBackground.style.backgroundImage = 'none';
        noImageMessage.style.display = 'block';
        floatingAdminBtn.style.display = 'none'; // ซ่อนปุ่มลอยเมื่อแสดงกล่องข้อความ
    } else {
        noImageMessage.style.display = 'none';
        imageElement.style.display = 'block';
        floatingAdminBtn.style.display = 'block'; // แสดงปุ่มลอยเมื่อแสดงสไลด์โชว์
        startSlideshow();
    }
}

// 3. เริ่มต้นและจัดการสไลด์โชว์ (เหมือนเดิม)
function startSlideshow() {
    if (images.length === 0) return;
    if (slideshowTimeout) clearTimeout(slideshowTimeout);

    if (currentImageIndex >= images.length) {
        currentImageIndex = 0;
    }

    displayImage(currentImageIndex);
    
    const currentDuration = images[currentImageIndex].display_schedule.duration_sec * 1000;
    
    slideshowTimeout = setTimeout(() => {
        currentImageIndex = (currentImageIndex + 1) % images.length;
        startSlideshow(); 
    }, currentDuration);
}


// --- เริ่มต้นโปรแกรม ---
fetchAndFilterImages();
// ตรวจสอบข้อมูลซ้ำทุกๆ 5 นาที (300000 ms)
setInterval(fetchAndFilterImages, 300000);
