'use client';
import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
// import { UtensilsCrossed, Loader2 } from "lucide-react"; 
import styles from './home.module.css';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);

    // Firework animation
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        zIndex: 9999, // Ensure it shows above the splash screen
        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        zIndex: 9999, // Ensure it shows above the splash screen
        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();

    // Hide splash screen after 2 seconds
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      setError('Invalid credentials. Please try again.');
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className={styles.container}>
      {/* Splash Screen Overlay */}
      {showSplash && (
        <div className={styles.splashScreen}>
          <img
            src="/logo_plate_v2.jpg"
            alt="DigiPlate Splash"
            className={styles.splashLogo}
          />
        </div>
      )}

      {/* Info Button (Top Right) */}
      <button
        onClick={() => setShowInfo(true)}
        className={styles.infoButton}
        aria-label="App Information"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
      </button>

      {/* Info Modal Overlay */}
      {showInfo && (
        <div className={styles.infoModalOverlay} onClick={() => setShowInfo(false)}>
          <div className={styles.infoModalContent} onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
              About DigiPlate
            </h2>
            <p className="text-sm text-gray-300 mb-6 pb-4 border-b border-gray-700">
              A Premium Digital Canteen Coupon System designed to streamline meal distribution and tracking.
            </p>

            <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-2">Development Team</h3>
            <p className="text-xs text-gray-400 mb-4 bg-gray-800/50 p-2 rounded-lg border border-gray-700">
              BSc (Honours) Computer Science<br />2nd Year Students
            </p>

            <ul className="space-y-3 mb-6">
              <li className="flex flex-col">
                <span className="text-sm font-bold text-gray-200">1. Abdul Salam M P</span>
                <span className="text-xs text-blue-400">Founder, Lead Developer</span>
              </li>
              <li className="flex flex-col">
                <span className="text-sm font-bold text-gray-200">2. Muhammed Sinan K P</span>
                <span className="text-xs text-emerald-400">App Administrator</span>
              </li>
              <li className="flex flex-col">
                <span className="text-sm font-bold text-gray-200">3. Hafeefa</span>
                <span className="text-xs text-purple-400">Role Manager</span>
              </li>
              <li className="flex flex-col">
                <span className="text-sm font-bold text-gray-200">4. Abin Sagar</span>
                <span className="text-xs text-rose-400">Security Analyst</span>
              </li>
            </ul>

            <button
              className={styles.modalCloseBtn}
              onClick={() => setShowInfo(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className={styles.backgroundWatermark}>N M S M</div>

      <main className={styles.mainContent}>

        <div className={styles.logoSection}>
          {mounted && (
            <img
              src="/logo_plate_v2.jpg"
              alt="DigiPlate Logo"
              className="w-24 h-24 rounded-2xl shadow-2xl transition-transform hover:scale-105 duration-300 mx-auto border-2 border-white/10"
            />
          )}

          <h1 className={styles.title}>
            DigiPlate
          </h1>
        </div>

        <div className={styles.loginForm}>

          {error && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="student@digiplate.com"
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={styles.button}
            >
              {loading ? "Signing In..." : "Access System"}
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-gray-600/30 text-center">
            <p className="text-sm font-semibold text-gray-300">Access Portal</p>
            <p className="text-sm font-bold text-blue-300 mt-1">NMSM Govt College Kalpetta</p>
            <p className="text-xs text-gray-400 mt-2">Associated with Department of Computer Science</p>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        © 2026 DigiPlate Project
      </footer>
    </div>
  );
}
