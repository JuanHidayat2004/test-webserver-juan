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
    statusText.innerText = 'Memproses...';

    const reader = new FileReader();
    reader.readAsDataURL(fileInput);

    reader.onload = async function () {
        const payload = {
            teks: teks,
            file: reader.result,
            filename: fileInput.name,
            
            // MENGIRIMKAN EMAIL USER KE APPS SCRIPT
            emailPengirim: currentUserEmail 
        };

        statusText.innerText = 'Mengirim ke server...';

        try {
            const response = await fetch(gasURL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
                redirect: 'follow'
            });

            const result = await response.json();

            if (result.status === 'success') {
                statusText.innerText = '✅ Berhasil!';
                form.reset();
                set(dbRef, Date.now());
            } else {
                statusText.innerText = '❌ Gagal: ' + result.message;
            }
        } catch (error) {
            statusText.innerText = '❌ Error: Cek konsol.';
            console.error(error);
        } finally {
            btn.disabled = false;
            setTimeout(() => {
                statusText.innerText = '';
            }, 3000);
        }
    };
});