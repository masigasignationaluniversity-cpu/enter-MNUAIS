import LoginPage from '../../components/shared/LoginPage';
import { Users } from 'lucide-react';

export default function FacultyLogin() {
  return (
    <LoginPage
      role="faculty"
      title="Faculty Portal"
      subtitle="Access your assigned classes, encode grades, and view student evaluations."
      redirectPath="/faculty/dashboard"
      icon={<Users size={36} className="text-primary-foreground" />}
      accentClass="bg-primary"
    />
  );
}
