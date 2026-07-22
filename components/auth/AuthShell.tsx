import type { ReactNode } from 'react'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'

// Branded wrapper for the pre-login pages — ties login/register into the
// site's warm cream + charcoal + ember serif language (see globals.css).
export function AuthShell({ eyebrow, title, description, children }: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="auth-wrap">
      <style>{`
        .auth-wrap { position: relative; z-index: 1; width: 100%; max-width: 25rem; }
        .auth-switch { position: absolute; top: -2.7rem; right: 0; }
        .auth-card {
          position: relative; overflow: hidden;
          padding: clamp(1.7rem, 4vw, 2.4rem);
          border-radius: 28px;
          background: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.72) 100%);
          backdrop-filter: blur(22px) saturate(1.5); -webkit-backdrop-filter: blur(22px) saturate(1.5);
          border: 1px solid rgba(255,255,255,0.7);
          box-shadow: 0 1px 0 0 rgba(255,255,255,0.6) inset,
                      0 26px 60px -24px rgba(45,49,66,0.32),
                      0 8px 20px -12px rgba(45,49,66,0.12);
          animation: auth-rise 0.5s cubic-bezier(0.16,1,0.3,1) both;
        }
        .auth-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: linear-gradient(90deg, var(--brand), var(--brand-soft));
        }
        .auth-head { text-align: center; margin-bottom: 1.5rem; }
        .auth-mark {
          display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: 0.8rem;
          font-family: var(--font-geist-mono), ui-monospace, monospace;
          font-size: 0.62rem; letter-spacing: 0.28em; text-transform: uppercase;
          color: var(--muted-foreground);
        }
        .auth-dot { width: 6px; height: 6px; border-radius: 50%;
          background: var(--brand); box-shadow: 0 0 8px var(--brand);
          animation: auth-pulse 2.6s ease-in-out infinite; }
        .auth-title {
          font-family: var(--font-fraunces), Georgia, serif; font-weight: 500;
          font-size: clamp(1.7rem, 5.5vw, 2.15rem); line-height: 1.08;
          letter-spacing: -0.02em; color: var(--foreground); margin: 0;
        }
        .auth-desc { margin: 0.45rem 0 0; font-size: 0.9rem; line-height: 1.5; color: var(--muted-foreground); }

        /* Divider */
        .auth-or {
          display: flex; align-items: center; gap: 0.85rem; margin: 0.15rem 0;
          font-family: var(--font-geist-mono), ui-monospace, monospace;
          font-size: 0.62rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted-foreground);
        }
        .auth-or::before, .auth-or::after { content: ''; flex: 1; height: 1px; background: var(--border); }

        /* Footer link */
        .auth-foot { text-align: center; font-size: 0.86rem; color: var(--muted-foreground); }
        .auth-link { color: var(--brand); font-weight: 600; text-decoration: none; }
        .auth-link:hover { text-decoration: underline; }

        @keyframes auth-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes auth-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.35); opacity: 0.7; } }
        @media (prefers-reduced-motion: reduce) { .auth-card { animation: none; } .auth-dot { animation: none; } }
      `}</style>

      <div className="auth-switch"><LanguageSwitcher /></div>

      <div className="auth-card">
        <div className="auth-head">
          <span className="auth-mark"><span className="auth-dot" />{eyebrow}</span>
          <h1 className="auth-title">{title}</h1>
          <p className="auth-desc">{description}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
