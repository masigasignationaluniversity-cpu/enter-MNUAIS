import { Info } from 'lucide-react';

interface PageIntroProps {
  description: string;
}

export function PageIntro({ description }: PageIntroProps) {
  return (
    <div className="module-intro">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/12 border border-primary/18">
        <Info size={13} className="text-primary/70" />
      </div>
      <span>{description}</span>
    </div>
  );
}
