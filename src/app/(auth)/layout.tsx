import type React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-background p-4" // bg-background will use the overridden --background
      style={{
        // Define local HSL values for the auth theme
        '--auth-bg-hsl': '0 0% 100%', /* White #FFFFFF */
        '--auth-fg-hsl': '227 57% 23%', /* Deep Navy Blue #1A2B5F */
        '--auth-primary-hsl': '45 65% 46%', /* Gold #D4AF37 */
        '--auth-primary-fg-hsl': '227 57% 15%', /* Darker Navy for text on Gold buttons for better contrast */
        '--auth-card-hsl': '0 0% 100%', /* White */
        '--auth-card-fg-hsl': '227 57% 23%', /* Deep Navy Blue */
        '--auth-popover-hsl': '0 0% 100%', /* White */
        '--auth-popover-fg-hsl': '227 57% 23%', /* Deep Navy Blue */
        '--auth-muted-hsl': '227 30% 96%', /* Lighter grey for muted backgrounds within auth forms */
        '--auth-muted-fg-hsl': '227 30% 50%', /* Darker grey for muted text within auth forms */
        '--auth-accent-hsl': '45 65% 52%', /* Lighter Gold for hover/accent #E1B74A */
        '--auth-accent-fg-hsl': '227 57% 15%', /* Darker Navy for text on Lighter Gold */
        '--auth-destructive-hsl': '0 84.2% 60.2%', /* Standard destructive */
        '--auth-destructive-fg-hsl': '0 0% 98%',   /* Standard destructive fg */
        '--auth-border-hsl': '227 30% 88%', /* Greyer border for inputs */
        '--auth-input-hsl': '227 30% 88%', /* Greyer border for inputs */
        '--auth-ring-hsl': '45 65% 46%',   /* Gold for focus rings */

        // Override global CSS variables for this scope
        '--background': 'var(--auth-bg-hsl)',
        '--foreground': 'var(--auth-fg-hsl)',
        '--primary': 'var(--auth-primary-hsl)',
        '--primary-foreground': 'var(--auth-primary-fg-hsl)',
        '--card': 'var(--auth-card-hsl)',
        '--card-foreground': 'var(--auth-card-fg-hsl)',
        '--popover': 'var(--auth-popover-hsl)',
        '--popover-foreground': 'var(--auth-popover-fg-hsl)',
        '--muted': 'var(--auth-muted-hsl)',
        '--muted-foreground': 'var(--auth-muted-fg-hsl)',
        '--accent': 'var(--auth-accent-hsl)',
        '--accent-foreground': 'var(--auth-accent-fg-hsl)',
        '--destructive': 'var(--auth-destructive-hsl)',
        '--destructive-foreground': 'var(--auth-destructive-fg-hsl)',
        '--border': 'var(--auth-border-hsl)',
        '--input': 'var(--auth-input-hsl)',
        '--ring': 'var(--auth-ring-hsl)',
        // Secondary isn't explicitly mentioned for auth, can default or use a light gold/grey
        '--secondary': '45 60% 90%', /* Very light gold/beige as secondary #F5F0DF */
        '--secondary-foreground': 'var(--auth-fg-hsl)', /* Navy text on light gold/beige */
      } as React.CSSProperties}
    >
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
