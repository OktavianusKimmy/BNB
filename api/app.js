// --- 1. IMPORT FIREBASE (Jangan Diubah) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, 
    doc, updateDoc, deleteDoc, query, orderBy, setDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 2. KONFIGURASI (GANTI BAGIAN INI DENGAN PUNYAMU) ---
// Copy dari Firebase Console > Project Settings > General > Your Apps
const firebaseConfig = {
  apiKey: "AIzaSyCU82AX-l80wXvxb_S4eToRQ0cRt8RXZa4",
  authDomain: "brew-and-beats-5fbf2.firebaseapp.com",
  projectId: "brew-and-beats-5fbf2",
  storageBucket: "brew-and-beats-5fbf2.firebasestorage.app",
  messagingSenderId: "243138026852",
  appId: "1:243138026852:web:72a97263225382c133ee71",
  measurementId: "G-30BBMMJ26M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Nama koleksi di database
const MENU_COLLECTION = "sorella_menu";
const SETTINGS_COLLECTION = "sorella_settings"; // Untuk simpan status PO

// State Lokal
let isAdmin = false;
let isPreOrderOpen = true; 

// --- 3. LOGIC REALTIME (LISTENER) ---

// A. Dengar perubahan Status PO
const statusDocRef = doc(db, SETTINGS_COLLECTION, "store_status");
onSnapshot(statusDocRef, (docSnap) => {
    if (docSnap.exists()) {
        isPreOrderOpen = docSnap.data().isOpen;
    } else {
        // Jika belum ada setting, buat default true
        setDoc(statusDocRef, { isOpen: true });
        isPreOrderOpen = true;
    }
    renderHeaderStatus();
    // Kita perlu render ulang menu karena tombol beli tergantung status PO
    // Tapi listener menu di bawah akan handle rendering item
});

// B. Dengar perubahan Data Menu (Otomatis jalan tiap ada perubahan di DB)
const q = query(collection(db, MENU_COLLECTION), orderBy("name"));
onSnapshot(q, (snapshot) => {
    const container = document.getElementById('menu-container');
    container.innerHTML = ''; // Reset container

    if (snapshot.empty) {
        container.innerHTML = '<p class="text-center text-gray-500">Belum ada menu.</p>';
        return;
    }

    snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        const id = docSnap.id; // ID dari Firebase
        renderCard(id, item, container);
    });
});

// --- 4. FUNGSI RENDER UI ---

function renderHeaderStatus() {
    const badge = document.getElementById('status-badge');
    if (isPreOrderOpen) {
        badge.textContent = "OPEN PO";
        badge.className = "px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-700";
    } else {
        badge.textContent = "PO DITUTUP";
        badge.className = "px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700";
    }
    
    // Disable/Enable semua tombol pesan di kartu yg sudah ada (opsional, karena render ulang menangani ini)
    document.querySelectorAll('.btn-pesan').forEach(btn => {
        if (!isPreOrderOpen) {
            btn.disabled = true;
            btn.classList.add('bg-gray-200', 'text-gray-400', 'cursor-not-allowed');
            btn.classList.remove('bg-rose-500', 'hover:bg-rose-600');
            btn.textContent = "PO Tutup";
        }
    });
}

function renderCard(id, item, container) {
    const isSoldOut = item.soldOut || item.stock <= 0;
    const card = document.createElement('div');
    card.className = `bg-white p-4 rounded-xl shadow-sm border ${isSoldOut ? 'opacity-60 grayscale' : ''} relative transition-all`;

    // Format Rupiah
    const harga = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.price);

    card.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <h3 class="font-bold text-lg">${item.name}</h3>
                <p class="text-gray-500 text-sm">${item.desc}</p>
                <p class="text-rose-600 font-bold mt-1">${harga}</p>
                <p class="text-xs text-gray-400 mt-1">Stok: ${item.stock}</p>
            </div>
            ${isSoldOut ? '<span class="text-xs font-bold text-red-500 border border-red-500 px-2 py-1 rounded">HABIS</span>' : ''}
        </div>

        <div class="mt-4 ${isAdmin ? 'hidden' : ''} user-action">
            <button class="btn-pesan w-full py-2 rounded-lg font-bold text-sm transition 
                ${!isPreOrderOpen || isSoldOut ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-rose-500 text-white hover:bg-rose-600'}"
                ${!isPreOrderOpen || isSoldOut ? 'disabled' : ''}>
                ${!isPreOrderOpen ? 'PO Tutup' : (isSoldOut ? 'Sold Out' : 'Pesan Sekarang')}
            </button>
        </div>

        <div class="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2 ${isAdmin ? '' : 'hidden'} admin-action">
            <button class="btn-stock-plus bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs">+ Stok</button>
            <button class="btn-stock-min bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs">- Stok</button>
            <button class="btn-toggle-sold bg-yellow-100 text-yellow-600 px-2 py-1 rounded text-xs">
                ${item.soldOut ? 'Set Avail' : 'Set Habis'}
            </button>
            <button class="btn-delete bg-red-100 text-red-600 px-2 py-1 rounded text-xs ml-auto">Hapus</button>
        </div>
    `;

    // Event Listener Tombol Admin (Karena type module, kita pasang manual)
    if (isAdmin) {
        card.querySelector('.btn-stock-plus').onclick = () => updateStock(id, item.stock + 1);
        card.querySelector('.btn-stock-min').onclick = () => updateStock(id, item.stock - 1);
        card.querySelector('.btn-toggle-sold').onclick = () => toggleSoldOut(id, !item.soldOut);
        card.querySelector('.btn-delete').onclick = () => deleteMenuItem(id);
    }
    
    // Event Listener Pesan WA
    if (!isAdmin && !isSoldOut && isPreOrderOpen) {
        card.querySelector('.btn-pesan').onclick = () => {
            const text = `Halo kak, mau pesan ${item.name}`;
            window.open(`https://wa.me/6281234567890?text=${encodeURIComponent(text)}`);
        };
    }

    container.appendChild(card);
}

// --- 5. FUNGSI CRUD DATABASE ---

async function addNewItem() {
    const name = document.getElementById('new-name').value;
    const desc = document.getElementById('new-desc').value;
    const price = parseInt(document.getElementById('new-price').value);
    const stock = parseInt(document.getElementById('new-stock').value);

    if (name && price) {
        try {
            await addDoc(collection(db, MENU_COLLECTION), {
                name, desc, price, stock, soldOut: false
            });
            closeAddModal();
            // Reset form
            document.getElementById('new-name').value = '';
            document.getElementById('new-desc').value = '';
            document.getElementById('new-price').value = '';
            document.getElementById('new-stock').value = '';
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Gagal menambah menu");
        }
    } else {
        alert("Nama dan Harga wajib diisi!");
    }
}

async function updateStock(id, newStock) {
    if (newStock < 0) return;
    const itemRef = doc(db, MENU_COLLECTION, id);
    await updateDoc(itemRef, { stock: newStock });
}

async function toggleSoldOut(id, status) {
    const itemRef = doc(db, MENU_COLLECTION, id);
    await updateDoc(itemRef, { soldOut: status });
}

async function deleteMenuItem(id) {
    if (confirm('Yakin mau hapus permanen?')) {
        await deleteDoc(doc(db, MENU_COLLECTION, id));
    }
}

async function togglePOStatusInDB() {
    const statusRef = doc(db, SETTINGS_COLLECTION, "store_status");
    // Toggle nilai yang ada sekarang
    await updateDoc(statusRef, { isOpen: !isPreOrderOpen });
}

// --- 6. ADMIN LOGIN LOGIC & MODAL ---

let clickCount = 0;
document.getElementById('logo-trigger').addEventListener('click', () => {
    clickCount++;
    if (clickCount === 3) {
        const password = prompt("Masukkan Password Admin:");
        if (password === "admin123") {
            isAdmin = true;
            document.getElementById('admin-panel').classList.remove('hidden');
            // Refresh tampilan agar tombol admin muncul di kartu yang sudah ada
            // Trik cepat: trigger ulang snapshot atau reload halaman (tapi reload tidak mulus)
            // Kita ubah class CSS manual saja:
            document.querySelectorAll('.admin-action').forEach(el => el.classList.remove('hidden'));
            document.querySelectorAll('.user-action').forEach(el => el.classList.add('hidden'));
            alert("Admin Mode Aktif! Data tersambung ke Firebase 🔥");
        } else {
            alert("Salah password!");
        }
        clickCount = 0;
    }
    setTimeout(() => clickCount = 0, 1000);
});

// Event Listeners Tombol Statis
document.getElementById('btn-logout').onclick = () => location.reload(); // Reload untuk logout
document.getElementById('btn-show-add').onclick = () => document.getElementById('add-modal').classList.remove('hidden');
document.getElementById('btn-cancel-add').onclick = closeAddModal;
document.getElementById('btn-save-item').onclick = addNewItem;
document.getElementById('btn-toggle-po').onclick = togglePOStatusInDB;

function closeAddModal() {
    document.getElementById('add-modal').classList.add('hidden');
}