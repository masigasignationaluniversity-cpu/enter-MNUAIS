import LoginPage from '../../components/shared/LoginPage';
import { BookOpen } from 'lucide-react';

export default function OCSLogin() {
  return (
    <LoginPage
      role="ocs"
      title="OCS Staff Portal"
      subtitle="Manage courses, sections, and student consent processing."
      redirectPath="/ocs/dashboard"
      icon={<BookOpen size={36} className="text-primary-foreground" />}
      demoUser="ocs1"
      demoPass="ocs123"
      accentClass="bg-secondary"
    />
  );
}
