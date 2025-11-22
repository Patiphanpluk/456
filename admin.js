const IMAGE_STORAGE_KEY = 'tv_slideshow_images';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('image-form');
    const imageList = document.getElementById('image-list');
    const imageIdInput = document.getElementById('image-id');
    const submitBtn = document.getElementById('submit-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    loadImages();

    form.addEventListener('submit', handleFormSubmit);
    cancelBtn.addEventListener('click', resetForm);

    // --- ฟังก์ชันหลักในการจัดการข้อมูล ---

    function getImages() {
        const data = localStorage.getItem(IMAGE_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    function saveImages(images) {
        localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(images));
        loadImages(); // โหลดข้อมูลซ้ำเพื่ออัปเดตตาราง
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
            
            // ID
            row.insertCell().textContent = img.id; 
            
            // รูปภาพ
            row.insertCell().innerHTML = `<img src="${img.url}" alt="Preview" style="max-height: 50px;">`;
            
            // ระยะเวลา (วิ)
            row.insertCell().textContent = img.display_schedule.duration_sec; 
            
            // แสดงวัน/เวลา
            const schedule = img.display_schedule;
            const daysText = schedule.every_day ? 'ทุกวัน' : (schedule.repeat_days.length > 0 ? schedule.repeat_days.join(', ') : 'ไม่มี');
            const timeText = `${schedule.start_time.substring(0, 5)} - ${schedule.end_time.substring(0, 5)}`;
            row.insertCell().innerHTML = `วัน: ${daysText}<br>เวลา: ${timeText}`;
            
            // วันหมดอายุ
            row.insertCell().textContent = img.expiry_date || 'ไม่มี'; 
            
            // จัดการ
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
        
        const isEditing = !!imageIdInput.value;
        const images = getImages();
        
        const imageUrl = document.getElementById('image-url').value;
        const expiryDate = document.getElementById('expiry-date').value || null;
        const durationSec = parseInt(document.getElementById('duration-sec').value);
        const startTime = document.getElementById('start-time').value + ':00'; // เพิ่มวินาที
        const endTime = document.getElementById('end-time').value + ':00';   // เพิ่มวินาที
        
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
            // แก้ไขรูปภาพที่มีอยู่
            const index = images.findIndex(img => String(img.id) === imageIdInput.value);
            if (index !== -1) {
                images[index] = { ...images[index], ...newImage };
            }
        } else {
            // เพิ่มรูปภาพใหม่
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
        
        // ตรวจสอบวันวนซ้ำ
        document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach(cb => {
            if (['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].includes(cb.value)) {
                 cb.checked = img.display_schedule.repeat_days.includes(cb.value);
            }
        });

        submitBtn.textContent = 'อัปเดตการแก้ไข';
        cancelBtn.style.display = 'inline-block';
        window.scrollTo(0, 0); // เลื่อนไปด้านบน
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
        
        // ตั้งค่าเริ่มต้นใหม่
        document.getElementById('duration-sec').value = 10;
        document.getElementById('start-time').value = '08:00';
        document.getElementById('end-time').value = '20:00';
    }
});
