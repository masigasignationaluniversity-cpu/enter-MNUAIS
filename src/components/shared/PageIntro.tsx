import { Info } from 'lucide-react';

interface PageIntroProps {
  description: string;
}

export function PageIntro({ description }: PageIntroProps) {
  return (
    <div className="module-intro">
      <Info size={14} />
      <span>{description}</span>
    </div>
  );
}
