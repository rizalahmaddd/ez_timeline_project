# EZ Timeline Project

Sebuah aplikasi manajemen timeline proyek yang modern dan intuitif, dibangun dengan React, TypeScript, dan Firebase. Aplikasi ini memungkinkan pengguna untuk membuat, mengelola, dan berbagi timeline proyek dengan fitur AI terintegrasi.

## 🌐 Demo Live

**[🚀 Coba Aplikasi Sekarang](https://timeline.ciptaprogram.com/)**

Akses langsung ke aplikasi EZ Timeline Project yang sudah di-deploy. Anda bisa mencoba semua fitur secara langsung tanpa perlu instalasi lokal.

## 🚀 Fitur Utama

### 📊 Manajemen Timeline
- **Timeline Visual**: Tampilan timeline yang interaktif dengan berbagai mode tampilan (harian, mingguan, bulanan)
- **Manajemen Task**: Buat, edit, dan hapus task dengan mudah
- **Status Tracking**: Lacak progress task dengan status completion
- **Zoom Control**: Kontrol zoom timeline untuk detail yang lebih baik
- **Kanban Board**: Tampilan alternatif dalam format kanban board

### 🤖 Integrasi AI (Gemini)
- **AI Assistant**: Chat dengan AI untuk bantuan manajemen proyek
- **Project Summary**: Generate ringkasan proyek otomatis menggunakan AI
- **Smart Suggestions**: Dapatkan saran untuk optimasi proyek

### 🔐 Sistem Autentikasi
- **Anonymous Access**: Mulai langsung tanpa registrasi
- **Google Sign-in**: Login dengan akun Google
- **Account Linking**: Link akun anonymous dengan Google
- **Multi-role Support**: Mendukung berbagai tipe user (anonymous, google, linked)

### 🌐 Fitur Sharing
- **Public Sharing**: Bagikan proyek dengan link publik
- **Password Protection**: Lindungi shared link dengan password
- **Read-only Access**: Akses read-only untuk viewer
- **Discussion System**: Sistem komentar untuk kolaborasi

### 📤 Export & Import
- **Multiple Formats**: Export ke PNG, PDF
- **AI Summary Integration**: Sertakan ringkasan AI dalam export
- **High Quality Output**: Export berkualitas tinggi untuk presentasi

## 🛠️ Tech Stack

### Frontend
- **React 19** - Library UI modern
- **TypeScript** - Type safety dan developer experience
- **Vite** - Build tool yang cepat
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Komponen UI yang accessible
- **Zustand** - State management yang ringan
- **React Router DOM** - Client-side routing

### Backend & Services
- **Firebase Firestore** - Database NoSQL real-time
- **Firebase Authentication** - Sistem autentikasi
- **Google Gemini AI** - AI integration untuk chat dan summary

### Utilities
- **date-fns** - Manipulasi tanggal
- **html2canvas** - Screenshot generation
- **jsPDF** - PDF generation
- **React Hook Form** - Form management
- **Lucide React** - Icon library

## 📦 Instalasi

### Prerequisites
- Node.js (versi 18 atau lebih baru)
- npm atau pnpm
- Akun Firebase
- API Key Google Gemini

### Langkah Instalasi

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd ez_timeline_project
   ```

2. **Install dependencies**
   ```bash
   # Menggunakan npm
   npm install
   
   # Atau menggunakan pnpm (recommended)
   pnpm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit file `.env` dan isi dengan konfigurasi Anda:
   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   
   # Gemini AI Configuration
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Setup Firebase**
   - Buat project baru di [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication dengan Google provider
   - Enable Firestore Database
   - Salin konfigurasi ke file `.env`

5. **Setup Gemini AI**
   - Dapatkan API key dari [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Tambahkan ke file `.env`

6. **Jalankan development server**
   ```bash
   npm run dev
   # atau
   pnpm dev
   ```

7. **Buka aplikasi**
   - Akses `http://localhost:5173` di browser

## 🏗️ Struktur Project

```
src/
├── components/          # Komponen UI reusable
│   ├── ui/             # Komponen dasar (button, card, dll)
│   ├── Timeline.tsx    # Komponen timeline utama
│   ├── KanbanBoard.tsx # Tampilan kanban
│   └── ...
├── pages/              # Halaman aplikasi
│   ├── Dashboard.tsx   # Halaman utama
│   ├── SharedProject.tsx # Halaman shared project
│   └── ...
├── services/           # Service layer
│   ├── firebaseService.ts # Firebase operations
│   ├── aiService.ts    # AI integration
│   └── exportService.ts # Export functionality
├── store/              # State management
│   └── useStore.ts     # Zustand store
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication context
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
└── lib/                # Library configurations
    └── firebase.ts     # Firebase config
```

## 🚀 Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build untuk production
npm run preview      # Preview build hasil
npm run lint         # Run ESLint
```

## 🔧 Konfigurasi

### Firebase Rules
Pastikan Firestore rules mengizinkan akses yang sesuai:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Projects - hanya owner yang bisa akses
    match /projects/{projectId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Shared projects - public read access
    match /sharedProjects/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Comments - public write untuk shared projects
    match /comments/{commentId} {
      allow read, write: if true;
    }
  }
}
```

### Environment Variables
Semua environment variables harus diawali dengan `VITE_` untuk dapat diakses di frontend.

## 🌐 Deployment

### Build Production
```bash
npm run build
```

### Deploy ke Hosting
Hasil build ada di folder `dist/` yang bisa di-deploy ke:
- Vercel
- Netlify
- Firebase Hosting
- VPS dengan Nginx/Apache

### Konfigurasi Server (untuk SPA)
Untuk deployment di VPS, pastikan server dikonfigurasi untuk SPA:

**Nginx:**
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

**Apache (.htaccess):**
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

## 📝 License

Project ini menggunakan MIT License.

## 🆘 Troubleshooting

### Common Issues

1. **Firebase connection error**
   - Pastikan konfigurasi Firebase di `.env` benar
   - Cek Firebase rules

2. **AI features tidak bekerja**
   - Pastikan `VITE_GEMINI_API_KEY` sudah diset
   - Cek quota API Gemini

3. **Build error**
   - Hapus `node_modules` dan install ulang
   - Pastikan semua dependencies compatible

4. **Shared links 404**
   - Pastikan server dikonfigurasi untuk SPA routing
   - Cek konfigurasi Nginx/Apache

### Debug Mode
Untuk debugging, buka Developer Tools dan cek console untuk error messages.

## 📞 Support

Jika mengalami masalah atau butuh bantuan:
1. Cek dokumentasi ini
2. Buka issue di repository
3. Cek Firebase dan Gemini AI documentation

---

**Happy Timeline Management! 🎯**
