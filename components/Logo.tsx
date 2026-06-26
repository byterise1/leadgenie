import Image from 'next/image';

type LogoProps = {
  size?: number;
  textSize?: string;
  textColor?: string;
  className?: string;
};

export function Logo({ size = 34, textSize = 'text-[15px]', textColor = 'text-gray-900', className = '' }: LogoProps) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <Image src="/logo.png" alt="Leads Genie" width={size} height={size} className="shrink-0" priority />
      <span className={`font-extrabold ${textSize} ${textColor}`}>Leads Genie</span>
    </span>
  );
}
