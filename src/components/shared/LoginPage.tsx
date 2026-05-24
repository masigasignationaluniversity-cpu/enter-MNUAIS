import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { GraduationCap, ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';
import type { Role } from '../../lib/types';

interface LoginPageProps {
  role: Role;
  title: string;
  subtitle: string;
  redirectPath: string;
  icon: React.ReactNode;
  accentClass: string;
}

export default function LoginPage({
  role, title, subtitle, redirectPath, icon, accentClass
}: LoginPageProps) {
  const { login } = useApp();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      // After login, verify the user has the correct role
      // (role check happens in the redirected page via PortalLayout)
      navigate(redirectPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed.';
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('wrong')) {
        setError('Invalid username or password.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex" style={{ background: 'var(--gradient-hero)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-center items-center flex-1 p-12 text-primary-foreground">
        <div className="w-20 h-20 rounded-2xl bg-primary-foreground/20 border border-primary-foreground/30 flex items-center justify-center mb-6">
          {icon}
        </div>
        <h1 className="text-3xl font-bold text-center mb-3">{title}</h1>
        <p className="text-primary-foreground/70 text-center max-w-xs">{subtitle}</p>
        <div className="mt-8 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary-foreground/40" />
          <div className={`w-3 h-3 rounded-full ${accentClass}`} />
          <div className="w-2 h-2 rounded-full bg-primary-foreground/40" />
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground text-sm mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Portal Selection
          </button>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-1">
                <div className={`w-10 h-10 rounded-xl ${accentClass} flex items-center justify-center`}>
                  <GraduationCap size={20} className="text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-xl">Sign In</CardTitle>
                  <CardDescription>{title}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPass ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPass(v => !v)}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
