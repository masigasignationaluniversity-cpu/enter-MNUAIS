import LoginPage from '../../components/shared/LoginPage';
import { ShieldCheck } from 'lucide-react';

export default function AdminLogin() {
  return (
    <LoginPage
      role="admin"
      title="Administrator Portal"
      subtitle="System-wide access to manage terms, users, and all academic processes."
      redirectPath="/admin/dashboard"
      icon={<ShieldCheck size={36} className="text-primary-foreground" />}
      demoUser="admin"
      demoPass="admin123"
      accentClass="bg-primary"
    />
  );
}
