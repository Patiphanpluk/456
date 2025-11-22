const IMAGE_STORAGE_KEY = 'tv_slideshow_images';
// ⚠️ API Key ที่ถูกเปิดเผยต่อสาธารณะ ⚠️
const PIC_IN_TH_API_KEY = 'chv_eJ0c_c2f249bbc1a462be75bc2ee047db76af6720da2a93848b51483d6f4d7a8c45d6cbb5a78fbec3e3a00eed04baefd056ab14fd6eab29dc109fe512859b488e4318';
const PIC_IN_TH_URL = 'https://api.pic.in.th/v1/upload';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('image-form');
    const imageList = document.getElementById('image-list');
    const imageIdInput = document.getElementById('image-id');
    const submitBtn = document.getElementById('submit-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const fileInput = document.getElementById('image-file');
    const uploadBtn = document.getElementById('upload-btn');
    const imageUrlInput = document.getElementById('image-url');
    const uploadStatus = document.getElementById('upload-status');
    const loadingOverlay = document.getElementById('loading-overlay');

    loadImages();

    form.addEventListener('submit', handleFormSubmit);
    cancelBtn.addEventListener('click', resetForm);
    uploadBtn.addEventListener('click', handleUpload);

    // --- ฟังก์ชันจัดการการอัปโหลดไฟล์ ---

    async function handleUpload() {
        const file = fileInput.files[0];
        if (!file) {
            uploadStatus.textContent = 'โปรดเลือกไฟล์รูปภาพก่อนอัปโหลด';
            return;
        }

        loadingOverlay.style.display = 'flex';
        uploadStatus.textContent = 'กำลังอัปโหลด... โปรดรอสักครู่';

        try {
            const formData = new FormData();
            formData.append('file', file);
            
            // เพิ่ม API Key ใน Headers
            const headers = new Headers();
            headers.append('key', PIC_IN_TH_API_KEY);

            const response = await fetch(PIC_IN_TH_URL, {
                method: 'POST',
                headers: headers,
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.status === 'success') {
                const uploadedUrl = result.url_viewer; // ใช้ url_viewer เพื่อแสดงผล
                imageUrlInput.value = uploadedUrl;
                uploadStatus.textContent = '✅ อัปโหลดสำเร็จ! URL ถูกกรอกในช่องเรียบร้อย';
                uploadStatus.style.color = '#10b981';

            } else {
                uploadStatus.textContent = `❌ อัปโหลดล้มเหลว: ${result.message || 'เกิดข้อผิดพลาดในการเรียก API'}`;
                uploadStatus.style.color = '#dc3545';
            }

        } catch (error) {
            uploadStatus.textContent = `❌ ข้อผิดพลาดเครือข่าย: ไม่สามารถติดต่อ Pic.in.th ได้`;
            uploadStatus.style.color = '#dc3545';
            console.error('Upload Error:', error);
        } finally {
            loadingOverlay.style.display = 'none';
        }
    }


    // --- ฟังก์ชันหลักในการจัดการข้อมูล (เหมือนเดิม) ---

    function getImages() {
        const data = localStorage.getItem(IMAGE_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    function saveImages(images) {
        localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(images));
        loadImages(); 
    }

    function loadImages() {
        const images = getImages();
        imageList.innerHTML = '';
        
        if (images.length === 0) {
            imageList.innerHTML = '<tr><td colspan="6">ยังไม่มีรูปภาพที่บันทึกไว้ใน Local Storage</td></tr>';
            return;
        }

        images.forEach(img => {
            const row = imageList.insertRow();
            
            row.insertCell().textContent = img.id; 
            row.insertCell().innerHTML = `<img src="${img.url}" alt="Preview" onerror="this.src='https://via.placeholder.com/100x50?text=Error';" style="max-height: 50px;">`;
            row.insertCell().textContent = img.display_schedule.duration_sec; 
            
            const schedule = img.display_schedule;
            const daysText = schedule.every_day ? 'ทุกวัน' : (schedule.repeat_days.length > 0 ? schedule.repeat_days.join(', ') : 'ไม่มี');
            const timeText = `${schedule.start_time.substring(0, 5)} - ${schedule.end_time.substring(0, 5)}`;
            row.insertCell().innerHTML = `วัน: ${daysText}<br>เวลา: ${timeText}`;
            
            row.insertCell().textContent = img.expiry_date || 'ไม่มี'; 
            
            const actionsCell = row.insertCell();
            const editBtn = document.createElement('button');
            editBtn.textContent = 'แก้ไข';
            editBtn.onclick = () => editImage(img.id);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'ลบ';
            deleteBtn.style.backgroundColor = '#dc3545';
            deleteBtn.onclick = () => deleteImage(img.id);

            actionsCell.appendChild(editBtn);
            actionsCell.appendChild(deleteBtn);
        });
    }

    // --- ฟังก์ชันจัดการการส่งฟอร์ม (เพิ่ม/แก้ไข) ---

    function handleFormSubmit(event) {
        event.preventDefault();
        
        // ตรวจสอบว่ามี URL ในช่องก่อนบันทึก
        if (!imageUrlInput.value) {
            alert("โปรดอัปโหลดรูปภาพหรือกรอก URL ก่อนบันทึก");
            return;
        }
        
        const isEditing = !!imageIdInput.value;
        const images = getImages();
        
        const imageUrl = imageUrlInput.value;
        const expiryDate = document.getElementById('expiry-date').value || null;
        const durationSec = parseInt(document.getElementById('duration-sec').value);
        const startTime = document.getElementById('start-time').value + ':00';
        const endTime = document.getElementById('end-time').value + ':00';
        
        const everyDay = document.getElementById('every-day-check').checked;
        const repeatDays = Array.from(document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked'))
            .filter(cb => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].includes(cb.value))
            .map(cb => cb.value);

        const newImage = {
            url: imageUrl,
            expiry_date: expiryDate,
            display_schedule: {
                start_time: startTime,
                end_time: endTime,
                repeat_days: repeatDays,
                every_day: everyDay,
                duration_sec: durationSec
            }
        };

        if (isEditing) {
            const index = images.findIndex(img => String(img.id) === imageIdInput.value);
            if (index !== -1) {
                images[index] = { ...images[index], ...newImage };
            }
        } else {
            const newId = images.length > 0 ? Math.max(...images.map(img => img.id)) + 1 : 1;
            newImage.id = newId;
            images.push(newImage);
        }
        
        saveImages(images);
        resetForm();
    }

    // --- ฟังก์ชันแก้ไข/ลบ/รีเซ็ต ---

    function editImage(id) {
        const images = getImages();
        const img = images.find(i => i.id === id);
        if (!img) return;

        // เติมฟอร์ม
        document.getElementById('image-id').value = img.id;
        document.getElementById('image-url').value = img.url;
        document.getElementById('expiry-date').value = img.expiry_date ? img.expiry_date.split('T')[0] : '';
        document.getElementById('duration-sec').value = img.display_schedule.duration_sec;
        document.getElementById('start-time').value = img.display_schedule.start_time.substring(0, 5);
        document.getElementById('end-time').value = img.display_schedule.end_time.substring(0, 5);
        document.getElementById('every-day-check').checked = img.display_schedule.every_day;
        
        document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach(cb => {
            if (['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].includes(cb.value)) {
                 cb.checked = img.display_schedule.repeat_days.includes(cb.value);
            }
        });

        submitBtn.textContent = 'อัปเดตการแก้ไข';
        cancelBtn.style.display = 'inline-block';
        window.scrollTo(0, 0);
    }

    function deleteImage(id) {
        if (confirm(`คุณต้องการลบรูปภาพ ID ${id} ใช่หรือไม่?`)) {
            let images = getImages();
            images = images.filter(img => img.id !== id);
            saveImages(images);
        }
    }

    function resetForm() {
        form.reset();
        imageIdInput.value = '';
        submitBtn.textContent = 'บันทึกรูปภาพ';
        cancelBtn.style.display = 'none';
        uploadStatus.textContent = '';
        fileInput.value = ''; // ล้างไฟล์ที่เลือกไว้
        
        // ตั้งค่าเริ่มต้นใหม่
        document.getElementById('duration-sec').value = 10;
        document.getElementById('start-time').value = '08:00';
        document.getElementById('end-time').value = '20:00';
    }
});
