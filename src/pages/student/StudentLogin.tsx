import LoginPage from '../../components/shared/LoginPage';
import { User } from 'lucide-react';

export default function StudentLogin() {
  return (
    <LoginPage
      role="student"
      title="Student Portal"
      subtitle="Enlist in classes, manage consents, view grades and track your GWA."
      redirectPath="/student/dashboard"
      icon={<User size={36} className="text-primary-foreground" />}
      demoUser="student1"
      demoPass="student123"
      accentClass="bg-secondary"
    />
  );
}
