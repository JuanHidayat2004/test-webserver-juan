import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAUDWgEHvBUBGcwJlpZirL41vEfuLPJ4zk",
    authDomain: "web-serverless-d42d1.firebaseapp.com",
    databaseURL: "https://web-serverless-d42d1-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "web-serverless-d42d1",
    storageBucket: "web-serverless-d42d1.firebasestorage.app",
    messagingSenderId: "1079339535241",
    appId: "1:1079339535241:web:df8b79f356a4fbe62faf58",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// GANTI DENGAN URL APPS SCRIPT ANDA
const gasURL = "https://script.google.com/macros/s/AKfycbxZcVWmDa46-0229z_b2X8cXG7tH4Dlw8TJH1V5ATzAJYtyW2XiRRkg4Om86qHZSbC1/exec";
const dbRef = ref(db, 'statusUpdate/lastData');

const loginSection = document.getElementById('loginSection');
const mainContent = document.getElementById('mainContent');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');

const form = document.getElementById('uploadForm');
const statusText = document.getElementById('status');
const btn = document.getElementById('submitBtn');
const dataList = document.getElementById('dataList');

// VARIABEL PENYIMPAN EMAIL
let currentUserEmail = ""; 

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginSection.style.display = 'none';
        mainContent.style.display = 'block';
        userInfo.innerText = `Halo, ${user.displayName}`; 
        
        // SIMPAN EMAIL USER
        currentUserEmail = user.email; 
        
        ambilDataDariSheets();
    } else {
        loginSection.style.display = 'block';
        mainContent.style.display = 'none';
        userInfo.innerText = '';
        
        // KOSONGKAN EMAIL
        currentUserEmail = ""; 
    }
});

loginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch((error) => console.error("Error Login:", error));
});

logoutBtn.addEventListener('click', () => {
    signOut(auth).catch((error) => console.error("Error Logout:", error));
});

onValue(dbRef, () => {
    console.log('Firebase mendeteksi perubahan! Mengambil data terbaru...');
    // Cek apakah user sedang login sebelum menarik data
    if (currentUserEmail !== "") {
        ambilDataDariSheets();
    }
});

async function ambilDataDariSheets() {
    try {
        const response = await fetch(gasURL);
        const data = await response.json();

        dataList.innerHTML = '';

        if (data.length === 0) {
            dataList.innerHTML = 'Belum ada data.';
            return;
        }

        data.forEach((item) => {
            if (item.teks === 'Teks' || !item.teks) return;

            const card = document.createElement('div');
            card.className = 'card';
            // MENAMPILKAN EMAIL PENGIRIM DI DALAM CARD (Berdasarkan CSS lama)
            card.innerHTML = `
                <p class="teks-utama"><strong>Teks:</strong> ${item.teks}</p>
                <p class="waktu" style="margin-top: 5px;">
                    <small>⏰ ${new Date(item.waktu).toLocaleString()}</small><br>
                    ${item.emailPengirim ? `<small>👤 Oleh: ${item.emailPengirim}</small>` : ''}
                </p>
                ${item.urlFile ? `<a href="${item.urlFile}" target="_blank">🔗 Lihat File Pendukung</a>` : ''}
            `;
            dataList.appendChild(card);
        });
    } catch (error) {
        dataList.innerHTML = 'Gagal memuat data.';
        console.error('Error ambil data:', error);
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const teks = document.getElementById('teksData').value;
    const fileInput = document.getElementById('fileUpload').files[0];

    if (!fileInput) {
        statusText.innerText = '❌ Tolong pilih file terlebih dahulu!';
        return;
    }

    btn.disabled = true;
    statusText.innerText = 'Mempersiapkan data...';

    // Ambil referensi elemen progress bar
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const speedText = document.getElementById('speedText');

    const reader = new FileReader();
    reader.readAsDataURL(fileInput);

    reader.onload = function () {
        const payload = {
            teks: teks,
            file: reader.result,
            filename: fileInput.name,
            emailPengirim: currentUserEmail 
        };

        const payloadString = JSON.stringify(payload);
        
        // Tampilkan progress bar dan reset nilainya
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.innerText = '0%';
        speedText.innerText = 'Menghitung...';
        statusText.innerText = 'Mengunggah ke server...';

        // Variabel untuk menghitung kecepatan
        let previousLoaded = 0;
        let previousTime = Date.now();

        // Menggunakan XMLHttpRequest agar bisa melacak progress
        const xhr = new XMLHttpRequest();
        xhr.open('POST', gasURL, true);
        xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');

        // Event listener saat proses unggah berjalan
        xhr.upload.onprogress = function(event) {
            if (event.lengthComputable) {
                // Hitung persentase 0 - 100
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                progressBar.style.width = percentComplete + '%';
                progressText.innerText = percentComplete + '%';

                // Hitung kecepatan (Update setiap 0.5 detik agar angka tidak terlalu berkedip)
                const currentTime = Date.now();
                const timeDiff = (currentTime - previousTime) / 1000; // dalam detik
                
                if (timeDiff >= 0.5) { 
                    const bytesDiff = event.loaded - previousLoaded;
                    const speedBps = bytesDiff / timeDiff; // Byte per detik
                    const speedKbps = speedBps / 1024; // KB per detik
                    
                    if (speedKbps > 1024) {
                        speedText.innerText = (speedKbps / 1024).toFixed(2) + ' MB/s';
                    } else {
                        speedText.innerText = speedKbps.toFixed(1) + ' KB/s';
                    }
                    
                    previousTime = currentTime;
                    previousLoaded = event.loaded;
                }
                
                if (percentComplete === 100) {
                    speedText.innerText = 'Memproses di Google Drive...';
                }
            }
        };

        // Event listener saat respon dari Google Apps Script diterima
        xhr.onload = function() {
            if (xhr.status === 200 || xhr.status === 302) {
                try {
                    const result = JSON.parse(xhr.responseText);
                    if (result.status === 'success') {
                        statusText.innerText = '✅ Berhasil!';
                        form.reset();
                        set(dbRef, Date.now()); // Picu sinkronisasi realtime
                    } else {
                        statusText.innerText = '❌ Gagal: ' + result.message;
                    }
                } catch(err) {
                    statusText.innerText = '✅ Terkirim (Response tidak terbaca)';
                    form.reset();
                    set(dbRef, Date.now());
                }
            } else {
                statusText.innerText = '❌ Error server: ' + xhr.status;
            }
            
            // Sembunyikan form dan aktifkan tombol kembali
            btn.disabled = false;
            setTimeout(() => {
                progressContainer.style.display = 'none';
                statusText.innerText = '';
            }, 3000);
        };

        // Event listener jika terjadi error jaringan (misal internet putus)
        xhr.onerror = function() {
            statusText.innerText = '❌ Error jaringan. Cek koneksi Anda.';
            btn.disabled = false;
        };

        // Kirim data payload
        xhr.send(payloadString);
    };
});
