'use client';
import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
// import { UtensilsCrossed, Loader2 } from "lucide-react"; 
import styles from './home.module.css';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
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

      <div className={styles.backgroundWatermark}>N M S M</div>

      <main className={styles.mainContent}>

        <div className={styles.logoSection}>
          {mounted && (
            <div className="mb-4">
              <img
                src="/logo_plate_v2.jpg"
                alt="DigiPlate Logo"
                className="w-20 h-20 rounded-xl shadow-xl transition-transform hover:scale-105 duration-300 mx-auto"
              />
            </div>
          )}

          <h1 className={styles.title}>
            DigiPlate
          </h1>
        </div>

        {/* Login Form using .loginForm instead of .loginCard to match new CSS */}
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
              {loading ? "Signing In..." : "Access Dashboard"}
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
